# Interview recovery and concurrency delivery

Date: 2026-10-18. Branch: codex/development-flow. Base:
5bf0df3c30b799413dea7e22c09d0b6410638acc plus existing local work, preserved.

## Problems reproduced and corrected

1. Completed draft reload hid the interview but left briefing inputs empty.
   Regression test failed with empty company instead of supplied company; shared
   interview render now restores the editable briefing on reload.
2. Equal-index writes could overwrite each other. Snapshot SHA256 versions and
   a transaction advisory lock serialize tenant/actor writes; stale different
   content returns 409, identical snapshot retries remain idempotent. No schema
   or migration changed. Existing clients without a version may create only,
   or replay an identical snapshot; they cannot overwrite different content.
3. Reset only cleared browser data. It now writes an empty remote snapshot under
   the confirmed version; conflict/failure preserves local state for recovery.
4. Old failures could show in another project or interview. Identity, current
   project and interview-generation guards suppress irrelevant messages. Browser
   writes queue in order and use the previous confirmed version.
5. Reconnection could overwrite unsent browser answers with remote data. A new
   test reproduced this; pending local answers now survive reload/reconnection
   until reviewed or explicitly cleared. Only confirmed matching saves clear
   the pending flag. This remains browser storage, not encrypted/durable hosting.

## Evidence

- Focused UI/API tests passed before the final pending-answer regression was
  added. That regression failed before its correction.
- Real disposable PostgreSQL 17: 124 passed, zero skipped, all existing migrations
  applied, owned container cleanup confirmed. Includes race, first creation,
  reopen, stale conflict, idempotent replay, CAS reset, tenant/actor isolation,
  revoked membership and denied direct authenticated-role access.
- Final local verify PASS: 102 tests passed, 23 database tests skipped in the
  non-DB mode; lint, typecheck, build and three quality-rule self-checks PASS.
  The two existing file-size warnings remain visible, not suppressed.
- Independent technical review: no blockers found in the reviewed scope;
  reviewer directly ran 52 focused tests with zero skipped, inspected final
  recovery/CAS paths and returned no pending findings. No signature claimed.
- Graph refreshed after source changes: 118 nodes, 396 edges; local AST only.
- Final complete PostgreSQL run after the last recovery correction: 125 passed,
  zero failed, zero skipped, 15 files. All ten existing migrations applied in
  the disposable database; cleanup confirmed for the owned container
  kesko-test-pg-a91a5c20-355d-44bf-bd5a-4703e1817faa.

## Scope and limits

Technical code review is separate from an independent signed Sentinel approval.
No private key, signature, deployment or 24h service is fabricated. Current
loopback identity remains unsuitable for public hosting. Full browser E2E is
not established by DOM-harness tests. Draft history/retention and SHA ABA
semantics are described in the contract, not promised as audit functionality.
Legacy browser snapshots created before the unsynchronized flag lack the same
recovery metadata; this is a migration limitation. Current snapshots carry it.

No merge, push, deploy, production access or account-permission change is part
of this delivery. Existing dirty/untracked work remains in place. GitHub login
was verified in the preceding step; remote CI still describes the published base.

Next allowed delivery: verify remaining setup prerequisites and browser behavior
in an isolated runtime; preserve the signed Harness gate until a real independent
authorized signer provides its public key and scoped report.
