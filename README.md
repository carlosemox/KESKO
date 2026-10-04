# KESKO

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
gate. `lint` combines strict unused-symbol checks and Prettier; `build` emits
the library/API modules under ignored `dist/`, not a deployable production
authentication service. The GitHub validation workflow runs the same checks
on pull requests to `main` and pushes to `codex/**`, without deploy or secrets.

The development HTTP identity seam is `Authorization: Bearer local:<uuid>`.
It is deliberately not a production JWT verifier. Do not expose this API in
production before Supabase Auth/JWKS validation is implemented and reviewed.

API contract: [`docs/api/s001-openapi.yaml`](docs/api/s001-openapi.yaml).

## Preparation scope and audit

- [Deep audit and regression evidence (2026-10-04)](docs/evidence/2026-10-04-deep-audit.md)
- [Planned preparation agent v1.0](docs/superpowers/specs/2026-10-02-agente-preparacao.md)
- [Current setup audit and manual actions](docs/evidence/2026-10-02-preparation-audit.md)
- Read-only local prerequisite check: `node scripts/preflight.mjs`.
  Exit code 1 means prerequisites are absent or not verifiable by this check.
  It never applies migrations, prints credentials, or substitutes remote CI evidence.
