import { DomainError } from "../contracts/errors.v1.js";
import type {
  TenantContext,
  TenantPermission,
  TenantRole,
} from "../contracts/tenancy.v1.js";

const permissionsByRole: Record<TenantRole, ReadonlySet<TenantPermission>> = {
  owner: new Set([
    "tenant:read",
    "brand:read",
    "brand:create",
    "brand:update",
    "audit:read",
  ]),
  admin: new Set([
    "tenant:read",
    "brand:read",
    "brand:create",
    "brand:update",
    "audit:read",
  ]),
  member: new Set(["tenant:read", "brand:read"]),
  viewer: new Set(["tenant:read", "brand:read"]),
};

export function can(
  context: TenantContext,
  permission: TenantPermission,
): boolean {
  if (context.authenticated !== true || !context.tenantId || !context.userId || !context.role) {
    return false;
  }

  return permissionsByRole[context.role].has(permission);
}

export function assertPermission(
  context: TenantContext,
  permission: TenantPermission,
): void {
  if (context.authenticated !== true) {
    throw new DomainError("UNAUTHENTICATED", "Authentication is required");
  }

  if (!can(context, permission)) {
    throw new DomainError("FORBIDDEN", "The current role cannot perform this action");
  }
}

