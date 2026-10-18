-- Policy helper functions must inspect memberships without recursively invoking
-- memberships' own RLS policy. The functions still filter by auth.uid().
create or replace function public.is_active_tenant_member(target_tenant_id uuid)
returns boolean
language sql
stable
security definer
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
security definer
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

revoke execute on function public.is_active_tenant_member(uuid) from public;
revoke execute on function public.has_tenant_role(uuid, public.tenant_role[]) from public;
grant execute on function public.is_active_tenant_member(uuid) to anon, authenticated;
grant execute on function public.has_tenant_role(uuid, public.tenant_role[]) to anon, authenticated;
