#!/usr/bin/env node
import {
  appendFile,
  mkdir,
  readFile,
  rename,
  rm,
  statfs,
  stat,
  realpath,
  writeFile,
  readdir,
  lstat,
} from "node:fs/promises";
import {
  createHash,
  createPublicKey,
  verify as verifySignature,
} from "node:crypto";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export const HARNESS_CONFIG = Object.freeze({
  runMode: "CONTINUOUS",
  maxRuntimeMs: 24 * 60 * 60 * 1000,
  maxRetriesPerFailure: 2,
  maxConcurrentWriters: 1,
  requireSentinel: true,
  requireEvidence: true,
  merge: false,
  deploy: false,
  productionAccess: false,
  prMode: "DRAFT",
  costPolicy: "ZERO_INCREMENTAL_COST",
  checkpointEnabled: true,
  autoResume: true,
  stopOnSecurityFailure: true,
  backoffMs: [1000, 5000],
});

const repoRoot = resolve(new URL("../..", import.meta.url).pathname);
const defaultStateDir = join(repoRoot, ".harness");
const MAX_RSS_BYTES = 512 * 1024 * 1024;
const MIN_FREE_BYTES = 50 * 1024 * 1024;
const STALE_LOCK_MS = 10 * 60 * 1000;

export function sanitize(message) {
  return String(message)
    .replace(/(postgres(?:ql)?:\/\/)[^\s"']+/gi, "$1[REDACTED]")
    .replace(/(Bearer\s+)[^\s"']+/gi, "$1[REDACTED]")
    .replace(
      /(password|token|secret|api[_-]?key)\s*[=:]\s*[^\s,;]+/gi,
      "$1=[REDACTED]",
    );
}

function sanitizeValue(value, key = "") {
  if (/password|token|secret|api[_-]?key|authorization/i.test(key))
    return "[REDACTED]";
  if (typeof value === "string") return sanitize(value);
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([name, item]) => [
        name,
        sanitizeValue(item, name),
      ]),
    );
  }
  return value;
}

async function saveCheckpoint(stateDir, checkpoint) {
  await mkdir(stateDir, { recursive: true });
  const path = join(stateDir, "checkpoint.json");
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(
    temporary,
    `${JSON.stringify(sanitizeValue(checkpoint), null, 2)}\n`,
    {
      mode: 0o600,
    },
  );
  await rename(temporary, path);
}

async function log(stateDir, event) {
  await mkdir(stateDir, { recursive: true });
  await appendFile(
    join(stateDir, "supervisor.log"),
    `${JSON.stringify({ at: new Date().toISOString(), ...event }, (_, value) => (typeof value === "string" ? sanitize(value) : value))}\n`,
    { mode: 0o600 },
  );
}

async function healthcheck(stateDir, deadline) {
  const memory = process.memoryUsage();
  const filesystem = await statfs(stateDir);
  const freeBytes = Number(filesystem.bavail) * Number(filesystem.bsize);
  const health = {
    status:
      memory.rss <= MAX_RSS_BYTES && freeBytes >= MIN_FREE_BYTES
        ? "healthy"
        : "blocked",
    pid: process.pid,
    rssBytes: memory.rss,
    freeBytes,
    deadline: new Date(deadline).toISOString(),
    checkedAt: new Date().toISOString(),
  };
  await writeFile(
    join(stateDir, "health.json"),
    `${JSON.stringify(health, null, 2)}\n`,
    { mode: 0o600 },
  );
  if (health.status !== "healthy") throw new Error("resource limit reached");
  return health;
}

async function acquireLock(stateDir) {
  const lock = join(stateDir, "lock");
  // An unconfirmed executor may have surviving children even after its owner dies.
  if (existsSync(join(lock, "retained"))) return null;
  try {
    await mkdir(lock);
    await writeFile(join(lock, "owner"), `${process.pid}\n`, { mode: 0o600 });
    return lock;
  } catch (error) {
    if (error.code === "EEXIST") {
      try {
        const owner = Number.parseInt(
          await readFile(join(lock, "owner"), "utf8"),
          10,
        );
        process.kill(owner, 0);
        return null;
      } catch (ownerError) {
        if (!["ESRCH", "ENOENT"].includes(ownerError.code)) return null;
        const lockInfo = await stat(lock).catch(() => null);
        if (!lockInfo || Date.now() - lockInfo.mtimeMs < STALE_LOCK_MS)
          return null;
        await rm(lock, { recursive: true, force: true });
        return acquireLock(stateDir);
      }
    }
    throw error;
  }
}

async function stopped(stateDir) {
  return existsSync(join(stateDir, "stop.flag"));
}

export async function requestStop(stateDir = defaultStateDir) {
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    join(stateDir, "stop.flag"),
    `${new Date().toISOString()}\n`,
    { mode: 0o600 },
  );
  await log(stateDir, { event: "stop_requested" });
}

