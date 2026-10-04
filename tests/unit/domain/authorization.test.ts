import { assertPermission, can } from "../../../src/domain/authorization.js";
import type { TenantContext } from "../../../src/contracts/tenancy.v1.js";

const context = (role: TenantContext["role"]): TenantContext => ({
  authenticated: true,
  userId: "user-1",
  tenantId: "tenant-1",
  role,
});

describe("tenant authorization", () => {
  it.each(["owner", "admin"] as const)("allows %s to create brands", (role) => {
    expect(can(context(role), "brand:create")).toBe(true);
  });

  it.each(["member", "viewer"] as const)(
    "denies %s from creating brands",
    (role) => {
      expect(can(context(role), "brand:create")).toBe(false);
    },
  );

  it("denies unauthenticated users by default", () => {
    expect(can({ authenticated: false }, "brand:read")).toBe(false);
    try {
      assertPermission({ authenticated: false }, "brand:read");
      throw new Error("expected permission to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: "UNAUTHENTICATED" });
    }
  });

  it("denies unknown capability combinations by default", () => {
    expect(can(context("member"), "audit:read")).toBe(false);
    try {
      assertPermission(context("viewer"), "brand:update");
      throw new Error("expected permission to fail");
    } catch (error) {
      expect(error).toMatchObject({ code: "FORBIDDEN" });
    }
  });
});
