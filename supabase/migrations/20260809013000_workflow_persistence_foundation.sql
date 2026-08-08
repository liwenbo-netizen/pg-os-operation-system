-- CX-0201: additive Workflow Machine V2.5 persistence foundation.
-- This migration does not remove or reinterpret any legacy workflow field.

create or replace function public.workflow_stage_for_node(p_workflow_node text)
returns text
language sql
immutable
strict
set search_path = public
as $$
  select case p_workflow_node
    when 'S0_SCREENING' then 'S0_MEDIA_LEAD'
    when 'S1_FIRST_CONTACT' then 'S1_MEDIA_CANDIDATE'
    when 'S1_INFORMATION_COLLECTION' then 'S1_MEDIA_CANDIDATE'
    when 'S1_INTERNAL_EVALUATION' then 'S1_MEDIA_CANDIDATE'
    when 'S2_TECH_PREASSESSMENT' then 'S2_BUSINESS_FOLLOW_UP'
    when 'S2_ENGINEERING_RESOURCE_REVIEW' then 'S2_BUSINESS_FOLLOW_UP'
    when 'S2_HANDOVER_PREPARATION' then 'S2_BUSINESS_FOLLOW_UP'
    when 'S2_HANDOVER_REVIEW' then 'S2_BUSINESS_FOLLOW_UP'
    when 'S3_T0_SCOPE_LOCK' then 'S3_TECHNICAL_INTEGRATION'
    when 'S3_T1_ENVIRONMENT' then 'S3_TECHNICAL_INTEGRATION'
    when 'S3_T2_PROTOCOL' then 'S3_TECHNICAL_INTEGRATION'
    when 'S3_T3_AD_CHAIN' then 'S3_TECHNICAL_INTEGRATION'
    when 'S3_T4_IVT_PRIVACY' then 'S3_TECHNICAL_INTEGRATION'
    when 'S3_T5_DATA_RECONCILIATION' then 'S3_TECHNICAL_INTEGRATION'
    when 'S3_G0_SANDBOX' then 'S3_TECHNICAL_INTEGRATION'
    when 'S3_TECH_CERT_REVIEW' then 'S3_TECHNICAL_INTEGRATION'
    when 'S3_T6_PRODUCTION_RELEASE' then 'S3_TECHNICAL_INTEGRATION'
    when 'S3_PRODUCTION_VALIDATION' then 'S3_TECHNICAL_INTEGRATION'
    when 'S4_G1_PRODUCTION_SHADOW' then 'S4_GRAY_TEST'
    when 'S4_G2_LIMITED_TRAFFIC' then 'S4_GRAY_TEST'
    when 'S4_G3_LIMITED_BUDGET' then 'S4_GRAY_TEST'
    when 'S4_COMMERCIAL_READY_REVIEW' then 'S4_GRAY_TEST'
    when 'S5_LIMITED_ACTIVATION' then 'S5_COMMERCIAL_READY'
    when 'S5_LIMITED_SELLABLE' then 'S5_COMMERCIAL_READY'
    when 'S5_G4_CONTROLLED_RAMP' then 'S5_COMMERCIAL_READY'
    when 'S5_G5_SCALE_QUALIFICATION' then 'S5_COMMERCIAL_READY'
    when 'S5_SCALE_REVIEW' then 'S5_COMMERCIAL_READY'
    when 'S5_SCALE_READY' then 'S5_COMMERCIAL_READY'
    when 'S5_ACTIVE_SCALED' then 'S5_COMMERCIAL_READY'
    else null
  end;
$$;

create or replace function public.workflow_stage_node_is_valid(
  p_lifecycle_stage text,
  p_workflow_node text
)
returns boolean
language sql
immutable
strict
set search_path = public
as $$
  select public.workflow_stage_for_node(p_workflow_node) = p_lifecycle_stage;
$$;

create table public.workflow_instances (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.media_ecosystem_opportunities(id) on delete restrict,
  machine_spec_version text not null default '1.8.0',
  machine_schema_version text not null default '2.5.0',
  lifecycle_stage text not null,
  workflow_node text not null,
  node_status text not null,
  control_status text not null,
  milestone_code text,
  workflow_version integer not null default 1,
  current_dri_user_id uuid,
  legacy_source_status text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workflow_instances_opportunity_key unique (opportunity_id),
  constraint workflow_instances_spec_version_check check (machine_spec_version = '1.8.0'),
  constraint workflow_instances_schema_version_check check (machine_schema_version = '2.5.0'),
  constraint workflow_instances_lifecycle_stage_check check (lifecycle_stage in (
    'S0_MEDIA_LEAD', 'S1_MEDIA_CANDIDATE', 'S2_BUSINESS_FOLLOW_UP',
    'S3_TECHNICAL_INTEGRATION', 'S4_GRAY_TEST', 'S5_COMMERCIAL_READY'
  )),
  constraint workflow_instances_node_status_check check (node_status in (
    'READY', 'IN_PROGRESS', 'BLOCKED', 'FAILED', 'PASSED', 'CANCELLED'
  )),
  constraint workflow_instances_control_status_check check (control_status in (
    'ACTIVE', 'ON_HOLD', 'SUSPENDED', 'CLOSED', 'TERMINATED'
  )),
  constraint workflow_instances_milestone_check check (milestone_code is null or milestone_code in (
    'M0_MEDIA_CONFIRMED', 'M1_BUSINESS_QUALIFIED', 'M2_TECH_PRE_ASSESSED',
    'M3_ENGINEERING_APPROVED', 'M4_HANDOVER_ACCEPTED', 'M5_TECHNICALLY_CERTIFIED',
    'M6_PRODUCTION_RELEASE_CERTIFIED', 'M7_G3_PASSED', 'M8_COMMERCIAL_READY',
    'M9_SCALE_READY', 'M10_STABLE_SCALED'
  )),
  constraint workflow_instances_version_check check (workflow_version > 0),
  constraint workflow_instances_stage_node_check check (
    public.workflow_stage_node_is_valid(lifecycle_stage, workflow_node)
  )
);

