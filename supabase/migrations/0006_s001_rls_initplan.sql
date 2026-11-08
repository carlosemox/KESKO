-- Evaluate stable auth/policy helpers once per statement instead of once per row.
drop policy if exists tenants_select_member on public.tenants;
create policy tenants_select_member on public.tenants
  for select using (
    (select public.is_active_tenant_member(id))
    or created_by = (select auth.uid())
  );

drop policy if exists memberships_select_member on public.tenant_memberships;
create policy memberships_select_member on public.tenant_memberships
  for select using (
    user_id = (select auth.uid())
    or (select public.has_tenant_role(tenant_id, array['owner', 'admin']::public.tenant_role[]))
  );

drop policy if exists brands_select_member on public.brands;
create policy brands_select_member on public.brands
  for select using ((select public.is_active_tenant_member(tenant_id)));

drop policy if exists brands_insert_owner_admin on public.brands;
create policy brands_insert_owner_admin on public.brands
  for insert with check (
    created_by = (select auth.uid())
    and (select public.has_tenant_role(tenant_id, array['owner', 'admin']::public.tenant_role[]))
  );

drop policy if exists brands_update_owner_admin on public.brands;
create policy brands_update_owner_admin on public.brands
  for update using (
    (select public.has_tenant_role(tenant_id, array['owner', 'admin']::public.tenant_role[]))
  ) with check (
    (select public.has_tenant_role(tenant_id, array['owner', 'admin']::public.tenant_role[]))
  );

drop policy if exists audit_select_owner_admin on public.audit_events;
create policy audit_select_owner_admin on public.audit_events
  for select using (
    (select public.has_tenant_role(tenant_id, array['owner', 'admin']::public.tenant_role[]))
  );
