import { afterEach, describe, expect, it, vi } from "vitest";
import * as childProcess from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import {
  HARNESS_CONFIG,
  runCycle,
  requestStop,
  clearStop,
  checkoutScope,
  verifyCycle,
  type CycleExecutor,
} from "../../../scripts/harness/supervisor.mjs";

vi.mock("node:child_process", async () => {
  const original =
    await vi.importActual<typeof childProcess>("node:child_process");
  return { ...original, spawn: vi.fn(original.spawn) };
});

const dirs: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  delete process.env.KESKO_SENTINEL_PUBLIC_KEY;
  delete process.env.KESKO_SENTINEL_REVIEWER_ID;
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function workspace() {
  const dir = await mkdtemp(join(tmpdir(), "kesko-harness-test-"));
  dirs.push(dir);
  return dir;
}

async function fixture() {
  const root = await workspace();
  const dir = join(root, "state");
  const checkout = join(root, "checkout");
  await mkdir(dir);
  await mkdir(join(checkout, ".git"), { recursive: true });
  await writeFile(join(checkout, ".git", "HEAD"), "a".repeat(40));
  await writeFile(join(checkout, "code.ts"), "original");
  const evidence = JSON.stringify({
    status: "PASS",
    command: "unit test",
    exitCode: 0,
  });
  await writeFile(join(dir, "verification.json"), evidence);
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeyPath = join(root, "public.pem");
  await writeFile(
    publicKeyPath,
    publicKey.export({ type: "spki", format: "pem" }),
    { mode: 0o600 },
  );
  process.env.KESKO_SENTINEL_PUBLIC_KEY = publicKeyPath;
  process.env.KESKO_SENTINEL_REVIEWER_ID = "sentinel-test";
  const payload: Record<string, unknown> = {
    version: 1,
    status: "APPROVED",
    independent: true,
    reviewerId: "sentinel-test",
    taskId: "HARNESS-001",
    ...(await checkoutScope(checkout, dir)),
    evidenceHash: createHash("sha256").update(evidence).digest("hex"),
    issuedAt: Date.now() - 1000,
    expiresAt: Date.now() + 60000,
  };
  const attest = async () =>
    writeFile(
      join(dir, "sentinel.json"),
      JSON.stringify({
        payload,
        signature: sign(
          null,
          Buffer.from(JSON.stringify(payload)),
          privateKey,
        ).toString("base64"),
      }),
    );
  await attest();
  const authorization: Record<string, unknown> = {
    ...payload,
    purpose: "EXECUTION_AUTHORIZATION",
    allowedScope: "LOCAL_VERIFICATION",
  };
  delete authorization.evidenceHash;
  const authorize = async () =>
    writeFile(
      join(dir, "authorization.json"),
      JSON.stringify({
        payload: authorization,
        signature: sign(
          null,
          Buffer.from(JSON.stringify(authorization)),
          privateKey,
        ).toString("base64"),
      }),
    );
  await authorize();
  const execute: CycleExecutor = async () => ({
    taskId: "HARNESS-001",
    status: "LOCAL_GREEN",
    evidence: ["verification.json"],
    evidenceFile: "verification.json",
  });
  return { dir, checkout, payload, attest, execute, authorization, authorize };
}

