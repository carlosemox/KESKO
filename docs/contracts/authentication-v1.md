# Authentication adapter v1

Scope: local backend adapter delivered for S-001. The frontend remains a
synthetic local demo. No hosted access or production readiness is implied.

## Server configuration

`buildApp({ jwt: { issuer, audience } })` selects JWT mode. The standard entry
point also reads `SUPABASE_JWT_ISSUER` and `SUPABASE_JWT_AUDIENCE` from the
server environment; audience defaults to `authenticated` when omitted. If either
variable is present, JWT mode is selected and invalid configuration fails at
startup. Programmatic configuration takes precedence.

The issuer must be a canonical HTTPS URL ending exactly in `/auth/v1`, without
credentials, query or fragment. The only JWKS URL is
`<configured issuer>/.well-known/jwks.json`. Custom Supabase OSS domains are
supported. There is no request-selected issuer, JWKS URL, key or algorithm.
JWT `jku`/`x5u` and embedded keys do not configure the verifier. No real
credentials are needed for fixture tests.

`jose` verifies the signature with the issuer's public JWKS, allowing only
ES256 and RS256. It validates issuer, audience, expiration and `nbf` when
present. `sub`, `exp` and `iat` are required. The subject must be a UUID;
timestamps must be safe integer seconds, issuance cannot be negative or in the
future, and expiration must follow issuance. Clock tolerance is zero.
The resolver caches public keys using jose defaults and has a five-second
fetch timeout. JWKS failures and invalid tokens fail closed with the existing
401 `UNAUTHENTICATED` envelope, without exposing token or provider diagnostics.

## Request and authorization boundary

The existing global loopback IP and Host boundary runs first and remains in
place in both modes. One asynchronous `onRequest` hook resolves identity once.
A private WeakMap holds the resulting user context; synchronous consumers get
copies and never decode headers. Standalone route registration without the
identity hook fails closed, including for synthetic local headers.
The exported `registerIdentityHook(app, verifier?)` in `src/http/auth-context.ts`
registers this same boundary and identity hook for both `buildApp` and raw
Fastify integrations. Call it before registering protected routes; in JWT mode
pass the verifier returned by `createJwtVerifier(serverConfiguration)`.

JWT mode never accepts `local:<uuid>`, even in tests, and JWT failure never
falls back to local identity. Without JWT configuration, synthetic local bearer
identity is accepted only with explicit `NODE_ENV=development` or `test` and
the existing loopback checks. Unset, staging and production environments deny
synthetic authentication. Local demo startup must set `NODE_ENV=development`.
The existing local bearer format and API response contracts are retained.

Absent credentials leave public UI routes accessible on loopback; protected
routes require the trusted identity and return 401. Supplied malformed or
invalid credentials are rejected by the hook before repository access.
Authentication errors from that hook include `Cache-Control: no-store`, even
when rejection occurs before route-specific cache headers are set.
Only `authenticated` and `userId` cross this boundary. Token role, tenant and
metadata claims grant no permissions. Existing database membership lookup,
domain permissions, tenant-scoped repositories and PostgreSQL RLS remain the
authorization mechanism, including 403 for insufficient role and 404 for
inaccessible tenant resources.

## Evidence and remaining integration

The new unit tests exercise real ephemeral ES256/RS256 signatures with fixture
JWKS transport, required/time claims, signature/key/algorithm rejection and
configuration restrictions. HTTP tests use the real Fastify hook and routes
with repository doubles, showing invalid authentication before persistence,
membership authority, request-state isolation and local compatibility. They
do not prove a real provider or database integration.

Focused validation on 2026-10-18: the two new test files passed 28 tests with
zero skips using one worker. Project typecheck and ESLint on the five owned
TypeScript files passed. No full suite, real PostgreSQL, provider session or
remote CI run is claimed by this adapter delivery.

Shared-hook follow-up: the same hook is registered by the raw Fastify fixtures
in `tests/integration/workflow-api.test.ts` and
`tests/integration/http/local-boundary.test.ts`. Those two files plus the two
auth test files passed 57 tests with zero skips, using one worker. The explicit
standalone-without-hook rejection test remains. The database fixture update is
owned by the product worker and is not covered by this focused run.

The accessible Supabase inventory contains no KESKO project (coordinator
inventory). No unrelated account/project is used. A selected KESKO provider,
its issuer and signing keys, actual issued access tokens, and live integration
validation remain pending resources. Login, session storage, refresh, logout,
revocation and browser session lifecycle are not implemented or claimed.
Offline JWT verification alone does not immediately revoke an unexpired token.
Independent review and combined project gates are coordinator responsibilities;
this contract is not a signed Sentinel approval or remote CI evidence.

## External unblock

The account owner must identify the authorized Supabase organization for KESKO
and any existing development project at https://supabase.com/dashboard.
Organization ID and project reference are non-secret identifiers; they do not
authorize using another project's users or database. The connector requires an
explicit organization choice before cost estimation. No project creation or
paid plan has been authorized by this implementation.

Once the KESKO resource is identified, the executor can verify its plan and
capabilities, derive the issuer from that project's URL, configure the two
public environment values above and test an actual provider-issued identity.
Any nonzero cost requires separate approval. Personal login/MFA stays in the
provider; passwords, access tokens and private keys must never be sent in chat.
This configuration alone does not implement the pending session lifecycle.
