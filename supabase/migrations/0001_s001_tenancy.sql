create extension if not exists pgcrypto;

create type public.tenant_role as enum ('owner', 'admin', 'member', 'viewer');
create type public.membership_status as enum ('active', 'invited', 'suspended');

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now()
);

create table public.tenant_memberships (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null,
  role public.tenant_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 120),
  slug text not null check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' and length(slug) <= 63),
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_user_id uuid not null,
  action text not null check (action <> ''),
  entity_type text not null check (entity_type <> ''),
  entity_id uuid,
  correlation_id uuid not null,
  outcome text not null check (outcome in ('success', 'failure')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index tenant_memberships_user_idx on public.tenant_memberships (user_id, tenant_id);
create index brands_tenant_idx on public.brands (tenant_id);
create index audit_events_tenant_created_idx on public.audit_events (tenant_id, created_at desc);

create or replace function public.is_active_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = target_tenant_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
  );
$$;

create or replace function public.has_tenant_role(
  target_tenant_id uuid,
  allowed_roles public.tenant_role[]
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.tenant_memberships membership
    where membership.tenant_id = target_tenant_id
      and membership.user_id = auth.uid()
      and membership.status = 'active'
      and membership.role = any(allowed_roles)
  );
$$;

create or replace function public.create_tenant_with_owner(
  tenant_name text,
  tenant_slug text,
  request_correlation_id uuid default gen_random_uuid()
)
returns public.tenants
language plpgsql
security definer
set search_path = public
as $$
declare
  created_tenant public.tenants;
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception using errcode = '28000', message = 'authenticated user is required';
  end if;

  insert into public.tenants (name, slug, created_by)
  values (btrim(tenant_name), lower(btrim(tenant_slug)), actor)
  returning * into created_tenant;

  insert into public.tenant_memberships (tenant_id, user_id, role, status)
  values (created_tenant.id, actor, 'owner', 'active');

  insert into public.audit_events (
    tenant_id, actor_user_id, action, entity_type, entity_id,
    correlation_id, outcome, metadata
  ) values (
    created_tenant.id, actor, 'tenant.created', 'tenant', created_tenant.id,
    request_correlation_id, 'success', jsonb_build_object('role', 'owner')
  );

  return created_tenant;
end;
$$;

alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.brands enable row level security;
alter table public.audit_events enable row level security;

create policy tenants_select_member on public.tenants
  for select using (public.is_active_tenant_member(id) or created_by = auth.uid());

create policy memberships_select_member on public.tenant_memberships
  for select using (
    user_id = auth.uid()
    or public.has_tenant_role(tenant_id, array['owner', 'admin']::public.tenant_role[])
  );

create policy brands_select_member on public.brands
  for select using (public.is_active_tenant_member(tenant_id));

create policy brands_insert_owner_admin on public.brands
  for insert with check (
    created_by = auth.uid()
    and public.has_tenant_role(tenant_id, array['owner', 'admin']::public.tenant_role[])
  );

create policy brands_update_owner_admin on public.brands
  for update using (
    public.has_tenant_role(tenant_id, array['owner', 'admin']::public.tenant_role[])
  ) with check (
    public.has_tenant_role(tenant_id, array['owner', 'admin']::public.tenant_role[])
  );

create policy audit_select_owner_admin on public.audit_events
  for select using (
    public.has_tenant_role(tenant_id, array['owner', 'admin']::public.tenant_role[])
  );

revoke insert, update, delete on public.tenants from anon, authenticated;
revoke insert, update, delete on public.tenant_memberships from anon, authenticated;
revoke insert, update, delete on public.audit_events from anon, authenticated;
grant execute on function public.create_tenant_with_owner(text, text, uuid) to authenticated;
grant execute on function public.is_active_tenant_member(uuid) to anon, authenticated;
grant execute on function public.has_tenant_role(uuid, public.tenant_role[]) to anon, authenticated;
