-- Disposable PostgreSQL integration fixture, NOT a Supabase Auth service.
-- Tests impersonate identities with SET LOCAL ROLE and session settings; no
-- JWT signature, issuer, expiry, login, refresh, or JWKS verification happens.
-- auth.uid() supports both the legacy request.jwt.claim.sub setting used by
-- this repository and the request.jwt.claims JSON object used by PostgREST.
-- Missing/empty settings yield NULL; malformed UUID/JSON values fail normally.
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security
create role anon nologin nosuperuser nobypassrls;
create role authenticated nologin nosuperuser nobypassrls;
create schema auth;
grant usage on schema auth, public to anon, authenticated;

create function auth.uid() returns uuid
language sql stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
  )::uuid;
$$;
revoke all on function auth.uid() from public;
grant execute on function auth.uid() to anon, authenticated;

-- Reproduce the ALL table privileges confirmed on the local Supabase baseline,
-- including TRUNCATE (which bypasses RLS), REFERENCES and TRIGGER. This is an
-- intentionally permissive baseline ONLY for this disposable database: the
-- forward migrations must revoke those privileges, and regression tests must
-- catch missing revocations. Apply BEFORE migrations; never re-grant afterward.
alter default privileges for role postgres in schema public
  grant all privileges on tables to anon, authenticated;
