# KESKO

Local Fastify/TypeScript application backed by PostgreSQL 17. Node.js 24;
pnpm version is pinned in package.json. Start with [PRODUCT.md](PRODUCT.md),
[setup](docs/setup.md), and the [architecture](docs/architecture.md).

## Commands

- Install explicitly: `CI=true corepack pnpm install --frozen-lockfile`.
- Local checks: `CI=true corepack pnpm verify` (lint, types, tests, build).
- Real disposable database: `CI=true corepack pnpm test:postgres`.
- Synthetic browser demonstration: `corepack pnpm demo:workflow`.
- Read-only prerequisite inventory: `node scripts/preflight.mjs`.

Ordinary tests skip database cases. Report skipped tests; a local pass does not
prove remote CI, authentication, staging or release. See [quality](docs/quality.md).

## Working agreements

- Inspect Git status and relevant instructions/code before editing. Preserve
  existing modified and untracked files, including .agents and .specify.
- Reuse existing patterns and contracts. State assumptions; distinguish code,
  configuration, observed behavior and approval. Update the responsible document.
- Main, Production, secrets and real data are protected. Merge, deployment,
  destructive migrations, costs and external permission changes need explicit GO.
  This setup does not authorize publishing or scheduled services.
- Local identity `Bearer local:<uuid>` is synthetic development identity, not
  production authentication. Keep the server loopback-only.
- Use Context7 for library/API/CLI configuration: resolve the library ID, then
  query one concept at a time without private code or secrets. Reuse its MCP.
- Use available Superpowers proportionally; honor approvals already granted.
  Ponytail keeps implementation minimal; conversation may be concise, code/docs clear.
- Load available PostgreSQL guidance for SQL/RLS changes. Preserve pg and the
  current provider. Do not impose Next.js, Drizzle, shadcn or a paid service.
- Reuse native RTK integration; do not wrap commands twice or create hooks.
- Graphify local AST graph: `graphify-out/graph.json` (ignored, src only).
  Query with `graphify query 'WorkflowRepository' --graph graphify-out/graph.json`.
  Regenerate after source changes using the command in docs/setup.md; it omits
  docs/tests/migrations and is not a behavioral proof. No semantic API or hook.
- Delegate only useful independent tasks. One writer per file; coordinator owns
  shared configuration, lockfiles and Git. Reviewers are read-only. Check diffs
  and evidence before accepting results; confirm workers stopped before takeover.
- Independent review is required for material changes. Record scope, evidence,
  findings and limitations. A code review is not a cryptographically signed
  Sentinel approval; never generate the reviewer's private key or approval.
- A blocker stops dependent work only. Continue safe authorized tasks; respect
  pauses and finite retries. Verify actual checkout/processes on resumption.
  Never promise background work without a verified running process.

## Context map

- [Product](PRODUCT.md), [architecture](docs/architecture.md), [UI](docs/design.md).
- [Onboarding](docs/onboarding.md), [quality/review](docs/quality.md).
- [Tool decisions and evidence](docs/setup.md).
- [Existing consolidated handoff](docs/handoff/KESKO-PACOTE-CONSOLIDADO.md).

This map is the versioned memory index. Read details on demand, check their date
and current code, and retire stale claims. Temporary task progress belongs in
the current evidence/plan, not a new global policy.
