import { inspect } from "node:util";
import type { Pool, PoolClient } from "pg";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDbPool, withTenantSession } from "../../../src/db/client.js";

const context = { authenticated: true, userId: "user-1" } as const;

function sessionFixture(rollbackError?: Error) {
  const query = vi.fn(async (sql: string) => {
    if (sql === "rollback" && rollbackError) throw rollbackError;
    return { rows: [], rowCount: 0 };
  });
  const release = vi.fn();
  const client = { query, release } as unknown as PoolClient;
  const pool = {
    connect: vi.fn().mockResolvedValue(client),
  } as unknown as Pool;
  return { pool, query, release };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("database client lifecycle regressions", () => {
  it("preserves the operation error and destroys the client once when rollback fails", async () => {
    const original = new Error("operation failed");
    const { pool, query, release } = sessionFixture(
      new Error("rollback failed"),
    );

    await expect
      .soft(
        withTenantSession(pool, context, async () => {
          throw original;
        }),
      )
      .rejects.toBe(original);
    expect(query.mock.calls.filter(([sql]) => sql === "rollback")).toHaveLength(
      1,
    );
    expect(release).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("preserves the operation error and normally releases the client after successful rollback", async () => {
    const original = new Error("operation failed");
    const { pool, query, release } = sessionFixture();

    await expect(
      withTenantSession(pool, context, async () => {
        throw original;
      }),
    ).rejects.toBe(original);
    expect(query.mock.calls.filter(([sql]) => sql === "rollback")).toHaveLength(
      1,
    );
    expect(release).toHaveBeenCalledTimes(1);
    expect([[], [undefined], [false]]).toContainEqual(release.mock.calls[0]);
  });

  it("commits and normally releases the client on success", async () => {
    const { pool, query, release } = sessionFixture();
    await expect(
      withTenantSession(pool, context, async () => "result"),
    ).resolves.toBe("result");
    expect(query).toHaveBeenCalledWith("commit");
    expect(query).not.toHaveBeenCalledWith("rollback");
    expect(release).toHaveBeenCalledTimes(1);
    expect([[], [undefined], [false]]).toContainEqual(release.mock.calls[0]);
  });

  it("handles idle pool errors without throwing or logging sensitive error contents", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const logs = ["error", "warn", "log", "info", "debug"] as const;
    const spies = logs.map((method) =>
      vi.spyOn(console, method).mockImplementation(() => {}),
    );
    // The pool remains disconnected; these are synthetic secret markers.
    const pool = createDbPool(
      "postgresql://test:password-canary@127.0.0.1:1/test",
    );
    try {
      const error = Object.assign(new Error("password-canary sql-canary"), {
        detail: "tenant-canary",
      });
      expect.soft(pool.listenerCount("error")).toBeGreaterThan(0);
      expect.soft(() => pool.emit("error", error)).not.toThrow();
      const logged = inspect(
        spies.flatMap((spy) => spy.mock.calls),
        { depth: null },
      );
      for (const marker of ["password-canary", "sql-canary", "tenant-canary"]) {
        expect(logged).not.toContain(marker);
      }
    } finally {
      await pool.end();
    }
  });
});
