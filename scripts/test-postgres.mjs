#!/usr/bin/env node
// Run with `pnpm exec node scripts/test-postgres.mjs` (or a parent-owned pnpm
// script). Only this invocation's randomly named/labeled container is removed.
// Requires the already-installed postgres:17-alpine image; never pulls images.
// Real PostgreSQL/RLS integration, not the Supabase Auth service. See fixture.
// Password travels via stdin -> FIFO -> process memory, never Docker config,
// argv, disk, or logs. PGDATA is tmpfs; no host directories/volumes are mounted.
// SIGINT/SIGTERM/SIGHUP and command timeouts trigger bounded finally cleanup.
// SIGKILL, host crashes, or an unavailable Docker daemon cannot be cleaned up
// by any process; a failed cleanup is reported with the exact container name.
import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import pg from "pg";

const root = fileURLToPath(new URL("../", import.meta.url));
const token = randomUUID();
const name = `kesko-test-pg-${token}`;
const label = "kesko.test-postgres.owner";
const password = randomBytes(32).toString("hex");
let databaseUrl = "";
let interrupted = 0;
let activeStop;
let creationAttempted = false;
let phase = "preflight";
const env = { ...process.env };
// Never inherit a caller's DB URL into Docker or tests.
delete env.DATABASE_URL;
delete env.PGPASSWORD;
delete env.POSTGRES_PASSWORD;
const redact = (value) =>
  String(value)
    .replaceAll(password, "[REDACTED]")
    .replaceAll(databaseUrl || "\0", "[DATABASE_URL]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[DATABASE_URL]");

function checkSignal() {
  if (interrupted) throw new Error("Interrupted");
}

// Buffer before redaction so secrets split across pipe chunks cannot leak.
// Kill the whole pnpm process group, including test workers, on interruption.
function run(
  command,
  args,
  { input = "", timeout = 90_000, cleanup = false, childEnv = env } = {},
) {
  if (!cleanup) checkSignal();
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: childEnv,
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let output = "";
    let failure;
    let killTimer;
    const kill = (signal) => {
      if (child.pid) {
        try {
          process.kill(-child.pid, signal);
        } catch (error) {
          if (error.code !== "ESRCH") child.kill(signal);
        }
      }
    };
    const stop = (reason = "Interrupted") => {
      if (failure) return;
      failure = new Error(reason);
      kill("SIGTERM");
      killTimer = setTimeout(() => kill("SIGKILL"), 2_000);
    };
    if (!cleanup) activeStop = stop;
    const timer = setTimeout(() => stop(`${command} timed out`), timeout);
    const collect = (chunk) => {
      output += chunk;
      if (output.length > 8 * 1024 * 1024) {
        output = output.slice(0, 8 * 1024 * 1024);
        stop(`${command} output exceeded limit`);
      }
    };
    child.stdout.setEncoding("utf8").on("data", collect);
    child.stderr.setEncoding("utf8").on("data", collect);
    child.stdin.on("error", () => {}); // Early child exit is handled below.
    child.on("error", () => {
      failure = new Error(`Cannot start ${command}`);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      clearTimeout(killTimer);
      if (activeStop === stop) activeStop = undefined;
      if (failure) reject(failure);
      else resolve({ code, signal, output: redact(output) });
    });
    child.stdin.end(input);
  });
}

async function docker(args, options) {
  const result = await run("docker", args, options);
  if (result.code !== 0)
    throw new Error(
      `Docker command failed during ${phase} (exit ${result.code ?? result.signal})`,
    );
  return result.output.trim();
}

const handlers = new Map();
for (const [signal, code] of [
  ["SIGINT", 130],
  ["SIGTERM", 143],
  ["SIGHUP", 129],
]) {
  const handler = () => {
    interrupted ||= code;
    activeStop?.();
  };
  handlers.set(signal, handler);
  process.on(signal, handler);
}

