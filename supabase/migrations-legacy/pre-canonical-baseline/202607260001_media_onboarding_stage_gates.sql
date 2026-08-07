-- MOL-2: persistent Media Onboarding Lifecycle stage-gate execution records.
-- The lifecycle object remains the authoritative lead, candidate, or publisher.
-- Gate approval unlocks the next domain action; it does not fabricate downstream readiness.

create table if not exists public.media_onboarding_stage_gates (
  id uuid primary key default gen_random_uuid(),
  lifecycle_object_type text not null,
  lifecycle_object_id uuid not null,
  stage text not null,
  status text not null default 'not_started',
  owner_user_id uuid references public.profiles(id),
  owner_role text not null references public.roles(code),
  target_date date,
  deliverables jsonb not null default '[]'::jsonb,
  kpi_evidence jsonb not null default '[]'::jsonb,
  blocker text,
  notes text,
  submitted_at timestamptz,
  approved_by uuid references public.profiles(id),
  approved_by_role text references public.roles(code),
  approved_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_media_onboarding_stage_gate unique(lifecycle_object_type, lifecycle_object_id, stage),
  constraint chk_media_onboarding_stage_gate_object_type check (
    lifecycle_object_type in ('media_ecosystem_lead', 'trusted_supply_candidate', 'publisher')
  ),
  constraint chk_media_onboarding_stage_gate_stage check (
    stage in (
      'MEDIA_DISCOVERY',
      'BUSINESS_QUALIFICATION',
      'COMMERCIAL_AGREEMENT',
      'TECHNICAL_QUALIFICATION',
      'SDK_INTEGRATION',
      'QA_CERTIFICATION',
      'PILOT',
      'PRODUCTION_LAUNCH',
      'SCALE_OPERATION'
    )
  ),
  constraint chk_media_onboarding_stage_gate_status check (
    status in ('not_started', 'in_progress', 'blocked', 'ready_for_approval', 'approved', 'rejected')
  ),
  constraint chk_media_onboarding_stage_gate_deliverables check (jsonb_typeof(deliverables) = 'array'),
  constraint chk_media_onboarding_stage_gate_kpi_evidence check (jsonb_typeof(kpi_evidence) = 'array'),
  constraint chk_media_onboarding_stage_gate_approval check (
    status <> 'approved'
    or (
      submitted_at is not null
      and approved_by is not null
      and approved_by_role is not null
      and approved_at is not null
    )
  ),
  constraint chk_media_onboarding_stage_gate_rejection check (
    status <> 'rejected'
    or nullif(btrim(blocker), '') is not null
  )
);

create index if not exists idx_media_onboarding_stage_gate_queue
  on public.media_onboarding_stage_gates(stage, status, owner_role, target_date);

create index if not exists idx_media_onboarding_stage_gate_object
  on public.media_onboarding_stage_gates(lifecycle_object_type, lifecycle_object_id);

drop trigger if exists trg_media_onboarding_stage_gates_updated_at on public.media_onboarding_stage_gates;
create trigger trg_media_onboarding_stage_gates_updated_at
before update on public.media_onboarding_stage_gates
for each row execute function public.set_updated_at();

alter table public.media_onboarding_stage_gates enable row level security;

create or replace function public.enforce_media_onboarding_stage_gate_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  approval_roles text[];
begin
  approval_roles := case new.stage
    when 'MEDIA_DISCOVERY' then array['media_director', 'operations_director']
    when 'BUSINESS_QUALIFICATION' then array['media_director', 'operations_director']
    when 'COMMERCIAL_AGREEMENT' then array['legal_manager', 'media_director', 'operations_director']
    when 'TECHNICAL_QUALIFICATION' then array['integration_manager', 'media_director', 'operations_director']
    when 'SDK_INTEGRATION' then array['integration_manager', 'media_director', 'operations_director']
    when 'QA_CERTIFICATION' then array['integration_manager', 'media_director', 'operations_director']
    when 'PILOT' then array['media_director', 'operations_director']
    when 'PRODUCTION_LAUNCH' then array['media_director', 'operations_director']
    when 'SCALE_OPERATION' then array['media_director', 'operations_director']
    else array[]::text[]
  end;

  if tg_op = 'UPDATE' and old.status = 'approved' then
    raise exception using
      errcode = '42501',
      message = 'Approved media onboarding stage gates are immutable';
  end if;

  if new.status in ('approved', 'rejected')
    and (tg_op = 'INSERT' or old.status is distinct from new.status)
    and not public.has_any_role(approval_roles)
  then
    raise exception using
      errcode = '42501',
      message = 'Current user cannot approve or reject this media onboarding stage gate';
  end if;

  if new.status = 'approved'
    and (
      new.approved_by is distinct from auth.uid()
      or new.approved_by_role is null
      or not (new.approved_by_role = any(approval_roles))
      or not public.has_role(new.approved_by_role)
    )
  then
    raise exception using
      errcode = '42501',
      message = 'Stage gate approval actor and approval role must match the authenticated user';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_media_onboarding_stage_gate_transition on public.media_onboarding_stage_gates;
create trigger trg_media_onboarding_stage_gate_transition
before insert or update on public.media_onboarding_stage_gates
for each row execute function public.enforce_media_onboarding_stage_gate_transition();

drop policy if exists media_onboarding_stage_gates_read_business on public.media_onboarding_stage_gates;
create policy media_onboarding_stage_gates_read_business
on public.media_onboarding_stage_gates for select
using (auth.uid() is not null);

drop policy if exists media_onboarding_stage_gates_insert_operators on public.media_onboarding_stage_gates;
create policy media_onboarding_stage_gates_insert_operators
on public.media_onboarding_stage_gates for insert
with check (
  public.has_any_role(array[
    'media_manager',
    'media_director',
    'integration_manager',
    'adops_manager',
    'data_analyst',
    'legal_manager',
    'operations_director'
  ])
);

drop policy if exists media_onboarding_stage_gates_update_operators on public.media_onboarding_stage_gates;
create policy media_onboarding_stage_gates_update_operators
on public.media_onboarding_stage_gates for update
using (
  public.has_any_role(array[
    'media_manager',
    'media_director',
    'integration_manager',
    'adops_manager',
    'data_analyst',
    'legal_manager',
    'operations_director'
  ])
)
with check (
  public.has_any_role(array[
    'media_manager',
    'media_director',
    'integration_manager',
    'adops_manager',
    'data_analyst',
    'legal_manager',
    'operations_director'
  ])
);

comment on table public.media_onboarding_stage_gates is
  'Operator-owned evidence and approval records for the PG OS Media Onboarding Lifecycle stage gates.';
