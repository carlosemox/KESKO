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
CI=true pnpm exec supabase start --yes --ignore-health-check
CI=true pnpm exec supabase db push --local --yes --skip-vault
RUN_DB_TESTS=1 CI=true pnpm test
CI=true pnpm typecheck
```

The development HTTP identity seam is `Authorization: Bearer local:<uuid>`.
It is deliberately not a production JWT verifier. Do not expose this API in
production before Supabase Auth/JWKS validation is implemented and reviewed.

API contract: [`docs/api/s001-openapi.yaml`](docs/api/s001-openapi.yaml).
