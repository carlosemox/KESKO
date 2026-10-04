# S-001 tenancy contract v1

This contract defines the first Marketing OS vertical flow: tenant onboarding,
automatic owner membership, and authorized brand operations.

## Context and roles

Every authenticated request carries a `TenantContext` with `userId`,
`tenantId`, and one role: `owner`, `admin`, `member`, or `viewer`. A context
without a tenant, user, role, or authenticated identity is invalid.

The domain never trusts `tenantId`, `userId`, or role from an arbitrary request
body. Those values come from the validated identity and the persisted
membership.

## Permissions

| Permission | owner | admin | member | viewer |
| --- | --- | --- | --- | --- |
| `tenant:read` | yes | yes | yes | yes |
| `brand:read` | yes | yes | yes | yes |
| `brand:create` | yes | yes | no | no |
| `brand:update` | yes | yes | no | no |
| `audit:read` | yes | yes | no | no |

Authorization is deny-by-default. Unauthenticated requests are rejected with
`UNAUTHENTICATED`; an authenticated role without the permission receives
`FORBIDDEN`.

## Tenant isolation and validation

Operations against a different tenant produce the domain error
`TENANT_NOT_FOUND`, which the API maps to HTTP `404` so resource existence is
not disclosed. Brand names are trimmed and must contain 1–120 characters.
Brand slugs are normalized to lowercase and must be kebab-case, at most 63
characters.

## Versioning and scope

The exported contract version is `v1`. This slice covers PostgreSQL/RLS-backed
tenant, membership, brand, and audit operations. OAuth providers, storage,
Redis, workers, publishing, frontend, production, and real data are outside
S-001.
