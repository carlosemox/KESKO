import { describe, expect, it } from "vitest";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const dbTests = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;

dbTests("S-001 migration", () => {
  it("exposes the expected tables, RPC and RLS flags", async () => {
    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    try {
      const tables = await client.query<{ table_name: string; rowsecurity: boolean }>(
        "select c.relname as table_name, c.relrowsecurity as rowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = any($1)",
        [["tenants", "tenant_memberships", "brands", "audit_events"]],
      );
      expect(tables.rows).toHaveLength(4);
      expect(tables.rows.every((row) => row.rowsecurity)).toBe(true);

      const rpc = await client.query<{ authenticated_execute: boolean; anon_execute: boolean }>(
        "select has_function_privilege('authenticated', p.oid, 'execute') as authenticated_execute, has_function_privilege('anon', p.oid, 'execute') as anon_execute from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'create_tenant_with_owner' and pg_get_function_identity_arguments(p.oid) = 'tenant_name text, tenant_slug text, request_correlation_id uuid'",
      );
      expect(rpc.rowCount).toBe(1);
      expect(rpc.rows[0]).toEqual({ authenticated_execute: true, anon_execute: false });

      const policies = await client.query<{ tablename: string; qual: string | null; with_check: string | null }>(
        "select tablename, qual, with_check from pg_policies where schemaname = 'public' and tablename = any($1)",
        [["tenants", "tenant_memberships", "brands", "audit_events"]],
      );
      expect(policies.rows.length).toBeGreaterThanOrEqual(6);
      expect(policies.rows.some((policy) => policy.qual === "true" || policy.with_check === "true")).toBe(false);

      const brandConstraint = await client.query<{ constraint_name: string }>(
        "select constraint_name from information_schema.table_constraints where table_schema = 'public' and table_name = 'brands' and constraint_type = 'UNIQUE'",
      );
      expect(brandConstraint.rows).toHaveLength(1);

      const brandTriggers = await client.query<{ trigger_name: string }>(
        "select trigger_name from information_schema.triggers where event_object_schema = 'public' and event_object_table = 'brands'",
      );
      expect(brandTriggers.rows.map((row) => row.trigger_name)).toEqual(
        expect.arrayContaining(["brands_prevent_ownership_change", "brands_audit_mutation"]),
      );
    } finally {
      await client.end();
    }
  });
});
