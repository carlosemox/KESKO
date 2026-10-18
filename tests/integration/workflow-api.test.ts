import Fastify from "fastify";
import { Pool } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerWorkflowRoutes } from "../../src/workflow/routes.js";

const apps: ReturnType<typeof Fastify>[] = [];
afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
  vi.unstubAllEnvs();
});
function app() {
  const instance = Fastify();
  // These cases must fail before acquiring a database connection.
  const pool = new Pool({
    connectionString: "postgresql://localhost:1/unreachable",
    connectionTimeoutMillis: 50,
  });
  registerWorkflowRoutes(instance, pool);
  instance.addHook("onClose", async () => {
    await pool.end();
  });
  apps.push(instance);
  return instance;
}
const base = "/v1/tenants/00000000-0000-0000-0000-000000000001/projects";
const interviewBase =
  "/v1/tenants/00000000-0000-0000-0000-000000000001/interview-draft";
const headers = {
  authorization: "Bearer local:00000000-0000-0000-0000-000000000001",
};
describe("workflow HTTP input boundary", () => {
  it.each([
    { method: "GET" as const, url: base },
    { method: "POST" as const, url: base },
    {
      method: "GET" as const,
      url: `${base}/00000000-0000-0000-0000-000000000008`,
    },
    {
      method: "POST" as const,
      url: `${base}/00000000-0000-0000-0000-000000000008/commands`,
    },
  ])(
    "disables caching before authentication: $method $url",
    async (options) => {
      const response = await app().inject(options);
      expect(response.statusCode).toBe(401);
      expect(response.headers["cache-control"]).toBe("no-store");
    },
  );
  it("disables caching on parser and validation errors", async () => {
    const instance = app();
    for (const payload of [
      { operationId: "invalid" },
      { name: "x".repeat(300000) },
    ]) {
      const response = await instance.inject({
        method: "POST",
        url: base,
        headers,
        payload,
      });
      expect([400, 413]).toContain(response.statusCode);
      expect(response.headers["cache-control"]).toBe("no-store");
    }
  });
  it.each([base, `${base}/bad`, "/v1/tenants/bad/projects"])(
    "authenticates before lookup: %s",
    async (url) => {
      expect((await app().inject({ url })).statusCode).toBe(401);
    },
  );
  it("rejects production local identity", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await app().inject({ url: base, headers })).statusCode).toBe(401);
  });
  it.each(["/v1/tenants/bad/projects", `${base}/bad`])(
    "validates path UUIDs before lookup: %s",
    async (url) => {
      expect((await app().inject({ url, headers })).statusCode).toBe(400);
    },
  );
  it.each([
    { operationId: "bad", name: "Test", kind: "project", briefing: {} },
    {
      operationId: "00000000-0000-0000-0000-000000000005",
      name: "Test",
      kind: "project",
      briefing: {},
      version: 99,
    },
    {
      operationId: "00000000-0000-0000-0000-000000000005",
      name: "Test",
      kind: "project",
      briefing: { company: "x".repeat(4001) },
    },
  ])("rejects malformed or forged creation before lookup", async (payload) => {
    expect(
      (await app().inject({ method: "POST", url: base, headers, payload }))
        .statusCode,
    ).toBe(400);
  });
  it.each([
    { type: "run_step", stepId: "unknown", expectedVersion: 1 },
    { type: "run_step", stepId: "discovery", expectedVersion: 0 },
    {
      type: "run_step",
      stepId: "discovery",
      expectedVersion: 1,
      reason: "forged",
    },
    { type: "approve_prd", expectedVersion: 1, reason: "" },
    {
      type: "update_briefing",
      expectedVersion: 1,
      briefing: { approvedBy: "forged" },
    },
  ])("rejects invalid command before lookup", async (command) => {
    const response = await app().inject({
      method: "POST",
      url: `${base}/00000000-0000-0000-0000-000000000008/commands`,
      headers,
      payload: {
        operationId: "00000000-0000-0000-0000-000000000005",
        ...command,
      },
    });
    expect(response.statusCode).toBe(400);
  });
  it("limits the encoded body", async () => {
    expect(
      (
        await app().inject({
          method: "POST",
          url: base,
          headers,
          payload: { name: "x".repeat(300000) },
        })
      ).statusCode,
    ).toBe(413);
  });
  it.each([
    { index: -1, answers: {} },
    { index: 12, answers: {} },
    { index: 1, answers: { unknown: "x" } },
    { index: 1, answers: {}, expectedVersion: "invalid" },
    { index: 1, answers: {}, expectedVersion: 1 },
  ])("rejects malformed interview drafts before lookup", async (payload) => {
    const response = await app().inject({
      method: "POST",
      url: interviewBase,
      headers,
      payload,
    });
    expect(response.statusCode).toBe(400);
  });
});
