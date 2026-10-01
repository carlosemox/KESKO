import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const dbTests = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
const userA = "00000000-0000-0000-0000-000000000001";
const userB = "00000000-0000-0000-0000-000000000002";
const userViewer = "00000000-0000-0000-0000-000000000003";
const userMember = "00000000-0000-0000-0000-000000000004";

async function beginAs(userId: string): Promise<Client> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  await client.query("begin");
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [userId]);
  await client.query("select set_config('role', 'authenticated', true)");
  return client;
}

async function finish(client: Client, commit = false): Promise<void> {
  await client.query(commit ? "commit" : "rollback").catch(() => undefined);
  await client.end();
}

async function createTenant(client: Client, ownerId: string, suffix: string): Promise<string> {
  await client.query("select set_config('request.jwt.claim.sub', $1, true)", [ownerId]);
  const result = await client.query<{ id: string }>(
    "select id from public.create_tenant_with_owner($1, $2, $3)",
    [`RLS Test Tenant ${suffix}`, `rls-test-${suffix}`, randomUUID()],
  );
  return result.rows[0].id;
}

async function cleanupTenants(tenantIds: string[]): Promise<void> {
  const cleanup = new Client({ connectionString: databaseUrl });
  await cleanup.connect();
  try {
    await cleanup.query("delete from public.tenants where id = any($1::uuid[])", [tenantIds]);
  } finally {
    await cleanup.end();
  }
}

