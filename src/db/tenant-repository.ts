import type { Pool } from "pg";
import type { TenantContext } from "../contracts/tenancy.v1.js";
import { assertTenantAccess } from "../domain/tenancy.js";
import { withTenantSession, query } from "./client.js";

export interface TenantRecord {
  id: string;
  name: string;
  slug: string;
  created_by: string;
}

export interface MembershipRecord {
  tenant_id: string;
  user_id: string;
  role: "owner" | "admin" | "member" | "viewer";
  status: "active" | "invited" | "suspended";
}

export async function createTenantWithOwner(
  pool: Pool,
  context: TenantContext,
  name: string,
  slug: string,
  correlationId: string,
): Promise<TenantRecord> {
  return withTenantSession(pool, context, async (client) => {
    const result = await query<TenantRecord>(
      client,
      "select * from public.create_tenant_with_owner($1, $2, $3)",
      [name, slug, correlationId],
    );
    return result.rows[0];
  });
}

export async function getTenant(
  pool: Pool,
  context: TenantContext,
  tenantId: string,
): Promise<TenantRecord | undefined> {
  assertTenantAccess(context, tenantId);

  return withTenantSession(pool, context, async (client) => {
    const result = await query<TenantRecord>(
      client,
      "select id, name, slug, created_by from public.tenants where id = $1",
      [tenantId],
    );
    return result.rows[0];
  });
}

export async function getTenantMembership(
  pool: Pool,
  context: TenantContext,
  tenantId: string,
): Promise<MembershipRecord | undefined> {
  return withTenantSession(pool, context, async (client) => {
    const result = await query<MembershipRecord>(
      client,
      "select tenant_id, user_id, role, status from public.tenant_memberships where tenant_id = $1 and user_id = auth.uid() and status = 'active'",
      [tenantId],
    );
    return result.rows[0];
  });
}
