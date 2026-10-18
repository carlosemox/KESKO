import { randomUUID } from "node:crypto";
import Fastify from "fastify";
import { Pool, type PoolClient } from "pg";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createTenantWithOwner } from "../../src/db/tenant-repository.js";
import { registerWorkflowRoutes } from "../../src/workflow/routes.js";
import type { WorkflowDetail } from "../../src/workflow/repository.js";
import { registerIdentityHook } from "../../src/http/auth-context.js";
import {
  designFields,
  journeyFields,
  validateDesign,
  validateJourney,
} from "../../src/workflow/model.js";

const dbTests = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const owner = "00000000-0000-0000-0000-000000000001";
const outsider = "00000000-0000-0000-0000-000000000002";
const viewer = "00000000-0000-0000-0000-000000000003";
const member = "00000000-0000-0000-0000-000000000004";
dbTests("workflow PostgreSQL and HTTP", () => {
  let pool: Pool;
  let app: ReturnType<typeof Fastify>;
  let tenantId: string;
  let base: string;
  let interviewBase: string;
  const makeApp = () => {
    const a = Fastify();
    registerIdentityHook(a);
    registerWorkflowRoutes(a, pool);
    return a;
  };
  const request = (
    method: "GET" | "POST",
    url: string,
    payload?: object,
    actor = owner,
  ) =>
    app.inject({
      method,
      url,
      headers: { authorization: `Bearer local:${actor}` },
      ...(payload ? { payload } : {}),
    });
  const input = () => ({
    operationId: randomUUID(),
    name: "Workflow",
    kind: "project",
    briefing: {},
  });
  const create = async () => {
    const res = await request("POST", base, input());
    expect(res.statusCode).toBe(201);
    return res.json().data;
  };
  beforeEach(async () => {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
      max: 5,
    });
    const tenant = await createTenantWithOwner(
      pool,
      { authenticated: true, userId: owner },
      "Workflow tests",
      `workflow-${randomUUID()}`,
      randomUUID(),
    );
    tenantId = tenant.id;
    base = `/v1/tenants/${tenantId}/projects`;
    interviewBase = `/v1/tenants/${tenantId}/interview-draft`;
    await pool.query(
      "insert into public.tenant_memberships (tenant_id,user_id,role,status) values ($1,$2,'viewer','active'),($1,$3,'member','active')",
      [tenantId, viewer, member],
    );
    app = makeApp();
  });
  afterEach(async () => {
    await app?.close();
    try {
      if (tenantId)
        await pool.query("delete from public.tenants where id=$1", [tenantId]);
    } finally {
      await pool?.end();
    }
  });
  async function asRole<T>(
    role: "authenticated" | "kesko_workflow_executor",
    actor: string,
    fn: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(
        "select set_config('request.jwt.claim.sub',$1,true), set_config('role',$2,true)",
        [actor, role],
      );
      return await fn(client);
    } finally {
      await client.query("rollback");
      client.release();
    }
  }
  it("reopens interview versions, rejects stale same-index writes and permits CAS reset", async () => {
    expect((await request("GET", interviewBase)).json().data).toBeNull();
    const first = await request("POST", interviewBase, {
      index: 2,
      answers: { problem: "Initial" },
      expectedVersion: null,
    });
    expect(first.statusCode).toBe(200);
    const initial = first.json().data;
    expect(initial.version).toMatch(/^[a-f0-9]{64}$/);
    await app.close();
    app = makeApp();
    expect((await request("GET", interviewBase)).json().data).toEqual(initial);
    const race = await Promise.all(
      ["First edit", "Second edit"].map((problem) =>
        request("POST", interviewBase, {
          index: 2,
          answers: { problem },
          expectedVersion: initial.version,
        }),
      ),
    );
    expect(race.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const winner = race.find((r) => r.statusCode === 200)!.json().data;
    expect(winner.version).not.toBe(initial.version);
    const retry = await request("POST", interviewBase, {
      index: winner.index,
      answers: winner.answers,
      expectedVersion: initial.version,
    });
    expect(retry.statusCode).toBe(200);
    expect(retry.json().data).toEqual(winner);
    expect(
      (await request("POST", interviewBase, { index: 3, answers: {} }))
        .statusCode,
    ).toBe(409);
    const reset = await request("POST", interviewBase, {
      index: 0,
      answers: {},
      expectedVersion: winner.version,
    });
    expect(reset.statusCode).toBe(200);
    expect(reset.json().data).toMatchObject({ index: 0, answers: {} });
    expect((await request("GET", interviewBase)).json().data).toEqual(
      reset.json().data,
    );
  });

  it("serializes first interview creation and isolates actors, tenants and revoked memberships", async () => {
    const race = await Promise.all(
      ["One", "Two"].map((problem) =>
        request("POST", interviewBase, {
          index: 1,
          answers: { problem },
          expectedVersion: null,
        }),
      ),
    );
    expect(race.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const own = (await request("GET", interviewBase)).json().data;
    expect(
      (await request("GET", interviewBase, undefined, member)).json().data,
    ).toBeNull();
    expect(
      (await request("POST", interviewBase, { index: 1, answers: {} }, member))
        .statusCode,
    ).toBe(200);
    expect((await request("GET", interviewBase)).json().data).toEqual(own);
    const other = await createTenantWithOwner(
      pool,
      { authenticated: true, userId: owner },
      "Other interview",
      `interview-${randomUUID()}`,
      randomUUID(),
    );
    try {
      const url = `/v1/tenants/${other.id}/interview-draft`;
      expect((await request("GET", url)).json().data).toBeNull();
      expect(
        (
          await request("POST", url, {
            index: 0,
            answers: {},
            expectedVersion: own.version,
          })
        ).statusCode,
      ).toBe(409);
      expect(
        (await request("POST", url, { index: 0, answers: {} })).statusCode,
      ).toBe(200);
      expect((await request("GET", interviewBase)).json().data).toEqual(own);
    } finally {
      await pool.query("delete from public.tenants where id=$1", [other.id]);
    }
    await pool.query(
      "update public.tenant_memberships set status='suspended' where tenant_id=$1 and user_id=$2",
      [tenantId, owner],
    );
    expect((await request("GET", interviewBase)).statusCode).toBe(404);
    expect(
      (
        await request("POST", interviewBase, {
          index: own.index,
          answers: own.answers,
          expectedVersion: own.version,
        })
      ).statusCode,
    ).toBe(404);
  });
  it("creates atomically under concurrent retries and reopens through a fresh app", async () => {
    const payload = input();
    const results = await Promise.all([
      request("POST", base, payload),
      request("POST", base, payload),
    ]);
    expect(results.map((r) => r.statusCode)).toEqual([201, 201]);
    expect(results.map((r) => r.headers["cache-control"])).toEqual([
      "no-store",
      "no-store",
    ]);
    const data = results[0].json().data;
    expect(results[1].json().data).toEqual(data);
    expect(data.history).toHaveLength(1);
    expect(data.nextAction).toMatchObject({
      type: "run_step",
      stepId: "discovery",
    });
    await app.close();
    app = makeApp();
    for (const url of [base, `${base}/${data.project.id}`]) {
      expect((await request("GET", url)).headers["cache-control"]).toBe(
        "no-store",
      );
    }
    expect(
      (await request("GET", `${base}/${data.project.id}`)).json().data,
    ).toEqual(data);
    expect((await request("GET", base)).json().data).toEqual([data.project]);
    expect(
      (await request("POST", base, { ...payload, name: "Different" }))
        .statusCode,
    ).toBe(409);
  });
  it("persists interview drafts with actor isolation and monotonic progress", async () => {
    expect((await request("GET", interviewBase)).json().data).toBeNull();
    const first = await request("POST", interviewBase, {
      index: 2,
      answers: { company: "Empresa", problem: "Problema" },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json().data).toMatchObject({
      index: 2,
      answers: { company: "Empresa", problem: "Problema" },
    });
    await request("POST", interviewBase, {
      index: 1,
      answers: { company: "Atrasado" },
    });
    expect((await request("GET", interviewBase)).json().data).toMatchObject({
      index: 2,
      answers: { company: "Empresa", problem: "Problema" },
    });
    expect(
      (await request("GET", interviewBase, undefined, member)).json().data,
    ).toBeNull();
    expect(
      (
        await request(
          "POST",
          interviewBase,
          { index: 1, answers: { company: "Outro ator" } },
          member,
        )
      ).statusCode,
    ).toBe(200);
    expect((await request("GET", interviewBase)).json().data.answers).toEqual({
      company: "Empresa",
      problem: "Problema",
    });
    await expect(
      asRole("authenticated", owner, (client) =>
        client.query("select * from kesko_workflow.interview_drafts"),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("serializes duplicate operations and rejects stale CAS without a second event", async () => {
    const { project } = await create();
    const url = `${base}/${project.id}/commands`;
    const command = {
      operationId: randomUUID(),
      expectedVersion: 1,
      type: "run_step",
      stepId: "discovery",
    };
    const repeated = await Promise.all([
      request("POST", url, command),
      request("POST", url, command),
    ]);
    expect(repeated.map((r) => r.statusCode)).toEqual([200, 200]);
    expect(repeated[1].json()).toEqual(repeated[0].json());
    expect(repeated[0].json().data.project.steps[0].attempts).toBe(1);
    expect(repeated[0].json().data.history).toHaveLength(2);
    expect(
      (await request("POST", url, { ...command, stepId: "prd" })).statusCode,
    ).toBe(409);
    const race = await Promise.all(
      [1, 2].map(() =>
        request("POST", url, {
          ...command,
          expectedVersion: 2,
          operationId: randomUUID(),
        }),
      ),
    );
    expect(race.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    const state = (await request("GET", `${base}/${project.id}`)).json().data;
    expect(state.project.version).toBe(3);
    expect(state.history).toHaveLength(3);
    expect(
      (await request("POST", url, command)).json().data.project.version,
    ).toBe(3);
  });
  it("persists failed attempts, briefing revisions and a human-approved PRD", async () => {
    let state: WorkflowDetail = await create();
    const url = `${base}/${state.project.id}/commands`;
    const execute = async (command: object, actor = owner) => {
      const result = await request(
        "POST",
        url,
        {
          operationId: randomUUID(),
          expectedVersion: state.project.version,
          ...command,
        },
        actor,
      );
      expect(result.statusCode).toBe(200);
      state = result.json().data;
      return result.json().data;
    };
    for (let i = 0; i < 3; i++)
      await execute({ type: "run_step", stepId: "discovery" });
    expect(state.project.steps[0]).toMatchObject({
      attempts: 3,
      state: "blocked",
    });
    expect(
      (
        await request("POST", url, {
          operationId: randomUUID(),
          expectedVersion: state.project.version,
          type: "run_step",
          stepId: "discovery",
        })
      ).statusCode,
    ).toBe(409);
    const briefing = {
      company: "KESKO",
      problem: "Retomar trabalho",
      audience: "Equipe",
      objective: "Salvar o fluxo",
      successMetric: "Zero perda",
      scope: "Projeto",
      outOfScope: "Deploy",
      requirements: "Persistir",
      acceptanceCriteria: "Reabrir",
      nonFunctional: "Isolamento",
      constraints: "Local",
    };
    await execute({ type: "update_briefing", briefing });
    await execute({ type: "run_step", stepId: "discovery" });
    await execute({ type: "run_step", stepId: "prd" });
    expect(state.project.steps[1].state).toBe("awaiting_approval");
    expect(state.project.artifacts[1].content).toContain("Retomar trabalho");
    const previousArtifact = state.project.artifacts[1].id;
    await execute({
      type: "update_briefing",
      briefing: { ...briefing, problem: "Problema revisado" },
    });
    expect(state.project.steps[0]).toMatchObject({
      attempts: 0,
      state: "in_progress",
    });
    expect(state.project.artifacts[1].id).toBe(previousArtifact);
    expect(
      (
        await request("POST", url, {
          operationId: randomUUID(),
          expectedVersion: state.project.version,
          type: "approve_prd",
          reason: "Obsoleto",
        })
      ).statusCode,
    ).toBe(409);
    await execute({ type: "run_step", stepId: "discovery" });
    await execute({ type: "run_step", stepId: "prd" });
    await pool.query(
      "update public.tenant_memberships set role='admin' where tenant_id=$1 and user_id=$2",
      [tenantId, member],
    );
    const approved = await execute(
      { type: "approve_prd", reason: "Requisitos revisados" },
      member,
    );
    expect(approved.nextAction).toMatchObject({
      type: "submit_journey",
      stepId: "journey",
    });
    expect(state.project.artifacts.at(-1)).toMatchObject({
      approvedBy: member,
      approvalReason: "Requisitos revisados",
      verification: "human_review",
    });
    expect(state.history.at(-1)).toMatchObject({
      actorId: member,
      type: "approve_prd",
    });
    expect(
      (
        await request("POST", url, {
          operationId: randomUUID(),
          expectedVersion: state.project.version,
          type: "update_briefing",
          briefing,
        })
      ).statusCode,
    ).toBe(409);
    expect(state.history).toHaveLength(state.project.version);
  });
  it("binds operation keys to tenant, actor, action and project", async () => {
    const firstInput = input();
    const first = (await request("POST", base, firstInput)).json().data;
    const second = await create();
    const command = {
      operationId: randomUUID(),
      expectedVersion: 1,
      type: "run_step",
      stepId: "discovery",
    };
    expect(
      (await request("POST", `${base}/${first.project.id}/commands`, command))
        .statusCode,
    ).toBe(200);
    expect(
      (await request("POST", `${base}/${second.project.id}/commands`, command))
        .statusCode,
    ).toBe(409);
    expect(
      (
        await request("POST", `${base}/${second.project.id}/commands`, {
          ...command,
          operationId: firstInput.operationId,
        })
      ).statusCode,
    ).toBe(409);
    await pool.query(
      "update public.tenant_memberships set role='admin' where tenant_id=$1 and user_id=$2",
      [tenantId, member],
    );
    expect((await request("POST", base, firstInput, member)).statusCode).toBe(
      409,
    );
    const other = await createTenantWithOwner(
      pool,
      { authenticated: true, userId: owner },
      "Other",
      `workflow-${randomUUID()}`,
      randomUUID(),
    );
    try {
      const otherBase = `/v1/tenants/${other.id}/projects`;
      expect(
        (await request("GET", `${otherBase}/${first.project.id}`)).statusCode,
      ).toBe(404);
      expect(
        (
          await request(
            "POST",
            `${otherBase}/${first.project.id}/commands`,
            command,
          )
        ).statusCode,
      ).toBe(404);
      expect((await request("POST", otherBase, firstInput)).statusCode).toBe(
        201,
      );
    } finally {
      await pool.query("delete from public.tenants where id=$1", [other.id]);
    }
  });
  it("persists resumable human journeys with source checks, CAS, replay and explicit admin approval", async () => {
    let state: WorkflowDetail = await create();
    const url = `${base}/${state.project.id}/commands`;
    const execute = async (command: object) => {
      const response = await request("POST", url, {
        operationId: randomUUID(),
        expectedVersion: state.project.version,
        ...command,
      });
      expect(response.statusCode).toBe(200);
      state = response.json().data;
    };
    await execute({
      type: "update_briefing",
      briefing: Object.fromEntries(
        [
          "company",
          "problem",
          "audience",
          "objective",
          "successMetric",
          "scope",
          "outOfScope",
          "requirements",
          "acceptanceCriteria",
          "nonFunctional",
        ].map((k) => [k, "Synthetic"]),
      ),
    });
    await execute({ type: "run_step", stepId: "discovery" });
    await execute({ type: "run_step", stepId: "prd" });
    await execute({ type: "approve_prd", reason: "Reviewed" });
    const source = {
      sourcePrdId: state.project.artifacts.at(-1)!.id,
      sourcePrdHash: state.project.artifacts.at(-1)!.sha256,
    };
    const partial = {
      type: "submit_journey",
      ...source,
      journey: { profiles: "Equipe" },
      operationId: randomUUID(),
      expectedVersion: state.project.version,
    };
    const retries = await Promise.all([
      request("POST", url, partial),
      request("POST", url, partial),
    ]);
    expect(retries.map((r) => r.statusCode)).toEqual([200, 200]);
    expect(retries[0].json()).toEqual(retries[1].json());
    state = retries[0].json().data;
    const savedPartial = structuredClone(state.project.artifacts.at(-1)!);
    expect(savedPartial.journeyInput?.journey).toMatchObject({
      profiles: "Equipe",
      entry: "",
    });
    expect(savedPartial.approvedBy).toBeUndefined();
    expect(state.history.at(-1)?.details.input).toMatchObject({
      type: "submit_journey",
      ...source,
      journey: { profiles: "Equipe", entry: "" },
    });
    await app.close();
    app = makeApp();
    expect(
      (await request("GET", `${base}/${state.project.id}`)).json().data,
    ).toEqual(state);
    const approval = {
      type: "approve_journey",
      ...source,
      artifactId: savedPartial.id,
      reason: "Reviewed",
      operationId: randomUUID(),
      expectedVersion: state.project.version,
    };
    expect((await request("POST", url, approval)).statusCode).toBe(409);
    expect(
      (
        await request("POST", url, {
          ...partial,
          journey: { profiles: "Changed" },
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (await request("POST", url, { ...partial, operationId: randomUUID() }))
        .statusCode,
    ).toBe(409);
    const complete = validateJourney(
      Object.fromEntries(journeyFields.map((k) => [k, "Human " + k])),
    );
    const revised = {
      ...partial,
      expectedVersion: state.project.version,
      journey: complete,
    };
    for (const actor of [viewer, member, outsider]) {
      expect(
        (
          await request(
            "POST",
            url,
            { ...revised, operationId: randomUUID() },
            actor,
          )
        ).statusCode,
      ).toBe(actor === outsider ? 404 : 403);
      expect(
        (
          await request(
            "POST",
            url,
            { ...approval, operationId: randomUUID() },
            actor,
          )
        ).statusCode,
      ).toBe(actor === outsider ? 404 : 403);
    }
    for (const changed of [
      { sourcePrdId: randomUUID() },
      { sourcePrdHash: "a".repeat(64) },
    ]) {
      expect(
        (
          await request("POST", url, {
            ...revised,
            ...changed,
            operationId: randomUUID(),
          })
        ).statusCode,
      ).toBe(409);
      expect(
        (
          await request("POST", url, {
            ...approval,
            ...changed,
            operationId: randomUUID(),
          })
        ).statusCode,
      ).toBe(409);
    }
    const race = await Promise.all(
      [1, 2].map(() =>
        request("POST", url, { ...revised, operationId: randomUUID() }),
      ),
    );
    expect(race.map((r) => r.statusCode).sort()).toEqual([200, 409]);
    state = race.find((r) => r.statusCode === 200)!.json().data;
    expect(state.project.artifacts.at(-2)).toEqual(savedPartial);
    expect(
      (
        await request("POST", url, {
          ...approval,
          expectedVersion: state.project.version,
          operationId: randomUUID(),
        })
      ).statusCode,
    ).toBe(409);
    await pool.query(
      "update public.tenant_memberships set role='admin' where tenant_id=$1 and user_id=$2",
      [tenantId, member],
    );
    const latest = {
      ...approval,
      artifactId: state.project.artifacts.at(-1)!.id,
      expectedVersion: state.project.version,
      operationId: randomUUID(),
    };
    const approved = await request("POST", url, latest, member);
    expect(approved.statusCode).toBe(200);
    state = approved.json().data;
    expect(state.project.artifacts.at(-1)).toMatchObject({
      approvedBy: member,
      verification: "human_review",
      journeyInput: { ...source, authorship: "human", journey: complete },
    });
    expect(approved.json().data.nextAction).toMatchObject({
      type: "submit_design",
      stepId: "design",
    });
    expect((await request("POST", url, latest, member)).json().data).toEqual(
      state,
    );
    expect(
      (
        await request("POST", url, {
          ...revised,
          expectedVersion: state.project.version,
          operationId: randomUUID(),
        })
      ).statusCode,
    ).toBe(409);
    expect(
      (await request("GET", `${base}/${state.project.id}`)).json().data,
    ).toEqual(state);
    const designSource = {
      sourceJourneyId: state.project.artifacts.at(-1)!.id,
      sourceJourneyHash: state.project.artifacts.at(-1)!.sha256,
    };
    const design = validateDesign(
      Object.fromEntries(designFields.map((k) => [k, `Design ${k}`])),
    );
    expect(
      (
        await request("POST", url, {
          type: "submit_design",
          ...designSource,
          design: Object.fromEntries(
            designFields.map((k) => [k, "é".repeat(4000)]),
          ),
          operationId: randomUUID(),
          expectedVersion: state.project.version,
        })
      ).statusCode,
    ).toBe(400);
    expect(
      (
        await request("POST", url, {
          type: "submit_design",
          sourceJourneyId: designSource.sourceJourneyId,
          sourceJourneyHash: "a".repeat(64),
          design,
          operationId: randomUUID(),
          expectedVersion: state.project.version,
        })
      ).statusCode,
    ).toBe(409);
    const designOperationId = randomUUID();
    const designCommand = {
      type: "submit_design",
      ...designSource,
      design,
      operationId: designOperationId,
      expectedVersion: state.project.version,
    };
    for (const actor of [viewer, outsider])
      expect(
        (
          await request(
            "POST",
            url,
            { ...designCommand, operationId: randomUUID() },
            actor,
          )
        ).statusCode,
      ).toBe(actor === outsider ? 404 : 403);
    const designSubmit = await request("POST", url, designCommand);
    expect(designSubmit.statusCode).toBe(200);
    expect((await request("POST", url, designCommand)).json().data).toEqual(
      designSubmit.json().data,
    );
    state = designSubmit.json().data;
    expect(state.project.steps[3].state).toBe("awaiting_approval");
    expect(state.project.artifacts.at(-1)).toMatchObject({
      verification: "draft",
      designInput: { ...designSource, authorship: "human", design },
    });
    const designApprovalBody = {
      type: "approve_design",
      ...designSource,
      artifactId: state.project.artifacts.at(-1)!.id,
      reason: "UI/UX revisada",
      operationId: randomUUID(),
      expectedVersion: state.project.version,
    };
    expect(
      (
        await request(
          "POST",
          url,
          { ...designApprovalBody, expectedVersion: state.project.version - 1 },
          member,
        )
      ).statusCode,
    ).toBe(409);
    const designApproval = await request(
      "POST",
      url,
      designApprovalBody,
      member,
    );
    expect(designApproval.statusCode).toBe(200);
    state = designApproval.json().data;
    expect(state.project.steps[3].state).toBe("completed");
    expect(state.project.artifacts.at(-1)).toMatchObject({
      verification: "human_review",
      approvedBy: member,
    });
    expect(designApproval.json().data.nextAction).toMatchObject({
      type: "blocked",
      stepId: "domain",
    });
    expect(state.history).toHaveLength(state.project.version);
  });
  it("retains every briefing input and failed validation result without artifacts", async () => {
    const { project } = await create();
    const url = `${base}/${project.id}/commands`;
    const first = {
      operationId: randomUUID(),
      expectedVersion: 1,
      type: "update_briefing",
      briefing: { company: "Primeira empresa", problem: "Primeiro problema" },
    };
    expect((await request("POST", url, first)).statusCode).toBe(200);
    const second = {
      operationId: randomUUID(),
      expectedVersion: 2,
      type: "update_briefing",
      briefing: { company: "Segunda empresa" },
    };
    expect((await request("POST", url, second)).statusCode).toBe(200);
    const failed = await request("POST", url, {
      operationId: randomUUID(),
      expectedVersion: 3,
      type: "run_step",
      stepId: "discovery",
    });
    expect(failed.statusCode).toBe(200);
    const state = failed.json().data;
    expect(state.project.artifacts).toEqual([]);
    expect(state.project.briefing.company).toBe("Segunda empresa");
    expect(state.history[1].details).toMatchObject({
      action: "update_briefing",
      input: { ...first, briefing: { ...first.briefing, audience: "" } },
      resources: { tenantId, projectId: project.id },
      output: {
        briefingRevision: 2,
        artifactIds: [],
        nextAction: { type: "run_step", stepId: "discovery" },
      },
      evidence: {
        inputValidation: { validator: "validateCommand", outcome: "passed" },
      },
    });
    expect(state.history[2].details.input.briefing.company).toBe(
      "Segunda empresa",
    );
    expect(state.history[3].details.output.steps[0]).toMatchObject({
      id: "discovery",
      state: "failed",
      attempts: 1,
      reason: expect.stringContaining("problem"),
    });
    expect(state.history[3].details.evidence.domainEvaluation).toMatchObject({
      evaluator: "applyCommand",
      outcome: "failed",
      reason: expect.stringContaining("problem"),
    });
    const reloaded = (await request("GET", `${base}/${project.id}`)).json()
      .data;
    expect(reloaded.history).toEqual(state.history);
  });
  it.each([viewer, member])(
    "allows reads but denies all HTTP writes for %s",
    async (actor) => {
      const { project } = await create();
      expect((await request("GET", base, undefined, actor)).statusCode).toBe(
        200,
      );
      const read = await request(
        "GET",
        `${base}/${project.id}`,
        undefined,
        actor,
      );
      expect(read.statusCode).toBe(200);
      expect(read.json().data.history).toHaveLength(1);
      expect((await request("POST", base, input(), actor)).statusCode).toBe(
        403,
      );
      for (const command of [
        { type: "run_step", stepId: "discovery" },
        { type: "update_briefing", briefing: {} },
        { type: "approve_prd", reason: "Reviewed" },
        {
          type: "submit_journey",
          sourcePrdId: randomUUID(),
          sourcePrdHash: "a".repeat(64),
          journey: {},
        },
        {
          type: "approve_journey",
          sourcePrdId: randomUUID(),
          sourcePrdHash: "a".repeat(64),
          artifactId: randomUUID(),
          reason: "Reviewed",
        },
      ]) {
        expect(
          (
            await request(
              "POST",
              `${base}/${project.id}/commands`,
              { operationId: randomUUID(), expectedVersion: 1, ...command },
              actor,
            )
          ).statusCode,
        ).toBe(403);
      }
    },
  );
  it("hides foreign and suspended memberships and project IDs", async () => {
    const { project } = await create();
    expect(
      (await request("GET", `${base}/${project.id}`, undefined, outsider))
        .statusCode,
    ).toBe(404);
    expect((await request("GET", `${base}/${randomUUID()}`)).statusCode).toBe(
      404,
    );
    await pool.query(
      "update public.tenant_memberships set status='suspended' where tenant_id=$1 and user_id=$2",
      [tenantId, owner],
    );
    expect((await request("GET", base)).statusCode).toBe(404);
    expect(
      await asRole(
        "authenticated",
        owner,
        async (c) =>
          (
            await c.query(
              "select * from kesko_workflow.projects where tenant_id=$1",
              [tenantId],
            )
          ).rowCount,
      ),
    ).toBe(0);
  });
  it("denies direct authenticated DML, executor escalation and audit mutations", async () => {
    const { project } = await create();
    for (const sql of [
      "update kesko_workflow.projects set version=version+1 where id=$1",
      "delete from kesko_workflow.projects where id=$1",
      "delete from kesko_workflow.events where project_id=$1",
      "update kesko_workflow.events set type='forged' where project_id=$1",
    ]) {
      await expect(
        asRole("authenticated", owner, (c) => c.query(sql, [project.id])),
      ).rejects.toMatchObject({ code: "42501" });
    }
    expect(
      await asRole(
        "authenticated",
        owner,
        async (c) =>
          (
            await c.query("select * from kesko_workflow.projects where id=$1", [
              project.id,
            ])
          ).rowCount,
      ),
    ).toBe(1);
    for (const actor of [viewer, member, outsider]) {
      expect(
        await asRole(
          "kesko_workflow_executor",
          actor,
          async (c) =>
            (
              await c.query(
                "update kesko_workflow.projects set version=version+1 where id=$1",
                [project.id],
              )
            ).rowCount,
        ),
      ).toBe(0);
    }
    await expect(
      asRole("kesko_workflow_executor", owner, (c) =>
        c.query("delete from kesko_workflow.events where project_id=$1", [
          project.id,
        ]),
      ),
    ).rejects.toMatchObject({ code: "42501" });
    for (const role of ["authenticated", "kesko_workflow_executor"] as const) {
      for (const actor of [viewer, member, outsider]) {
        const id = randomUUID();
        await expect(
          asRole(role, actor, (c) =>
            c.query(
              "insert into kesko_workflow.projects (id,tenant_id,version,snapshot,created_at) values ($1,$2,1,$3,now())",
              [id, tenantId, { ...project, id, createdBy: actor }],
            ),
          ),
        ).rejects.toMatchObject({ code: "42501" });
      }
    }
    const forbidden = await pool.query(
      "select has_table_privilege('authenticated','kesko_workflow.projects','INSERT') as insert, has_table_privilege('authenticated','kesko_workflow.projects','TRUNCATE') as truncate, has_table_privilege('anon','kesko_workflow.projects','SELECT') as anon_read",
    );
    expect(forbidden.rows).toEqual([
      { insert: false, truncate: false, anon_read: false },
    ]);
    const role = await pool.query(
      "select rolcanlogin,rolbypassrls,rolsuper from pg_roles where rolname='kesko_workflow_executor'",
    );
    expect(role.rows).toEqual([
      { rolcanlogin: false, rolbypassrls: false, rolsuper: false },
    ]);
    const grants = await pool.query(
      "select pg_has_role('authenticated','kesko_workflow_executor','MEMBER') as auth, pg_has_role('anon','kesko_workflow_executor','MEMBER') as anon",
    );
    expect(grants.rows).toEqual([{ auth: false, anon: false }]);
  });
  it("rolls back snapshot when audit insertion fails and restores connection identity", async () => {
    const { project } = await create();
    // Restrict only this fixture tenant; concurrent suites are unaffected.
    const constraint = `workflow_failure_${tenantId.replaceAll("-", "")}`;
    await pool.query(
      `alter table kesko_workflow.events add constraint ${constraint} check (tenant_id <> '${tenantId}'::uuid or version = 1)`,
    );
    try {
      const result = await request("POST", `${base}/${project.id}/commands`, {
        operationId: randomUUID(),
        expectedVersion: 1,
        type: "run_step",
        stepId: "discovery",
      });
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
      const after = (await request("GET", `${base}/${project.id}`)).json().data;
      expect(after.project.version).toBe(1);
      expect(after.history).toHaveLength(1);
    } finally {
      await pool.query(
        `alter table kesko_workflow.events drop constraint ${constraint}`,
      );
    }
    const clients = await Promise.all(
      Array.from({ length: 5 }, () => pool.connect()),
    );
    try {
      for (const c of clients) {
        const identity = await c.query(
          "select current_user as role, nullif(current_setting('request.jwt.claim.sub',true),'') as sub",
        );
        expect(identity.rows).toEqual([{ role: "postgres", sub: null }]);
      }
    } finally {
      clients.forEach((c) => c.release());
    }
  });
  it("rolls back creation and can retry its operationId after audit failure", async () => {
    const constraint = `workflow_create_failure_${tenantId.replaceAll("-", "")}`;
    const payload = input();
    await pool.query(
      `alter table kesko_workflow.events add constraint ${constraint} check (tenant_id <> '${tenantId}'::uuid)`,
    );
    try {
      expect(
        (await request("POST", base, payload)).statusCode,
      ).toBeGreaterThanOrEqual(400);
      expect((await request("GET", base)).json().data).toEqual([]);
      expect(
        (
          await pool.query(
            "select * from kesko_workflow.events where tenant_id=$1",
            [tenantId],
          )
        ).rows,
      ).toEqual([]);
    } finally {
      await pool.query(
        `alter table kesko_workflow.events drop constraint ${constraint}`,
      );
    }
    const retry = await request("POST", base, payload);
    expect(retry.statusCode).toBe(201);
    expect(retry.json().data.history).toHaveLength(1);
  });
});
