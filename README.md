# KESKO

Project setup: [tool decisions and verification](docs/setup.md),
[agent instructions](AGENTS.md), [product map](PRODUCT.md),
[architecture](docs/architecture.md), [onboarding](docs/onboarding.md), and
[quality](docs/quality.md). Run `CI=true corepack pnpm verify` for the combined
local gate; run `CI=true corepack pnpm test:postgres` for real database evidence.

## S-001 local verification

This slice implements the tenant → owner → brand onboarding flow with
Supabase OSS/PostgreSQL, RLS, tenant-scoped repositories, audit events and a
Fastify HTTP API. Redis, production Auth/JWKS, frontend, workers and deploy
are outside this slice.

Prerequisites: Node.js 24, pnpm, Docker Desktop and the Supabase CLI dependency
installed by the lockfile.

```bash
CI=true pnpm install --frozen-lockfile
docker pull postgres:17-alpine
CI=true pnpm lint
CI=true pnpm typecheck
CI=true pnpm build
CI=true pnpm test:postgres
```

`test:postgres` creates a loopback-only disposable PostgreSQL 17 instance,
applies every migration, runs all tests with synthetic data, and removes only
its own container. It ignores any existing `DATABASE_URL`. The SQL `auth.uid()`
fixture reproduces the identity-setting interface; it does not validate JWTs
or prove a Supabase Auth integration. Docker must be running. The image pull
is explicit; the test command never downloads an image implicitly.

`pnpm test` alone intentionally skips database tests and is not a readiness
gate. `lint` combines compiler checks, typed async rules and Prettier; `build` emits
the library/API modules under ignored `dist/`, not a deployable production
authentication service. The GitHub validation workflow runs the same checks
on pull requests to `main` and pushes to `codex/**`, without deploy or secrets.

The demonstration identity is `Authorization: Bearer local:<uuid>` in explicit
development/test mode. A separate configured Supabase JWT/JWKS adapter verifies
signatures and claims without falling back to local identity. See
[configuration and limits](docs/contracts/authentication-v1.md). Both modes
retain loopback access. Real provider integration, login, sessions, refresh and
logout remain pending; do not expose this API publicly.

API contract: [`docs/api/s001-openapi.yaml`](docs/api/s001-openapi.yaml).

## Development flow — local first vertical

The additive workflow integrates company briefing → structural discovery
validation → preliminary PRD → explicit owner/admin approval. It displays all
17 lifecycle stages. Journey supports human-authored partial drafts and separate
approval after PRD approval; stages 4–17 have **no executor yet**. A blocked next
action is not a completed stage or a deployment approval. The PRD is a
deterministic rendering of supplied requirements, not independent research
or an AI-generated specification.

Projects and change requests are tenant-scoped PostgreSQL records. Commands
use operation UUIDs, optimistic versions and transactions; reopening reads
the persisted state. Active members/viewers can read; only owners/admins
can change the workflow. The existing local identity seam remains unsuitable
for public access or real users. No external agent, GitHub action or production
integration is activated by this module.

For a **synthetic, disposable** browser demonstration, after installing the
dependencies and the PostgreSQL image listed above:

```bash
corepack pnpm demo:workflow
```

Real Chromium acceptance tests use their own disposable PostgreSQL database:
`corepack pnpm exec playwright install chromium`, then
`CI=true corepack pnpm test:browser`. They never reuse an existing server.
The database is removed on completion; browser reports are ignored by Git.

Open `http://127.0.0.1:3000/workflow`. Use these **demonstration identifiers**:

- User: `00000000-0000-0000-0000-000000000001`
- Tenant: `00000000-0000-0000-0000-000000000010`

This command ignores existing `DATABASE_URL`, applies migrations only in its
own loopback PostgreSQL container, and binds the application to loopback.
Enter synthetic briefing data only. Reloading the page retains the project
while the session is running; **Ctrl+C or the 30-minute limit removes the
demonstration database**. This is not durable hosting or a remote integration
test. No shared Supabase instance is reset or migrated.
If Docker becomes unavailable during cleanup, the command exits nonzero and
prints the exact owned container to inspect; never prune unrelated resources.

For an existing isolated development database, migration adoption is a
separate reviewed operation. After the forward migration and backend role
membership are applied by its administrator, supply `DATABASE_URL` through
the existing secure environment and use `corepack pnpm build` followed by
`NODE_ENV=development corepack pnpm start:local`.
Do not paste connection strings in chat or commit them. The new executor role
must never be granted to `anon` or `authenticated`. Stop the server and return
to the previous application version for rollback; preserve the new tables
and audit data rather than dropping them automatically.

- [Scope, safety constraints and acceptance criteria](docs/superpowers/specs/2026-10-08-development-flow.md)
- [Implementation plan](docs/superpowers/plans/2026-10-08-development-flow.md)
- [Current verification and remaining gaps](docs/evidence/2026-10-08-development-flow.md)

## Preparation scope and audit

- [Universal development prompts supplied by Cadu](docs/product/DEVELOPMENT-PROMPTS.md)
- [Prompt sequencing and Codex/Claude Code handoff requirements](docs/product/DEVELOPMENT-PROMPTS-INTEGRATION.md)
- [Ready-to-attach KESKO context (partial static export)](docs/handoff/KESKO-CONTEXTO-PARA-DESENVOLVIMENTO.md)
- [Ready-to-copy Codex/Claude Code start prompt](docs/handoff/PROMPT-INICIAR-KESKO.md)
- [Consolidated handoff package](docs/handoff/KESKO-PACOTE-CONSOLIDADO.md)

- [Deep audit and regression evidence (2026-10-04)](docs/evidence/2026-10-04-deep-audit.md)
- [Planned preparation agent v1.0](docs/superpowers/specs/2026-10-02-agente-preparacao.md)
- [Current setup audit and manual actions](docs/evidence/2026-10-02-preparation-audit.md)
- Read-only local prerequisite check: `node scripts/preflight.mjs`.
  Exit code 1 means prerequisites are absent or not verifiable by this check.
  It never applies migrations, prints credentials, or substitutes remote CI evidence.
