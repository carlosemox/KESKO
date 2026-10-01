import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.js";

const tenantA = "00000000-0000-0000-0000-000000000010";
const tenantB = "00000000-0000-0000-0000-000000000011";
const ownerId = "00000000-0000-0000-0000-000000000001";
const memberId = "00000000-0000-0000-0000-000000000002";
const outsiderId = "00000000-0000-0000-0000-000000000003";

function authorizationFixture() {
  const state = {
    memberships: new Map([
      [`${tenantA}:${ownerId}`, "owner"],
      [`${tenantA}:${memberId}`, "member"],
    ]),
    tenants: new Map([
      [tenantA, { id: tenantA, name: "Tenant A", slug: "tenant-a", created_by: ownerId }],
      [tenantB, { id: tenantB, name: "Tenant B", slug: "tenant-b", created_by: outsiderId }],
    ]),
    brands: [{
      id: "00000000-0000-0000-0000-000000000020",
      tenant_id: tenantA,
      name: "Existing Brand",
      slug: "existing-brand",
      created_by: ownerId,
    }],
    createBrandCalls: 0,
  };

  return {
    state,
    repositories: {
      createTenantWithOwner: async () => {
        throw new Error("not used");
      },
      getTenantMembership: async (
        context: { userId?: string },
        requestedTenantId: string,
      ) => {
        const role = state.memberships.get(`${requestedTenantId}:${context.userId}`);
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
        state.tenants.get(requestedTenantId),
      createBrand: async () => {
        state.createBrandCalls += 1;
        throw new Error("createBrand must not be called for a forbidden role");
      },
      listBrands: async (_context: unknown, requestedTenantId: string) =>
        state.brands.filter((brand) => brand.tenant_id === requestedTenantId),
    },
  };
}

describe("S-001 HTTP authorization", () => {
  const apps: Array<{ close: () => Promise<void> }> = [];

  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it("does not disclose another user's tenant", async () => {
    const fixture = authorizationFixture();
    const app = buildApp({ repositories: fixture.repositories });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: `/v1/tenants/${tenantB}`,
      headers: { authorization: `Bearer local:${ownerId}` },
    });

    expect(response.statusCode).toBe(404);
  });

  it("returns 403 for a member trying to create a brand without mutating state", async () => {
    const fixture = authorizationFixture();
    const app = buildApp({ repositories: fixture.repositories });
    apps.push(app);

    const response = await app.inject({
      method: "POST",
      url: `/v1/tenants/${tenantA}/brands`,
      headers: { authorization: `Bearer local:${memberId}` },
      payload: { name: "Blocked Brand", slug: "blocked-brand" },
    });

    expect(response.statusCode).toBe(403);
    expect(fixture.state.createBrandCalls).toBe(0);
  });

  it("allows a member to list only brands in the member's tenant", async () => {
    const fixture = authorizationFixture();
    const app = buildApp({ repositories: fixture.repositories });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: `/v1/tenants/${tenantA}/brands`,
      headers: { authorization: `Bearer local:${memberId}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().data).toEqual([
      expect.objectContaining({ id: "00000000-0000-0000-0000-000000000020" }),
    ]);
  });

  it("returns 404 for an authenticated user without membership in the requested tenant", async () => {
    const fixture = authorizationFixture();
    const app = buildApp({ repositories: fixture.repositories });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: `/v1/tenants/${tenantA}/brands`,
      headers: { authorization: `Bearer local:${outsiderId}` },
    });

    expect(response.statusCode).toBe(404);
  });
});
