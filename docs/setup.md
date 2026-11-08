# KESKO toolkit adoption

Date: 2026-10-18 (America/Sao_Paulo). Scope: approved existing-project setup;
product architecture preserved. Toolkit source:
`soumatheusgomes/vibe-coding-toolkit`, revision
`de66fe371a49f5a4d3b521759e5c401f390b6424`, temporary checkout outside this repo.
Templates are adapted, not a second application scaffold.

## Current execution follow-up

The later ASTRA authorization permits commits, normal push and Draft PR on
`codex/development-flow`; earlier no-publish statements below describe historical
setup only. Current continuity is [the execution checkpoint](agent/KESKO-EXECUTION-STATE.md).
Playwright 1.64.1 Chromium now exercises the real isolated PostgreSQL workflow.
TypeScript was deliberately aligned to 6.0.3 with typescript-eslint 8.71.2 to
enable supported typed async lint, preserving compiler/build checks. Official
compatibility: https://typescript-eslint.io/users/dependency-versions/.
Source and test lint/typecheck/build passed with these versions; later gates
and remote CI must be read from the checkpoint rather than historical totals.

## Observed checkout and recovery

Root: KESKO; origin `https://github.com/carlosemox/KESKO.git`;
branch `codex/development-flow`; baseline HEAD
`5bf0df3c30b799413dea7e22c09d0b6410638acc`. Many dirty/untracked files predate
setup, including workflow, Harness, .agents and .specify; preserve all of them.
Pre-edit configuration backup: `/private/tmp/kesko-setup-backup-6e7zPR`.
That temporary backup is not durable storage. Review diffs before restoring
individual files; never reset the entire checkout.

Node v24.22.0, Corepack 0.36.0, pnpm pinned 11.19.0, Darwin arm64.
Application versions remain in package.json and pnpm-lock.yaml. Added only the
development tool ESLint 10.13.0; no product dependency upgrade or migration.

## Delivery and verification

Added a shared instruction index, Claude import bridge, product/architecture/UI/
quality/onboarding maps, this setup ledger, and Graphify exclusions. Existing
canonical documents remain the detailed sources. Updated `harness:verify` to
use the complete local `verify` command, retaining the separate DB gate.

Configured pnpm `verifyDepsBeforeRun: error` and
`enableGlobalVirtualStore: false`. Context7 live query against `/pnpm/pnpm.io`
confirmed that pnpm 11 defaults to automatic install before scripts and changes
virtual-store behavior under CI. Explicit frozen installation is the recovery,
not disabled checks or a changed lockfile.

Before changes: types, unused-symbol check, formatting and build PASS; 88 tests
passed and 21 DB cases skipped. Current validation results are recorded below
when executed; historical 109/109 PostgreSQL evidence is not a current run.

## Complete catalog disposition

Scope: project unless explicitly listed as machine/client. Reuse means an
available equivalent is retained; it does not claim live end-to-end validation.

