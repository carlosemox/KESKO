import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { buildApp } from "../../../src/app.js";
import Fastify from "fastify";
import { registerTenantRoutes } from "../../../src/http/routes/tenants.js";
import { userContextFromRequest } from "../../../src/http/auth-context.js";

const issuer = "https://kesko-fixture.example/auth/v1";
const audience = "authenticated";
const userId = "00000000-0000-0000-0000-000000000001";
const tenantId = "00000000-0000-0000-0000-000000000010";
let keys: Awaited<ReturnType<typeof generateKeyPair>>;
const apps: ReturnType<typeof buildApp>[] = [];
beforeAll(async () => {
  keys = await generateKeyPair("ES256");
});
afterEach(async () => {
  for (const app of apps.splice(0)) await app.close();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
async function fixture(jwt = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            keys: [
              {
                ...(await exportJWK(keys.publicKey)),
                kid: "fixture",
                alg: "ES256",
              },
            ],
          }),
          { status: 200 },
        ),
    ),
  );
  const repositories = {
    createTenantWithOwner: vi.fn(async (_context: unknown) => ({
      id: tenantId,
      name: "Acme",
      slug: "acme",
      created_by: userId,
    })),
    getTenantMembership: vi.fn(async () => ({ role: "viewer" })),
    getTenant: vi.fn(async () => ({
      id: tenantId,
      name: "Acme",
      slug: "acme",
      created_by: userId,
    })),
    createBrand: vi.fn(async () => ({})),
    listBrands: vi.fn(async () => []),
  };
  const app = buildApp({
    repositories,
    ...(jwt ? { jwt: { issuer, audience } } : {}),
  });
  apps.push(app);
  return { app, repositories };
}
async function token(overrides = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: userId,
    iss: issuer,
    aud: audience,
    iat: now,
    exp: now + 300,
    role: "owner",
    tenant_id: tenantId,
    ...overrides,
  })
    .setProtectedHeader({ alg: "ES256", kid: "fixture" })
    .sign(keys.privateKey);
}
describe("JWT connected HTTP authentication", () => {
  it("does not authenticate standalone route plugins from local headers", async () => {
    const { repositories } = await fixture();
    const app = Fastify();
    apps.push(app);
    registerTenantRoutes(app, repositories);
    const response = await app.inject({
      method: "POST",
      url: "/v1/tenants",
      headers: { authorization: `Bearer local:${userId}` },
      payload: { name: "Acme", slug: "acme" },
    });
    expect(response.statusCode).toBe(401);
    expect(repositories.createTenantWithOwner).not.toHaveBeenCalled();
  });
  it("reuses trusted request identity without reparsing headers or sharing mutable state", async () => {
    const { app } = await fixture();
    app.get("/identity-fixture", async (request) => {
      const first = userContextFromRequest(request);
      request.headers.authorization = "Bearer invalid";
      first.userId = "changed";
      return userContextFromRequest(request);
    });
    const response = await app.inject({
      url: "/identity-fixture",
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(response.json()).toEqual({ authenticated: true, userId });
    expect((await app.inject({ url: "/v1/tenants" })).statusCode).not.toBe(200);
  });
  it("onboards with the verified user and preserves the response contract", async () => {
    const { app, repositories } = await fixture();
    const response = await app.inject({
      method: "POST",
      url: "/v1/tenants",
      headers: { authorization: `Bearer ${await token()}` },
      payload: { name: "Acme", slug: "acme" },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().data.createdBy).toBe(userId);
    expect(repositories.createTenantWithOwner.mock.calls[0]?.[0]).toEqual({
      authenticated: true,
      userId,
    });
  });
  it("retains database membership authority over token role and tenant claims", async () => {
    const { app, repositories } = await fixture();
    const response = await app.inject({
      method: "POST",
      url: `/v1/tenants/${tenantId}/brands`,
      headers: { authorization: `Bearer ${await token()}` },
      payload: { name: "Brand", slug: "brand" },
    });
    expect(response.statusCode).toBe(403);
    expect(repositories.getTenantMembership).toHaveBeenCalledWith(
      { authenticated: true, userId },
      tenantId,
    );
    expect(repositories.createBrand).not.toHaveBeenCalled();
  });
  it("rejects invalid JWT and local tokens before any repository access", async () => {
    const { app, repositories } = await fixture();
    for (const bearer of [
      "bad.jwt.token",
      `local:${userId}`,
      await token({ exp: 1 }),
      await token({ iss: "wrong" }),
      await token({ aud: "wrong" }),
      await token({ sub: "bad" }),
    ]) {
      const response = await app.inject({
        method: "POST",
        url: "/v1/tenants",
        headers: { authorization: `Bearer ${bearer}` },
        payload: { name: "Acme", slug: "acme" },
      });
      expect(response.statusCode).toBe(401);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.json().error.code).toBe("UNAUTHENTICATED");
    }
    for (const repository of Object.values(repositories))
      expect(repository).not.toHaveBeenCalled();
  });
  it("keeps the loopback boundary ahead of JWT verification", async () => {
    const { app, repositories } = await fixture();
    const response = await app.inject({
      url: `/v1/tenants/${tenantId}`,
      remoteAddress: "192.0.2.1",
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(response.statusCode).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
    expect(repositories.getTenantMembership).not.toHaveBeenCalled();
  });
  it("preserves explicit local development/test compatibility without JWT fallback", async () => {
    vi.stubEnv("SUPABASE_JWT_ISSUER", undefined);
    vi.stubEnv("SUPABASE_JWT_AUDIENCE", undefined);
    vi.stubEnv("NODE_ENV", "test");
    const { app, repositories } = await fixture(false);
    const request = {
      method: "POST" as const,
      url: "/v1/tenants",
      payload: { name: "Acme", slug: "acme" },
    };
    expect(
      (
        await app.inject({
          ...request,
          headers: { authorization: `Bearer local:${userId}` },
        })
      ).statusCode,
    ).toBe(201);
    expect(
      (
        await app.inject({
          ...request,
          headers: { authorization: `Bearer ${await token()}` },
        })
      ).statusCode,
    ).toBe(401);
    for (const env of ["production", "staging", undefined]) {
      vi.stubEnv("NODE_ENV", env);
      expect(
        (
          await app.inject({
            ...request,
            headers: { authorization: `Bearer local:${userId}` },
          })
        ).statusCode,
      ).toBe(401);
    }
    expect(repositories.createTenantWithOwner).toHaveBeenCalledTimes(1);
  });
});
