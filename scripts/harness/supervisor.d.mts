export declare const HARNESS_CONFIG: Readonly<{
  runMode: "CONTINUOUS";
  maxRuntimeMs: number;
  maxRetriesPerFailure: number;
  maxConcurrentWriters: number;
  requireSentinel: true;
  requireEvidence: true;
  merge: false;
  deploy: false;
  productionAccess: false;
  prMode: "DRAFT";
  costPolicy: "ZERO_INCREMENTAL_COST";
  checkpointEnabled: true;
  autoResume: true;
  stopOnSecurityFailure: true;
  backoffMs: number[];
}>;

/** Settle only after all executor work/children have terminated, including on abort.
 * All guarded cancellations retain a persistent lock requiring operator recovery:
 * Promise settlement does not prove descendant process termination.
 * Only LOCAL_VERIFICATION is authorized; callbacks must obey that scope.
 */
export type CycleExecutor = (context: {
  deadline: number;
  attempt: number;
  stateDir: string;
  signal: AbortSignal;
}) => Promise<{
  status: string;
  taskId?: string;
  promptId?: string;
  evidence?: string[];
  evidenceFile?: string;
  sentinel?: string;
  reason?: string;
  attempts?: number;
  circuitOpen?: boolean;
  lockRetained?: boolean;
}>;

export declare function runCycle(options: {
  stateDir?: string;
  execute: CycleExecutor;
  now?: () => string;
  clock?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  maxRuntimeMs?: number;
  shutdownMs?: number;
  checkoutDir?: string;
  taskId?: string;
}): Promise<Awaited<ReturnType<CycleExecutor>> & { attempts: number }>;

export declare function requestStop(stateDir?: string): Promise<void>;
export declare function clearStop(stateDir?: string): Promise<void>;
export declare const verifyCycle: CycleExecutor;

/** Signed payload v1: status APPROVED, independent true, trusted reviewerId,
 * taskId, checkoutSha, dirtyDigest, evidenceHash (SHA-256 of exact artifact bytes),
 * issuedAt/expiresAt (epoch ms, at most 24h). Trust requires externally provisioned
 * KESKO_SENTINEL_PUBLIC_KEY and KESKO_SENTINEL_REVIEWER_ID; absent authority blocks.
 * Digest covers working-tree paths, modes and bytes including ignored/untracked
 * files, excluding root .git, root node_modules and stateDir. Other symlinks block.
 * checkoutDir must be the executor's actual checkout. Dependencies are not attested.
 * BEFORE every callback/retry, authorization.json must independently carry the
 * same signed v1 identity/task/checkout/TTL fields (no evidenceHash required),
 * purpose EXECUTION_AUTHORIZATION and allowedScope LOCAL_VERIFICATION.
 * Its TTL bounds execution. sentinel.json remains mandatory for successful
 * completion; a post-cycle approval cannot substitute for authorization.json.
 */
export declare function checkoutScope(
  checkoutDir?: string,
  stateDir?: string,
): Promise<{
  checkoutSha: string;
  dirtyDigest: string;
}>;
