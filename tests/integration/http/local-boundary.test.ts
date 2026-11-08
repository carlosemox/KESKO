import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import { Pool } from "pg";
import { buildApp } from "../../../src/app.js";
import { registerWorkflowRoutes } from "../../../src/workflow/routes.js";
import { registerIdentityHook } from "../../../src/http/auth-context.js";

const id = "00000000-0000-0000-0000-000000000001";
describe("local development network boundary", () => {
  it.each([
    { headers: { host: "attacker.example:3000" } },
    { headers: { host: "localhost:3000" }, remoteAddress: "192.0.2.10" },
  ])(
    "rejects foreign hosts/clients on old and new GET/POST routes",
    async (network) => {
      const app = buildApp();
      try {
        for (const url of [
          "/v1/tenants",
          `/v1/tenants/${id}`,
          `/v1/tenants/${id}/brands`,
          `/v1/tenants/${id}/projects`,
        ]) {
          for (const method of ["GET", "POST"] as const) {
            const response = await app.inject({
              method,
              url,
              ...network,
              headers: {
                ...network.headers,
                authorization: `Bearer local:${id}`,
              },
            });
            expect(response.statusCode).toBe(404);
          }
        }
      } finally {
        await app.close();
      }
    },
  );
  it("protects the workflow API even when registered without buildApp", async () => {
    const app = Fastify();
    const pool = new Pool({
      connectionString: "postgresql://localhost:1/unreachable",
      connectionTimeoutMillis: 50,
    });
    registerIdentityHook(app);
    registerWorkflowRoutes(app, pool);
    try {
      for (const method of ["GET", "POST"] as const) {
        const response = await app.inject({
          method,
          url: `/v1/tenants/${id}/projects`,
          headers: {
            host: "attacker.example:3000",
            authorization: `Bearer local:${id}`,
          },
        });
        expect(response.statusCode).toBe(404);
      }
      expect(pool.totalCount).toBe(0);
    } finally {
      await app.close();
      await pool.end();
    }
  });
  it("preserves local authentication requirements and ignores forwarded host claims", async () => {
    const app = buildApp();
    try {
      expect(
        (
          await app.inject({
            url: `/v1/tenants/${id}/projects`,
            headers: { host: "localhost:3000" },
          })
        ).statusCode,
      ).toBe(401);
      expect(
        (
          await app.inject({
            url: `/v1/tenants/${id}/projects`,
            headers: {
              host: "attacker.example",
              "x-forwarded-host": "localhost",
              "x-forwarded-for": "127.0.0.1",
            },
          })
        ).statusCode,
      ).toBe(404);
    } finally {
      await app.close();
    }
  });
});
