-- PG OS V2.11 ZERO BUILD BASE SCHEMA LOCKED
-- This script is the zero-build starting point. Do not execute legacy extension SQL files.

create extension if not exists pgcrypto;

-- =============================
-- ENUMS
-- =============================
do $$ begin
  create type technical_live_status_enum as enum ('draft','pending_integration','in_integration','technical_review','technical_live_passed','technical_blocked','deprecated');
exception when duplicate_object then null; end $$;

do $$ begin
  create type commercial_test_status_enum as enum ('not_started','ready_for_test','testing','test_passed','test_failed','paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sales_scale_status_enum as enum ('not_allowed','limited_sellable','proposal_selectable','scale_ready','scale_blocked','paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type diagnostic_case_status_enum as enum ('opened','triage','evidence_collection','root_cause_analysis','action_required','conclusion_ready','closed','rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type severity_enum as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;

do $$ begin
  create type work_item_status_enum as enum ('open','in_progress','waiting_external','blocked','done','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type approval_status_enum as enum ('pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type proposal_status_enum as enum ('draft','media_validation','internal_review','approved_to_send','sent_to_client','client_feedback','won','lost','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type campaign_status_enum as enum ('draft','launch_check','pending_approval','approved','live','paused','completed','cancelled','blocked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type settlement_status_enum as enum ('draft','reconciling','pending_review','exception_review','confirmed','invoiced','paid','blocked','cancelled');
exception when duplicate_object then null; end $$;

-- =============================
-- COMMON UPDATED_AT TRIGGER
-- =============================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- =============================
-- USERS / RBAC
-- =============================
create table if not exists public.profiles (
  id uuid primary key,
  email text unique not null,
  full_name text,
  title text,
  department text,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  code text primary key,
  name text not null,
  description text,
  is_business_approval_role boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_code text not null references public.roles(code),
  primary key (user_id, role_code)
);

create table if not exists public.capability_tags (
  code text primary key,
  name text not null,
  description text
);

create table if not exists public.role_capabilities (
  role_code text not null references public.roles(code) on delete cascade,
  capability_code text not null references public.capability_tags(code) on delete cascade,
  primary key (role_code, capability_code)
);

create table if not exists public.route_permissions (
  route_path text not null,
  role_code text not null references public.roles(code) on delete cascade,
  can_read boolean not null default true,
  can_write boolean not null default false,
  primary key (route_path, role_code)
);

-- =============================
-- AUDIT / EVENTS / COLLAB
-- =============================
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  action text not null,
  object_type text not null,
  object_id uuid,
  before_data jsonb,
  after_data jsonb,
  trace_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.module_business_events (
  id uuid primary key default gen_random_uuid(),
  event_code text not null,
  object_type text not null,
  object_id uuid,
  owner_user_id uuid references public.profiles(id),
  owner_role text references public.roles(code),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.work_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  object_type text,
  object_id uuid,
  owner_user_id uuid references public.profiles(id),
  owner_role text references public.roles(code),
  status work_item_status_enum not null default 'open',
  priority severity_enum not null default 'medium',
  due_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id uuid not null,
  action_code text not null,
  requested_by uuid references public.profiles(id),
  approver_role text references public.roles(code),
  approver_user_id uuid references public.profiles(id),
  status approval_status_enum not null default 'pending',
  decision_note text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id uuid not null,
  body text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id uuid not null,
  file_name text not null,
  file_url text not null,
  mime_type text,
  uploaded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- =============================
-- MEDIA DOMAIN
-- =============================
create table if not exists public.publishers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_entity text,
  region text,
  media_type text,
  integration_type text,
  owner_user_id uuid references public.profiles(id),
  owner_role text references public.roles(code) default 'media_manager',
  technical_live_status technical_live_status_enum not null default 'draft',
  commercial_test_status commercial_test_status_enum not null default 'not_started',
  sales_scale_status sales_scale_status_enum not null default 'not_allowed',
  risk_level severity_enum not null default 'medium',
  daily_active_users bigint,
  daily_requests bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publisher_contacts (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  name text not null,
  role_title text,
  email text,
  phone text,
  messenger text,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publisher_ad_slots (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  slot_name text not null,
  ad_format text,
  placement_type text,
  floor_price numeric(12,4),
  currency text default 'CNY',
  daily_requests bigint,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publisher_contract_terms (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  contract_type text,
  billing_model text,
  settlement_cycle text,
  payment_terms text,
  revenue_share numeric(8,4),
  min_daily_spend numeric(14,2),
  currency text default 'CNY',
  effective_date date,
  expiry_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.publisher_supply_transparency (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  ads_txt_status text,
  app_ads_txt_status text,
  sellers_json_status text,
  schain_status text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_projects (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  integration_type text not null,
  owner_user_id uuid references public.profiles(id),
  status technical_live_status_enum not null default 'pending_integration',
  go_live_date date,
  notes text,
  checklist jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.commercial_tests (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  test_name text not null,
  owner_user_id uuid references public.profiles(id),
  status commercial_test_status_enum not null default 'ready_for_test',
  start_date date,
  end_date date,
  target_budget numeric(14,2),
  currency text default 'CNY',
  result_summary text,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================
-- ADVERTISER / SALES DOMAIN
-- =============================
create table if not exists public.advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  region text,
  owner_user_id uuid references public.profiles(id),
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advertiser_contacts (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.advertisers(id) on delete cascade,
  name text not null,
  role_title text,
  email text,
  phone text,
  is_primary boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid not null references public.advertisers(id) on delete cascade,
  name text not null,
  owner_user_id uuid references public.profiles(id),
  stage text not null default 'discovery',
  expected_budget numeric(14,2),
  currency text default 'CNY',
  pain_points jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_opportunity_stage check (stage in ('discovery','need_confirmed','proposal_drafting','proposal_review','won','lost'))
);

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  name text not null,
  owner_user_id uuid references public.profiles(id),
  status proposal_status_enum not null default 'draft',
  budget numeric(14,2),
  currency text default 'CNY',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.proposal_media_selections (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  publisher_id uuid not null references public.publishers(id),
  ad_slot_id uuid references public.publisher_ad_slots(id),
  guard_status text not null default 'pending',
  guard_reason text,
  planned_budget numeric(14,2),
  currency text default 'CNY',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(proposal_id, publisher_id, ad_slot_id)
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid references public.proposals(id),
  advertiser_id uuid not null references public.advertisers(id),
  name text not null,
  owner_user_id uuid references public.profiles(id),
  status campaign_status_enum not null default 'draft',
  start_date date,
  end_date date,
  budget numeric(14,2),
  currency text default 'CNY',
  launch_check jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_media_allocations (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  publisher_id uuid not null references public.publishers(id),
  ad_slot_id uuid references public.publisher_ad_slots(id),
  allocation_budget numeric(14,2),
  currency text default 'CNY',
  guard_status text not null default 'pending',
  guard_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================
-- DIAGNOSTICS
-- =============================
create table if not exists public.quality_diagnostic_cases (
  id uuid primary key default gen_random_uuid(),
  case_no text unique not null,
  case_type text not null,
  title text not null,
  publisher_id uuid references public.publishers(id),
  campaign_id uuid references public.campaigns(id),
  settlement_id uuid,
  owner_user_id uuid references public.profiles(id),
  owner_role text references public.roles(code),
  status diagnostic_case_status_enum not null default 'opened',
  severity severity_enum not null default 'medium',
  impact_scope text,
  downstream_action text,
  root_cause text,
  conclusion text,
  is_blocking_sales_scale boolean not null default false,
  is_blocking_settlement boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.quality_diagnostic_evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.quality_diagnostic_cases(id) on delete cascade,
  evidence_type text not null,
  title text not null,
  content text,
  data jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.metric_funnel_snapshots (
  id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id uuid not null,
  snapshot_date date not null,
  requests bigint,
  responses bigint,
  bids bigint,
  wins bigint,
  fills bigint,
  impressions bigint,
  clicks bigint,
  spend numeric(14,4),
  currency text default 'CNY',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =============================
-- CONTRACTS / FINANCE
-- =============================
create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id uuid,
  contract_name text not null,
  counterparty text,
  owner_user_id uuid references public.profiles(id),
  status text not null default 'draft',
  effective_date date,
  expiry_date date,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settlements (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns(id),
  publisher_id uuid references public.publishers(id),
  period_start date not null,
  period_end date not null,
  status settlement_status_enum not null default 'draft',
  amount numeric(14,4),
  currency text default 'CNY',
  owner_user_id uuid references public.profiles(id),
  exception_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settlement_items (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid not null references public.settlements(id) on delete cascade,
  item_type text not null,
  quantity numeric(18,4),
  unit_price numeric(14,4),
  amount numeric(14,4),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  settlement_id uuid references public.settlements(id),
  invoice_no text,
  amount numeric(14,4),
  currency text default 'CNY',
  status text not null default 'draft',
  issued_at date,
  paid_at date,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================
-- OKR / SOP / WIZARD
-- =============================
create table if not exists public.okr_objectives (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  owner_role text references public.roles(code),
  owner_user_id uuid references public.profiles(id),
  period text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.okr_key_results (
  id uuid primary key default gen_random_uuid(),
  objective_id uuid not null references public.okr_objectives(id) on delete cascade,
  title text not null,
  target_value numeric(18,4),
  current_value numeric(18,4) default 0,
  unit text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sop_cards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  scenario text not null,
  role_code text references public.roles(code),
  content text not null,
  related_route text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.wizard_progress_records (
  id uuid primary key default gen_random_uuid(),
  wizard_code text not null,
  object_type text not null,
  object_id uuid not null,
  current_step text not null,
  completed_steps jsonb not null default '[]'::jsonb,
  owner_user_id uuid references public.profiles(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(wizard_code, object_type, object_id)
);

-- =============================
-- INDEXES / TRIGGERS
-- =============================
create index if not exists idx_publishers_readiness on public.publishers(technical_live_status, commercial_test_status, sales_scale_status);
create index if not exists idx_work_items_owner on public.work_items(owner_user_id, owner_role, status);
create index if not exists idx_diagnostic_cases_blocking on public.quality_diagnostic_cases(is_blocking_sales_scale, is_blocking_settlement, status);
create index if not exists idx_audit_logs_object on public.audit_logs(object_type, object_id);

-- Attach updated_at trigger to selected tables
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','work_items','approvals','publishers','publisher_contacts','publisher_ad_slots','publisher_contract_terms',
    'publisher_supply_transparency','integration_projects','commercial_tests','advertisers','advertiser_contacts',
    'opportunities','proposals','proposal_media_selections','campaigns','campaign_media_allocations','quality_diagnostic_cases',
    'contracts','settlements','invoices','okr_objectives','okr_key_results','sop_cards','wizard_progress_records'
  ] LOOP
    EXECUTE format('drop trigger if exists trg_%s_updated_at on public.%I', t, t);
    EXECUTE format('create trigger trg_%s_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  END LOOP;
END $$;
