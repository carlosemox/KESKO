-- Forward-only correction: creator identity does not outlive active membership.
-- The SECURITY DEFINER creation RPC inserts owner membership before returning.
drop policy if exists tenants_select_member on public.tenants;
create policy tenants_select_member on public.tenants
  for select using ((select public.is_active_tenant_member(id)));
