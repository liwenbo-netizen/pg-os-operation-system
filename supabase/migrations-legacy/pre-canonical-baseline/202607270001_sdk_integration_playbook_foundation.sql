-- SDK-1A/1B: versioned technical integration profile and executable checklist.
-- Playbook definitions remain in source control; these tables store project-specific
-- configuration, evidence references, ownership, blockers, and completion status.

create table if not exists public.integration_project_profiles (
  id uuid primary key default gen_random_uuid(),
  integration_project_id uuid not null unique references public.integration_projects(id) on delete cascade,
  platform text not null default 'android',
  property_identifier text not null,
  playbook_codes text[] not null default '{}'::text[],
  min_sdk integer,
  target_sdk integer,
  compile_sdk integer,
  agp_version text,
  gradle_version text,
  language text,
  process_model text,
  media_engineering_contact text not null,
  planned_formats text[] not null default '{}'::text[],
  privacy_profile jsonb not null default '{}'::jsonb,
  target_pilot_date date,
  secret_reference text,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_integration_profile_platform check (platform in ('android', 'android_tv', 'other')),
  constraint chk_integration_profile_language check (language is null or language in ('java', 'kotlin', 'mixed')),
  constraint chk_integration_profile_process_model check (
    process_model is null or process_model in ('single_process', 'multi_process')
  ),
  constraint chk_integration_profile_sdk_versions check (
    (min_sdk is null or min_sdk between 1 and 100)
    and (target_sdk is null or target_sdk between 1 and 100)
    and (compile_sdk is null or compile_sdk between 1 and 100)
    and (min_sdk is null or target_sdk is null or min_sdk <= target_sdk)
    and (target_sdk is null or compile_sdk is null or target_sdk <= compile_sdk)
  ),
  constraint chk_integration_profile_playbooks check (cardinality(playbook_codes) > 0),
  constraint chk_integration_profile_privacy_object check (jsonb_typeof(privacy_profile) = 'object'),
  constraint chk_integration_profile_secret_reference check (
    secret_reference is null
    or secret_reference ~* '^(vault|secret|env|vercel|supabase)://[a-z0-9/_-]+$'
  )
);

create index if not exists idx_integration_project_profiles_project
  on public.integration_project_profiles(integration_project_id);

drop trigger if exists trg_integration_project_profiles_updated_at on public.integration_project_profiles;
create trigger trg_integration_project_profiles_updated_at
before update on public.integration_project_profiles
for each row execute function public.set_updated_at();

create table if not exists public.integration_check_results (
  id uuid primary key default gen_random_uuid(),
  integration_project_id uuid not null references public.integration_projects(id) on delete cascade,
  item_code text not null,
  status text not null default 'not_started',
  owner_role text not null references public.roles(code),
  responsible_party text,
  due_date date,
  evidence_reference text,
  blocker text,
  waiver_reason text,
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_integration_check_result unique(integration_project_id, item_code),
  constraint chk_integration_check_status check (
    status in ('not_started', 'in_progress', 'blocked', 'passed', 'failed', 'waived')
  ),
  constraint chk_integration_check_responsible_party check (
    responsible_party is null or responsible_party in ('MEDIA_ENGINEERING', 'PG_OS')
  ),
  constraint chk_integration_check_pass_evidence check (
    status <> 'passed' or nullif(btrim(evidence_reference), '') is not null
  ),
  constraint chk_integration_check_blocker check (
    status not in ('blocked', 'failed') or nullif(btrim(blocker), '') is not null
  ),
  constraint chk_integration_check_waiver check (
    status <> 'waived' or nullif(btrim(waiver_reason), '') is not null
  )
);

create index if not exists idx_integration_check_results_queue
  on public.integration_check_results(integration_project_id, status, owner_role, due_date);

drop trigger if exists trg_integration_check_results_updated_at on public.integration_check_results;
create trigger trg_integration_check_results_updated_at
before update on public.integration_check_results
for each row execute function public.set_updated_at();

alter table public.integration_project_profiles enable row level security;
alter table public.integration_check_results enable row level security;

drop policy if exists integration_project_profiles_read_business on public.integration_project_profiles;
create policy integration_project_profiles_read_business
on public.integration_project_profiles for select
using (auth.uid() is not null);

drop policy if exists integration_project_profiles_write_operators on public.integration_project_profiles;
create policy integration_project_profiles_write_operators
on public.integration_project_profiles for all
using (
  public.has_any_role(array[
    'integration_manager',
    'media_manager',
    'media_director',
    'operations_director'
  ])
)
with check (
  public.has_any_role(array[
    'integration_manager',
    'media_manager',
    'media_director',
    'operations_director'
  ])
);

drop policy if exists integration_check_results_read_business on public.integration_check_results;
create policy integration_check_results_read_business
on public.integration_check_results for select
using (auth.uid() is not null);

drop policy if exists integration_check_results_write_operators on public.integration_check_results;
create policy integration_check_results_write_operators
on public.integration_check_results for all
using (
  public.has_any_role(array[
    'integration_manager',
    'media_director',
    'operations_director',
    'legal_manager',
    'data_analyst',
    'adops_manager'
  ])
)
with check (
  public.has_any_role(array[
    'integration_manager',
    'media_director',
    'operations_director',
    'legal_manager',
    'data_analyst',
    'adops_manager'
  ])
);

comment on table public.integration_project_profiles is
  'Versioned SDK playbook selection and non-secret technical profile for one integration project.';

comment on table public.integration_check_results is
  'Executable SDK integration checklist results with evidence, ownership, blocker, and waiver trace.';