export async function clearStop(stateDir = defaultStateDir) {
  await rm(join(stateDir, "stop.flag"), { force: true });
  await log(stateDir, { event: "stop_cleared" });
}

/** @typedef {(context: {deadline:number, attempt:number, stateDir:string, signal:AbortSignal}) => Promise<{status:string, taskId?:string, promptId?:string, evidence?:string[], evidenceFile?:string, sentinel?:string}>} CycleExecutor */

async function readVerifiedEvidence(stateDir, evidenceFile) {
  if (typeof evidenceFile !== "string" || !evidenceFile)
    throw new Error("evidence artifact required");
  const root = resolve(stateDir);
  const path = resolve(root, evidenceFile);
  if (!path.startsWith(`${root}/`))
    throw new Error("evidence artifact outside state directory");
  const actualPath = await realpath(path);
  const actualRoot = await realpath(root);
  if (!actualPath.startsWith(`${actualRoot}/`))
    throw new Error("evidence symlink escapes state directory");
  const bytes = await readFile(actualPath);
  const artifact = JSON.parse(bytes.toString("utf8"));
  if (
    artifact.status !== "PASS" ||
    artifact.exitCode !== 0 ||
    typeof artifact.command !== "string"
  )
    throw new Error("evidence artifact is not a passing command result");
  return createHash("sha256").update(bytes).digest("hex");
}

// Full working-tree content (including untracked/ignored files), not a status
// listing. Dependencies and harness output are outside the attested source scope.
// Symlinks elsewhere fail closed. No Git commands or repository writes are used.
export async function checkoutScope(
  checkoutDir = repoRoot,
  stateDir = defaultStateDir,
) {
  const root = await realpath(checkoutDir);
  const state = await realpath(stateDir);
  if (root === state)
    throw new Error("Sentinel state must not be checkout root");
  let gitDir = join(root, ".git");
  if ((await stat(gitDir)).isFile()) {
    const pointer = await readFile(gitDir, "utf8");
    if (!pointer.startsWith("gitdir: "))
      throw new Error("Sentinel invalid gitdir");
    gitDir = resolve(root, pointer.slice(8).trim());
  }
  let commonDir = gitDir;
  try {
    commonDir = resolve(
      gitDir,
      (await readFile(join(gitDir, "commondir"), "utf8")).trim(),
    );
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  let checkoutSha = (await readFile(join(gitDir, "HEAD"), "utf8")).trim();
  if (checkoutSha.startsWith("ref: ")) {
    const ref = checkoutSha.slice(5);
    if (!/^refs\/[\w./-]+$/.test(ref) || ref.includes(".."))
      throw new Error("Sentinel invalid HEAD ref");
    try {
      checkoutSha = (await readFile(join(commonDir, ref), "utf8")).trim();
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      checkoutSha = (await readFile(join(commonDir, "packed-refs"), "utf8"))
        .split("\n")
        .find((line) => line.endsWith(` ${ref}`))
        ?.split(" ")[0];
    }
  }
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(checkoutSha ?? ""))
    throw new Error("Sentinel invalid checkout SHA");
  const hash = createHash("sha256");
  async function walk(directory, prefix = "") {
    for (const name of (await readdir(directory)).sort()) {
      const path = join(directory, name);
      if (
        (directory === root && [".git", "node_modules"].includes(name)) ||
        path === state
      )
        continue;
      const relative = `${prefix}${name}`;
      const info = await lstat(path);
      if (info.isSymbolicLink())
        throw new Error("Sentinel checkout symlink is outside attested scope");
      if (info.isDirectory()) {
        hash.update(JSON.stringify([relative, "directory"]));
        await walk(path, `${relative}/`);
      } else if (info.isFile())
        hash.update(
          JSON.stringify([
            relative,
            info.mode & 0o777,
            createHash("sha256")
              .update(await readFile(path))
              .digest("hex"),
          ]),
        );
      else throw new Error("Sentinel unsupported checkout entry");
    }
  }
  await walk(root);
  return { checkoutSha, dirtyDigest: hash.digest("hex") };
}

