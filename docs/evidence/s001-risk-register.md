# S-001 risk register

| Risk | State | Mitigation / next action |
|---|---|---|
| Local bearer adapter is not production authentication | Open, intentional | Replace with validated Supabase Auth/JWKS context before production exposure. |
| Local Docker/PostgreSQL can degrade under Supabase auxiliary services | Recovered locally | Keep forward-only migrations; investigate host resource pressure before CI rollout. |
| `SECURITY DEFINER` helpers and audit trigger bypass RLS by design | Controlled | Fixed search path, restricted EXECUTE grants, explicit `auth.uid()` checks and independent RLS tests. |
| Redis is not provisioned | Out of scope | Prepare only in S-003 when queues/rate limits require it. |
| Clean database reset not executed | Evidence limitation | Requires explicit GO because reset is destructive; run in an isolated disposable environment during Gate D. |
