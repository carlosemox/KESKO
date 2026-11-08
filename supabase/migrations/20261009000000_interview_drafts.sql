-- Additive, resumable interview storage. One draft per tenant and actor.
create table kesko_workflow.interview_drafts (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  actor_id uuid not null,
  current_index integer not null check (current_index between 0 and 11),
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, actor_id)
);

alter table kesko_workflow.interview_drafts enable row level security;
alter table kesko_workflow.interview_drafts force row level security;
revoke all on kesko_workflow.interview_drafts from public, anon, authenticated;
grant select, insert, update on kesko_workflow.interview_drafts to kesko_workflow_executor;

create policy interview_drafts_read on kesko_workflow.interview_drafts
  for select to kesko_workflow_executor
  using (public.is_active_tenant_member(tenant_id) and actor_id = auth.uid());

create policy interview_drafts_write on kesko_workflow.interview_drafts
  for insert to kesko_workflow_executor
  with check (public.is_active_tenant_member(tenant_id) and actor_id = auth.uid());

create policy interview_drafts_update on kesko_workflow.interview_drafts
  for update to kesko_workflow_executor
  using (public.is_active_tenant_member(tenant_id) and actor_id = auth.uid())
  with check (public.is_active_tenant_member(tenant_id) and actor_id = auth.uid());