async function loadSentinelTrust(stateDir) {
  const reviewerId = process.env.KESKO_SENTINEL_REVIEWER_ID?.trim();
  if (!reviewerId || reviewerId === "HARNESS_EXECUTOR")
    throw new Error("Sentinel trusted reviewer authority is not configured");
  const root = await realpath(resolve(stateDir));
  const publicKeyPath =
    process.env.KESKO_SENTINEL_PUBLIC_KEY ??
    join(
      homedir(),
      "Library",
      "Application Support",
      "KESKO",
      "sentinel-public.pem",
    );
  const publicKeyRealPath = await realpath(publicKeyPath);
  if (publicKeyRealPath.startsWith(`${root}/`))
    throw new Error("Sentinel public key must be outside state directory");
  const keyInfo = await stat(publicKeyRealPath);
  if (keyInfo.uid !== process.getuid?.() || (keyInfo.mode & 0o022) !== 0)
    throw new Error("Sentinel public key permissions are not restricted");
  const publicKey = await readFile(publicKeyRealPath, "utf8");
  if (createPublicKey(publicKey).asymmetricKeyType !== "ed25519")
    throw new Error("Sentinel requires an Ed25519 public key");
  return { root, publicKey, reviewerId };
}

async function readSentinelEvidence(
  stateDir,
  trust,
  expected,
  filename = "sentinel.json",
) {
  const root = trust.root;
  const artifactPath = await realpath(join(root, filename));
  if (!artifactPath.startsWith(`${root}/`))
    throw new Error("Sentinel artifact escapes state directory");
  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
  const payload = JSON.stringify(artifact.payload);
  const valid = verifySignature(
    null,
    Buffer.from(payload),
    trust.publicKey,
    Buffer.from(artifact.signature, "base64"),
  );
  if (
    !valid ||
    artifact.payload?.status !== "APPROVED" ||
    artifact.payload?.independent !== true ||
    artifact.payload?.reviewerId !== trust.reviewerId
  )
    throw new Error("independent signed Sentinel artifact required");
  const attestation = artifact.payload;
  if (
    attestation.version !== 1 ||
    Object.entries(expected).some(
      ([key, value]) => attestation[key] !== value,
    ) ||
    !Number.isSafeInteger(attestation.issuedAt) ||
    !Number.isSafeInteger(attestation.expiresAt) ||
    attestation.issuedAt > Date.now() ||
    attestation.expiresAt <= Date.now() ||
    attestation.expiresAt <= attestation.issuedAt ||
    attestation.expiresAt - attestation.issuedAt > HARNESS_CONFIG.maxRuntimeMs
  )
    throw new Error("Sentinel scoped attestation mismatch or expired validity");
  return artifact;
}

async function executeWithGuards(
  execute,
  context,
  deadline,
  clock,
  shutdownMs,
) {
  const controller = new AbortController();
  const timeoutMs = Math.max(0, deadline - clock());
  let stopWatcher;
  let timer;
  const guard = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("deadline reached during executor"));
      controller.abort("deadline");
    }, timeoutMs);
    stopWatcher = setInterval(() => {
      if (existsSync(join(context.stateDir, "stop.flag"))) {
        clearTimeout(timer);
        reject(new Error("stop flag requested during executor"));
        controller.abort("stop flag");
      }
    }, 50);
  });
  const execution = Promise.resolve().then(() =>
    execute({ ...context, signal: controller.signal }),
  );
  const termination = execution.then(
    () => {},
    () => {},
  );
  try {
    return await Promise.race([execution, guard]);
  } catch (error) {
    if (controller.signal.aborted) {
      let shutdownTimer;
      await Promise.race([
        termination,
        new Promise((resolveWait) => {
          shutdownTimer = setTimeout(resolveWait, shutdownMs);
        }),
      ]);
      clearTimeout(shutdownTimer);
      error.guardFailure = true;
      // Promise settlement/direct-child close cannot prove descendant termination.
      // Conservatively retain even after a cooperative cancellation; operator
      // recovery must confirm the complete executor tree has stopped.
      error.retainLock = true;
    }
    throw error;
  } finally {
    clearTimeout(timer);
    clearInterval(stopWatcher);
  }
}

