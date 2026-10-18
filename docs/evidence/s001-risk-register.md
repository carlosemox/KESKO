# S-001 risk register

| Risk | State | Mitigation / next action |
|---|---|---|
| Local bearer adapter is not production authentication | Controlled fail-closed | `NODE_ENV=production` rejects the local adapter; replace with validated Supabase Auth/JWKS context before production exposure. |
| Local Docker/PostgreSQL can degrade under Supabase auxiliary services | Recovered locally | Keep forward-only migrations; investigate host resource pressure before CI rollout. |
| RLS helper calls may be re-evaluated per row | Resolved | Migration 0006 wraps stable auth/policy calls in statement-level `select`; advisors no longer report KESKO policy warnings. |
| `SECURITY DEFINER` helpers and audit trigger bypass RLS by design | Controlled | Fixed search path, restricted EXECUTE grants, explicit `auth.uid()` checks and independent RLS tests. |
| Redis is not provisioned | Out of scope | Prepare only in S-003 when queues/rate limits require it. |
| Clean database reset not executed | Evidence limitation | Requires explicit GO because reset is destructive; run in an isolated disposable environment during Gate D. |
| Failure/denial audit events are not persisted | Out of scope for S-001 | Current slice records successful tenant/brand mutations; add a transactional failure-audit contract before treating denial telemetry as a product requirement. |
