import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import type { TenantContext } from "../contracts/tenancy.v1.js";
import { withTenantSession } from "../db/client.js";
import {
  applyCommand,
  fingerprint,
  newProject,
  nextAction,
  uuid,
  validateCommand,
  validateCreate,
  WorkflowError,
  type Project,
  type CommandRequest,
} from "./model.js";

export interface WorkflowEvent {
  id: string;
  operationId: string;
  projectId: string;
  tenantId: string;
  actorId: string;
  type: string;
  version: number;
  createdAt: string;
  details: WorkflowEventDetails;
}
export interface WorkflowEventDetails {
  input: ReturnType<typeof validateCreate> | CommandRequest;
  action: string;
  resources: { tenantId: string; projectId: string };
  output: {
    briefingRevision: number;
    steps: Pick<
      Project["steps"][number],
      "id" | "state" | "reason" | "attempts"
    >[];
    artifactIds: string[];
    nextAction: ReturnType<typeof nextAction>;
  };
  evidence: {
    inputValidation: {
      validator: "validateCreate" | "validateCommand";
      outcome: "passed";
    };
    domainEvaluation: {
      evaluator: "newProject" | "applyCommand";
      outcome: string;
      reason: string | null;
    };
    artifacts: Pick<
      Project["artifacts"][number],
      "id" | "sha256" | "verification" | "revision"
    >[];
  };
}
export interface WorkflowDetail {
  project: Project;
  history: WorkflowEvent[];
}

// Object key order is not part of an operation's identity. All inputs have
// already passed the domain validator; generated timestamps/IDs are excluded.
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, canonical(v)]),
    );
  return value;
}

async function transaction<T>(
  pool: Pool,
  actor: string,
  tenantId: string,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
      actor,
    ]);
    await client.query("set local role kesko_workflow_executor");
    const access = await client.query(
      "select public.is_active_tenant_member($1) as member, public.has_tenant_role($1, array['owner','admin']::public.tenant_role[]) as writer",
      [tenantId],
    );
    if (!access.rows[0].member)
      throw new WorkflowError("NOT_FOUND", "Projeto não encontrado");
    if (!access.rows[0].writer)
      throw new WorkflowError(
        "FORBIDDEN",
        "Somente owner/admin pode executar o fluxo",
      );
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      discard = true;
    }
    throw error;
  } finally {
    client.release(discard);
  }
}

async function detail(
  client: PoolClient,
  tenantId: string,
  projectId: string,
  lock = false,
): Promise<WorkflowDetail> {
  const result = await client.query<{ snapshot: Project }>(
    `select snapshot from kesko_workflow.projects where tenant_id=$1 and id=$2${lock ? " for update" : ""}`,
    [tenantId, projectId],
  );
  if (!result.rows[0])
    throw new WorkflowError("NOT_FOUND", "Projeto não encontrado");
  const project = result.rows[0].snapshot;
  // Bound history to the observed snapshot version: a concurrent commit cannot
  // make a GET combine an older snapshot with newer events under READ COMMITTED.
  const events = await client.query<WorkflowEvent>(
    `select id, operation_id as "operationId", project_id as "projectId", tenant_id as "tenantId", actor_id as "actorId", type, version, details, created_at as "createdAt" from kesko_workflow.events where tenant_id=$1 and project_id=$2 and version <= $3 order by version`,
    [tenantId, projectId, project.version],
  );
  return {
    project,
    history: events.rows.map((event) => ({
      ...event,
      createdAt: new Date(event.createdAt).toISOString(),
    })),
  };
}

async function operationLock(
  client: PoolClient,
  tenantId: string,
  operationId: string,
): Promise<void> {
  // Serializes creation too (there is no project row to lock yet). Hash
  // collisions only serialize unrelated operations; uniqueness lives in SQL.
  await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `${tenantId}:${operationId}`,
  ]);
}

async function replay(
  client: PoolClient,
  tenantId: string,
  operationId: string,
  hash: string,
): Promise<WorkflowDetail | undefined> {
  const result = await client.query<{
    payload_hash: string;
    project_id: string;
  }>(
    "select payload_hash,project_id from kesko_workflow.events where tenant_id=$1 and operation_id=$2",
    [tenantId, operationId],
  );
  const event = result.rows[0];
  if (!event) return undefined;
  if (event.payload_hash !== hash)
    throw new WorkflowError(
      "CONFLICT",
      "operationId reutilizado com outro payload",
    );
  return detail(client, tenantId, event.project_id);
}