dbTests("S-001 RLS", () => {
  it("creates exactly one owner and an audit event through the controlled RPC", async () => {
    const client = await beginAs(userA);
    let tenantId: string | undefined;
    try {
      tenantId = await createTenant(client, userA, randomUUID().slice(0, 8));
      const membership = await client.query<{ role: string; count: string }>(
        "select role, count(*) over () from public.tenant_memberships where tenant_id = $1 and user_id = $2",
        [tenantId, userA],
      );
      expect(membership.rows).toHaveLength(1);
      expect(membership.rows[0].role).toBe("owner");
      expect(membership.rows[0].count).toBe("1");

      const audit = await client.query<{ actor_user_id: string; action: string; outcome: string }>(
        "select actor_user_id, action, outcome from public.audit_events where tenant_id = $1",
        [tenantId],
      );
      expect(audit.rows).toEqual([
        { actor_user_id: userA, action: "tenant.created", outcome: "success" },
      ]);
      await client.query("commit");
    } finally {
      await finish(client);
      if (tenantId) await cleanupTenants([tenantId]);
    }
  });

  it("isolates two tenants while allowing authorized reads and scoped brand slugs", async () => {
    const tenantIds: string[] = [];
    const ownerA = await beginAs(userA);
    const ownerB = await beginAs(userB);
    try {
      tenantIds.push(await createTenant(ownerA, userA, randomUUID().slice(0, 8)));
      tenantIds.push(await createTenant(ownerB, userB, randomUUID().slice(0, 8)));
      await ownerA.query(
        "insert into public.brands (tenant_id, name, slug, created_by) values ($1, $2, $3, auth.uid())",
        [tenantIds[0], "Tenant A Brand", "shared-slug"],
      );
      await ownerB.query(
        "insert into public.brands (tenant_id, name, slug, created_by) values ($1, $2, $3, auth.uid())",
        [tenantIds[1], "Tenant B Brand", "shared-slug"],
      );
      await ownerA.query("commit");
      await ownerB.query("commit");

      const duplicate = await beginAs(userA);
      await expect(
        duplicate.query(
          "insert into public.brands (tenant_id, name, slug, created_by) values ($1, $2, $3, auth.uid())",
          [tenantIds[0], "Duplicate", "shared-slug"],
        ),
      ).rejects.toThrow();
      await finish(duplicate);
    } finally {
      await finish(ownerA);
      await finish(ownerB);
    }

    const readerA = await beginAs(userA);
    try {
      const ownTenant = await readerA.query("select id from public.tenants where id = $1", [tenantIds[0]]);
      const hiddenTenant = await readerA.query("select id from public.tenants where id = $1", [tenantIds[1]]);
      const ownBrand = await readerA.query("select slug from public.brands where tenant_id = $1", [tenantIds[0]]);
      const hiddenBrand = await readerA.query("select id from public.brands where tenant_id = $1", [tenantIds[1]]);
      expect(ownTenant.rowCount).toBe(1);
      expect(hiddenTenant.rowCount).toBe(0);
      expect(ownBrand.rows).toEqual([{ slug: "shared-slug" }]);
      expect(hiddenBrand.rowCount).toBe(0);
    } finally {
      await finish(readerA);
    }

    const crossTenantWriter = await beginAs(userB);
    try {
      await expect(
        crossTenantWriter.query(
          "insert into public.brands (tenant_id, name, slug, created_by) values ($1, 'Cross Tenant', 'cross-tenant', auth.uid())",
          [tenantIds[0]],
        ),
      ).rejects.toThrow();
    } finally {
      await finish(crossTenantWriter);
      await cleanupTenants(tenantIds);
    }
  });

  it("denies brand mutation to viewer and member roles", async () => {
    const owner = await beginAs(userA);
    let tenantId: string | undefined;
    try {
      tenantId = await createTenant(owner, userA, randomUUID().slice(0, 8));
      await owner.query("commit");
    } finally {
      await finish(owner);
    }

    const admin = new Client({ connectionString: databaseUrl });
    await admin.connect();
    try {
      await admin.query(
        "insert into public.tenant_memberships (tenant_id, user_id, role, status) values ($1, $2, $3, 'active'), ($1, $4, 'member', 'active')",
        [tenantId, userViewer, "viewer", userMember],
      );
    } finally {
      await admin.end();
    }

    try {
      for (const userId of [userViewer, userMember]) {
        const client = await beginAs(userId);
        try {
          await expect(
            client.query(
              "insert into public.brands (tenant_id, name, slug, created_by) values ($1, 'Denied Brand', $2, auth.uid())",
              [tenantId, `denied-${userId.slice(-1)}`],
            ),
          ).rejects.toThrow();
        } finally {
          await finish(client);
        }
      }
    } finally {
      await cleanupTenants(tenantId ? [tenantId] : []);
    }
  });

  it("rejects brand tenant and creator reassignment and records brand audit events", async () => {
    const tenantIds: string[] = [];
    const client = await beginAs(userA);
    try {
      tenantIds.push(await createTenant(client, userA, randomUUID().slice(0, 8)));
      tenantIds.push(await createTenant(client, userA, randomUUID().slice(0, 8)));
      const created = await client.query<{ id: string }>(
        "insert into public.brands (tenant_id, name, slug, created_by) values ($1, 'Immutable Brand', 'immutable-brand', auth.uid()) returning id",
        [tenantIds[0]],
      );
      await client.query("commit");

      const reassignment = await beginAs(userA);
      try {
        await expect(
          reassignment.query(
            "update public.brands set tenant_id = $1 where id = $2",
            [tenantIds[1], created.rows[0].id],
          ),
        ).rejects.toThrow("brand tenant cannot be changed");
      } finally {
        await finish(reassignment);
      }

      const creatorChange = await beginAs(userA);
      try {
        await expect(
          creatorChange.query(
            "update public.brands set created_by = $1 where id = $2",
            [userB, created.rows[0].id],
          ),
        ).rejects.toThrow("brand creator cannot be changed");
      } finally {
        await finish(creatorChange);
      }

      const audit = await client.query(
        "select action, actor_user_id, outcome, correlation_id from public.audit_events where tenant_id = $1 and entity_id = $2 order by created_at",
        [tenantIds[0], created.rows[0].id],
      );
      expect(audit.rows).toHaveLength(1);
      expect(audit.rows[0]).toMatchObject({
        action: "brand.created",
        actor_user_id: userA,
        outcome: "success",
      });
      expect(audit.rows[0].correlation_id).toEqual(expect.any(String));
    } finally {
      await finish(client);
      await cleanupTenants(tenantIds);
    }
  });
});