| Component | Need/current state | Action and scope | Dependency/risk | Verification or resume condition |
|---|---|---|---|---|
| Superpowers | Process; discovered, brainstorming read | Reuse client installation | Approved design; no duplicate | Used in this session; fresh-client loading untested |
| Subagents | Independent review tools available | Read-only scoped reviewer | One writer, inherited model | Record review scope/result |
| RTK | Binary 1.0.1 and injected RTK.md | Reuse native client integration | Avoid double wrappers | Version observed; no savings estimate |
| Ponytail | Plugin skill discovered/read | Reuse full, minimal complete changes | No new dependency | Applied to this setup |
| Caveman | Skill available in client catalog | Reuse concise Portuguese conversation | Preserve clarity | No global style/proxy changes |
| ESLint/Biome gates | tsc/Prettier/Vitest retained; ESLint 10.13.0 added | JS line measurement plus upstream rules/self-check; no redundant Biome | Typed parser incompatible with TS7 | Run quality:rules and quality:measure; typed gate blocked by upstream peer range |
| Graphify | CLI 0.9.92 now available on PATH | Reused; local AST graph of src only | No installation, external model, hook or export | 20 files, 116 nodes, 383 edges; follow-up below |
| Obsidian | No external memory destination required | Not applicable | No vault/export | Reconsider only for concrete retrieval need |
| Client memory | Existing handoff/plan/evidence | Reuse short AGENTS index, details on demand | Stale facts verified against code | Fresh session retrieval not yet observed |
| Hooks | RTK client instructions already present | Reuse; no custom/Git hooks | Duplicates risk double execution | No hooks added |
| agent-browser | CLI absent; browser MCP available | Reuse browser capability instead | No personal session reuse | Browser runtime validation pending tool preflight |
| Context7 | Existing MCP loaded | Reuse without server configuration | Only public library queries | Resolve + query pnpm succeeded |
| Artifact/creator skills | Existing client skills available | Reuse on demand | No artifact generation requirement | No extra copies installed |
| Chrome DevTools | MCP tools available | Reuse for isolated local UI | Browser binary/runtime access | Discovery separate from browser smoke |
| Codex | Current native session | AGENTS.md and existing skills | No global/auth changes | Shared instructions explicit; fresh session untested |
| Vercel web skills | No React/Next/Vercel stack | React/composition/transitions/hosting skills not applicable | Do not introduce stack to satisfy catalog | UI/prose review uses existing equivalents |
| find-skills | Discovery purpose; no missing concrete skill needed | Reuse catalog/available host discovery | No indiscriminate installs | Revisit for a concrete absent capability |
| next-dev-loop | No Next/Turbopack | Not applicable | Incompatible framework | No Next migration |
| next-bundle-optimizer | No Next bundle | Not applicable | No analyzer target | No Next migration |
| PostgreSQL skill | Existing Supabase PostgreSQL guidance in client | Reuse on SQL/RLS tasks | Preserve pg and existing provider | Real DB tests separate; no SDK adopted |
| gh-fix-ci | No failing remote PR check selected | Not applicable to current local setup; gh installed | Account access required for future CI repair | Verify auth/read-only PR when actual failure chosen |
| differential-review | Security-sensitive product code preexists | Manual scoped review equivalent; no duplicate security tool | Explicit HEAD/dirty layers, private reports | Versioned prompt 13 invocation in docs/quality.md |
| shadcn | Existing plain HTML interface | Not applicable | No component-system selection | Preserve UI |
| Sentry | No chosen org/project/service | Not applicable | OAuth/service decision absent | Reconsider when selected, no SDK/account created |
| aia-harness | Existing KESKO Harness | Reuse equivalent, no second Harness | Signed gate remains mandatory | No supervisor installed/started by this setup |
| Official plugin extras | Existing skills/MCP sufficient for approved scope | No redundant installation | Client-specific support | On-demand justified adoption only |
| Next/Drizzle/Zod/Pino templates | Existing Fastify/pg/manual validators | Not applicable as scaffolding | Product contracts preserved | No dependency replacement |
| Local quality modules/self-check | ESLint 10.13.0 installed | Three rule modules and self-check adapted from same pinned revision | TS7 parser incompatible; only JS scripts measured | Self-check and warning count recorded below |

## Canonical document mapping

All nine manifest destinations now exist. README is execution entry; PRODUCT
indexes existing product sources; AGENTS/CLAUDE provide shared instructions;
architecture/design/onboarding/quality/setup are focused maps. The consolidated
handoff and original contracts remain authoritative in their scopes. No
product.md case-insensitive rename was needed.

## Maintenance and gates

Run `CI=true corepack pnpm install --frozen-lockfile` after deliberate dependency
configuration changes; then `CI=true corepack pnpm verify`. Keep DB tests
explicit. Do not treat skipped tests as integration evidence. Repeat this setup
against a pinned toolkit revision, review upstream differences first, preserve
customizations, and update this ledger rather than copying entire templates.

