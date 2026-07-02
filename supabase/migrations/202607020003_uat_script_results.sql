-- Phase 34 UAT script result persistence.
-- Stores production manual UAT checklist runs and step-level evidence.

create table if not exists public.uat_script_runs (
  id uuid primary key default gen_random_uuid(),
  run_key text unique not null,
  environment text not null default 'production',
  production_url text,
  started_by uuid references public.profiles(id),
  started_by_role text references public.roles(code),
  status text not null default 'in_progress',
  summary jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_uat_script_run_status check (status in ('in_progress','completed','failed','blocked','archived'))
);

create table if not exists public.uat_script_step_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.uat_script_runs(id) on delete cascade,
  script_id text not null,
  script_title text not null,
  role_code text references public.roles(code),
  step_id text not null,
  step_action text not null,
  expected_result text not null,
  status text not null default 'pending',
  actual_result text not null default '',
  actor_user_id uuid references public.profiles(id),
  actor_role text references public.roles(code),
  updated_by uuid references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(run_id, step_id),
  constraint chk_uat_script_step_status check (status in ('pending','passed','failed','blocked'))
);

create index if not exists idx_uat_script_runs_key on public.uat_script_runs(run_key);
create index if not exists idx_uat_script_runs_updated on public.uat_script_runs(updated_at desc);
create index if not exists idx_uat_script_step_results_run on public.uat_script_step_results(run_id, role_code, status);

drop trigger if exists trg_uat_script_runs_updated_at on public.uat_script_runs;
create trigger trg_uat_script_runs_updated_at
before update on public.uat_script_runs
for each row execute function public.set_updated_at();

drop trigger if exists trg_uat_script_step_results_updated_at on public.uat_script_step_results;
create trigger trg_uat_script_step_results_updated_at
before update on public.uat_script_step_results
for each row execute function public.set_updated_at();

alter table public.uat_script_runs enable row level security;
alter table public.uat_script_step_results enable row level security;

drop policy if exists uat_script_runs_read_signoff on public.uat_script_runs;
create policy uat_script_runs_read_signoff on public.uat_script_runs
for select using (
  public.has_any_role(array['ceo','operations_director','system_admin','audit_viewer'])
);

drop policy if exists uat_script_runs_write_signoff on public.uat_script_runs;
create policy uat_script_runs_write_signoff on public.uat_script_runs
for all using (
  public.has_any_role(array['ceo','operations_director','system_admin','audit_viewer'])
)
with check (
  public.has_any_role(array['ceo','operations_director','system_admin','audit_viewer'])
);

drop policy if exists uat_script_step_results_read_signoff on public.uat_script_step_results;
create policy uat_script_step_results_read_signoff on public.uat_script_step_results
for select using (
  public.has_any_role(array['ceo','operations_director','system_admin','audit_viewer'])
);

drop policy if exists uat_script_step_results_write_signoff on public.uat_script_step_results;
create policy uat_script_step_results_write_signoff on public.uat_script_step_results
for all using (
  public.has_any_role(array['ceo','operations_director','system_admin','audit_viewer'])
)
with check (
  public.has_any_role(array['ceo','operations_director','system_admin','audit_viewer'])
);
