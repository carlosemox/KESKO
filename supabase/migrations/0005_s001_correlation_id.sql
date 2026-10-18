-- Carry the API correlation id into trigger-generated audit records.
create or replace function public.audit_brand_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  correlation uuid;
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'authenticated user is required';
  end if;

  begin
    correlation := nullif(current_setting('request.correlation_id', true), '')::uuid;
  exception when invalid_text_representation then
    correlation := null;
  end;

  insert into public.audit_events (
    tenant_id, actor_user_id, action, entity_type, entity_id,
    correlation_id, outcome, metadata
  ) values (
    new.tenant_id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'brand.created' else 'brand.updated' end,
    'brand',
    new.id,
    coalesce(correlation, gen_random_uuid()),
    'success',
    jsonb_build_object('operation', lower(tg_op))
  );

  return new;
end;
$$;

revoke execute on function public.audit_brand_mutation() from public, anon, authenticated;