async function append(
  client: PoolClient,
  project: Project,
  operationId: string,
  hash: string,
  actor: string,
  type: string,
  now: string,
  input: WorkflowEventDetails["input"],
): Promise<void> {
  const executedStep =
    "type" in input && input.type === "run_step"
      ? project.steps.find((step) => step.id === input.stepId)
      : undefined;
  // This records only local evaluations actually performed, including domain
  // failures/blocked attempts that were committed. Rejected requests and SQL
  // failures roll back and do not claim a completed transition or audit event.
  const details: WorkflowEventDetails = {
    input,
    action: type,
    resources: { tenantId: project.tenantId, projectId: project.id },
    output: {
      briefingRevision: project.briefingRevision,
      steps: project.steps.map(({ id, state, reason, attempts }) => ({
        id,
        state,
        reason,
        attempts,
      })),
      artifactIds: project.artifacts.map((artifact) => artifact.id),
      nextAction: nextAction(project),
    },
    evidence: {
      inputValidation: {
        validator: type === "created" ? "validateCreate" : "validateCommand",
        outcome: "passed",
      },
      domainEvaluation: {
        evaluator: type === "created" ? "newProject" : "applyCommand",
        outcome: executedStep?.state ?? "applied",
        reason: executedStep?.reason ?? null,
      },
      artifacts: project.artifacts.map(
        ({ id, sha256, verification, revision }) => ({
          id,
          sha256,
          verification,
          revision,
        }),
      ),
    },
  };
  await client.query(
    "insert into kesko_workflow.events (id,tenant_id,project_id,operation_id,payload_hash,actor_id,type,version,created_at,details) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
    [
      randomUUID(),
      project.tenantId,
      project.id,
      operationId,
      hash,
      actor,
      type,
      project.version,
      now,
      details,
    ],
  );
}

export class WorkflowRepository {
  constructor(private readonly pool: Pool) {}

  async list(context: TenantContext, tenantId: string): Promise<Project[]> {
    uuid(tenantId);
    return withTenantSession(this.pool, context, async (client) => {
      const result = await client.query<{ snapshot: Project }>(
        "select snapshot from kesko_workflow.projects where tenant_id=$1 order by created_at desc,id",
        [tenantId],
      );
      return result.rows.map((row) => row.snapshot);
    });
  }

  async get(
    context: TenantContext,
    tenantId: string,
    projectId: string,
  ): Promise<WorkflowDetail> {
    uuid(tenantId);
    uuid(projectId);
    return withTenantSession(this.pool, context, (client) =>
      detail(client, tenantId, projectId),
    );
  }

  async create(
    context: TenantContext,
    tenantId: string,
    body: unknown,
  ): Promise<WorkflowDetail> {
    const input = validateCreate(body);
    const actor = this.actor(context);
    tenantId = uuid(tenantId);
    const hash = fingerprint(
      canonical({ actor, tenantId, type: "create", input }),
    );
    return transaction(this.pool, actor, tenantId, async (client) => {
      await operationLock(client, tenantId, input.operationId);
      const existing = await replay(client, tenantId, input.operationId, hash);
      if (existing) return existing;
      const now = new Date().toISOString();
      const project = newProject(input, actor, randomUUID(), tenantId, now);
      await client.query(
        "insert into kesko_workflow.projects (id,tenant_id,version,snapshot,created_at) values ($1,$2,$3,$4,$5)",
        [project.id, tenantId, project.version, project, now],
      );
      await append(
        client,
        project,
        input.operationId,
        hash,
        actor,
        "created",
        now,
        input,
      );
      return detail(client, tenantId, project.id);
    });
  }

  async command(
    context: TenantContext,
    tenantId: string,
    projectId: string,
    body: unknown,
  ): Promise<WorkflowDetail> {
    const command = validateCommand(body);
    const actor = this.actor(context);
    tenantId = uuid(tenantId);
    projectId = uuid(projectId);
    const hash = fingerprint(
      canonical({ actor, tenantId, projectId, command }),
    );
    return transaction(this.pool, actor, tenantId, async (client) => {
      await operationLock(client, tenantId, command.operationId);
      const current = await detail(client, tenantId, projectId, true);
      const existing = await replay(
        client,
        tenantId,
        command.operationId,
        hash,
      );
      if (existing) return existing;
      if (current.project.version !== command.expectedVersion)
        throw new WorkflowError(
          "CONFLICT",
          "Versão desatualizada; reabra o projeto",
        );
      const now = new Date().toISOString();
      const project = applyCommand(current.project, command, actor, now);
      const updated = await client.query(
        "update kesko_workflow.projects set snapshot=$1,version=$2 where tenant_id=$3 and id=$4 and version=$5",
        [
          project,
          project.version,
          tenantId,
          projectId,
          command.expectedVersion,
        ],
      );
      if (updated.rowCount !== 1)
        throw new WorkflowError("CONFLICT", "Versão ou permissão alterada");
      await append(
        client,
        project,
        command.operationId,
        hash,
        actor,
        command.type,
        now,
        command,
      );
      return detail(client, tenantId, projectId);
    });
  }

  private actor(context: TenantContext): string {
    if (!context.authenticated || !context.userId)
      throw new WorkflowError("FORBIDDEN", "Identidade autenticada necessária");
    return uuid(context.userId);
  }
}
