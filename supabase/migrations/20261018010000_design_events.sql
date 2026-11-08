-- Additive command vocabulary; existing rows, privileges and RLS are preserved.
alter table kesko_workflow.events
  drop constraint events_type_check,
  add constraint events_type_check check (type in (
    'created', 'update_briefing', 'run_step', 'approve_prd',
    'submit_journey', 'approve_journey', 'submit_design', 'approve_design'
  ));