describe("KESKO harness supervisor", () => {
  it("uses the requested safety configuration", () => {
    expect(HARNESS_CONFIG).toMatchObject({
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
    });
  });

  it("writes a checkpoint after a successful real cycle", async () => {
    const { dir, checkout, execute } = await fixture();
    const result = await runCycle({
      stateDir: dir,
      checkoutDir: checkout,
      execute,
      now: () => "2026-10-08T15:00:00.000Z",
    });
    expect(result.status).toBe("LOCAL_GREEN");
    const checkpoint = JSON.parse(
      await readFile(join(dir, "checkpoint.json"), "utf8"),
    );
    expect(checkpoint).toMatchObject({
      status: "LOCAL_GREEN",
      taskId: "HARNESS-001",
      attempts: 1,
    });
  });

  it("retries twice, then opens the circuit and records the failure", async () => {
    const { dir, checkout } = await fixture();
    let calls = 0;
    const execute: CycleExecutor = async () => {
      calls += 1;
      throw new Error("transient failure");
    };
    const result = await runCycle({
      stateDir: dir,
      checkoutDir: checkout,
      execute,
      now: () => "2026-10-08T15:00:00.000Z",
      sleep: async () => {},
    });
    expect(calls).toBe(3);
    expect(result.status).toBe("BLOCKED");
    expect(result.circuitOpen).toBe(true);
    expect(
      JSON.parse(await readFile(join(dir, "checkpoint.json"), "utf8")),
    ).toMatchObject({ attempts: 3, status: "BLOCKED" });
  });

  it("honors a stop flag before starting the executor", async () => {
    const dir = await workspace();
    await requestStop(dir);
    let called = false;
    const result = await runCycle({
      stateDir: dir,
      execute: async () => {
        called = true;
        return { status: "LOCAL_GREEN" };
      },
    });
    expect(called).toBe(false);
    expect(result.status).toBe("STOPPED");
  });

  it.each([
    "legacy",
    "task",
    "reviewer",
    "expired",
    "future",
    "too-long",
    "sha",
    "code",
    "untracked",
    "evidence",
    "tampered",
  ])("rejects stale or unrelated %s attestation", async (change) => {
    const f = await fixture();
    if (change === "legacy") delete f.payload.dirtyDigest;
    if (change === "task") f.payload.taskId = "OTHER";
    if (change === "reviewer") f.payload.reviewerId = "untrusted";
    if (change === "expired") f.payload.expiresAt = Date.now() - 1;
    if (change === "future") f.payload.issuedAt = Date.now() + 10000;
    if (change === "too-long")
      f.payload.expiresAt = Date.now() + 2 * HARNESS_CONFIG.maxRuntimeMs;
    await f.attest();
    if (change === "sha")
      await writeFile(join(f.checkout, ".git", "HEAD"), "b".repeat(40));
    if (change === "code")
      await writeFile(join(f.checkout, "code.ts"), "changed");
    if (change === "untracked")
      await writeFile(join(f.checkout, "extra.ts"), "new");
    if (change === "evidence")
      await writeFile(
        join(f.dir, "verification.json"),
        JSON.stringify({ status: "PASS", command: "unrelated", exitCode: 0 }),
      );
    if (change === "tampered") {
      const path = join(f.dir, "sentinel.json");
      const artifact = JSON.parse(await readFile(path, "utf8"));
      artifact.payload.taskId = "forged";
      await writeFile(path, JSON.stringify(artifact));
    }
    const result = await runCycle({
      stateDir: f.dir,
      checkoutDir: f.checkout,
      execute: f.execute,
    });
    expect(result).toMatchObject({
      status: "BLOCKED",
      attempts: 1,
      circuitOpen: true,
    });
  });

  it("blocks before execution without configured reviewer authority", async () => {
    const f = await fixture();
    delete process.env.KESKO_SENTINEL_REVIEWER_ID;
    let calls = 0;
    const result = await runCycle({
      stateDir: f.dir,
      execute: async () => {
        calls++;
        return { status: "BLOCKED" };
      },
    });
    expect(result).toMatchObject({ status: "BLOCKED", attempts: 0 });
    expect(calls).toBe(0);
  });

  it("checks code after execution and binds the result to the configured task", async () => {
    const f = await fixture();
    const changed = await runCycle({
      stateDir: f.dir,
      checkoutDir: f.checkout,
      execute: async (context) => {
        await writeFile(
          join(f.checkout, "code.ts"),
          "changed during execution",
        );
        return f.execute(context);
      },
    });
    expect(changed).toMatchObject({ status: "BLOCKED", attempts: 1 });
    const unrelated = await runCycle({
      stateDir: f.dir,
      checkoutDir: f.checkout,
      execute: f.execute,
      taskId: "OTHER",
    });
    expect(unrelated).toMatchObject({
      status: "BLOCKED",
      attempts: 1,
    });
    expect(unrelated.reason).toContain(
      "Sentinel preflight authorization blocked",
    );
  });

  it.each(["deadline", "stop"])(
    "retains lock and prevents retry after uncooperative %s",
    async (kind) => {
      const f = await fixture();
      let finish!: (value: { status: string }) => void;
      let calls = 0;
      const result = await runCycle({
        stateDir: f.dir,
        checkoutDir: f.checkout,
        maxRuntimeMs: kind === "deadline" ? 100 : 2000,
        shutdownMs: 10,
        execute: async () => {
          calls++;
          if (kind === "stop") await requestStop(f.dir);
          return new Promise((resolve) => {
            finish = resolve;
          });
        },
      });
      expect(result).toMatchObject({
        status: "BLOCKED",
        attempts: 1,
        lockRetained: true,
      });
      await clearStop(f.dir);
      const second = await runCycle({
        stateDir: f.dir,
        execute: async () => {
          calls++;
          return { status: "BLOCKED" };
        },
      });
      expect(second).toMatchObject({ status: "BLOCKED", attempts: 0 });
      expect(calls).toBe(1);
      finish({ status: "BLOCKED" });
      expect(existsSync(join(f.dir, "lock", "retained"))).toBe(true);
    },
  );

  it("retains the lock even after cooperative shutdown and never retries cancellation", async () => {
    const f = await fixture();
    let calls = 0;
    let competing: Awaited<ReturnType<typeof runCycle>> | undefined;
    const result = await runCycle({
      stateDir: f.dir,
      checkoutDir: f.checkout,
      maxRuntimeMs: 100,
      shutdownMs: 1000,
      execute: ({ signal }) =>
        new Promise((resolve) => {
          calls++;
          signal.addEventListener("abort", () => {
            void runCycle({ stateDir: f.dir, execute: f.execute }).then(
              (value) => {
                competing = value;
                resolve({ status: "BLOCKED" });
              },
            );
          });
        }),
    });
    expect(competing).toMatchObject({ status: "BLOCKED", attempts: 0 });
    expect(result).toMatchObject({
      status: "BLOCKED",
      attempts: 1,
      lockRetained: true,
    });
    expect(calls).toBe(1);
    expect(existsSync(join(f.dir, "lock", "retained"))).toBe(true);
  });

  it.each([
    "absent",
    "invalid",
    "expired",
    "future",
    "scope",
    "purpose",
    "task",
    "reviewer",
    "sha",
    "dirty",
    "post-only",
  ])("never calls executor with %s preflight authorization", async (change) => {
    const f = await fixture();
    if (change === "expired") f.authorization.expiresAt = Date.now() - 1;
    if (change === "future") f.authorization.issuedAt = Date.now() + 10000;
    if (change === "scope") f.authorization.allowedScope = "DEPLOY";
    if (change === "purpose") f.authorization.purpose = "POST_CYCLE";
    if (change === "task") f.authorization.taskId = "OTHER";
    if (change === "reviewer") f.authorization.reviewerId = "OTHER";
    if (change === "sha") f.authorization.checkoutSha = "b".repeat(40);
    if (change === "dirty") f.authorization.dirtyDigest = "0".repeat(64);
    await f.authorize();
    const path = join(f.dir, "authorization.json");
    if (change === "absent") await rm(path);
    if (change === "invalid") await writeFile(path, "invalid JSON");
    if (change === "post-only")
      await writeFile(path, await readFile(join(f.dir, "sentinel.json")));
    let calls = 0;
    const result = await runCycle({
      stateDir: f.dir,
      checkoutDir: f.checkout,
      execute: async () => {
        calls++;
        return { status: "BLOCKED" };
      },
    });
    expect(result.status).toBe("BLOCKED");
    expect(result.reason).toContain("Sentinel preflight authorization blocked");
    expect(calls).toBe(0);
  });

  it.each(["removed", "expired", "code", "sha"])(
    "rechecks %s authorization before retry",
    async (change) => {
      const f = await fixture();
      let calls = 0;
      const result = await runCycle({
        stateDir: f.dir,
        checkoutDir: f.checkout,
        execute: async () => {
          calls++;
          throw new Error("transient failure");
        },
        sleep: async () => {
          if (change === "removed") await rm(join(f.dir, "authorization.json"));
          if (change === "expired") {
            f.authorization.expiresAt = Date.now() - 1;
            await f.authorize();
          }
          if (change === "code")
            await writeFile(join(f.checkout, "code.ts"), "changed");
          if (change === "sha")
            await writeFile(join(f.checkout, ".git", "HEAD"), "c".repeat(40));
        },
      });
      expect(result.status).toBe("BLOCKED");
      expect(result.reason).toContain(
        "Sentinel preflight authorization blocked",
      );
      expect(calls).toBe(1);
    },
  );

  it("retains lock after real verification child cancellation while its descendant survives", async () => {
    const f = await fixture();
    const { spawn } =
      await vi.importActual<typeof childProcess>("node:child_process");
    let signal: AbortSignal;
    let child: childProcess.ChildProcess | undefined;
    let descendantPid: number | undefined;
    let stopRequest: Promise<void> | undefined;
    let closed: Promise<void> | undefined;
    vi.mocked(childProcess.spawn).mockImplementation(() => {
      child = spawn(
        process.execPath,
        [
          "-e",
          `const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'}); console.log(child.pid); setInterval(()=>{},1000);`,
        ],
        { signal, stdio: ["ignore", "pipe", "ignore"] },
      );
      closed = new Promise((resolve) => {
        child!.once("close", () => resolve());
      });
      child.stdout!.once("data", (data: Buffer) => {
        descendantPid = Number(data.toString().trim());
        stopRequest = requestStop(f.dir);
      });
      return child;
    });
    try {
      const result = await runCycle({
        stateDir: f.dir,
        checkoutDir: f.checkout,
        // This case tests stop.flag after the descendant announces readiness,
        // not process startup speed on a contended host.
        maxRuntimeMs: 30_000,
        shutdownMs: 1000,
        execute: (context) => {
          signal = context.signal;
          return verifyCycle(context);
        },
      });
      await stopRequest;
      await closed;
      expect(descendantPid).toBeGreaterThan(0);
      expect(() => process.kill(descendantPid!, 0)).not.toThrow();
      expect(result).toMatchObject({
        status: "BLOCKED",
        attempts: 1,
        lockRetained: true,
      });
      await clearStop(f.dir);
      expect(
        await runCycle({ stateDir: f.dir, execute: f.execute }),
      ).toMatchObject({ status: "BLOCKED", attempts: 0 });
    } finally {
      if (descendantPid) process.kill(descendantPid, "SIGKILL");
      if (child && child.exitCode === null && child.signalCode === null)
        child.kill("SIGKILL");
      await closed;
    }
  });
});
