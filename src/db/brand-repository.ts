import type { Pool } from "pg";
import type { BrandInput, TenantContext } from "../contracts/tenancy.v1.js";
import { assertTenantAccess, validateBrandInput } from "../domain/tenancy.js";
import { withTenantSession, query } from "./client.js";

export interface BrandRecord extends BrandInput {
  id: string;
  tenant_id: string;
  created_by: string;
}

export async function createBrand(
  pool: Pool,
  context: TenantContext,
  tenantId: string,
  input: BrandInput,
  correlationId?: string,
): Promise<BrandRecord> {
  assertTenantAccess(context, tenantId);
  const normalizedInput = validateBrandInput(input);

  return withTenantSession(pool, context, async (client) => {
    if (correlationId) {
      await client.query(
        "select set_config('request.correlation_id', $1, true)",
        [correlationId],
      );
    }
    const result = await query<BrandRecord>(
      client,
      "insert into public.brands (tenant_id, name, slug, created_by) values ($1, $2, $3, auth.uid()) returning id, tenant_id, name, slug, created_by",
      [tenantId, normalizedInput.name, normalizedInput.slug],
    );
    return result.rows[0];
  });
}

export async function listBrands(
  pool: Pool,
  context: TenantContext,
  tenantId: string,
): Promise<BrandRecord[]> {
  assertTenantAccess(context, tenantId);

  return withTenantSession(pool, context, async (client) => {
    const result = await query<BrandRecord>(
      client,
      "select id, tenant_id, name, slug, created_by from public.brands where tenant_id = $1 order by created_at, id",
      [tenantId],
    );
    return result.rows;
  });
}
