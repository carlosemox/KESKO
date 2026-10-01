import { describe, expect, it } from "vitest";
import { Client } from "pg";
import { buildApp } from "../../../src/app.js";

const dbTests = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const ownerId = "00000000-0000-0000-0000-000000000001";

dbTests("S-001 live HTTP vertical", () => {
  it("onboards tenant, reads it and creates a brand through real PostgreSQL/RLS", async () => {
    const app = buildApp();
    const slug = `live-${Date.now()}`;
    let tenantId: string | undefined;

    try {
      const created = await app.inject({
        method: "POST",
        url: "/v1/tenants",
        headers: { authorization: `Bearer local:${ownerId}` },
        payload: { name: "Live Tenant", slug },
      });
      expect(created.statusCode).toBe(201);
      tenantId = created.json().data.id;

      const tenant = await app.inject({
        method: "GET",
        url: `/v1/tenants/${tenantId}`,
        headers: { authorization: `Bearer local:${ownerId}` },
      });
      expect(tenant.statusCode).toBe(200);

      const brand = await app.inject({
        method: "POST",
        url: `/v1/tenants/${tenantId}/brands`,
        headers: { authorization: `Bearer local:${ownerId}` },
        payload: { name: "Live Brand", slug: "live-brand" },
      });
      expect(brand.statusCode).toBe(201);
      expect(brand.json().data).toMatchObject({ tenantId, slug: "live-brand" });
    } finally {
      await app.close();
      const cleanup = new Client({ connectionString: databaseUrl });
      await cleanup.connect();
      try {
        if (tenantId) await cleanup.query("delete from public.tenants where id = $1", [tenantId]);
      } finally {
        await cleanup.end();
      }
    }
  });
});