For future delegation, use the host's available model controls only within
authorized provider/authentication. Default to inherited model; record actual
model/effort only when observable. Security, SQL and concurrency review require
sufficient capability. No proxy, new key or billing is authorized.

No scheduled automation, push, merge, deployment or production operation was
performed. Harness trust remains blocked until an independent authorized
reviewer supplies a verified Ed25519 public key and valid scoped signed report.
Current code review cannot supply that identity or signature.

## Remaining scope

Typed lint, fresh client discovery, and hosted cross-device access are not
delivered by merely creating files. Deterministic Graphify extraction was
completed in the follow-up below using an existing installation.
UI draft races/reset and production identity remain separate product issues in
docs/quality.md. Complete these focused deliveries before claiming full toolkit
adoption or public readiness.

## Observed validation and interventions, 2026-10-18

- Explicit frozen install PASS after layout configuration; ESLint added with
  exact version and lockfile. Corepack is used inside verify, demo and database
  runner because unqualified child pnpm resolved to global 12.14.0 instead of
  project 11.19.0. Existing version checking was preserved.
- Combined local gate before quality-module addition PASS: lint, types, build;
  88 passed, 21 skipped. Final combined gate after quality-module addition also
  PASS: lint, types, tests (88/21), build and all three rule self-checks.
  Measurement: zero errors, two warnings (supervisor.mjs 514 and
  test-postgres.mjs 397 physical lines under the rule). These remain explicit
  refactoring debt; typed async rule counts cannot be measured with a supported
  parser until upstream supports TypeScript 7. Self-check source is pinned;
  its formatting was adapted, and MIT attribution is in eslint-rules/LICENSE.
- Real PostgreSQL 17 after runner correction PASS: all ten migrations applied,
  109 tests passed, zero skipped. Only the owned disposable container was removed.
  No existing/shared database was migrated. PostgreSQL image already installed.
- Production dependency audit PASS: no known vulnerabilities reported. This
  is not a guarantee of security. Final audit including development dependencies
  after adding ESLint also PASS: no known vulnerabilities reported.
- Nine document destinations and relative Markdown links checked: zero errors.
  Claude bridge imports AGENTS exactly. Node/shell syntax and diff check PASS.
- Context7 live resolve/query succeeded for pnpm and typescript-eslint. Upstream
  peer range confirms TS7 typed-lint incompatibility; preserve compiler version.
- GitHub CLI authentication failed: configured carlosemox token invalid. Account
  holder must run `gh auth login -h github.com` and authenticate in the official
  flow. No token is needed in chat. Then the agent can verify checks read-only.
- Chrome DevTools MCP preflight failed: Chrome stable executable absent at its
  configured application path. No personal browsing session was used. Install
  Chrome through the machine's approved method or configure an existing supported
  executable before browser smoke; do not claim DOM-harness tests are browser E2E.
- Graphify CLI absent on PATH; no graph generated. Separately authorize its
  machine installation using the upstream guide before deterministic extraction.
  Exclusions alone are preparation, not an active integration.
- Fresh-client loading, full disposable behavioral evaluation and setup rerun
  in a clean client: NOT RUN. Current-session discovery and a read-only reviewer
  are not a client restart. No duplicate MCP servers or hooks were installed.
- Independent reviewer examined the setup against the pre-edit backup, identified
  typed-lint adoption/evidence gaps, and confirmed no P0/P1 issue in that scope.
  Follow-up verifies compatible quality modules and the documented parser block.
  Final technical opinion favorable, no new code findings. Final results above
  supersede interim wording. This review is not a Sentinel signature.

Next safe work: resolve remaining external prerequisites, then address interview concurrency
and remote reset in a focused product slice. Main/Production and signed Harness
activation remain outside this setup.

