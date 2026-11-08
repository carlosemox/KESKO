-- Private backend-owned workflow storage. No client role can execute writes.
create role kesko_workflow_executor nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
grant kesko_workflow_executor to postgres;
create schema kesko_workflow;
revoke all on schema kesko_workflow from public, anon, authenticated;
grant usage on schema kesko_workflow to authenticated, kesko_workflow_executor;
grant usage on schema public, auth to kesko_workflow_executor;
grant execute on function auth.uid() to kesko_workflow_executor;
grant execute on function public.is_active_tenant_member(uuid) to kesko_workflow_executor;
grant execute on function public.has_tenant_role(uuid, public.tenant_role[]) to kesko_workflow_executor;

create table kesko_workflow.projects (
  id uuid primary key,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  version integer not null check (version >= 1),
  snapshot jsonb not null,
  created_at timestamptz not null,
  unique (tenant_id, id),
  constraint valid_snapshot check (
    jsonb_typeof(snapshot) = 'object'
    and snapshot ?& array['schemaVersion','id','tenantId','version','createdBy','createdAt']
    and snapshot->>'schemaVersion' = '1'
    and snapshot->>'id' = id::text
    and snapshot->>'tenantId' = tenant_id::text
    and (snapshot->>'version')::integer = version
  )
);
create index workflow_projects_tenant_created on kesko_workflow.projects (tenant_id, created_at desc, id);
create table kesko_workflow.events (
  id uuid primary key,
  tenant_id uuid not null,
  project_id uuid not null,
  operation_id uuid not null,
  payload_hash text not null check (payload_hash ~ '^[0-9a-f]{64}$'),
  actor_id uuid not null,
  type text not null check (type in ('created','update_briefing','run_step','approve_prd')),
  version integer not null check (version >= 1),
  created_at timestamptz not null,
  details jsonb not null check (jsonb_typeof(details) = 'object' and details ?& array['input','action','resources','output','evidence']),
  foreign key (tenant_id,project_id) references kesko_workflow.projects(tenant_id,id) on delete cascade,
  unique (tenant_id,operation_id),
  unique (tenant_id,project_id,version)
);

alter table kesko_workflow.projects enable row level security;
alter table kesko_workflow.projects force row level security;
alter table kesko_workflow.events enable row level security;
alter table kesko_workflow.events force row level security;
revoke all on all tables in schema kesko_workflow from public, anon, authenticated;
grant select on kesko_workflow.projects, kesko_workflow.events to authenticated, kesko_workflow_executor;
grant insert on kesko_workflow.projects, kesko_workflow.events to kesko_workflow_executor;
grant update (snapshot,version) on kesko_workflow.projects to kesko_workflow_executor;
-- Events have neither UPDATE nor DELETE grants or policies (append-only).
create policy projects_read on kesko_workflow.projects for select to authenticated, kesko_workflow_executor
  using (public.is_active_tenant_member(tenant_id));
create policy projects_create on kesko_workflow.projects for insert to kesko_workflow_executor
  with check (public.has_tenant_role(tenant_id,array['owner','admin']::public.tenant_role[]) and snapshot->>'createdBy' = auth.uid()::text and version=1);
create policy projects_update on kesko_workflow.projects for update to kesko_workflow_executor
  using (public.has_tenant_role(tenant_id,array['owner','admin']::public.tenant_role[]))
  with check (public.has_tenant_role(tenant_id,array['owner','admin']::public.tenant_role[]));
create policy events_read on kesko_workflow.events for select to authenticated, kesko_workflow_executor
  using (public.is_active_tenant_member(tenant_id));
create policy events_append on kesko_workflow.events for insert to kesko_workflow_executor
  with check (public.has_tenant_role(tenant_id,array['owner','admin']::public.tenant_role[]) and actor_id=auth.uid());
