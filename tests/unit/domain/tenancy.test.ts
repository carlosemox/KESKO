import {
  assertTenantAccess,
  validateBrandInput,
  validateTenantContext,
} from "../../../src/domain/tenancy.js";

describe("tenancy domain", () => {
  it("rejects a context without a tenant", () => {
    expect(() =>
      validateTenantContext({ authenticated: true, userId: "user-1", role: "owner" }),
    ).toThrowError("tenant context");
  });

  it("rejects unauthenticated access", () => {
    expect(() =>
      assertTenantAccess({ authenticated: false }, "tenant-1"),
    ).toThrowError("Authentication is required");
  });

  it("maps another tenant to a not-found error", () => {
    try {
      assertTenantAccess(
        { authenticated: true, userId: "user-1", tenantId: "tenant-1", role: "owner" },
        "tenant-2",
      );
      throw new Error("expected tenant access to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: "TENANT_NOT_FOUND" });
    }
  });

  it("normalizes valid brand input", () => {
    expect(validateBrandInput({ name: "  Acme  ", slug: "Acme-Team" })).toEqual({
      name: "Acme",
      slug: "acme-team",
    });
  });

  it("rejects invalid brand slugs", () => {
    expect(() => validateBrandInput({ name: "Acme", slug: "not valid" })).toThrowError(
      "lowercase kebab-case",
    );
  });
});
