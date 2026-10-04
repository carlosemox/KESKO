-- Keep tenant ownership immutable and record every authorized brand mutation.
create or replace function public.prevent_brand_ownership_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.tenant_id <> old.tenant_id then
    raise exception using errcode = 'check_violation', message = 'brand tenant cannot be changed';
  end if;

  if new.created_by <> old.created_by then
    raise exception using errcode = 'check_violation', message = 'brand creator cannot be changed';
  end if;

  return new;
end;
$$;

create trigger brands_prevent_ownership_change
before update on public.brands
for each row execute function public.prevent_brand_ownership_change();

revoke execute on function public.prevent_brand_ownership_change() from public, anon, authenticated;

create or replace function public.audit_brand_mutation()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = '28000', message = 'authenticated user is required';
  end if;

  insert into public.audit_events (
    tenant_id, actor_user_id, action, entity_type, entity_id,
    correlation_id, outcome, metadata
  ) values (
    new.tenant_id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'brand.created' else 'brand.updated' end,
    'brand',
    new.id,
    gen_random_uuid(),
    'success',
    jsonb_build_object('operation', lower(tg_op))
  );

  return new;
end;
$$;

create trigger brands_audit_mutation
after insert or update on public.brands
for each row execute function public.audit_brand_mutation();

revoke execute on function public.audit_brand_mutation() from public, anon, authenticated;
