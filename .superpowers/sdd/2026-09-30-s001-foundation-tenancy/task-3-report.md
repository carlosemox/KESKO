# Task 3 report — tenant/owner/brand API

Status: DONE / READY FOR REVIEW

Implemented the Fastify HTTP vertical for tenant onboarding and brand authorization.

Evidence:

- `CI=true pnpm vitest run tests/integration/http` passed: 3 files, 12 tests.
- `RUN_DB_TESTS=1 CI=true pnpm test` passed: 7 files, 29 tests with the live HTTP smoke test against PostgreSQL/RLS and production fail-closed coverage.
- `CI=true pnpm typecheck` passed.
- HTTP requests accept only a local development bearer adapter (`Bearer local:<uuid>`); identity, tenant and role fields in request bodies are rejected.
- Tenant membership is resolved server-side before tenant reads or brand operations. Owner/admin create brands; member/viewer cannot.
- `docs/api/s001-openapi.yaml` documents the four routes and error contract.

Limit:

- The local bearer adapter is a development seam, not a production JWT verifier. Supabase Auth/JWKS integration is outside this slice and must be implemented before production exposure.
