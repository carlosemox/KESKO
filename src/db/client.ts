import {
  Pool,
  type PoolClient,
  type QueryResult,
  type QueryResultRow,
} from "pg";
import type { TenantContext } from "../contracts/tenancy.v1.js";

export function createDbPool(
  connectionString = process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
): Pool {
  if (process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in production");
  }
  const pool = new Pool({ connectionString, max: 5 });
  // Idle connection errors must not terminate the process or expose SQL/credentials.
  pool.on("error", () => console.error("Database idle connection failed"));
  return pool;
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
  let discardClient = false;
  try {
    await client.query("begin");
    await client.query("select set_config('request.jwt.claim.sub', $1, true)", [
      context.userId,
    ]);
    await client.query("select set_config('role', 'authenticated', true)");
    const result = await operation(client);
    await client.query("commit");
    return result;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      discardClient = true;
    }
    throw error;
  } finally {
    client.release(discardClient);
  }
}

export async function query<T extends QueryResultRow>(
  client: PoolClient,
  text: string,
  values: unknown[] = [],
): Promise<QueryResult<T>> {
  return client.query<T>(text, values);
}
