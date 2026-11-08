import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app.js";
import { createTenantWithOwner } from "../../src/db/tenant-repository.js";

const databaseTests =
  process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
databaseTests("signed JWT and real PostgreSQL authorization", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("uses verified subject and database membership, never token tenant/role claims", async () => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const issuer = "https://kesko-auth-fixture.invalid/auth/v1";
    const owner = "00000000-0000-0000-0000-000000000001";
    const outsider = "00000000-0000-0000-0000-000000000002";
    const { privateKey, publicKey } = await generateKeyPair("ES256");
    const jwk = { ...(await exportJWK(publicKey)), kid: "fixture" };
    const fetchKeys = vi.fn(
      async () =>
        new Response(JSON.stringify({ keys: [jwk] }), {
          headers: { "Content-Type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchKeys);
    const app = buildApp({ jwt: { issuer, audience: "authenticated" } });
    let tenantId: string | undefined;
    try {
      const tenant = await createTenantWithOwner(
        pool,
        { authenticated: true, userId: owner },
        "JWT synthetic tenant",
        `jwt-${randomUUID()}`,
        randomUUID(),
      );
      tenantId = tenant.id;
      const token = (subject: string) =>
        new SignJWT({ role: "owner", tenant_id: tenantId })
          .setProtectedHeader({ alg: "ES256", kid: "fixture" })
          .setIssuer(issuer)
          .setAudience("authenticated")
          .setSubject(subject)
          .setIssuedAt()
          .setExpirationTime("5m")
          .sign(privateKey);
      const ownerToken = await token(owner);
      const outsiderToken = await token(outsider);
      const base = `/v1/tenants/${tenantId}/projects`;
      const created = await app.inject({
        method: "POST",
        url: base,
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          operationId: randomUUID(),
          name: "JWT fixture project",
          kind: "project",
          briefing: {},
        },
      });
      expect(created.statusCode).toBe(201);
      const projectId = created.json().data.project.id;
      for (const url of [
        base,
        `${base}/${projectId}`,
        `/v1/tenants/${tenantId}/interview-draft`,
      ]) {
        expect(
          (
            await app.inject({
              method: "GET",
              url,
              headers: { authorization: `Bearer ${outsiderToken}` },
            })
          ).statusCode,
        ).toBe(404);
      }
      expect(
        (
          await app.inject({
            method: "GET",
            url: `${base}/${projectId}`,
            headers: { authorization: `Bearer ${ownerToken}` },
          })
        ).statusCode,
      ).toBe(200);
      expect(
        (
          await app.inject({
            method: "GET",
            url: base,
            headers: { authorization: `Bearer local:${owner}` },
          })
        ).statusCode,
      ).toBe(401);
      await pool.query(
        "update public.tenant_memberships set status='suspended' where tenant_id=$1 and user_id=$2",
        [tenantId, owner],
      );
      expect(
        (
          await app.inject({
            method: "GET",
            url: base,
            headers: { authorization: `Bearer ${ownerToken}` },
          })
        ).statusCode,
      ).toBe(404);
      expect(fetchKeys).toHaveBeenCalled();
    } finally {
      await app.close();
      try {
        if (tenantId)
          await pool.query("delete from public.tenants where id=$1", [
            tenantId,
          ]);
      } finally {
        await pool.end();
      }
    }
  });
});
