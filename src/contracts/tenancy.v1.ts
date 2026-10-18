export const TENANCY_CONTRACT_VERSION = "v1" as const;

export type TenantRole = "owner" | "admin" | "member" | "viewer";

export type TenantPermission =
  | "tenant:read"
  | "brand:read"
  | "brand:create"
  | "brand:update"
  | "audit:read";

export interface TenantContext {
  authenticated: boolean;
  userId?: string;
  tenantId?: string;
  role?: TenantRole;
}
export interface TenantMembership {
  tenantId: string;
  userId: string;
  role: TenantRole;
  status: "active" | "invited" | "suspended";
}

export interface BrandInput {
  name: string;
  slug: string;
}

export interface Brand extends BrandInput {
  id: string;
  tenantId: string;
}
