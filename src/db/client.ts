import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import type { TenantContext } from "../contracts/tenancy.v1.js";

export function createDbPool(connectionString = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres"): Pool {
  return new Pool({ connectionString, max: 5 });
}

export async function withTenantSession<T>(
  pool: Pool,
  context: TenantContext,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  if (!context.authenticated || !context.userId) {
    throw new Error("authenticated user is required");
  }

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [context.userId]);
    await client.query("select set_config('role', 'authenticated', true)");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function query<T extends QueryResultRow>(
  client: PoolClient,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return client.query<T>(text, values);
}