create index workflow_instances_dri_idx
  on public.workflow_instances (current_dri_user_id, control_status, node_status);
create index workflow_instances_stage_node_idx
  on public.workflow_instances (lifecycle_stage, workflow_node, node_status);

create trigger workflow_instances_updated_at
before update on public.workflow_instances
for each row execute function public.set_updated_at();

create table public.workflow_transition_executions (
  execution_id uuid primary key default gen_random_uuid(),
  workflow_instance_id uuid not null references public.workflow_instances(id) on delete restrict,
  transition_id text not null,
  transition_version text not null,
  idempotency_key text not null,
  client_request_id text not null,
  actor_user_id uuid not null,
  source_workflow_version integer not null,
  target_workflow_version integer not null,
  source_state jsonb not null,
  target_state jsonb not null,
  gate_result_snapshot jsonb not null default '{}'::jsonb,
  status text not null,
  error_code text,
  started_at timestamptz not null default now(),
  committed_at timestamptz,
  constraint workflow_transition_executions_idempotency_key unique (idempotency_key),
  constraint workflow_transition_executions_transition_id_check check (length(trim(transition_id)) > 0),
  constraint workflow_transition_executions_transition_version_check check (transition_version ~ '^[0-9]+[.][0-9]+[.][0-9]+$'),
  constraint workflow_transition_executions_idempotency_check check (length(trim(idempotency_key)) > 0),
  constraint workflow_transition_executions_client_request_check check (length(trim(client_request_id)) > 0),
  constraint workflow_transition_executions_version_step_check check (
    source_workflow_version > 0 and target_workflow_version = source_workflow_version + 1
  ),
  constraint workflow_transition_executions_status_check check (status in (
    'COMMITTED', 'REJECTED', 'FAILED'
  )),
  constraint workflow_transition_executions_commit_time_check check (
    (status = 'COMMITTED' and committed_at is not null and error_code is null)
    or (status <> 'COMMITTED' and committed_at is null and error_code is not null)
  )
);

create index workflow_transition_executions_instance_time_idx
  on public.workflow_transition_executions (workflow_instance_id, started_at desc);
create index workflow_transition_executions_actor_time_idx
  on public.workflow_transition_executions (actor_user_id, started_at desc);

alter table public.workflow_instances enable row level security;
alter table public.workflow_transition_executions enable row level security;
revoke all on table public.workflow_instances from anon, authenticated;
revoke all on table public.workflow_transition_executions from anon, authenticated;
grant all on table public.workflow_instances to service_role;
grant all on table public.workflow_transition_executions to service_role;

insert into public.workflow_instances (
  opportunity_id,
  lifecycle_stage,
  workflow_node,
  node_status,
  control_status,
  milestone_code,
  workflow_version,
  current_dri_user_id,
  legacy_source_status,
  metadata
)
select
  opportunity.id,
  'S0_MEDIA_LEAD',
  'S0_SCREENING',
  'IN_PROGRESS',
  'ACTIVE',
  null,
  1,
  opportunity.owner_user_id,
  opportunity.ecosystem_status,
  jsonb_build_object(
    'backfill_task', 'CX-0201',
    'backfill_rule', 'ECOSYSTEM_MAPPED_TO_INITIAL_STATE',
    'legacy_record_preserved', true
  )
from public.media_ecosystem_opportunities opportunity
where opportunity.ecosystem_status = 'ECOSYSTEM_MAPPED'
on conflict (opportunity_id) do nothing;

create view public.workflow_instance_compatibility_v
with (security_invoker = true)
as
select
  opportunity.id as opportunity_id,
  instance.id as workflow_instance_id,
  instance.lifecycle_stage,
  instance.workflow_node,
  instance.node_status,
  instance.control_status,
  instance.milestone_code,
  instance.workflow_version,
  instance.current_dri_user_id,
  opportunity.ecosystem_status as legacy_ecosystem_status,
  case
    when instance.id is not null then 'AUTHORITATIVE_V2_5'
    else 'LEGACY_REVIEW_REQUIRED'
  end as compatibility_status
from public.media_ecosystem_opportunities opportunity
left join public.workflow_instances instance on instance.opportunity_id = opportunity.id;

revoke all on table public.workflow_instance_compatibility_v from anon, authenticated;
grant select on table public.workflow_instance_compatibility_v to service_role;
