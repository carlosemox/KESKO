# Quality and review

`CI=true corepack pnpm verify` combines the existing lint, typecheck, unit/HTTP
tests and build. It neither applies migrations nor publishes. `test:postgres`
is the separate real-database gate; plain `test` intentionally skips DB cases.
The existing GitHub workflow preserves pinned Actions and read-only permissions.

## Setup baseline, 2026-10-18

Types, unused-symbol checks, Prettier and build passed. Vitest: 88 passed,
21 skipped. These are current local results, not a new remote CI approval.

Existing checks are retained. ESLint 10.13.0 runs the toolkit's 350-line
measurement on JavaScript scripts. `quality:rules` runs the upstream self-check
for max-lines, no-direct-console and no-direct-data-access; the latter two rules
are tested but not enabled because existing scripts intentionally emit operator
diagnostics and have no frontend/data boundary. The execution follow-up aligned
TypeScript to 6.0.3 with typescript-eslint 8.71.2 (official peer range
>=4.8.4 <6.1.0). Typed no-floating-promises and no-misused-promises now run as
errors over source and tests. Compiler checks remain enabled. This reversible
toolchain adjustment resolves the earlier TS7 parser incompatibility; no rule
or unsupported-version warning was suppressed.

Physical line measurement before setup: model.ts 466, repository.ts 370,
supervisor.mjs 513, workflow-persistence.test.ts 642. The 350-line reference is
recorded debt, not an existing enforced limit; no broad ignores or higher
ceilings were added. Refactor by responsibility in focused, behavior-tested work.

After setup, the JS measurement reports two warnings: supervisor.mjs 514 and
test-postgres.mjs 397 under the upstream rule's line semantics. All three custom
rule self-checks pass. Final local verify passes with 88 tests passed/21 skipped;
the separate PostgreSQL 17 run passes all 109 tests with zero skipped.

## Known interview limitations

Snapshot-version checks reject stale interview writes; queued browser saves use
the last confirmed version. Reset writes an empty snapshot under that check.
Completed draft reload and fallback have DOM-harness regression coverage;
the execution follow-up adds real Chromium/PostgreSQL coverage for resume,
conflicts, offline preservation, reset and approval. See the current checkpoint
for exact results and transient timeout findings. Server retention remains
unverified. Local bearer identity
and loopback restriction mean hosted cross-device access is not available.
Do not promote this vertical to staging/public use based on storage tests alone.

## Independent review

Review exact changes plus connected contracts/tests, report concrete scenarios,
severity, location and evidence. Read-only reviewers do not approve their own
implementation. Keep sensitive reports private outside the repository and
publish only redacted conclusions. Cryptographic Sentinel approval remains a
separate gate requiring an authorized independent signer.

Reusable security review: use the Prompt section of
[toolkit prompt 13](https://github.com/soumatheusgomes/vibe-coding-toolkit/blob/de66fe371a49f5a4d3b521759e5c401f390b6424/docs/prompts/13-security-review.md).
Use repository baseline or an explicit base/head plus dirty/untracked layers;
read-only by default. Refresh this source only after reviewing the new revision.

For this setup, review configuration, command parity, documentation accuracy,
client discovery limits and preservation of existing work. Further reviews need
new findings, changed scope or an explicit request; review count is not proof.