## Follow-up: graph and context recovery, 2026-10-18

Rechecked actual environment instead of trusting the previous absent-tool claim:
Graphify 0.9.92 and uv are now on PATH. No installation was performed here.
Context7 resolved `/graphify-labs/graphify`; its code-only extraction documentation
and installed CLI help confirm local AST mode without an API key or model.

Executed:

```sh
graphify extract src --code-only --no-cluster --max-workers 1 --out .
graphify query 'WorkflowRepository' --graph graphify-out/graph.json --budget 450
```

Extraction PASS: 20 source files, 116 nodes, 383 edges; zero documents, images or
papers. Coverage excludes tests, migrations, docs, embedded browser JavaScript
semantics and vendor/configuration directories. Warning: http/routes/brands.ts
yielded no symbols. Treat relationships as AST evidence, not a complete behavior
model. No community labels, hosted graph, semantic API or global graph was used.

Generated graph stays in ignored graphify-out/. `.graphifyignore` remains the
broader exclusion policy; targeting src provides an additional scope boundary.
Regenerate with the same command after source changes, then repeat a relevant
query. Do not infer graph freshness from HEAD alone: this checkout has local
uncommitted source. No graph refresh hook was installed.

GitHub auth initially failed; the verified login recovery below supersedes that blocker.
Chrome is absent from installed application locations checked; browser smoke
remains unverified. Typed lint compatibility and signed Sentinel gates remain
unchanged. Prior passing test/build evidence remains historical for product code;
this follow-up changes documentation and ignored graph output only.

A new-context read-only subagent evaluates instruction and memory-map recovery.
This is not a restarted Codex/Claude client or a full behavioral harness benchmark.
Result: PASS for file-based recovery in a fresh delegated context. The reviewer
found verify/DB commands, identity restrictions, signed Harness gate and Claude
import through the document map, and independently inspected graph counts and
ignored status. No actionable finding. The final graph hint added to AGENTS
was checked by the coordinator, not reread by that reviewer. Graph query PASS
returned the WorkflowRepository neighborhood, truncated by the declared budget;
it does not prove exhaustive graph retrieval. Relative-link and excluded-path
checks passed with zero errors; git diff --check passed.

## GitHub login recovery, 2026-10-18

After personal browser authorization, `gh auth status`, `gh api user` and
`gh repo view carlosemox/KESKO` succeeded. Active identity: carlosemox; repository
permission: ADMIN; default branch: main. Authentication uses the OS keyring;
no credential value is recorded here. The previous invalid-token blocker is resolved.

Read-only remote inspection confirmed PR #2 remains Draft on
`codex/S-001-foundation-tenancy`, head
`5bf0df3c30b799413dea7e22c09d0b6410638acc`. Its validation checks succeeded on
2026-10-04; evidence:
https://github.com/carlosemox/KESKO/actions/runs/37236397942

Those remote checks cover the published base, not the current uncommitted
development-flow/setup work. No fresh CI result is claimed for this dirty tree.
No push, PR mutation, merge, deployment or remote settings change was performed.

## Product follow-up: interview recovery, 2026-10-18

Resolved completed-draft restore, stale equal-index writes, remote reset,
obsolete asynchronous notices and unsynchronized current-browser fallback.
See [the contract](contracts/interview-draft-v1.md) and
[current evidence](evidence/2026-10-18-interview-recovery.md).
Existing schema/migrations were preserved. Independent technical reviewer found
no blockers within this slice. Local verify passed (102 passed, 23 DB skips),
with two existing line-budget warnings. Current graph: 118 nodes, 396 edges.
Final complete disposable PostgreSQL run: 125 passed, zero failed/skipped;
owned container cleanup confirmed. No shared database was changed.
No fresh remote CI, browser E2E, hosted access or signed Sentinel approval is
claimed. GitHub authentication is resolved; the other external/runtime gates
remain explicit. This completes a local product increment, not the entire app.
