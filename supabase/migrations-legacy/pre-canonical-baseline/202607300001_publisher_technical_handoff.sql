begin;

alter table public.integration_projects
  add column if not exists handoff_status text,
  add column if not exists handoff_package jsonb not null default '{}'::jsonb,
  add column if not exists handoff_submitted_at timestamptz,
  add column if not exists handoff_submitted_by uuid references public.profiles(id) on delete set null,
  add column if not exists handoff_accepted_at timestamptz,
  add column if not exists handoff_accepted_by uuid references public.profiles(id) on delete set null,
  add column if not exists handoff_feedback text;

update public.integration_projects
set handoff_status = 'accepted'
where handoff_status is null;

alter table public.integration_projects
  alter column handoff_status set default 'draft',
  alter column handoff_status set not null;

alter table public.integration_projects
  drop constraint if exists chk_integration_projects_handoff_status;

alter table public.integration_projects
  add constraint chk_integration_projects_handoff_status
  check (handoff_status in ('draft', 'submitted', 'accepted', 'changes_requested'));

create index if not exists idx_integration_projects_handoff_status
  on public.integration_projects(handoff_status, handoff_submitted_at desc);

comment on column public.integration_projects.handoff_status is
  'Business-to-engineering handoff status: draft, submitted, accepted, or changes_requested.';

comment on column public.integration_projects.handoff_package is
  'Media Manager intake package containing engineering contact, target dates, launch requirements, and integration expectations.';

commit;
