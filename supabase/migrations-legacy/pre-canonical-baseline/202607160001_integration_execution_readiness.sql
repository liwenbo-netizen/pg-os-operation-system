-- Phase CM-5D: Technical Integration Execution and readiness evidence.

alter table public.integration_projects
  add column if not exists evidence jsonb not null default '[]'::jsonb,
  add column if not exists blocker text,
  add column if not exists next_action text,
  add column if not exists readiness_reviewed_at timestamptz;

alter table public.integration_projects
  drop constraint if exists chk_integration_projects_evidence_array;

alter table public.integration_projects
  add constraint chk_integration_projects_evidence_array
  check (jsonb_typeof(evidence) = 'array');

update public.integration_projects
set next_action = case
  when status = 'technical_live_passed' then 'Technical readiness passed. Continue to commercial validation.'
  when status = 'technical_blocked' then 'Resolve the active technical blocker.'
  else 'Record connection, test request, callback, and production log evidence.'
end
where next_action is null;
