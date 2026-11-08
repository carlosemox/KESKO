import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.js";

const ownerId = "00000000-0000-0000-0000-000000000001";
const tenantId = "00000000-0000-0000-0000-000000000010";

function repositoryFixture() {
  const state = {
    tenant: {
      id: tenantId,
      name: "Existing Tenant",
      slug: "existing-tenant",
      created_by: ownerId,
    },
    memberships: new Map([[`${tenantId}:${ownerId}`, "owner"]]),
    brands: [] as Array<{
      id: string;
      tenant_id: string;
      name: string;
      slug: string;
      created_by: string;
    }>,
    auditEvents: [] as Array<Record<string, unknown>>,
    createTenantCalls: 0,
  };

  return {
    state,
    repositories: {
      createTenantWithOwner: async (
        context: { userId?: string },
        name: string,
        slug: string,
        correlationId: string,
      ) => {
        state.createTenantCalls += 1;
        const created = {
          id: "00000000-0000-0000-0000-000000000011",
          name,
          slug,
          created_by: context.userId!,
        };
        state.tenant = created;
        state.memberships.set(`${created.id}:${context.userId}`, "owner");
        state.auditEvents.push({
          actor_user_id: context.userId,
          tenant_id: created.id,
          action: "tenant.created",
          correlation_id: correlationId,
          outcome: "success",
        });
        return created;
      },
      getTenantMembership: async (
        context: { userId?: string },
        requestedTenantId: string,
      ) => {
        const role = state.memberships.get(
          `${requestedTenantId}:${context.userId}`,
        );
        return role
          ? {
              tenant_id: requestedTenantId,
              user_id: context.userId!,
              role,
              status: "active" as const,
            }
          : undefined;
      },
      getTenant: async (_context: unknown, requestedTenantId: string) =>
        requestedTenantId === state.tenant.id ? state.tenant : undefined,
      createBrand: async (
        context: { userId?: string },
        requestedTenantId: string,
        input: { name: string; slug: string },
        correlationId: string,
      ) => {
        const brand = {
          id: `00000000-0000-0000-0000-${String(state.brands.length + 20).padStart(12, "0")}`,
          tenant_id: requestedTenantId,
          name: input.name,
          slug: input.slug,
          created_by: context.userId!,
        };
        state.brands.push(brand);
        state.auditEvents.push({
          actor_user_id: context.userId,
          tenant_id: requestedTenantId,
          action: "brand.created",
          entity_id: brand.id,
          correlation_id: correlationId,
          outcome: "success",
        });
        return brand;
      },
      listBrands: async (_context: unknown, requestedTenantId: string) =>
        state.brands.filter((brand) => brand.tenant_id === requestedTenantId),
    },
  };
}

describe("S-001 HTTP onboarding", () => {
  const apps: Array<{ close: () => Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("creates a tenant and exactly one owner from the validated bearer identity", async () => {
    const fixture = repositoryFixture();
    const app = buildApp({ repositories: fixture.repositories });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/tenants",
      headers: { authorization: `Bearer local:${ownerId}` },
      payload: {
        name: "Acme Marketing",
        slug: "acme-marketing",
        user_id: "00000000-0000-0000-0000-000000000099",
        tenant_id: "00000000-0000-0000-0000-000000000099",
        role: "admin",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(fixture.state.createTenantCalls).toBe(0);
  });

  it("onboards a tenant with a single owner when the payload contains only tenant fields", async () => {
    const fixture = repositoryFixture();
    const app = buildApp({ repositories: fixture.repositories });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/tenants",
      headers: { authorization: `Bearer local:${ownerId}` },
      payload: { name: "Acme Marketing", slug: "acme-marketing" },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().data).toMatchObject({
      name: "Acme Marketing",
      slug: "acme-marketing",
      createdBy: ownerId,
    });
    expect(fixture.state.auditEvents).toHaveLength(1);
    expect(fixture.state.auditEvents[0]).toMatchObject({
      actor_user_id: ownerId,
      action: "tenant.created",
      outcome: "success",
    });
  });

  it("rejects a request without a bearer identity", async () => {
    const fixture = repositoryFixture();
    const app = buildApp({ repositories: fixture.repositories });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/tenants",
      payload: { name: "Acme Marketing", slug: "acme-marketing" },
    });

    expect(response.statusCode).toBe(401);
    expect(fixture.state.createTenantCalls).toBe(0);
  });

  it("fails closed for the local bearer adapter in production", async () => {
    const fixture = repositoryFixture();
    const app = buildApp({ repositories: fixture.repositories });
    apps.push(app);
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const response = await app.inject({
        method: "POST",
        url: "/v1/tenants",
        headers: { authorization: `Bearer local:${ownerId}` },
        payload: { name: "Acme Marketing", slug: "acme-marketing" },
      });
      expect(response.statusCode).toBe(401);
      expect(fixture.state.createTenantCalls).toBe(0);
    } finally {
      if (previous === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previous;
    }
  });

  it("rejects invalid tenant input before invoking persistence", async () => {
    const fixture = repositoryFixture();
    const app = buildApp({ repositories: fixture.repositories });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/tenants",
      headers: { authorization: `Bearer local:${ownerId}` },
      payload: { name: "", slug: "Not Kebab Case" },
    });

    expect(response.statusCode).toBe(400);
    expect(fixture.state.createTenantCalls).toBe(0);
  });

  it("rejects a tenant slug outside the versioned contract", async () => {
    const fixture = repositoryFixture();
    const app = buildApp({ repositories: fixture.repositories });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: "/v1/tenants",
      headers: { authorization: `Bearer local:${ownerId}` },
      payload: { name: "Acme Marketing", slug: "Not Kebab Case" },
    });

    expect(response.statusCode).toBe(400);
    expect(fixture.state.createTenantCalls).toBe(0);
  });

  it.each(["owner", "admin"] as const)(
    "creates a brand for a %s without trusting identity fields in the body",
    async (role) => {
      const fixture = repositoryFixture();
      fixture.state.memberships.set(`${tenantId}:${ownerId}`, role);
      const app = buildApp({ repositories: fixture.repositories });
      apps.push(app);

      const response = await app.inject({
        method: "POST",
        url: `/v1/tenants/${tenantId}/brands`,
        headers: { authorization: `Bearer local:${ownerId}` },
        payload: {
          name: "Acme Brand",
          slug: "acme-brand",
          user_id: "00000000-0000-0000-0000-000000000099",
          tenant_id: "00000000-0000-0000-0000-000000000099",
          role: "viewer",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(fixture.state.brands).toHaveLength(0);
      expect(fixture.state.auditEvents).toHaveLength(0);
    },
  );
});