try {
  await docker([
    "image",
    "inspect",
    "postgres:17-alpine",
    "--format",
    "{{.Id}}",
  ]);
  phase = "container creation";
  creationAttempted = true;
  await docker([
    "run",
    "--detach",
    "--pull=never",
    "--name",
    name,
    "--label",
    `${label}=${token}`,
    "--publish",
    "127.0.0.1::5432",
    "--network",
    "bridge",
    "--tmpfs",
    "/var/lib/postgresql/data:rw,nosuid,nodev,size=512m",
    "--tmpfs",
    "/run/secrets:rw,nosuid,nodev,noexec,size=1m",
    "--log-driver",
    "none",
    "--entrypoint",
    "sh",
    "postgres:17-alpine",
    "-ec",
    "umask 077; mkfifo /run/secrets/password; IFS= read -r POSTGRES_PASSWORD < /run/secrets/password; rm /run/secrets/password; export POSTGRES_PASSWORD; exec docker-entrypoint.sh postgres",
  ]);
  console.log(`Disposable PostgreSQL container: ${name}`);
  phase = "in-memory password delivery";
  await docker(
    [
      "exec",
      "-i",
      name,
      "sh",
      "-ec",
      "while [ ! -p /run/secrets/password ]; do sleep 0.1; done; cat > /run/secrets/password",
    ],
    { input: `${password}\n` },
  );
  const binding = JSON.parse(
    await docker([
      "inspect",
      "--format",
      "{{json .NetworkSettings.Ports}}",
      name,
    ]),
  );
  const ports = binding["5432/tcp"];
  if (
    ports?.length !== 1 ||
    ports[0].HostIp !== "127.0.0.1" ||
    !/^\d+$/.test(ports[0].HostPort)
  ) {
    throw new Error("Expected exactly one loopback-only PostgreSQL port");
  }
  // This isolated loopback instance has no TLS. Override inherited PGSSLMODE
  // consistently for readiness and every pg client spawned by the test suite.
  databaseUrl = `postgresql://postgres:${password}@127.0.0.1:${ports[0].HostPort}/postgres?sslmode=disable`;
  phase = "PostgreSQL readiness";
  const deadline = Date.now() + 120_000;
  let ready = false;
  let readinessCode = "unknown";
  while (Date.now() < deadline) {
    checkSignal();
    const client = new pg.Client({
      connectionString: databaseUrl,
      connectionTimeoutMillis: 1_000,
      query_timeout: 1_000,
    });
    client.on("error", () => {});
    try {
      await client.connect();
      const version = await client.query(
        "select current_setting('server_version_num')::int as version",
      );
      ready =
        version.rows[0].version >= 170000 && version.rows[0].version < 180000;
    } catch (error) {
      readinessCode = /^[A-Z0-9_]+$/.test(error.code ?? "")
        ? error.code
        : "connection/query error";
    } finally {
      await client.end().catch(() => {});
    }
    if (ready) break;
    await delay(250);
  }
  if (!ready) {
    const state = await docker([
      "inspect",
      "--format",
      "{{.State.Status}} (exit {{.State.ExitCode}})",
      name,
    ]);
    throw new Error(
      `PostgreSQL 17 readiness timed out: ${readinessCode}; container ${state}`,
    );
  }
  const apply = async (path) => {
    checkSignal();
    const sql = await readFile(new URL(path, import.meta.url), "utf8");
    await docker(
      [
        "exec",
        "-i",
        name,
        "psql",
        "-X",
        "-q",
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-v",
        "ON_ERROR_STOP=1",
        "--single-transaction",
      ],
      { input: sql },
    );
  };
  phase = "Supabase SQL compatibility bootstrap";
  await apply("./test-postgres-bootstrap.sql");
  console.log(
    "Real PostgreSQL 17; SQL auth.uid() compatibility only (no Supabase Auth service).",
  );
  // Discover at execution time: includes new forward migrations, no fixed list.
  const migrations = (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((file) => file.endsWith(".sql"))
    .sort();
  if (!migrations.length) throw new Error("No SQL migrations found");
  for (const migration of migrations) {
    phase = `migration ${migration}`;
    await apply(`../supabase/migrations/${migration}`);
    console.log(`Applied ${migration}`);
  }
  phase = "pnpm test";
  console.log(
    "Running RUN_DB_TESTS=1 pnpm test against the disposable database.",
  );
  const result = await run("pnpm", ["test"], {
    timeout: 300_000,
    childEnv: {
      ...env,
      CI: "true",
      RUN_DB_TESTS: "1",
      DATABASE_URL: databaseUrl,
      // pnpm 11 defaults to installing on a dependency-state mismatch.
      // A test runner must fail instead of rewriting the shared node_modules.
      pnpm_config_verify_deps_before_run: "error",
    },
  });
  process.stdout.write(result.output);
  if (result.code !== 0)
    throw new Error(`pnpm test failed (exit ${result.code ?? result.signal})`);
  checkSignal();
} catch (error) {
  console.error(
    `PostgreSQL integration failed during ${phase}: ${redact(error.message)}`,
  );
  process.exitCode = interrupted || 1;
} finally {
  if (creationAttempted) {
    phase = "cleanup";
    try {
      // Inspect by exact unique name; remove by verified immutable ID only.
      // A timed-out create can still have created a container on the daemon.
      const result = await run(
        "docker",
        [
          "container",
          "ls",
          "--all",
          "--no-trunc",
          "--filter",
          `name=^/${name}$`,
          "--format",
          "{{.ID}}",
        ],
        { cleanup: true },
      );
      if (result.code !== 0)
        throw new Error("Cannot check container existence");
      const id = result.output.trim();
      if (id) {
        if (!/^[a-f0-9]{64}$/.test(id))
          throw new Error("Ambiguous container identity");
        const owner = await docker(
          ["inspect", "--format", `{{index .Config.Labels "${label}"}}`, id],
          { cleanup: true },
        );
        if (owner !== token)
          throw new Error("Container ownership label mismatch");
        await docker(["rm", "--force", "--volumes", id], { cleanup: true });
      }
      console.log(`Cleanup complete: ${name}`);
    } catch {
      console.error(
        `Cleanup could not be verified; inspect only container ${name}.`,
      );
      process.exitCode = interrupted || 1;
    }
  }
  if (interrupted) process.exitCode = interrupted;
  for (const [signal, handler] of handlers) process.off(signal, handler);
}
