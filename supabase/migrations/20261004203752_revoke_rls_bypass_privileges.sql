-- Supabase's table defaults can include privileges not governed by RLS.
-- API roles must never truncate whole tables or install triggers/foreign keys.
-- Forward-only ACL correction: does not mutate application rows.
revoke truncate, references, trigger on table
  public.tenants,
  public.tenant_memberships,
  public.brands,
  public.audit_events
from public, anon, authenticated;
