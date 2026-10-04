import type { Pool } from "pg";
import type { TenantContext } from "../contracts/tenancy.v1.js";
import { assertTenantAccess } from "../domain/tenancy.js";
import { withTenantSession, query } from "./client.js";

export interface AuditRecord {
  id: string;
  tenant_id: string;
  actor_user_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  correlation_id: string;
  outcome: "success" | "failure";
  metadata: Record<string, unknown>;
}

export async function listAuditEvents(
  pool: Pool,
  context: TenantContext,
  tenantId: string,
): Promise<AuditRecord[]> {
  assertTenantAccess(context, tenantId);

  return withTenantSession(pool, context, async (client) => {
    const result = await query<AuditRecord>(
      client,
      "select id, tenant_id, actor_user_id, action, entity_type, entity_id, correlation_id, outcome, metadata from public.audit_events where tenant_id = $1 order by created_at, id",
      [tenantId],
    );
    return result.rows;
  });
}
