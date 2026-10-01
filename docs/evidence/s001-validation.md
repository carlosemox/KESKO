# S-001 validation evidence

Status: READY FOR INDEPENDENT REVIEW

Repository: `https://github.com/carlosemox/KESKO.git`
Branch: `codex/S-001-foundation-tenancy`
Provider: Supabase OSS / local PostgreSQL 17.11

Validation commands executed on 2026-10-01:

- `CI=true pnpm exec supabase db push --local --yes --skip-vault` — migrations 0003, 0004 and 0005 applied forward-only.
- `RUN_DB_TESTS=1 CI=true pnpm test` — 7 files, 29 tests passed.
- `CI=true pnpm typecheck` — passed.
- `git diff --check` — passed.
- Live HTTP smoke test — tenant creation, tenant read and brand creation passed against PostgreSQL/RLS.

Covered behavior: controlled owner creation, cross-tenant read/write isolation,
scoped brand slug uniqueness, viewer/member denial, immutable brand ownership,
brand audit events, bearer absence/invalid identity, strict request bodies,
tenant membership authorization and owner/admin brand creation.

Not performed: `supabase db reset`, merge, push, deploy, Production change,
Redis provisioning, external OAuth/JWKS authentication or any secret handling.
