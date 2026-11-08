import type { Pool, PoolClient } from "pg";
import type { TenantContext } from "../contracts/tenancy.v1.js";
import {
  fingerprint,
  uuid,
  validateBriefing,
  validateInterviewRequest,
  WorkflowError,
  type InterviewDraft,
} from "./model.js";

export interface StoredInterviewDraft extends InterviewDraft {
  updatedAt: string;
  version: string;
}

function version(index: number, answers: InterviewDraft["answers"]): string {
  return fingerprint({ index, answers: validateBriefing(answers) });
}

async function withWorkflowSession<T>(
  pool: Pool,
  context: TenantContext,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!context.authenticated || !context.userId)
    throw new Error("authenticated user is required");
  const client = await pool.connect();
  let discard = false;
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
      context.userId,
    ]);
    await client.query("set local role kesko_workflow_executor");
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

export class InterviewRepository {
  constructor(private readonly pool: Pool) {}

  async get(
    context: TenantContext,
    tenantId: string,
  ): Promise<StoredInterviewDraft | null> {
    tenantId = uuid(tenantId);
    return withWorkflowSession(this.pool, context, async (client) => {
      const result = await client.query<{
        current_index: number;
        answers: Partial<InterviewDraft["answers"]>;
        updated_at: string;
      }>(
        "select current_index, answers, updated_at from kesko_workflow.interview_drafts where tenant_id=$1 and actor_id=auth.uid()",
        [tenantId],
      );
      const row = result.rows[0];
      return row
        ? {
            index: row.current_index,
            answers: row.answers,
            updatedAt: new Date(row.updated_at).toISOString(),
            version: version(row.current_index, row.answers),
          }
        : null;
    });
  }

  async save(
    context: TenantContext,
    tenantId: string,
    body: unknown,
  ): Promise<StoredInterviewDraft> {
    const input = validateInterviewRequest(body);
    tenantId = uuid(tenantId);
    if (!context.authenticated || !context.userId)
      throw new Error("authenticated user is required");
    const actor = uuid(context.userId);
    return withWorkflowSession(this.pool, context, async (client) => {
      // Includes first creation, where no row exists to lock. Hash collisions
      // only serialize unrelated drafts; tenant/actor identity remains in SQL.
      await client.query(
        "select pg_advisory_xact_lock(hashtextextended($1, 0))",
        [`interview:${tenantId}:${actor}`],
      );
      const current = await client.query<{
        current_index: number;
        answers: InterviewDraft["answers"];
        updated_at: string;
      }>(
        "select current_index, answers, updated_at from kesko_workflow.interview_drafts where tenant_id=$1 and actor_id=auth.uid()",
        [tenantId],
      );
      const existing = current.rows[0];
      const currentVersion = existing
        ? version(existing.current_index, existing.answers)
        : null;
      const requestedVersion = version(input.index, input.answers);
      if (existing && currentVersion === requestedVersion) {
        return {
          index: existing.current_index,
          answers: existing.answers,
          updatedAt: new Date(existing.updated_at).toISOString(),
          version: requestedVersion,
        };
      }
      if (input.expectedVersion !== currentVersion)
        throw new WorkflowError(
          "CONFLICT",
          "Rascunho da entrevista desatualizado",
        );
      const result = await client.query<{
        current_index: number;
        answers: Partial<InterviewDraft["answers"]>;
        updated_at: string;
      }>(
        `insert into kesko_workflow.interview_drafts (tenant_id, actor_id, current_index, answers, updated_at)
         values ($1,$2,$3,$4,now())
         on conflict (tenant_id, actor_id) do update
           set current_index=excluded.current_index, answers=excluded.answers, updated_at=excluded.updated_at
         returning current_index, answers, updated_at`,
        [tenantId, actor, input.index, input.answers],
      );
      const row = result.rows[0];
      return {
        index: row.current_index,
        answers: row.answers,
        updatedAt: new Date(row.updated_at).toISOString(),
        version: version(row.current_index, row.answers),
      };
    });
  }
}