export async function runCycle({
  stateDir = defaultStateDir,
  execute,
  now = () => new Date().toISOString(),
  clock = () => Date.now(),
  sleep = (ms) => delay(ms),
  maxRuntimeMs = HARNESS_CONFIG.maxRuntimeMs,
  shutdownMs = 1000,
  checkoutDir = repoRoot,
  taskId = "HARNESS-001",
} = {}) {
  if (typeof execute !== "function")
    throw new TypeError("cycle executor is required");
  if (!Number.isFinite(shutdownMs) || shutdownMs < 0 || shutdownMs > 30000)
    throw new TypeError("shutdownMs must be between 0 and 30000");
  if (typeof taskId !== "string" || !taskId.trim())
    throw new TypeError("taskId required");
  await mkdir(stateDir, { recursive: true });
  if (await stopped(stateDir)) return { status: "STOPPED", attempts: 0 };
  const lock = await acquireLock(stateDir);
  if (!lock)
    return {
      status: "BLOCKED",
      reason: "exclusive lock already held",
      attempts: 0,
    };
  const deadline = clock() + maxRuntimeMs;
  let attempts = 0;
  let retainLock = false;
  try {
    try {
      await healthcheck(stateDir, deadline);
    } catch (error) {
      const result = {
        status: "BLOCKED",
        reason: sanitize(error?.message ?? error),
        attempts: 0,
        circuitOpen: true,
      };
      await saveCheckpoint(stateDir, { ...result, updatedAt: now() });
      await log(stateDir, {
        event: "healthcheck_blocked",
        reason: result.reason,
      });
      return result;
    }
    let sentinelTrust;
    try {
      if (HARNESS_CONFIG.requireSentinel)
        sentinelTrust = await loadSentinelTrust(stateDir);
    } catch (error) {
      const result = {
        status: "BLOCKED",
        reason: sanitize(error?.message ?? error),
        attempts: 0,
        circuitOpen: true,
      };
      await saveCheckpoint(stateDir, { ...result, updatedAt: now() });
      await log(stateDir, {
        event: "sentinel_trust_blocked",
        reason: result.reason,
      });
      return result;
    }
    for (
      attempts = 1;
      attempts <= HARNESS_CONFIG.maxRetriesPerFailure + 1;
      attempts += 1
    ) {
      if (await stopped(stateDir)) return { status: "STOPPED", attempts };
      if (clock() >= deadline) {
        const result = {
          status: "BLOCKED",
          reason: "deadline reached before cycle",
          attempts,
        };
        await saveCheckpoint(stateDir, { ...result, updatedAt: now() });
        await log(stateDir, { event: "deadline_reached", attempts });
        return result;
      }
      try {
        let authorization;
        try {
          authorization = await readSentinelEvidence(
            stateDir,
            sentinelTrust,
            {
              purpose: "EXECUTION_AUTHORIZATION",
              allowedScope: "LOCAL_VERIFICATION",
              taskId,
              ...(await checkoutScope(checkoutDir, stateDir)),
            },
            "authorization.json",
          );
        } catch (error) {
          throw new Error(
            `Sentinel preflight authorization blocked: ${error.message}`,
          );
        }
        // Authorization TTL also bounds the execution it permits.
        const executionDeadline = Math.min(
          deadline,
          clock() + authorization.payload.expiresAt - Date.now(),
        );
        if (await stopped(stateDir))
          return { status: "STOPPED", attempts: attempts - 1 };
        if (clock() >= executionDeadline)
          throw new Error(
            "Sentinel authorization deadline reached before executor",
          );
        const result = await executeWithGuards(
          execute,
          { deadline: executionDeadline, attempt: attempts, stateDir },
          executionDeadline,
          clock,
          shutdownMs,
        );
        if (result?.status === "BLOCKED") {
          const checkpoint = {
            ...result,
            attempts,
            updatedAt: now(),
            deadline: new Date(deadline).toISOString(),
          };
          await saveCheckpoint(stateDir, checkpoint);
          await log(stateDir, {
            event: "cycle_blocked",
            reason: checkpoint.reason ?? "unspecified",
          });
          return checkpoint;
        }
        const evidence = Array.isArray(result?.evidence) ? result.evidence : [];
        if (HARNESS_CONFIG.requireEvidence && evidence.length === 0)
          throw new Error("evidence required");
        const evidenceHash = await readVerifiedEvidence(
          stateDir,
          result?.evidenceFile,
        );
        if (result.taskId !== taskId) throw new Error("Sentinel task mismatch");
        await readSentinelEvidence(stateDir, sentinelTrust, {
          taskId,
          evidenceHash,
          ...(await checkoutScope(checkoutDir, stateDir)),
        });
        const checkpoint = {
          ...result,
          status: result.status ?? "LOCAL_GREEN",
          attempts,
          updatedAt: now(),
          deadline: new Date(deadline).toISOString(),
        };
        await saveCheckpoint(stateDir, checkpoint);
        await log(stateDir, {
          event: "cycle_completed",
          status: checkpoint.status,
          attempts,
        });
        return checkpoint;
      } catch (error) {
        if (error.retainLock) {
          retainLock = true;
          await writeFile(
            join(lock, "retained"),
            "Executor termination unconfirmed; operator must verify termination before removing lock.\n",
            { mode: 0o600 },
          );
        }
        const message = sanitize(error?.message ?? error);
        await log(stateDir, {
          event: "cycle_failed",
          attempts,
          error: message,
        });
        if (
          attempts > HARNESS_CONFIG.maxRetriesPerFailure ||
          error.guardFailure ||
          /security|sentinel|resource limit/i.test(message)
        ) {
          const result = {
            status: "BLOCKED",
            reason: message,
            attempts,
            circuitOpen: true,
            lockRetained: retainLock,
          };
          await saveCheckpoint(stateDir, { ...result, updatedAt: now() });
          return result;
        }
        await sleep(
          HARNESS_CONFIG.backoffMs[attempts - 1] ??
            HARNESS_CONFIG.backoffMs.at(-1),
        );
      }
    }
  } finally {
    if (!retainLock) await rm(lock, { recursive: true, force: true });
  }
  throw new Error("supervisor cycle ended without a result");
}

