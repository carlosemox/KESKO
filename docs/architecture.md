# Architecture map

Observed 2026-10-18: Node.js 24, Fastify, TypeScript, node-postgres, PostgreSQL
17, Vitest and Prettier. Preserve this stack; the toolkit's Next.js/Drizzle
templates do not apply.

- `src/app.ts` assembles HTTP routes and bounded database pool lifecycle.
- `src/http/` contains authentication, errors and the local network boundary.
- `src/db/` owns tenant/brand/audit queries and scoped transactions.
- `src/workflow/model.ts` owns workflow states, validation and transitions.
- `src/workflow/repository.ts` owns snapshots, operation replay and events.
- `src/workflow/interview-repository.ts` stores one draft per tenant/actor.
- `src/workflow/ui.ts` serves HTML, CSS and browser JavaScript on loopback.
- `supabase/migrations/` contains forward SQL and RLS; never apply on import.

The server supports configured Supabase JWT/JWKS verification or explicit local
development identity; both retain the loopback boundary. Real provider/session
integration remains pending. SQL uses parameterized queries, role-scoped
transactions and forced RLS for workflow tables. Authorization must remain
backend-owned. Workflow commands use operation IDs and optimistic versions;
interview writes compare a normalized snapshot version and reject stale writes.
See the [local draft contract](contracts/interview-draft-v1.md).
See [authentication](contracts/authentication-v1.md), the additive [human
journey contract](contracts/journey-v1.md), and the [human UI/UX contract](contracts/design-v1.md).
Journey and design commands reuse the same snapshot/event transaction, CAS and
RLS; their migrations only expand the allowed event vocabulary.

Canonical contracts: [tenancy](contracts/s001-tenancy-v1.md),
[OpenAPI](api/s001-openapi.yaml), and
[workflow scope](superpowers/specs/2026-10-08-development-flow.md).
These remain authoritative for their respective slices.
