-- Keep the security-definer onboarding RPC callable only by authenticated API requests.
revoke execute on function public.create_tenant_with_owner(text, text, uuid) from public, anon;
grant execute on function public.create_tenant_with_owner(text, text, uuid) to authenticated;