export async function runContinuous({
  stateDir = defaultStateDir,
  execute = verifyCycle,
  sleep = (ms) => delay(ms),
} = {}) {
  const windowPath = join(stateDir, "window.json");
  let window;
  try {
    window = JSON.parse(await readFile(windowPath, "utf8"));
  } catch {
    window = undefined;
  }
  const startedAt = window?.startedAt ?? new Date().toISOString();
  const deadline = Date.parse(startedAt) + HARNESS_CONFIG.maxRuntimeMs;
  await mkdir(stateDir, { recursive: true });
  await writeFile(
    windowPath,
    `${JSON.stringify({ startedAt, deadline: new Date(deadline).toISOString() }, null, 2)}\n`,
    { mode: 0o600 },
  );
  while (Date.now() < deadline) {
    const result = await runCycle({
      stateDir,
      execute,
      maxRuntimeMs: deadline - Date.now(),
      sleep,
    });
    if (["STOPPED", "BLOCKED"].includes(result.status)) return result;
    await sleep(5 * 60 * 1000);
  }
  const result = {
    status: "24H_WINDOW_COMPLETED",
    startedAt,
    endedAt: new Date().toISOString(),
  };
  await saveCheckpoint(stateDir, result);
  await log(stateDir, { event: "window_completed" });
  return result;
}

export async function verifyCycle({ stateDir, signal }) {
  const { spawn } = await import("node:child_process");
  return new Promise((resolveResult, reject) => {
    const child = spawn(
      "corepack",
      [
        "pnpm",
        "exec",
        "vitest",
        "run",
        "tests/unit/workflow/model.test.ts",
        "tests/unit/harness/supervisor.test.ts",
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          CI: "true",
          NODE_ENV: "test",
          MERGE: "false",
          DEPLOY: "false",
          PRODUCTION_ACCESS: "false",
          PR_MODE: "DRAFT",
        },
        stdio: ["ignore", "ignore", "ignore"],
        signal,
      },
    );
    let childError;
    child.once("error", (error) => {
      childError = error;
    });
    // Abort's error event does not confirm termination. Wait for close.
    child.once("close", async (code) => {
      if (childError) return reject(childError);
      if (code !== 0) return reject(new Error(`verification exited ${code}`));
      try {
        if (code === 0) {
          await writeFile(
            join(stateDir, "verification.json"),
            `${JSON.stringify({ status: "PASS", command: "vitest workflow-model harness-supervisor", exitCode: 0, checkedAt: new Date().toISOString() }, null, 2)}\n`,
            { mode: 0o600 },
          );
        }
        resolveResult({
          status: "BLOCKED",
          taskId: "HARNESS-001",
          promptId: "HARNESS",
          evidence: ["verification.json"],
          evidenceFile: "verification.json",
          sentinel: "PENDING",
          reason:
            "independent Sentinel evidence is not available to the unattended local supervisor",
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const stateDir = process.env.KESKO_HARNESS_STATE_DIR ?? defaultStateDir;
  const command = process.argv[2] ?? "run";
  if (command === "stop") await requestStop(stateDir);
  else if (command === "resume") await clearStop(stateDir);
  else if (command === "run" || command === "once") {
    const result =
      command === "once"
        ? await runCycle({ stateDir, execute: verifyCycle })
        : await runContinuous({ stateDir, execute: verifyCycle });
    console.log(JSON.stringify(result));
    process.exitCode = result.status === "LOCAL_GREEN" ? 0 : 1;
  } else {
    console.error("Usage: supervisor.mjs [run|once|stop|resume]");
    process.exitCode = 2;
  }
}
