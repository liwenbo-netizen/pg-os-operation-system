-- EXTENSION_MANAGED: dependencies required by public objects
create extension if not exists "pg_stat_statements" with schema "extensions";
create extension if not exists "pgcrypto" with schema "extensions";
create extension if not exists "plpgsql" with schema "pg_catalog";
create extension if not exists "supabase_vault" with schema "vault";
create extension if not exists "uuid-ossp" with schema "extensions";
-- EXTENSION_MANAGED: dependencies required by public objects
create extension if not exists "pg_stat_statements" with schema "extensions";
create extension if not exists "pgcrypto" with schema "extensions";
create extension if not exists "plpgsql" with schema "pg_catalog";
create extension if not exists "supabase_vault" with schema "vault";
create extension if not exists "uuid-ossp" with schema "extensions";

-- PG_OS_APPLICATION_MANAGED types
create type "public"."approval_status_enum" as enum ('pending', 'approved', 'rejected', 'cancelled');
create type "public"."campaign_status_enum" as enum ('draft', 'launch_check', 'pending_approval', 'approved', 'live', 'paused', 'completed', 'cancelled', 'blocked');
create type "public"."commercial_test_status_enum" as enum ('not_started', 'ready_for_test', 'testing', 'test_passed', 'test_failed', 'paused');
create type "public"."diagnostic_case_status_enum" as enum ('opened', 'triage', 'evidence_collection', 'root_cause_analysis', 'action_required', 'conclusion_ready', 'closed', 'rejected');
create type "public"."proposal_status_enum" as enum ('draft', 'media_validation', 'internal_review', 'approved_to_send', 'sent_to_client', 'client_feedback', 'won', 'lost', 'cancelled');
create type "public"."sales_scale_status_enum" as enum ('not_allowed', 'limited_sellable', 'proposal_selectable', 'scale_ready', 'scale_blocked', 'paused');
create type "public"."settlement_status_enum" as enum ('draft', 'reconciling', 'pending_review', 'exception_review', 'confirmed', 'invoiced', 'paid', 'blocked', 'cancelled');
create type "public"."severity_enum" as enum ('low', 'medium', 'high', 'critical');
create type "public"."technical_live_status_enum" as enum ('draft', 'pending_integration', 'in_integration', 'technical_review', 'technical_live_passed', 'technical_blocked', 'deprecated');
create type "public"."work_item_status_enum" as enum ('open', 'in_progress', 'waiting_external', 'blocked', 'done', 'cancelled');

-- PG_OS_APPLICATION_MANAGED sequences
create sequence if not exists "public"."app_research_task_no_seq" as bigint;
create sequence if not exists "public"."health_check_id_seq" as integer;
create sequence if not exists "public"."work_item_events_id_seq" as bigint;
create sequence if not exists "public"."work_item_links_id_seq" as bigint;

-- PG_OS_APPLICATION_MANAGED tables
create table "public"."activity_logs" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "actor_email" character varying(255),
  "actor_name" character varying(128),
  "action" character varying(128) not null,
  "target_type" character varying(128),
  "target_id" character varying(64),
  "summary" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."advertiser_bidding_monitor" (
  "id" uuid not null default gen_random_uuid(),
  "advertiser_id" uuid,
  "campaign_id" uuid,
  "monitor_type" character varying(32),
  "threshold_value" numeric(18,4),
  "current_value" numeric(18,4),
  "status" character varying(16) default 'active'::character varying,
  "alert_sent" boolean default false,
  "checked_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."advertiser_contacts" (
  "id" uuid not null default gen_random_uuid(),
  "advertiser_id" uuid not null,
  "name" text not null,
  "role_title" text,
  "email" text,
  "phone" text,
  "is_primary" boolean not null default false,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."advertiser_contracts" (
  "id" uuid not null default gen_random_uuid(),
  "advertiser_id" uuid,
  "contract_amount" numeric(18,2),
  "status" character varying(32) default 'draft'::character varying,
  "payment_terms" text,
  "start_date" date,
  "end_date" date,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "contract_name" character varying(255),
  "opportunity_id" character varying(36),
  "currency" character varying(8) default 'USD'::character varying,
  "payment_risk" character varying(32) default 'medium'::character varying,
  "finance_owner" character varying(128),
  "legal_owner" character varying(128),
  "sales_owner" character varying(128),
  "signed_date" date,
  "effective_date" date,
  "expiry_date" date,
  "workflow_state" character varying(64),
  "stage_entered_at" timestamp with time zone,
  "owner_user_id" character varying(36),
  "metadata" jsonb default '{}'::jsonb,
  "owner_team_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "blocked_reason" text,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."advertiser_followup_log" (
  "id" uuid not null default gen_random_uuid(),
  "advertiser_id" uuid,
  "contact_id" uuid,
  "followup_date" timestamp with time zone not null default now(),
  "followup_method" character varying(32),
  "summary" text,
  "client_feedback" text,
  "next_action" text,
  "next_followup_date" timestamp with time zone,
  "owner_id" character varying(36),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "topic" character varying(255),
  "client_sentiment" character varying(32)
);

create table "public"."advertiser_invoices" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "advertiser_id" character varying(36),
  "invoice_amount" numeric(14,2) default 0,
  "paid_amount" numeric(14,2) default 0,
  "currency" character varying(8) default 'RMB'::character varying,
  "status" character varying(32) default 'pending'::character varying,
  "due_date" date,
  "invoice_date" date,
  "invoice_file_url" text,
  "last_collection_at" timestamp with time zone,
  "contract_id" character varying(36),
  "order_id" character varying(36),
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "workflow_state" character varying(64),
  "owner_user_id" character varying(36),
  "billing_entity" character varying(255),
  "campaign_id" character varying(36),
  "client_entity" character varying(255),
  "finance_owner" character varying(128),
  "invoice_no" character varying(64),
  "invoice_type" character varying(32) default 'client_invoice'::character varying,
  "metadata" jsonb not null default '{}'::jsonb,
  "payment_terms" text,
  "sales_owner" character varying(128),
  "sent_at" timestamp with time zone,
  "tax_amount" numeric(14,2) default 0,
  "write_off_amount" numeric(14,2) default 0,
  "owner_team_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "blocked_reason" text,
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."advertiser_master" (
  "id" uuid not null default gen_random_uuid(),
  "company_name" character varying(255),
  "brand_name" character varying(255),
  "priority" character varying(32),
  "stage" character varying(64),
  "industry" character varying(128),
  "target_markets" jsonb default '[]'::jsonb,
  "owner_id" character varying(36),
  "next_followup_date" date,
  "status" character varying(32) default 'active'::character varying,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "advertiser_id" character varying(16),
  "company_name_en" character varying(255),
  "parent_group" character varying(255),
  "brands" text,
  "legal_entity" character varying(255),
  "website" character varying(512),
  "listing_status" character varying(32),
  "stock_code" character varying(32),
  "hq_location" character varying(64),
  "china_office" character varying(64),
  "sub_industry" character varying(128),
  "client_type" character varying(32),
  "business_model" text,
  "buy_dependency" character varying(16),
  "current_markets" text,
  "is_overseas" character varying(16),
  "is_china_entry" character varying(16),
  "key_countries" text,
  "target_audience" text,
  "localization_needs" text,
  "annual_marketing_budget" character varying(64),
  "annual_digital_budget" character varying(64),
  "annual_programmatic_budget" character varying(64),
  "monthly_budget_range" character varying(64),
  "budget_status" character varying(32),
  "budget_cycle" character varying(32),
  "key_campaign_dates" text,
  "budget_source" character varying(64),
  "uses_programmatic" character varying(16),
  "procurement_method" text,
  "dsps_used" text,
  "mmp_used" text,
  "agencies_used" text,
  "accepts_pmp" character varying(16),
  "accepts_pd" character varying(16),
  "fit_pg_dsp" character varying(16),
  "fit_pg_china_media" character varying(16),
  "fit_overseas" character varying(16),
  "fit_ctv" character varying(16),
  "fit_oem" character varying(16),
  "fit_dooh" character varying(16),
  "fit_origin_ivt" character varying(16),
  "marketing_goals" text,
  "main_kpis" text,
  "kpi_range" text,
  "preferred_ad_formats" text,
  "excluded_ad_formats" text,
  "brand_safety" text,
  "pain_points" text,
  "potential_score" numeric(5,2),
  "win_probability" character varying(16),
  "expected_annual_revenue" character varying(64),
  "expected_margin" character varying(16),
  "primary_contact" character varying(128),
  "decision_maker" character varying(128),
  "co_owners" text,
  "source_channel" character varying(64),
  "first_contact_date" timestamp with time zone,
  "last_followup_date" timestamp with time zone,
  "next_action" text,
  "current_blockers" text,
  "contract_status" character varying(32),
  "is_key_account" boolean default false,
  "auto_monitor_bidding" boolean default false,
  "payment_risk" character varying(16),
  "created_by" character varying(36),
  "updated_by" character varying(36),
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "workflow_state" character varying(64),
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "blocked_reason" text,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying,
  "lifecycle_stage" character varying(64),
  "lifecycle_stage_source" character varying(32) default 'mapped_from_stage'::character varying,
  "lifecycle_notes" text,
  "metadata" jsonb default '{}'::jsonb
);

create table "public"."advertiser_opportunities" (
  "id" uuid not null default gen_random_uuid(),
  "advertiser_id" uuid,
  "title" character varying(255),
  "stage" character varying(64) not null,
  "estimated_value" numeric(18,2),
  "win_probability" numeric(5,2),
  "sales_owner" uuid,
  "next_followup_date" date,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "opportunity_name" character varying(255),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "workflow_state" character varying(64),
  "stage_entered_at" timestamp with time zone,
  "currency" character varying(8) default 'USD'::character varying,
  "target_market" character varying(128),
  "budget_confirmed" character varying(32),
  "delivery_feasibility_confirmed" character varying(32) default false,
  "decision_maker_confirmed" character varying(32) default false,
  "metadata" jsonb default '{}'::jsonb,
  "blocked_reason" text,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying,
  "owner_id" uuid,
  "next_action" text
);

create table "public"."advertiser_performance" (
  "id" uuid not null default gen_random_uuid(),
  "advertiser_id" uuid,
  "date" date,
  "campaign_demand_id" uuid,
  "adops_owner" uuid,
  "impressions" bigint default 0,
  "clicks" bigint default 0,
  "spend" numeric(18,2) default 0,
  "revenue" numeric(18,2) default 0,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36)
);

create table "public"."advertiser_receivables" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "advertiser_id" character varying(36),
  "invoice_id" character varying(36),
  "amount" numeric(14,2) default 0,
  "outstanding_amount" numeric(14,2) default 0,
  "currency" character varying(8) default 'RMB'::character varying,
  "status" character varying(32) default 'pending'::character varying,
  "aging_bucket" character varying(32),
  "due_date" date,
  "reminder_count" integer default 0,
  "last_reminder_at" timestamp with time zone,
  "notes" text,
  "order_id" character varying(36),
  "contract_id" character varying(36),
  "campaign_id" character varying(36),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "workflow_state" character varying(64),
  "owner_user_id" character varying(36),
  "collection_owner" character varying(128),
  "metadata" jsonb not null default '{}'::jsonb,
  "next_action" text,
  "receivable_no" character varying(64),
  "received_amount" numeric(14,2) default 0,
  "received_at" timestamp with time zone,
  "risk_level" character varying(16) default 'low'::character varying,
  "sales_owner" character varying(128),
  "owner_team_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "blocked_reason" text,
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."advertiser_strategy" (
  "id" uuid not null default gen_random_uuid(),
  "advertiser_id" uuid,
  "strategy_name" character varying(255),
  "strategy_type" character varying(32),
  "status" character varying(16) default 'draft'::character varying,
  "priority" character varying(8),
  "estimated_value" numeric(18,2),
  "action_plan" text,
  "owner_id" character varying(36),
  "review_date" date,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36)
);

create table "public"."advertisers" (
  "id" uuid not null default gen_random_uuid(),
  "name" text not null,
  "industry" text,
  "region" text,
  "owner_user_id" uuid,
  "status" text not null default 'active'::text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."api_comparison_results" (
  "id" uuid not null default gen_random_uuid(),
  "capture_id" uuid not null,
  "endpoint_id" uuid not null,
  "media_id" uuid,
  "field_path" character varying(255) not null,
  "field_name" character varying(128) not null,
  "result" character varying(16) not null,
  "severity" character varying(16) default 'error'::character varying,
  "expected_value" text,
  "actual_value" text,
  "error_message" text,
  "is_required" boolean default false,
  "checked_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."api_comparison_runs" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "endpoint_id" uuid,
  "capture_id" uuid,
  "run_name" character varying(255),
  "total_fields" integer default 0,
  "passed" integer default 0,
  "failed" integer default 0,
  "warnings" integer default 0,
  "missing" integer default 0,
  "overall_result" character varying(16),
  "ran_by" uuid,
  "ran_at" timestamp with time zone not null default now(),
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."api_doc_endpoints" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "endpoint_name" character varying(128) not null,
  "endpoint_type" character varying(16) not null,
  "protocol" character varying(32) default 'OpenRTB'::character varying,
  "version" character varying(16),
  "doc_source" character varying(255),
  "description" text,
  "status" character varying(16) default 'active'::character varying,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."api_doc_fields" (
  "id" uuid not null default gen_random_uuid(),
  "endpoint_id" uuid not null,
  "field_path" character varying(255) not null,
  "field_name" character varying(128) not null,
  "parent_field" character varying(128),
  "field_type" character varying(32) not null,
  "is_required" boolean default false,
  "expected_values" text,
  "min_value" numeric,
  "max_value" numeric,
  "min_length" integer,
  "max_length" integer,
  "regex_pattern" character varying(255),
  "description" text,
  "example_value" text,
  "sort_order" integer default 0,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."api_traffic_captures" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "endpoint_id" uuid,
  "capture_name" character varying(255),
  "direction" character varying(8) not null,
  "raw_payload" jsonb not null,
  "captured_at" timestamp with time zone default now(),
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."app_profile_raw" (
  "id" uuid not null default gen_random_uuid(),
  "task_id" uuid not null,
  "app_name" character varying(256),
  "android_package" character varying(256),
  "ios_bundle_id" character varying(256),
  "developer_name" character varying(256),
  "company_entity" character varying(256),
  "category" character varying(64),
  "version" character varying(32),
  "last_updated" date,
  "rating" numeric(3,1),
  "reviews_count" character varying(32),
  "downloads" character varying(32),
  "listed_markets" jsonb default '[]'::jsonb,
  "privacy_policy_url" text,
  "official_website" text,
  "store_links" jsonb default '{}'::jsonb,
  "screenshots" jsonb default '[]'::jsonb,
  "source_summary" jsonb default '{}'::jsonb,
  "raw_json" jsonb,
  "collected_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."app_research_tasks" (
  "id" uuid not null default gen_random_uuid(),
  "task_no" character varying(32) not null,
  "app_name" character varying(256),
  "android_package" character varying(256),
  "ios_bundle_id" character varying(256),
  "developer_name" character varying(256),
  "source_channel" character varying(32) default 'manual'::character varying,
  "media_lead_id" uuid,
  "status" character varying(16) not null default 'pending'::character varying,
  "assigned_to" uuid,
  "openclaw_run_id" character varying(64),
  "confidence" character varying(8),
  "risk_tags" jsonb default '[]'::jsonb,
  "score" numeric(5,2),
  "conclusion_notes" text,
  "collected_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."app_source_checks" (
  "id" uuid not null default gen_random_uuid(),
  "task_id" uuid not null,
  "source" character varying(32) not null,
  "found" boolean default false,
  "app_name" character varying(256),
  "package_name" character varying(256),
  "developer" character varying(256),
  "version" character varying(32),
  "last_updated" date,
  "rating" numeric(3,1),
  "downloads" character varying(32),
  "url" text,
  "screenshot" text,
  "raw_data" jsonb,
  "checked_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."approval_requests" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "approval_type" character varying(64) default 'general'::character varying,
  "title" character varying(255) not null,
  "status" character varying(32) default 'pending'::character varying,
  "requester_id" character varying(128),
  "requester_email" character varying(255),
  "approver_role" character varying(64),
  "approver_id" character varying(128),
  "target_table" character varying(128),
  "target_id" character varying(64),
  "risk_level" character varying(16) default 'medium'::character varying,
  "amount" numeric(14,2),
  "currency" character varying(8),
  "reason" text,
  "decision_notes" text,
  "decided_by" character varying(255),
  "decided_at" timestamp with time zone,
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "requester_user_id" character varying(36),
  "approver_user_id" character varying(36),
  "escalation_level" character varying(16) default 'none'::character varying,
  "dedupe_key" character varying(255),
  "source_hash" character varying(128),
  "blocked_reason" text,
  "last_touch_at" timestamp with time zone,
  "next_action_owner_id" character varying(36),
  "organization_id" character varying(64) not null default 'pg-china'::character varying,
  "owner_team_id" character varying(36),
  "owner_user_id" character varying(36),
  "sla_due_at" timestamp with time zone,
  "stage_entered_at" timestamp with time zone
);

create table "public"."approvals" (
  "id" uuid not null default gen_random_uuid(),
  "object_type" text not null,
  "object_id" uuid not null,
  "action_code" text not null,
  "requested_by" uuid,
  "approver_role" text,
  "approver_user_id" uuid,
  "status" approval_status_enum not null default 'pending'::approval_status_enum,
  "decision_note" text,
  "decided_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."assessment_dimensions" (
  "id" uuid not null default gen_random_uuid(),
  "model_id" uuid not null,
  "dim_key" character varying(64) not null,
  "dim_name" character varying(128) not null,
  "dim_name_en" character varying(128),
  "max_score" numeric(5,2) not null,
  "sort_order" integer default 0,
  "description" text,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."assessment_evaluations" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid not null,
  "model_id" uuid not null,
  "input_doc_id" uuid,
  "evaluation_version" integer default 1,
  "status" character varying(16) default 'draft'::character varying,
  "total_score" numeric(5,2),
  "grade" character varying(4),
  "confidence_score" numeric(5,2),
  "confidence_level" character varying(16),
  "risk_level" character varying(16),
  "recommended_action" character varying(32),
  "pilot_qps" integer default 0,
  "required_remediation" jsonb default '[]'::jsonb,
  "dimension_scores" jsonb default '{}'::jsonb,
  "red_flags" jsonb default '{}'::jsonb,
  "details" jsonb default '{}'::jsonb,
  "penalty" numeric(5,2) default 0,
  "conclusion_notes" text,
  "evaluated_by" uuid,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."assessment_input_documents" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid not null,
  "model_id" uuid not null,
  "version" integer default 1,
  "status" character varying(16) default 'draft'::character varying,
  "data" jsonb default '{}'::jsonb,
  "data_completeness" numeric(5,2),
  "submitted_by" uuid,
  "locked_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."assessment_models" (
  "id" uuid not null default gen_random_uuid(),
  "model_key" character varying(64) not null,
  "model_name" character varying(128) not null,
  "model_name_en" character varying(128),
  "media_type" character varying(32) not null,
  "assessment_phase" character varying(32) not null,
  "version" character varying(16) default '1.0'::character varying,
  "description" text,
  "total_max_score" numeric(5,2) default 100,
  "is_active" boolean default true,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."assessment_redlines" (
  "id" uuid not null default gen_random_uuid(),
  "model_id" uuid not null,
  "redline_key" character varying(64) not null,
  "redline_name" character varying(128) not null,
  "redline_type" character varying(16) not null,
  "condition_config" jsonb not null,
  "description" text,
  "sort_order" integer default 0,
  "is_active" boolean default true,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."assessment_rules" (
  "id" uuid not null default gen_random_uuid(),
  "dimension_id" uuid not null,
  "rule_key" character varying(64) not null,
  "rule_name" character varying(128) not null,
  "rule_name_zh" character varying(128) not null,
  "scoring_type" character varying(32) not null,
  "scoring_config" jsonb default '{}'::jsonb,
  "max_score" numeric(5,2) not null,
  "weight_in_dimension" numeric(5,2) default 100,
  "data_source" character varying(256),
  "sort_order" integer default 0,
  "is_active" boolean default true,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."attachments" (
  "id" uuid not null default gen_random_uuid(),
  "object_type" text not null,
  "object_id" uuid not null,
  "file_name" text not null,
  "file_url" text not null,
  "mime_type" text,
  "uploaded_by" uuid,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."audit_logs" (
  "id" uuid not null default gen_random_uuid(),
  "actor_user_id" uuid,
  "action" text not null,
  "object_type" text not null,
  "object_id" uuid,
  "before_data" jsonb,
  "after_data" jsonb,
  "trace_id" text,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."auto_research_inbox" (
  "id" uuid not null default gen_random_uuid(),
  "event_type" character varying(64) not null,
  "source" character varying(32) default 'openclaw'::character varying,
  "source_run_id" character varying(64),
  "review_required" boolean default true,
  "task_id" uuid,
  "media_lead_id" uuid,
  "app_profile_id" uuid,
  "status" character varying(16) not null default 'pending_review'::character varying,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "review_notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."automation_inbox" (
  "id" uuid not null default gen_random_uuid(),
  "source" character varying(32) not null,
  "event_type" character varying(64) not null,
  "title" character varying(255) not null,
  "summary" text,
  "raw_payload" jsonb not null default '{}'::jsonb,
  "status" character varying(32) not null default 'pending_review'::character varying,
  "confidence" numeric(5,2),
  "advertiser_id" uuid,
  "media_id" uuid,
  "owner_id" uuid,
  "reviewed_by" character varying(255),
  "reviewed_at" timestamp with time zone,
  "review_notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36)
);

create table "public"."business_handoffs" (
  "id" text not null,
  "source_table" text,
  "source_id" text,
  "from_role" text,
  "to_role" text,
  "to_user_id" text,
  "status" text default 'pending'::text,
  "created_at" timestamp with time zone default now(),
  "completed_at" timestamp with time zone
);

create table "public"."business_object_timeline" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "source_table" character varying(128) not null,
  "source_id" character varying(64) not null,
  "event_type" character varying(128) not null,
  "event_title" character varying(255) not null,
  "previous_state" character varying(64),
  "next_state" character varying(64),
  "actor_email" character varying(255),
  "actor_user_id" character varying(36),
  "owner_user_id" character varying(36),
  "next_action" text,
  "next_action_owner_id" character varying(36),
  "due_at" timestamp with time zone,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "related_table" character varying(128),
  "related_id" character varying(64)
);

create table "public"."business_orders" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "order_no" character varying(64),
  "order_name" character varying(255),
  "order_type" character varying(32) default 'advertiser_io'::character varying,
  "advertiser_id" character varying(36),
  "media_id" character varying(36),
  "contract_id" character varying(36),
  "campaign_id" character varying(36),
  "settlement_id" character varying(36),
  "status" character varying(32) default 'draft'::character varying,
  "workflow_state" character varying(64),
  "currency" character varying(8) default 'USD'::character varying,
  "order_amount" numeric(14,2) default 0,
  "expected_revenue" numeric(14,2) default 0,
  "expected_cost" numeric(14,2) default 0,
  "expected_margin" numeric(14,2) default 0,
  "payment_terms" text,
  "reconciliation_cycle" character varying(32),
  "discrepancy_threshold" numeric(8,6) default 0.05,
  "finance_owner" character varying(128),
  "sales_owner" character varying(128),
  "media_owner" character varying(128),
  "start_date" date,
  "end_date" date,
  "signed_at" timestamp with time zone,
  "next_action" text,
  "owner_id" character varying(128),
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "owner_user_id" character varying(36),
  "stage_entered_at" timestamp with time zone,
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "blocked_reason" text,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."business_side_effect_outbox" (
  "id" text not null,
  "event_type" text,
  "entity_table" text,
  "entity_id" text,
  "payload" jsonb,
  "status" text default 'pending'::text,
  "created_at" timestamp with time zone default now()
);

create table "public"."campaign_creatives" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "campaign_execution_id" character varying(36) not null,
  "campaign_id" character varying(36),
  "creative_name" character varying(255),
  "creative_type" character varying(64),
  "spec_id" character varying(64),
  "landing_url" text,
  "asset_url" text,
  "review_status" character varying(32) default 'pending'::character varying,
  "brand_safety_status" character varying(32) default 'pending'::character varying,
  "approved_by" character varying(255),
  "approved_at" timestamp with time zone,
  "rejection_reason" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "owner_user_id" character varying(36)
);

create table "public"."campaign_daily_reports" (
  "id" uuid not null default gen_random_uuid(),
  "report_date" date not null,
  "summary" jsonb not null default '{}'::jsonb,
  "rows" jsonb not null default '[]'::jsonb,
  "issues" jsonb not null default '[]'::jsonb,
  "created_by" text,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."campaign_delivery_daily" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "report_date" date not null,
  "campaign_execution_id" character varying(36),
  "campaign_id" character varying(36),
  "line_item_id" character varying(36),
  "media_id" character varying(36),
  "currency" character varying(8) default 'USD'::character varying,
  "spend" numeric(14,2) default 0,
  "revenue" numeric(14,2) default 0,
  "media_cost" numeric(14,2) default 0,
  "impressions" numeric(18,2) default 0,
  "clicks" numeric(18,2) default 0,
  "conversions" numeric(18,2) default 0,
  "requests" numeric(18,2) default 0,
  "bids" numeric(18,2) default 0,
  "wins" numeric(18,2) default 0,
  "ivt_impressions" numeric(18,2) default 0,
  "ctr" numeric(10,6) default 0,
  "cvr" numeric(10,6) default 0,
  "ivt_rate" numeric(10,6) default 0,
  "gross_margin" numeric(14,2) default 0,
  "pacing_rate" numeric(10,6) default 0,
  "data_source" character varying(64) default 'manual'::character varying,
  "reconciliation_status" character varying(32) default 'pending'::character varying,
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "owner_user_id" character varying(36)
);

create table "public"."campaign_demands" (
  "id" uuid not null default gen_random_uuid(),
  "advertiser_id" uuid,
  "title" character varying(255),
  "status" character varying(32) default 'brief'::character varying,
  "budget" numeric(18,2),
  "ad_format" character varying(64),
  "target_market" character varying(64),
  "start_date" date,
  "end_date" date,
  "sales_owner" character varying(36),
  "adops_owner" character varying(36),
  "brief_complete" boolean default false,
  "kpi_confirmed" boolean default false,
  "inventory_matched" boolean default false,
  "gate_status" text default 'not_checked'::text,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "campaign_name" character varying(255),
  "campaign_id" character varying(36),
  "billing_type" character varying(32) default 'cpm'::character varying,
  "currency" character varying(8) default 'USD'::character varying,
  "kpi_type" character varying(64),
  "kpi_value" numeric(18,2),
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "workflow_state" character varying(64),
  "metadata" jsonb default '{}'::jsonb,
  "blocked_reason" text,
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."campaign_executions" (
  "id" uuid not null default gen_random_uuid(),
  "campaign_demand_id" uuid,
  "exec_phase" character varying(32) default 'planning'::character varying,
  "actual_start_date" date,
  "actual_end_date" date,
  "daily_budget" numeric(18,2),
  "total_spend" numeric(18,2),
  "total_impressions" bigint default 0,
  "total_clicks" bigint default 0,
  "status" character varying(16) default 'draft'::character varying,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "campaign_execution_id" character varying(64),
  "execution_name" character varying(255),
  "contract_id" character varying(36),
  "order_id" character varying(36),
  "flight_count" integer default 0,
  "line_item_count" integer default 0,
  "creative_count" integer default 0,
  "tracking_check_status" character varying(32) default 'pending'::character varying,
  "launch_gate_status" character varying(32) default 'pending'::character varying,
  "pacing_status" character varying(32) default 'not_started'::character varying,
  "owner_role" character varying(64) default 'ad_ops'::character varying,
  "workflow_state" character varying(64),
  "owner_user_id" character varying(36),
  "metadata" jsonb default '{}'::jsonb,
  "campaign_id" character varying(36),
  "owner_team_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "blocked_reason" text,
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."campaign_flights" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "campaign_execution_id" character varying(36) not null,
  "campaign_id" character varying(36),
  "flight_name" character varying(255),
  "status" character varying(32) default 'planning'::character varying,
  "start_date" date,
  "end_date" date,
  "daily_budget" numeric(14,2) default 0,
  "total_budget" numeric(14,2) default 0,
  "pacing_mode" character varying(32) default 'even'::character varying,
  "timezone" character varying(64) default 'Asia/Shanghai'::character varying,
  "owner_id" character varying(128),
  "notes" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36)
);

create table "public"."campaign_launch_checks" (
  "id" uuid not null default gen_random_uuid(),
  "campaign_id" uuid not null,
  "publisher_id" uuid not null,
  "check_item" text not null,
  "status" text not null default 'pending'::text,
  "passed" boolean,
  "notes" text,
  "checked_by" uuid,
  "checked_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."campaign_line_items" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "campaign_execution_id" character varying(36) not null,
  "flight_id" character varying(36),
  "campaign_id" character varying(36),
  "media_id" character varying(36),
  "inventory_id" character varying(36),
  "package_id" character varying(36),
  "line_item_name" character varying(255),
  "status" character varying(32) default 'draft'::character varying,
  "ad_format" character varying(64),
  "geo" text,
  "device_type" character varying(64),
  "buy_type" character varying(64),
  "billing_method" character varying(32),
  "unit_price" numeric(14,4) default 0,
  "budget" numeric(14,2) default 0,
  "impression_goal" numeric(18,2) default 0,
  "click_goal" numeric(18,2) default 0,
  "expected_margin" numeric(8,4) default 0,
  "floor_price" numeric(14,4) default 0,
  "notes" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "owner_user_id" character varying(36)
);

create table "public"."campaign_media_allocations" (
  "id" uuid not null default gen_random_uuid(),
  "campaign_id" uuid not null,
  "publisher_id" uuid not null,
  "ad_slot_id" uuid,
  "allocation_budget" numeric(14,2),
  "currency" text default 'CNY'::text,
  "guard_status" text not null default 'pending'::text,
  "guard_reason" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."campaign_reviews" (
  "id" text not null,
  "campaign_id" text,
  "reviewer_id" text,
  "review_type" text,
  "status" text default 'pending'::text,
  "decision" text,
  "comments" text,
  "created_at" timestamp with time zone default now(),
  "decided_at" timestamp with time zone
);

create table "public"."campaign_tracking_checks" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "campaign_execution_id" character varying(36) not null,
  "campaign_id" character varying(36),
  "tracking_name" character varying(255),
  "platform" character varying(64),
  "tracking_url" text,
  "event_name" character varying(128),
  "status" character varying(32) default 'pending'::character varying,
  "test_result" jsonb not null default '{}'::jsonb,
  "checked_by" character varying(255),
  "checked_at" timestamp with time zone,
  "notes" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "owner_user_id" character varying(36)
);

create table "public"."campaigns" (
  "id" uuid not null default gen_random_uuid(),
  "proposal_id" uuid,
  "advertiser_id" uuid not null,
  "name" text not null,
  "owner_user_id" uuid,
  "status" campaign_status_enum not null default 'draft'::campaign_status_enum,
  "start_date" date,
  "end_date" date,
  "budget" numeric(14,2),
  "currency" text default 'CNY'::text,
  "launch_check" jsonb not null default '{}'::jsonb,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."capability_tags" (
  "code" text not null,
  "name" text not null,
  "description" text
);

create table "public"."channel_technical_profiles" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "media_id" character varying(64),
  "asset_id" character varying(64),
  "inventory_id" character varying(64),
  "channel_type" character varying(32) not null,
  "integration_type" character varying(64),
  "openrtb_version" character varying(32),
  "openrtb_endpoint" text,
  "seat_id" character varying(128),
  "deal_id" character varying(128),
  "schain_node" jsonb not null default '{}'::jsonb,
  "vast_version" character varying(32),
  "vast_tag_url" text,
  "linearity" character varying(32),
  "ad_pod_supported" boolean default false,
  "skippable_supported" boolean default false,
  "sdk_platform" character varying(32),
  "sdk_version" character varying(64),
  "package_name" character varying(255),
  "app_store_url" text,
  "ctv_platform" character varying(64),
  "ctv_app_store_id" character varying(128),
  "ad_break_type" character varying(64),
  "tag_id" character varying(128),
  "gpid" character varying(128),
  "dooh_screen_network" character varying(255),
  "dooh_location" text,
  "screen_count" integer,
  "proof_of_play_supported" boolean default false,
  "loop_duration_seconds" integer,
  "slot_duration_seconds" integer,
  "audience_estimate" numeric(18,2),
  "geo" character varying(128),
  "verification_status" character varying(32) default 'draft'::character varying,
  "owner_id" character varying(128),
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36)
);

create table "public"."checklist_templates" (
  "id" uuid not null default gen_random_uuid(),
  "media_type" character varying(16) not null,
  "stage_key" character varying(32) not null,
  "check_key" character varying(64) not null,
  "label_zh" text not null,
  "label_en" text,
  "is_mandatory" boolean not null default true,
  "sort_order" integer not null default 0,
  "is_active" boolean not null default true,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."comments" (
  "id" uuid not null default gen_random_uuid(),
  "object_type" text not null,
  "object_id" uuid not null,
  "body" text not null,
  "created_by" uuid,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."commercial_proposals" (
  "id" text not null,
  "proposal_number" text,
  "advertiser_id" text,
  "opportunity_id" text,
  "total_amount" numeric(18,2),
  "currency" text,
  "status" text default 'draft'::text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone
);

create table "public"."commercial_tests" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "test_name" text not null,
  "owner_user_id" uuid,
  "status" commercial_test_status_enum not null default 'ready_for_test'::commercial_test_status_enum,
  "start_date" date,
  "end_date" date,
  "target_budget" numeric(14,2),
  "currency" text default 'CNY'::text,
  "result_summary" text,
  "metrics" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "owner_role" text,
  "test_plan" jsonb not null default '{}'::jsonb,
  "next_action" text,
  "reviewed_at" timestamp with time zone
);

create table "public"."contracts" (
  "id" uuid not null default gen_random_uuid(),
  "object_type" text not null,
  "object_id" uuid,
  "contract_name" text not null,
  "counterparty" text,
  "owner_user_id" uuid,
  "status" text not null default 'draft'::text,
  "effective_date" date,
  "expiry_date" date,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."data_quality_checks" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "check_key" character varying(128) not null,
  "business_center" character varying(64) not null,
  "target_table" character varying(128),
  "target_id" character varying(64),
  "status" character varying(32) default 'pending'::character varying,
  "severity" character varying(16) default 'P2'::character varying,
  "missing_required_fields" text,
  "failed_rule" text,
  "owner_role" character varying(64),
  "owner_user_id" character varying(36),
  "due_at" timestamp with time zone,
  "resolved_at" timestamp with time zone,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone
);

create table "public"."data_reconciliation_results" (
  "id" uuid not null default gen_random_uuid(),
  "session_id" uuid not null,
  "onboarding_id" uuid not null,
  "metric_key" character varying(32) not null,
  "metric_label_zh" character varying(64) not null,
  "pg_total" bigint not null default 0,
  "partner_total" bigint not null default 0,
  "absolute_diff" bigint not null default 0,
  "diff_pct" numeric(8,4),
  "tolerance_pct" numeric(8,4),
  "within_tolerance" boolean,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."evaluation_scoring_rules" (
  "id" uuid not null default gen_random_uuid(),
  "rule_name" character varying(128) not null,
  "dimension" character varying(32) not null,
  "sub_item_key" character varying(64) not null,
  "sub_item_label_zh" text not null,
  "sub_item_label_en" text,
  "data_source" character varying(128),
  "data_type" character varying(16) default 'number'::character varying,
  "scoring_type" character varying(16) default 'threshold'::character varying,
  "scoring_config" jsonb default '{}'::jsonb,
  "max_score" numeric(5,2) not null,
  "weight_pct" numeric(5,2) default 100,
  "dimension_weight" numeric(5,2),
  "sort_order" integer default 0,
  "is_active" boolean default true,
  "created_by" uuid,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."field_access_policies" (
  "id" uuid not null default gen_random_uuid(),
  "resource" character varying(128) not null,
  "field_name" character varying(128) not null,
  "allowed_roles" jsonb not null default '["admin", "ceo"]'::jsonb,
  "mask_mode" character varying(16) not null default 'masked'::character varying,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."files" (
  "id" text not null,
  "filename" text,
  "storage_path" text,
  "bucket" text,
  "mime_type" text,
  "size_bytes" bigint,
  "scan_status" text default 'pending'::text,
  "uploaded_by" text,
  "created_at" timestamp with time zone default now()
);

create table "public"."finance_business_chain_snapshots" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "chain_key" character varying(128) not null,
  "advertiser_id" character varying(36),
  "opportunity_id" character varying(36),
  "contract_id" character varying(36),
  "order_id" character varying(36),
  "campaign_id" character varying(36),
  "campaign_execution_id" character varying(36),
  "invoice_id" character varying(36),
  "receivable_id" character varying(36),
  "collection_status" character varying(32),
  "media_id" character varying(36),
  "settlement_id" character varying(36),
  "payable_id" character varying(36),
  "revenue_amount" numeric(18,2) default 0,
  "cost_amount" numeric(18,2) default 0,
  "gross_margin_amount" numeric(18,2) default 0,
  "gross_margin_rate" numeric(10,6) default 0,
  "ar_overdue_amount" numeric(18,2) default 0,
  "ap_outstanding_amount" numeric(18,2) default 0,
  "reconciliation_discrepancy_rate" numeric(10,6) default 0,
  "risk_level" character varying(16) default 'low'::character varying,
  "next_action" text,
  "owner_role" character varying(64),
  "generated_at" timestamp with time zone not null default now(),
  "metadata" jsonb not null default '{}'::jsonb,
  "owner_user_id" character varying(36)
);

create table "public"."finance_exceptions" (
  "id" uuid not null default gen_random_uuid(),
  "settlement_id" uuid,
  "exception_type" text not null,
  "description" text not null,
  "severity" severity_enum not null default 'medium'::severity_enum,
  "status" text not null default 'open'::text,
  "assigned_to" uuid,
  "resolved_by" uuid,
  "resolved_at" timestamp with time zone,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."finance_ledger_entries" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "entry_no" character varying(64),
  "period" character varying(16),
  "direction" character varying(16) not null,
  "entry_type" character varying(64) not null,
  "related_table" character varying(128),
  "related_id" character varying(64),
  "advertiser_id" character varying(36),
  "media_id" character varying(36),
  "contract_id" character varying(36),
  "campaign_id" character varying(36),
  "settlement_id" character varying(36),
  "invoice_id" character varying(36),
  "receivable_id" character varying(36),
  "payable_id" character varying(36),
  "payment_id" character varying(36),
  "currency" character varying(8) default 'USD'::character varying,
  "debit_amount" numeric(14,2) default 0,
  "credit_amount" numeric(14,2) default 0,
  "balance_amount" numeric(14,2) default 0,
  "status" character varying(32) default 'posted'::character varying,
  "posted_by" character varying(255),
  "posted_at" timestamp with time zone default now(),
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "owner_user_id" character varying(36)
);

create table "public"."finance_reconciliation_items" (
  "id" uuid not null default gen_random_uuid(),
  "period" text not null,
  "risk_level" text not null default 'low'::text,
  "totals" jsonb not null default '{}'::jsonb,
  "actions" jsonb not null default '[]'::jsonb,
  "status" text not null default 'pending_review'::text,
  "reviewer" text,
  "review_notes" text,
  "created_by" text,
  "created_at" timestamp with time zone not null default now(),
  "reviewed_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "settlement_id" character varying(36),
  "metadata" jsonb default '{}'::jsonb
);

create table "public"."governance_rule_source_registry" (
  "id" text not null,
  "rule_key" text,
  "source" text,
  "checksum" text,
  "applied_at" timestamp with time zone default now()
);

create table "public"."health_check" (
  "id" integer not null default nextval('health_check_id_seq'::regclass),
  "updated_at" timestamp with time zone default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."integration_check_results" (
  "id" uuid not null default gen_random_uuid(),
  "integration_project_id" uuid not null,
  "item_code" text not null,
  "status" text not null default 'not_started'::text,
  "owner_role" text not null,
  "responsible_party" text,
  "due_date" date,
  "evidence_reference" text,
  "blocker" text,
  "waiver_reason" text,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."integration_checklists" (
  "id" uuid not null default gen_random_uuid(),
  "integration_project_id" uuid not null,
  "step_name" text not null,
  "step_order" integer not null default 0,
  "is_completed" boolean not null default false,
  "completed_by" uuid,
  "completed_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."integration_project_profiles" (
  "id" uuid not null default gen_random_uuid(),
  "integration_project_id" uuid not null,
  "platform" text not null default 'android'::text,
  "property_identifier" text not null,
  "playbook_codes" text[] not null default '{}'::text[],
  "min_sdk" integer,
  "target_sdk" integer,
  "compile_sdk" integer,
  "agp_version" text,
  "gradle_version" text,
  "language" text,
  "process_model" text,
  "media_engineering_contact" text not null,
  "planned_formats" text[] not null default '{}'::text[],
  "privacy_profile" jsonb not null default '{}'::jsonb,
  "target_pilot_date" date,
  "secret_reference" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."integration_projects" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "integration_type" text not null,
  "owner_user_id" uuid,
  "status" technical_live_status_enum not null default 'pending_integration'::technical_live_status_enum,
  "go_live_date" date,
  "notes" text,
  "checklist" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "evidence" jsonb not null default '[]'::jsonb,
  "blocker" text,
  "next_action" text,
  "readiness_reviewed_at" timestamp with time zone,
  "handoff_status" text not null default 'draft'::text,
  "handoff_package" jsonb not null default '{}'::jsonb,
  "handoff_submitted_at" timestamp with time zone,
  "handoff_submitted_by" uuid,
  "handoff_accepted_at" timestamp with time zone,
  "handoff_accepted_by" uuid,
  "handoff_feedback" text
);

create table "public"."invoices" (
  "id" uuid not null default gen_random_uuid(),
  "settlement_id" uuid,
  "invoice_no" text,
  "amount" numeric(14,4),
  "currency" text default 'CNY'::text,
  "status" text not null default 'draft'::text,
  "issued_at" date,
  "paid_at" date,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."issue_logs" (
  "id" uuid not null default gen_random_uuid(),
  "related_type" character varying(64),
  "related_id" uuid,
  "severity" character varying(8) default 'P2'::character varying,
  "status" character varying(32) default 'open'::character varying,
  "type" character varying(64),
  "title" character varying(255),
  "description" text,
  "assignee" uuid,
  "notes" text,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "owner_id" character varying(36),
  "sla_due_at" timestamp with time zone,
  "resolution" text,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "stage_entered_at" timestamp with time zone,
  "related_media_id" character varying(36),
  "related_advertiser_id" character varying(36),
  "related_campaign_id" character varying(36),
  "root_cause" text,
  "closed_at" timestamp with time zone,
  "impact_amount" numeric(18,2),
  "risk_level" character varying(32),
  "blocked_reason" text,
  "last_touch_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."job_runs" (
  "id" text not null,
  "job_type" text,
  "status" text,
  "started_at" timestamp with time zone,
  "finished_at" timestamp with time zone,
  "payload" jsonb,
  "result" jsonb,
  "created_at" timestamp with time zone default now()
);

create table "public"."kpi_snapshots" (
  "id" uuid not null default gen_random_uuid(),
  "period" text not null,
  "role_scope" text not null,
  "metric_key" text not null,
  "metric_name" text not null,
  "actual_value" numeric(18,4) not null default 0,
  "target_value" numeric(18,4) not null default 0,
  "unit" text,
  "weight" numeric(8,4) not null default 1,
  "score" numeric(8,4) not null default 0,
  "status" text not null default 'on_track'::text,
  "source" text not null default 'auto_calculated'::text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."kpi_targets" (
  "id" uuid not null default gen_random_uuid(),
  "member_id" uuid,
  "period" character varying(32) not null,
  "kpi_name" character varying(255) not null,
  "kpi_category" character varying(32),
  "target_value" numeric(18,2),
  "actual_value" numeric(18,2),
  "unit" character varying(32),
  "weight" numeric(5,2),
  "status" character varying(16) default 'pending'::character varying,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."live_test_hourly_logs" (
  "id" uuid not null default gen_random_uuid(),
  "session_id" uuid not null,
  "hour_offset" integer not null,
  "time_bucket" timestamp with time zone not null,
  "requests_pg" integer not null default 0,
  "qps_pg" numeric(6,2),
  "bids_pg" integer not null default 0,
  "no_bids_pg" integer not null default 0,
  "wins_pg" integer not null default 0,
  "impressions_pg" integer not null default 0,
  "clicks_pg" integer not null default 0,
  "errors_pg" integer not null default 0,
  "requests_partner" integer,
  "bids_partner" integer,
  "impressions_partner" integer,
  "clicks_partner" integer,
  "errors_partner" integer,
  "ivt_flagged_requests" integer default 0,
  "ivt_anomaly_type" character varying(64),
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "metadata" jsonb default '{}'::jsonb
);

create table "public"."live_test_sessions" (
  "id" uuid not null default gen_random_uuid(),
  "onboarding_id" uuid not null,
  "media_type" character varying(16) not null,
  "test_name" character varying(255),
  "test_start" timestamp with time zone not null,
  "test_end" timestamp with time zone not null,
  "target_qps" numeric(6,2) default 5.00,
  "actual_avg_qps" numeric(6,2),
  "total_requests" bigint default 0,
  "total_bids" bigint default 0,
  "total_impressions" bigint default 0,
  "total_errors" bigint default 0,
  "conclusion" character varying(32),
  "conclusion_notes" text,
  "conducted_by" uuid,
  "partner_contact" character varying(128),
  "partner_data_received" boolean default false,
  "reconciled" boolean default false,
  "status" character varying(16) not null default 'in_progress'::character varying,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "metadata" jsonb default '{}'::jsonb
);

create table "public"."management_action_queue" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "action_key" character varying(128) not null,
  "action_title" character varying(255) not null,
  "business_center" character varying(64) not null,
  "source_table" character varying(128),
  "source_id" character varying(64),
  "severity" character varying(16) default 'P2'::character varying,
  "revenue_impact" numeric(18,2),
  "owner_role" character varying(64),
  "owner_user_id" character varying(36),
  "next_action" text,
  "due_at" timestamp with time zone,
  "status" character varying(32) default 'open'::character varying,
  "escalation_level" character varying(16) default 'none'::character varying,
  "resolution_note" text,
  "resolved_at" timestamp with time zone,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "category" text
);

create table "public"."media_assets" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "asset_type" character varying(32),
  "asset_name" character varying(255),
  "platform" character varying(64),
  "daily_requests" bigint default 0,
  "daily_impressions" bigint default 0,
  "dau" bigint default 0,
  "mau" bigint default 0,
  "asset_url" text,
  "status" character varying(16) default 'active'::character varying,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36)
);

create table "public"."media_budget_allocation_tiers" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid not null,
  "tier" character varying(8) not null,
  "tier_order" integer not null,
  "budget_pool" character varying(32),
  "daily_budget_max" numeric(12,2),
  "currency" character varying(8) default 'USD'::character varying,
  "status" character varying(16) not null default 'pending'::character varying,
  "start_date" date,
  "end_date" date,
  "conditions_met" jsonb default '{}'::jsonb,
  "approved_by" uuid,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."media_budget_evaluations" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid not null,
  "evaluator_id" uuid,
  "evaluation_date" date not null default CURRENT_DATE,
  "evaluation_version" integer not null default 1,
  "status" character varying(16) not null default 'draft'::character varying,
  "traffic_authenticity_score" numeric(5,2) default 0,
  "traffic_authenticity_detail" jsonb default '{}'::jsonb,
  "ad_placement_value_score" numeric(5,2) default 0,
  "ad_placement_detail" jsonb default '{}'::jsonb,
  "budget_fit_score" numeric(5,2) default 0,
  "budget_fit_detail" jsonb default '{}'::jsonb,
  "tech_controllability_score" numeric(5,2) default 0,
  "tech_controllability_detail" jsonb default '{}'::jsonb,
  "compliance_score" numeric(5,2) default 0,
  "compliance_detail" jsonb default '{}'::jsonb,
  "total_score" numeric(5,2) generated always as (round(((((traffic_authenticity_score + ad_placement_value_score) + budget_fit_score) + tech_controllability_score) + compliance_score), 2)) stored,
  "media_grade" character varying(2) generated always as (
CASE
    WHEN (((((traffic_authenticity_score + ad_placement_value_score) + budget_fit_score) + tech_controllability_score) + compliance_score) >= (85)::numeric) THEN 'S'::text
    WHEN (((((traffic_authenticity_score + ad_placement_value_score) + budget_fit_score) + tech_controllability_score) + compliance_score) >= (70)::numeric) THEN 'A'::text
    WHEN (((((traffic_authenticity_score + ad_placement_value_score) + budget_fit_score) + tech_controllability_score) + compliance_score) >= (55)::numeric) THEN 'B'::text
    WHEN (((((traffic_authenticity_score + ad_placement_value_score) + budget_fit_score) + tech_controllability_score) + compliance_score) >= (40)::numeric) THEN 'C'::text
    ELSE 'D'::text
END) stored,
  "recommended_budget_pool" character varying(32),
  "daily_budget_limit" numeric(12,2),
  "risk_level" character varying(16),
  "risk_notes" text,
  "conclusion_notes" text,
  "reviewed_by" uuid,
  "reviewed_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "metadata" jsonb default '{}'::jsonb
);

create table "public"."media_budget_pools" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "media_id" character varying(36),
  "pool_name" character varying(128),
  "total_budget" numeric(14,2) default 0,
  "allocated_budget" numeric(14,2) default 0,
  "remaining_budget" numeric(14,2) default 0,
  "currency" character varying(8) default 'USD'::character varying,
  "status" character varying(32) default 'active'::character varying,
  "period_start" date,
  "period_end" date,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."media_compliance" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "compliance_type" character varying(64),
  "compliance_pass_status" character varying(32) default '未开始'::character varying,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."media_contacts" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "name" character varying(128),
  "role" character varying(64),
  "email" character varying(255),
  "phone" character varying(32),
  "wechat" character varying(64),
  "is_primary" boolean default false,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "job_title" character varying(128),
  "metadata" jsonb default '{}'::jsonb
);

create table "public"."media_contract_attachments" (
  "id" uuid not null default gen_random_uuid(),
  "contract_id" uuid not null,
  "attachment_type" character varying(16),
  "file_name" character varying(255),
  "file_url" text,
  "version" character varying(16),
  "structured_data" jsonb default '{}'::jsonb,
  "notes" text,
  "uploaded_at" timestamp with time zone default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."media_contract_orders" (
  "id" uuid not null default gen_random_uuid(),
  "master_contract_id" uuid not null,
  "order_id" character varying(16),
  "order_name" character varying(256),
  "advertiser_name" character varying(128),
  "campaign_id" character varying(64),
  "delivery_start" timestamp with time zone,
  "delivery_end" timestamp with time zone,
  "region_timezone" character varying(32),
  "app_name" character varying(128),
  "bundle_id" character varying(128),
  "placement_name" character varying(128),
  "ad_formats" text,
  "procurement_method" character varying(32),
  "is_guaranteed" boolean default false,
  "cancel_lead_days" integer,
  "under_delivery_makegood" text,
  "billing_method" character varying(32),
  "unit_price" numeric(14,4),
  "total_budget" numeric(14,2),
  "daily_budget" numeric(14,2),
  "origin_ivt_method" character varying(32),
  "third_party_tracking" text,
  "creative_review_hours" integer,
  "frequency_capping" text,
  "status" character varying(16) default '草稿'::character varying,
  "media_signee" character varying(64),
  "pg_signee" character varying(64),
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."media_contracts" (
  "id" uuid not null default gen_random_uuid(),
  "contract_id" character varying(16),
  "media_id" uuid not null,
  "contract_name" character varying(256),
  "contract_type" character varying(32) default '主合同'::character varying,
  "master_contract_id" character varying(36),
  "pg_entity" character varying(64),
  "media_entity" character varying(128),
  "media_signer" character varying(64),
  "media_signer_title" character varying(64),
  "signed_date" date,
  "effective_date" date,
  "expiry_date" date,
  "auto_renew" character varying(16) default '是'::character varying,
  "auto_renew_days_before" integer default 30,
  "currency" character varying(8) default 'RMB'::character varying,
  "total_budget" numeric(14,2),
  "tax_rate" numeric(5,2),
  "payment_method" character varying(32),
  "invoice_payment_days" integer default 60,
  "reconciliation_cycle" character varying(16) default '每月'::character varying,
  "data_discrepancy_threshold" numeric(5,2) default 5.00,
  "dispute_objection_days" integer default 10,
  "dispute_log_submit_days" integer default 5,
  "claim_expiry_days" integer default 120,
  "settlement_data_source" character varying(32) default '甲方数据'::character varying,
  "tech_owner_confirm_days" integer default 3,
  "test_build_submit_days" integer default 7,
  "production_launch_days" integer default 30,
  "sdk_upgrade_days" integer default 10,
  "min_net_dau" integer default 1000000,
  "max_ivt_rate" numeric(5,2) default 5.00,
  "min_origin_ivt_coverage" numeric(5,2) default 95.00,
  "min_field_completeness" numeric(5,2) default 98.00,
  "attachment_1_order_ids" text,
  "attachment_2_app_list" jsonb default '{}'::jsonb,
  "attachment_3_ivt_sdk_config" jsonb default '{}'::jsonb,
  "attachment_4_quality_policy_version" character varying(32),
  "signed_file_url" text,
  "status" character varying(32) default '起草中'::character varying,
  "legal_owner" character varying(128),
  "media_owner_id" character varying(128),
  "finance_owner" character varying(128),
  "data_privacy_risk" character varying(16) default '待评审'::character varying,
  "exclusivity_clause" character varying(16) default '无'::character varying,
  "key_terms_summary" text,
  "pending_issues" text,
  "notes" text,
  "created_at" timestamp with time zone default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "workflow_state" character varying(64),
  "contract_amount" numeric(14,2) default 0,
  "contract_currency" character varying(8) default 'USD'::character varying,
  "payment_terms" text,
  "payment_risk" character varying(32) default 'medium'::character varying,
  "metadata" jsonb default '{}'::jsonb,
  "blocked_reason" text,
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."media_ecosystem_conversion_logs" (
  "id" uuid not null default gen_random_uuid(),
  "opportunity_id" uuid not null,
  "trusted_supply_candidate_id" uuid,
  "publisher_id" uuid,
  "from_status" text,
  "to_status" text not null,
  "conversion_type" text not null,
  "conversion_reason" text,
  "created_by" uuid,
  "created_by_role" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."media_ecosystem_opportunities" (
  "id" uuid not null default gen_random_uuid(),
  "seed_id" text,
  "media_name" text not null,
  "company_entity" text,
  "source_primary_segment_cn" text,
  "source_secondary_category_cn" text,
  "ecosystem_segment" text not null,
  "ecosystem_segment_cn" text,
  "media_type_initial" text,
  "primary_scene_initial" text,
  "ad_formats_if_known" text,
  "potential_inventory" text,
  "potential_integration_methods" text,
  "estimated_dau" bigint,
  "estimated_mau" bigint,
  "geo_coverage" text,
  "audience_tags" jsonb not null default '[]'::jsonb,
  "ecosystem_status" text not null default 'ECOSYSTEM_MAPPED'::text,
  "verification_status" text not null default 'UNVERIFIED'::text,
  "data_quality_level" text not null default 'SEED_ONLY'::text,
  "trust_status" text not null default 'NOT_VERIFIED'::text,
  "trusted_supply_candidate" boolean not null default false,
  "deal_ready_status" text not null default 'NOT_READY'::text,
  "recommended_trading_mode" text not null default 'NEEDS_REVIEW'::text,
  "seed_priority_level" text,
  "priority_level" text not null default 'UNSCORED'::text,
  "owner_user_id" uuid,
  "owner_role" text default 'media_manager'::text,
  "next_action" text not null default 'Assign owner and complete seed verification.'::text,
  "target_contact_date" date,
  "last_contact_at" timestamp with time zone,
  "strategic_segment_score" integer not null default 0,
  "user_scale_score" integer not null default 0,
  "ad_context_score" integer not null default 0,
  "integration_feasibility_score" integer not null default 0,
  "advertiser_demand_score" integer not null default 0,
  "commercial_feasibility_score" integer not null default 0,
  "risk_control_score" integer not null default 0,
  "priority_score" integer generated always as (((((((strategic_segment_score + user_scale_score) + ad_context_score) + integration_feasibility_score) + advertiser_demand_score) + commercial_feasibility_score) + risk_control_score)) stored,
  "priority_score_reason" text,
  "integration_feasibility" text not null default 'unknown'::text,
  "media_contact_confirmed" boolean not null default false,
  "business_interest_confirmed" boolean not null default false,
  "ad_inventory_identified" boolean not null default false,
  "media_director_approved_by" uuid,
  "media_director_approved_at" timestamp with time zone,
  "linked_publisher_id" uuid,
  "review_required" boolean not null default false,
  "seed_confidence" text,
  "import_batch_id" text,
  "source_name" text,
  "source_version" text,
  "source_file" text,
  "source_page" integer,
  "forbidden_commitments" text,
  "trusted_supply_link_rule" text,
  "pmp_trading_link_rule" text,
  "notes" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."media_ecosystem_outreach_activities" (
  "id" uuid not null default gen_random_uuid(),
  "opportunity_id" uuid not null,
  "event" text not null,
  "actor_role" text,
  "actor_user_id" uuid,
  "activity_at" timestamp with time zone not null default now(),
  "next_action" text,
  "notes" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."media_ecosystem_segments" (
  "id" uuid not null default gen_random_uuid(),
  "segment_code" text not null,
  "segment_name" text not null,
  "description" text,
  "strategic_priority" text not null default 'P1'::text,
  "target_advertiser_industries" jsonb not null default '[]'::jsonb,
  "preferred_ad_formats" jsonb not null default '[]'::jsonb,
  "preferred_trading_modes" jsonb not null default '[]'::jsonb,
  "risk_notes" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."media_followup_logs" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "contact_id" uuid,
  "followup_date" timestamp with time zone not null default now(),
  "followup_method" character varying(32),
  "summary" text,
  "media_feedback" text,
  "next_action" text,
  "next_followup_date" timestamp with time zone,
  "owner_id" character varying(36),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "topic" character varying(255),
  "client_sentiment" character varying(32),
  "metadata" jsonb default '{}'::jsonb
);

create table "public"."media_inventory" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "ad_format" character varying(64),
  "region" character varying(64),
  "saleable" boolean default true,
  "status" character varying(32) default 'active'::character varying,
  "inventory_status" character varying(32),
  "quality_rating" character varying(16),
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."media_lead_inbox" (
  "id" uuid not null default gen_random_uuid(),
  "source" character varying(64),
  "source_url" text,
  "media_name" character varying(255),
  "website" character varying(512),
  "media_type" character varying(64),
  "contact_name" character varying(128),
  "contact_email" character varying(255),
  "contact_phone" character varying(32),
  "notes" text,
  "status" character varying(16) default 'new'::character varying,
  "assigned_to" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "owner_team_id" character varying(36),
  "metadata" jsonb default '{}'::jsonb
);

create table "public"."media_master" (
  "id" uuid not null default gen_random_uuid(),
  "company_name" character varying(255),
  "media_type" character varying(64),
  "priority" character varying(32),
  "stage" character varying(64),
  "quality_rating" character varying(16),
  "owner_id" character varying(36),
  "next_followup_date" date,
  "status" character varying(32) default 'active'::character varying,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "media_id" character varying(16),
  "company_name_en" character varying(255),
  "parent_group" character varying(255),
  "asset_type" character varying(64),
  "website" character varying(512),
  "main_products" text,
  "target_markets" text,
  "primary_region" character varying(64),
  "coverage_regions" text,
  "dau" bigint default 0,
  "mau" bigint default 0,
  "daily_requests" bigint default 0,
  "fill_rate" numeric(8,4),
  "ad_format_types" text,
  "integration_method" character varying(32),
  "sdk_status" character varying(32),
  "app_ads_txt_status" character varying(32),
  "sellers_json_status" character varying(32),
  "schain_status" character varying(32),
  "compliance_status" character varying(32),
  "ivt_status" character varying(32),
  "avg_ecpm" numeric(10,4),
  "monetization_status" character varying(32),
  "supply_readiness_score" numeric(3,1),
  "co_owners" text,
  "source_channel" character varying(64),
  "first_contact_date" timestamp with time zone,
  "last_followup_date" timestamp with time zone,
  "next_action" text,
  "current_blockers" text,
  "contract_status" character varying(32),
  "is_key_partner" boolean default false,
  "payment_terms" character varying(64),
  "payment_risk" character varying(16),
  "created_by" character varying(36),
  "updated_by" character varying(36),
  "media_name" character varying(255),
  "current_contract_id" uuid,
  "contract_expiry_date" date,
  "media_grade" character varying(2),
  "budget_evaluation_score" numeric(5,2),
  "budget_pool" character varying(32),
  "daily_budget_limit" numeric(12,2),
  "budget_total_spent" numeric(14,2) default 0,
  "budget_status" character varying(16) default 'pending'::character varying,
  "risk_level" character varying(16) default 'untouched'::character varying,
  "last_evaluation_date" date,
  "auto_monitor_enabled" boolean default false,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "workflow_state" character varying(64),
  "metadata" jsonb default '{}'::jsonb,
  "blocked_reason" text,
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying,
  "launch_gate_status" text,
  "saleable" boolean default false,
  "market" text,
  "budget_currency" text,
  "total_budget" numeric(18,2),
  "media_sub_type" text,
  "quality_score" numeric(5,2),
  "business_potential_score" numeric(5,2),
  "media_sub_category" text
);

create table "public"."media_monitoring_alerts" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "metric_key" character varying(64) not null,
  "metric_label_zh" character varying(128),
  "warning_threshold" numeric(12,4),
  "critical_threshold" numeric(12,4),
  "comparison_operator" character varying(4) default '>'::character varying,
  "auto_action" character varying(32),
  "cooldown_hours" integer default 24,
  "last_triggered_at" timestamp with time zone,
  "is_active" boolean default true,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."media_onboarding_projects" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "stage" character varying(64),
  "status" character varying(32) default 'active'::character varying,
  "launch_status" character varying(32),
  "target_launch_date" date,
  "business_owner" uuid,
  "tech_owner_id" uuid,
  "ops_owner" uuid,
  "compliance_passed" boolean default false,
  "quality_baseline_passed" boolean default false,
  "gate_status" text default 'not_checked'::text,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "contract_id" uuid,
  "media_type" character varying(16),
  "media_sub_type" character varying(64),
  "risk_level" character varying(16),
  "overall_gate" character varying(16) default 'pending'::character varying,
  "current_phase" integer default 0,
  "project_name" character varying(255),
  "onboarding_id" character varying(64),
  "integration_method" character varying(64),
  "current_blockers" text,
  "blocker_description" text,
  "test_status" character varying(32),
  "test_request_status" character varying(16),
  "test_impression_status" character varying(16),
  "test_click_status" character varying(16),
  "launch_confirmed_by" character varying(128),
  "actual_launch_date" date,
  "asset_id" character varying(64),
  "inventory_ids" text,
  "media_tech_contact" character varying(128),
  "media_owner_id" character varying(64),
  "blocking_issues" text,
  "compliance_status" character varying(32),
  "quality_status" character varying(32),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "workflow_state" character varying(64),
  "metadata" jsonb default '{}'::jsonb,
  "blocked_reason" text,
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."media_onboarding_stage_gates" (
  "id" uuid not null default gen_random_uuid(),
  "lifecycle_object_type" text not null,
  "lifecycle_object_id" uuid not null,
  "stage" text not null,
  "status" text not null default 'not_started'::text,
  "owner_user_id" uuid,
  "owner_role" text not null,
  "target_date" date,
  "deliverables" jsonb not null default '[]'::jsonb,
  "kpi_evidence" jsonb not null default '[]'::jsonb,
  "blocker" text,
  "notes" text,
  "submitted_at" timestamp with time zone,
  "approved_by" uuid,
  "approved_by_role" text,
  "approved_at" timestamp with time zone,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."media_package_rate_cards" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "package_name" character varying(255),
  "package_type" character varying(64),
  "coverage_regions" jsonb default '[]'::jsonb,
  "saleable_status" character varying(32) default '可售'::character varying,
  "brand_safety_level" character varying(32),
  "price" numeric(18,2),
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."media_payables" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "media_id" character varying(36),
  "settlement_id" character varying(36),
  "amount" numeric(14,2) default 0,
  "outstanding_amount" numeric(14,2) default 0,
  "currency" character varying(8) default 'RMB'::character varying,
  "status" character varying(32) default 'pending'::character varying,
  "aging_bucket" character varying(32),
  "due_date" date,
  "payment_file_url" text,
  "approval_id" character varying(36),
  "notes" text,
  "order_id" character varying(36),
  "contract_id" character varying(36),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "workflow_state" character varying(64),
  "owner_user_id" character varying(36),
  "finance_owner" character varying(128),
  "media_owner" character varying(128),
  "metadata" jsonb not null default '{}'::jsonb,
  "next_action" text,
  "paid_amount" numeric(14,2) default 0,
  "paid_at" timestamp with time zone,
  "payable_no" character varying(64),
  "risk_level" character varying(16) default 'low'::character varying,
  "owner_team_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "blocked_reason" text,
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."media_payment_gate_results" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "settlement_id" character varying(36) not null,
  "media_id" character varying(36),
  "payable_id" character varying(36),
  "gate_key" character varying(128) not null default 'media_payment_gate'::character varying,
  "passed" boolean not null default false,
  "risk_level" character varying(16) default 'medium'::character varying,
  "ar_collection_status" character varying(32),
  "ar_overdue_amount" numeric(18,2) default 0,
  "gross_margin_rate" numeric(10,6) default 0,
  "data_discrepancy_rate" numeric(10,6) default 0,
  "blockers" jsonb not null default '[]'::jsonb,
  "warnings" jsonb not null default '[]'::jsonb,
  "required_approver_role" character varying(64),
  "checked_by" character varying(255),
  "checked_at" timestamp with time zone not null default now(),
  "expires_at" timestamp with time zone,
  "metadata" jsonb not null default '{}'::jsonb
);

create table "public"."media_quality_scores" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "media_id" character varying(36) not null,
  "media_type" character varying(32),
  "score_total" numeric(8,2) default 0,
  "score_scale" numeric(8,2) default 0,
  "score_compliance" numeric(8,2) default 0,
  "score_technical" numeric(8,2) default 0,
  "score_ivt" numeric(8,2) default 0,
  "score_data" numeric(8,2) default 0,
  "score_commercial" numeric(8,2) default 0,
  "score_performance" numeric(8,2) default 0,
  "quality_grade" character varying(8) default 'C'::character varying,
  "allow_onboard" boolean default false,
  "allow_saleable" boolean default false,
  "allow_scale" boolean default false,
  "blockers" jsonb not null default '[]'::jsonb,
  "warnings" jsonb not null default '[]'::jsonb,
  "calculated_by" character varying(255),
  "calculated_at" timestamp with time zone not null default now(),
  "metadata" jsonb not null default '{}'::jsonb
);

create table "public"."media_revenue_performance" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "performance_date" date,
  "gross_revenue" numeric(18,2),
  "pg_revenue" numeric(18,2),
  "pg_gross_margin" numeric(8,4),
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36)
);

create table "public"."media_settlements" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "period_start" date,
  "period_end" date,
  "gross_revenue" numeric(18,2),
  "actual_payable" numeric(18,2),
  "media_revenue_share" numeric(8,4),
  "reconciliation_status" character varying(32) default '未开始'::character varying,
  "payment_status" character varying(32),
  "expected_payment_date" date,
  "data_discrepancy_rate" numeric(8,4),
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "contract_id" uuid,
  "order_id" uuid,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "workflow_state" character varying(64),
  "owner_user_id" character varying(36),
  "metadata" jsonb default '{}'::jsonb,
  "settlement_id" character varying(64),
  "status" character varying(32),
  "invoice_status" character varying(32) default 'pending'::character varying,
  "finance_owner" character varying(128),
  "media_owner" character varying(128),
  "discrepancy_threshold" numeric(8,6) default 0.05,
  "currency" character varying(16) default 'RMB'::character varying,
  "risk_level" character varying(32) default 'low'::character varying,
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "blocked_reason" text,
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."media_strategy" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "strategy_name" character varying(255),
  "strategy_type" character varying(32),
  "status" character varying(16) default 'draft'::character varying,
  "estimated_monthly_revenue" numeric(18,2),
  "cooperation_approach" text,
  "key_action_plan" text,
  "responsible_person" character varying(128),
  "review_date" date,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36)
);

create table "public"."media_supply_daily_snapshots" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "snapshot_date" date not null,
  "media_type" character varying(32),
  "ready_supply" integer default 0,
  "onboarding_supply" integer default 0,
  "qps_capacity" numeric(14,2) default 0,
  "available_impressions" numeric(18,2) default 0,
  "avg_floor_price" numeric(14,4) default 0,
  "risk_supply" integer default 0,
  "totals" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone
);

create table "public"."media_supply_packages" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "package_name" text not null,
  "status" text not null default 'draft'::text,
  "pool" text not null,
  "ad_formats" jsonb not null default '[]'::jsonb,
  "placement_types" jsonb not null default '[]'::jsonb,
  "geo" text not null default 'CN'::text,
  "inventory_scale" bigint not null default 0,
  "floor_price" numeric(14,4),
  "billing_model" text,
  "advertiser_fit_tags" jsonb not null default '[]'::jsonb,
  "risk_notes" jsonb not null default '[]'::jsonb,
  "owner_user_id" uuid,
  "owner_role" text not null default 'media_manager'::text,
  "activated_at" timestamp with time zone,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."media_tech_integrations" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "integration_type" character varying(64),
  "test_status" character varying(32) default 'pending'::character varying,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "contract_id" uuid,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."media_traffic_quality" (
  "id" uuid not null default gen_random_uuid(),
  "media_id" uuid,
  "ivt_rate" numeric(8,4),
  "ctr" numeric(8,4),
  "quality_rating" character varying(16),
  "region_anomaly_rate" numeric(8,4),
  "device_anomaly_rate" numeric(8,4),
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "asset_id" uuid,
  "data_period" character varying(32),
  "suspicious_click_rate" numeric(8,4),
  "inventory_id" uuid,
  "quality_date" date,
  "quality_id" character varying(36),
  "bid_requests" bigint default 0,
  "bid_responses" bigint default 0,
  "impressions" bigint default 0,
  "clicks" bigint default 0,
  "fill_rate" numeric(8,4),
  "needs_throttle" boolean default false,
  "needs_pause" boolean default false,
  "action_status" character varying(32),
  "responsible_person" character varying(128),
  "contract_id" uuid,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36)
);

create table "public"."media_trust_profiles" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "owner_user_id" uuid,
  "owner_role" text not null default 'media_manager'::text,
  "status" text not null default 'draft'::text,
  "total_score" integer not null default 0,
  "trust_level" text not null default 'D'::text,
  "score_breakdown" jsonb not null default '{}'::jsonb,
  "suggested_pool" text not null default 'opportunity'::text,
  "confirmed_pool" text,
  "advertiser_fit_tags" jsonb not null default '[]'::jsonb,
  "recommendation_reasons" jsonb not null default '[]'::jsonb,
  "risk_warnings" jsonb not null default '[]'::jsonb,
  "next_action" text not null default 'Evaluate trusted supply readiness.'::text,
  "evaluated_at" timestamp with time zone not null default now(),
  "confirmed_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."media_trust_score_history" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "total_score" integer not null,
  "trust_level" text not null,
  "score_breakdown" jsonb not null default '{}'::jsonb,
  "suggested_pool" text not null,
  "reasons" jsonb not null default '[]'::jsonb,
  "risk_warnings" jsonb not null default '[]'::jsonb,
  "calculated_at" timestamp with time zone not null default now(),
  "calculated_by_role" text not null
);

create table "public"."metric_definitions" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "metric_key" character varying(128) not null,
  "display_name" character varying(255) not null,
  "business_center" character varying(64) not null,
  "formula" text,
  "data_source" character varying(255),
  "refresh_frequency" character varying(64) default 'daily'::character varying,
  "owner_role" character varying(64),
  "warning_rule" jsonb not null default '{}'::jsonb,
  "is_active" boolean not null default true,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "metric_version" character varying(32) default 'v2.0.13'::character varying,
  "usable_for_management" boolean not null default true,
  "usable_for_finance_settlement" boolean not null default false,
  "revenue_recognition_basis" character varying(64)
);

create table "public"."metric_funnel_snapshots" (
  "id" uuid not null default gen_random_uuid(),
  "object_type" text not null,
  "object_id" uuid not null,
  "snapshot_date" date not null,
  "requests" bigint,
  "responses" bigint,
  "bids" bigint,
  "wins" bigint,
  "fills" bigint,
  "impressions" bigint,
  "clicks" bigint,
  "spend" numeric(14,4),
  "currency" text default 'CNY'::text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."metric_snapshots" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "metric_key" character varying(128) not null,
  "snapshot_date" date not null,
  "scope" character varying(64) default 'global'::character varying,
  "value" numeric(18,4) default 0,
  "target_value" numeric(18,4),
  "currency" character varying(8),
  "data_freshness_at" timestamp with time zone,
  "data_quality_score" numeric(5,2) default 100,
  "source_batch_id" character varying(128),
  "calculation_version" character varying(64) default 'v2.0.12'::character varying,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "evidence_url" text,
  "approved_by" character varying(255),
  "approved_at" timestamp with time zone
);

create table "public"."module_business_events" (
  "id" uuid not null default gen_random_uuid(),
  "event_code" text not null,
  "object_type" text not null,
  "object_id" uuid,
  "owner_user_id" uuid,
  "owner_role" text,
  "payload" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."notification_acknowledgements" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "notification_id" character varying(36),
  "task_id" character varying(36),
  "channel" character varying(32),
  "recipient" character varying(255),
  "acknowledged_by" character varying(255),
  "acknowledged_at" timestamp with time zone not null default now(),
  "response_status" character varying(32) default 'acknowledged'::character varying,
  "response_note" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "ack_deadline" timestamp with time zone,
  "escalated_to" character varying(255),
  "escalated_at" timestamp with time zone,
  "resolution_note" text,
  "resolved_at" timestamp with time zone
);

create table "public"."notification_logs" (
  "id" uuid not null default gen_random_uuid(),
  "channel" character varying(32) not null,
  "title" character varying(255) not null,
  "content" text,
  "target" character varying(512),
  "status" character varying(32) not null default 'pending'::character varying,
  "provider_response" jsonb not null default '{}'::jsonb,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "blocked_reason" text,
  "escalation_level" character varying(16) default 'none'::character varying,
  "last_touch_at" timestamp with time zone,
  "next_action_owner_id" character varying(36),
  "organization_id" character varying(64) not null default 'pg-china'::character varying,
  "owner_team_id" character varying(36),
  "owner_user_id" character varying(36),
  "sla_due_at" timestamp with time zone,
  "stage_entered_at" timestamp with time zone
);

create table "public"."notification_outbox" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "channel" character varying(32) not null,
  "template_key" character varying(128),
  "target" character varying(255),
  "title" character varying(255) not null,
  "content" text not null,
  "status" character varying(32) default 'pending'::character varying,
  "priority" character varying(16) default 'P2'::character varying,
  "attempt_count" integer default 0,
  "max_attempts" integer default 3,
  "next_attempt_at" timestamp with time zone default now(),
  "last_attempt_at" timestamp with time zone,
  "provider_response" jsonb not null default '{}'::jsonb,
  "related_table" character varying(128),
  "related_id" character varying(64),
  "created_by" character varying(255),
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "dedupe_key" character varying(255),
  "locked_at" timestamp with time zone,
  "locked_by" character varying(128),
  "last_error" text,
  "sent_at" timestamp with time zone,
  "blocked_reason" text,
  "escalation_level" character varying(16) default 'none'::character varying,
  "last_touch_at" timestamp with time zone,
  "next_action_owner_id" character varying(36),
  "organization_id" character varying(64) not null default 'pg-china'::character varying,
  "owner_team_id" character varying(36),
  "owner_user_id" character varying(36),
  "sla_due_at" timestamp with time zone,
  "stage_entered_at" timestamp with time zone
);

create table "public"."notifications" (
  "id" uuid not null default gen_random_uuid(),
  "recipient_user_id" uuid not null,
  "title" text not null,
  "body" text,
  "object_type" text,
  "object_id" uuid,
  "is_read" boolean not null default false,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."okr_checkins" (
  "id" uuid not null default gen_random_uuid(),
  "key_result_id" uuid not null,
  "value" numeric(18,4) not null,
  "note" text,
  "created_by" uuid,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."okr_key_results" (
  "id" uuid not null default gen_random_uuid(),
  "objective_id" uuid not null,
  "title" text not null,
  "target_value" numeric(18,4),
  "current_value" numeric(18,4) default 0,
  "unit" text,
  "status" text not null default 'active'::text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."okr_objectives" (
  "id" uuid not null default gen_random_uuid(),
  "title" text not null,
  "owner_role" text,
  "owner_user_id" uuid,
  "period" text not null,
  "status" text not null default 'active'::text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."onboarding_checklist_items" (
  "id" uuid not null default gen_random_uuid(),
  "stage_record_id" uuid not null,
  "check_key" character varying(64) not null,
  "label_zh" text not null,
  "label_en" text,
  "is_mandatory" boolean not null default true,
  "status" character varying(16) not null default 'pending'::character varying,
  "evidence" text,
  "completed_by" uuid,
  "completed_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36)
);

create table "public"."onboarding_gate_results" (
  "id" uuid not null default gen_random_uuid(),
  "onboarding_id" uuid not null,
  "gate_type" character varying(32) not null,
  "gate_order" integer not null,
  "status" character varying(16) not null default 'pending'::character varying,
  "evaluated_by" uuid,
  "evaluated_at" timestamp with time zone,
  "condition_notes" text,
  "retry_count" integer not null default 0,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."onboarding_stage_records" (
  "id" uuid not null default gen_random_uuid(),
  "onboarding_id" uuid not null,
  "stage_key" character varying(32) not null,
  "stage_order" integer not null,
  "status" character varying(16) not null default 'pending'::character varying,
  "owner_role" character varying(64),
  "owner_id" uuid,
  "started_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "blocked_reason" text,
  "output_deliverable" text,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36)
);

create table "public"."opportunities" (
  "id" uuid not null default gen_random_uuid(),
  "advertiser_id" uuid not null,
  "name" text not null,
  "owner_user_id" uuid,
  "stage" text not null default 'discovery'::text,
  "expected_budget" numeric(14,2),
  "currency" text default 'CNY'::text,
  "pain_points" jsonb not null default '[]'::jsonb,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."owner_identity_resolution_exceptions" (
  "id" text not null,
  "table_name" text,
  "record_id" text,
  "owner_field" text,
  "owner_value" text,
  "resolution_status" text,
  "created_at" timestamp with time zone default now()
);

create table "public"."payment_collections" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "direction" character varying(8) not null,
  "amount" numeric(14,2) default 0,
  "currency" character varying(8) default 'RMB'::character varying,
  "status" character varying(32) default 'pending'::character varying,
  "payment_date" date,
  "source_type" character varying(64),
  "source_id" character varying(36),
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "workflow_state" character varying(64),
  "owner_user_id" character varying(36),
  "advertiser_id" character varying(36),
  "bank_reference" character varying(128),
  "campaign_id" character varying(36),
  "contract_id" character varying(36),
  "finance_owner" character varying(128),
  "invoice_id" character varying(36),
  "media_id" character varying(36),
  "metadata" jsonb not null default '{}'::jsonb,
  "payable_id" character varying(36),
  "payment_method" character varying(64),
  "payment_no" character varying(64),
  "receivable_id" character varying(36),
  "owner_team_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "blocked_reason" text,
  "stage_entered_at" timestamp with time zone,
  "last_touch_at" timestamp with time zone,
  "sla_due_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying
);

create table "public"."pgos_export_logs" (
  "id" uuid not null default gen_random_uuid(),
  "export_type" character varying(64) not null,
  "period" character varying(32),
  "format" character varying(16) not null default 'csv'::character varying,
  "requested_by" character varying(255),
  "status" character varying(32) not null default 'created'::character varying,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."pgos_generated_reports" (
  "id" uuid not null default gen_random_uuid(),
  "report_type" text not null,
  "period" text,
  "title" text not null,
  "content_markdown" text not null,
  "payload" jsonb not null default '{}'::jsonb,
  "delivery_status" text not null default 'draft'::text,
  "delivery_channels" jsonb not null default '[]'::jsonb,
  "created_by" text,
  "created_at" timestamp with time zone not null default now(),
  "sent_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."pgos_import_batches" (
  "id" uuid not null default gen_random_uuid(),
  "target_table" text not null,
  "source" text not null default 'excel'::text,
  "record_count" integer not null default 0,
  "status" text not null default 'pending'::text,
  "error_summary" text,
  "created_by" text,
  "created_at" timestamp with time zone not null default now(),
  "completed_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."pgos_production_hardening_items" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "item_key" character varying(128) not null,
  "item_name" character varying(255),
  "category" character varying(64),
  "status" character varying(32) default 'pending'::character varying,
  "severity" character varying(16) default 'medium'::character varying,
  "notes" text,
  "resolved_at" timestamp with time zone,
  "resolved_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."pgos_remediation_closure_items" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "item_code" character varying(32) not null,
  "priority" character varying(8) not null,
  "business_center" character varying(128) not null,
  "theme" text not null,
  "owner_role" character varying(128),
  "gate_rule" text,
  "closure_status" character varying(32) not null default 'source_closed'::character varying,
  "completion_rate" integer not null default 100,
  "closed_in_version" character varying(32) not null default '2.0.17'::character varying,
  "source_evidence" text not null,
  "runtime_validation" character varying(64) not null default 'covered_by_source_check'::character varying,
  "acceptance_standard" text,
  "closed_at" timestamp with time zone not null default now(),
  "metadata" jsonb not null default '{}'::jsonb
);

create table "public"."pgos_schema_migrations" (
  "version" character varying(16) not null,
  "filename" text not null,
  "checksum_sha256" character varying(64) not null,
  "execution_mode" character varying(24) not null default 'applied'::character varying,
  "applied_at" timestamp with time zone not null default now(),
  "applied_by" text,
  "duration_ms" integer,
  "metadata" jsonb not null default '{}'::jsonb
);

create table "public"."pgos_sessions" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "user_email" character varying(255) not null,
  "session_token" character varying(255) not null,
  "hmac_signing_key" character varying(255),
  "expires_at" timestamp with time zone not null,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."pgos_users" (
  "id" uuid not null default gen_random_uuid(),
  "email" character varying(255) not null,
  "name" character varying(128) not null,
  "name_en" character varying(128),
  "password_hash" character varying(255),
  "roles" jsonb not null default '[]'::jsonb,
  "department" character varying(64),
  "title" character varying(128),
  "locale" character varying(8) default 'zh'::character varying,
  "is_active" boolean not null default true,
  "last_login_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "failed_login_count" integer default 0
);

create table "public"."production_runtime_acceptance_runs" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "run_key" character varying(128) not null,
  "status" character varying(32) default 'pending'::character varying,
  "pnpm_install_status" character varying(32),
  "ts_check_status" character varying(32),
  "lint_status" character varying(32),
  "build_status" character varying(32),
  "migration_status" character varying(32),
  "seed_status" character varying(32),
  "release_check_status" character varying(32),
  "evidence" jsonb not null default '{}'::jsonb,
  "checked_by" character varying(255),
  "checked_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone
);

create table "public"."profiles" (
  "id" uuid not null,
  "email" text not null,
  "full_name" text,
  "title" text,
  "department" text,
  "is_active" boolean not null default true,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."proposal_media_selections" (
  "id" uuid not null default gen_random_uuid(),
  "proposal_id" uuid not null,
  "publisher_id" uuid not null,
  "ad_slot_id" uuid,
  "guard_status" text not null default 'pending'::text,
  "guard_reason" text,
  "planned_budget" numeric(14,2),
  "currency" text default 'CNY'::text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."proposals" (
  "id" uuid not null default gen_random_uuid(),
  "opportunity_id" uuid not null,
  "name" text not null,
  "owner_user_id" uuid,
  "status" proposal_status_enum not null default 'draft'::proposal_status_enum,
  "budget" numeric(14,2),
  "currency" text default 'CNY'::text,
  "notes" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."publisher_ad_slots" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "slot_name" text not null,
  "ad_format" text,
  "placement_type" text,
  "floor_price" numeric(12,4),
  "currency" text default 'CNY'::text,
  "daily_requests" bigint,
  "status" text not null default 'active'::text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."publisher_contacts" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "name" text not null,
  "role_title" text,
  "email" text,
  "phone" text,
  "messenger" text,
  "is_primary" boolean not null default false,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."publisher_contract_terms" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "contract_type" text,
  "billing_model" text,
  "settlement_cycle" text,
  "payment_terms" text,
  "revenue_share" numeric(8,4),
  "min_daily_spend" numeric(14,2),
  "currency" text default 'CNY'::text,
  "effective_date" date,
  "expiry_date" date,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."publisher_readiness_snapshots" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "technical_live_status" technical_live_status_enum not null,
  "commercial_test_status" commercial_test_status_enum not null,
  "sales_scale_status" sales_scale_status_enum not null,
  "has_blocking_diagnostic" boolean not null default false,
  "blocked_reasons" jsonb not null default '[]'::jsonb,
  "snapshot_by" uuid,
  "is_allowed_for_proposal" boolean not null default false,
  "is_allowed_for_campaign" boolean not null default false,
  "is_allowed_for_scale" boolean not null default false,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."publisher_supply_transparency" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "ads_txt_status" text,
  "app_ads_txt_status" text,
  "sellers_json_status" text,
  "schain_status" text,
  "notes" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."publisher_traffic_evidence_history" (
  "id" uuid not null default gen_random_uuid(),
  "publisher_id" uuid not null,
  "daily_active_users" bigint,
  "monthly_active_users" bigint,
  "daily_requests" bigint,
  "traffic_data_as_of" date not null,
  "traffic_source" text not null,
  "actor_user_id" uuid,
  "recorded_by_role" text,
  "recorded_via" text not null,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."publishers" (
  "id" uuid not null default gen_random_uuid(),
  "name" text not null,
  "legal_entity" text,
  "region" text,
  "media_type" text,
  "integration_type" text,
  "owner_user_id" uuid,
  "owner_role" text default 'media_manager'::text,
  "technical_live_status" technical_live_status_enum not null default 'draft'::technical_live_status_enum,
  "commercial_test_status" commercial_test_status_enum not null default 'not_started'::commercial_test_status_enum,
  "sales_scale_status" sales_scale_status_enum not null default 'not_allowed'::sales_scale_status_enum,
  "risk_level" severity_enum not null default 'medium'::severity_enum,
  "daily_active_users" bigint,
  "daily_requests" bigint,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."purchase_orders" (
  "id" uuid not null default gen_random_uuid(),
  "contract_id" uuid,
  "po_number" text,
  "total_amount" numeric(14,4),
  "currency" text default 'CNY'::text,
  "status" text not null default 'draft'::text,
  "owner_user_id" uuid,
  "notes" text,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."quality_diagnostic_cases" (
  "id" uuid not null default gen_random_uuid(),
  "case_no" text not null,
  "case_type" text not null,
  "title" text not null,
  "publisher_id" uuid,
  "publisher_ad_slot_id" uuid,
  "campaign_id" uuid,
  "settlement_id" uuid,
  "owner_user_id" uuid,
  "owner_role" text,
  "status" diagnostic_case_status_enum not null default 'opened'::diagnostic_case_status_enum,
  "severity" severity_enum not null default 'medium'::severity_enum,
  "impact_scope" text,
  "downstream_action" text,
  "root_cause" text,
  "conclusion" text,
  "is_blocking_sales_scale" boolean not null default false,
  "is_blocking_campaign" boolean not null default false,
  "is_blocking_settlement" boolean not null default false,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."quality_diagnostic_conclusions" (
  "id" uuid not null default gen_random_uuid(),
  "case_id" uuid not null,
  "conclusion_type" text not null,
  "summary" text not null,
  "action_required" text,
  "impact_assessment" text,
  "created_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."quality_diagnostic_downstream_actions" (
  "id" uuid not null default gen_random_uuid(),
  "case_id" uuid not null,
  "action_type" text not null,
  "target_object_type" text,
  "target_object_id" uuid,
  "action_detail" text,
  "executed" boolean not null default false,
  "executed_by" uuid,
  "executed_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."quality_diagnostic_evidence" (
  "id" uuid not null default gen_random_uuid(),
  "case_id" uuid not null,
  "evidence_type" text not null,
  "title" text not null,
  "content" text,
  "data" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."rate_limit_buckets" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "bucket_key" character varying(255) not null,
  "tokens" integer default 0,
  "capacity" integer default 0,
  "refill_rate" numeric(8,2) default 1,
  "refill_interval_seconds" integer default 1,
  "last_refill_at" timestamp with time zone,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."record_comments" (
  "id" uuid not null default gen_random_uuid(),
  "target_table" text not null,
  "target_id" uuid not null,
  "comment_type" text not null default 'general'::text,
  "body" text not null,
  "visibility" text not null default 'internal'::text,
  "author_email" text,
  "author_name" text,
  "mentioned_roles" jsonb not null default '[]'::jsonb,
  "mentioned_users" jsonb not null default '[]'::jsonb,
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" text,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."role_capabilities" (
  "role_code" text not null,
  "capability_code" text not null
);

create table "public"."roles" (
  "code" text not null,
  "name" text not null,
  "description" text,
  "is_business_approval_role" boolean not null default false,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."route_permissions" (
  "route_path" text not null,
  "role_code" text not null,
  "can_read" boolean not null default true,
  "can_write" boolean not null default false
);

create table "public"."settlement_items" (
  "id" uuid not null default gen_random_uuid(),
  "settlement_id" uuid not null,
  "item_type" text not null,
  "quantity" numeric(18,4),
  "unit_price" numeric(14,4),
  "amount" numeric(14,4),
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."settlements" (
  "id" uuid not null default gen_random_uuid(),
  "campaign_id" uuid,
  "publisher_id" uuid,
  "period_start" date not null,
  "period_end" date not null,
  "status" settlement_status_enum not null default 'draft'::settlement_status_enum,
  "amount" numeric(14,4),
  "currency" text default 'CNY'::text,
  "owner_user_id" uuid,
  "exception_reason" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."sla_instances" (
  "id" text not null,
  "sla_policy_id" text,
  "entity_table" text,
  "entity_id" text,
  "target_time" timestamp with time zone,
  "status" text default 'active'::text,
  "escalated" boolean default false,
  "created_at" timestamp with time zone default now()
);

create table "public"."sop_cards" (
  "id" uuid not null default gen_random_uuid(),
  "title" text not null,
  "scenario" text not null,
  "role_code" text,
  "content" text not null,
  "related_route" text,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."sop_metric_tolerances" (
  "id" uuid not null default gen_random_uuid(),
  "media_type" character varying(16) not null,
  "metric_key" character varying(32) not null,
  "tolerance_pct" numeric(8,4) not null,
  "is_active" boolean default true,
  "notes" text,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."system_audit_logs" (
  "id" uuid not null default gen_random_uuid(),
  "actor_email" character varying(255) not null,
  "actor_name" character varying(128),
  "actor_roles" jsonb not null default '[]'::jsonb,
  "action" character varying(128) not null,
  "resource" character varying(128) not null,
  "resource_id" character varying(128),
  "status" character varying(32) not null default 'success'::character varying,
  "metadata" jsonb not null default '{}'::jsonb,
  "ip_address" character varying(64),
  "user_agent" text,
  "created_at" timestamp with time zone not null default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."task_dependencies" (
  "id" text not null,
  "task_id" text,
  "depends_on_task_id" text,
  "dependency_type" text,
  "status" text default 'pending'::text,
  "created_at" timestamp with time zone default now()
);

create table "public"."task_items" (
  "id" character varying(36) not null default (gen_random_uuid())::text,
  "task_type" character varying(64) default 'general'::character varying,
  "title" character varying(255) not null,
  "description" text,
  "priority" character varying(16) default 'P2'::character varying,
  "status" character varying(32) default 'open'::character varying,
  "owner_role" character varying(64),
  "owner_id" character varying(128),
  "source_type" character varying(64),
  "source_id" character varying(64),
  "related_table" character varying(128),
  "related_id" character varying(64),
  "next_action" text,
  "due_at" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "created_by" character varying(255),
  "metadata" jsonb not null default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "owner_user_id" character varying(36),
  "next_action_owner_id" character varying(36),
  "owner_team_id" character varying(36),
  "acknowledged_at" timestamp with time zone,
  "escalated_at" timestamp with time zone,
  "escalation_level" character varying(16) default 'none'::character varying,
  "dedupe_key" character varying(255),
  "source_hash" character varying(128),
  "blocked_reason" text,
  "last_touch_at" timestamp with time zone,
  "organization_id" character varying(64) not null default 'pg-china'::character varying,
  "sla_due_at" timestamp with time zone,
  "stage_entered_at" timestamp with time zone,
  "acceptance_due_at" timestamp with time zone,
  "assignment_status" text,
  "committed_due_at" timestamp with time zone,
  "progress_percent" integer,
  "completion_summary" text,
  "verification_status" text
);

create table "public"."team_members" (
  "id" text not null default gen_random_uuid(),
  "name" character varying(128) not null,
  "name_en" character varying(128),
  "email" character varying(255) not null,
  "role" character varying(64) not null,
  "department" character varying(64) not null,
  "reports_to" text,
  "is_active" boolean not null default true,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "employee_code" character varying(36)
);

create table "public"."tech_reference" (
  "id" uuid not null default gen_random_uuid(),
  "media_type" character varying(16) not null,
  "integration_method" character varying(32) not null,
  "category" character varying(32) not null,
  "item_key" character varying(64) not null,
  "item_label_zh" text not null,
  "item_label_en" text,
  "item_value" text not null,
  "item_detail" text,
  "sort_order" integer not null default 0,
  "is_active" boolean default true,
  "created_at" timestamp with time zone default now(),
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."trusted_supply_candidates" (
  "id" uuid not null default gen_random_uuid(),
  "opportunity_id" uuid not null,
  "media_name" text,
  "track" text,
  "priority_score" integer,
  "status" text not null default 'candidate'::text,
  "owner_user_id" uuid,
  "owner_role" text default 'media_manager'::text,
  "evaluation_notes" text not null default 'Entered trusted supply network evaluation. Candidate status is not trusted approval.'::text,
  "publisher_id" uuid,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now(),
  "readiness_started_at" timestamp with time zone,
  "technical_reviewed_at" timestamp with time zone,
  "commercial_reviewed_at" timestamp with time zone,
  "onboarding_ready_at" timestamp with time zone,
  "readiness_notes" text
);

create table "public"."uat_script_runs" (
  "id" uuid not null default gen_random_uuid(),
  "run_key" text not null,
  "environment" text not null default 'production'::text,
  "production_url" text,
  "started_by" uuid,
  "started_by_role" text,
  "status" text not null default 'in_progress'::text,
  "summary" jsonb not null default '{}'::jsonb,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."uat_script_step_results" (
  "id" uuid not null default gen_random_uuid(),
  "run_id" uuid not null,
  "script_id" text not null,
  "script_title" text not null,
  "role_code" text,
  "step_id" text not null,
  "step_action" text not null,
  "expected_result" text not null,
  "status" text not null default 'pending'::text,
  "actual_result" text not null default ''::text,
  "actor_user_id" uuid,
  "actor_role" text,
  "updated_by" uuid,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."user_preferences" (
  "id" uuid not null default gen_random_uuid(),
  "user_email" character varying(255) not null,
  "default_locale" character varying(8) default 'zh'::character varying,
  "default_workspace" character varying(64) default 'workbench'::character varying,
  "notification_channels" jsonb not null default '[]'::jsonb,
  "dashboard_filters" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255)
);

create table "public"."user_roles" (
  "user_id" uuid not null,
  "role_code" text not null
);

create table "public"."wizard_progress_records" (
  "id" uuid not null default gen_random_uuid(),
  "wizard_code" text not null,
  "object_type" text not null,
  "object_id" uuid not null,
  "current_step" text not null,
  "completed_steps" jsonb not null default '[]'::jsonb,
  "owner_user_id" uuid,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."work_item_events" (
  "id" bigint not null default nextval('work_item_events_id_seq'::regclass),
  "work_item_id" text not null,
  "event_type" text not null,
  "actor_email" text,
  "actor_id" text,
  "actor_roles" text[] not null default ARRAY[]::text[],
  "from_status" text,
  "to_status" text,
  "expected_due_at" timestamp with time zone,
  "committed_due_at" timestamp with time zone,
  "note" text,
  "payload" jsonb not null default '{}'::jsonb,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."work_item_links" (
  "id" bigint not null default nextval('work_item_links_id_seq'::regclass),
  "work_item_id" text not null,
  "target_table" text not null,
  "target_id" text not null,
  "relation_type" text not null default 'related'::text,
  "created_at" timestamp with time zone not null default now()
);

create table "public"."work_items" (
  "id" uuid not null default gen_random_uuid(),
  "title" text not null,
  "description" text,
  "object_type" text,
  "object_id" uuid,
  "owner_user_id" uuid,
  "owner_role" text,
  "status" work_item_status_enum not null default 'open'::work_item_status_enum,
  "priority" severity_enum not null default 'medium'::severity_enum,
  "due_at" timestamp with time zone,
  "metadata" jsonb not null default '{}'::jsonb,
  "created_by" uuid,
  "updated_by" uuid,
  "created_at" timestamp with time zone not null default now(),
  "updated_at" timestamp with time zone not null default now()
);

create table "public"."workflow_definitions" (
  "id" text not null,
  "workflow_key" text,
  "name" text,
  "entity_table" text,
  "states" jsonb,
  "transitions" jsonb,
  "created_at" timestamp with time zone default now()
);

create table "public"."workflow_gate_checks" (
  "id" uuid not null default gen_random_uuid(),
  "scope" character varying(64) not null,
  "target_table" character varying(128),
  "target_id" uuid,
  "passed" boolean not null default false,
  "blockers" jsonb not null default '[]'::jsonb,
  "warnings" jsonb not null default '[]'::jsonb,
  "checked_by" character varying(255),
  "created_at" timestamp with time zone not null default now(),
  "raw_values" jsonb default '{}'::jsonb,
  "deleted_at" timestamp with time zone,
  "deleted_by" character varying(255),
  "target_key" character varying(128),
  "gate_key" character varying(128),
  "owner_role" character varying(64),
  "override_approved" boolean not null default false,
  "override_reason" text,
  "override_approved_by" character varying(255),
  "override_approved_at" timestamp with time zone
);

-- PG_OS_APPLICATION_MANAGED constraints (non-FK)
alter table "public"."activity_logs" add constraint "activity_logs_pkey" PRIMARY KEY (id);
alter table "public"."advertiser_bidding_monitor" add constraint "advertiser_bidding_monitor_pkey" PRIMARY KEY (id);
alter table "public"."advertiser_contacts" add constraint "advertiser_contacts_pkey" PRIMARY KEY (id);
alter table "public"."advertiser_contracts" add constraint "advertiser_contracts_pkey" PRIMARY KEY (id);
alter table "public"."advertiser_followup_log" add constraint "advertiser_followup_log_pkey" PRIMARY KEY (id);
alter table "public"."advertiser_invoices" add constraint "advertiser_invoices_pkey" PRIMARY KEY (id);
alter table "public"."advertiser_master" add constraint "advertiser_master_pkey" PRIMARY KEY (id);
alter table "public"."advertiser_opportunities" add constraint "advertiser_opportunities_pkey" PRIMARY KEY (id);
alter table "public"."advertiser_performance" add constraint "advertiser_performance_pkey" PRIMARY KEY (id);
alter table "public"."advertiser_receivables" add constraint "advertiser_receivables_pkey" PRIMARY KEY (id);
alter table "public"."advertiser_strategy" add constraint "advertiser_strategy_pkey" PRIMARY KEY (id);
alter table "public"."advertisers" add constraint "advertisers_pkey" PRIMARY KEY (id);
alter table "public"."api_comparison_results" add constraint "api_comparison_results_pkey" PRIMARY KEY (id);
alter table "public"."api_comparison_runs" add constraint "api_comparison_runs_pkey" PRIMARY KEY (id);
alter table "public"."api_doc_endpoints" add constraint "api_doc_endpoints_pkey" PRIMARY KEY (id);
alter table "public"."api_doc_fields" add constraint "api_doc_fields_pkey" PRIMARY KEY (id);
alter table "public"."api_doc_fields" add constraint "unique_endpoint_field" UNIQUE (endpoint_id, field_path);
alter table "public"."api_traffic_captures" add constraint "api_traffic_captures_pkey" PRIMARY KEY (id);
alter table "public"."app_profile_raw" add constraint "app_profile_raw_pkey" PRIMARY KEY (id);
alter table "public"."app_research_tasks" add constraint "app_research_tasks_pkey" PRIMARY KEY (id);
alter table "public"."app_research_tasks" add constraint "app_research_tasks_task_no_key" UNIQUE (task_no);
alter table "public"."app_source_checks" add constraint "app_source_checks_pkey" PRIMARY KEY (id);
alter table "public"."approval_requests" add constraint "approval_requests_pkey" PRIMARY KEY (id);
alter table "public"."approvals" add constraint "approvals_pkey" PRIMARY KEY (id);
alter table "public"."assessment_dimensions" add constraint "assessment_dimensions_pkey" PRIMARY KEY (id);
alter table "public"."assessment_dimensions" add constraint "unique_model_dim" UNIQUE (model_id, dim_key);
alter table "public"."assessment_evaluations" add constraint "assessment_evaluations_pkey" PRIMARY KEY (id);
alter table "public"."assessment_input_documents" add constraint "assessment_input_documents_pkey" PRIMARY KEY (id);
alter table "public"."assessment_models" add constraint "assessment_models_model_key_key" UNIQUE (model_key);
alter table "public"."assessment_models" add constraint "assessment_models_pkey" PRIMARY KEY (id);
alter table "public"."assessment_models" add constraint "unique_media_phase_model" UNIQUE (media_type, assessment_phase, version);
alter table "public"."assessment_redlines" add constraint "assessment_redlines_pkey" PRIMARY KEY (id);
alter table "public"."assessment_redlines" add constraint "unique_model_redline" UNIQUE (model_id, redline_key);
alter table "public"."assessment_rules" add constraint "assessment_rules_pkey" PRIMARY KEY (id);
alter table "public"."assessment_rules" add constraint "unique_dim_rule" UNIQUE (dimension_id, rule_key);
alter table "public"."attachments" add constraint "attachments_pkey" PRIMARY KEY (id);
alter table "public"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY (id);
alter table "public"."audit_logs" add constraint "chk_audit_action_not_empty" CHECK ((length(TRIM(BOTH FROM action)) > 0));
alter table "public"."auto_research_inbox" add constraint "auto_research_inbox_pkey" PRIMARY KEY (id);
alter table "public"."automation_inbox" add constraint "automation_inbox_pkey" PRIMARY KEY (id);
alter table "public"."business_handoffs" add constraint "business_handoffs_pkey" PRIMARY KEY (id);
alter table "public"."business_object_timeline" add constraint "business_object_timeline_pkey" PRIMARY KEY (id);
alter table "public"."business_orders" add constraint "business_orders_pkey" PRIMARY KEY (id);
alter table "public"."business_side_effect_outbox" add constraint "business_side_effect_outbox_pkey" PRIMARY KEY (id);
alter table "public"."campaign_creatives" add constraint "campaign_creatives_pkey" PRIMARY KEY (id);
alter table "public"."campaign_daily_reports" add constraint "campaign_daily_reports_pkey" PRIMARY KEY (id);
alter table "public"."campaign_daily_reports" add constraint "campaign_daily_reports_report_date_key" UNIQUE (report_date);
alter table "public"."campaign_delivery_daily" add constraint "campaign_delivery_daily_pkey" PRIMARY KEY (id);
alter table "public"."campaign_demands" add constraint "campaign_demands_pkey" PRIMARY KEY (id);
alter table "public"."campaign_executions" add constraint "campaign_executions_pkey" PRIMARY KEY (id);
alter table "public"."campaign_flights" add constraint "campaign_flights_pkey" PRIMARY KEY (id);
alter table "public"."campaign_launch_checks" add constraint "campaign_launch_checks_campaign_id_publisher_id_check_item_key" UNIQUE (campaign_id, publisher_id, check_item);
alter table "public"."campaign_launch_checks" add constraint "campaign_launch_checks_pkey" PRIMARY KEY (id);
alter table "public"."campaign_line_items" add constraint "campaign_line_items_pkey" PRIMARY KEY (id);
alter table "public"."campaign_media_allocations" add constraint "campaign_media_allocations_pkey" PRIMARY KEY (id);
alter table "public"."campaign_reviews" add constraint "campaign_reviews_pkey" PRIMARY KEY (id);
alter table "public"."campaign_tracking_checks" add constraint "campaign_tracking_checks_pkey" PRIMARY KEY (id);
alter table "public"."campaigns" add constraint "campaigns_pkey" PRIMARY KEY (id);
alter table "public"."campaigns" add constraint "chk_campaign_dates" CHECK ((((start_date IS NULL) AND (end_date IS NULL)) OR ((start_date IS NOT NULL) AND (end_date IS NOT NULL) AND (end_date >= start_date))));
alter table "public"."campaigns" add constraint "chk_campaign_status_valid" CHECK ((status = ANY (ARRAY['draft'::campaign_status_enum, 'launch_check'::campaign_status_enum, 'pending_approval'::campaign_status_enum, 'approved'::campaign_status_enum, 'live'::campaign_status_enum, 'paused'::campaign_status_enum, 'completed'::campaign_status_enum, 'cancelled'::campaign_status_enum, 'blocked'::campaign_status_enum])));
alter table "public"."capability_tags" add constraint "capability_tags_pkey" PRIMARY KEY (code);
alter table "public"."channel_technical_profiles" add constraint "channel_technical_profiles_channel_type_check" CHECK (((channel_type)::text = ANY ((ARRAY['mobile_app'::character varying, 'ctv'::character varying, 'dooh'::character varying, 'web'::character varying, 'openrtb'::character varying, 'vast'::character varying, 'sdk'::character varying, 'api'::character varying])::text[])));
alter table "public"."channel_technical_profiles" add constraint "channel_technical_profiles_pkey" PRIMARY KEY (id);
alter table "public"."checklist_templates" add constraint "checklist_templates_pkey" PRIMARY KEY (id);
alter table "public"."checklist_templates" add constraint "unique_template" UNIQUE (media_type, stage_key, check_key);
alter table "public"."comments" add constraint "comments_pkey" PRIMARY KEY (id);
alter table "public"."commercial_proposals" add constraint "commercial_proposals_pkey" PRIMARY KEY (id);
alter table "public"."commercial_tests" add constraint "chk_commercial_test_dates" CHECK ((((start_date IS NULL) AND (end_date IS NULL)) OR ((start_date IS NOT NULL) AND (end_date IS NOT NULL) AND (end_date >= start_date))));
alter table "public"."commercial_tests" add constraint "chk_commercial_tests_test_plan_object" CHECK ((jsonb_typeof(test_plan) = 'object'::text));
alter table "public"."commercial_tests" add constraint "commercial_tests_pkey" PRIMARY KEY (id);
alter table "public"."contracts" add constraint "contracts_pkey" PRIMARY KEY (id);
alter table "public"."data_quality_checks" add constraint "data_quality_checks_pkey" PRIMARY KEY (id);
alter table "public"."data_reconciliation_results" add constraint "data_reconciliation_results_pkey" PRIMARY KEY (id);
alter table "public"."data_reconciliation_results" add constraint "unique_session_metric" UNIQUE (session_id, metric_key);
alter table "public"."evaluation_scoring_rules" add constraint "evaluation_scoring_rules_pkey" PRIMARY KEY (id);
alter table "public"."evaluation_scoring_rules" add constraint "evaluation_scoring_rules_rule_name_key" UNIQUE (rule_name);
alter table "public"."field_access_policies" add constraint "field_access_policies_pkey" PRIMARY KEY (id);
alter table "public"."field_access_policies" add constraint "field_access_policies_resource_field_name_key" UNIQUE (resource, field_name);
alter table "public"."files" add constraint "files_pkey" PRIMARY KEY (id);
alter table "public"."finance_business_chain_snapshots" add constraint "finance_business_chain_snapshots_chain_key_key" UNIQUE (chain_key);
alter table "public"."finance_business_chain_snapshots" add constraint "finance_business_chain_snapshots_pkey" PRIMARY KEY (id);
alter table "public"."finance_exceptions" add constraint "finance_exceptions_pkey" PRIMARY KEY (id);
alter table "public"."finance_ledger_entries" add constraint "finance_ledger_entries_pkey" PRIMARY KEY (id);
alter table "public"."finance_reconciliation_items" add constraint "finance_reconciliation_items_period_key" UNIQUE (period);
alter table "public"."finance_reconciliation_items" add constraint "finance_reconciliation_items_pkey" PRIMARY KEY (id);
alter table "public"."governance_rule_source_registry" add constraint "governance_rule_source_registry_pkey" PRIMARY KEY (id);
alter table "public"."governance_rule_source_registry" add constraint "governance_rule_source_registry_rule_key_key" UNIQUE (rule_key);
alter table "public"."integration_check_results" add constraint "chk_integration_check_blocker" CHECK (((status <> ALL (ARRAY['blocked'::text, 'failed'::text])) OR (NULLIF(btrim(blocker), ''::text) IS NOT NULL)));
alter table "public"."integration_check_results" add constraint "chk_integration_check_pass_evidence" CHECK (((status <> 'passed'::text) OR (NULLIF(btrim(evidence_reference), ''::text) IS NOT NULL)));
alter table "public"."integration_check_results" add constraint "chk_integration_check_responsible_party" CHECK (((responsible_party IS NULL) OR (responsible_party = ANY (ARRAY['MEDIA_ENGINEERING'::text, 'PG_OS'::text]))));
alter table "public"."integration_check_results" add constraint "chk_integration_check_status" CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'blocked'::text, 'passed'::text, 'failed'::text, 'waived'::text])));
alter table "public"."integration_check_results" add constraint "chk_integration_check_waiver" CHECK (((status <> 'waived'::text) OR (NULLIF(btrim(waiver_reason), ''::text) IS NOT NULL)));
alter table "public"."integration_check_results" add constraint "integration_check_results_pkey" PRIMARY KEY (id);
alter table "public"."integration_check_results" add constraint "uq_integration_check_result" UNIQUE (integration_project_id, item_code);
alter table "public"."integration_checklists" add constraint "integration_checklists_pkey" PRIMARY KEY (id);
alter table "public"."integration_project_profiles" add constraint "chk_integration_profile_language" CHECK (((language IS NULL) OR (language = ANY (ARRAY['java'::text, 'kotlin'::text, 'mixed'::text]))));
alter table "public"."integration_project_profiles" add constraint "chk_integration_profile_platform" CHECK ((platform = ANY (ARRAY['android'::text, 'android_tv'::text, 'other'::text])));
alter table "public"."integration_project_profiles" add constraint "chk_integration_profile_playbooks" CHECK ((cardinality(playbook_codes) > 0));
alter table "public"."integration_project_profiles" add constraint "chk_integration_profile_privacy_object" CHECK ((jsonb_typeof(privacy_profile) = 'object'::text));
alter table "public"."integration_project_profiles" add constraint "chk_integration_profile_process_model" CHECK (((process_model IS NULL) OR (process_model = ANY (ARRAY['single_process'::text, 'multi_process'::text]))));
alter table "public"."integration_project_profiles" add constraint "chk_integration_profile_sdk_versions" CHECK ((((min_sdk IS NULL) OR ((min_sdk >= 1) AND (min_sdk <= 100))) AND ((target_sdk IS NULL) OR ((target_sdk >= 1) AND (target_sdk <= 100))) AND ((compile_sdk IS NULL) OR ((compile_sdk >= 1) AND (compile_sdk <= 100))) AND ((min_sdk IS NULL) OR (target_sdk IS NULL) OR (min_sdk <= target_sdk)) AND ((target_sdk IS NULL) OR (compile_sdk IS NULL) OR (target_sdk <= compile_sdk))));
alter table "public"."integration_project_profiles" add constraint "chk_integration_profile_secret_reference" CHECK (((secret_reference IS NULL) OR (secret_reference ~* '^(vault|secret|env|vercel|supabase)://[a-z0-9/_-]+$'::text)));
alter table "public"."integration_project_profiles" add constraint "integration_project_profiles_integration_project_id_key" UNIQUE (integration_project_id);
alter table "public"."integration_project_profiles" add constraint "integration_project_profiles_pkey" PRIMARY KEY (id);
alter table "public"."integration_projects" add constraint "chk_integration_go_live_date" CHECK (((status <> 'technical_live_passed'::technical_live_status_enum) OR ((status = 'technical_live_passed'::technical_live_status_enum) AND (go_live_date IS NOT NULL))));
alter table "public"."integration_projects" add constraint "chk_integration_projects_evidence_array" CHECK ((jsonb_typeof(evidence) = 'array'::text));
alter table "public"."integration_projects" add constraint "chk_integration_projects_handoff_status" CHECK ((handoff_status = ANY (ARRAY['draft'::text, 'submitted'::text, 'accepted'::text, 'changes_requested'::text])));
alter table "public"."integration_projects" add constraint "integration_projects_pkey" PRIMARY KEY (id);
alter table "public"."invoices" add constraint "invoices_pkey" PRIMARY KEY (id);
alter table "public"."issue_logs" add constraint "issue_logs_pkey" PRIMARY KEY (id);
alter table "public"."job_runs" add constraint "job_runs_pkey" PRIMARY KEY (id);
alter table "public"."kpi_snapshots" add constraint "kpi_snapshots_period_role_scope_metric_key_key" UNIQUE (period, role_scope, metric_key);
alter table "public"."kpi_snapshots" add constraint "kpi_snapshots_pkey" PRIMARY KEY (id);
alter table "public"."kpi_targets" add constraint "kpi_targets_pkey" PRIMARY KEY (id);
alter table "public"."live_test_hourly_logs" add constraint "live_test_hourly_logs_hour_offset_check" CHECK (((hour_offset >= 0) AND (hour_offset <= 23)));
alter table "public"."live_test_hourly_logs" add constraint "live_test_hourly_logs_pkey" PRIMARY KEY (id);
alter table "public"."live_test_hourly_logs" add constraint "unique_session_hour" UNIQUE (session_id, hour_offset);
alter table "public"."live_test_sessions" add constraint "live_test_sessions_pkey" PRIMARY KEY (id);
alter table "public"."management_action_queue" add constraint "management_action_queue_action_key_source_table_source_id_key" UNIQUE (action_key, source_table, source_id);
alter table "public"."management_action_queue" add constraint "management_action_queue_pkey" PRIMARY KEY (id);
alter table "public"."media_assets" add constraint "media_assets_pkey" PRIMARY KEY (id);
alter table "public"."media_budget_allocation_tiers" add constraint "media_budget_allocation_tiers_pkey" PRIMARY KEY (id);
alter table "public"."media_budget_allocation_tiers" add constraint "unique_media_tier" UNIQUE (media_id, tier);
alter table "public"."media_budget_evaluations" add constraint "media_budget_evaluations_pkey" PRIMARY KEY (id);
alter table "public"."media_budget_pools" add constraint "media_budget_pools_pkey" PRIMARY KEY (id);
alter table "public"."media_compliance" add constraint "media_compliance_pkey" PRIMARY KEY (id);
alter table "public"."media_contacts" add constraint "media_contacts_pkey" PRIMARY KEY (id);
alter table "public"."media_contract_attachments" add constraint "media_contract_attachments_pkey" PRIMARY KEY (id);
alter table "public"."media_contract_orders" add constraint "media_contract_orders_pkey" PRIMARY KEY (id);
alter table "public"."media_contracts" add constraint "media_contracts_pkey" PRIMARY KEY (id);
alter table "public"."media_ecosystem_conversion_logs" add constraint "chk_media_ecosystem_conversion_type" CHECK ((conversion_type = ANY (ARRAY['seed_import'::text, 'owner_assignment'::text, 'stage_change'::text, 'trusted_supply_candidate'::text, 'publisher_onboarding'::text, 'rejected'::text, 'on_hold'::text])));
alter table "public"."media_ecosystem_conversion_logs" add constraint "media_ecosystem_conversion_logs_pkey" PRIMARY KEY (id);
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_candidate_gate" CHECK (((trusted_supply_candidate = false) OR ((data_quality_level <> 'SEED_ONLY'::text) AND (priority_score >= 70) AND (media_contact_confirmed = true) AND (business_interest_confirmed = true) AND (ad_inventory_identified = true) AND (integration_feasibility <> 'impossible'::text) AND (media_director_approved_at IS NOT NULL))));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_data_quality" CHECK ((data_quality_level = ANY (ARRAY['SEED_ONLY'::text, 'MANUAL_REVIEWED'::text, 'OPERATOR_CONFIRMED'::text, 'SOURCE_VERIFIED'::text])));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_deal_ready_status" CHECK ((deal_ready_status = ANY (ARRAY['NOT_READY'::text, 'REVIEW_REQUIRED'::text, 'READY'::text, 'REJECTED'::text])));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_integration_feasibility" CHECK ((integration_feasibility = ANY (ARRAY['unknown'::text, 'feasible'::text, 'needs_work'::text, 'impossible'::text])));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_priority_level" CHECK ((priority_level = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text, 'UNSCORED'::text])));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_recommended_trading_mode" CHECK ((recommended_trading_mode = ANY (ARRAY['NEEDS_REVIEW'::text, 'PREFERRED_DEAL'::text, 'PRIVATE_AUCTION'::text, 'CURATED_PACKAGE'::text, 'PROGRAMMATIC_GUARANTEED'::text, 'FIXED_CPM_TEST'::text, 'DIRECT_IO'::text, 'NOT_RECOMMENDED'::text])));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_score_bounds" CHECK ((((strategic_segment_score >= 0) AND (strategic_segment_score <= 20)) AND ((user_scale_score >= 0) AND (user_scale_score <= 15)) AND ((ad_context_score >= 0) AND (ad_context_score <= 15)) AND ((integration_feasibility_score >= 0) AND (integration_feasibility_score <= 15)) AND ((advertiser_demand_score >= 0) AND (advertiser_demand_score <= 15)) AND ((commercial_feasibility_score >= 0) AND (commercial_feasibility_score <= 10)) AND ((risk_control_score >= 0) AND (risk_control_score <= 10))));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_seed_only_safety" CHECK (((data_quality_level <> 'SEED_ONLY'::text) OR ((verification_status = 'UNVERIFIED'::text) AND (trust_status = 'NOT_VERIFIED'::text) AND (trusted_supply_candidate = false) AND (deal_ready_status = 'NOT_READY'::text) AND (recommended_trading_mode = 'NEEDS_REVIEW'::text))));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_seed_priority" CHECK (((seed_priority_level IS NULL) OR (seed_priority_level = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'D'::text]))));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_status" CHECK ((ecosystem_status = ANY (ARRAY['ECOSYSTEM_MAPPED'::text, 'PRIORITY_SCREENED'::text, 'OUTREACH_READY'::text, 'CONTACTED'::text, 'MEETING_SCHEDULED'::text, 'BUSINESS_QUALIFIED'::text, 'TECH_FEASIBILITY_CHECK'::text, 'TRUSTED_SUPPLY_CANDIDATE'::text, 'ONBOARDING_PROJECT_CREATED'::text, 'REJECTED'::text, 'ON_HOLD'::text])));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_trust_status" CHECK ((trust_status = ANY (ARRAY['NOT_VERIFIED'::text, 'TRUST_REVIEW'::text, 'TRUSTED'::text, 'REJECTED'::text])));
alter table "public"."media_ecosystem_opportunities" add constraint "chk_media_ecosystem_verification_status" CHECK ((verification_status = ANY (ARRAY['UNVERIFIED'::text, 'IN_REVIEW'::text, 'VERIFIED'::text, 'REJECTED'::text])));
alter table "public"."media_ecosystem_opportunities" add constraint "media_ecosystem_opportunities_pkey" PRIMARY KEY (id);
alter table "public"."media_ecosystem_opportunities" add constraint "media_ecosystem_opportunities_seed_id_key" UNIQUE (seed_id);
alter table "public"."media_ecosystem_outreach_activities" add constraint "media_ecosystem_outreach_activities_pkey" PRIMARY KEY (id);
alter table "public"."media_ecosystem_segments" add constraint "chk_media_ecosystem_segment_code" CHECK ((segment_code = ANY (ARRAY['VIDEO_LONG_FORM'::text, 'SHORT_VIDEO_LIVE'::text, 'NEWS_SEARCH_BROWSER'::text, 'SOCIAL_COMMUNITY'::text, 'ECOMMERCE_RETAIL_MEDIA'::text, 'LOCAL_LIFE_TRAVEL'::text, 'GAME_H5_IAA'::text, 'WELLNESS_FEMALE_HEALTH'::text, 'UTILITY_TOOLS'::text, 'CTV_OTT_OEM'::text, 'SMART_HARDWARE'::text, 'AUDIO_PODCAST'::text, 'CAMPUS_YOUTH'::text, 'OUTDOOR_DOOH'::text, 'AI_APP_CONTENT'::text, 'OTHER_VERTICAL'::text])));
alter table "public"."media_ecosystem_segments" add constraint "media_ecosystem_segments_pkey" PRIMARY KEY (id);
alter table "public"."media_ecosystem_segments" add constraint "media_ecosystem_segments_segment_code_key" UNIQUE (segment_code);
alter table "public"."media_followup_logs" add constraint "media_followup_logs_pkey" PRIMARY KEY (id);
alter table "public"."media_inventory" add constraint "media_inventory_pkey" PRIMARY KEY (id);
alter table "public"."media_lead_inbox" add constraint "media_lead_inbox_pkey" PRIMARY KEY (id);
alter table "public"."media_master" add constraint "media_master_pkey" PRIMARY KEY (id);
alter table "public"."media_monitoring_alerts" add constraint "media_monitoring_alerts_pkey" PRIMARY KEY (id);
alter table "public"."media_onboarding_projects" add constraint "media_onboarding_projects_pkey" PRIMARY KEY (id);
alter table "public"."media_onboarding_stage_gates" add constraint "chk_media_onboarding_stage_gate_approval" CHECK (((status <> 'approved'::text) OR ((submitted_at IS NOT NULL) AND (approved_by IS NOT NULL) AND (approved_by_role IS NOT NULL) AND (approved_at IS NOT NULL))));
alter table "public"."media_onboarding_stage_gates" add constraint "chk_media_onboarding_stage_gate_deliverables" CHECK ((jsonb_typeof(deliverables) = 'array'::text));
alter table "public"."media_onboarding_stage_gates" add constraint "chk_media_onboarding_stage_gate_kpi_evidence" CHECK ((jsonb_typeof(kpi_evidence) = 'array'::text));
alter table "public"."media_onboarding_stage_gates" add constraint "chk_media_onboarding_stage_gate_object_type" CHECK ((lifecycle_object_type = ANY (ARRAY['media_ecosystem_lead'::text, 'trusted_supply_candidate'::text, 'publisher'::text])));
alter table "public"."media_onboarding_stage_gates" add constraint "chk_media_onboarding_stage_gate_rejection" CHECK (((status <> 'rejected'::text) OR (NULLIF(btrim(blocker), ''::text) IS NOT NULL)));
alter table "public"."media_onboarding_stage_gates" add constraint "chk_media_onboarding_stage_gate_stage" CHECK ((stage = ANY (ARRAY['MEDIA_DISCOVERY'::text, 'BUSINESS_QUALIFICATION'::text, 'COMMERCIAL_AGREEMENT'::text, 'TECHNICAL_QUALIFICATION'::text, 'SDK_INTEGRATION'::text, 'QA_CERTIFICATION'::text, 'PILOT'::text, 'PRODUCTION_LAUNCH'::text, 'SCALE_OPERATION'::text])));
alter table "public"."media_onboarding_stage_gates" add constraint "chk_media_onboarding_stage_gate_status" CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'blocked'::text, 'ready_for_approval'::text, 'approved'::text, 'rejected'::text])));
alter table "public"."media_onboarding_stage_gates" add constraint "media_onboarding_stage_gates_pkey" PRIMARY KEY (id);
alter table "public"."media_onboarding_stage_gates" add constraint "uq_media_onboarding_stage_gate" UNIQUE (lifecycle_object_type, lifecycle_object_id, stage);
alter table "public"."media_package_rate_cards" add constraint "media_package_rate_cards_pkey" PRIMARY KEY (id);
alter table "public"."media_payables" add constraint "media_payables_pkey" PRIMARY KEY (id);
alter table "public"."media_payment_gate_results" add constraint "media_payment_gate_results_pkey" PRIMARY KEY (id);
alter table "public"."media_payment_gate_results" add constraint "media_payment_gate_results_settlement_id_gate_key_key" UNIQUE (settlement_id, gate_key);
alter table "public"."media_quality_scores" add constraint "media_quality_scores_media_id_key" UNIQUE (media_id);
alter table "public"."media_quality_scores" add constraint "media_quality_scores_pkey" PRIMARY KEY (id);
alter table "public"."media_revenue_performance" add constraint "media_revenue_performance_pkey" PRIMARY KEY (id);
alter table "public"."media_settlements" add constraint "media_settlements_pkey" PRIMARY KEY (id);
alter table "public"."media_strategy" add constraint "media_strategy_pkey" PRIMARY KEY (id);
alter table "public"."media_supply_daily_snapshots" add constraint "media_supply_daily_snapshots_pkey" PRIMARY KEY (id);
alter table "public"."media_supply_packages" add constraint "chk_media_supply_ad_formats_array" CHECK ((jsonb_typeof(ad_formats) = 'array'::text));
alter table "public"."media_supply_packages" add constraint "chk_media_supply_fit_tags_array" CHECK ((jsonb_typeof(advertiser_fit_tags) = 'array'::text));
alter table "public"."media_supply_packages" add constraint "chk_media_supply_package_pool" CHECK ((pool = ANY (ARRAY['opportunity'::text, 'test'::text, 'core'::text, 'risk'::text, 'suspended'::text])));
alter table "public"."media_supply_packages" add constraint "chk_media_supply_package_status" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'retired'::text])));
alter table "public"."media_supply_packages" add constraint "chk_media_supply_placements_array" CHECK ((jsonb_typeof(placement_types) = 'array'::text));
alter table "public"."media_supply_packages" add constraint "chk_media_supply_risk_notes_array" CHECK ((jsonb_typeof(risk_notes) = 'array'::text));
alter table "public"."media_supply_packages" add constraint "media_supply_packages_pkey" PRIMARY KEY (id);
alter table "public"."media_tech_integrations" add constraint "media_tech_integrations_pkey" PRIMARY KEY (id);
alter table "public"."media_traffic_quality" add constraint "media_traffic_quality_pkey" PRIMARY KEY (id);
alter table "public"."media_trust_profiles" add constraint "chk_media_trust_breakdown_object" CHECK ((jsonb_typeof(score_breakdown) = 'object'::text));
alter table "public"."media_trust_profiles" add constraint "chk_media_trust_confirmed_pool" CHECK (((confirmed_pool IS NULL) OR (confirmed_pool = ANY (ARRAY['opportunity'::text, 'test'::text, 'core'::text, 'risk'::text, 'suspended'::text]))));
alter table "public"."media_trust_profiles" add constraint "chk_media_trust_fit_tags_array" CHECK ((jsonb_typeof(advertiser_fit_tags) = 'array'::text));
alter table "public"."media_trust_profiles" add constraint "chk_media_trust_level" CHECK ((trust_level = ANY (ARRAY['S'::text, 'A'::text, 'B'::text, 'C'::text, 'D'::text])));
alter table "public"."media_trust_profiles" add constraint "chk_media_trust_profile_status" CHECK ((status = ANY (ARRAY['draft'::text, 'evaluated'::text, 'confirmed'::text, 'monitoring'::text])));
alter table "public"."media_trust_profiles" add constraint "chk_media_trust_reasons_array" CHECK ((jsonb_typeof(recommendation_reasons) = 'array'::text));
alter table "public"."media_trust_profiles" add constraint "chk_media_trust_risks_array" CHECK ((jsonb_typeof(risk_warnings) = 'array'::text));
alter table "public"."media_trust_profiles" add constraint "chk_media_trust_score" CHECK (((total_score >= 0) AND (total_score <= 100)));
alter table "public"."media_trust_profiles" add constraint "chk_media_trust_suggested_pool" CHECK ((suggested_pool = ANY (ARRAY['opportunity'::text, 'test'::text, 'core'::text, 'risk'::text, 'suspended'::text])));
alter table "public"."media_trust_profiles" add constraint "media_trust_profiles_pkey" PRIMARY KEY (id);
alter table "public"."media_trust_profiles" add constraint "media_trust_profiles_publisher_id_key" UNIQUE (publisher_id);
alter table "public"."media_trust_score_history" add constraint "chk_media_trust_history_level" CHECK ((trust_level = ANY (ARRAY['S'::text, 'A'::text, 'B'::text, 'C'::text, 'D'::text])));
alter table "public"."media_trust_score_history" add constraint "chk_media_trust_history_pool" CHECK ((suggested_pool = ANY (ARRAY['opportunity'::text, 'test'::text, 'core'::text, 'risk'::text, 'suspended'::text])));
alter table "public"."media_trust_score_history" add constraint "chk_media_trust_history_score" CHECK (((total_score >= 0) AND (total_score <= 100)));
alter table "public"."media_trust_score_history" add constraint "media_trust_score_history_pkey" PRIMARY KEY (id);
alter table "public"."metric_definitions" add constraint "metric_definitions_metric_key_key" UNIQUE (metric_key);
alter table "public"."metric_definitions" add constraint "metric_definitions_pkey" PRIMARY KEY (id);
alter table "public"."metric_funnel_snapshots" add constraint "metric_funnel_snapshots_pkey" PRIMARY KEY (id);
alter table "public"."metric_snapshots" add constraint "metric_snapshots_metric_key_snapshot_date_scope_key" UNIQUE (metric_key, snapshot_date, scope);
alter table "public"."metric_snapshots" add constraint "metric_snapshots_pkey" PRIMARY KEY (id);
alter table "public"."module_business_events" add constraint "module_business_events_pkey" PRIMARY KEY (id);
alter table "public"."notification_acknowledgements" add constraint "notification_acknowledgements_pkey" PRIMARY KEY (id);
alter table "public"."notification_logs" add constraint "notification_logs_pkey" PRIMARY KEY (id);
alter table "public"."notification_outbox" add constraint "notification_outbox_pkey" PRIMARY KEY (id);
alter table "public"."notifications" add constraint "chk_notification_title" CHECK ((length(TRIM(BOTH FROM title)) > 0));
alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY (id);
alter table "public"."okr_checkins" add constraint "okr_checkins_pkey" PRIMARY KEY (id);
alter table "public"."okr_key_results" add constraint "okr_key_results_pkey" PRIMARY KEY (id);
alter table "public"."okr_objectives" add constraint "chk_okr_period_not_empty" CHECK ((length(TRIM(BOTH FROM period)) > 0));
alter table "public"."okr_objectives" add constraint "okr_objectives_pkey" PRIMARY KEY (id);
alter table "public"."onboarding_checklist_items" add constraint "onboarding_checklist_items_pkey" PRIMARY KEY (id);
alter table "public"."onboarding_checklist_items" add constraint "unique_stage_check" UNIQUE (stage_record_id, check_key);
alter table "public"."onboarding_gate_results" add constraint "onboarding_gate_results_pkey" PRIMARY KEY (id);
alter table "public"."onboarding_gate_results" add constraint "unique_onboarding_gate" UNIQUE (onboarding_id, gate_type);
alter table "public"."onboarding_stage_records" add constraint "onboarding_stage_records_pkey" PRIMARY KEY (id);
alter table "public"."onboarding_stage_records" add constraint "unique_onboarding_stage" UNIQUE (onboarding_id, stage_key);
alter table "public"."opportunities" add constraint "chk_opportunity_stage" CHECK ((stage = ANY (ARRAY['discovery'::text, 'need_confirmed'::text, 'proposal_drafting'::text, 'proposal_review'::text, 'won'::text, 'lost'::text])));
alter table "public"."opportunities" add constraint "opportunities_pkey" PRIMARY KEY (id);
alter table "public"."owner_identity_resolution_exceptions" add constraint "owner_identity_resolution_exceptions_pkey" PRIMARY KEY (id);
alter table "public"."payment_collections" add constraint "payment_collections_pkey" PRIMARY KEY (id);
alter table "public"."pgos_export_logs" add constraint "pgos_export_logs_pkey" PRIMARY KEY (id);
alter table "public"."pgos_generated_reports" add constraint "pgos_generated_reports_pkey" PRIMARY KEY (id);
alter table "public"."pgos_import_batches" add constraint "pgos_import_batches_pkey" PRIMARY KEY (id);
alter table "public"."pgos_production_hardening_items" add constraint "pgos_production_hardening_items_pkey" PRIMARY KEY (id);
alter table "public"."pgos_remediation_closure_items" add constraint "pgos_remediation_closure_items_completion_rate_check" CHECK (((completion_rate >= 0) AND (completion_rate <= 100)));
alter table "public"."pgos_remediation_closure_items" add constraint "pgos_remediation_closure_items_item_code_key" UNIQUE (item_code);
alter table "public"."pgos_remediation_closure_items" add constraint "pgos_remediation_closure_items_pkey" PRIMARY KEY (id);
alter table "public"."pgos_remediation_closure_items" add constraint "pgos_remediation_closure_items_priority_check" CHECK (((priority)::text = ANY ((ARRAY['P0'::character varying, 'P1'::character varying, 'P2'::character varying])::text[])));
alter table "public"."pgos_schema_migrations" add constraint "pgos_schema_migrations_pkey" PRIMARY KEY (version);
alter table "public"."pgos_sessions" add constraint "pgos_sessions_pkey" PRIMARY KEY (id);
alter table "public"."pgos_users" add constraint "pgos_users_email_key" UNIQUE (email);
alter table "public"."pgos_users" add constraint "pgos_users_pkey" PRIMARY KEY (id);
alter table "public"."production_runtime_acceptance_runs" add constraint "production_runtime_acceptance_runs_pkey" PRIMARY KEY (id);
alter table "public"."production_runtime_acceptance_runs" add constraint "production_runtime_acceptance_runs_run_key_key" UNIQUE (run_key);
alter table "public"."profiles" add constraint "chk_profile_email_format" CHECK ((email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text));
alter table "public"."profiles" add constraint "profiles_email_key" UNIQUE (email);
alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);
alter table "public"."proposal_media_selections" add constraint "proposal_media_selections_pkey" PRIMARY KEY (id);
alter table "public"."proposal_media_selections" add constraint "proposal_media_selections_proposal_id_publisher_id_ad_slot__key" UNIQUE (proposal_id, publisher_id, ad_slot_id);
alter table "public"."proposals" add constraint "chk_proposal_status_valid" CHECK ((status = ANY (ARRAY['draft'::proposal_status_enum, 'media_validation'::proposal_status_enum, 'internal_review'::proposal_status_enum, 'approved_to_send'::proposal_status_enum, 'sent_to_client'::proposal_status_enum, 'client_feedback'::proposal_status_enum, 'won'::proposal_status_enum, 'lost'::proposal_status_enum, 'cancelled'::proposal_status_enum])));
alter table "public"."proposals" add constraint "proposals_pkey" PRIMARY KEY (id);
alter table "public"."publisher_ad_slots" add constraint "publisher_ad_slots_pkey" PRIMARY KEY (id);
alter table "public"."publisher_contacts" add constraint "publisher_contacts_pkey" PRIMARY KEY (id);
alter table "public"."publisher_contract_terms" add constraint "publisher_contract_terms_pkey" PRIMARY KEY (id);
alter table "public"."publisher_readiness_snapshots" add constraint "publisher_readiness_snapshots_pkey" PRIMARY KEY (id);
alter table "public"."publisher_supply_transparency" add constraint "publisher_supply_transparency_pkey" PRIMARY KEY (id);
alter table "public"."publisher_traffic_evidence_history" add constraint "publisher_traffic_evidence_daily_active_users_nonnegative" CHECK (((daily_active_users IS NULL) OR (daily_active_users >= 0)));
alter table "public"."publisher_traffic_evidence_history" add constraint "publisher_traffic_evidence_daily_requests_nonnegative" CHECK (((daily_requests IS NULL) OR (daily_requests >= 0)));
alter table "public"."publisher_traffic_evidence_history" add constraint "publisher_traffic_evidence_has_metric" CHECK (((daily_active_users IS NOT NULL) OR (monthly_active_users IS NOT NULL) OR (daily_requests IS NOT NULL)));
alter table "public"."publisher_traffic_evidence_history" add constraint "publisher_traffic_evidence_history_pkey" PRIMARY KEY (id);
alter table "public"."publisher_traffic_evidence_history" add constraint "publisher_traffic_evidence_monthly_active_users_nonnegative" CHECK (((monthly_active_users IS NULL) OR (monthly_active_users >= 0)));
alter table "public"."publisher_traffic_evidence_history" add constraint "publisher_traffic_evidence_recorded_via_domain" CHECK ((recorded_via = ANY (ARRAY['publisher_onboarding_created'::text, 'publisher_profile_updated'::text, 'migration_backfill'::text])));
alter table "public"."publishers" add constraint "chk_publisher_not_allowed_checks" CHECK (((technical_live_status = 'technical_live_passed'::technical_live_status_enum) OR (commercial_test_status <> 'test_passed'::commercial_test_status_enum) OR (sales_scale_status = ANY (ARRAY['not_allowed'::sales_scale_status_enum, 'limited_sellable'::sales_scale_status_enum, 'scale_blocked'::sales_scale_status_enum]))));
alter table "public"."publishers" add constraint "publishers_pkey" PRIMARY KEY (id);
alter table "public"."purchase_orders" add constraint "purchase_orders_pkey" PRIMARY KEY (id);
alter table "public"."purchase_orders" add constraint "purchase_orders_po_number_key" UNIQUE (po_number);
alter table "public"."quality_diagnostic_cases" add constraint "chk_dc_conclusion_requires_closed" CHECK ((((status = 'closed'::diagnostic_case_status_enum) AND (conclusion IS NOT NULL) AND (conclusion <> ''::text)) OR (status <> 'closed'::diagnostic_case_status_enum)));
alter table "public"."quality_diagnostic_cases" add constraint "chk_dc_rejection_requires_note" CHECK ((((status = 'rejected'::diagnostic_case_status_enum) AND ((metadata ->> 'rejection_reason'::text) IS NOT NULL)) OR (status <> 'rejected'::diagnostic_case_status_enum)));
alter table "public"."quality_diagnostic_cases" add constraint "quality_diagnostic_cases_case_no_key" UNIQUE (case_no);
alter table "public"."quality_diagnostic_cases" add constraint "quality_diagnostic_cases_pkey" PRIMARY KEY (id);
alter table "public"."quality_diagnostic_conclusions" add constraint "quality_diagnostic_conclusions_pkey" PRIMARY KEY (id);
alter table "public"."quality_diagnostic_downstream_actions" add constraint "quality_diagnostic_downstream_actions_pkey" PRIMARY KEY (id);
alter table "public"."quality_diagnostic_evidence" add constraint "quality_diagnostic_evidence_pkey" PRIMARY KEY (id);
alter table "public"."rate_limit_buckets" add constraint "rate_limit_buckets_pkey" PRIMARY KEY (id);
alter table "public"."record_comments" add constraint "record_comments_pkey" PRIMARY KEY (id);
alter table "public"."role_capabilities" add constraint "role_capabilities_pkey" PRIMARY KEY (role_code, capability_code);
alter table "public"."roles" add constraint "roles_pkey" PRIMARY KEY (code);
alter table "public"."route_permissions" add constraint "route_permissions_pkey" PRIMARY KEY (route_path, role_code);
alter table "public"."settlement_items" add constraint "settlement_items_pkey" PRIMARY KEY (id);
alter table "public"."settlements" add constraint "chk_settlement_amount_positive" CHECK (((amount IS NULL) OR (amount >= (0)::numeric)));
alter table "public"."settlements" add constraint "chk_settlement_period" CHECK ((period_end >= period_start));
alter table "public"."settlements" add constraint "settlements_pkey" PRIMARY KEY (id);
alter table "public"."sla_instances" add constraint "sla_instances_pkey" PRIMARY KEY (id);
alter table "public"."sop_cards" add constraint "sop_cards_pkey" PRIMARY KEY (id);
alter table "public"."sop_metric_tolerances" add constraint "sop_metric_tolerances_pkey" PRIMARY KEY (id);
alter table "public"."sop_metric_tolerances" add constraint "unique_media_metric" UNIQUE (media_type, metric_key);
alter table "public"."system_audit_logs" add constraint "system_audit_logs_pkey" PRIMARY KEY (id);
alter table "public"."task_dependencies" add constraint "task_dependencies_pkey" PRIMARY KEY (id);
alter table "public"."task_items" add constraint "task_items_pkey" PRIMARY KEY (id);
alter table "public"."team_members" add constraint "team_members_pkey" PRIMARY KEY (id);
alter table "public"."team_members" add constraint "team_members_role_standard_chk" CHECK (((role)::text = ANY ((ARRAY['ceo'::character varying, 'operations_director'::character varying, 'sales_head'::character varying, 'sales'::character varying, 'account_cs'::character varying, 'media_director'::character varying, 'media_manager'::character varying, 'ad_ops'::character varying, 'integration'::character varying, 'rd'::character varying, 'finance'::character varying, 'legal'::character varying, 'data_analyst'::character varying, 'auditor'::character varying, 'admin'::character varying])::text[])));
alter table "public"."tech_reference" add constraint "tech_reference_pkey" PRIMARY KEY (id);
alter table "public"."tech_reference" add constraint "unique_ref" UNIQUE (media_type, integration_method, category, item_key);
alter table "public"."trusted_supply_candidates" add constraint "chk_trusted_supply_candidate_status" CHECK ((status = ANY (ARRAY['candidate'::text, 'readiness_started'::text, 'technical_review_passed'::text, 'onboarding_ready'::text, 'onboarding_project_created'::text, 'rejected'::text])));
alter table "public"."trusted_supply_candidates" add constraint "trusted_supply_candidates_one_per_opportunity" UNIQUE (opportunity_id);
alter table "public"."trusted_supply_candidates" add constraint "trusted_supply_candidates_pkey" PRIMARY KEY (id);
alter table "public"."uat_script_runs" add constraint "chk_uat_script_run_status" CHECK ((status = ANY (ARRAY['in_progress'::text, 'completed'::text, 'failed'::text, 'blocked'::text, 'archived'::text])));
alter table "public"."uat_script_runs" add constraint "uat_script_runs_pkey" PRIMARY KEY (id);
alter table "public"."uat_script_runs" add constraint "uat_script_runs_run_key_key" UNIQUE (run_key);
alter table "public"."uat_script_step_results" add constraint "chk_uat_script_step_status" CHECK ((status = ANY (ARRAY['pending'::text, 'passed'::text, 'failed'::text, 'blocked'::text])));
alter table "public"."uat_script_step_results" add constraint "uat_script_step_results_pkey" PRIMARY KEY (id);
alter table "public"."uat_script_step_results" add constraint "uat_script_step_results_run_id_step_id_key" UNIQUE (run_id, step_id);
alter table "public"."user_preferences" add constraint "user_preferences_pkey" PRIMARY KEY (id);
alter table "public"."user_preferences" add constraint "user_preferences_user_email_key" UNIQUE (user_email);
alter table "public"."user_roles" add constraint "user_roles_pkey" PRIMARY KEY (user_id, role_code);
alter table "public"."wizard_progress_records" add constraint "wizard_progress_records_pkey" PRIMARY KEY (id);
alter table "public"."wizard_progress_records" add constraint "wizard_progress_records_wizard_code_object_type_object_id_key" UNIQUE (wizard_code, object_type, object_id);
alter table "public"."work_item_events" add constraint "work_item_events_event_type_check" CHECK ((event_type = ANY (ARRAY['accept'::text, 'propose_time'::text, 'delegate'::text, 'complete'::text, 'reject'::text, 'verify'::text, 'approve'::text, 'request_changes'::text, 'comment'::text, 'system_sync'::text])));
alter table "public"."work_item_events" add constraint "work_item_events_pkey" PRIMARY KEY (id);
alter table "public"."work_item_events" add constraint "work_item_events_to_status_check" CHECK (((to_status IS NULL) OR (to_status = ANY (ARRAY['pending_acceptance'::text, 'accepted'::text, 'in_progress'::text, 'waiting_confirmation'::text, 'completed'::text, 'rejected'::text, 'delegated'::text, 'overdue'::text, 'open'::text, 'blocked'::text]))));
alter table "public"."work_item_links" add constraint "work_item_links_pkey" PRIMARY KEY (id);
alter table "public"."work_item_links" add constraint "work_item_links_work_item_id_target_table_target_id_relatio_key" UNIQUE (work_item_id, target_table, target_id, relation_type);
alter table "public"."work_items" add constraint "chk_work_item_title" CHECK ((length(TRIM(BOTH FROM title)) > 0));
alter table "public"."work_items" add constraint "work_items_pkey" PRIMARY KEY (id);
alter table "public"."workflow_definitions" add constraint "workflow_definitions_pkey" PRIMARY KEY (id);
alter table "public"."workflow_definitions" add constraint "workflow_definitions_workflow_key_key" UNIQUE (workflow_key);
alter table "public"."workflow_gate_checks" add constraint "workflow_gate_checks_pkey" PRIMARY KEY (id);

-- PG_OS_APPLICATION_MANAGED unique indexes
create unique index business_orders_no_idx ON public.business_orders USING btree (order_no) WHERE (order_no IS NOT NULL);
create unique index finance_ledger_entries_no_idx ON public.finance_ledger_entries USING btree (entry_no) WHERE (entry_no IS NOT NULL);
create unique index idx_media_ecosystem_opportunities_source_name_version ON public.media_ecosystem_opportunities USING btree (lower(media_name), COALESCE(source_name, ''::text), COALESCE(source_version, ''::text)) WHERE (seed_id IS NULL);
create unique index pgos_schema_migrations_filename_uq ON public.pgos_schema_migrations USING btree (filename);
create unique index team_members_employee_code_uq ON public.team_members USING btree (employee_code) WHERE (employee_code IS NOT NULL);

-- PG_OS_APPLICATION_MANAGED foreign keys
alter table "public"."advertiser_bidding_monitor" add constraint "advertiser_bidding_monitor_advertiser_id_fkey" FOREIGN KEY (advertiser_id) REFERENCES advertiser_master(id);
alter table "public"."advertiser_contacts" add constraint "advertiser_contacts_advertiser_id_fkey" FOREIGN KEY (advertiser_id) REFERENCES advertisers(id) ON DELETE CASCADE;
alter table "public"."advertiser_contracts" add constraint "advertiser_contracts_advertiser_id_fkey" FOREIGN KEY (advertiser_id) REFERENCES advertiser_master(id);
alter table "public"."advertiser_followup_log" add constraint "advertiser_followup_log_advertiser_id_fkey" FOREIGN KEY (advertiser_id) REFERENCES advertiser_master(id);
alter table "public"."advertiser_opportunities" add constraint "advertiser_opportunities_advertiser_id_fkey" FOREIGN KEY (advertiser_id) REFERENCES advertiser_master(id);
alter table "public"."advertiser_performance" add constraint "advertiser_performance_advertiser_id_fkey" FOREIGN KEY (advertiser_id) REFERENCES advertiser_master(id);
alter table "public"."advertiser_performance" add constraint "advertiser_performance_campaign_demand_id_fkey" FOREIGN KEY (campaign_demand_id) REFERENCES campaign_demands(id);
alter table "public"."advertiser_strategy" add constraint "advertiser_strategy_advertiser_id_fkey" FOREIGN KEY (advertiser_id) REFERENCES advertiser_master(id);
alter table "public"."advertisers" add constraint "advertisers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."advertisers" add constraint "advertisers_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."advertisers" add constraint "advertisers_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."api_comparison_results" add constraint "api_comparison_results_capture_id_fkey" FOREIGN KEY (capture_id) REFERENCES api_traffic_captures(id) ON DELETE CASCADE;
alter table "public"."api_comparison_results" add constraint "api_comparison_results_endpoint_id_fkey" FOREIGN KEY (endpoint_id) REFERENCES api_doc_endpoints(id) ON DELETE CASCADE;
alter table "public"."api_comparison_results" add constraint "api_comparison_results_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id) ON DELETE SET NULL;
alter table "public"."api_comparison_runs" add constraint "api_comparison_runs_capture_id_fkey" FOREIGN KEY (capture_id) REFERENCES api_traffic_captures(id) ON DELETE SET NULL;
alter table "public"."api_comparison_runs" add constraint "api_comparison_runs_endpoint_id_fkey" FOREIGN KEY (endpoint_id) REFERENCES api_doc_endpoints(id) ON DELETE SET NULL;
alter table "public"."api_comparison_runs" add constraint "api_comparison_runs_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id) ON DELETE SET NULL;
alter table "public"."api_doc_endpoints" add constraint "api_doc_endpoints_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id) ON DELETE SET NULL;
alter table "public"."api_doc_fields" add constraint "api_doc_fields_endpoint_id_fkey" FOREIGN KEY (endpoint_id) REFERENCES api_doc_endpoints(id) ON DELETE CASCADE;
alter table "public"."api_traffic_captures" add constraint "api_traffic_captures_endpoint_id_fkey" FOREIGN KEY (endpoint_id) REFERENCES api_doc_endpoints(id) ON DELETE SET NULL;
alter table "public"."api_traffic_captures" add constraint "api_traffic_captures_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id) ON DELETE SET NULL;
alter table "public"."app_profile_raw" add constraint "app_profile_raw_task_id_fkey" FOREIGN KEY (task_id) REFERENCES app_research_tasks(id) ON DELETE CASCADE;
alter table "public"."app_research_tasks" add constraint "app_research_tasks_media_lead_id_fkey" FOREIGN KEY (media_lead_id) REFERENCES media_lead_inbox(id);
alter table "public"."app_source_checks" add constraint "app_source_checks_task_id_fkey" FOREIGN KEY (task_id) REFERENCES app_research_tasks(id) ON DELETE CASCADE;
alter table "public"."approvals" add constraint "approvals_approver_role_fkey" FOREIGN KEY (approver_role) REFERENCES roles(code);
alter table "public"."approvals" add constraint "approvals_approver_user_id_fkey" FOREIGN KEY (approver_user_id) REFERENCES profiles(id);
alter table "public"."approvals" add constraint "approvals_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES profiles(id);
alter table "public"."assessment_dimensions" add constraint "assessment_dimensions_model_id_fkey" FOREIGN KEY (model_id) REFERENCES assessment_models(id) ON DELETE CASCADE;
alter table "public"."assessment_evaluations" add constraint "assessment_evaluations_input_doc_id_fkey" FOREIGN KEY (input_doc_id) REFERENCES assessment_input_documents(id);
alter table "public"."assessment_evaluations" add constraint "assessment_evaluations_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id) ON DELETE CASCADE;
alter table "public"."assessment_evaluations" add constraint "assessment_evaluations_model_id_fkey" FOREIGN KEY (model_id) REFERENCES assessment_models(id);
alter table "public"."assessment_input_documents" add constraint "assessment_input_documents_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id) ON DELETE CASCADE;
alter table "public"."assessment_input_documents" add constraint "assessment_input_documents_model_id_fkey" FOREIGN KEY (model_id) REFERENCES assessment_models(id);
alter table "public"."assessment_redlines" add constraint "assessment_redlines_model_id_fkey" FOREIGN KEY (model_id) REFERENCES assessment_models(id) ON DELETE CASCADE;
alter table "public"."assessment_rules" add constraint "assessment_rules_dimension_id_fkey" FOREIGN KEY (dimension_id) REFERENCES assessment_dimensions(id) ON DELETE CASCADE;
alter table "public"."attachments" add constraint "attachments_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES profiles(id);
alter table "public"."audit_logs" add constraint "audit_logs_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES profiles(id);
alter table "public"."auto_research_inbox" add constraint "auto_research_inbox_app_profile_id_fkey" FOREIGN KEY (app_profile_id) REFERENCES app_profile_raw(id) ON DELETE SET NULL;
alter table "public"."auto_research_inbox" add constraint "auto_research_inbox_media_lead_id_fkey" FOREIGN KEY (media_lead_id) REFERENCES media_lead_inbox(id) ON DELETE SET NULL;
alter table "public"."auto_research_inbox" add constraint "auto_research_inbox_task_id_fkey" FOREIGN KEY (task_id) REFERENCES app_research_tasks(id) ON DELETE SET NULL;
alter table "public"."campaign_demands" add constraint "campaign_demands_advertiser_id_fkey" FOREIGN KEY (advertiser_id) REFERENCES advertiser_master(id);
alter table "public"."campaign_executions" add constraint "campaign_executions_campaign_demand_id_fkey" FOREIGN KEY (campaign_demand_id) REFERENCES campaign_demands(id);
alter table "public"."campaign_launch_checks" add constraint "campaign_launch_checks_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
alter table "public"."campaign_launch_checks" add constraint "campaign_launch_checks_checked_by_fkey" FOREIGN KEY (checked_by) REFERENCES profiles(id);
alter table "public"."campaign_launch_checks" add constraint "campaign_launch_checks_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id);
alter table "public"."campaign_media_allocations" add constraint "campaign_media_allocations_ad_slot_id_fkey" FOREIGN KEY (ad_slot_id) REFERENCES publisher_ad_slots(id);
alter table "public"."campaign_media_allocations" add constraint "campaign_media_allocations_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
alter table "public"."campaign_media_allocations" add constraint "campaign_media_allocations_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id);
alter table "public"."campaigns" add constraint "campaigns_advertiser_id_fkey" FOREIGN KEY (advertiser_id) REFERENCES advertisers(id);
alter table "public"."campaigns" add constraint "campaigns_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."campaigns" add constraint "campaigns_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."campaigns" add constraint "campaigns_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES proposals(id);
alter table "public"."campaigns" add constraint "campaigns_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."comments" add constraint "comments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."commercial_tests" add constraint "commercial_tests_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."commercial_tests" add constraint "commercial_tests_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."commercial_tests" add constraint "commercial_tests_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."contracts" add constraint "contracts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."contracts" add constraint "contracts_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."contracts" add constraint "contracts_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."data_reconciliation_results" add constraint "data_reconciliation_results_onboarding_id_fkey" FOREIGN KEY (onboarding_id) REFERENCES media_onboarding_projects(id) ON DELETE CASCADE;
alter table "public"."data_reconciliation_results" add constraint "data_reconciliation_results_session_id_fkey" FOREIGN KEY (session_id) REFERENCES live_test_sessions(id) ON DELETE CASCADE;
alter table "public"."finance_exceptions" add constraint "finance_exceptions_assigned_to_fkey" FOREIGN KEY (assigned_to) REFERENCES profiles(id);
alter table "public"."finance_exceptions" add constraint "finance_exceptions_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES profiles(id);
alter table "public"."finance_exceptions" add constraint "finance_exceptions_settlement_id_fkey" FOREIGN KEY (settlement_id) REFERENCES settlements(id);
alter table "public"."integration_check_results" add constraint "integration_check_results_integration_project_id_fkey" FOREIGN KEY (integration_project_id) REFERENCES integration_projects(id) ON DELETE CASCADE;
alter table "public"."integration_check_results" add constraint "integration_check_results_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."integration_check_results" add constraint "integration_check_results_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."integration_checklists" add constraint "integration_checklists_completed_by_fkey" FOREIGN KEY (completed_by) REFERENCES profiles(id);
alter table "public"."integration_checklists" add constraint "integration_checklists_integration_project_id_fkey" FOREIGN KEY (integration_project_id) REFERENCES integration_projects(id) ON DELETE CASCADE;
alter table "public"."integration_project_profiles" add constraint "integration_project_profiles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."integration_project_profiles" add constraint "integration_project_profiles_integration_project_id_fkey" FOREIGN KEY (integration_project_id) REFERENCES integration_projects(id) ON DELETE CASCADE;
alter table "public"."integration_project_profiles" add constraint "integration_project_profiles_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."integration_projects" add constraint "integration_projects_handoff_accepted_by_fkey" FOREIGN KEY (handoff_accepted_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."integration_projects" add constraint "integration_projects_handoff_submitted_by_fkey" FOREIGN KEY (handoff_submitted_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table "public"."integration_projects" add constraint "integration_projects_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."integration_projects" add constraint "integration_projects_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."invoices" add constraint "invoices_settlement_id_fkey" FOREIGN KEY (settlement_id) REFERENCES settlements(id);
alter table "public"."live_test_hourly_logs" add constraint "live_test_hourly_logs_session_id_fkey" FOREIGN KEY (session_id) REFERENCES live_test_sessions(id) ON DELETE CASCADE;
alter table "public"."live_test_sessions" add constraint "live_test_sessions_onboarding_id_fkey" FOREIGN KEY (onboarding_id) REFERENCES media_onboarding_projects(id) ON DELETE CASCADE;
alter table "public"."media_assets" add constraint "media_assets_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_budget_allocation_tiers" add constraint "media_budget_allocation_tiers_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id) ON DELETE CASCADE;
alter table "public"."media_budget_evaluations" add constraint "media_budget_evaluations_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id) ON DELETE CASCADE;
alter table "public"."media_compliance" add constraint "media_compliance_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_contacts" add constraint "media_contacts_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_contract_attachments" add constraint "media_contract_attachments_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES media_contracts(id);
alter table "public"."media_contract_orders" add constraint "media_contract_orders_master_contract_id_fkey" FOREIGN KEY (master_contract_id) REFERENCES media_contracts(id);
alter table "public"."media_contracts" add constraint "media_contracts_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_ecosystem_conversion_logs" add constraint "media_ecosystem_conversion_log_trusted_supply_candidate_id_fkey" FOREIGN KEY (trusted_supply_candidate_id) REFERENCES trusted_supply_candidates(id);
alter table "public"."media_ecosystem_conversion_logs" add constraint "media_ecosystem_conversion_logs_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."media_ecosystem_conversion_logs" add constraint "media_ecosystem_conversion_logs_created_by_role_fkey" FOREIGN KEY (created_by_role) REFERENCES roles(code);
alter table "public"."media_ecosystem_conversion_logs" add constraint "media_ecosystem_conversion_logs_opportunity_id_fkey" FOREIGN KEY (opportunity_id) REFERENCES media_ecosystem_opportunities(id) ON DELETE CASCADE;
alter table "public"."media_ecosystem_conversion_logs" add constraint "media_ecosystem_conversion_logs_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id);
alter table "public"."media_ecosystem_opportunities" add constraint "media_ecosystem_opportunities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."media_ecosystem_opportunities" add constraint "media_ecosystem_opportunities_ecosystem_segment_fkey" FOREIGN KEY (ecosystem_segment) REFERENCES media_ecosystem_segments(segment_code);
alter table "public"."media_ecosystem_opportunities" add constraint "media_ecosystem_opportunities_linked_publisher_id_fkey" FOREIGN KEY (linked_publisher_id) REFERENCES publishers(id);
alter table "public"."media_ecosystem_opportunities" add constraint "media_ecosystem_opportunities_media_director_approved_by_fkey" FOREIGN KEY (media_director_approved_by) REFERENCES profiles(id);
alter table "public"."media_ecosystem_opportunities" add constraint "media_ecosystem_opportunities_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."media_ecosystem_opportunities" add constraint "media_ecosystem_opportunities_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."media_ecosystem_opportunities" add constraint "media_ecosystem_opportunities_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."media_ecosystem_outreach_activities" add constraint "media_ecosystem_outreach_activities_actor_role_fkey" FOREIGN KEY (actor_role) REFERENCES roles(code);
alter table "public"."media_ecosystem_outreach_activities" add constraint "media_ecosystem_outreach_activities_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES profiles(id);
alter table "public"."media_ecosystem_outreach_activities" add constraint "media_ecosystem_outreach_activities_opportunity_id_fkey" FOREIGN KEY (opportunity_id) REFERENCES media_ecosystem_opportunities(id) ON DELETE CASCADE;
alter table "public"."media_followup_logs" add constraint "media_followup_logs_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_inventory" add constraint "media_inventory_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_master" add constraint "media_master_current_contract_id_fkey" FOREIGN KEY (current_contract_id) REFERENCES media_contracts(id);
alter table "public"."media_monitoring_alerts" add constraint "media_monitoring_alerts_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id) ON DELETE CASCADE;
alter table "public"."media_onboarding_projects" add constraint "media_onboarding_projects_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES media_contracts(id);
alter table "public"."media_onboarding_projects" add constraint "media_onboarding_projects_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_onboarding_stage_gates" add constraint "media_onboarding_stage_gates_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES profiles(id);
alter table "public"."media_onboarding_stage_gates" add constraint "media_onboarding_stage_gates_approved_by_role_fkey" FOREIGN KEY (approved_by_role) REFERENCES roles(code);
alter table "public"."media_onboarding_stage_gates" add constraint "media_onboarding_stage_gates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."media_onboarding_stage_gates" add constraint "media_onboarding_stage_gates_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."media_onboarding_stage_gates" add constraint "media_onboarding_stage_gates_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."media_onboarding_stage_gates" add constraint "media_onboarding_stage_gates_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."media_package_rate_cards" add constraint "media_package_rate_cards_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_revenue_performance" add constraint "media_revenue_performance_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_settlements" add constraint "media_settlements_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES media_contracts(id);
alter table "public"."media_settlements" add constraint "media_settlements_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_settlements" add constraint "media_settlements_order_id_fkey" FOREIGN KEY (order_id) REFERENCES media_contract_orders(id);
alter table "public"."media_strategy" add constraint "media_strategy_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_supply_packages" add constraint "media_supply_packages_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."media_supply_packages" add constraint "media_supply_packages_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."media_supply_packages" add constraint "media_supply_packages_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."media_supply_packages" add constraint "media_supply_packages_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."media_supply_packages" add constraint "media_supply_packages_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."media_tech_integrations" add constraint "media_tech_integrations_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES media_contracts(id);
alter table "public"."media_tech_integrations" add constraint "media_tech_integrations_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_traffic_quality" add constraint "media_traffic_quality_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES media_contracts(id);
alter table "public"."media_traffic_quality" add constraint "media_traffic_quality_media_id_fkey" FOREIGN KEY (media_id) REFERENCES media_master(id);
alter table "public"."media_trust_profiles" add constraint "media_trust_profiles_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."media_trust_profiles" add constraint "media_trust_profiles_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."media_trust_profiles" add constraint "media_trust_profiles_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."media_trust_score_history" add constraint "media_trust_score_history_calculated_by_role_fkey" FOREIGN KEY (calculated_by_role) REFERENCES roles(code);
alter table "public"."media_trust_score_history" add constraint "media_trust_score_history_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."module_business_events" add constraint "module_business_events_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."module_business_events" add constraint "module_business_events_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."notifications" add constraint "notifications_recipient_user_id_fkey" FOREIGN KEY (recipient_user_id) REFERENCES profiles(id);
alter table "public"."okr_checkins" add constraint "okr_checkins_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."okr_checkins" add constraint "okr_checkins_key_result_id_fkey" FOREIGN KEY (key_result_id) REFERENCES okr_key_results(id) ON DELETE CASCADE;
alter table "public"."okr_key_results" add constraint "okr_key_results_objective_id_fkey" FOREIGN KEY (objective_id) REFERENCES okr_objectives(id) ON DELETE CASCADE;
alter table "public"."okr_objectives" add constraint "okr_objectives_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."okr_objectives" add constraint "okr_objectives_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."onboarding_checklist_items" add constraint "onboarding_checklist_items_stage_record_id_fkey" FOREIGN KEY (stage_record_id) REFERENCES onboarding_stage_records(id) ON DELETE CASCADE;
alter table "public"."onboarding_gate_results" add constraint "onboarding_gate_results_onboarding_id_fkey" FOREIGN KEY (onboarding_id) REFERENCES media_onboarding_projects(id) ON DELETE CASCADE;
alter table "public"."onboarding_stage_records" add constraint "onboarding_stage_records_onboarding_id_fkey" FOREIGN KEY (onboarding_id) REFERENCES media_onboarding_projects(id) ON DELETE CASCADE;
alter table "public"."opportunities" add constraint "opportunities_advertiser_id_fkey" FOREIGN KEY (advertiser_id) REFERENCES advertisers(id) ON DELETE CASCADE;
alter table "public"."opportunities" add constraint "opportunities_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."opportunities" add constraint "opportunities_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."opportunities" add constraint "opportunities_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."proposal_media_selections" add constraint "proposal_media_selections_ad_slot_id_fkey" FOREIGN KEY (ad_slot_id) REFERENCES publisher_ad_slots(id);
alter table "public"."proposal_media_selections" add constraint "proposal_media_selections_proposal_id_fkey" FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE;
alter table "public"."proposal_media_selections" add constraint "proposal_media_selections_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id);
alter table "public"."proposals" add constraint "proposals_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."proposals" add constraint "proposals_opportunity_id_fkey" FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE;
alter table "public"."proposals" add constraint "proposals_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."proposals" add constraint "proposals_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."publisher_ad_slots" add constraint "publisher_ad_slots_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."publisher_contacts" add constraint "publisher_contacts_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."publisher_contract_terms" add constraint "publisher_contract_terms_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."publisher_readiness_snapshots" add constraint "publisher_readiness_snapshots_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."publisher_readiness_snapshots" add constraint "publisher_readiness_snapshots_snapshot_by_fkey" FOREIGN KEY (snapshot_by) REFERENCES profiles(id);
alter table "public"."publisher_supply_transparency" add constraint "publisher_supply_transparency_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."publisher_traffic_evidence_history" add constraint "publisher_traffic_evidence_history_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES profiles(id);
alter table "public"."publisher_traffic_evidence_history" add constraint "publisher_traffic_evidence_history_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id) ON DELETE CASCADE;
alter table "public"."publisher_traffic_evidence_history" add constraint "publisher_traffic_evidence_history_recorded_by_role_fkey" FOREIGN KEY (recorded_by_role) REFERENCES roles(code);
alter table "public"."publishers" add constraint "publishers_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."publishers" add constraint "publishers_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."publishers" add constraint "publishers_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."publishers" add constraint "publishers_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."purchase_orders" add constraint "purchase_orders_contract_id_fkey" FOREIGN KEY (contract_id) REFERENCES contracts(id);
alter table "public"."purchase_orders" add constraint "purchase_orders_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."purchase_orders" add constraint "purchase_orders_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."purchase_orders" add constraint "purchase_orders_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."quality_diagnostic_cases" add constraint "quality_diagnostic_cases_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id);
alter table "public"."quality_diagnostic_cases" add constraint "quality_diagnostic_cases_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."quality_diagnostic_cases" add constraint "quality_diagnostic_cases_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."quality_diagnostic_cases" add constraint "quality_diagnostic_cases_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."quality_diagnostic_cases" add constraint "quality_diagnostic_cases_publisher_ad_slot_id_fkey" FOREIGN KEY (publisher_ad_slot_id) REFERENCES publisher_ad_slots(id);
alter table "public"."quality_diagnostic_cases" add constraint "quality_diagnostic_cases_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id);
alter table "public"."quality_diagnostic_cases" add constraint "quality_diagnostic_cases_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."quality_diagnostic_conclusions" add constraint "quality_diagnostic_conclusions_case_id_fkey" FOREIGN KEY (case_id) REFERENCES quality_diagnostic_cases(id) ON DELETE CASCADE;
alter table "public"."quality_diagnostic_conclusions" add constraint "quality_diagnostic_conclusions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."quality_diagnostic_downstream_actions" add constraint "quality_diagnostic_downstream_actions_case_id_fkey" FOREIGN KEY (case_id) REFERENCES quality_diagnostic_cases(id) ON DELETE CASCADE;
alter table "public"."quality_diagnostic_downstream_actions" add constraint "quality_diagnostic_downstream_actions_executed_by_fkey" FOREIGN KEY (executed_by) REFERENCES profiles(id);
alter table "public"."quality_diagnostic_evidence" add constraint "quality_diagnostic_evidence_case_id_fkey" FOREIGN KEY (case_id) REFERENCES quality_diagnostic_cases(id) ON DELETE CASCADE;
alter table "public"."quality_diagnostic_evidence" add constraint "quality_diagnostic_evidence_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."role_capabilities" add constraint "role_capabilities_capability_code_fkey" FOREIGN KEY (capability_code) REFERENCES capability_tags(code) ON DELETE CASCADE;
alter table "public"."role_capabilities" add constraint "role_capabilities_role_code_fkey" FOREIGN KEY (role_code) REFERENCES roles(code) ON DELETE CASCADE;
alter table "public"."route_permissions" add constraint "route_permissions_role_code_fkey" FOREIGN KEY (role_code) REFERENCES roles(code) ON DELETE CASCADE;
alter table "public"."settlement_items" add constraint "settlement_items_settlement_id_fkey" FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE CASCADE;
alter table "public"."settlements" add constraint "settlements_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES campaigns(id);
alter table "public"."settlements" add constraint "settlements_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."settlements" add constraint "settlements_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."settlements" add constraint "settlements_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id);
alter table "public"."settlements" add constraint "settlements_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."sop_cards" add constraint "sop_cards_role_code_fkey" FOREIGN KEY (role_code) REFERENCES roles(code);
alter table "public"."trusted_supply_candidates" add constraint "trusted_supply_candidates_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."trusted_supply_candidates" add constraint "trusted_supply_candidates_opportunity_id_fkey" FOREIGN KEY (opportunity_id) REFERENCES media_ecosystem_opportunities(id) ON DELETE RESTRICT;
alter table "public"."trusted_supply_candidates" add constraint "trusted_supply_candidates_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."trusted_supply_candidates" add constraint "trusted_supply_candidates_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."trusted_supply_candidates" add constraint "trusted_supply_candidates_publisher_id_fkey" FOREIGN KEY (publisher_id) REFERENCES publishers(id);
alter table "public"."trusted_supply_candidates" add constraint "trusted_supply_candidates_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."uat_script_runs" add constraint "uat_script_runs_started_by_fkey" FOREIGN KEY (started_by) REFERENCES profiles(id);
alter table "public"."uat_script_runs" add constraint "uat_script_runs_started_by_role_fkey" FOREIGN KEY (started_by_role) REFERENCES roles(code);
alter table "public"."uat_script_step_results" add constraint "uat_script_step_results_actor_role_fkey" FOREIGN KEY (actor_role) REFERENCES roles(code);
alter table "public"."uat_script_step_results" add constraint "uat_script_step_results_actor_user_id_fkey" FOREIGN KEY (actor_user_id) REFERENCES profiles(id);
alter table "public"."uat_script_step_results" add constraint "uat_script_step_results_role_code_fkey" FOREIGN KEY (role_code) REFERENCES roles(code);
alter table "public"."uat_script_step_results" add constraint "uat_script_step_results_run_id_fkey" FOREIGN KEY (run_id) REFERENCES uat_script_runs(id) ON DELETE CASCADE;
alter table "public"."uat_script_step_results" add constraint "uat_script_step_results_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);
alter table "public"."user_roles" add constraint "user_roles_role_code_fkey" FOREIGN KEY (role_code) REFERENCES roles(code);
alter table "public"."user_roles" add constraint "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table "public"."wizard_progress_records" add constraint "wizard_progress_records_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."work_items" add constraint "work_items_created_by_fkey" FOREIGN KEY (created_by) REFERENCES profiles(id);
alter table "public"."work_items" add constraint "work_items_owner_role_fkey" FOREIGN KEY (owner_role) REFERENCES roles(code);
alter table "public"."work_items" add constraint "work_items_owner_user_id_fkey" FOREIGN KEY (owner_user_id) REFERENCES profiles(id);
alter table "public"."work_items" add constraint "work_items_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES profiles(id);

-- PG_OS_APPLICATION_MANAGED indexes
create index activity_logs_actor_idx ON public.activity_logs USING btree (actor_email);
create index activity_logs_created_idx ON public.activity_logs USING btree (created_at);
create index activity_logs_target_idx ON public.activity_logs USING btree (target_type, target_id);
create index advertiser_bidding_monitor_deleted_at_idx ON public.advertiser_bidding_monitor USING btree (deleted_at);
create index advertiser_contracts_deleted_at_idx ON public.advertiser_contracts USING btree (deleted_at);
create index advertiser_contracts_next_action_owner_sla_idx ON public.advertiser_contracts USING btree (next_action_owner_id, sla_due_at);
create index advertiser_contracts_owner_user_idx ON public.advertiser_contracts USING btree (owner_user_id);
create index advertiser_contracts_owner_user_v2012_idx ON public.advertiser_contracts USING btree (owner_user_id);
create index adv_followup_adv_idx ON public.advertiser_followup_log USING btree (advertiser_id);
create index adv_followup_date_idx ON public.advertiser_followup_log USING btree (followup_date);
create index advertiser_followup_log_deleted_at_idx ON public.advertiser_followup_log USING btree (deleted_at);
create index advertiser_followup_log_owner_user_v2012_idx ON public.advertiser_followup_log USING btree (owner_user_id);
create index advertiser_invoices_advertiser_idx ON public.advertiser_invoices USING btree (advertiser_id);
create index advertiser_invoices_contract_idx ON public.advertiser_invoices USING btree (contract_id);
create index advertiser_invoices_deleted_idx ON public.advertiser_invoices USING btree (deleted_at);
create index advertiser_invoices_due_idx ON public.advertiser_invoices USING btree (due_date);
create index advertiser_invoices_next_action_owner_sla_idx ON public.advertiser_invoices USING btree (next_action_owner_id, sla_due_at);
create index advertiser_invoices_order_idx ON public.advertiser_invoices USING btree (order_id);
create index advertiser_invoices_owner_user_idx ON public.advertiser_invoices USING btree (owner_user_id);
create index advertiser_invoices_owner_user_v2012_idx ON public.advertiser_invoices USING btree (owner_user_id);
create index advertiser_invoices_status_idx ON public.advertiser_invoices USING btree (status);
create index advertiser_invoices_workflow_state_idx ON public.advertiser_invoices USING btree (workflow_state);
create index advertiser_master_created_idx ON public.advertiser_master USING btree (created_at DESC);
create index advertiser_master_deleted_at_idx ON public.advertiser_master USING btree (deleted_at);
create index advertiser_master_next_action_owner_sla_idx ON public.advertiser_master USING btree (next_action_owner_id, sla_due_at);
create index advertiser_master_next_followup_idx ON public.advertiser_master USING btree (next_followup_date);
create index advertiser_master_owner_stage_idx ON public.advertiser_master USING btree (owner_id, stage);
create index advertiser_master_owner_user_idx ON public.advertiser_master USING btree (owner_user_id);
create index advertiser_master_owner_user_v2012_idx ON public.advertiser_master USING btree (owner_user_id);
create index advertiser_opportunities_created_idx ON public.advertiser_opportunities USING btree (created_at DESC);
create index advertiser_opportunities_deleted_at_idx ON public.advertiser_opportunities USING btree (deleted_at);
create index advertiser_opportunities_next_action_owner_sla_idx ON public.advertiser_opportunities USING btree (next_action_owner_id, sla_due_at);
create index advertiser_opportunities_next_followup_idx ON public.advertiser_opportunities USING btree (next_followup_date);
create index advertiser_opportunities_owner_user_idx ON public.advertiser_opportunities USING btree (owner_user_id);
create index advertiser_opportunities_owner_user_v2012_idx ON public.advertiser_opportunities USING btree (owner_user_id);
create index advertiser_opportunities_sales_owner_idx ON public.advertiser_opportunities USING btree (sales_owner);
create index advertiser_opportunities_stage_idx ON public.advertiser_opportunities USING btree (stage);
create index advertiser_performance_adops_date_idx ON public.advertiser_performance USING btree (adops_owner, date);
create index advertiser_performance_date_campaign_idx ON public.advertiser_performance USING btree (date, campaign_demand_id);
create index advertiser_performance_deleted_at_idx ON public.advertiser_performance USING btree (deleted_at);
create index advertiser_performance_owner_user_v2012_idx ON public.advertiser_performance USING btree (owner_user_id);
create index advertiser_receivables_advertiser_idx ON public.advertiser_receivables USING btree (advertiser_id);
create index advertiser_receivables_aging_idx ON public.advertiser_receivables USING btree (aging_bucket);
create index advertiser_receivables_deleted_idx ON public.advertiser_receivables USING btree (deleted_at);
create index advertiser_receivables_due_idx ON public.advertiser_receivables USING btree (due_date);
create index advertiser_receivables_invoice_idx ON public.advertiser_receivables USING btree (invoice_id);
create index advertiser_receivables_launch_block_idx ON public.advertiser_receivables USING btree (advertiser_id, status, due_date) WHERE (deleted_at IS NULL);
create index advertiser_receivables_next_action_owner_sla_idx ON public.advertiser_receivables USING btree (next_action_owner_id, sla_due_at);
create index advertiser_receivables_order_idx ON public.advertiser_receivables USING btree (order_id);
create index advertiser_receivables_overdue_idx ON public.advertiser_receivables USING btree (status, due_date, outstanding_amount, owner_user_id);
create index advertiser_receivables_owner_user_idx ON public.advertiser_receivables USING btree (owner_user_id);
create index advertiser_receivables_owner_user_v2012_idx ON public.advertiser_receivables USING btree (owner_user_id);
create index advertiser_receivables_status_idx ON public.advertiser_receivables USING btree (status);
create index advertiser_receivables_workflow_state_idx ON public.advertiser_receivables USING btree (workflow_state);
create index advertiser_strategy_deleted_at_idx ON public.advertiser_strategy USING btree (deleted_at);
create index advertiser_strategy_owner_user_v2012_idx ON public.advertiser_strategy USING btree (owner_user_id);
create index idx_advertisers_owner ON public.advertisers USING btree (owner_user_id);
create index acr_capture_idx ON public.api_comparison_results USING btree (capture_id);
create index acr_endpoint_idx ON public.api_comparison_results USING btree (endpoint_id);
create index acr_result_idx ON public.api_comparison_results USING btree (result);
create index ade_media_idx ON public.api_doc_endpoints USING btree (media_id);
create index adf_endpoint_idx ON public.api_doc_fields USING btree (endpoint_id);
create index atc_endpoint_idx ON public.api_traffic_captures USING btree (endpoint_id);
create index atc_media_idx ON public.api_traffic_captures USING btree (media_id);
create index apr_task_idx ON public.app_profile_raw USING btree (task_id);
create index art_lead_idx ON public.app_research_tasks USING btree (media_lead_id);
create index art_status_idx ON public.app_research_tasks USING btree (status);
create index asc_source_idx ON public.app_source_checks USING btree (source);
create index asc_task_idx ON public.app_source_checks USING btree (task_id);
create index approval_requests_approver_idx ON public.approval_requests USING btree (approver_role, approver_id);
create index approval_requests_approver_user_idx ON public.approval_requests USING btree (approver_user_id, status, created_at DESC);
create index approval_requests_dedupe_idx ON public.approval_requests USING btree (dedupe_key);
create index approval_requests_deleted_idx ON public.approval_requests USING btree (deleted_at);
create index approval_requests_next_action_owner_sla_idx ON public.approval_requests USING btree (next_action_owner_id, sla_due_at);
create index approval_requests_org_idx ON public.approval_requests USING btree (organization_id);
create index approval_requests_owner_user_idx ON public.approval_requests USING btree (owner_user_id);
create index approval_requests_requester_user_idx ON public.approval_requests USING btree (requester_user_id, status, created_at DESC);
create index approval_requests_status_idx ON public.approval_requests USING btree (status);
create index approval_requests_target_idx ON public.approval_requests USING btree (target_table, target_id);
create index approval_requests_type_idx ON public.approval_requests USING btree (approval_type);
create index idx_approvals_approver ON public.approvals USING btree (approver_role, approver_user_id, status);
create index idx_approvals_object ON public.approvals USING btree (object_type, object_id, status);
create index ad_model_idx ON public.assessment_dimensions USING btree (model_id);
create index ae_media_idx ON public.assessment_evaluations USING btree (media_id);
create index ae_model_idx ON public.assessment_evaluations USING btree (model_id);
create index ae_status_idx ON public.assessment_evaluations USING btree (status);
create index aid_media_idx ON public.assessment_input_documents USING btree (media_id);
create index aid_model_idx ON public.assessment_input_documents USING btree (model_id);
create index arl_model_idx ON public.assessment_redlines USING btree (model_id);
create index ar_active_idx ON public.assessment_rules USING btree (is_active);
create index ar_dimension_idx ON public.assessment_rules USING btree (dimension_id);
create index idx_attachments_object ON public.attachments USING btree (object_type, object_id);
create index idx_audit_logs_actor ON public.audit_logs USING btree (actor_user_id, created_at DESC);
create index idx_audit_logs_object ON public.audit_logs USING btree (object_type, object_id);
create index ari_status_idx ON public.auto_research_inbox USING btree (status);
create index ari_task_idx ON public.auto_research_inbox USING btree (task_id);
create index automation_inbox_created_idx ON public.automation_inbox USING btree (created_at DESC);
create index automation_inbox_deleted_at_idx ON public.automation_inbox USING btree (deleted_at);
create index automation_inbox_event_type_idx ON public.automation_inbox USING btree (event_type);
create index automation_inbox_owner_status_idx ON public.automation_inbox USING btree (owner_id, status, created_at DESC);
create index automation_inbox_owner_user_v2012_idx ON public.automation_inbox USING btree (owner_user_id);
create index automation_inbox_source_idx ON public.automation_inbox USING btree (source);
create index automation_inbox_status_created_idx ON public.automation_inbox USING btree (status, created_at DESC);
create index automation_inbox_status_idx ON public.automation_inbox USING btree (status);
create index business_object_timeline_owner_idx ON public.business_object_timeline USING btree (owner_user_id, due_at);
create index business_object_timeline_source_idx ON public.business_object_timeline USING btree (source_table, source_id, created_at DESC);
create index business_orders_campaign_idx ON public.business_orders USING btree (campaign_id);
create index business_orders_contract_idx ON public.business_orders USING btree (contract_id);
create index business_orders_next_action_owner_sla_idx ON public.business_orders USING btree (next_action_owner_id, sla_due_at);
create index business_orders_owner_user_idx ON public.business_orders USING btree (owner_user_id);
create index business_orders_owner_user_v2012_idx ON public.business_orders USING btree (owner_user_id);
create index business_orders_status_idx ON public.business_orders USING btree (status);
create index campaign_creatives_execution_idx ON public.campaign_creatives USING btree (campaign_execution_id);
create index campaign_creatives_review_idx ON public.campaign_creatives USING btree (review_status);
create index campaign_daily_reports_date_idx ON public.campaign_daily_reports USING btree (report_date DESC);
create index campaign_delivery_daily_campaign_idx ON public.campaign_delivery_daily USING btree (campaign_id, report_date);
create index campaign_delivery_daily_media_idx ON public.campaign_delivery_daily USING btree (media_id, report_date);
create index campaign_demands_adops_owner_idx ON public.campaign_demands USING btree (adops_owner);
create index campaign_demands_dates_idx ON public.campaign_demands USING btree (start_date, end_date);
create index campaign_demands_deleted_at_idx ON public.campaign_demands USING btree (deleted_at);
create index campaign_demands_launch_gate_idx ON public.campaign_demands USING btree (status, gate_status, owner_user_id);
create index campaign_demands_next_action_owner_sla_idx ON public.campaign_demands USING btree (next_action_owner_id, sla_due_at);
create index campaign_demands_owner_status_idx ON public.campaign_demands USING btree (sales_owner, adops_owner, status);
create index campaign_demands_owner_user_idx ON public.campaign_demands USING btree (owner_user_id);
create index campaign_demands_owner_user_v2012_idx ON public.campaign_demands USING btree (owner_user_id);
create index campaign_demands_sales_owner_idx ON public.campaign_demands USING btree (sales_owner);
create index campaign_demands_workflow_state_idx ON public.campaign_demands USING btree (workflow_state);
create index campaign_executions_campaign_idx ON public.campaign_executions USING btree (campaign_id);
create index campaign_executions_contract_idx ON public.campaign_executions USING btree (contract_id);
create index campaign_executions_deleted_at_idx ON public.campaign_executions USING btree (deleted_at);
create index campaign_executions_launch_gate_idx ON public.campaign_executions USING btree (status, launch_gate_status, tracking_check_status, owner_user_id);
create index campaign_executions_launch_idx ON public.campaign_executions USING btree (status, workflow_state, contract_id, order_id) WHERE (deleted_at IS NULL);
create index campaign_executions_next_action_owner_sla_idx ON public.campaign_executions USING btree (next_action_owner_id, sla_due_at);
create index campaign_executions_owner_user_idx ON public.campaign_executions USING btree (owner_user_id);
create index campaign_executions_workflow_state_idx ON public.campaign_executions USING btree (workflow_state);
create index campaign_flights_date_idx ON public.campaign_flights USING btree (start_date, end_date);
create index campaign_flights_execution_idx ON public.campaign_flights USING btree (campaign_execution_id);
create index campaign_flights_owner_user_v2012_idx ON public.campaign_flights USING btree (owner_user_id);
create index campaign_flights_status_idx ON public.campaign_flights USING btree (status);
create index idx_campaign_launch_checks_campaign ON public.campaign_launch_checks USING btree (campaign_id);
create index campaign_line_items_execution_idx ON public.campaign_line_items USING btree (campaign_execution_id);
create index campaign_line_items_media_idx ON public.campaign_line_items USING btree (media_id);
create index campaign_line_items_status_idx ON public.campaign_line_items USING btree (status);
create index idx_campaign_media_allocations_campaign ON public.campaign_media_allocations USING btree (campaign_id, publisher_id);
create index campaign_tracking_checks_execution_idx ON public.campaign_tracking_checks USING btree (campaign_execution_id);
create index campaign_tracking_checks_launch_idx ON public.campaign_tracking_checks USING btree (campaign_execution_id, status) WHERE (deleted_at IS NULL);
create index campaign_tracking_checks_status_idx ON public.campaign_tracking_checks USING btree (status);
create index idx_campaigns_advertiser ON public.campaigns USING btree (advertiser_id, status);
create index idx_campaigns_proposal ON public.campaigns USING btree (proposal_id);
create index channel_technical_profiles_owner_user_v2012_idx ON public.channel_technical_profiles USING btree (owner_user_id);
create index ct_media_stage_idx ON public.checklist_templates USING btree (media_type, stage_key);
create index idx_comments_object ON public.comments USING btree (object_type, object_id, created_at DESC);
create index idx_commercial_tests_publisher ON public.commercial_tests USING btree (publisher_id, status);
create index idx_contracts_object ON public.contracts USING btree (object_type, object_id);
create index data_quality_checks_status_idx ON public.data_quality_checks USING btree (status, severity, due_at);
create index data_quality_checks_target_idx ON public.data_quality_checks USING btree (target_table, target_id);
create index data_reconciliation_results_deleted_at_idx ON public.data_reconciliation_results USING btree (deleted_at);
create index drr_onboarding_idx ON public.data_reconciliation_results USING btree (onboarding_id);
create index drr_session_idx ON public.data_reconciliation_results USING btree (session_id);
create index esr_active_idx ON public.evaluation_scoring_rules USING btree (is_active);
create index esr_dimension_idx ON public.evaluation_scoring_rules USING btree (dimension);
create index finance_chain_campaign_idx ON public.finance_business_chain_snapshots USING btree (campaign_id, generated_at DESC);
create index finance_chain_settlement_idx ON public.finance_business_chain_snapshots USING btree (settlement_id, generated_at DESC);
create index idx_finance_exceptions_settlement ON public.finance_exceptions USING btree (settlement_id, status);
create index finance_ledger_entries_contract_idx ON public.finance_ledger_entries USING btree (contract_id, campaign_id);
create index finance_ledger_entries_period_idx ON public.finance_ledger_entries USING btree (period);
create index finance_ledger_entries_related_idx ON public.finance_ledger_entries USING btree (related_table, related_id);
create index finance_reconciliation_period_idx ON public.finance_reconciliation_items USING btree (period);
create index finance_reconciliation_status_idx ON public.finance_reconciliation_items USING btree (status);
create index idx_integration_check_results_queue ON public.integration_check_results USING btree (integration_project_id, status, owner_role, due_date);
create index idx_integration_checklists_project ON public.integration_checklists USING btree (integration_project_id, step_order);
create index idx_integration_project_profiles_project ON public.integration_project_profiles USING btree (integration_project_id);
create index idx_integration_projects_handoff_status ON public.integration_projects USING btree (handoff_status, handoff_submitted_at DESC);
create index idx_integration_projects_publisher ON public.integration_projects USING btree (publisher_id, status);
create index idx_invoices_settlement ON public.invoices USING btree (settlement_id);
create index issue_logs_deleted_at_idx ON public.issue_logs USING btree (deleted_at);
create index issue_logs_next_action_owner_sla_idx ON public.issue_logs USING btree (next_action_owner_id, sla_due_at);
create index issue_logs_owner_user_idx ON public.issue_logs USING btree (owner_user_id);
create index issue_logs_owner_user_v2012_idx ON public.issue_logs USING btree (owner_user_id);
create index issue_logs_status_severity_idx ON public.issue_logs USING btree (status, severity);
create index kpi_snapshots_period_idx ON public.kpi_snapshots USING btree (period);
create index kpi_snapshots_role_idx ON public.kpi_snapshots USING btree (role_scope);
create index kpi_snapshots_status_idx ON public.kpi_snapshots USING btree (status);
create index kpi_targets_deleted_at_idx ON public.kpi_targets USING btree (deleted_at);
create index kpi_targets_member_idx ON public.kpi_targets USING btree (member_id);
create index kpi_targets_period_idx ON public.kpi_targets USING btree (period);
create index lthl_session_idx ON public.live_test_hourly_logs USING btree (session_id);
create index live_test_sessions_deleted_at_idx ON public.live_test_sessions USING btree (deleted_at);
create index lts_onboarding_idx ON public.live_test_sessions USING btree (onboarding_id);
create index lts_status_idx ON public.live_test_sessions USING btree (status);
create index management_action_queue_owner_idx ON public.management_action_queue USING btree (owner_user_id, owner_role, due_at);
create index management_action_queue_status_idx ON public.management_action_queue USING btree (status, severity, due_at);
create index media_assets_deleted_at_idx ON public.media_assets USING btree (deleted_at);
create index media_assets_media_idx ON public.media_assets USING btree (media_id);
create index mbat_media_idx ON public.media_budget_allocation_tiers USING btree (media_id);
create index mbe_media_idx ON public.media_budget_evaluations USING btree (media_id);
create index media_budget_evaluations_deleted_at_idx ON public.media_budget_evaluations USING btree (deleted_at);
create index media_compliance_deleted_at_idx ON public.media_compliance USING btree (deleted_at);
create index media_compliance_media_id_idx ON public.media_compliance USING btree (media_id);
create index media_contacts_deleted_at_idx ON public.media_contacts USING btree (deleted_at);
create index mca_contract_id_idx ON public.media_contract_attachments USING btree (contract_id);
create index mco_master_contract_idx ON public.media_contract_orders USING btree (master_contract_id);
create index mco_status_idx ON public.media_contract_orders USING btree (status);
create index media_contract_orders_deleted_at_idx ON public.media_contract_orders USING btree (deleted_at);
create index media_contracts_deleted_at_idx ON public.media_contracts USING btree (deleted_at);
create index media_contracts_expiry_idx ON public.media_contracts USING btree (expiry_date);
create index media_contracts_media_id_idx ON public.media_contracts USING btree (media_id);
create index media_contracts_next_action_owner_sla_idx ON public.media_contracts USING btree (next_action_owner_id, sla_due_at);
create index media_contracts_owner_user_idx ON public.media_contracts USING btree (owner_user_id);
create index media_contracts_owner_user_v2012_idx ON public.media_contracts USING btree (owner_user_id);
create index media_contracts_status_idx ON public.media_contracts USING btree (status);
create index idx_media_ecosystem_conversion_logs_opportunity ON public.media_ecosystem_conversion_logs USING btree (opportunity_id, created_at DESC);
create index idx_media_ecosystem_opportunities_batch ON public.media_ecosystem_opportunities USING btree (import_batch_id, data_quality_level, verification_status);
create index idx_media_ecosystem_opportunities_owner ON public.media_ecosystem_opportunities USING btree (owner_user_id, owner_role, ecosystem_status);
create index idx_media_ecosystem_opportunities_review ON public.media_ecosystem_opportunities USING btree (review_required, seed_confidence);
create index idx_media_ecosystem_opportunities_segment_status ON public.media_ecosystem_opportunities USING btree (ecosystem_segment, ecosystem_status);
create index idx_media_ecosystem_outreach_opportunity ON public.media_ecosystem_outreach_activities USING btree (opportunity_id, activity_at DESC);
create index media_followup_date_idx ON public.media_followup_logs USING btree (followup_date);
create index media_followup_logs_deleted_at_idx ON public.media_followup_logs USING btree (deleted_at);
create index media_followup_logs_owner_user_v2012_idx ON public.media_followup_logs USING btree (owner_user_id);
create index media_followup_media_idx ON public.media_followup_logs USING btree (media_id);
create index media_inventory_deleted_at_idx ON public.media_inventory USING btree (deleted_at);
create index media_inventory_status_quality_idx ON public.media_inventory USING btree (inventory_status, quality_rating);
create index media_lead_inbox_deleted_at_idx ON public.media_lead_inbox USING btree (deleted_at);
create index media_master_created_idx ON public.media_master USING btree (created_at DESC);
create index media_master_deleted_at_idx ON public.media_master USING btree (deleted_at);
create index media_master_media_name_idx ON public.media_master USING btree (media_name);
create index media_master_next_action_owner_sla_idx ON public.media_master USING btree (next_action_owner_id, sla_due_at);
create index media_master_next_followup_idx ON public.media_master USING btree (next_followup_date);
create index media_master_owner_stage_idx ON public.media_master USING btree (owner_id, stage);
create index media_master_owner_user_idx ON public.media_master USING btree (owner_user_id);
create index media_master_owner_user_v2012_idx ON public.media_master USING btree (owner_user_id);
create index media_master_saleable_gate_idx ON public.media_master USING btree (stage, launch_gate_status, saleable, owner_user_id);
create index mma_media_idx ON public.media_monitoring_alerts USING btree (media_id);
create index media_onboarding_launch_idx ON public.media_onboarding_projects USING btree (launch_status, target_launch_date);
create index media_onboarding_owner_idx ON public.media_onboarding_projects USING btree (business_owner, tech_owner_id, ops_owner);
create index media_onboarding_owner_stage_idx ON public.media_onboarding_projects USING btree (business_owner, tech_owner_id, ops_owner, stage);
create index media_onboarding_projects_deleted_at_idx ON public.media_onboarding_projects USING btree (deleted_at);
create index media_onboarding_projects_next_action_owner_sla_idx ON public.media_onboarding_projects USING btree (next_action_owner_id, sla_due_at);
create index media_onboarding_projects_owner_user_idx ON public.media_onboarding_projects USING btree (owner_user_id);
create index media_onboarding_projects_owner_user_v2012_idx ON public.media_onboarding_projects USING btree (owner_user_id);
create index media_onboarding_saleable_gate_idx ON public.media_onboarding_projects USING btree (stage, launch_status, test_status, owner_user_id);
create index mop_contract_id_idx ON public.media_onboarding_projects USING btree (contract_id);
create index idx_media_onboarding_stage_gate_object ON public.media_onboarding_stage_gates USING btree (lifecycle_object_type, lifecycle_object_id);
create index idx_media_onboarding_stage_gate_queue ON public.media_onboarding_stage_gates USING btree (stage, status, owner_role, target_date);
create index media_package_rate_cards_deleted_at_idx ON public.media_package_rate_cards USING btree (deleted_at);
create index media_payables_aging_idx ON public.media_payables USING btree (aging_bucket);
create index media_payables_deleted_idx ON public.media_payables USING btree (deleted_at);
create index media_payables_due_idx ON public.media_payables USING btree (due_date);
create index media_payables_media_idx ON public.media_payables USING btree (media_id);
create index media_payables_next_action_owner_sla_idx ON public.media_payables USING btree (next_action_owner_id, sla_due_at);
create index media_payables_order_idx ON public.media_payables USING btree (order_id);
create index media_payables_owner_user_idx ON public.media_payables USING btree (owner_user_id);
create index media_payables_owner_user_v2012_idx ON public.media_payables USING btree (owner_user_id);
create index media_payables_settlement_idx ON public.media_payables USING btree (settlement_id);
create index media_payables_status_idx ON public.media_payables USING btree (status);
create index media_payables_workflow_state_idx ON public.media_payables USING btree (workflow_state);
create index media_revenue_perf_date_media_idx ON public.media_revenue_performance USING btree (performance_date, media_id);
create index media_revenue_performance_date_idx ON public.media_revenue_performance USING btree (performance_date DESC);
create index media_revenue_performance_deleted_at_idx ON public.media_revenue_performance USING btree (deleted_at);
create index media_settlements_close_gate_idx ON public.media_settlements USING btree (status, risk_level, owner_user_id);
create index media_settlements_deleted_at_idx ON public.media_settlements USING btree (deleted_at);
create index media_settlements_next_action_owner_sla_idx ON public.media_settlements USING btree (next_action_owner_id, sla_due_at);
create index media_settlements_owner_user_idx ON public.media_settlements USING btree (owner_user_id);
create index media_settlements_owner_user_v2012_idx ON public.media_settlements USING btree (owner_user_id);
create index media_settlements_payment_idx ON public.media_settlements USING btree (payment_status, expected_payment_date);
create index media_settlements_period_status_idx ON public.media_settlements USING btree (period_start, period_end, reconciliation_status, payment_status);
create index ms_contract_id_idx ON public.media_settlements USING btree (contract_id);
create index media_strategy_deleted_at_idx ON public.media_strategy USING btree (deleted_at);
create index media_strategy_owner_user_v2012_idx ON public.media_strategy USING btree (owner_user_id);
create index idx_media_supply_packages_active ON public.media_supply_packages USING btree (status, pool, publisher_id);
create index media_tech_integrations_deleted_at_idx ON public.media_tech_integrations USING btree (deleted_at);
create index mti_contract_id_idx ON public.media_tech_integrations USING btree (contract_id);
create index media_traffic_quality_deleted_at_idx ON public.media_traffic_quality USING btree (deleted_at);
create index media_traffic_quality_media_id_idx ON public.media_traffic_quality USING btree (media_id);
create index media_traffic_quality_owner_user_v2012_idx ON public.media_traffic_quality USING btree (owner_user_id);
create index mtq_contract_id_idx ON public.media_traffic_quality USING btree (contract_id);
create index idx_media_trust_profiles_pool ON public.media_trust_profiles USING btree (confirmed_pool, trust_level);
create index idx_media_trust_score_history_publisher ON public.media_trust_score_history USING btree (publisher_id, calculated_at DESC);
create index idx_metric_funnel_snapshots_object ON public.metric_funnel_snapshots USING btree (object_type, object_id, snapshot_date DESC);
create index metric_snapshots_metric_date_idx ON public.metric_snapshots USING btree (metric_key, snapshot_date DESC);
create index metric_snapshots_quality_idx ON public.metric_snapshots USING btree (data_quality_score, data_freshness_at);
create index idx_module_business_events_code ON public.module_business_events USING btree (event_code, created_at DESC);
create index idx_module_business_events_object ON public.module_business_events USING btree (object_type, object_id);
create index notification_ack_escalation_idx ON public.notification_acknowledgements USING btree (response_status, ack_deadline, escalated_at);
create index notification_ack_notification_idx ON public.notification_acknowledgements USING btree (notification_id, acknowledged_at DESC);
create index notification_ack_task_idx ON public.notification_acknowledgements USING btree (task_id, acknowledged_at DESC);
create index notification_logs_channel_idx ON public.notification_logs USING btree (channel);
create index notification_logs_created_idx ON public.notification_logs USING btree (created_at);
create index notification_logs_org_idx ON public.notification_logs USING btree (organization_id);
create index notification_logs_status_idx ON public.notification_logs USING btree (status);
create index notification_outbox_deleted_idx ON public.notification_outbox USING btree (deleted_at);
create index notification_outbox_next_action_owner_sla_idx ON public.notification_outbox USING btree (next_action_owner_id, sla_due_at);
create index notification_outbox_org_idx ON public.notification_outbox USING btree (organization_id);
create index notification_outbox_org_status_idx ON public.notification_outbox USING btree (organization_id, status, priority, created_at DESC);
create index notification_outbox_owner_user_idx ON public.notification_outbox USING btree (owner_user_id);
create index notification_outbox_related_idx ON public.notification_outbox USING btree (related_table, related_id);
create index notification_outbox_status_idx ON public.notification_outbox USING btree (status, next_attempt_at);
create index notification_outbox_worker_idx ON public.notification_outbox USING btree (status, next_attempt_at, attempt_count);
create index idx_notifications_recipient ON public.notifications USING btree (recipient_user_id, is_read, created_at DESC);
create index idx_okr_checkins_key_result ON public.okr_checkins USING btree (key_result_id, created_at DESC);
create index idx_okr_key_results_objective ON public.okr_key_results USING btree (objective_id);
create index idx_okr_objectives_owner ON public.okr_objectives USING btree (owner_role, owner_user_id, period);
create index oci_stage_idx ON public.onboarding_checklist_items USING btree (stage_record_id);
create index oci_status_idx ON public.onboarding_checklist_items USING btree (status);
create index onboarding_checklist_items_deleted_at_idx ON public.onboarding_checklist_items USING btree (deleted_at);
create index onboarding_checklist_items_owner_user_v2012_idx ON public.onboarding_checklist_items USING btree (owner_user_id);
create index ogr_gate_idx ON public.onboarding_gate_results USING btree (gate_type, status);
create index ogr_onboarding_idx ON public.onboarding_gate_results USING btree (onboarding_id);
create index onboarding_gate_results_deleted_at_idx ON public.onboarding_gate_results USING btree (deleted_at);
create index onboarding_stage_records_deleted_at_idx ON public.onboarding_stage_records USING btree (deleted_at);
create index onboarding_stage_records_owner_user_v2012_idx ON public.onboarding_stage_records USING btree (owner_user_id);
create index osr_onboarding_idx ON public.onboarding_stage_records USING btree (onboarding_id);
create index osr_status_idx ON public.onboarding_stage_records USING btree (status);
create index idx_opportunities_advertiser ON public.opportunities USING btree (advertiser_id, stage);
create index payment_collections_date_idx ON public.payment_collections USING btree (payment_date);
create index payment_collections_deleted_idx ON public.payment_collections USING btree (deleted_at);
create index payment_collections_direction_idx ON public.payment_collections USING btree (direction);
create index payment_collections_invoice_idx ON public.payment_collections USING btree (invoice_id);
create index payment_collections_next_action_owner_sla_idx ON public.payment_collections USING btree (next_action_owner_id, sla_due_at);
create index payment_collections_owner_user_idx ON public.payment_collections USING btree (owner_user_id);
create index payment_collections_owner_user_v2012_idx ON public.payment_collections USING btree (owner_user_id);
create index payment_collections_payable_idx ON public.payment_collections USING btree (payable_id);
create index payment_collections_receivable_idx ON public.payment_collections USING btree (receivable_id);
create index pgos_export_logs_created_idx ON public.pgos_export_logs USING btree (created_at);
create index pgos_export_logs_requested_by_idx ON public.pgos_export_logs USING btree (requested_by);
create index pgos_export_logs_type_idx ON public.pgos_export_logs USING btree (export_type);
create index pgos_generated_reports_created_idx ON public.pgos_generated_reports USING btree (created_at DESC);
create index pgos_generated_reports_type_period_idx ON public.pgos_generated_reports USING btree (report_type, period);
create index pgos_import_batches_created_idx ON public.pgos_import_batches USING btree (created_at DESC);
create index pgos_import_batches_target_idx ON public.pgos_import_batches USING btree (target_table);
create index pgos_remediation_closure_center_idx ON public.pgos_remediation_closure_items USING btree (business_center);
create index pgos_remediation_closure_priority_idx ON public.pgos_remediation_closure_items USING btree (priority, closure_status, completion_rate);
create index pgos_schema_migrations_applied_at_idx ON public.pgos_schema_migrations USING btree (applied_at DESC);
create index pgos_users_department_idx ON public.pgos_users USING btree (department);
create index pgos_users_email_idx ON public.pgos_users USING btree (email);
create index idx_proposal_media_selections_proposal ON public.proposal_media_selections USING btree (proposal_id, publisher_id);
create index idx_proposals_opportunity ON public.proposals USING btree (opportunity_id, status);
create index idx_publisher_ad_slots_publisher ON public.publisher_ad_slots USING btree (publisher_id, status);
create index idx_publisher_contacts_primary ON public.publisher_contacts USING btree (publisher_id, is_primary);
create index idx_publisher_contract_terms_publisher ON public.publisher_contract_terms USING btree (publisher_id);
create index idx_readiness_snapshots_publisher ON public.publisher_readiness_snapshots USING btree (publisher_id, created_at DESC);
create index idx_publisher_traffic_evidence_publisher_created ON public.publisher_traffic_evidence_history USING btree (publisher_id, created_at DESC);
create index idx_publisher_traffic_evidence_publisher_date ON public.publisher_traffic_evidence_history USING btree (publisher_id, traffic_data_as_of DESC, created_at DESC);
create index idx_publishers_owner ON public.publishers USING btree (owner_user_id, owner_role);
create index idx_publishers_readiness ON public.publishers USING btree (technical_live_status, commercial_test_status, sales_scale_status);
create index idx_publishers_region ON public.publishers USING btree (region);
create index idx_diagnostic_cases_blocking ON public.quality_diagnostic_cases USING btree (is_blocking_sales_scale, is_blocking_campaign, is_blocking_settlement, status);
create index idx_diagnostic_cases_owner ON public.quality_diagnostic_cases USING btree (owner_user_id, status);
create index idx_diagnostic_cases_publisher ON public.quality_diagnostic_cases USING btree (publisher_id, status);
create index idx_diagnostic_evidence_case ON public.quality_diagnostic_evidence USING btree (case_id);
create index idx_record_comments_created_at ON public.record_comments USING btree (created_at DESC);
create index idx_record_comments_deleted_at ON public.record_comments USING btree (deleted_at);
create index idx_record_comments_target ON public.record_comments USING btree (target_table, target_id);
create index idx_settlement_items_settlement ON public.settlement_items USING btree (settlement_id);
create index idx_settlements_campaign ON public.settlements USING btree (campaign_id, status);
create index idx_settlements_publisher ON public.settlements USING btree (publisher_id, status);
create index idx_sop_cards_role ON public.sop_cards USING btree (role_code, scenario);
create index system_audit_logs_actor_idx ON public.system_audit_logs USING btree (actor_email);
create index system_audit_logs_created_idx ON public.system_audit_logs USING btree (created_at DESC);
create index system_audit_logs_resource_idx ON public.system_audit_logs USING btree (resource);
create index task_items_dedupe_idx ON public.task_items USING btree (dedupe_key);
create index task_items_deleted_idx ON public.task_items USING btree (deleted_at);
create index task_items_due_idx ON public.task_items USING btree (due_at);
create index task_items_escalation_idx ON public.task_items USING btree (escalation_level, status, due_at);
create index task_items_next_action_owner_sla_idx ON public.task_items USING btree (next_action_owner_id, sla_due_at);
create index task_items_next_owner_idx ON public.task_items USING btree (next_action_owner_id, status, due_at);
create index task_items_org_idx ON public.task_items USING btree (organization_id);
create index task_items_owner_idx ON public.task_items USING btree (owner_role, owner_id);
create index task_items_owner_user_idx ON public.task_items USING btree (owner_user_id, status, due_at);
create index task_items_owner_user_v2012_idx ON public.task_items USING btree (owner_user_id);
create index task_items_related_idx ON public.task_items USING btree (related_table, related_id);
create index task_items_sla_due_idx ON public.task_items USING btree (sla_due_at) WHERE (deleted_at IS NULL);
create index task_items_status_idx ON public.task_items USING btree (status);
create index team_members_department_idx ON public.team_members USING btree (department);
create index team_members_email_idx ON public.team_members USING btree (email);
create index team_members_reports_to_idx ON public.team_members USING btree (reports_to);
create index team_members_role_idx ON public.team_members USING btree (role);
create index idx_trusted_supply_candidates_readiness ON public.trusted_supply_candidates USING btree (status, onboarding_ready_at, owner_role);
create index idx_trusted_supply_candidates_status ON public.trusted_supply_candidates USING btree (status, owner_role);
create index idx_uat_script_runs_key ON public.uat_script_runs USING btree (run_key);
create index idx_uat_script_runs_updated ON public.uat_script_runs USING btree (updated_at DESC);
create index idx_uat_script_step_results_run ON public.uat_script_step_results USING btree (run_id, role_code, status);
create index idx_wizard_progress_owner ON public.wizard_progress_records USING btree (owner_user_id, wizard_code);
create index idx_work_item_events_actor_created ON public.work_item_events USING btree (actor_email, created_at DESC);
create index idx_work_item_events_item_created ON public.work_item_events USING btree (work_item_id, created_at DESC);
create index idx_work_item_links_target ON public.work_item_links USING btree (target_table, target_id);
create index idx_work_items_object ON public.work_items USING btree (object_type, object_id);
create index idx_work_items_owner ON public.work_items USING btree (owner_user_id, owner_role, status);
create index workflow_gate_checks_created_idx ON public.workflow_gate_checks USING btree (created_at DESC);
create index workflow_gate_checks_deleted_at_idx ON public.workflow_gate_checks USING btree (deleted_at);
create index workflow_gate_checks_scope_idx ON public.workflow_gate_checks USING btree (scope);
create index workflow_gate_checks_scope_target_passed_idx ON public.workflow_gate_checks USING btree (scope, target_table, target_id, passed, created_at DESC);
create index workflow_gate_checks_target_idx ON public.workflow_gate_checks USING btree (target_table, target_id);

-- PG_OS_APPLICATION_MANAGED functions
CREATE OR REPLACE FUNCTION public.assert_trusted_supply_candidate_gate()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  opportunity public.media_ecosystem_opportunities%rowtype;
begin
  select * into opportunity
  from public.media_ecosystem_opportunities
  where id = new.opportunity_id;

  if not found then
    raise exception 'media ecosystem opportunity % was not found', new.opportunity_id;
  end if;

  if opportunity.data_quality_level = 'SEED_ONLY' then
    raise exception 'seed-only media ecosystem opportunities cannot become trusted supply candidates';
  end if;

  if opportunity.priority_score < 70 then
    raise exception 'priority_score must be >= 70 before trusted supply candidate conversion';
  end if;

  if opportunity.media_contact_confirmed is not true
     or opportunity.business_interest_confirmed is not true
     or opportunity.ad_inventory_identified is not true then
    raise exception 'contact, business interest, and inventory gates must be confirmed before trusted supply candidate conversion';
  end if;

  if opportunity.integration_feasibility = 'impossible' then
    raise exception 'opportunities with impossible integration feasibility cannot become trusted supply candidates';
  end if;

  if opportunity.media_director_approved_at is null then
    raise exception 'media director approval is required before trusted supply candidate conversion';
  end if;

  new.media_name := coalesce(new.media_name, opportunity.media_name);
  new.track := coalesce(new.track, opportunity.ecosystem_segment);
  new.priority_score := coalesce(new.priority_score, opportunity.priority_score);
  new.owner_user_id := coalesce(new.owner_user_id, opportunity.owner_user_id);
  new.owner_role := coalesce(new.owner_role, opportunity.owner_role);

  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.current_user_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
AS $function$
  select auth.uid()
$function$
;

CREATE OR REPLACE FUNCTION public.enforce_media_onboarding_stage_gate_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.has_any_role(role_codes text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role_code = any(role_codes)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_capability(capability_code_input text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_capabilities rc on rc.role_code = ur.role_code
    where ur.user_id = auth.uid()
      and rc.capability_code = capability_code_input
  );
$function$
;

CREATE OR REPLACE FUNCTION public.has_role(role_code_input text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role_code = role_code_input
  );
$function$
;

CREATE OR REPLACE FUNCTION public.notify_business_event()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  perform pg_notify(
    'business_events',
    json_build_object(
      'event_code', new.event_code,
      'object_type', new.object_type,
      'object_id', new.object_id::text,
      'created_at', new.created_at::text
    )::text
  );
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.pgos_is_service_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$ SELECT current_user = 'service_role' $function$
;

CREATE OR REPLACE FUNCTION public.pgos_schema_handshake()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$ SELECT jsonb_build_object('version','061','status','adopted') $function$
;

CREATE OR REPLACE FUNCTION public.pgos_seed_owner_closure(p_table text, p_owner_field text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF p_table !~ '^[a-zA-Z0-9_]+$' OR p_owner_field !~ '^[a-zA-Z0-9_]+$' THEN
    RAISE EXCEPTION 'Invalid identifier for pgos_seed_owner_closure';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=p_table AND column_name='owner_user_id') THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS owner_user_id varchar(36)', p_table);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=p_table AND column_name='next_action_owner_id') THEN
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS next_action_owner_id varchar(36)', p_table);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=p_table AND column_name=p_owner_field) THEN
    EXECUTE format('UPDATE %I SET owner_user_id = COALESCE(owner_user_id, NULLIF(%I::text, '''')) WHERE owner_user_id IS NULL', p_table, p_owner_field);
    EXECUTE format('UPDATE %I SET next_action_owner_id = COALESCE(next_action_owner_id, owner_user_id) WHERE next_action_owner_id IS NULL', p_table);
  END IF;
END $function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.sync_publisher_commercial_test_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.publishers
  set
    commercial_test_status = new.status,
    updated_at = now()
  where id = new.publisher_id
    and commercial_test_status is distinct from new.status;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_trusted_supply_candidate_opportunity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  update public.media_ecosystem_opportunities
  set trusted_supply_candidate = true,
      ecosystem_status = 'TRUSTED_SUPPLY_CANDIDATE',
      trust_status = case
        when trust_status = 'NOT_VERIFIED' then 'TRUST_REVIEW'
        else trust_status
      end,
      deal_ready_status = 'NOT_READY',
      updated_at = now()
  where id = new.opportunity_id;

  return new;
end $function$
;

CREATE OR REPLACE FUNCTION public.ui075v_touch_work_items_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

-- PG_OS_APPLICATION_MANAGED views
create or replace view "public"."pgos_remediation_closure_summary" as
 SELECT priority,
    count(*) AS total_items,
    count(*) FILTER (WHERE ((completion_rate = 100) AND ((closure_status)::text = 'source_closed'::text))) AS closed_items,
    round(avg(completion_rate), 2) AS avg_completion_rate
   FROM pgos_remediation_closure_items
  GROUP BY priority
  ORDER BY priority;;

create or replace view "public"."vw_expiring_contracts" as
 SELECT mc.id,
    mc.contract_id,
    mc.contract_name,
    mc.media_id,
    mm.media_name,
    mc.status,
    mc.expiry_date,
    mc.auto_renew,
    mc.auto_renew_days_before,
    (mc.expiry_date - CURRENT_DATE) AS days_remaining,
        CASE
            WHEN (mc.expiry_date < CURRENT_DATE) THEN 'expired'::text
            WHEN ((mc.expiry_date - CURRENT_DATE) <= 7) THEN 'urgent'::text
            WHEN ((mc.expiry_date - CURRENT_DATE) <= 30) THEN 'expiring_soon'::text
            ELSE 'normal'::text
        END AS urgency
   FROM (media_contracts mc
     LEFT JOIN media_master mm ON ((mm.id = mc.media_id)))
  WHERE (((mc.status)::text = ANY ((ARRAY['已生效'::character varying, '已签署'::character varying])::text[])) AND (mc.expiry_date IS NOT NULL));;

-- PG_OS_APPLICATION_MANAGED triggers
CREATE TRIGGER trg_advertiser_contacts_updated_at BEFORE UPDATE ON public.advertiser_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_advertisers_updated_at BEFORE UPDATE ON public.advertisers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_approvals_updated_at BEFORE UPDATE ON public.approvals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_campaign_launch_checks_updated_at BEFORE UPDATE ON public.campaign_launch_checks FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_campaign_media_allocations_updated_at BEFORE UPDATE ON public.campaign_media_allocations FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_commercial_tests_updated_at BEFORE UPDATE ON public.commercial_tests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sync_publisher_commercial_test_status AFTER INSERT OR UPDATE OF status ON public.commercial_tests FOR EACH ROW EXECUTE FUNCTION sync_publisher_commercial_test_status();
CREATE TRIGGER trg_contracts_updated_at BEFORE UPDATE ON public.contracts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_finance_exceptions_updated_at BEFORE UPDATE ON public.finance_exceptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_integration_check_results_updated_at BEFORE UPDATE ON public.integration_check_results FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_integration_checklists_updated_at BEFORE UPDATE ON public.integration_checklists FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_integration_project_profiles_updated_at BEFORE UPDATE ON public.integration_project_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_integration_projects_updated_at BEFORE UPDATE ON public.integration_projects FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_media_ecosystem_opportunities_updated_at BEFORE UPDATE ON public.media_ecosystem_opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_media_ecosystem_outreach_activities_updated_at BEFORE UPDATE ON public.media_ecosystem_outreach_activities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_media_ecosystem_segments_updated_at BEFORE UPDATE ON public.media_ecosystem_segments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_media_onboarding_stage_gate_transition BEFORE INSERT OR UPDATE ON public.media_onboarding_stage_gates FOR EACH ROW EXECUTE FUNCTION enforce_media_onboarding_stage_gate_transition();
CREATE TRIGGER trg_media_onboarding_stage_gates_updated_at BEFORE UPDATE ON public.media_onboarding_stage_gates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_media_supply_packages_updated_at BEFORE UPDATE ON public.media_supply_packages FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_media_trust_profiles_updated_at BEFORE UPDATE ON public.media_trust_profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_notify_business_event AFTER INSERT ON public.module_business_events FOR EACH ROW EXECUTE FUNCTION notify_business_event();
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_okr_key_results_updated_at BEFORE UPDATE ON public.okr_key_results FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_okr_objectives_updated_at BEFORE UPDATE ON public.okr_objectives FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON public.opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proposal_media_selections_updated_at BEFORE UPDATE ON public.proposal_media_selections FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_proposals_updated_at BEFORE UPDATE ON public.proposals FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_publisher_ad_slots_updated_at BEFORE UPDATE ON public.publisher_ad_slots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_publisher_contacts_updated_at BEFORE UPDATE ON public.publisher_contacts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_publisher_contract_terms_updated_at BEFORE UPDATE ON public.publisher_contract_terms FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_publisher_readiness_snapshots_updated_at BEFORE UPDATE ON public.publisher_readiness_snapshots FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_publisher_supply_transparency_updated_at BEFORE UPDATE ON public.publisher_supply_transparency FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_publishers_updated_at BEFORE UPDATE ON public.publishers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quality_diagnostic_cases_updated_at BEFORE UPDATE ON public.quality_diagnostic_cases FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quality_diagnostic_conclusions_updated_at BEFORE UPDATE ON public.quality_diagnostic_conclusions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quality_diagnostic_downstream_actions_updated_at BEFORE UPDATE ON public.quality_diagnostic_downstream_actions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_quality_diagnostic_evidence_updated_at BEFORE UPDATE ON public.quality_diagnostic_evidence FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_record_comments_updated_at BEFORE UPDATE ON public.record_comments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_settlements_updated_at BEFORE UPDATE ON public.settlements FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sop_cards_updated_at BEFORE UPDATE ON public.sop_cards FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sync_trusted_supply_candidate_opportunity AFTER INSERT ON public.trusted_supply_candidates FOR EACH ROW EXECUTE FUNCTION sync_trusted_supply_candidate_opportunity();
CREATE TRIGGER trg_trusted_supply_candidate_gate BEFORE INSERT OR UPDATE ON public.trusted_supply_candidates FOR EACH ROW EXECUTE FUNCTION assert_trusted_supply_candidate_gate();
CREATE TRIGGER trg_trusted_supply_candidates_updated_at BEFORE UPDATE ON public.trusted_supply_candidates FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_uat_script_runs_updated_at BEFORE UPDATE ON public.uat_script_runs FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_uat_script_step_results_updated_at BEFORE UPDATE ON public.uat_script_step_results FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_wizard_progress_records_updated_at BEFORE UPDATE ON public.wizard_progress_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_work_items_updated_at BEFORE UPDATE ON public.work_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- PG_OS_APPLICATION_MANAGED RLS state
alter table "public"."activity_logs" enable row level security;
alter table "public"."advertiser_bidding_monitor" enable row level security;
alter table "public"."advertiser_contacts" enable row level security;
alter table "public"."advertiser_contracts" enable row level security;
alter table "public"."advertiser_followup_log" enable row level security;
alter table "public"."advertiser_invoices" enable row level security;
alter table "public"."advertiser_master" enable row level security;
alter table "public"."advertiser_opportunities" enable row level security;
alter table "public"."advertiser_performance" enable row level security;
alter table "public"."advertiser_receivables" enable row level security;
alter table "public"."advertiser_strategy" enable row level security;
alter table "public"."advertisers" enable row level security;
alter table "public"."api_comparison_results" enable row level security;
alter table "public"."api_comparison_runs" enable row level security;
alter table "public"."api_doc_endpoints" enable row level security;
alter table "public"."api_doc_fields" enable row level security;
alter table "public"."api_traffic_captures" enable row level security;
alter table "public"."app_profile_raw" enable row level security;
alter table "public"."app_research_tasks" enable row level security;
alter table "public"."app_source_checks" enable row level security;
alter table "public"."approval_requests" enable row level security;
alter table "public"."approvals" enable row level security;
alter table "public"."assessment_dimensions" enable row level security;
alter table "public"."assessment_evaluations" enable row level security;
alter table "public"."assessment_input_documents" enable row level security;
alter table "public"."assessment_models" enable row level security;
alter table "public"."assessment_redlines" enable row level security;
alter table "public"."assessment_rules" enable row level security;
alter table "public"."attachments" enable row level security;
alter table "public"."audit_logs" enable row level security;
alter table "public"."auto_research_inbox" enable row level security;
alter table "public"."automation_inbox" enable row level security;
alter table "public"."business_handoffs" enable row level security;
alter table "public"."business_object_timeline" enable row level security;
alter table "public"."business_orders" enable row level security;
alter table "public"."business_side_effect_outbox" enable row level security;
alter table "public"."campaign_creatives" enable row level security;
alter table "public"."campaign_daily_reports" enable row level security;
alter table "public"."campaign_delivery_daily" enable row level security;
alter table "public"."campaign_demands" enable row level security;
alter table "public"."campaign_executions" enable row level security;
alter table "public"."campaign_flights" enable row level security;
alter table "public"."campaign_launch_checks" enable row level security;
alter table "public"."campaign_line_items" enable row level security;
alter table "public"."campaign_media_allocations" enable row level security;
alter table "public"."campaign_reviews" enable row level security;
alter table "public"."campaign_tracking_checks" enable row level security;
alter table "public"."campaigns" enable row level security;
alter table "public"."capability_tags" enable row level security;
alter table "public"."channel_technical_profiles" enable row level security;
alter table "public"."checklist_templates" enable row level security;
alter table "public"."comments" enable row level security;
alter table "public"."commercial_proposals" enable row level security;
alter table "public"."commercial_tests" enable row level security;
alter table "public"."contracts" enable row level security;
alter table "public"."data_quality_checks" enable row level security;
alter table "public"."data_reconciliation_results" enable row level security;
alter table "public"."evaluation_scoring_rules" enable row level security;
alter table "public"."field_access_policies" enable row level security;
alter table "public"."files" enable row level security;
alter table "public"."finance_business_chain_snapshots" enable row level security;
alter table "public"."finance_exceptions" enable row level security;
alter table "public"."finance_ledger_entries" enable row level security;
alter table "public"."finance_reconciliation_items" enable row level security;
alter table "public"."governance_rule_source_registry" enable row level security;
alter table "public"."health_check" enable row level security;
alter table "public"."integration_check_results" enable row level security;
alter table "public"."integration_checklists" enable row level security;
alter table "public"."integration_project_profiles" enable row level security;
alter table "public"."integration_projects" enable row level security;
alter table "public"."invoices" enable row level security;
alter table "public"."issue_logs" enable row level security;
alter table "public"."job_runs" enable row level security;
alter table "public"."kpi_snapshots" enable row level security;
alter table "public"."kpi_targets" enable row level security;
alter table "public"."live_test_hourly_logs" enable row level security;
alter table "public"."live_test_sessions" enable row level security;
alter table "public"."management_action_queue" enable row level security;
alter table "public"."media_assets" enable row level security;
alter table "public"."media_budget_allocation_tiers" enable row level security;
alter table "public"."media_budget_evaluations" enable row level security;
alter table "public"."media_budget_pools" enable row level security;
alter table "public"."media_compliance" enable row level security;
alter table "public"."media_contacts" enable row level security;
alter table "public"."media_contract_attachments" enable row level security;
alter table "public"."media_contract_orders" enable row level security;
alter table "public"."media_contracts" enable row level security;
alter table "public"."media_ecosystem_conversion_logs" enable row level security;
alter table "public"."media_ecosystem_opportunities" enable row level security;
alter table "public"."media_ecosystem_outreach_activities" enable row level security;
alter table "public"."media_ecosystem_segments" enable row level security;
alter table "public"."media_followup_logs" enable row level security;
alter table "public"."media_inventory" enable row level security;
alter table "public"."media_lead_inbox" enable row level security;
alter table "public"."media_master" enable row level security;
alter table "public"."media_monitoring_alerts" enable row level security;
alter table "public"."media_onboarding_projects" enable row level security;
alter table "public"."media_onboarding_stage_gates" enable row level security;
alter table "public"."media_package_rate_cards" enable row level security;
alter table "public"."media_payables" enable row level security;
alter table "public"."media_payment_gate_results" enable row level security;
alter table "public"."media_quality_scores" enable row level security;
alter table "public"."media_revenue_performance" enable row level security;
alter table "public"."media_settlements" enable row level security;
alter table "public"."media_strategy" enable row level security;
alter table "public"."media_supply_daily_snapshots" enable row level security;
alter table "public"."media_supply_packages" enable row level security;
alter table "public"."media_tech_integrations" enable row level security;
alter table "public"."media_traffic_quality" enable row level security;
alter table "public"."media_trust_profiles" enable row level security;
alter table "public"."media_trust_score_history" enable row level security;
alter table "public"."metric_definitions" enable row level security;
alter table "public"."metric_funnel_snapshots" enable row level security;
alter table "public"."metric_snapshots" enable row level security;
alter table "public"."module_business_events" enable row level security;
alter table "public"."notification_acknowledgements" enable row level security;
alter table "public"."notification_logs" enable row level security;
alter table "public"."notification_outbox" enable row level security;
alter table "public"."notifications" enable row level security;
alter table "public"."okr_checkins" enable row level security;
alter table "public"."okr_key_results" enable row level security;
alter table "public"."okr_objectives" enable row level security;
alter table "public"."onboarding_checklist_items" enable row level security;
alter table "public"."onboarding_gate_results" enable row level security;
alter table "public"."onboarding_stage_records" enable row level security;
alter table "public"."opportunities" enable row level security;
alter table "public"."owner_identity_resolution_exceptions" enable row level security;
alter table "public"."payment_collections" enable row level security;
alter table "public"."pgos_export_logs" enable row level security;
alter table "public"."pgos_generated_reports" enable row level security;
alter table "public"."pgos_import_batches" enable row level security;
alter table "public"."pgos_production_hardening_items" enable row level security;
alter table "public"."pgos_remediation_closure_items" enable row level security;
alter table "public"."pgos_schema_migrations" enable row level security;
alter table "public"."pgos_sessions" enable row level security;
alter table "public"."pgos_users" enable row level security;
alter table "public"."production_runtime_acceptance_runs" enable row level security;
alter table "public"."profiles" enable row level security;
alter table "public"."proposal_media_selections" enable row level security;
alter table "public"."proposals" enable row level security;
alter table "public"."publisher_ad_slots" enable row level security;
alter table "public"."publisher_contacts" enable row level security;
alter table "public"."publisher_contract_terms" enable row level security;
alter table "public"."publisher_readiness_snapshots" enable row level security;
alter table "public"."publisher_supply_transparency" enable row level security;
alter table "public"."publisher_traffic_evidence_history" enable row level security;
alter table "public"."publishers" enable row level security;
alter table "public"."purchase_orders" enable row level security;
alter table "public"."quality_diagnostic_cases" enable row level security;
alter table "public"."quality_diagnostic_conclusions" enable row level security;
alter table "public"."quality_diagnostic_downstream_actions" enable row level security;
alter table "public"."quality_diagnostic_evidence" enable row level security;
alter table "public"."rate_limit_buckets" enable row level security;
alter table "public"."record_comments" enable row level security;
alter table "public"."role_capabilities" enable row level security;
alter table "public"."roles" enable row level security;
alter table "public"."route_permissions" enable row level security;
alter table "public"."settlement_items" enable row level security;
alter table "public"."settlements" enable row level security;
alter table "public"."sla_instances" enable row level security;
alter table "public"."sop_cards" enable row level security;
alter table "public"."sop_metric_tolerances" enable row level security;
alter table "public"."system_audit_logs" enable row level security;
alter table "public"."task_dependencies" enable row level security;
alter table "public"."task_items" enable row level security;
alter table "public"."team_members" enable row level security;
alter table "public"."tech_reference" enable row level security;
alter table "public"."trusted_supply_candidates" enable row level security;
alter table "public"."uat_script_runs" enable row level security;
alter table "public"."uat_script_step_results" enable row level security;
alter table "public"."user_preferences" enable row level security;
alter table "public"."user_roles" enable row level security;
alter table "public"."wizard_progress_records" enable row level security;
alter table "public"."work_item_events" enable row level security;
alter table "public"."work_item_links" enable row level security;
alter table "public"."work_items" enable row level security;
alter table "public"."workflow_definitions" enable row level security;
alter table "public"."workflow_gate_checks" enable row level security;

-- PG_OS_APPLICATION_MANAGED policies
create policy "advertiser_contacts_read_business" on "public"."advertiser_contacts" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "advertiser_contacts_write_sales" on "public"."advertiser_contacts" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['sales_director'::text, 'sales_manager'::text, 'operations_director'::text, 'customer_success_manager'::text])) with check (has_any_role(ARRAY['sales_director'::text, 'sales_manager'::text, 'operations_director'::text, 'customer_success_manager'::text]));
create policy "advertisers_read_business" on "public"."advertisers" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "advertisers_write_sales" on "public"."advertisers" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['sales_director'::text, 'sales_manager'::text, 'operations_director'::text, 'customer_success_manager'::text])) with check (has_any_role(ARRAY['sales_director'::text, 'sales_manager'::text, 'operations_director'::text, 'customer_success_manager'::text]));
create policy "approvals_read_business" on "public"."approvals" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "approvals_write_business" on "public"."approvals" as PERMISSIVE for ALL to "public" using (((auth.uid() IS NOT NULL) AND (NOT has_any_role(ARRAY['audit_viewer'::text, 'system_admin'::text])))) with check (((auth.uid() IS NOT NULL) AND (NOT has_any_role(ARRAY['audit_viewer'::text, 'system_admin'::text]))));
create policy "attachments_read_business" on "public"."attachments" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "attachments_write_business" on "public"."attachments" as PERMISSIVE for INSERT to "public" with check (((auth.uid() IS NOT NULL) AND (NOT has_role('audit_viewer'::text))));
create policy "audit_logs_insert_business" on "public"."audit_logs" as PERMISSIVE for INSERT to "public" with check (((auth.uid() IS NOT NULL) AND (actor_user_id = auth.uid()) AND (object_type = ANY (ARRAY['advertiser'::text, 'opportunity'::text, 'publisher'::text, 'proposal'::text, 'campaign'::text, 'contract'::text, 'diagnostic_case'::text, 'okr'::text, 'settlement'::text, 'workbench_task'::text, 'approval'::text])) AND (COALESCE((after_data ->> 'businessAuditCoverage'::text), ''::text) = 'phase28_core_business_action'::text) AND (NOT has_role('audit_viewer'::text))));
create policy "audit_logs_insert_system" on "public"."audit_logs" as PERMISSIVE for INSERT to "public" with check ((auth.uid() IS NOT NULL));
create policy "audit_logs_read_privileged" on "public"."audit_logs" as PERMISSIVE for SELECT to "public" using (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'audit_viewer'::text, 'system_admin'::text]));
create policy "audit_logs_update_own_business" on "public"."audit_logs" as PERMISSIVE for UPDATE to "public" using (((auth.uid() IS NOT NULL) AND (actor_user_id = auth.uid()) AND (object_type = ANY (ARRAY['advertiser'::text, 'opportunity'::text, 'publisher'::text, 'proposal'::text, 'campaign'::text, 'contract'::text, 'diagnostic_case'::text, 'okr'::text, 'settlement'::text, 'workbench_task'::text, 'approval'::text])) AND (COALESCE((after_data ->> 'businessAuditCoverage'::text), ''::text) = 'phase28_core_business_action'::text) AND (NOT has_role('audit_viewer'::text)))) with check (((auth.uid() IS NOT NULL) AND (actor_user_id = auth.uid()) AND (object_type = ANY (ARRAY['advertiser'::text, 'opportunity'::text, 'publisher'::text, 'proposal'::text, 'campaign'::text, 'contract'::text, 'diagnostic_case'::text, 'okr'::text, 'settlement'::text, 'workbench_task'::text, 'approval'::text])) AND (COALESCE((after_data ->> 'businessAuditCoverage'::text), ''::text) = 'phase28_core_business_action'::text) AND (NOT has_role('audit_viewer'::text))));
create policy "campaign_launch_checks_read_business" on "public"."campaign_launch_checks" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "campaign_launch_checks_write_ops" on "public"."campaign_launch_checks" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['adops_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['adops_manager'::text, 'operations_director'::text]));
create policy "campaign_allocations_read_business" on "public"."campaign_media_allocations" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "campaign_allocations_write_ops" on "public"."campaign_media_allocations" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['adops_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['adops_manager'::text, 'operations_director'::text]));
create policy "campaigns_read_business" on "public"."campaigns" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "campaigns_write_ops" on "public"."campaigns" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['adops_manager'::text, 'operations_director'::text, 'customer_success_manager'::text])) with check (has_any_role(ARRAY['adops_manager'::text, 'operations_director'::text, 'customer_success_manager'::text]));
create policy "capability_read_authenticated" on "public"."capability_tags" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "comments_read_business" on "public"."comments" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "comments_write_business" on "public"."comments" as PERMISSIVE for INSERT to "public" with check (((auth.uid() IS NOT NULL) AND (NOT has_role('audit_viewer'::text))));
create policy "commercial_tests_read_business" on "public"."commercial_tests" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "commercial_tests_write_ops_media" on "public"."commercial_tests" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['adops_manager'::text, 'media_director'::text, 'operations_director'::text, 'data_analyst'::text])) with check (has_any_role(ARRAY['adops_manager'::text, 'media_director'::text, 'operations_director'::text, 'data_analyst'::text]));
create policy "contracts_read_business" on "public"."contracts" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "contracts_write_finance_legal" on "public"."contracts" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['finance_manager'::text, 'legal_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['finance_manager'::text, 'legal_manager'::text, 'operations_director'::text]));
create policy "finance_exceptions_read_business" on "public"."finance_exceptions" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "finance_exceptions_write" on "public"."finance_exceptions" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['finance_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['finance_manager'::text, 'operations_director'::text]));
create policy "integration_check_results_read_business" on "public"."integration_check_results" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "integration_check_results_write_operators" on "public"."integration_check_results" as PERMISSIVE for ALL to "public" using ((has_any_role(ARRAY['integration_manager'::text, 'media_director'::text, 'operations_director'::text]) OR ((owner_role = 'legal_manager'::text) AND has_role('legal_manager'::text)) OR ((owner_role = 'data_analyst'::text) AND has_role('data_analyst'::text)))) with check ((has_any_role(ARRAY['integration_manager'::text, 'media_director'::text, 'operations_director'::text]) OR ((owner_role = 'legal_manager'::text) AND has_role('legal_manager'::text)) OR ((owner_role = 'data_analyst'::text) AND has_role('data_analyst'::text))));
create policy "integration_checklists_read_business" on "public"."integration_checklists" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "integration_checklists_write_integration" on "public"."integration_checklists" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['integration_manager'::text, 'media_director'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['integration_manager'::text, 'media_director'::text, 'operations_director'::text]));
create policy "integration_project_profiles_read_business" on "public"."integration_project_profiles" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "integration_project_profiles_write_operators" on "public"."integration_project_profiles" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['integration_manager'::text, 'media_director'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['integration_manager'::text, 'media_director'::text, 'operations_director'::text]));
create policy "integration_projects_read_business" on "public"."integration_projects" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "integration_projects_write_integration" on "public"."integration_projects" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['integration_manager'::text, 'media_manager'::text, 'media_director'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['integration_manager'::text, 'media_manager'::text, 'media_director'::text, 'operations_director'::text]));
create policy "invoices_read_business" on "public"."invoices" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "invoices_write_finance" on "public"."invoices" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['finance_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['finance_manager'::text, 'operations_director'::text]));
create policy "media_ecosystem_conversion_logs_insert_media" on "public"."media_ecosystem_conversion_logs" as PERMISSIVE for INSERT to "public" with check (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'system_admin'::text]));
create policy "media_ecosystem_conversion_logs_read_business" on "public"."media_ecosystem_conversion_logs" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "media_ecosystem_opportunities_delete_director" on "public"."media_ecosystem_opportunities" as PERMISSIVE for DELETE to "public" using (has_any_role(ARRAY['media_director'::text, 'operations_director'::text, 'system_admin'::text]));
create policy "media_ecosystem_opportunities_insert_media" on "public"."media_ecosystem_opportunities" as PERMISSIVE for INSERT to "public" with check (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'system_admin'::text]));
create policy "media_ecosystem_opportunities_read_business" on "public"."media_ecosystem_opportunities" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "media_ecosystem_opportunities_update_media" on "public"."media_ecosystem_opportunities" as PERMISSIVE for UPDATE to "public" using (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'system_admin'::text])) with check (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'system_admin'::text]));
create policy "media_ecosystem_outreach_read_business" on "public"."media_ecosystem_outreach_activities" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "media_ecosystem_outreach_write_media" on "public"."media_ecosystem_outreach_activities" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'system_admin'::text])) with check (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'system_admin'::text]));
create policy "media_ecosystem_segments_read_business" on "public"."media_ecosystem_segments" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "media_ecosystem_segments_write_director" on "public"."media_ecosystem_segments" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['media_director'::text, 'operations_director'::text, 'system_admin'::text])) with check (has_any_role(ARRAY['media_director'::text, 'operations_director'::text, 'system_admin'::text]));
create policy "media_onboarding_stage_gates_insert_operators" on "public"."media_onboarding_stage_gates" as PERMISSIVE for INSERT to "public" with check (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'integration_manager'::text, 'adops_manager'::text, 'data_analyst'::text, 'legal_manager'::text, 'operations_director'::text]));
create policy "media_onboarding_stage_gates_read_business" on "public"."media_onboarding_stage_gates" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "media_onboarding_stage_gates_update_operators" on "public"."media_onboarding_stage_gates" as PERMISSIVE for UPDATE to "public" using (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'integration_manager'::text, 'adops_manager'::text, 'data_analyst'::text, 'legal_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'integration_manager'::text, 'adops_manager'::text, 'data_analyst'::text, 'legal_manager'::text, 'operations_director'::text]));
create policy "media_supply_packages_read_business" on "public"."media_supply_packages" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "media_supply_packages_write_media" on "public"."media_supply_packages" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'system_admin'::text])) with check (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'system_admin'::text]));
create policy "media_trust_profiles_read_business" on "public"."media_trust_profiles" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "media_trust_profiles_write_media" on "public"."media_trust_profiles" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'data_analyst'::text, 'system_admin'::text])) with check (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'data_analyst'::text, 'system_admin'::text]));
create policy "media_trust_score_history_insert_media" on "public"."media_trust_score_history" as PERMISSIVE for INSERT to "public" with check (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'data_analyst'::text, 'system_admin'::text]));
create policy "media_trust_score_history_read_business" on "public"."media_trust_score_history" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "metric_snapshots_read_business" on "public"."metric_funnel_snapshots" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "metric_snapshots_write_data" on "public"."metric_funnel_snapshots" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['data_analyst'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['data_analyst'::text, 'operations_director'::text]));
create policy "events_insert_business" on "public"."module_business_events" as PERMISSIVE for INSERT to "public" with check ((auth.uid() IS NOT NULL));
create policy "events_read_business" on "public"."module_business_events" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "notifications_read_self" on "public"."notifications" as PERMISSIVE for SELECT to "public" using ((recipient_user_id = auth.uid()));
create policy "notifications_update_self" on "public"."notifications" as PERMISSIVE for UPDATE to "public" using ((recipient_user_id = auth.uid())) with check ((recipient_user_id = auth.uid()));
create policy "okr_checkins_read" on "public"."okr_checkins" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "okr_checkins_write" on "public"."okr_checkins" as PERMISSIVE for INSERT to "public" with check (((auth.uid() IS NOT NULL) AND (NOT has_role('audit_viewer'::text))));
create policy "kr_read_business" on "public"."okr_key_results" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "kr_write_director" on "public"."okr_key_results" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'sales_director'::text, 'media_director'::text, 'product_owner'::text])) with check (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'sales_director'::text, 'media_director'::text, 'product_owner'::text]));
create policy "okr_read_business" on "public"."okr_objectives" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "okr_write_director" on "public"."okr_objectives" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'sales_director'::text, 'media_director'::text, 'product_owner'::text])) with check (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'sales_director'::text, 'media_director'::text, 'product_owner'::text]));
create policy "opportunities_read_business" on "public"."opportunities" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "opportunities_write_sales" on "public"."opportunities" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['sales_director'::text, 'sales_manager'::text, 'operations_director'::text, 'customer_success_manager'::text])) with check (has_any_role(ARRAY['sales_director'::text, 'sales_manager'::text, 'operations_director'::text, 'customer_success_manager'::text]));
create policy "profiles_read_self_or_admin" on "public"."profiles" as PERMISSIVE for SELECT to "public" using (((id = auth.uid()) OR has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'system_admin'::text, 'audit_viewer'::text])));
create policy "proposal_media_read_business" on "public"."proposal_media_selections" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "proposal_media_write_sales" on "public"."proposal_media_selections" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['sales_director'::text, 'sales_manager'::text, 'operations_director'::text, 'customer_success_manager'::text])) with check (has_any_role(ARRAY['sales_director'::text, 'sales_manager'::text, 'operations_director'::text, 'customer_success_manager'::text]));
create policy "proposals_read_business" on "public"."proposals" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "proposals_write_sales" on "public"."proposals" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['sales_director'::text, 'sales_manager'::text, 'operations_director'::text, 'customer_success_manager'::text])) with check (has_any_role(ARRAY['sales_director'::text, 'sales_manager'::text, 'operations_director'::text, 'customer_success_manager'::text]));
create policy "publisher_ad_slots_read_business" on "public"."publisher_ad_slots" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "publisher_ad_slots_write_media" on "public"."publisher_ad_slots" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['media_director'::text, 'media_manager'::text, 'integration_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['media_director'::text, 'media_manager'::text, 'integration_manager'::text, 'operations_director'::text]));
create policy "media_child_read_business" on "public"."publisher_contacts" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "media_child_write_media" on "public"."publisher_contacts" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['media_director'::text, 'media_manager'::text, 'integration_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['media_director'::text, 'media_manager'::text, 'integration_manager'::text, 'operations_director'::text]));
create policy "publisher_contract_terms_read_business" on "public"."publisher_contract_terms" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "publisher_contract_terms_write_media_finance" on "public"."publisher_contract_terms" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['media_director'::text, 'media_manager'::text, 'finance_manager'::text, 'legal_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['media_director'::text, 'media_manager'::text, 'finance_manager'::text, 'legal_manager'::text, 'operations_director'::text]));
create policy "readiness_snapshots_insert" on "public"."publisher_readiness_snapshots" as PERMISSIVE for INSERT to "public" with check ((auth.uid() IS NOT NULL));
create policy "readiness_snapshots_read" on "public"."publisher_readiness_snapshots" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "publisher_supply_transparency_read_business" on "public"."publisher_supply_transparency" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "publisher_supply_transparency_write_media" on "public"."publisher_supply_transparency" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['media_director'::text, 'media_manager'::text, 'integration_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['media_director'::text, 'media_manager'::text, 'integration_manager'::text, 'operations_director'::text]));
create policy "publisher_traffic_evidence_insert_media" on "public"."publisher_traffic_evidence_history" as PERMISSIVE for INSERT to "public" with check (((actor_user_id = auth.uid()) AND has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text])));
create policy "publisher_traffic_evidence_read_business" on "public"."publisher_traffic_evidence_history" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "publishers_read_business" on "public"."publishers" as PERMISSIVE for SELECT to "public" using (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'sales_director'::text, 'sales_manager'::text, 'media_director'::text, 'media_manager'::text, 'adops_manager'::text, 'integration_manager'::text, 'data_analyst'::text, 'finance_manager'::text, 'legal_manager'::text, 'customer_success_manager'::text, 'product_owner'::text, 'audit_viewer'::text, 'system_admin'::text]));
create policy "publishers_write_media" on "public"."publishers" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['media_director'::text, 'media_manager'::text, 'integration_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['media_director'::text, 'media_manager'::text, 'integration_manager'::text, 'operations_director'::text]));
create policy "po_read_business" on "public"."purchase_orders" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "po_write_finance" on "public"."purchase_orders" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['finance_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['finance_manager'::text, 'operations_director'::text]));
create policy "diagnostics_read_business" on "public"."quality_diagnostic_cases" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "diagnostics_write_quality" on "public"."quality_diagnostic_cases" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['operations_director'::text, 'media_director'::text, 'media_manager'::text, 'adops_manager'::text, 'integration_manager'::text, 'data_analyst'::text, 'finance_manager'::text])) with check (has_any_role(ARRAY['operations_director'::text, 'media_director'::text, 'media_manager'::text, 'adops_manager'::text, 'integration_manager'::text, 'data_analyst'::text, 'finance_manager'::text]));
create policy "diagnostics_conclusions_read" on "public"."quality_diagnostic_conclusions" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "diagnostics_conclusions_write" on "public"."quality_diagnostic_conclusions" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['operations_director'::text, 'media_director'::text, 'media_manager'::text, 'data_analyst'::text])) with check (has_any_role(ARRAY['operations_director'::text, 'media_director'::text, 'media_manager'::text, 'data_analyst'::text]));
create policy "diagnostics_downstream_read" on "public"."quality_diagnostic_downstream_actions" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "diagnostics_downstream_write" on "public"."quality_diagnostic_downstream_actions" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['operations_director'::text, 'media_director'::text, 'media_manager'::text, 'adops_manager'::text, 'data_analyst'::text])) with check (has_any_role(ARRAY['operations_director'::text, 'media_director'::text, 'media_manager'::text, 'adops_manager'::text, 'data_analyst'::text]));
create policy "diagnostics_evidence_read_business" on "public"."quality_diagnostic_evidence" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "diagnostics_evidence_write_quality" on "public"."quality_diagnostic_evidence" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['operations_director'::text, 'media_director'::text, 'media_manager'::text, 'adops_manager'::text, 'integration_manager'::text, 'data_analyst'::text, 'finance_manager'::text])) with check (has_any_role(ARRAY['operations_director'::text, 'media_director'::text, 'media_manager'::text, 'adops_manager'::text, 'integration_manager'::text, 'data_analyst'::text, 'finance_manager'::text]));
create policy "record_comments_delete_authenticated" on "public"."record_comments" as PERMISSIVE for DELETE to "authenticated" using (true);
create policy "record_comments_insert_authenticated" on "public"."record_comments" as PERMISSIVE for INSERT to "authenticated" with check (true);
create policy "record_comments_select_authenticated" on "public"."record_comments" as PERMISSIVE for SELECT to "authenticated" using ((deleted_at IS NULL));
create policy "record_comments_update_authenticated" on "public"."record_comments" as PERMISSIVE for UPDATE to "authenticated" using (true) with check (true);
create policy "role_capabilities_read_authenticated" on "public"."role_capabilities" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "roles_read_authenticated" on "public"."roles" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "route_permissions_read_authenticated" on "public"."route_permissions" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "settlement_items_read_business" on "public"."settlement_items" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "settlement_items_write_finance" on "public"."settlement_items" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['finance_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['finance_manager'::text, 'operations_director'::text]));
create policy "settlements_read_business" on "public"."settlements" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "settlements_write_finance" on "public"."settlements" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['finance_manager'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['finance_manager'::text, 'operations_director'::text]));
create policy "sop_read_business" on "public"."sop_cards" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "sop_write_product" on "public"."sop_cards" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['product_owner'::text, 'operations_director'::text])) with check (has_any_role(ARRAY['product_owner'::text, 'operations_director'::text]));
create policy "trusted_supply_candidates_read_business" on "public"."trusted_supply_candidates" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "trusted_supply_candidates_write_media" on "public"."trusted_supply_candidates" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'system_admin'::text])) with check (has_any_role(ARRAY['media_manager'::text, 'media_director'::text, 'operations_director'::text, 'system_admin'::text]));
create policy "uat_script_runs_read_signoff" on "public"."uat_script_runs" as PERMISSIVE for SELECT to "public" using (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'system_admin'::text, 'audit_viewer'::text]));
create policy "uat_script_runs_write_signoff" on "public"."uat_script_runs" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'system_admin'::text, 'audit_viewer'::text])) with check (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'system_admin'::text, 'audit_viewer'::text]));
create policy "uat_script_step_results_read_signoff" on "public"."uat_script_step_results" as PERMISSIVE for SELECT to "public" using (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'system_admin'::text, 'audit_viewer'::text]));
create policy "uat_script_step_results_write_signoff" on "public"."uat_script_step_results" as PERMISSIVE for ALL to "public" using (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'system_admin'::text, 'audit_viewer'::text])) with check (has_any_role(ARRAY['ceo'::text, 'operations_director'::text, 'system_admin'::text, 'audit_viewer'::text]));
create policy "user_roles_read_admin" on "public"."user_roles" as PERMISSIVE for SELECT to "public" using (has_any_role(ARRAY['system_admin'::text, 'audit_viewer'::text, 'ceo'::text]));
create policy "user_roles_read_self_or_admin" on "public"."user_roles" as PERMISSIVE for SELECT to "public" using (((user_id = auth.uid()) OR has_any_role(ARRAY['system_admin'::text, 'audit_viewer'::text, 'ceo'::text])));
create policy "wizard_read_business" on "public"."wizard_progress_records" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "wizard_write_business" on "public"."wizard_progress_records" as PERMISSIVE for ALL to "public" using (((auth.uid() IS NOT NULL) AND (NOT has_role('audit_viewer'::text)))) with check (((auth.uid() IS NOT NULL) AND (NOT has_role('audit_viewer'::text))));
create policy "work_item_events_insert_actor" on "public"."work_item_events" as PERMISSIVE for INSERT to "authenticated" with check ((actor_email = (auth.jwt() ->> 'email'::text)));
create policy "work_items_read_business" on "public"."work_items" as PERMISSIVE for SELECT to "public" using ((auth.uid() IS NOT NULL));
create policy "work_items_write_business" on "public"."work_items" as PERMISSIVE for ALL to "public" using (((auth.uid() IS NOT NULL) AND (NOT has_role('audit_viewer'::text)))) with check (((auth.uid() IS NOT NULL) AND (NOT has_role('audit_viewer'::text))));

-- PG_OS_APPLICATION_MANAGED grants
grant USAGE on schema public to "public";
grant CREATE on schema public to "pg_database_owner";
grant USAGE on schema public to "pg_database_owner";
grant USAGE on schema public to "anon";
grant USAGE on schema public to "authenticated";
grant USAGE on schema public to "service_role";
grant DELETE on table "public"."activity_logs" to "anon";
grant INSERT on table "public"."activity_logs" to "anon";
grant MAINTAIN on table "public"."activity_logs" to "anon";
grant REFERENCES on table "public"."activity_logs" to "anon";
grant SELECT on table "public"."activity_logs" to "anon";
grant TRIGGER on table "public"."activity_logs" to "anon";
grant TRUNCATE on table "public"."activity_logs" to "anon";
grant UPDATE on table "public"."activity_logs" to "anon";
grant DELETE on table "public"."activity_logs" to "authenticated";
grant INSERT on table "public"."activity_logs" to "authenticated";
grant MAINTAIN on table "public"."activity_logs" to "authenticated";
grant REFERENCES on table "public"."activity_logs" to "authenticated";
grant SELECT on table "public"."activity_logs" to "authenticated";
grant TRIGGER on table "public"."activity_logs" to "authenticated";
grant TRUNCATE on table "public"."activity_logs" to "authenticated";
grant UPDATE on table "public"."activity_logs" to "authenticated";
grant DELETE on table "public"."activity_logs" to "service_role";
grant INSERT on table "public"."activity_logs" to "service_role";
grant MAINTAIN on table "public"."activity_logs" to "service_role";
grant REFERENCES on table "public"."activity_logs" to "service_role";
grant SELECT on table "public"."activity_logs" to "service_role";
grant TRIGGER on table "public"."activity_logs" to "service_role";
grant TRUNCATE on table "public"."activity_logs" to "service_role";
grant UPDATE on table "public"."activity_logs" to "service_role";
grant DELETE on table "public"."advertiser_bidding_monitor" to "anon";
grant INSERT on table "public"."advertiser_bidding_monitor" to "anon";
grant MAINTAIN on table "public"."advertiser_bidding_monitor" to "anon";
grant REFERENCES on table "public"."advertiser_bidding_monitor" to "anon";
grant SELECT on table "public"."advertiser_bidding_monitor" to "anon";
grant TRIGGER on table "public"."advertiser_bidding_monitor" to "anon";
grant TRUNCATE on table "public"."advertiser_bidding_monitor" to "anon";
grant UPDATE on table "public"."advertiser_bidding_monitor" to "anon";
grant DELETE on table "public"."advertiser_bidding_monitor" to "authenticated";
grant INSERT on table "public"."advertiser_bidding_monitor" to "authenticated";
grant MAINTAIN on table "public"."advertiser_bidding_monitor" to "authenticated";
grant REFERENCES on table "public"."advertiser_bidding_monitor" to "authenticated";
grant SELECT on table "public"."advertiser_bidding_monitor" to "authenticated";
grant TRIGGER on table "public"."advertiser_bidding_monitor" to "authenticated";
grant TRUNCATE on table "public"."advertiser_bidding_monitor" to "authenticated";
grant UPDATE on table "public"."advertiser_bidding_monitor" to "authenticated";
grant DELETE on table "public"."advertiser_bidding_monitor" to "service_role";
grant INSERT on table "public"."advertiser_bidding_monitor" to "service_role";
grant MAINTAIN on table "public"."advertiser_bidding_monitor" to "service_role";
grant REFERENCES on table "public"."advertiser_bidding_monitor" to "service_role";
grant SELECT on table "public"."advertiser_bidding_monitor" to "service_role";
grant TRIGGER on table "public"."advertiser_bidding_monitor" to "service_role";
grant TRUNCATE on table "public"."advertiser_bidding_monitor" to "service_role";
grant UPDATE on table "public"."advertiser_bidding_monitor" to "service_role";
grant DELETE on table "public"."advertiser_contacts" to "anon";
grant INSERT on table "public"."advertiser_contacts" to "anon";
grant MAINTAIN on table "public"."advertiser_contacts" to "anon";
grant REFERENCES on table "public"."advertiser_contacts" to "anon";
grant SELECT on table "public"."advertiser_contacts" to "anon";
grant TRIGGER on table "public"."advertiser_contacts" to "anon";
grant TRUNCATE on table "public"."advertiser_contacts" to "anon";
grant UPDATE on table "public"."advertiser_contacts" to "anon";
grant DELETE on table "public"."advertiser_contacts" to "authenticated";
grant INSERT on table "public"."advertiser_contacts" to "authenticated";
grant MAINTAIN on table "public"."advertiser_contacts" to "authenticated";
grant REFERENCES on table "public"."advertiser_contacts" to "authenticated";
grant SELECT on table "public"."advertiser_contacts" to "authenticated";
grant TRIGGER on table "public"."advertiser_contacts" to "authenticated";
grant TRUNCATE on table "public"."advertiser_contacts" to "authenticated";
grant UPDATE on table "public"."advertiser_contacts" to "authenticated";
grant DELETE on table "public"."advertiser_contacts" to "service_role";
grant INSERT on table "public"."advertiser_contacts" to "service_role";
grant MAINTAIN on table "public"."advertiser_contacts" to "service_role";
grant REFERENCES on table "public"."advertiser_contacts" to "service_role";
grant SELECT on table "public"."advertiser_contacts" to "service_role";
grant TRIGGER on table "public"."advertiser_contacts" to "service_role";
grant TRUNCATE on table "public"."advertiser_contacts" to "service_role";
grant UPDATE on table "public"."advertiser_contacts" to "service_role";
grant DELETE on table "public"."advertiser_contracts" to "anon";
grant INSERT on table "public"."advertiser_contracts" to "anon";
grant MAINTAIN on table "public"."advertiser_contracts" to "anon";
grant REFERENCES on table "public"."advertiser_contracts" to "anon";
grant SELECT on table "public"."advertiser_contracts" to "anon";
grant TRIGGER on table "public"."advertiser_contracts" to "anon";
grant TRUNCATE on table "public"."advertiser_contracts" to "anon";
grant UPDATE on table "public"."advertiser_contracts" to "anon";
grant DELETE on table "public"."advertiser_contracts" to "authenticated";
grant INSERT on table "public"."advertiser_contracts" to "authenticated";
grant MAINTAIN on table "public"."advertiser_contracts" to "authenticated";
grant REFERENCES on table "public"."advertiser_contracts" to "authenticated";
grant SELECT on table "public"."advertiser_contracts" to "authenticated";
grant TRIGGER on table "public"."advertiser_contracts" to "authenticated";
grant TRUNCATE on table "public"."advertiser_contracts" to "authenticated";
grant UPDATE on table "public"."advertiser_contracts" to "authenticated";
grant DELETE on table "public"."advertiser_contracts" to "service_role";
grant INSERT on table "public"."advertiser_contracts" to "service_role";
grant MAINTAIN on table "public"."advertiser_contracts" to "service_role";
grant REFERENCES on table "public"."advertiser_contracts" to "service_role";
grant SELECT on table "public"."advertiser_contracts" to "service_role";
grant TRIGGER on table "public"."advertiser_contracts" to "service_role";
grant TRUNCATE on table "public"."advertiser_contracts" to "service_role";
grant UPDATE on table "public"."advertiser_contracts" to "service_role";
grant DELETE on table "public"."advertiser_followup_log" to "anon";
grant INSERT on table "public"."advertiser_followup_log" to "anon";
grant MAINTAIN on table "public"."advertiser_followup_log" to "anon";
grant REFERENCES on table "public"."advertiser_followup_log" to "anon";
grant SELECT on table "public"."advertiser_followup_log" to "anon";
grant TRIGGER on table "public"."advertiser_followup_log" to "anon";
grant TRUNCATE on table "public"."advertiser_followup_log" to "anon";
grant UPDATE on table "public"."advertiser_followup_log" to "anon";
grant DELETE on table "public"."advertiser_followup_log" to "authenticated";
grant INSERT on table "public"."advertiser_followup_log" to "authenticated";
grant MAINTAIN on table "public"."advertiser_followup_log" to "authenticated";
grant REFERENCES on table "public"."advertiser_followup_log" to "authenticated";
grant SELECT on table "public"."advertiser_followup_log" to "authenticated";
grant TRIGGER on table "public"."advertiser_followup_log" to "authenticated";
grant TRUNCATE on table "public"."advertiser_followup_log" to "authenticated";
grant UPDATE on table "public"."advertiser_followup_log" to "authenticated";
grant DELETE on table "public"."advertiser_followup_log" to "service_role";
grant INSERT on table "public"."advertiser_followup_log" to "service_role";
grant MAINTAIN on table "public"."advertiser_followup_log" to "service_role";
grant REFERENCES on table "public"."advertiser_followup_log" to "service_role";
grant SELECT on table "public"."advertiser_followup_log" to "service_role";
grant TRIGGER on table "public"."advertiser_followup_log" to "service_role";
grant TRUNCATE on table "public"."advertiser_followup_log" to "service_role";
grant UPDATE on table "public"."advertiser_followup_log" to "service_role";
grant DELETE on table "public"."advertiser_invoices" to "anon";
grant INSERT on table "public"."advertiser_invoices" to "anon";
grant MAINTAIN on table "public"."advertiser_invoices" to "anon";
grant REFERENCES on table "public"."advertiser_invoices" to "anon";
grant SELECT on table "public"."advertiser_invoices" to "anon";
grant TRIGGER on table "public"."advertiser_invoices" to "anon";
grant TRUNCATE on table "public"."advertiser_invoices" to "anon";
grant UPDATE on table "public"."advertiser_invoices" to "anon";
grant DELETE on table "public"."advertiser_invoices" to "authenticated";
grant INSERT on table "public"."advertiser_invoices" to "authenticated";
grant MAINTAIN on table "public"."advertiser_invoices" to "authenticated";
grant REFERENCES on table "public"."advertiser_invoices" to "authenticated";
grant SELECT on table "public"."advertiser_invoices" to "authenticated";
grant TRIGGER on table "public"."advertiser_invoices" to "authenticated";
grant TRUNCATE on table "public"."advertiser_invoices" to "authenticated";
grant UPDATE on table "public"."advertiser_invoices" to "authenticated";
grant DELETE on table "public"."advertiser_invoices" to "service_role";
grant INSERT on table "public"."advertiser_invoices" to "service_role";
grant MAINTAIN on table "public"."advertiser_invoices" to "service_role";
grant REFERENCES on table "public"."advertiser_invoices" to "service_role";
grant SELECT on table "public"."advertiser_invoices" to "service_role";
grant TRIGGER on table "public"."advertiser_invoices" to "service_role";
grant TRUNCATE on table "public"."advertiser_invoices" to "service_role";
grant UPDATE on table "public"."advertiser_invoices" to "service_role";
grant DELETE on table "public"."advertiser_master" to "anon";
grant INSERT on table "public"."advertiser_master" to "anon";
grant MAINTAIN on table "public"."advertiser_master" to "anon";
grant REFERENCES on table "public"."advertiser_master" to "anon";
grant SELECT on table "public"."advertiser_master" to "anon";
grant TRIGGER on table "public"."advertiser_master" to "anon";
grant TRUNCATE on table "public"."advertiser_master" to "anon";
grant UPDATE on table "public"."advertiser_master" to "anon";
grant DELETE on table "public"."advertiser_master" to "authenticated";
grant INSERT on table "public"."advertiser_master" to "authenticated";
grant MAINTAIN on table "public"."advertiser_master" to "authenticated";
grant REFERENCES on table "public"."advertiser_master" to "authenticated";
grant SELECT on table "public"."advertiser_master" to "authenticated";
grant TRIGGER on table "public"."advertiser_master" to "authenticated";
grant TRUNCATE on table "public"."advertiser_master" to "authenticated";
grant UPDATE on table "public"."advertiser_master" to "authenticated";
grant DELETE on table "public"."advertiser_master" to "service_role";
grant INSERT on table "public"."advertiser_master" to "service_role";
grant MAINTAIN on table "public"."advertiser_master" to "service_role";
grant REFERENCES on table "public"."advertiser_master" to "service_role";
grant SELECT on table "public"."advertiser_master" to "service_role";
grant TRIGGER on table "public"."advertiser_master" to "service_role";
grant TRUNCATE on table "public"."advertiser_master" to "service_role";
grant UPDATE on table "public"."advertiser_master" to "service_role";
grant DELETE on table "public"."advertiser_opportunities" to "anon";
grant INSERT on table "public"."advertiser_opportunities" to "anon";
grant MAINTAIN on table "public"."advertiser_opportunities" to "anon";
grant REFERENCES on table "public"."advertiser_opportunities" to "anon";
grant SELECT on table "public"."advertiser_opportunities" to "anon";
grant TRIGGER on table "public"."advertiser_opportunities" to "anon";
grant TRUNCATE on table "public"."advertiser_opportunities" to "anon";
grant UPDATE on table "public"."advertiser_opportunities" to "anon";
grant DELETE on table "public"."advertiser_opportunities" to "authenticated";
grant INSERT on table "public"."advertiser_opportunities" to "authenticated";
grant MAINTAIN on table "public"."advertiser_opportunities" to "authenticated";
grant REFERENCES on table "public"."advertiser_opportunities" to "authenticated";
grant SELECT on table "public"."advertiser_opportunities" to "authenticated";
grant TRIGGER on table "public"."advertiser_opportunities" to "authenticated";
grant TRUNCATE on table "public"."advertiser_opportunities" to "authenticated";
grant UPDATE on table "public"."advertiser_opportunities" to "authenticated";
grant DELETE on table "public"."advertiser_opportunities" to "service_role";
grant INSERT on table "public"."advertiser_opportunities" to "service_role";
grant MAINTAIN on table "public"."advertiser_opportunities" to "service_role";
grant REFERENCES on table "public"."advertiser_opportunities" to "service_role";
grant SELECT on table "public"."advertiser_opportunities" to "service_role";
grant TRIGGER on table "public"."advertiser_opportunities" to "service_role";
grant TRUNCATE on table "public"."advertiser_opportunities" to "service_role";
grant UPDATE on table "public"."advertiser_opportunities" to "service_role";
grant DELETE on table "public"."advertiser_performance" to "anon";
grant INSERT on table "public"."advertiser_performance" to "anon";
grant MAINTAIN on table "public"."advertiser_performance" to "anon";
grant REFERENCES on table "public"."advertiser_performance" to "anon";
grant SELECT on table "public"."advertiser_performance" to "anon";
grant TRIGGER on table "public"."advertiser_performance" to "anon";
grant TRUNCATE on table "public"."advertiser_performance" to "anon";
grant UPDATE on table "public"."advertiser_performance" to "anon";
grant DELETE on table "public"."advertiser_performance" to "authenticated";
grant INSERT on table "public"."advertiser_performance" to "authenticated";
grant MAINTAIN on table "public"."advertiser_performance" to "authenticated";
grant REFERENCES on table "public"."advertiser_performance" to "authenticated";
grant SELECT on table "public"."advertiser_performance" to "authenticated";
grant TRIGGER on table "public"."advertiser_performance" to "authenticated";
grant TRUNCATE on table "public"."advertiser_performance" to "authenticated";
grant UPDATE on table "public"."advertiser_performance" to "authenticated";
grant DELETE on table "public"."advertiser_performance" to "service_role";
grant INSERT on table "public"."advertiser_performance" to "service_role";
grant MAINTAIN on table "public"."advertiser_performance" to "service_role";
grant REFERENCES on table "public"."advertiser_performance" to "service_role";
grant SELECT on table "public"."advertiser_performance" to "service_role";
grant TRIGGER on table "public"."advertiser_performance" to "service_role";
grant TRUNCATE on table "public"."advertiser_performance" to "service_role";
grant UPDATE on table "public"."advertiser_performance" to "service_role";
grant DELETE on table "public"."advertiser_receivables" to "anon";
grant INSERT on table "public"."advertiser_receivables" to "anon";
grant MAINTAIN on table "public"."advertiser_receivables" to "anon";
grant REFERENCES on table "public"."advertiser_receivables" to "anon";
grant SELECT on table "public"."advertiser_receivables" to "anon";
grant TRIGGER on table "public"."advertiser_receivables" to "anon";
grant TRUNCATE on table "public"."advertiser_receivables" to "anon";
grant UPDATE on table "public"."advertiser_receivables" to "anon";
grant DELETE on table "public"."advertiser_receivables" to "authenticated";
grant INSERT on table "public"."advertiser_receivables" to "authenticated";
grant MAINTAIN on table "public"."advertiser_receivables" to "authenticated";
grant REFERENCES on table "public"."advertiser_receivables" to "authenticated";
grant SELECT on table "public"."advertiser_receivables" to "authenticated";
grant TRIGGER on table "public"."advertiser_receivables" to "authenticated";
grant TRUNCATE on table "public"."advertiser_receivables" to "authenticated";
grant UPDATE on table "public"."advertiser_receivables" to "authenticated";
grant DELETE on table "public"."advertiser_receivables" to "service_role";
grant INSERT on table "public"."advertiser_receivables" to "service_role";
grant MAINTAIN on table "public"."advertiser_receivables" to "service_role";
grant REFERENCES on table "public"."advertiser_receivables" to "service_role";
grant SELECT on table "public"."advertiser_receivables" to "service_role";
grant TRIGGER on table "public"."advertiser_receivables" to "service_role";
grant TRUNCATE on table "public"."advertiser_receivables" to "service_role";
grant UPDATE on table "public"."advertiser_receivables" to "service_role";
grant DELETE on table "public"."advertiser_strategy" to "anon";
grant INSERT on table "public"."advertiser_strategy" to "anon";
grant MAINTAIN on table "public"."advertiser_strategy" to "anon";
grant REFERENCES on table "public"."advertiser_strategy" to "anon";
grant SELECT on table "public"."advertiser_strategy" to "anon";
grant TRIGGER on table "public"."advertiser_strategy" to "anon";
grant TRUNCATE on table "public"."advertiser_strategy" to "anon";
grant UPDATE on table "public"."advertiser_strategy" to "anon";
grant DELETE on table "public"."advertiser_strategy" to "authenticated";
grant INSERT on table "public"."advertiser_strategy" to "authenticated";
grant MAINTAIN on table "public"."advertiser_strategy" to "authenticated";
grant REFERENCES on table "public"."advertiser_strategy" to "authenticated";
grant SELECT on table "public"."advertiser_strategy" to "authenticated";
grant TRIGGER on table "public"."advertiser_strategy" to "authenticated";
grant TRUNCATE on table "public"."advertiser_strategy" to "authenticated";
grant UPDATE on table "public"."advertiser_strategy" to "authenticated";
grant DELETE on table "public"."advertiser_strategy" to "service_role";
grant INSERT on table "public"."advertiser_strategy" to "service_role";
grant MAINTAIN on table "public"."advertiser_strategy" to "service_role";
grant REFERENCES on table "public"."advertiser_strategy" to "service_role";
grant SELECT on table "public"."advertiser_strategy" to "service_role";
grant TRIGGER on table "public"."advertiser_strategy" to "service_role";
grant TRUNCATE on table "public"."advertiser_strategy" to "service_role";
grant UPDATE on table "public"."advertiser_strategy" to "service_role";
grant DELETE on table "public"."advertisers" to "anon";
grant INSERT on table "public"."advertisers" to "anon";
grant MAINTAIN on table "public"."advertisers" to "anon";
grant REFERENCES on table "public"."advertisers" to "anon";
grant SELECT on table "public"."advertisers" to "anon";
grant TRIGGER on table "public"."advertisers" to "anon";
grant TRUNCATE on table "public"."advertisers" to "anon";
grant UPDATE on table "public"."advertisers" to "anon";
grant DELETE on table "public"."advertisers" to "authenticated";
grant INSERT on table "public"."advertisers" to "authenticated";
grant MAINTAIN on table "public"."advertisers" to "authenticated";
grant REFERENCES on table "public"."advertisers" to "authenticated";
grant SELECT on table "public"."advertisers" to "authenticated";
grant TRIGGER on table "public"."advertisers" to "authenticated";
grant TRUNCATE on table "public"."advertisers" to "authenticated";
grant UPDATE on table "public"."advertisers" to "authenticated";
grant DELETE on table "public"."advertisers" to "service_role";
grant INSERT on table "public"."advertisers" to "service_role";
grant MAINTAIN on table "public"."advertisers" to "service_role";
grant REFERENCES on table "public"."advertisers" to "service_role";
grant SELECT on table "public"."advertisers" to "service_role";
grant TRIGGER on table "public"."advertisers" to "service_role";
grant TRUNCATE on table "public"."advertisers" to "service_role";
grant UPDATE on table "public"."advertisers" to "service_role";
grant DELETE on table "public"."api_comparison_results" to "anon";
grant INSERT on table "public"."api_comparison_results" to "anon";
grant MAINTAIN on table "public"."api_comparison_results" to "anon";
grant REFERENCES on table "public"."api_comparison_results" to "anon";
grant SELECT on table "public"."api_comparison_results" to "anon";
grant TRIGGER on table "public"."api_comparison_results" to "anon";
grant TRUNCATE on table "public"."api_comparison_results" to "anon";
grant UPDATE on table "public"."api_comparison_results" to "anon";
grant DELETE on table "public"."api_comparison_results" to "authenticated";
grant INSERT on table "public"."api_comparison_results" to "authenticated";
grant MAINTAIN on table "public"."api_comparison_results" to "authenticated";
grant REFERENCES on table "public"."api_comparison_results" to "authenticated";
grant SELECT on table "public"."api_comparison_results" to "authenticated";
grant TRIGGER on table "public"."api_comparison_results" to "authenticated";
grant TRUNCATE on table "public"."api_comparison_results" to "authenticated";
grant UPDATE on table "public"."api_comparison_results" to "authenticated";
grant DELETE on table "public"."api_comparison_results" to "service_role";
grant INSERT on table "public"."api_comparison_results" to "service_role";
grant MAINTAIN on table "public"."api_comparison_results" to "service_role";
grant REFERENCES on table "public"."api_comparison_results" to "service_role";
grant SELECT on table "public"."api_comparison_results" to "service_role";
grant TRIGGER on table "public"."api_comparison_results" to "service_role";
grant TRUNCATE on table "public"."api_comparison_results" to "service_role";
grant UPDATE on table "public"."api_comparison_results" to "service_role";
grant DELETE on table "public"."api_comparison_runs" to "anon";
grant INSERT on table "public"."api_comparison_runs" to "anon";
grant MAINTAIN on table "public"."api_comparison_runs" to "anon";
grant REFERENCES on table "public"."api_comparison_runs" to "anon";
grant SELECT on table "public"."api_comparison_runs" to "anon";
grant TRIGGER on table "public"."api_comparison_runs" to "anon";
grant TRUNCATE on table "public"."api_comparison_runs" to "anon";
grant UPDATE on table "public"."api_comparison_runs" to "anon";
grant DELETE on table "public"."api_comparison_runs" to "authenticated";
grant INSERT on table "public"."api_comparison_runs" to "authenticated";
grant MAINTAIN on table "public"."api_comparison_runs" to "authenticated";
grant REFERENCES on table "public"."api_comparison_runs" to "authenticated";
grant SELECT on table "public"."api_comparison_runs" to "authenticated";
grant TRIGGER on table "public"."api_comparison_runs" to "authenticated";
grant TRUNCATE on table "public"."api_comparison_runs" to "authenticated";
grant UPDATE on table "public"."api_comparison_runs" to "authenticated";
grant DELETE on table "public"."api_comparison_runs" to "service_role";
grant INSERT on table "public"."api_comparison_runs" to "service_role";
grant MAINTAIN on table "public"."api_comparison_runs" to "service_role";
grant REFERENCES on table "public"."api_comparison_runs" to "service_role";
grant SELECT on table "public"."api_comparison_runs" to "service_role";
grant TRIGGER on table "public"."api_comparison_runs" to "service_role";
grant TRUNCATE on table "public"."api_comparison_runs" to "service_role";
grant UPDATE on table "public"."api_comparison_runs" to "service_role";
grant DELETE on table "public"."api_doc_endpoints" to "anon";
grant INSERT on table "public"."api_doc_endpoints" to "anon";
grant MAINTAIN on table "public"."api_doc_endpoints" to "anon";
grant REFERENCES on table "public"."api_doc_endpoints" to "anon";
grant SELECT on table "public"."api_doc_endpoints" to "anon";
grant TRIGGER on table "public"."api_doc_endpoints" to "anon";
grant TRUNCATE on table "public"."api_doc_endpoints" to "anon";
grant UPDATE on table "public"."api_doc_endpoints" to "anon";
grant DELETE on table "public"."api_doc_endpoints" to "authenticated";
grant INSERT on table "public"."api_doc_endpoints" to "authenticated";
grant MAINTAIN on table "public"."api_doc_endpoints" to "authenticated";
grant REFERENCES on table "public"."api_doc_endpoints" to "authenticated";
grant SELECT on table "public"."api_doc_endpoints" to "authenticated";
grant TRIGGER on table "public"."api_doc_endpoints" to "authenticated";
grant TRUNCATE on table "public"."api_doc_endpoints" to "authenticated";
grant UPDATE on table "public"."api_doc_endpoints" to "authenticated";
grant DELETE on table "public"."api_doc_endpoints" to "service_role";
grant INSERT on table "public"."api_doc_endpoints" to "service_role";
grant MAINTAIN on table "public"."api_doc_endpoints" to "service_role";
grant REFERENCES on table "public"."api_doc_endpoints" to "service_role";
grant SELECT on table "public"."api_doc_endpoints" to "service_role";
grant TRIGGER on table "public"."api_doc_endpoints" to "service_role";
grant TRUNCATE on table "public"."api_doc_endpoints" to "service_role";
grant UPDATE on table "public"."api_doc_endpoints" to "service_role";
grant DELETE on table "public"."api_doc_fields" to "anon";
grant INSERT on table "public"."api_doc_fields" to "anon";
grant MAINTAIN on table "public"."api_doc_fields" to "anon";
grant REFERENCES on table "public"."api_doc_fields" to "anon";
grant SELECT on table "public"."api_doc_fields" to "anon";
grant TRIGGER on table "public"."api_doc_fields" to "anon";
grant TRUNCATE on table "public"."api_doc_fields" to "anon";
grant UPDATE on table "public"."api_doc_fields" to "anon";
grant DELETE on table "public"."api_doc_fields" to "authenticated";
grant INSERT on table "public"."api_doc_fields" to "authenticated";
grant MAINTAIN on table "public"."api_doc_fields" to "authenticated";
grant REFERENCES on table "public"."api_doc_fields" to "authenticated";
grant SELECT on table "public"."api_doc_fields" to "authenticated";
grant TRIGGER on table "public"."api_doc_fields" to "authenticated";
grant TRUNCATE on table "public"."api_doc_fields" to "authenticated";
grant UPDATE on table "public"."api_doc_fields" to "authenticated";
grant DELETE on table "public"."api_doc_fields" to "service_role";
grant INSERT on table "public"."api_doc_fields" to "service_role";
grant MAINTAIN on table "public"."api_doc_fields" to "service_role";
grant REFERENCES on table "public"."api_doc_fields" to "service_role";
grant SELECT on table "public"."api_doc_fields" to "service_role";
grant TRIGGER on table "public"."api_doc_fields" to "service_role";
grant TRUNCATE on table "public"."api_doc_fields" to "service_role";
grant UPDATE on table "public"."api_doc_fields" to "service_role";
grant DELETE on table "public"."api_traffic_captures" to "anon";
grant INSERT on table "public"."api_traffic_captures" to "anon";
grant MAINTAIN on table "public"."api_traffic_captures" to "anon";
grant REFERENCES on table "public"."api_traffic_captures" to "anon";
grant SELECT on table "public"."api_traffic_captures" to "anon";
grant TRIGGER on table "public"."api_traffic_captures" to "anon";
grant TRUNCATE on table "public"."api_traffic_captures" to "anon";
grant UPDATE on table "public"."api_traffic_captures" to "anon";
grant DELETE on table "public"."api_traffic_captures" to "authenticated";
grant INSERT on table "public"."api_traffic_captures" to "authenticated";
grant MAINTAIN on table "public"."api_traffic_captures" to "authenticated";
grant REFERENCES on table "public"."api_traffic_captures" to "authenticated";
grant SELECT on table "public"."api_traffic_captures" to "authenticated";
grant TRIGGER on table "public"."api_traffic_captures" to "authenticated";
grant TRUNCATE on table "public"."api_traffic_captures" to "authenticated";
grant UPDATE on table "public"."api_traffic_captures" to "authenticated";
grant DELETE on table "public"."api_traffic_captures" to "service_role";
grant INSERT on table "public"."api_traffic_captures" to "service_role";
grant MAINTAIN on table "public"."api_traffic_captures" to "service_role";
grant REFERENCES on table "public"."api_traffic_captures" to "service_role";
grant SELECT on table "public"."api_traffic_captures" to "service_role";
grant TRIGGER on table "public"."api_traffic_captures" to "service_role";
grant TRUNCATE on table "public"."api_traffic_captures" to "service_role";
grant UPDATE on table "public"."api_traffic_captures" to "service_role";
grant DELETE on table "public"."app_profile_raw" to "anon";
grant INSERT on table "public"."app_profile_raw" to "anon";
grant MAINTAIN on table "public"."app_profile_raw" to "anon";
grant REFERENCES on table "public"."app_profile_raw" to "anon";
grant SELECT on table "public"."app_profile_raw" to "anon";
grant TRIGGER on table "public"."app_profile_raw" to "anon";
grant TRUNCATE on table "public"."app_profile_raw" to "anon";
grant UPDATE on table "public"."app_profile_raw" to "anon";
grant DELETE on table "public"."app_profile_raw" to "authenticated";
grant INSERT on table "public"."app_profile_raw" to "authenticated";
grant MAINTAIN on table "public"."app_profile_raw" to "authenticated";
grant REFERENCES on table "public"."app_profile_raw" to "authenticated";
grant SELECT on table "public"."app_profile_raw" to "authenticated";
grant TRIGGER on table "public"."app_profile_raw" to "authenticated";
grant TRUNCATE on table "public"."app_profile_raw" to "authenticated";
grant UPDATE on table "public"."app_profile_raw" to "authenticated";
grant DELETE on table "public"."app_profile_raw" to "service_role";
grant INSERT on table "public"."app_profile_raw" to "service_role";
grant MAINTAIN on table "public"."app_profile_raw" to "service_role";
grant REFERENCES on table "public"."app_profile_raw" to "service_role";
grant SELECT on table "public"."app_profile_raw" to "service_role";
grant TRIGGER on table "public"."app_profile_raw" to "service_role";
grant TRUNCATE on table "public"."app_profile_raw" to "service_role";
grant UPDATE on table "public"."app_profile_raw" to "service_role";
grant SELECT on sequence "public"."app_research_task_no_seq" to "anon";
grant UPDATE on sequence "public"."app_research_task_no_seq" to "anon";
grant USAGE on sequence "public"."app_research_task_no_seq" to "anon";
grant SELECT on sequence "public"."app_research_task_no_seq" to "authenticated";
grant UPDATE on sequence "public"."app_research_task_no_seq" to "authenticated";
grant USAGE on sequence "public"."app_research_task_no_seq" to "authenticated";
grant SELECT on sequence "public"."app_research_task_no_seq" to "service_role";
grant UPDATE on sequence "public"."app_research_task_no_seq" to "service_role";
grant USAGE on sequence "public"."app_research_task_no_seq" to "service_role";
grant DELETE on table "public"."app_research_tasks" to "anon";
grant INSERT on table "public"."app_research_tasks" to "anon";
grant MAINTAIN on table "public"."app_research_tasks" to "anon";
grant REFERENCES on table "public"."app_research_tasks" to "anon";
grant SELECT on table "public"."app_research_tasks" to "anon";
grant TRIGGER on table "public"."app_research_tasks" to "anon";
grant TRUNCATE on table "public"."app_research_tasks" to "anon";
grant UPDATE on table "public"."app_research_tasks" to "anon";
grant DELETE on table "public"."app_research_tasks" to "authenticated";
grant INSERT on table "public"."app_research_tasks" to "authenticated";
grant MAINTAIN on table "public"."app_research_tasks" to "authenticated";
grant REFERENCES on table "public"."app_research_tasks" to "authenticated";
grant SELECT on table "public"."app_research_tasks" to "authenticated";
grant TRIGGER on table "public"."app_research_tasks" to "authenticated";
grant TRUNCATE on table "public"."app_research_tasks" to "authenticated";
grant UPDATE on table "public"."app_research_tasks" to "authenticated";
grant DELETE on table "public"."app_research_tasks" to "service_role";
grant INSERT on table "public"."app_research_tasks" to "service_role";
grant MAINTAIN on table "public"."app_research_tasks" to "service_role";
grant REFERENCES on table "public"."app_research_tasks" to "service_role";
grant SELECT on table "public"."app_research_tasks" to "service_role";
grant TRIGGER on table "public"."app_research_tasks" to "service_role";
grant TRUNCATE on table "public"."app_research_tasks" to "service_role";
grant UPDATE on table "public"."app_research_tasks" to "service_role";
grant DELETE on table "public"."app_source_checks" to "anon";
grant INSERT on table "public"."app_source_checks" to "anon";
grant MAINTAIN on table "public"."app_source_checks" to "anon";
grant REFERENCES on table "public"."app_source_checks" to "anon";
grant SELECT on table "public"."app_source_checks" to "anon";
grant TRIGGER on table "public"."app_source_checks" to "anon";
grant TRUNCATE on table "public"."app_source_checks" to "anon";
grant UPDATE on table "public"."app_source_checks" to "anon";
grant DELETE on table "public"."app_source_checks" to "authenticated";
grant INSERT on table "public"."app_source_checks" to "authenticated";
grant MAINTAIN on table "public"."app_source_checks" to "authenticated";
grant REFERENCES on table "public"."app_source_checks" to "authenticated";
grant SELECT on table "public"."app_source_checks" to "authenticated";
grant TRIGGER on table "public"."app_source_checks" to "authenticated";
grant TRUNCATE on table "public"."app_source_checks" to "authenticated";
grant UPDATE on table "public"."app_source_checks" to "authenticated";
grant DELETE on table "public"."app_source_checks" to "service_role";
grant INSERT on table "public"."app_source_checks" to "service_role";
grant MAINTAIN on table "public"."app_source_checks" to "service_role";
grant REFERENCES on table "public"."app_source_checks" to "service_role";
grant SELECT on table "public"."app_source_checks" to "service_role";
grant TRIGGER on table "public"."app_source_checks" to "service_role";
grant TRUNCATE on table "public"."app_source_checks" to "service_role";
grant UPDATE on table "public"."app_source_checks" to "service_role";
grant DELETE on table "public"."approval_requests" to "anon";
grant INSERT on table "public"."approval_requests" to "anon";
grant MAINTAIN on table "public"."approval_requests" to "anon";
grant REFERENCES on table "public"."approval_requests" to "anon";
grant SELECT on table "public"."approval_requests" to "anon";
grant TRIGGER on table "public"."approval_requests" to "anon";
grant TRUNCATE on table "public"."approval_requests" to "anon";
grant UPDATE on table "public"."approval_requests" to "anon";
grant DELETE on table "public"."approval_requests" to "authenticated";
grant INSERT on table "public"."approval_requests" to "authenticated";
grant MAINTAIN on table "public"."approval_requests" to "authenticated";
grant REFERENCES on table "public"."approval_requests" to "authenticated";
grant SELECT on table "public"."approval_requests" to "authenticated";
grant TRIGGER on table "public"."approval_requests" to "authenticated";
grant TRUNCATE on table "public"."approval_requests" to "authenticated";
grant UPDATE on table "public"."approval_requests" to "authenticated";
grant DELETE on table "public"."approval_requests" to "service_role";
grant INSERT on table "public"."approval_requests" to "service_role";
grant MAINTAIN on table "public"."approval_requests" to "service_role";
grant REFERENCES on table "public"."approval_requests" to "service_role";
grant SELECT on table "public"."approval_requests" to "service_role";
grant TRIGGER on table "public"."approval_requests" to "service_role";
grant TRUNCATE on table "public"."approval_requests" to "service_role";
grant UPDATE on table "public"."approval_requests" to "service_role";
grant DELETE on table "public"."approvals" to "anon";
grant INSERT on table "public"."approvals" to "anon";
grant MAINTAIN on table "public"."approvals" to "anon";
grant REFERENCES on table "public"."approvals" to "anon";
grant SELECT on table "public"."approvals" to "anon";
grant TRIGGER on table "public"."approvals" to "anon";
grant TRUNCATE on table "public"."approvals" to "anon";
grant UPDATE on table "public"."approvals" to "anon";
grant DELETE on table "public"."approvals" to "authenticated";
grant INSERT on table "public"."approvals" to "authenticated";
grant MAINTAIN on table "public"."approvals" to "authenticated";
grant REFERENCES on table "public"."approvals" to "authenticated";
grant SELECT on table "public"."approvals" to "authenticated";
grant TRIGGER on table "public"."approvals" to "authenticated";
grant TRUNCATE on table "public"."approvals" to "authenticated";
grant UPDATE on table "public"."approvals" to "authenticated";
grant DELETE on table "public"."approvals" to "service_role";
grant INSERT on table "public"."approvals" to "service_role";
grant MAINTAIN on table "public"."approvals" to "service_role";
grant REFERENCES on table "public"."approvals" to "service_role";
grant SELECT on table "public"."approvals" to "service_role";
grant TRIGGER on table "public"."approvals" to "service_role";
grant TRUNCATE on table "public"."approvals" to "service_role";
grant UPDATE on table "public"."approvals" to "service_role";
grant DELETE on table "public"."assessment_dimensions" to "anon";
grant INSERT on table "public"."assessment_dimensions" to "anon";
grant MAINTAIN on table "public"."assessment_dimensions" to "anon";
grant REFERENCES on table "public"."assessment_dimensions" to "anon";
grant SELECT on table "public"."assessment_dimensions" to "anon";
grant TRIGGER on table "public"."assessment_dimensions" to "anon";
grant TRUNCATE on table "public"."assessment_dimensions" to "anon";
grant UPDATE on table "public"."assessment_dimensions" to "anon";
grant DELETE on table "public"."assessment_dimensions" to "authenticated";
grant INSERT on table "public"."assessment_dimensions" to "authenticated";
grant MAINTAIN on table "public"."assessment_dimensions" to "authenticated";
grant REFERENCES on table "public"."assessment_dimensions" to "authenticated";
grant SELECT on table "public"."assessment_dimensions" to "authenticated";
grant TRIGGER on table "public"."assessment_dimensions" to "authenticated";
grant TRUNCATE on table "public"."assessment_dimensions" to "authenticated";
grant UPDATE on table "public"."assessment_dimensions" to "authenticated";
grant DELETE on table "public"."assessment_dimensions" to "service_role";
grant INSERT on table "public"."assessment_dimensions" to "service_role";
grant MAINTAIN on table "public"."assessment_dimensions" to "service_role";
grant REFERENCES on table "public"."assessment_dimensions" to "service_role";
grant SELECT on table "public"."assessment_dimensions" to "service_role";
grant TRIGGER on table "public"."assessment_dimensions" to "service_role";
grant TRUNCATE on table "public"."assessment_dimensions" to "service_role";
grant UPDATE on table "public"."assessment_dimensions" to "service_role";
grant DELETE on table "public"."assessment_evaluations" to "anon";
grant INSERT on table "public"."assessment_evaluations" to "anon";
grant MAINTAIN on table "public"."assessment_evaluations" to "anon";
grant REFERENCES on table "public"."assessment_evaluations" to "anon";
grant SELECT on table "public"."assessment_evaluations" to "anon";
grant TRIGGER on table "public"."assessment_evaluations" to "anon";
grant TRUNCATE on table "public"."assessment_evaluations" to "anon";
grant UPDATE on table "public"."assessment_evaluations" to "anon";
grant DELETE on table "public"."assessment_evaluations" to "authenticated";
grant INSERT on table "public"."assessment_evaluations" to "authenticated";
grant MAINTAIN on table "public"."assessment_evaluations" to "authenticated";
grant REFERENCES on table "public"."assessment_evaluations" to "authenticated";
grant SELECT on table "public"."assessment_evaluations" to "authenticated";
grant TRIGGER on table "public"."assessment_evaluations" to "authenticated";
grant TRUNCATE on table "public"."assessment_evaluations" to "authenticated";
grant UPDATE on table "public"."assessment_evaluations" to "authenticated";
grant DELETE on table "public"."assessment_evaluations" to "service_role";
grant INSERT on table "public"."assessment_evaluations" to "service_role";
grant MAINTAIN on table "public"."assessment_evaluations" to "service_role";
grant REFERENCES on table "public"."assessment_evaluations" to "service_role";
grant SELECT on table "public"."assessment_evaluations" to "service_role";
grant TRIGGER on table "public"."assessment_evaluations" to "service_role";
grant TRUNCATE on table "public"."assessment_evaluations" to "service_role";
grant UPDATE on table "public"."assessment_evaluations" to "service_role";
grant DELETE on table "public"."assessment_input_documents" to "anon";
grant INSERT on table "public"."assessment_input_documents" to "anon";
grant MAINTAIN on table "public"."assessment_input_documents" to "anon";
grant REFERENCES on table "public"."assessment_input_documents" to "anon";
grant SELECT on table "public"."assessment_input_documents" to "anon";
grant TRIGGER on table "public"."assessment_input_documents" to "anon";
grant TRUNCATE on table "public"."assessment_input_documents" to "anon";
grant UPDATE on table "public"."assessment_input_documents" to "anon";
grant DELETE on table "public"."assessment_input_documents" to "authenticated";
grant INSERT on table "public"."assessment_input_documents" to "authenticated";
grant MAINTAIN on table "public"."assessment_input_documents" to "authenticated";
grant REFERENCES on table "public"."assessment_input_documents" to "authenticated";
grant SELECT on table "public"."assessment_input_documents" to "authenticated";
grant TRIGGER on table "public"."assessment_input_documents" to "authenticated";
grant TRUNCATE on table "public"."assessment_input_documents" to "authenticated";
grant UPDATE on table "public"."assessment_input_documents" to "authenticated";
grant DELETE on table "public"."assessment_input_documents" to "service_role";
grant INSERT on table "public"."assessment_input_documents" to "service_role";
grant MAINTAIN on table "public"."assessment_input_documents" to "service_role";
grant REFERENCES on table "public"."assessment_input_documents" to "service_role";
grant SELECT on table "public"."assessment_input_documents" to "service_role";
grant TRIGGER on table "public"."assessment_input_documents" to "service_role";
grant TRUNCATE on table "public"."assessment_input_documents" to "service_role";
grant UPDATE on table "public"."assessment_input_documents" to "service_role";
grant DELETE on table "public"."assessment_models" to "anon";
grant INSERT on table "public"."assessment_models" to "anon";
grant MAINTAIN on table "public"."assessment_models" to "anon";
grant REFERENCES on table "public"."assessment_models" to "anon";
grant SELECT on table "public"."assessment_models" to "anon";
grant TRIGGER on table "public"."assessment_models" to "anon";
grant TRUNCATE on table "public"."assessment_models" to "anon";
grant UPDATE on table "public"."assessment_models" to "anon";
grant DELETE on table "public"."assessment_models" to "authenticated";
grant INSERT on table "public"."assessment_models" to "authenticated";
grant MAINTAIN on table "public"."assessment_models" to "authenticated";
grant REFERENCES on table "public"."assessment_models" to "authenticated";
grant SELECT on table "public"."assessment_models" to "authenticated";
grant TRIGGER on table "public"."assessment_models" to "authenticated";
grant TRUNCATE on table "public"."assessment_models" to "authenticated";
grant UPDATE on table "public"."assessment_models" to "authenticated";
grant DELETE on table "public"."assessment_models" to "service_role";
grant INSERT on table "public"."assessment_models" to "service_role";
grant MAINTAIN on table "public"."assessment_models" to "service_role";
grant REFERENCES on table "public"."assessment_models" to "service_role";
grant SELECT on table "public"."assessment_models" to "service_role";
grant TRIGGER on table "public"."assessment_models" to "service_role";
grant TRUNCATE on table "public"."assessment_models" to "service_role";
grant UPDATE on table "public"."assessment_models" to "service_role";
grant DELETE on table "public"."assessment_redlines" to "anon";
grant INSERT on table "public"."assessment_redlines" to "anon";
grant MAINTAIN on table "public"."assessment_redlines" to "anon";
grant REFERENCES on table "public"."assessment_redlines" to "anon";
grant SELECT on table "public"."assessment_redlines" to "anon";
grant TRIGGER on table "public"."assessment_redlines" to "anon";
grant TRUNCATE on table "public"."assessment_redlines" to "anon";
grant UPDATE on table "public"."assessment_redlines" to "anon";
grant DELETE on table "public"."assessment_redlines" to "authenticated";
grant INSERT on table "public"."assessment_redlines" to "authenticated";
grant MAINTAIN on table "public"."assessment_redlines" to "authenticated";
grant REFERENCES on table "public"."assessment_redlines" to "authenticated";
grant SELECT on table "public"."assessment_redlines" to "authenticated";
grant TRIGGER on table "public"."assessment_redlines" to "authenticated";
grant TRUNCATE on table "public"."assessment_redlines" to "authenticated";
grant UPDATE on table "public"."assessment_redlines" to "authenticated";
grant DELETE on table "public"."assessment_redlines" to "service_role";
grant INSERT on table "public"."assessment_redlines" to "service_role";
grant MAINTAIN on table "public"."assessment_redlines" to "service_role";
grant REFERENCES on table "public"."assessment_redlines" to "service_role";
grant SELECT on table "public"."assessment_redlines" to "service_role";
grant TRIGGER on table "public"."assessment_redlines" to "service_role";
grant TRUNCATE on table "public"."assessment_redlines" to "service_role";
grant UPDATE on table "public"."assessment_redlines" to "service_role";
grant DELETE on table "public"."assessment_rules" to "anon";
grant INSERT on table "public"."assessment_rules" to "anon";
grant MAINTAIN on table "public"."assessment_rules" to "anon";
grant REFERENCES on table "public"."assessment_rules" to "anon";
grant SELECT on table "public"."assessment_rules" to "anon";
grant TRIGGER on table "public"."assessment_rules" to "anon";
grant TRUNCATE on table "public"."assessment_rules" to "anon";
grant UPDATE on table "public"."assessment_rules" to "anon";
grant DELETE on table "public"."assessment_rules" to "authenticated";
grant INSERT on table "public"."assessment_rules" to "authenticated";
grant MAINTAIN on table "public"."assessment_rules" to "authenticated";
grant REFERENCES on table "public"."assessment_rules" to "authenticated";
grant SELECT on table "public"."assessment_rules" to "authenticated";
grant TRIGGER on table "public"."assessment_rules" to "authenticated";
grant TRUNCATE on table "public"."assessment_rules" to "authenticated";
grant UPDATE on table "public"."assessment_rules" to "authenticated";
grant DELETE on table "public"."assessment_rules" to "service_role";
grant INSERT on table "public"."assessment_rules" to "service_role";
grant MAINTAIN on table "public"."assessment_rules" to "service_role";
grant REFERENCES on table "public"."assessment_rules" to "service_role";
grant SELECT on table "public"."assessment_rules" to "service_role";
grant TRIGGER on table "public"."assessment_rules" to "service_role";
grant TRUNCATE on table "public"."assessment_rules" to "service_role";
grant UPDATE on table "public"."assessment_rules" to "service_role";
grant DELETE on table "public"."attachments" to "anon";
grant INSERT on table "public"."attachments" to "anon";
grant MAINTAIN on table "public"."attachments" to "anon";
grant REFERENCES on table "public"."attachments" to "anon";
grant SELECT on table "public"."attachments" to "anon";
grant TRIGGER on table "public"."attachments" to "anon";
grant TRUNCATE on table "public"."attachments" to "anon";
grant UPDATE on table "public"."attachments" to "anon";
grant DELETE on table "public"."attachments" to "authenticated";
grant INSERT on table "public"."attachments" to "authenticated";
grant MAINTAIN on table "public"."attachments" to "authenticated";
grant REFERENCES on table "public"."attachments" to "authenticated";
grant SELECT on table "public"."attachments" to "authenticated";
grant TRIGGER on table "public"."attachments" to "authenticated";
grant TRUNCATE on table "public"."attachments" to "authenticated";
grant UPDATE on table "public"."attachments" to "authenticated";
grant DELETE on table "public"."attachments" to "service_role";
grant INSERT on table "public"."attachments" to "service_role";
grant MAINTAIN on table "public"."attachments" to "service_role";
grant REFERENCES on table "public"."attachments" to "service_role";
grant SELECT on table "public"."attachments" to "service_role";
grant TRIGGER on table "public"."attachments" to "service_role";
grant TRUNCATE on table "public"."attachments" to "service_role";
grant UPDATE on table "public"."attachments" to "service_role";
grant DELETE on table "public"."audit_logs" to "anon";
grant INSERT on table "public"."audit_logs" to "anon";
grant MAINTAIN on table "public"."audit_logs" to "anon";
grant REFERENCES on table "public"."audit_logs" to "anon";
grant SELECT on table "public"."audit_logs" to "anon";
grant TRIGGER on table "public"."audit_logs" to "anon";
grant TRUNCATE on table "public"."audit_logs" to "anon";
grant UPDATE on table "public"."audit_logs" to "anon";
grant DELETE on table "public"."audit_logs" to "authenticated";
grant INSERT on table "public"."audit_logs" to "authenticated";
grant MAINTAIN on table "public"."audit_logs" to "authenticated";
grant REFERENCES on table "public"."audit_logs" to "authenticated";
grant SELECT on table "public"."audit_logs" to "authenticated";
grant TRIGGER on table "public"."audit_logs" to "authenticated";
grant TRUNCATE on table "public"."audit_logs" to "authenticated";
grant UPDATE on table "public"."audit_logs" to "authenticated";
grant DELETE on table "public"."audit_logs" to "service_role";
grant INSERT on table "public"."audit_logs" to "service_role";
grant MAINTAIN on table "public"."audit_logs" to "service_role";
grant REFERENCES on table "public"."audit_logs" to "service_role";
grant SELECT on table "public"."audit_logs" to "service_role";
grant TRIGGER on table "public"."audit_logs" to "service_role";
grant TRUNCATE on table "public"."audit_logs" to "service_role";
grant UPDATE on table "public"."audit_logs" to "service_role";
grant DELETE on table "public"."auto_research_inbox" to "anon";
grant INSERT on table "public"."auto_research_inbox" to "anon";
grant MAINTAIN on table "public"."auto_research_inbox" to "anon";
grant REFERENCES on table "public"."auto_research_inbox" to "anon";
grant SELECT on table "public"."auto_research_inbox" to "anon";
grant TRIGGER on table "public"."auto_research_inbox" to "anon";
grant TRUNCATE on table "public"."auto_research_inbox" to "anon";
grant UPDATE on table "public"."auto_research_inbox" to "anon";
grant DELETE on table "public"."auto_research_inbox" to "authenticated";
grant INSERT on table "public"."auto_research_inbox" to "authenticated";
grant MAINTAIN on table "public"."auto_research_inbox" to "authenticated";
grant REFERENCES on table "public"."auto_research_inbox" to "authenticated";
grant SELECT on table "public"."auto_research_inbox" to "authenticated";
grant TRIGGER on table "public"."auto_research_inbox" to "authenticated";
grant TRUNCATE on table "public"."auto_research_inbox" to "authenticated";
grant UPDATE on table "public"."auto_research_inbox" to "authenticated";
grant DELETE on table "public"."auto_research_inbox" to "service_role";
grant INSERT on table "public"."auto_research_inbox" to "service_role";
grant MAINTAIN on table "public"."auto_research_inbox" to "service_role";
grant REFERENCES on table "public"."auto_research_inbox" to "service_role";
grant SELECT on table "public"."auto_research_inbox" to "service_role";
grant TRIGGER on table "public"."auto_research_inbox" to "service_role";
grant TRUNCATE on table "public"."auto_research_inbox" to "service_role";
grant UPDATE on table "public"."auto_research_inbox" to "service_role";
grant DELETE on table "public"."automation_inbox" to "anon";
grant INSERT on table "public"."automation_inbox" to "anon";
grant MAINTAIN on table "public"."automation_inbox" to "anon";
grant REFERENCES on table "public"."automation_inbox" to "anon";
grant SELECT on table "public"."automation_inbox" to "anon";
grant TRIGGER on table "public"."automation_inbox" to "anon";
grant TRUNCATE on table "public"."automation_inbox" to "anon";
grant UPDATE on table "public"."automation_inbox" to "anon";
grant DELETE on table "public"."automation_inbox" to "authenticated";
grant INSERT on table "public"."automation_inbox" to "authenticated";
grant MAINTAIN on table "public"."automation_inbox" to "authenticated";
grant REFERENCES on table "public"."automation_inbox" to "authenticated";
grant SELECT on table "public"."automation_inbox" to "authenticated";
grant TRIGGER on table "public"."automation_inbox" to "authenticated";
grant TRUNCATE on table "public"."automation_inbox" to "authenticated";
grant UPDATE on table "public"."automation_inbox" to "authenticated";
grant DELETE on table "public"."automation_inbox" to "service_role";
grant INSERT on table "public"."automation_inbox" to "service_role";
grant MAINTAIN on table "public"."automation_inbox" to "service_role";
grant REFERENCES on table "public"."automation_inbox" to "service_role";
grant SELECT on table "public"."automation_inbox" to "service_role";
grant TRIGGER on table "public"."automation_inbox" to "service_role";
grant TRUNCATE on table "public"."automation_inbox" to "service_role";
grant UPDATE on table "public"."automation_inbox" to "service_role";
grant DELETE on table "public"."business_handoffs" to "anon";
grant INSERT on table "public"."business_handoffs" to "anon";
grant MAINTAIN on table "public"."business_handoffs" to "anon";
grant REFERENCES on table "public"."business_handoffs" to "anon";
grant SELECT on table "public"."business_handoffs" to "anon";
grant TRIGGER on table "public"."business_handoffs" to "anon";
grant TRUNCATE on table "public"."business_handoffs" to "anon";
grant UPDATE on table "public"."business_handoffs" to "anon";
grant DELETE on table "public"."business_handoffs" to "authenticated";
grant INSERT on table "public"."business_handoffs" to "authenticated";
grant MAINTAIN on table "public"."business_handoffs" to "authenticated";
grant REFERENCES on table "public"."business_handoffs" to "authenticated";
grant SELECT on table "public"."business_handoffs" to "authenticated";
grant TRIGGER on table "public"."business_handoffs" to "authenticated";
grant TRUNCATE on table "public"."business_handoffs" to "authenticated";
grant UPDATE on table "public"."business_handoffs" to "authenticated";
grant DELETE on table "public"."business_handoffs" to "service_role";
grant INSERT on table "public"."business_handoffs" to "service_role";
grant MAINTAIN on table "public"."business_handoffs" to "service_role";
grant REFERENCES on table "public"."business_handoffs" to "service_role";
grant SELECT on table "public"."business_handoffs" to "service_role";
grant TRIGGER on table "public"."business_handoffs" to "service_role";
grant TRUNCATE on table "public"."business_handoffs" to "service_role";
grant UPDATE on table "public"."business_handoffs" to "service_role";
grant DELETE on table "public"."business_object_timeline" to "anon";
grant INSERT on table "public"."business_object_timeline" to "anon";
grant MAINTAIN on table "public"."business_object_timeline" to "anon";
grant REFERENCES on table "public"."business_object_timeline" to "anon";
grant SELECT on table "public"."business_object_timeline" to "anon";
grant TRIGGER on table "public"."business_object_timeline" to "anon";
grant TRUNCATE on table "public"."business_object_timeline" to "anon";
grant UPDATE on table "public"."business_object_timeline" to "anon";
grant DELETE on table "public"."business_object_timeline" to "authenticated";
grant INSERT on table "public"."business_object_timeline" to "authenticated";
grant MAINTAIN on table "public"."business_object_timeline" to "authenticated";
grant REFERENCES on table "public"."business_object_timeline" to "authenticated";
grant SELECT on table "public"."business_object_timeline" to "authenticated";
grant TRIGGER on table "public"."business_object_timeline" to "authenticated";
grant TRUNCATE on table "public"."business_object_timeline" to "authenticated";
grant UPDATE on table "public"."business_object_timeline" to "authenticated";
grant DELETE on table "public"."business_object_timeline" to "service_role";
grant INSERT on table "public"."business_object_timeline" to "service_role";
grant MAINTAIN on table "public"."business_object_timeline" to "service_role";
grant REFERENCES on table "public"."business_object_timeline" to "service_role";
grant SELECT on table "public"."business_object_timeline" to "service_role";
grant TRIGGER on table "public"."business_object_timeline" to "service_role";
grant TRUNCATE on table "public"."business_object_timeline" to "service_role";
grant UPDATE on table "public"."business_object_timeline" to "service_role";
grant DELETE on table "public"."business_orders" to "anon";
grant INSERT on table "public"."business_orders" to "anon";
grant MAINTAIN on table "public"."business_orders" to "anon";
grant REFERENCES on table "public"."business_orders" to "anon";
grant SELECT on table "public"."business_orders" to "anon";
grant TRIGGER on table "public"."business_orders" to "anon";
grant TRUNCATE on table "public"."business_orders" to "anon";
grant UPDATE on table "public"."business_orders" to "anon";
grant DELETE on table "public"."business_orders" to "authenticated";
grant INSERT on table "public"."business_orders" to "authenticated";
grant MAINTAIN on table "public"."business_orders" to "authenticated";
grant REFERENCES on table "public"."business_orders" to "authenticated";
grant SELECT on table "public"."business_orders" to "authenticated";
grant TRIGGER on table "public"."business_orders" to "authenticated";
grant TRUNCATE on table "public"."business_orders" to "authenticated";
grant UPDATE on table "public"."business_orders" to "authenticated";
grant DELETE on table "public"."business_orders" to "service_role";
grant INSERT on table "public"."business_orders" to "service_role";
grant MAINTAIN on table "public"."business_orders" to "service_role";
grant REFERENCES on table "public"."business_orders" to "service_role";
grant SELECT on table "public"."business_orders" to "service_role";
grant TRIGGER on table "public"."business_orders" to "service_role";
grant TRUNCATE on table "public"."business_orders" to "service_role";
grant UPDATE on table "public"."business_orders" to "service_role";
grant DELETE on table "public"."business_side_effect_outbox" to "anon";
grant INSERT on table "public"."business_side_effect_outbox" to "anon";
grant MAINTAIN on table "public"."business_side_effect_outbox" to "anon";
grant REFERENCES on table "public"."business_side_effect_outbox" to "anon";
grant SELECT on table "public"."business_side_effect_outbox" to "anon";
grant TRIGGER on table "public"."business_side_effect_outbox" to "anon";
grant TRUNCATE on table "public"."business_side_effect_outbox" to "anon";
grant UPDATE on table "public"."business_side_effect_outbox" to "anon";
grant DELETE on table "public"."business_side_effect_outbox" to "authenticated";
grant INSERT on table "public"."business_side_effect_outbox" to "authenticated";
grant MAINTAIN on table "public"."business_side_effect_outbox" to "authenticated";
grant REFERENCES on table "public"."business_side_effect_outbox" to "authenticated";
grant SELECT on table "public"."business_side_effect_outbox" to "authenticated";
grant TRIGGER on table "public"."business_side_effect_outbox" to "authenticated";
grant TRUNCATE on table "public"."business_side_effect_outbox" to "authenticated";
grant UPDATE on table "public"."business_side_effect_outbox" to "authenticated";
grant DELETE on table "public"."business_side_effect_outbox" to "service_role";
grant INSERT on table "public"."business_side_effect_outbox" to "service_role";
grant MAINTAIN on table "public"."business_side_effect_outbox" to "service_role";
grant REFERENCES on table "public"."business_side_effect_outbox" to "service_role";
grant SELECT on table "public"."business_side_effect_outbox" to "service_role";
grant TRIGGER on table "public"."business_side_effect_outbox" to "service_role";
grant TRUNCATE on table "public"."business_side_effect_outbox" to "service_role";
grant UPDATE on table "public"."business_side_effect_outbox" to "service_role";
grant DELETE on table "public"."campaign_creatives" to "anon";
grant INSERT on table "public"."campaign_creatives" to "anon";
grant MAINTAIN on table "public"."campaign_creatives" to "anon";
grant REFERENCES on table "public"."campaign_creatives" to "anon";
grant SELECT on table "public"."campaign_creatives" to "anon";
grant TRIGGER on table "public"."campaign_creatives" to "anon";
grant TRUNCATE on table "public"."campaign_creatives" to "anon";
grant UPDATE on table "public"."campaign_creatives" to "anon";
grant DELETE on table "public"."campaign_creatives" to "authenticated";
grant INSERT on table "public"."campaign_creatives" to "authenticated";
grant MAINTAIN on table "public"."campaign_creatives" to "authenticated";
grant REFERENCES on table "public"."campaign_creatives" to "authenticated";
grant SELECT on table "public"."campaign_creatives" to "authenticated";
grant TRIGGER on table "public"."campaign_creatives" to "authenticated";
grant TRUNCATE on table "public"."campaign_creatives" to "authenticated";
grant UPDATE on table "public"."campaign_creatives" to "authenticated";
grant DELETE on table "public"."campaign_creatives" to "service_role";
grant INSERT on table "public"."campaign_creatives" to "service_role";
grant MAINTAIN on table "public"."campaign_creatives" to "service_role";
grant REFERENCES on table "public"."campaign_creatives" to "service_role";
grant SELECT on table "public"."campaign_creatives" to "service_role";
grant TRIGGER on table "public"."campaign_creatives" to "service_role";
grant TRUNCATE on table "public"."campaign_creatives" to "service_role";
grant UPDATE on table "public"."campaign_creatives" to "service_role";
grant DELETE on table "public"."campaign_daily_reports" to "anon";
grant INSERT on table "public"."campaign_daily_reports" to "anon";
grant MAINTAIN on table "public"."campaign_daily_reports" to "anon";
grant REFERENCES on table "public"."campaign_daily_reports" to "anon";
grant SELECT on table "public"."campaign_daily_reports" to "anon";
grant TRIGGER on table "public"."campaign_daily_reports" to "anon";
grant TRUNCATE on table "public"."campaign_daily_reports" to "anon";
grant UPDATE on table "public"."campaign_daily_reports" to "anon";
grant DELETE on table "public"."campaign_daily_reports" to "authenticated";
grant INSERT on table "public"."campaign_daily_reports" to "authenticated";
grant MAINTAIN on table "public"."campaign_daily_reports" to "authenticated";
grant REFERENCES on table "public"."campaign_daily_reports" to "authenticated";
grant SELECT on table "public"."campaign_daily_reports" to "authenticated";
grant TRIGGER on table "public"."campaign_daily_reports" to "authenticated";
grant TRUNCATE on table "public"."campaign_daily_reports" to "authenticated";
grant UPDATE on table "public"."campaign_daily_reports" to "authenticated";
grant DELETE on table "public"."campaign_daily_reports" to "service_role";
grant INSERT on table "public"."campaign_daily_reports" to "service_role";
grant MAINTAIN on table "public"."campaign_daily_reports" to "service_role";
grant REFERENCES on table "public"."campaign_daily_reports" to "service_role";
grant SELECT on table "public"."campaign_daily_reports" to "service_role";
grant TRIGGER on table "public"."campaign_daily_reports" to "service_role";
grant TRUNCATE on table "public"."campaign_daily_reports" to "service_role";
grant UPDATE on table "public"."campaign_daily_reports" to "service_role";
grant DELETE on table "public"."campaign_delivery_daily" to "anon";
grant INSERT on table "public"."campaign_delivery_daily" to "anon";
grant MAINTAIN on table "public"."campaign_delivery_daily" to "anon";
grant REFERENCES on table "public"."campaign_delivery_daily" to "anon";
grant SELECT on table "public"."campaign_delivery_daily" to "anon";
grant TRIGGER on table "public"."campaign_delivery_daily" to "anon";
grant TRUNCATE on table "public"."campaign_delivery_daily" to "anon";
grant UPDATE on table "public"."campaign_delivery_daily" to "anon";
grant DELETE on table "public"."campaign_delivery_daily" to "authenticated";
grant INSERT on table "public"."campaign_delivery_daily" to "authenticated";
grant MAINTAIN on table "public"."campaign_delivery_daily" to "authenticated";
grant REFERENCES on table "public"."campaign_delivery_daily" to "authenticated";
grant SELECT on table "public"."campaign_delivery_daily" to "authenticated";
grant TRIGGER on table "public"."campaign_delivery_daily" to "authenticated";
grant TRUNCATE on table "public"."campaign_delivery_daily" to "authenticated";
grant UPDATE on table "public"."campaign_delivery_daily" to "authenticated";
grant DELETE on table "public"."campaign_delivery_daily" to "service_role";
grant INSERT on table "public"."campaign_delivery_daily" to "service_role";
grant MAINTAIN on table "public"."campaign_delivery_daily" to "service_role";
grant REFERENCES on table "public"."campaign_delivery_daily" to "service_role";
grant SELECT on table "public"."campaign_delivery_daily" to "service_role";
grant TRIGGER on table "public"."campaign_delivery_daily" to "service_role";
grant TRUNCATE on table "public"."campaign_delivery_daily" to "service_role";
grant UPDATE on table "public"."campaign_delivery_daily" to "service_role";
grant DELETE on table "public"."campaign_demands" to "anon";
grant INSERT on table "public"."campaign_demands" to "anon";
grant MAINTAIN on table "public"."campaign_demands" to "anon";
grant REFERENCES on table "public"."campaign_demands" to "anon";
grant SELECT on table "public"."campaign_demands" to "anon";
grant TRIGGER on table "public"."campaign_demands" to "anon";
grant TRUNCATE on table "public"."campaign_demands" to "anon";
grant UPDATE on table "public"."campaign_demands" to "anon";
grant DELETE on table "public"."campaign_demands" to "authenticated";
grant INSERT on table "public"."campaign_demands" to "authenticated";
grant MAINTAIN on table "public"."campaign_demands" to "authenticated";
grant REFERENCES on table "public"."campaign_demands" to "authenticated";
grant SELECT on table "public"."campaign_demands" to "authenticated";
grant TRIGGER on table "public"."campaign_demands" to "authenticated";
grant TRUNCATE on table "public"."campaign_demands" to "authenticated";
grant UPDATE on table "public"."campaign_demands" to "authenticated";
grant DELETE on table "public"."campaign_demands" to "service_role";
grant INSERT on table "public"."campaign_demands" to "service_role";
grant MAINTAIN on table "public"."campaign_demands" to "service_role";
grant REFERENCES on table "public"."campaign_demands" to "service_role";
grant SELECT on table "public"."campaign_demands" to "service_role";
grant TRIGGER on table "public"."campaign_demands" to "service_role";
grant TRUNCATE on table "public"."campaign_demands" to "service_role";
grant UPDATE on table "public"."campaign_demands" to "service_role";
grant DELETE on table "public"."campaign_executions" to "anon";
grant INSERT on table "public"."campaign_executions" to "anon";
grant MAINTAIN on table "public"."campaign_executions" to "anon";
grant REFERENCES on table "public"."campaign_executions" to "anon";
grant SELECT on table "public"."campaign_executions" to "anon";
grant TRIGGER on table "public"."campaign_executions" to "anon";
grant TRUNCATE on table "public"."campaign_executions" to "anon";
grant UPDATE on table "public"."campaign_executions" to "anon";
grant DELETE on table "public"."campaign_executions" to "authenticated";
grant INSERT on table "public"."campaign_executions" to "authenticated";
grant MAINTAIN on table "public"."campaign_executions" to "authenticated";
grant REFERENCES on table "public"."campaign_executions" to "authenticated";
grant SELECT on table "public"."campaign_executions" to "authenticated";
grant TRIGGER on table "public"."campaign_executions" to "authenticated";
grant TRUNCATE on table "public"."campaign_executions" to "authenticated";
grant UPDATE on table "public"."campaign_executions" to "authenticated";
grant DELETE on table "public"."campaign_executions" to "service_role";
grant INSERT on table "public"."campaign_executions" to "service_role";
grant MAINTAIN on table "public"."campaign_executions" to "service_role";
grant REFERENCES on table "public"."campaign_executions" to "service_role";
grant SELECT on table "public"."campaign_executions" to "service_role";
grant TRIGGER on table "public"."campaign_executions" to "service_role";
grant TRUNCATE on table "public"."campaign_executions" to "service_role";
grant UPDATE on table "public"."campaign_executions" to "service_role";
grant DELETE on table "public"."campaign_flights" to "anon";
grant INSERT on table "public"."campaign_flights" to "anon";
grant MAINTAIN on table "public"."campaign_flights" to "anon";
grant REFERENCES on table "public"."campaign_flights" to "anon";
grant SELECT on table "public"."campaign_flights" to "anon";
grant TRIGGER on table "public"."campaign_flights" to "anon";
grant TRUNCATE on table "public"."campaign_flights" to "anon";
grant UPDATE on table "public"."campaign_flights" to "anon";
grant DELETE on table "public"."campaign_flights" to "authenticated";
grant INSERT on table "public"."campaign_flights" to "authenticated";
grant MAINTAIN on table "public"."campaign_flights" to "authenticated";
grant REFERENCES on table "public"."campaign_flights" to "authenticated";
grant SELECT on table "public"."campaign_flights" to "authenticated";
grant TRIGGER on table "public"."campaign_flights" to "authenticated";
grant TRUNCATE on table "public"."campaign_flights" to "authenticated";
grant UPDATE on table "public"."campaign_flights" to "authenticated";
grant DELETE on table "public"."campaign_flights" to "service_role";
grant INSERT on table "public"."campaign_flights" to "service_role";
grant MAINTAIN on table "public"."campaign_flights" to "service_role";
grant REFERENCES on table "public"."campaign_flights" to "service_role";
grant SELECT on table "public"."campaign_flights" to "service_role";
grant TRIGGER on table "public"."campaign_flights" to "service_role";
grant TRUNCATE on table "public"."campaign_flights" to "service_role";
grant UPDATE on table "public"."campaign_flights" to "service_role";
grant DELETE on table "public"."campaign_launch_checks" to "anon";
grant INSERT on table "public"."campaign_launch_checks" to "anon";
grant MAINTAIN on table "public"."campaign_launch_checks" to "anon";
grant REFERENCES on table "public"."campaign_launch_checks" to "anon";
grant SELECT on table "public"."campaign_launch_checks" to "anon";
grant TRIGGER on table "public"."campaign_launch_checks" to "anon";
grant TRUNCATE on table "public"."campaign_launch_checks" to "anon";
grant UPDATE on table "public"."campaign_launch_checks" to "anon";
grant DELETE on table "public"."campaign_launch_checks" to "authenticated";
grant INSERT on table "public"."campaign_launch_checks" to "authenticated";
grant MAINTAIN on table "public"."campaign_launch_checks" to "authenticated";
grant REFERENCES on table "public"."campaign_launch_checks" to "authenticated";
grant SELECT on table "public"."campaign_launch_checks" to "authenticated";
grant TRIGGER on table "public"."campaign_launch_checks" to "authenticated";
grant TRUNCATE on table "public"."campaign_launch_checks" to "authenticated";
grant UPDATE on table "public"."campaign_launch_checks" to "authenticated";
grant DELETE on table "public"."campaign_launch_checks" to "service_role";
grant INSERT on table "public"."campaign_launch_checks" to "service_role";
grant MAINTAIN on table "public"."campaign_launch_checks" to "service_role";
grant REFERENCES on table "public"."campaign_launch_checks" to "service_role";
grant SELECT on table "public"."campaign_launch_checks" to "service_role";
grant TRIGGER on table "public"."campaign_launch_checks" to "service_role";
grant TRUNCATE on table "public"."campaign_launch_checks" to "service_role";
grant UPDATE on table "public"."campaign_launch_checks" to "service_role";
grant DELETE on table "public"."campaign_line_items" to "anon";
grant INSERT on table "public"."campaign_line_items" to "anon";
grant MAINTAIN on table "public"."campaign_line_items" to "anon";
grant REFERENCES on table "public"."campaign_line_items" to "anon";
grant SELECT on table "public"."campaign_line_items" to "anon";
grant TRIGGER on table "public"."campaign_line_items" to "anon";
grant TRUNCATE on table "public"."campaign_line_items" to "anon";
grant UPDATE on table "public"."campaign_line_items" to "anon";
grant DELETE on table "public"."campaign_line_items" to "authenticated";
grant INSERT on table "public"."campaign_line_items" to "authenticated";
grant MAINTAIN on table "public"."campaign_line_items" to "authenticated";
grant REFERENCES on table "public"."campaign_line_items" to "authenticated";
grant SELECT on table "public"."campaign_line_items" to "authenticated";
grant TRIGGER on table "public"."campaign_line_items" to "authenticated";
grant TRUNCATE on table "public"."campaign_line_items" to "authenticated";
grant UPDATE on table "public"."campaign_line_items" to "authenticated";
grant DELETE on table "public"."campaign_line_items" to "service_role";
grant INSERT on table "public"."campaign_line_items" to "service_role";
grant MAINTAIN on table "public"."campaign_line_items" to "service_role";
grant REFERENCES on table "public"."campaign_line_items" to "service_role";
grant SELECT on table "public"."campaign_line_items" to "service_role";
grant TRIGGER on table "public"."campaign_line_items" to "service_role";
grant TRUNCATE on table "public"."campaign_line_items" to "service_role";
grant UPDATE on table "public"."campaign_line_items" to "service_role";
grant DELETE on table "public"."campaign_media_allocations" to "anon";
grant INSERT on table "public"."campaign_media_allocations" to "anon";
grant MAINTAIN on table "public"."campaign_media_allocations" to "anon";
grant REFERENCES on table "public"."campaign_media_allocations" to "anon";
grant SELECT on table "public"."campaign_media_allocations" to "anon";
grant TRIGGER on table "public"."campaign_media_allocations" to "anon";
grant TRUNCATE on table "public"."campaign_media_allocations" to "anon";
grant UPDATE on table "public"."campaign_media_allocations" to "anon";
grant DELETE on table "public"."campaign_media_allocations" to "authenticated";
grant INSERT on table "public"."campaign_media_allocations" to "authenticated";
grant MAINTAIN on table "public"."campaign_media_allocations" to "authenticated";
grant REFERENCES on table "public"."campaign_media_allocations" to "authenticated";
grant SELECT on table "public"."campaign_media_allocations" to "authenticated";
grant TRIGGER on table "public"."campaign_media_allocations" to "authenticated";
grant TRUNCATE on table "public"."campaign_media_allocations" to "authenticated";
grant UPDATE on table "public"."campaign_media_allocations" to "authenticated";
grant DELETE on table "public"."campaign_media_allocations" to "service_role";
grant INSERT on table "public"."campaign_media_allocations" to "service_role";
grant MAINTAIN on table "public"."campaign_media_allocations" to "service_role";
grant REFERENCES on table "public"."campaign_media_allocations" to "service_role";
grant SELECT on table "public"."campaign_media_allocations" to "service_role";
grant TRIGGER on table "public"."campaign_media_allocations" to "service_role";
grant TRUNCATE on table "public"."campaign_media_allocations" to "service_role";
grant UPDATE on table "public"."campaign_media_allocations" to "service_role";
grant DELETE on table "public"."campaign_reviews" to "anon";
grant INSERT on table "public"."campaign_reviews" to "anon";
grant MAINTAIN on table "public"."campaign_reviews" to "anon";
grant REFERENCES on table "public"."campaign_reviews" to "anon";
grant SELECT on table "public"."campaign_reviews" to "anon";
grant TRIGGER on table "public"."campaign_reviews" to "anon";
grant TRUNCATE on table "public"."campaign_reviews" to "anon";
grant UPDATE on table "public"."campaign_reviews" to "anon";
grant DELETE on table "public"."campaign_reviews" to "authenticated";
grant INSERT on table "public"."campaign_reviews" to "authenticated";
grant MAINTAIN on table "public"."campaign_reviews" to "authenticated";
grant REFERENCES on table "public"."campaign_reviews" to "authenticated";
grant SELECT on table "public"."campaign_reviews" to "authenticated";
grant TRIGGER on table "public"."campaign_reviews" to "authenticated";
grant TRUNCATE on table "public"."campaign_reviews" to "authenticated";
grant UPDATE on table "public"."campaign_reviews" to "authenticated";
grant DELETE on table "public"."campaign_reviews" to "service_role";
grant INSERT on table "public"."campaign_reviews" to "service_role";
grant MAINTAIN on table "public"."campaign_reviews" to "service_role";
grant REFERENCES on table "public"."campaign_reviews" to "service_role";
grant SELECT on table "public"."campaign_reviews" to "service_role";
grant TRIGGER on table "public"."campaign_reviews" to "service_role";
grant TRUNCATE on table "public"."campaign_reviews" to "service_role";
grant UPDATE on table "public"."campaign_reviews" to "service_role";
grant DELETE on table "public"."campaign_tracking_checks" to "anon";
grant INSERT on table "public"."campaign_tracking_checks" to "anon";
grant MAINTAIN on table "public"."campaign_tracking_checks" to "anon";
grant REFERENCES on table "public"."campaign_tracking_checks" to "anon";
grant SELECT on table "public"."campaign_tracking_checks" to "anon";
grant TRIGGER on table "public"."campaign_tracking_checks" to "anon";
grant TRUNCATE on table "public"."campaign_tracking_checks" to "anon";
grant UPDATE on table "public"."campaign_tracking_checks" to "anon";
grant DELETE on table "public"."campaign_tracking_checks" to "authenticated";
grant INSERT on table "public"."campaign_tracking_checks" to "authenticated";
grant MAINTAIN on table "public"."campaign_tracking_checks" to "authenticated";
grant REFERENCES on table "public"."campaign_tracking_checks" to "authenticated";
grant SELECT on table "public"."campaign_tracking_checks" to "authenticated";
grant TRIGGER on table "public"."campaign_tracking_checks" to "authenticated";
grant TRUNCATE on table "public"."campaign_tracking_checks" to "authenticated";
grant UPDATE on table "public"."campaign_tracking_checks" to "authenticated";
grant DELETE on table "public"."campaign_tracking_checks" to "service_role";
grant INSERT on table "public"."campaign_tracking_checks" to "service_role";
grant MAINTAIN on table "public"."campaign_tracking_checks" to "service_role";
grant REFERENCES on table "public"."campaign_tracking_checks" to "service_role";
grant SELECT on table "public"."campaign_tracking_checks" to "service_role";
grant TRIGGER on table "public"."campaign_tracking_checks" to "service_role";
grant TRUNCATE on table "public"."campaign_tracking_checks" to "service_role";
grant UPDATE on table "public"."campaign_tracking_checks" to "service_role";
grant DELETE on table "public"."campaigns" to "anon";
grant INSERT on table "public"."campaigns" to "anon";
grant MAINTAIN on table "public"."campaigns" to "anon";
grant REFERENCES on table "public"."campaigns" to "anon";
grant SELECT on table "public"."campaigns" to "anon";
grant TRIGGER on table "public"."campaigns" to "anon";
grant TRUNCATE on table "public"."campaigns" to "anon";
grant UPDATE on table "public"."campaigns" to "anon";
grant DELETE on table "public"."campaigns" to "authenticated";
grant INSERT on table "public"."campaigns" to "authenticated";
grant MAINTAIN on table "public"."campaigns" to "authenticated";
grant REFERENCES on table "public"."campaigns" to "authenticated";
grant SELECT on table "public"."campaigns" to "authenticated";
grant TRIGGER on table "public"."campaigns" to "authenticated";
grant TRUNCATE on table "public"."campaigns" to "authenticated";
grant UPDATE on table "public"."campaigns" to "authenticated";
grant DELETE on table "public"."campaigns" to "service_role";
grant INSERT on table "public"."campaigns" to "service_role";
grant MAINTAIN on table "public"."campaigns" to "service_role";
grant REFERENCES on table "public"."campaigns" to "service_role";
grant SELECT on table "public"."campaigns" to "service_role";
grant TRIGGER on table "public"."campaigns" to "service_role";
grant TRUNCATE on table "public"."campaigns" to "service_role";
grant UPDATE on table "public"."campaigns" to "service_role";
grant DELETE on table "public"."capability_tags" to "anon";
grant INSERT on table "public"."capability_tags" to "anon";
grant MAINTAIN on table "public"."capability_tags" to "anon";
grant REFERENCES on table "public"."capability_tags" to "anon";
grant SELECT on table "public"."capability_tags" to "anon";
grant TRIGGER on table "public"."capability_tags" to "anon";
grant TRUNCATE on table "public"."capability_tags" to "anon";
grant UPDATE on table "public"."capability_tags" to "anon";
grant DELETE on table "public"."capability_tags" to "authenticated";
grant INSERT on table "public"."capability_tags" to "authenticated";
grant MAINTAIN on table "public"."capability_tags" to "authenticated";
grant REFERENCES on table "public"."capability_tags" to "authenticated";
grant SELECT on table "public"."capability_tags" to "authenticated";
grant TRIGGER on table "public"."capability_tags" to "authenticated";
grant TRUNCATE on table "public"."capability_tags" to "authenticated";
grant UPDATE on table "public"."capability_tags" to "authenticated";
grant DELETE on table "public"."capability_tags" to "service_role";
grant INSERT on table "public"."capability_tags" to "service_role";
grant MAINTAIN on table "public"."capability_tags" to "service_role";
grant REFERENCES on table "public"."capability_tags" to "service_role";
grant SELECT on table "public"."capability_tags" to "service_role";
grant TRIGGER on table "public"."capability_tags" to "service_role";
grant TRUNCATE on table "public"."capability_tags" to "service_role";
grant UPDATE on table "public"."capability_tags" to "service_role";
grant DELETE on table "public"."channel_technical_profiles" to "anon";
grant INSERT on table "public"."channel_technical_profiles" to "anon";
grant MAINTAIN on table "public"."channel_technical_profiles" to "anon";
grant REFERENCES on table "public"."channel_technical_profiles" to "anon";
grant SELECT on table "public"."channel_technical_profiles" to "anon";
grant TRIGGER on table "public"."channel_technical_profiles" to "anon";
grant TRUNCATE on table "public"."channel_technical_profiles" to "anon";
grant UPDATE on table "public"."channel_technical_profiles" to "anon";
grant DELETE on table "public"."channel_technical_profiles" to "authenticated";
grant INSERT on table "public"."channel_technical_profiles" to "authenticated";
grant MAINTAIN on table "public"."channel_technical_profiles" to "authenticated";
grant REFERENCES on table "public"."channel_technical_profiles" to "authenticated";
grant SELECT on table "public"."channel_technical_profiles" to "authenticated";
grant TRIGGER on table "public"."channel_technical_profiles" to "authenticated";
grant TRUNCATE on table "public"."channel_technical_profiles" to "authenticated";
grant UPDATE on table "public"."channel_technical_profiles" to "authenticated";
grant DELETE on table "public"."channel_technical_profiles" to "service_role";
grant INSERT on table "public"."channel_technical_profiles" to "service_role";
grant MAINTAIN on table "public"."channel_technical_profiles" to "service_role";
grant REFERENCES on table "public"."channel_technical_profiles" to "service_role";
grant SELECT on table "public"."channel_technical_profiles" to "service_role";
grant TRIGGER on table "public"."channel_technical_profiles" to "service_role";
grant TRUNCATE on table "public"."channel_technical_profiles" to "service_role";
grant UPDATE on table "public"."channel_technical_profiles" to "service_role";
grant DELETE on table "public"."checklist_templates" to "anon";
grant INSERT on table "public"."checklist_templates" to "anon";
grant MAINTAIN on table "public"."checklist_templates" to "anon";
grant REFERENCES on table "public"."checklist_templates" to "anon";
grant SELECT on table "public"."checklist_templates" to "anon";
grant TRIGGER on table "public"."checklist_templates" to "anon";
grant TRUNCATE on table "public"."checklist_templates" to "anon";
grant UPDATE on table "public"."checklist_templates" to "anon";
grant DELETE on table "public"."checklist_templates" to "authenticated";
grant INSERT on table "public"."checklist_templates" to "authenticated";
grant MAINTAIN on table "public"."checklist_templates" to "authenticated";
grant REFERENCES on table "public"."checklist_templates" to "authenticated";
grant SELECT on table "public"."checklist_templates" to "authenticated";
grant TRIGGER on table "public"."checklist_templates" to "authenticated";
grant TRUNCATE on table "public"."checklist_templates" to "authenticated";
grant UPDATE on table "public"."checklist_templates" to "authenticated";
grant DELETE on table "public"."checklist_templates" to "service_role";
grant INSERT on table "public"."checklist_templates" to "service_role";
grant MAINTAIN on table "public"."checklist_templates" to "service_role";
grant REFERENCES on table "public"."checklist_templates" to "service_role";
grant SELECT on table "public"."checklist_templates" to "service_role";
grant TRIGGER on table "public"."checklist_templates" to "service_role";
grant TRUNCATE on table "public"."checklist_templates" to "service_role";
grant UPDATE on table "public"."checklist_templates" to "service_role";
grant DELETE on table "public"."comments" to "anon";
grant INSERT on table "public"."comments" to "anon";
grant MAINTAIN on table "public"."comments" to "anon";
grant REFERENCES on table "public"."comments" to "anon";
grant SELECT on table "public"."comments" to "anon";
grant TRIGGER on table "public"."comments" to "anon";
grant TRUNCATE on table "public"."comments" to "anon";
grant UPDATE on table "public"."comments" to "anon";
grant DELETE on table "public"."comments" to "authenticated";
grant INSERT on table "public"."comments" to "authenticated";
grant MAINTAIN on table "public"."comments" to "authenticated";
grant REFERENCES on table "public"."comments" to "authenticated";
grant SELECT on table "public"."comments" to "authenticated";
grant TRIGGER on table "public"."comments" to "authenticated";
grant TRUNCATE on table "public"."comments" to "authenticated";
grant UPDATE on table "public"."comments" to "authenticated";
grant DELETE on table "public"."comments" to "service_role";
grant INSERT on table "public"."comments" to "service_role";
grant MAINTAIN on table "public"."comments" to "service_role";
grant REFERENCES on table "public"."comments" to "service_role";
grant SELECT on table "public"."comments" to "service_role";
grant TRIGGER on table "public"."comments" to "service_role";
grant TRUNCATE on table "public"."comments" to "service_role";
grant UPDATE on table "public"."comments" to "service_role";
grant DELETE on table "public"."commercial_proposals" to "anon";
grant INSERT on table "public"."commercial_proposals" to "anon";
grant MAINTAIN on table "public"."commercial_proposals" to "anon";
grant REFERENCES on table "public"."commercial_proposals" to "anon";
grant SELECT on table "public"."commercial_proposals" to "anon";
grant TRIGGER on table "public"."commercial_proposals" to "anon";
grant TRUNCATE on table "public"."commercial_proposals" to "anon";
grant UPDATE on table "public"."commercial_proposals" to "anon";
grant DELETE on table "public"."commercial_proposals" to "authenticated";
grant INSERT on table "public"."commercial_proposals" to "authenticated";
grant MAINTAIN on table "public"."commercial_proposals" to "authenticated";
grant REFERENCES on table "public"."commercial_proposals" to "authenticated";
grant SELECT on table "public"."commercial_proposals" to "authenticated";
grant TRIGGER on table "public"."commercial_proposals" to "authenticated";
grant TRUNCATE on table "public"."commercial_proposals" to "authenticated";
grant UPDATE on table "public"."commercial_proposals" to "authenticated";
grant DELETE on table "public"."commercial_proposals" to "service_role";
grant INSERT on table "public"."commercial_proposals" to "service_role";
grant MAINTAIN on table "public"."commercial_proposals" to "service_role";
grant REFERENCES on table "public"."commercial_proposals" to "service_role";
grant SELECT on table "public"."commercial_proposals" to "service_role";
grant TRIGGER on table "public"."commercial_proposals" to "service_role";
grant TRUNCATE on table "public"."commercial_proposals" to "service_role";
grant UPDATE on table "public"."commercial_proposals" to "service_role";
grant DELETE on table "public"."commercial_tests" to "anon";
grant INSERT on table "public"."commercial_tests" to "anon";
grant MAINTAIN on table "public"."commercial_tests" to "anon";
grant REFERENCES on table "public"."commercial_tests" to "anon";
grant SELECT on table "public"."commercial_tests" to "anon";
grant TRIGGER on table "public"."commercial_tests" to "anon";
grant TRUNCATE on table "public"."commercial_tests" to "anon";
grant UPDATE on table "public"."commercial_tests" to "anon";
grant DELETE on table "public"."commercial_tests" to "authenticated";
grant INSERT on table "public"."commercial_tests" to "authenticated";
grant MAINTAIN on table "public"."commercial_tests" to "authenticated";
grant REFERENCES on table "public"."commercial_tests" to "authenticated";
grant SELECT on table "public"."commercial_tests" to "authenticated";
grant TRIGGER on table "public"."commercial_tests" to "authenticated";
grant TRUNCATE on table "public"."commercial_tests" to "authenticated";
grant UPDATE on table "public"."commercial_tests" to "authenticated";
grant DELETE on table "public"."commercial_tests" to "service_role";
grant INSERT on table "public"."commercial_tests" to "service_role";
grant MAINTAIN on table "public"."commercial_tests" to "service_role";
grant REFERENCES on table "public"."commercial_tests" to "service_role";
grant SELECT on table "public"."commercial_tests" to "service_role";
grant TRIGGER on table "public"."commercial_tests" to "service_role";
grant TRUNCATE on table "public"."commercial_tests" to "service_role";
grant UPDATE on table "public"."commercial_tests" to "service_role";
grant DELETE on table "public"."contracts" to "anon";
grant INSERT on table "public"."contracts" to "anon";
grant MAINTAIN on table "public"."contracts" to "anon";
grant REFERENCES on table "public"."contracts" to "anon";
grant SELECT on table "public"."contracts" to "anon";
grant TRIGGER on table "public"."contracts" to "anon";
grant TRUNCATE on table "public"."contracts" to "anon";
grant UPDATE on table "public"."contracts" to "anon";
grant DELETE on table "public"."contracts" to "authenticated";
grant INSERT on table "public"."contracts" to "authenticated";
grant MAINTAIN on table "public"."contracts" to "authenticated";
grant REFERENCES on table "public"."contracts" to "authenticated";
grant SELECT on table "public"."contracts" to "authenticated";
grant TRIGGER on table "public"."contracts" to "authenticated";
grant TRUNCATE on table "public"."contracts" to "authenticated";
grant UPDATE on table "public"."contracts" to "authenticated";
grant DELETE on table "public"."contracts" to "service_role";
grant INSERT on table "public"."contracts" to "service_role";
grant MAINTAIN on table "public"."contracts" to "service_role";
grant REFERENCES on table "public"."contracts" to "service_role";
grant SELECT on table "public"."contracts" to "service_role";
grant TRIGGER on table "public"."contracts" to "service_role";
grant TRUNCATE on table "public"."contracts" to "service_role";
grant UPDATE on table "public"."contracts" to "service_role";
grant DELETE on table "public"."data_quality_checks" to "anon";
grant INSERT on table "public"."data_quality_checks" to "anon";
grant MAINTAIN on table "public"."data_quality_checks" to "anon";
grant REFERENCES on table "public"."data_quality_checks" to "anon";
grant SELECT on table "public"."data_quality_checks" to "anon";
grant TRIGGER on table "public"."data_quality_checks" to "anon";
grant TRUNCATE on table "public"."data_quality_checks" to "anon";
grant UPDATE on table "public"."data_quality_checks" to "anon";
grant DELETE on table "public"."data_quality_checks" to "authenticated";
grant INSERT on table "public"."data_quality_checks" to "authenticated";
grant MAINTAIN on table "public"."data_quality_checks" to "authenticated";
grant REFERENCES on table "public"."data_quality_checks" to "authenticated";
grant SELECT on table "public"."data_quality_checks" to "authenticated";
grant TRIGGER on table "public"."data_quality_checks" to "authenticated";
grant TRUNCATE on table "public"."data_quality_checks" to "authenticated";
grant UPDATE on table "public"."data_quality_checks" to "authenticated";
grant DELETE on table "public"."data_quality_checks" to "service_role";
grant INSERT on table "public"."data_quality_checks" to "service_role";
grant MAINTAIN on table "public"."data_quality_checks" to "service_role";
grant REFERENCES on table "public"."data_quality_checks" to "service_role";
grant SELECT on table "public"."data_quality_checks" to "service_role";
grant TRIGGER on table "public"."data_quality_checks" to "service_role";
grant TRUNCATE on table "public"."data_quality_checks" to "service_role";
grant UPDATE on table "public"."data_quality_checks" to "service_role";
grant DELETE on table "public"."data_reconciliation_results" to "anon";
grant INSERT on table "public"."data_reconciliation_results" to "anon";
grant MAINTAIN on table "public"."data_reconciliation_results" to "anon";
grant REFERENCES on table "public"."data_reconciliation_results" to "anon";
grant SELECT on table "public"."data_reconciliation_results" to "anon";
grant TRIGGER on table "public"."data_reconciliation_results" to "anon";
grant TRUNCATE on table "public"."data_reconciliation_results" to "anon";
grant UPDATE on table "public"."data_reconciliation_results" to "anon";
grant DELETE on table "public"."data_reconciliation_results" to "authenticated";
grant INSERT on table "public"."data_reconciliation_results" to "authenticated";
grant MAINTAIN on table "public"."data_reconciliation_results" to "authenticated";
grant REFERENCES on table "public"."data_reconciliation_results" to "authenticated";
grant SELECT on table "public"."data_reconciliation_results" to "authenticated";
grant TRIGGER on table "public"."data_reconciliation_results" to "authenticated";
grant TRUNCATE on table "public"."data_reconciliation_results" to "authenticated";
grant UPDATE on table "public"."data_reconciliation_results" to "authenticated";
grant DELETE on table "public"."data_reconciliation_results" to "service_role";
grant INSERT on table "public"."data_reconciliation_results" to "service_role";
grant MAINTAIN on table "public"."data_reconciliation_results" to "service_role";
grant REFERENCES on table "public"."data_reconciliation_results" to "service_role";
grant SELECT on table "public"."data_reconciliation_results" to "service_role";
grant TRIGGER on table "public"."data_reconciliation_results" to "service_role";
grant TRUNCATE on table "public"."data_reconciliation_results" to "service_role";
grant UPDATE on table "public"."data_reconciliation_results" to "service_role";
grant DELETE on table "public"."evaluation_scoring_rules" to "anon";
grant INSERT on table "public"."evaluation_scoring_rules" to "anon";
grant MAINTAIN on table "public"."evaluation_scoring_rules" to "anon";
grant REFERENCES on table "public"."evaluation_scoring_rules" to "anon";
grant SELECT on table "public"."evaluation_scoring_rules" to "anon";
grant TRIGGER on table "public"."evaluation_scoring_rules" to "anon";
grant TRUNCATE on table "public"."evaluation_scoring_rules" to "anon";
grant UPDATE on table "public"."evaluation_scoring_rules" to "anon";
grant DELETE on table "public"."evaluation_scoring_rules" to "authenticated";
grant INSERT on table "public"."evaluation_scoring_rules" to "authenticated";
grant MAINTAIN on table "public"."evaluation_scoring_rules" to "authenticated";
grant REFERENCES on table "public"."evaluation_scoring_rules" to "authenticated";
grant SELECT on table "public"."evaluation_scoring_rules" to "authenticated";
grant TRIGGER on table "public"."evaluation_scoring_rules" to "authenticated";
grant TRUNCATE on table "public"."evaluation_scoring_rules" to "authenticated";
grant UPDATE on table "public"."evaluation_scoring_rules" to "authenticated";
grant DELETE on table "public"."evaluation_scoring_rules" to "service_role";
grant INSERT on table "public"."evaluation_scoring_rules" to "service_role";
grant MAINTAIN on table "public"."evaluation_scoring_rules" to "service_role";
grant REFERENCES on table "public"."evaluation_scoring_rules" to "service_role";
grant SELECT on table "public"."evaluation_scoring_rules" to "service_role";
grant TRIGGER on table "public"."evaluation_scoring_rules" to "service_role";
grant TRUNCATE on table "public"."evaluation_scoring_rules" to "service_role";
grant UPDATE on table "public"."evaluation_scoring_rules" to "service_role";
grant DELETE on table "public"."field_access_policies" to "anon";
grant INSERT on table "public"."field_access_policies" to "anon";
grant MAINTAIN on table "public"."field_access_policies" to "anon";
grant REFERENCES on table "public"."field_access_policies" to "anon";
grant SELECT on table "public"."field_access_policies" to "anon";
grant TRIGGER on table "public"."field_access_policies" to "anon";
grant TRUNCATE on table "public"."field_access_policies" to "anon";
grant UPDATE on table "public"."field_access_policies" to "anon";
grant DELETE on table "public"."field_access_policies" to "authenticated";
grant INSERT on table "public"."field_access_policies" to "authenticated";
grant MAINTAIN on table "public"."field_access_policies" to "authenticated";
grant REFERENCES on table "public"."field_access_policies" to "authenticated";
grant SELECT on table "public"."field_access_policies" to "authenticated";
grant TRIGGER on table "public"."field_access_policies" to "authenticated";
grant TRUNCATE on table "public"."field_access_policies" to "authenticated";
grant UPDATE on table "public"."field_access_policies" to "authenticated";
grant DELETE on table "public"."field_access_policies" to "service_role";
grant INSERT on table "public"."field_access_policies" to "service_role";
grant MAINTAIN on table "public"."field_access_policies" to "service_role";
grant REFERENCES on table "public"."field_access_policies" to "service_role";
grant SELECT on table "public"."field_access_policies" to "service_role";
grant TRIGGER on table "public"."field_access_policies" to "service_role";
grant TRUNCATE on table "public"."field_access_policies" to "service_role";
grant UPDATE on table "public"."field_access_policies" to "service_role";
grant DELETE on table "public"."files" to "anon";
grant INSERT on table "public"."files" to "anon";
grant MAINTAIN on table "public"."files" to "anon";
grant REFERENCES on table "public"."files" to "anon";
grant SELECT on table "public"."files" to "anon";
grant TRIGGER on table "public"."files" to "anon";
grant TRUNCATE on table "public"."files" to "anon";
grant UPDATE on table "public"."files" to "anon";
grant DELETE on table "public"."files" to "authenticated";
grant INSERT on table "public"."files" to "authenticated";
grant MAINTAIN on table "public"."files" to "authenticated";
grant REFERENCES on table "public"."files" to "authenticated";
grant SELECT on table "public"."files" to "authenticated";
grant TRIGGER on table "public"."files" to "authenticated";
grant TRUNCATE on table "public"."files" to "authenticated";
grant UPDATE on table "public"."files" to "authenticated";
grant DELETE on table "public"."files" to "service_role";
grant INSERT on table "public"."files" to "service_role";
grant MAINTAIN on table "public"."files" to "service_role";
grant REFERENCES on table "public"."files" to "service_role";
grant SELECT on table "public"."files" to "service_role";
grant TRIGGER on table "public"."files" to "service_role";
grant TRUNCATE on table "public"."files" to "service_role";
grant UPDATE on table "public"."files" to "service_role";
grant DELETE on table "public"."finance_business_chain_snapshots" to "anon";
grant INSERT on table "public"."finance_business_chain_snapshots" to "anon";
grant MAINTAIN on table "public"."finance_business_chain_snapshots" to "anon";
grant REFERENCES on table "public"."finance_business_chain_snapshots" to "anon";
grant SELECT on table "public"."finance_business_chain_snapshots" to "anon";
grant TRIGGER on table "public"."finance_business_chain_snapshots" to "anon";
grant TRUNCATE on table "public"."finance_business_chain_snapshots" to "anon";
grant UPDATE on table "public"."finance_business_chain_snapshots" to "anon";
grant DELETE on table "public"."finance_business_chain_snapshots" to "authenticated";
grant INSERT on table "public"."finance_business_chain_snapshots" to "authenticated";
grant MAINTAIN on table "public"."finance_business_chain_snapshots" to "authenticated";
grant REFERENCES on table "public"."finance_business_chain_snapshots" to "authenticated";
grant SELECT on table "public"."finance_business_chain_snapshots" to "authenticated";
grant TRIGGER on table "public"."finance_business_chain_snapshots" to "authenticated";
grant TRUNCATE on table "public"."finance_business_chain_snapshots" to "authenticated";
grant UPDATE on table "public"."finance_business_chain_snapshots" to "authenticated";
grant DELETE on table "public"."finance_business_chain_snapshots" to "service_role";
grant INSERT on table "public"."finance_business_chain_snapshots" to "service_role";
grant MAINTAIN on table "public"."finance_business_chain_snapshots" to "service_role";
grant REFERENCES on table "public"."finance_business_chain_snapshots" to "service_role";
grant SELECT on table "public"."finance_business_chain_snapshots" to "service_role";
grant TRIGGER on table "public"."finance_business_chain_snapshots" to "service_role";
grant TRUNCATE on table "public"."finance_business_chain_snapshots" to "service_role";
grant UPDATE on table "public"."finance_business_chain_snapshots" to "service_role";
grant DELETE on table "public"."finance_exceptions" to "anon";
grant INSERT on table "public"."finance_exceptions" to "anon";
grant MAINTAIN on table "public"."finance_exceptions" to "anon";
grant REFERENCES on table "public"."finance_exceptions" to "anon";
grant SELECT on table "public"."finance_exceptions" to "anon";
grant TRIGGER on table "public"."finance_exceptions" to "anon";
grant TRUNCATE on table "public"."finance_exceptions" to "anon";
grant UPDATE on table "public"."finance_exceptions" to "anon";
grant DELETE on table "public"."finance_exceptions" to "authenticated";
grant INSERT on table "public"."finance_exceptions" to "authenticated";
grant MAINTAIN on table "public"."finance_exceptions" to "authenticated";
grant REFERENCES on table "public"."finance_exceptions" to "authenticated";
grant SELECT on table "public"."finance_exceptions" to "authenticated";
grant TRIGGER on table "public"."finance_exceptions" to "authenticated";
grant TRUNCATE on table "public"."finance_exceptions" to "authenticated";
grant UPDATE on table "public"."finance_exceptions" to "authenticated";
grant DELETE on table "public"."finance_exceptions" to "service_role";
grant INSERT on table "public"."finance_exceptions" to "service_role";
grant MAINTAIN on table "public"."finance_exceptions" to "service_role";
grant REFERENCES on table "public"."finance_exceptions" to "service_role";
grant SELECT on table "public"."finance_exceptions" to "service_role";
grant TRIGGER on table "public"."finance_exceptions" to "service_role";
grant TRUNCATE on table "public"."finance_exceptions" to "service_role";
grant UPDATE on table "public"."finance_exceptions" to "service_role";
grant DELETE on table "public"."finance_ledger_entries" to "anon";
grant INSERT on table "public"."finance_ledger_entries" to "anon";
grant MAINTAIN on table "public"."finance_ledger_entries" to "anon";
grant REFERENCES on table "public"."finance_ledger_entries" to "anon";
grant SELECT on table "public"."finance_ledger_entries" to "anon";
grant TRIGGER on table "public"."finance_ledger_entries" to "anon";
grant TRUNCATE on table "public"."finance_ledger_entries" to "anon";
grant UPDATE on table "public"."finance_ledger_entries" to "anon";
grant DELETE on table "public"."finance_ledger_entries" to "authenticated";
grant INSERT on table "public"."finance_ledger_entries" to "authenticated";
grant MAINTAIN on table "public"."finance_ledger_entries" to "authenticated";
grant REFERENCES on table "public"."finance_ledger_entries" to "authenticated";
grant SELECT on table "public"."finance_ledger_entries" to "authenticated";
grant TRIGGER on table "public"."finance_ledger_entries" to "authenticated";
grant TRUNCATE on table "public"."finance_ledger_entries" to "authenticated";
grant UPDATE on table "public"."finance_ledger_entries" to "authenticated";
grant DELETE on table "public"."finance_ledger_entries" to "service_role";
grant INSERT on table "public"."finance_ledger_entries" to "service_role";
grant MAINTAIN on table "public"."finance_ledger_entries" to "service_role";
grant REFERENCES on table "public"."finance_ledger_entries" to "service_role";
grant SELECT on table "public"."finance_ledger_entries" to "service_role";
grant TRIGGER on table "public"."finance_ledger_entries" to "service_role";
grant TRUNCATE on table "public"."finance_ledger_entries" to "service_role";
grant UPDATE on table "public"."finance_ledger_entries" to "service_role";
grant DELETE on table "public"."finance_reconciliation_items" to "anon";
grant INSERT on table "public"."finance_reconciliation_items" to "anon";
grant MAINTAIN on table "public"."finance_reconciliation_items" to "anon";
grant REFERENCES on table "public"."finance_reconciliation_items" to "anon";
grant SELECT on table "public"."finance_reconciliation_items" to "anon";
grant TRIGGER on table "public"."finance_reconciliation_items" to "anon";
grant TRUNCATE on table "public"."finance_reconciliation_items" to "anon";
grant UPDATE on table "public"."finance_reconciliation_items" to "anon";
grant DELETE on table "public"."finance_reconciliation_items" to "authenticated";
grant INSERT on table "public"."finance_reconciliation_items" to "authenticated";
grant MAINTAIN on table "public"."finance_reconciliation_items" to "authenticated";
grant REFERENCES on table "public"."finance_reconciliation_items" to "authenticated";
grant SELECT on table "public"."finance_reconciliation_items" to "authenticated";
grant TRIGGER on table "public"."finance_reconciliation_items" to "authenticated";
grant TRUNCATE on table "public"."finance_reconciliation_items" to "authenticated";
grant UPDATE on table "public"."finance_reconciliation_items" to "authenticated";
grant DELETE on table "public"."finance_reconciliation_items" to "service_role";
grant INSERT on table "public"."finance_reconciliation_items" to "service_role";
grant MAINTAIN on table "public"."finance_reconciliation_items" to "service_role";
grant REFERENCES on table "public"."finance_reconciliation_items" to "service_role";
grant SELECT on table "public"."finance_reconciliation_items" to "service_role";
grant TRIGGER on table "public"."finance_reconciliation_items" to "service_role";
grant TRUNCATE on table "public"."finance_reconciliation_items" to "service_role";
grant UPDATE on table "public"."finance_reconciliation_items" to "service_role";
grant DELETE on table "public"."governance_rule_source_registry" to "anon";
grant INSERT on table "public"."governance_rule_source_registry" to "anon";
grant MAINTAIN on table "public"."governance_rule_source_registry" to "anon";
grant REFERENCES on table "public"."governance_rule_source_registry" to "anon";
grant SELECT on table "public"."governance_rule_source_registry" to "anon";
grant TRIGGER on table "public"."governance_rule_source_registry" to "anon";
grant TRUNCATE on table "public"."governance_rule_source_registry" to "anon";
grant UPDATE on table "public"."governance_rule_source_registry" to "anon";
grant DELETE on table "public"."governance_rule_source_registry" to "authenticated";
grant INSERT on table "public"."governance_rule_source_registry" to "authenticated";
grant MAINTAIN on table "public"."governance_rule_source_registry" to "authenticated";
grant REFERENCES on table "public"."governance_rule_source_registry" to "authenticated";
grant SELECT on table "public"."governance_rule_source_registry" to "authenticated";
grant TRIGGER on table "public"."governance_rule_source_registry" to "authenticated";
grant TRUNCATE on table "public"."governance_rule_source_registry" to "authenticated";
grant UPDATE on table "public"."governance_rule_source_registry" to "authenticated";
grant DELETE on table "public"."governance_rule_source_registry" to "service_role";
grant INSERT on table "public"."governance_rule_source_registry" to "service_role";
grant MAINTAIN on table "public"."governance_rule_source_registry" to "service_role";
grant REFERENCES on table "public"."governance_rule_source_registry" to "service_role";
grant SELECT on table "public"."governance_rule_source_registry" to "service_role";
grant TRIGGER on table "public"."governance_rule_source_registry" to "service_role";
grant TRUNCATE on table "public"."governance_rule_source_registry" to "service_role";
grant UPDATE on table "public"."governance_rule_source_registry" to "service_role";
grant DELETE on table "public"."health_check" to "anon";
grant INSERT on table "public"."health_check" to "anon";
grant MAINTAIN on table "public"."health_check" to "anon";
grant REFERENCES on table "public"."health_check" to "anon";
grant SELECT on table "public"."health_check" to "anon";
grant TRIGGER on table "public"."health_check" to "anon";
grant TRUNCATE on table "public"."health_check" to "anon";
grant UPDATE on table "public"."health_check" to "anon";
grant DELETE on table "public"."health_check" to "authenticated";
grant INSERT on table "public"."health_check" to "authenticated";
grant MAINTAIN on table "public"."health_check" to "authenticated";
grant REFERENCES on table "public"."health_check" to "authenticated";
grant SELECT on table "public"."health_check" to "authenticated";
grant TRIGGER on table "public"."health_check" to "authenticated";
grant TRUNCATE on table "public"."health_check" to "authenticated";
grant UPDATE on table "public"."health_check" to "authenticated";
grant DELETE on table "public"."health_check" to "service_role";
grant INSERT on table "public"."health_check" to "service_role";
grant MAINTAIN on table "public"."health_check" to "service_role";
grant REFERENCES on table "public"."health_check" to "service_role";
grant SELECT on table "public"."health_check" to "service_role";
grant TRIGGER on table "public"."health_check" to "service_role";
grant TRUNCATE on table "public"."health_check" to "service_role";
grant UPDATE on table "public"."health_check" to "service_role";
grant SELECT on sequence "public"."health_check_id_seq" to "anon";
grant UPDATE on sequence "public"."health_check_id_seq" to "anon";
grant USAGE on sequence "public"."health_check_id_seq" to "anon";
grant SELECT on sequence "public"."health_check_id_seq" to "authenticated";
grant UPDATE on sequence "public"."health_check_id_seq" to "authenticated";
grant USAGE on sequence "public"."health_check_id_seq" to "authenticated";
grant SELECT on sequence "public"."health_check_id_seq" to "service_role";
grant UPDATE on sequence "public"."health_check_id_seq" to "service_role";
grant USAGE on sequence "public"."health_check_id_seq" to "service_role";
grant DELETE on table "public"."integration_check_results" to "anon";
grant INSERT on table "public"."integration_check_results" to "anon";
grant MAINTAIN on table "public"."integration_check_results" to "anon";
grant REFERENCES on table "public"."integration_check_results" to "anon";
grant SELECT on table "public"."integration_check_results" to "anon";
grant TRIGGER on table "public"."integration_check_results" to "anon";
grant TRUNCATE on table "public"."integration_check_results" to "anon";
grant UPDATE on table "public"."integration_check_results" to "anon";
grant DELETE on table "public"."integration_check_results" to "authenticated";
grant INSERT on table "public"."integration_check_results" to "authenticated";
grant MAINTAIN on table "public"."integration_check_results" to "authenticated";
grant REFERENCES on table "public"."integration_check_results" to "authenticated";
grant SELECT on table "public"."integration_check_results" to "authenticated";
grant TRIGGER on table "public"."integration_check_results" to "authenticated";
grant TRUNCATE on table "public"."integration_check_results" to "authenticated";
grant UPDATE on table "public"."integration_check_results" to "authenticated";
grant DELETE on table "public"."integration_check_results" to "service_role";
grant INSERT on table "public"."integration_check_results" to "service_role";
grant MAINTAIN on table "public"."integration_check_results" to "service_role";
grant REFERENCES on table "public"."integration_check_results" to "service_role";
grant SELECT on table "public"."integration_check_results" to "service_role";
grant TRIGGER on table "public"."integration_check_results" to "service_role";
grant TRUNCATE on table "public"."integration_check_results" to "service_role";
grant UPDATE on table "public"."integration_check_results" to "service_role";
grant DELETE on table "public"."integration_checklists" to "anon";
grant INSERT on table "public"."integration_checklists" to "anon";
grant MAINTAIN on table "public"."integration_checklists" to "anon";
grant REFERENCES on table "public"."integration_checklists" to "anon";
grant SELECT on table "public"."integration_checklists" to "anon";
grant TRIGGER on table "public"."integration_checklists" to "anon";
grant TRUNCATE on table "public"."integration_checklists" to "anon";
grant UPDATE on table "public"."integration_checklists" to "anon";
grant DELETE on table "public"."integration_checklists" to "authenticated";
grant INSERT on table "public"."integration_checklists" to "authenticated";
grant MAINTAIN on table "public"."integration_checklists" to "authenticated";
grant REFERENCES on table "public"."integration_checklists" to "authenticated";
grant SELECT on table "public"."integration_checklists" to "authenticated";
grant TRIGGER on table "public"."integration_checklists" to "authenticated";
grant TRUNCATE on table "public"."integration_checklists" to "authenticated";
grant UPDATE on table "public"."integration_checklists" to "authenticated";
grant DELETE on table "public"."integration_checklists" to "service_role";
grant INSERT on table "public"."integration_checklists" to "service_role";
grant MAINTAIN on table "public"."integration_checklists" to "service_role";
grant REFERENCES on table "public"."integration_checklists" to "service_role";
grant SELECT on table "public"."integration_checklists" to "service_role";
grant TRIGGER on table "public"."integration_checklists" to "service_role";
grant TRUNCATE on table "public"."integration_checklists" to "service_role";
grant UPDATE on table "public"."integration_checklists" to "service_role";
grant DELETE on table "public"."integration_project_profiles" to "anon";
grant INSERT on table "public"."integration_project_profiles" to "anon";
grant MAINTAIN on table "public"."integration_project_profiles" to "anon";
grant REFERENCES on table "public"."integration_project_profiles" to "anon";
grant SELECT on table "public"."integration_project_profiles" to "anon";
grant TRIGGER on table "public"."integration_project_profiles" to "anon";
grant TRUNCATE on table "public"."integration_project_profiles" to "anon";
grant UPDATE on table "public"."integration_project_profiles" to "anon";
grant DELETE on table "public"."integration_project_profiles" to "authenticated";
grant INSERT on table "public"."integration_project_profiles" to "authenticated";
grant MAINTAIN on table "public"."integration_project_profiles" to "authenticated";
grant REFERENCES on table "public"."integration_project_profiles" to "authenticated";
grant SELECT on table "public"."integration_project_profiles" to "authenticated";
grant TRIGGER on table "public"."integration_project_profiles" to "authenticated";
grant TRUNCATE on table "public"."integration_project_profiles" to "authenticated";
grant UPDATE on table "public"."integration_project_profiles" to "authenticated";
grant DELETE on table "public"."integration_project_profiles" to "service_role";
grant INSERT on table "public"."integration_project_profiles" to "service_role";
grant MAINTAIN on table "public"."integration_project_profiles" to "service_role";
grant REFERENCES on table "public"."integration_project_profiles" to "service_role";
grant SELECT on table "public"."integration_project_profiles" to "service_role";
grant TRIGGER on table "public"."integration_project_profiles" to "service_role";
grant TRUNCATE on table "public"."integration_project_profiles" to "service_role";
grant UPDATE on table "public"."integration_project_profiles" to "service_role";
grant DELETE on table "public"."integration_projects" to "anon";
grant INSERT on table "public"."integration_projects" to "anon";
grant MAINTAIN on table "public"."integration_projects" to "anon";
grant REFERENCES on table "public"."integration_projects" to "anon";
grant SELECT on table "public"."integration_projects" to "anon";
grant TRIGGER on table "public"."integration_projects" to "anon";
grant TRUNCATE on table "public"."integration_projects" to "anon";
grant UPDATE on table "public"."integration_projects" to "anon";
grant DELETE on table "public"."integration_projects" to "authenticated";
grant INSERT on table "public"."integration_projects" to "authenticated";
grant MAINTAIN on table "public"."integration_projects" to "authenticated";
grant REFERENCES on table "public"."integration_projects" to "authenticated";
grant SELECT on table "public"."integration_projects" to "authenticated";
grant TRIGGER on table "public"."integration_projects" to "authenticated";
grant TRUNCATE on table "public"."integration_projects" to "authenticated";
grant UPDATE on table "public"."integration_projects" to "authenticated";
grant DELETE on table "public"."integration_projects" to "service_role";
grant INSERT on table "public"."integration_projects" to "service_role";
grant MAINTAIN on table "public"."integration_projects" to "service_role";
grant REFERENCES on table "public"."integration_projects" to "service_role";
grant SELECT on table "public"."integration_projects" to "service_role";
grant TRIGGER on table "public"."integration_projects" to "service_role";
grant TRUNCATE on table "public"."integration_projects" to "service_role";
grant UPDATE on table "public"."integration_projects" to "service_role";
grant DELETE on table "public"."invoices" to "anon";
grant INSERT on table "public"."invoices" to "anon";
grant MAINTAIN on table "public"."invoices" to "anon";
grant REFERENCES on table "public"."invoices" to "anon";
grant SELECT on table "public"."invoices" to "anon";
grant TRIGGER on table "public"."invoices" to "anon";
grant TRUNCATE on table "public"."invoices" to "anon";
grant UPDATE on table "public"."invoices" to "anon";
grant DELETE on table "public"."invoices" to "authenticated";
grant INSERT on table "public"."invoices" to "authenticated";
grant MAINTAIN on table "public"."invoices" to "authenticated";
grant REFERENCES on table "public"."invoices" to "authenticated";
grant SELECT on table "public"."invoices" to "authenticated";
grant TRIGGER on table "public"."invoices" to "authenticated";
grant TRUNCATE on table "public"."invoices" to "authenticated";
grant UPDATE on table "public"."invoices" to "authenticated";
grant DELETE on table "public"."invoices" to "service_role";
grant INSERT on table "public"."invoices" to "service_role";
grant MAINTAIN on table "public"."invoices" to "service_role";
grant REFERENCES on table "public"."invoices" to "service_role";
grant SELECT on table "public"."invoices" to "service_role";
grant TRIGGER on table "public"."invoices" to "service_role";
grant TRUNCATE on table "public"."invoices" to "service_role";
grant UPDATE on table "public"."invoices" to "service_role";
grant DELETE on table "public"."issue_logs" to "anon";
grant INSERT on table "public"."issue_logs" to "anon";
grant MAINTAIN on table "public"."issue_logs" to "anon";
grant REFERENCES on table "public"."issue_logs" to "anon";
grant SELECT on table "public"."issue_logs" to "anon";
grant TRIGGER on table "public"."issue_logs" to "anon";
grant TRUNCATE on table "public"."issue_logs" to "anon";
grant UPDATE on table "public"."issue_logs" to "anon";
grant DELETE on table "public"."issue_logs" to "authenticated";
grant INSERT on table "public"."issue_logs" to "authenticated";
grant MAINTAIN on table "public"."issue_logs" to "authenticated";
grant REFERENCES on table "public"."issue_logs" to "authenticated";
grant SELECT on table "public"."issue_logs" to "authenticated";
grant TRIGGER on table "public"."issue_logs" to "authenticated";
grant TRUNCATE on table "public"."issue_logs" to "authenticated";
grant UPDATE on table "public"."issue_logs" to "authenticated";
grant DELETE on table "public"."issue_logs" to "service_role";
grant INSERT on table "public"."issue_logs" to "service_role";
grant MAINTAIN on table "public"."issue_logs" to "service_role";
grant REFERENCES on table "public"."issue_logs" to "service_role";
grant SELECT on table "public"."issue_logs" to "service_role";
grant TRIGGER on table "public"."issue_logs" to "service_role";
grant TRUNCATE on table "public"."issue_logs" to "service_role";
grant UPDATE on table "public"."issue_logs" to "service_role";
grant DELETE on table "public"."job_runs" to "anon";
grant INSERT on table "public"."job_runs" to "anon";
grant MAINTAIN on table "public"."job_runs" to "anon";
grant REFERENCES on table "public"."job_runs" to "anon";
grant SELECT on table "public"."job_runs" to "anon";
grant TRIGGER on table "public"."job_runs" to "anon";
grant TRUNCATE on table "public"."job_runs" to "anon";
grant UPDATE on table "public"."job_runs" to "anon";
grant DELETE on table "public"."job_runs" to "authenticated";
grant INSERT on table "public"."job_runs" to "authenticated";
grant MAINTAIN on table "public"."job_runs" to "authenticated";
grant REFERENCES on table "public"."job_runs" to "authenticated";
grant SELECT on table "public"."job_runs" to "authenticated";
grant TRIGGER on table "public"."job_runs" to "authenticated";
grant TRUNCATE on table "public"."job_runs" to "authenticated";
grant UPDATE on table "public"."job_runs" to "authenticated";
grant DELETE on table "public"."job_runs" to "service_role";
grant INSERT on table "public"."job_runs" to "service_role";
grant MAINTAIN on table "public"."job_runs" to "service_role";
grant REFERENCES on table "public"."job_runs" to "service_role";
grant SELECT on table "public"."job_runs" to "service_role";
grant TRIGGER on table "public"."job_runs" to "service_role";
grant TRUNCATE on table "public"."job_runs" to "service_role";
grant UPDATE on table "public"."job_runs" to "service_role";
grant DELETE on table "public"."kpi_snapshots" to "anon";
grant INSERT on table "public"."kpi_snapshots" to "anon";
grant MAINTAIN on table "public"."kpi_snapshots" to "anon";
grant REFERENCES on table "public"."kpi_snapshots" to "anon";
grant SELECT on table "public"."kpi_snapshots" to "anon";
grant TRIGGER on table "public"."kpi_snapshots" to "anon";
grant TRUNCATE on table "public"."kpi_snapshots" to "anon";
grant UPDATE on table "public"."kpi_snapshots" to "anon";
grant DELETE on table "public"."kpi_snapshots" to "authenticated";
grant INSERT on table "public"."kpi_snapshots" to "authenticated";
grant MAINTAIN on table "public"."kpi_snapshots" to "authenticated";
grant REFERENCES on table "public"."kpi_snapshots" to "authenticated";
grant SELECT on table "public"."kpi_snapshots" to "authenticated";
grant TRIGGER on table "public"."kpi_snapshots" to "authenticated";
grant TRUNCATE on table "public"."kpi_snapshots" to "authenticated";
grant UPDATE on table "public"."kpi_snapshots" to "authenticated";
grant DELETE on table "public"."kpi_snapshots" to "service_role";
grant INSERT on table "public"."kpi_snapshots" to "service_role";
grant MAINTAIN on table "public"."kpi_snapshots" to "service_role";
grant REFERENCES on table "public"."kpi_snapshots" to "service_role";
grant SELECT on table "public"."kpi_snapshots" to "service_role";
grant TRIGGER on table "public"."kpi_snapshots" to "service_role";
grant TRUNCATE on table "public"."kpi_snapshots" to "service_role";
grant UPDATE on table "public"."kpi_snapshots" to "service_role";
grant DELETE on table "public"."kpi_targets" to "anon";
grant INSERT on table "public"."kpi_targets" to "anon";
grant MAINTAIN on table "public"."kpi_targets" to "anon";
grant REFERENCES on table "public"."kpi_targets" to "anon";
grant SELECT on table "public"."kpi_targets" to "anon";
grant TRIGGER on table "public"."kpi_targets" to "anon";
grant TRUNCATE on table "public"."kpi_targets" to "anon";
grant UPDATE on table "public"."kpi_targets" to "anon";
grant DELETE on table "public"."kpi_targets" to "authenticated";
grant INSERT on table "public"."kpi_targets" to "authenticated";
grant MAINTAIN on table "public"."kpi_targets" to "authenticated";
grant REFERENCES on table "public"."kpi_targets" to "authenticated";
grant SELECT on table "public"."kpi_targets" to "authenticated";
grant TRIGGER on table "public"."kpi_targets" to "authenticated";
grant TRUNCATE on table "public"."kpi_targets" to "authenticated";
grant UPDATE on table "public"."kpi_targets" to "authenticated";
grant DELETE on table "public"."kpi_targets" to "service_role";
grant INSERT on table "public"."kpi_targets" to "service_role";
grant MAINTAIN on table "public"."kpi_targets" to "service_role";
grant REFERENCES on table "public"."kpi_targets" to "service_role";
grant SELECT on table "public"."kpi_targets" to "service_role";
grant TRIGGER on table "public"."kpi_targets" to "service_role";
grant TRUNCATE on table "public"."kpi_targets" to "service_role";
grant UPDATE on table "public"."kpi_targets" to "service_role";
grant DELETE on table "public"."live_test_hourly_logs" to "anon";
grant INSERT on table "public"."live_test_hourly_logs" to "anon";
grant MAINTAIN on table "public"."live_test_hourly_logs" to "anon";
grant REFERENCES on table "public"."live_test_hourly_logs" to "anon";
grant SELECT on table "public"."live_test_hourly_logs" to "anon";
grant TRIGGER on table "public"."live_test_hourly_logs" to "anon";
grant TRUNCATE on table "public"."live_test_hourly_logs" to "anon";
grant UPDATE on table "public"."live_test_hourly_logs" to "anon";
grant DELETE on table "public"."live_test_hourly_logs" to "authenticated";
grant INSERT on table "public"."live_test_hourly_logs" to "authenticated";
grant MAINTAIN on table "public"."live_test_hourly_logs" to "authenticated";
grant REFERENCES on table "public"."live_test_hourly_logs" to "authenticated";
grant SELECT on table "public"."live_test_hourly_logs" to "authenticated";
grant TRIGGER on table "public"."live_test_hourly_logs" to "authenticated";
grant TRUNCATE on table "public"."live_test_hourly_logs" to "authenticated";
grant UPDATE on table "public"."live_test_hourly_logs" to "authenticated";
grant DELETE on table "public"."live_test_hourly_logs" to "service_role";
grant INSERT on table "public"."live_test_hourly_logs" to "service_role";
grant MAINTAIN on table "public"."live_test_hourly_logs" to "service_role";
grant REFERENCES on table "public"."live_test_hourly_logs" to "service_role";
grant SELECT on table "public"."live_test_hourly_logs" to "service_role";
grant TRIGGER on table "public"."live_test_hourly_logs" to "service_role";
grant TRUNCATE on table "public"."live_test_hourly_logs" to "service_role";
grant UPDATE on table "public"."live_test_hourly_logs" to "service_role";
grant DELETE on table "public"."live_test_sessions" to "anon";
grant INSERT on table "public"."live_test_sessions" to "anon";
grant MAINTAIN on table "public"."live_test_sessions" to "anon";
grant REFERENCES on table "public"."live_test_sessions" to "anon";
grant SELECT on table "public"."live_test_sessions" to "anon";
grant TRIGGER on table "public"."live_test_sessions" to "anon";
grant TRUNCATE on table "public"."live_test_sessions" to "anon";
grant UPDATE on table "public"."live_test_sessions" to "anon";
grant DELETE on table "public"."live_test_sessions" to "authenticated";
grant INSERT on table "public"."live_test_sessions" to "authenticated";
grant MAINTAIN on table "public"."live_test_sessions" to "authenticated";
grant REFERENCES on table "public"."live_test_sessions" to "authenticated";
grant SELECT on table "public"."live_test_sessions" to "authenticated";
grant TRIGGER on table "public"."live_test_sessions" to "authenticated";
grant TRUNCATE on table "public"."live_test_sessions" to "authenticated";
grant UPDATE on table "public"."live_test_sessions" to "authenticated";
grant DELETE on table "public"."live_test_sessions" to "service_role";
grant INSERT on table "public"."live_test_sessions" to "service_role";
grant MAINTAIN on table "public"."live_test_sessions" to "service_role";
grant REFERENCES on table "public"."live_test_sessions" to "service_role";
grant SELECT on table "public"."live_test_sessions" to "service_role";
grant TRIGGER on table "public"."live_test_sessions" to "service_role";
grant TRUNCATE on table "public"."live_test_sessions" to "service_role";
grant UPDATE on table "public"."live_test_sessions" to "service_role";
grant DELETE on table "public"."management_action_queue" to "anon";
grant INSERT on table "public"."management_action_queue" to "anon";
grant MAINTAIN on table "public"."management_action_queue" to "anon";
grant REFERENCES on table "public"."management_action_queue" to "anon";
grant SELECT on table "public"."management_action_queue" to "anon";
grant TRIGGER on table "public"."management_action_queue" to "anon";
grant TRUNCATE on table "public"."management_action_queue" to "anon";
grant UPDATE on table "public"."management_action_queue" to "anon";
grant DELETE on table "public"."management_action_queue" to "authenticated";
grant INSERT on table "public"."management_action_queue" to "authenticated";
grant MAINTAIN on table "public"."management_action_queue" to "authenticated";
grant REFERENCES on table "public"."management_action_queue" to "authenticated";
grant SELECT on table "public"."management_action_queue" to "authenticated";
grant TRIGGER on table "public"."management_action_queue" to "authenticated";
grant TRUNCATE on table "public"."management_action_queue" to "authenticated";
grant UPDATE on table "public"."management_action_queue" to "authenticated";
grant DELETE on table "public"."management_action_queue" to "service_role";
grant INSERT on table "public"."management_action_queue" to "service_role";
grant MAINTAIN on table "public"."management_action_queue" to "service_role";
grant REFERENCES on table "public"."management_action_queue" to "service_role";
grant SELECT on table "public"."management_action_queue" to "service_role";
grant TRIGGER on table "public"."management_action_queue" to "service_role";
grant TRUNCATE on table "public"."management_action_queue" to "service_role";
grant UPDATE on table "public"."management_action_queue" to "service_role";
grant DELETE on table "public"."media_assets" to "anon";
grant INSERT on table "public"."media_assets" to "anon";
grant MAINTAIN on table "public"."media_assets" to "anon";
grant REFERENCES on table "public"."media_assets" to "anon";
grant SELECT on table "public"."media_assets" to "anon";
grant TRIGGER on table "public"."media_assets" to "anon";
grant TRUNCATE on table "public"."media_assets" to "anon";
grant UPDATE on table "public"."media_assets" to "anon";
grant DELETE on table "public"."media_assets" to "authenticated";
grant INSERT on table "public"."media_assets" to "authenticated";
grant MAINTAIN on table "public"."media_assets" to "authenticated";
grant REFERENCES on table "public"."media_assets" to "authenticated";
grant SELECT on table "public"."media_assets" to "authenticated";
grant TRIGGER on table "public"."media_assets" to "authenticated";
grant TRUNCATE on table "public"."media_assets" to "authenticated";
grant UPDATE on table "public"."media_assets" to "authenticated";
grant DELETE on table "public"."media_assets" to "service_role";
grant INSERT on table "public"."media_assets" to "service_role";
grant MAINTAIN on table "public"."media_assets" to "service_role";
grant REFERENCES on table "public"."media_assets" to "service_role";
grant SELECT on table "public"."media_assets" to "service_role";
grant TRIGGER on table "public"."media_assets" to "service_role";
grant TRUNCATE on table "public"."media_assets" to "service_role";
grant UPDATE on table "public"."media_assets" to "service_role";
grant DELETE on table "public"."media_budget_allocation_tiers" to "anon";
grant INSERT on table "public"."media_budget_allocation_tiers" to "anon";
grant MAINTAIN on table "public"."media_budget_allocation_tiers" to "anon";
grant REFERENCES on table "public"."media_budget_allocation_tiers" to "anon";
grant SELECT on table "public"."media_budget_allocation_tiers" to "anon";
grant TRIGGER on table "public"."media_budget_allocation_tiers" to "anon";
grant TRUNCATE on table "public"."media_budget_allocation_tiers" to "anon";
grant UPDATE on table "public"."media_budget_allocation_tiers" to "anon";
grant DELETE on table "public"."media_budget_allocation_tiers" to "authenticated";
grant INSERT on table "public"."media_budget_allocation_tiers" to "authenticated";
grant MAINTAIN on table "public"."media_budget_allocation_tiers" to "authenticated";
grant REFERENCES on table "public"."media_budget_allocation_tiers" to "authenticated";
grant SELECT on table "public"."media_budget_allocation_tiers" to "authenticated";
grant TRIGGER on table "public"."media_budget_allocation_tiers" to "authenticated";
grant TRUNCATE on table "public"."media_budget_allocation_tiers" to "authenticated";
grant UPDATE on table "public"."media_budget_allocation_tiers" to "authenticated";
grant DELETE on table "public"."media_budget_allocation_tiers" to "service_role";
grant INSERT on table "public"."media_budget_allocation_tiers" to "service_role";
grant MAINTAIN on table "public"."media_budget_allocation_tiers" to "service_role";
grant REFERENCES on table "public"."media_budget_allocation_tiers" to "service_role";
grant SELECT on table "public"."media_budget_allocation_tiers" to "service_role";
grant TRIGGER on table "public"."media_budget_allocation_tiers" to "service_role";
grant TRUNCATE on table "public"."media_budget_allocation_tiers" to "service_role";
grant UPDATE on table "public"."media_budget_allocation_tiers" to "service_role";
grant DELETE on table "public"."media_budget_evaluations" to "anon";
grant INSERT on table "public"."media_budget_evaluations" to "anon";
grant MAINTAIN on table "public"."media_budget_evaluations" to "anon";
grant REFERENCES on table "public"."media_budget_evaluations" to "anon";
grant SELECT on table "public"."media_budget_evaluations" to "anon";
grant TRIGGER on table "public"."media_budget_evaluations" to "anon";
grant TRUNCATE on table "public"."media_budget_evaluations" to "anon";
grant UPDATE on table "public"."media_budget_evaluations" to "anon";
grant DELETE on table "public"."media_budget_evaluations" to "authenticated";
grant INSERT on table "public"."media_budget_evaluations" to "authenticated";
grant MAINTAIN on table "public"."media_budget_evaluations" to "authenticated";
grant REFERENCES on table "public"."media_budget_evaluations" to "authenticated";
grant SELECT on table "public"."media_budget_evaluations" to "authenticated";
grant TRIGGER on table "public"."media_budget_evaluations" to "authenticated";
grant TRUNCATE on table "public"."media_budget_evaluations" to "authenticated";
grant UPDATE on table "public"."media_budget_evaluations" to "authenticated";
grant DELETE on table "public"."media_budget_evaluations" to "service_role";
grant INSERT on table "public"."media_budget_evaluations" to "service_role";
grant MAINTAIN on table "public"."media_budget_evaluations" to "service_role";
grant REFERENCES on table "public"."media_budget_evaluations" to "service_role";
grant SELECT on table "public"."media_budget_evaluations" to "service_role";
grant TRIGGER on table "public"."media_budget_evaluations" to "service_role";
grant TRUNCATE on table "public"."media_budget_evaluations" to "service_role";
grant UPDATE on table "public"."media_budget_evaluations" to "service_role";
grant DELETE on table "public"."media_budget_pools" to "anon";
grant INSERT on table "public"."media_budget_pools" to "anon";
grant MAINTAIN on table "public"."media_budget_pools" to "anon";
grant REFERENCES on table "public"."media_budget_pools" to "anon";
grant SELECT on table "public"."media_budget_pools" to "anon";
grant TRIGGER on table "public"."media_budget_pools" to "anon";
grant TRUNCATE on table "public"."media_budget_pools" to "anon";
grant UPDATE on table "public"."media_budget_pools" to "anon";
grant DELETE on table "public"."media_budget_pools" to "authenticated";
grant INSERT on table "public"."media_budget_pools" to "authenticated";
grant MAINTAIN on table "public"."media_budget_pools" to "authenticated";
grant REFERENCES on table "public"."media_budget_pools" to "authenticated";
grant SELECT on table "public"."media_budget_pools" to "authenticated";
grant TRIGGER on table "public"."media_budget_pools" to "authenticated";
grant TRUNCATE on table "public"."media_budget_pools" to "authenticated";
grant UPDATE on table "public"."media_budget_pools" to "authenticated";
grant DELETE on table "public"."media_budget_pools" to "service_role";
grant INSERT on table "public"."media_budget_pools" to "service_role";
grant MAINTAIN on table "public"."media_budget_pools" to "service_role";
grant REFERENCES on table "public"."media_budget_pools" to "service_role";
grant SELECT on table "public"."media_budget_pools" to "service_role";
grant TRIGGER on table "public"."media_budget_pools" to "service_role";
grant TRUNCATE on table "public"."media_budget_pools" to "service_role";
grant UPDATE on table "public"."media_budget_pools" to "service_role";
grant DELETE on table "public"."media_compliance" to "anon";
grant INSERT on table "public"."media_compliance" to "anon";
grant MAINTAIN on table "public"."media_compliance" to "anon";
grant REFERENCES on table "public"."media_compliance" to "anon";
grant SELECT on table "public"."media_compliance" to "anon";
grant TRIGGER on table "public"."media_compliance" to "anon";
grant TRUNCATE on table "public"."media_compliance" to "anon";
grant UPDATE on table "public"."media_compliance" to "anon";
grant DELETE on table "public"."media_compliance" to "authenticated";
grant INSERT on table "public"."media_compliance" to "authenticated";
grant MAINTAIN on table "public"."media_compliance" to "authenticated";
grant REFERENCES on table "public"."media_compliance" to "authenticated";
grant SELECT on table "public"."media_compliance" to "authenticated";
grant TRIGGER on table "public"."media_compliance" to "authenticated";
grant TRUNCATE on table "public"."media_compliance" to "authenticated";
grant UPDATE on table "public"."media_compliance" to "authenticated";
grant DELETE on table "public"."media_compliance" to "service_role";
grant INSERT on table "public"."media_compliance" to "service_role";
grant MAINTAIN on table "public"."media_compliance" to "service_role";
grant REFERENCES on table "public"."media_compliance" to "service_role";
grant SELECT on table "public"."media_compliance" to "service_role";
grant TRIGGER on table "public"."media_compliance" to "service_role";
grant TRUNCATE on table "public"."media_compliance" to "service_role";
grant UPDATE on table "public"."media_compliance" to "service_role";
grant DELETE on table "public"."media_contacts" to "anon";
grant INSERT on table "public"."media_contacts" to "anon";
grant MAINTAIN on table "public"."media_contacts" to "anon";
grant REFERENCES on table "public"."media_contacts" to "anon";
grant SELECT on table "public"."media_contacts" to "anon";
grant TRIGGER on table "public"."media_contacts" to "anon";
grant TRUNCATE on table "public"."media_contacts" to "anon";
grant UPDATE on table "public"."media_contacts" to "anon";
grant DELETE on table "public"."media_contacts" to "authenticated";
grant INSERT on table "public"."media_contacts" to "authenticated";
grant MAINTAIN on table "public"."media_contacts" to "authenticated";
grant REFERENCES on table "public"."media_contacts" to "authenticated";
grant SELECT on table "public"."media_contacts" to "authenticated";
grant TRIGGER on table "public"."media_contacts" to "authenticated";
grant TRUNCATE on table "public"."media_contacts" to "authenticated";
grant UPDATE on table "public"."media_contacts" to "authenticated";
grant DELETE on table "public"."media_contacts" to "service_role";
grant INSERT on table "public"."media_contacts" to "service_role";
grant MAINTAIN on table "public"."media_contacts" to "service_role";
grant REFERENCES on table "public"."media_contacts" to "service_role";
grant SELECT on table "public"."media_contacts" to "service_role";
grant TRIGGER on table "public"."media_contacts" to "service_role";
grant TRUNCATE on table "public"."media_contacts" to "service_role";
grant UPDATE on table "public"."media_contacts" to "service_role";
grant DELETE on table "public"."media_contract_attachments" to "anon";
grant INSERT on table "public"."media_contract_attachments" to "anon";
grant MAINTAIN on table "public"."media_contract_attachments" to "anon";
grant REFERENCES on table "public"."media_contract_attachments" to "anon";
grant SELECT on table "public"."media_contract_attachments" to "anon";
grant TRIGGER on table "public"."media_contract_attachments" to "anon";
grant TRUNCATE on table "public"."media_contract_attachments" to "anon";
grant UPDATE on table "public"."media_contract_attachments" to "anon";
grant DELETE on table "public"."media_contract_attachments" to "authenticated";
grant INSERT on table "public"."media_contract_attachments" to "authenticated";
grant MAINTAIN on table "public"."media_contract_attachments" to "authenticated";
grant REFERENCES on table "public"."media_contract_attachments" to "authenticated";
grant SELECT on table "public"."media_contract_attachments" to "authenticated";
grant TRIGGER on table "public"."media_contract_attachments" to "authenticated";
grant TRUNCATE on table "public"."media_contract_attachments" to "authenticated";
grant UPDATE on table "public"."media_contract_attachments" to "authenticated";
grant DELETE on table "public"."media_contract_attachments" to "service_role";
grant INSERT on table "public"."media_contract_attachments" to "service_role";
grant MAINTAIN on table "public"."media_contract_attachments" to "service_role";
grant REFERENCES on table "public"."media_contract_attachments" to "service_role";
grant SELECT on table "public"."media_contract_attachments" to "service_role";
grant TRIGGER on table "public"."media_contract_attachments" to "service_role";
grant TRUNCATE on table "public"."media_contract_attachments" to "service_role";
grant UPDATE on table "public"."media_contract_attachments" to "service_role";
grant DELETE on table "public"."media_contract_orders" to "anon";
grant INSERT on table "public"."media_contract_orders" to "anon";
grant MAINTAIN on table "public"."media_contract_orders" to "anon";
grant REFERENCES on table "public"."media_contract_orders" to "anon";
grant SELECT on table "public"."media_contract_orders" to "anon";
grant TRIGGER on table "public"."media_contract_orders" to "anon";
grant TRUNCATE on table "public"."media_contract_orders" to "anon";
grant UPDATE on table "public"."media_contract_orders" to "anon";
grant DELETE on table "public"."media_contract_orders" to "authenticated";
grant INSERT on table "public"."media_contract_orders" to "authenticated";
grant MAINTAIN on table "public"."media_contract_orders" to "authenticated";
grant REFERENCES on table "public"."media_contract_orders" to "authenticated";
grant SELECT on table "public"."media_contract_orders" to "authenticated";
grant TRIGGER on table "public"."media_contract_orders" to "authenticated";
grant TRUNCATE on table "public"."media_contract_orders" to "authenticated";
grant UPDATE on table "public"."media_contract_orders" to "authenticated";
grant DELETE on table "public"."media_contract_orders" to "service_role";
grant INSERT on table "public"."media_contract_orders" to "service_role";
grant MAINTAIN on table "public"."media_contract_orders" to "service_role";
grant REFERENCES on table "public"."media_contract_orders" to "service_role";
grant SELECT on table "public"."media_contract_orders" to "service_role";
grant TRIGGER on table "public"."media_contract_orders" to "service_role";
grant TRUNCATE on table "public"."media_contract_orders" to "service_role";
grant UPDATE on table "public"."media_contract_orders" to "service_role";
grant DELETE on table "public"."media_contracts" to "anon";
grant INSERT on table "public"."media_contracts" to "anon";
grant MAINTAIN on table "public"."media_contracts" to "anon";
grant REFERENCES on table "public"."media_contracts" to "anon";
grant SELECT on table "public"."media_contracts" to "anon";
grant TRIGGER on table "public"."media_contracts" to "anon";
grant TRUNCATE on table "public"."media_contracts" to "anon";
grant UPDATE on table "public"."media_contracts" to "anon";
grant DELETE on table "public"."media_contracts" to "authenticated";
grant INSERT on table "public"."media_contracts" to "authenticated";
grant MAINTAIN on table "public"."media_contracts" to "authenticated";
grant REFERENCES on table "public"."media_contracts" to "authenticated";
grant SELECT on table "public"."media_contracts" to "authenticated";
grant TRIGGER on table "public"."media_contracts" to "authenticated";
grant TRUNCATE on table "public"."media_contracts" to "authenticated";
grant UPDATE on table "public"."media_contracts" to "authenticated";
grant DELETE on table "public"."media_contracts" to "service_role";
grant INSERT on table "public"."media_contracts" to "service_role";
grant MAINTAIN on table "public"."media_contracts" to "service_role";
grant REFERENCES on table "public"."media_contracts" to "service_role";
grant SELECT on table "public"."media_contracts" to "service_role";
grant TRIGGER on table "public"."media_contracts" to "service_role";
grant TRUNCATE on table "public"."media_contracts" to "service_role";
grant UPDATE on table "public"."media_contracts" to "service_role";
grant DELETE on table "public"."media_ecosystem_conversion_logs" to "anon";
grant INSERT on table "public"."media_ecosystem_conversion_logs" to "anon";
grant MAINTAIN on table "public"."media_ecosystem_conversion_logs" to "anon";
grant REFERENCES on table "public"."media_ecosystem_conversion_logs" to "anon";
grant SELECT on table "public"."media_ecosystem_conversion_logs" to "anon";
grant TRIGGER on table "public"."media_ecosystem_conversion_logs" to "anon";
grant TRUNCATE on table "public"."media_ecosystem_conversion_logs" to "anon";
grant UPDATE on table "public"."media_ecosystem_conversion_logs" to "anon";
grant DELETE on table "public"."media_ecosystem_conversion_logs" to "authenticated";
grant INSERT on table "public"."media_ecosystem_conversion_logs" to "authenticated";
grant MAINTAIN on table "public"."media_ecosystem_conversion_logs" to "authenticated";
grant REFERENCES on table "public"."media_ecosystem_conversion_logs" to "authenticated";
grant SELECT on table "public"."media_ecosystem_conversion_logs" to "authenticated";
grant TRIGGER on table "public"."media_ecosystem_conversion_logs" to "authenticated";
grant TRUNCATE on table "public"."media_ecosystem_conversion_logs" to "authenticated";
grant UPDATE on table "public"."media_ecosystem_conversion_logs" to "authenticated";
grant DELETE on table "public"."media_ecosystem_conversion_logs" to "service_role";
grant INSERT on table "public"."media_ecosystem_conversion_logs" to "service_role";
grant MAINTAIN on table "public"."media_ecosystem_conversion_logs" to "service_role";
grant REFERENCES on table "public"."media_ecosystem_conversion_logs" to "service_role";
grant SELECT on table "public"."media_ecosystem_conversion_logs" to "service_role";
grant TRIGGER on table "public"."media_ecosystem_conversion_logs" to "service_role";
grant TRUNCATE on table "public"."media_ecosystem_conversion_logs" to "service_role";
grant UPDATE on table "public"."media_ecosystem_conversion_logs" to "service_role";
grant DELETE on table "public"."media_ecosystem_opportunities" to "anon";
grant INSERT on table "public"."media_ecosystem_opportunities" to "anon";
grant MAINTAIN on table "public"."media_ecosystem_opportunities" to "anon";
grant REFERENCES on table "public"."media_ecosystem_opportunities" to "anon";
grant SELECT on table "public"."media_ecosystem_opportunities" to "anon";
grant TRIGGER on table "public"."media_ecosystem_opportunities" to "anon";
grant TRUNCATE on table "public"."media_ecosystem_opportunities" to "anon";
grant UPDATE on table "public"."media_ecosystem_opportunities" to "anon";
grant DELETE on table "public"."media_ecosystem_opportunities" to "authenticated";
grant INSERT on table "public"."media_ecosystem_opportunities" to "authenticated";
grant MAINTAIN on table "public"."media_ecosystem_opportunities" to "authenticated";
grant REFERENCES on table "public"."media_ecosystem_opportunities" to "authenticated";
grant SELECT on table "public"."media_ecosystem_opportunities" to "authenticated";
grant TRIGGER on table "public"."media_ecosystem_opportunities" to "authenticated";
grant TRUNCATE on table "public"."media_ecosystem_opportunities" to "authenticated";
grant UPDATE on table "public"."media_ecosystem_opportunities" to "authenticated";
grant DELETE on table "public"."media_ecosystem_opportunities" to "service_role";
grant INSERT on table "public"."media_ecosystem_opportunities" to "service_role";
grant MAINTAIN on table "public"."media_ecosystem_opportunities" to "service_role";
grant REFERENCES on table "public"."media_ecosystem_opportunities" to "service_role";
grant SELECT on table "public"."media_ecosystem_opportunities" to "service_role";
grant TRIGGER on table "public"."media_ecosystem_opportunities" to "service_role";
grant TRUNCATE on table "public"."media_ecosystem_opportunities" to "service_role";
grant UPDATE on table "public"."media_ecosystem_opportunities" to "service_role";
grant DELETE on table "public"."media_ecosystem_outreach_activities" to "anon";
grant INSERT on table "public"."media_ecosystem_outreach_activities" to "anon";
grant MAINTAIN on table "public"."media_ecosystem_outreach_activities" to "anon";
grant REFERENCES on table "public"."media_ecosystem_outreach_activities" to "anon";
grant SELECT on table "public"."media_ecosystem_outreach_activities" to "anon";
grant TRIGGER on table "public"."media_ecosystem_outreach_activities" to "anon";
grant TRUNCATE on table "public"."media_ecosystem_outreach_activities" to "anon";
grant UPDATE on table "public"."media_ecosystem_outreach_activities" to "anon";
grant DELETE on table "public"."media_ecosystem_outreach_activities" to "authenticated";
grant INSERT on table "public"."media_ecosystem_outreach_activities" to "authenticated";
grant MAINTAIN on table "public"."media_ecosystem_outreach_activities" to "authenticated";
grant REFERENCES on table "public"."media_ecosystem_outreach_activities" to "authenticated";
grant SELECT on table "public"."media_ecosystem_outreach_activities" to "authenticated";
grant TRIGGER on table "public"."media_ecosystem_outreach_activities" to "authenticated";
grant TRUNCATE on table "public"."media_ecosystem_outreach_activities" to "authenticated";
grant UPDATE on table "public"."media_ecosystem_outreach_activities" to "authenticated";
grant DELETE on table "public"."media_ecosystem_outreach_activities" to "service_role";
grant INSERT on table "public"."media_ecosystem_outreach_activities" to "service_role";
grant MAINTAIN on table "public"."media_ecosystem_outreach_activities" to "service_role";
grant REFERENCES on table "public"."media_ecosystem_outreach_activities" to "service_role";
grant SELECT on table "public"."media_ecosystem_outreach_activities" to "service_role";
grant TRIGGER on table "public"."media_ecosystem_outreach_activities" to "service_role";
grant TRUNCATE on table "public"."media_ecosystem_outreach_activities" to "service_role";
grant UPDATE on table "public"."media_ecosystem_outreach_activities" to "service_role";
grant DELETE on table "public"."media_ecosystem_segments" to "anon";
grant INSERT on table "public"."media_ecosystem_segments" to "anon";
grant MAINTAIN on table "public"."media_ecosystem_segments" to "anon";
grant REFERENCES on table "public"."media_ecosystem_segments" to "anon";
grant SELECT on table "public"."media_ecosystem_segments" to "anon";
grant TRIGGER on table "public"."media_ecosystem_segments" to "anon";
grant TRUNCATE on table "public"."media_ecosystem_segments" to "anon";
grant UPDATE on table "public"."media_ecosystem_segments" to "anon";
grant DELETE on table "public"."media_ecosystem_segments" to "authenticated";
grant INSERT on table "public"."media_ecosystem_segments" to "authenticated";
grant MAINTAIN on table "public"."media_ecosystem_segments" to "authenticated";
grant REFERENCES on table "public"."media_ecosystem_segments" to "authenticated";
grant SELECT on table "public"."media_ecosystem_segments" to "authenticated";
grant TRIGGER on table "public"."media_ecosystem_segments" to "authenticated";
grant TRUNCATE on table "public"."media_ecosystem_segments" to "authenticated";
grant UPDATE on table "public"."media_ecosystem_segments" to "authenticated";
grant DELETE on table "public"."media_ecosystem_segments" to "service_role";
grant INSERT on table "public"."media_ecosystem_segments" to "service_role";
grant MAINTAIN on table "public"."media_ecosystem_segments" to "service_role";
grant REFERENCES on table "public"."media_ecosystem_segments" to "service_role";
grant SELECT on table "public"."media_ecosystem_segments" to "service_role";
grant TRIGGER on table "public"."media_ecosystem_segments" to "service_role";
grant TRUNCATE on table "public"."media_ecosystem_segments" to "service_role";
grant UPDATE on table "public"."media_ecosystem_segments" to "service_role";
grant DELETE on table "public"."media_followup_logs" to "anon";
grant INSERT on table "public"."media_followup_logs" to "anon";
grant MAINTAIN on table "public"."media_followup_logs" to "anon";
grant REFERENCES on table "public"."media_followup_logs" to "anon";
grant SELECT on table "public"."media_followup_logs" to "anon";
grant TRIGGER on table "public"."media_followup_logs" to "anon";
grant TRUNCATE on table "public"."media_followup_logs" to "anon";
grant UPDATE on table "public"."media_followup_logs" to "anon";
grant DELETE on table "public"."media_followup_logs" to "authenticated";
grant INSERT on table "public"."media_followup_logs" to "authenticated";
grant MAINTAIN on table "public"."media_followup_logs" to "authenticated";
grant REFERENCES on table "public"."media_followup_logs" to "authenticated";
grant SELECT on table "public"."media_followup_logs" to "authenticated";
grant TRIGGER on table "public"."media_followup_logs" to "authenticated";
grant TRUNCATE on table "public"."media_followup_logs" to "authenticated";
grant UPDATE on table "public"."media_followup_logs" to "authenticated";
grant DELETE on table "public"."media_followup_logs" to "service_role";
grant INSERT on table "public"."media_followup_logs" to "service_role";
grant MAINTAIN on table "public"."media_followup_logs" to "service_role";
grant REFERENCES on table "public"."media_followup_logs" to "service_role";
grant SELECT on table "public"."media_followup_logs" to "service_role";
grant TRIGGER on table "public"."media_followup_logs" to "service_role";
grant TRUNCATE on table "public"."media_followup_logs" to "service_role";
grant UPDATE on table "public"."media_followup_logs" to "service_role";
grant DELETE on table "public"."media_inventory" to "anon";
grant INSERT on table "public"."media_inventory" to "anon";
grant MAINTAIN on table "public"."media_inventory" to "anon";
grant REFERENCES on table "public"."media_inventory" to "anon";
grant SELECT on table "public"."media_inventory" to "anon";
grant TRIGGER on table "public"."media_inventory" to "anon";
grant TRUNCATE on table "public"."media_inventory" to "anon";
grant UPDATE on table "public"."media_inventory" to "anon";
grant DELETE on table "public"."media_inventory" to "authenticated";
grant INSERT on table "public"."media_inventory" to "authenticated";
grant MAINTAIN on table "public"."media_inventory" to "authenticated";
grant REFERENCES on table "public"."media_inventory" to "authenticated";
grant SELECT on table "public"."media_inventory" to "authenticated";
grant TRIGGER on table "public"."media_inventory" to "authenticated";
grant TRUNCATE on table "public"."media_inventory" to "authenticated";
grant UPDATE on table "public"."media_inventory" to "authenticated";
grant DELETE on table "public"."media_inventory" to "service_role";
grant INSERT on table "public"."media_inventory" to "service_role";
grant MAINTAIN on table "public"."media_inventory" to "service_role";
grant REFERENCES on table "public"."media_inventory" to "service_role";
grant SELECT on table "public"."media_inventory" to "service_role";
grant TRIGGER on table "public"."media_inventory" to "service_role";
grant TRUNCATE on table "public"."media_inventory" to "service_role";
grant UPDATE on table "public"."media_inventory" to "service_role";
grant DELETE on table "public"."media_lead_inbox" to "anon";
grant INSERT on table "public"."media_lead_inbox" to "anon";
grant MAINTAIN on table "public"."media_lead_inbox" to "anon";
grant REFERENCES on table "public"."media_lead_inbox" to "anon";
grant SELECT on table "public"."media_lead_inbox" to "anon";
grant TRIGGER on table "public"."media_lead_inbox" to "anon";
grant TRUNCATE on table "public"."media_lead_inbox" to "anon";
grant UPDATE on table "public"."media_lead_inbox" to "anon";
grant DELETE on table "public"."media_lead_inbox" to "authenticated";
grant INSERT on table "public"."media_lead_inbox" to "authenticated";
grant MAINTAIN on table "public"."media_lead_inbox" to "authenticated";
grant REFERENCES on table "public"."media_lead_inbox" to "authenticated";
grant SELECT on table "public"."media_lead_inbox" to "authenticated";
grant TRIGGER on table "public"."media_lead_inbox" to "authenticated";
grant TRUNCATE on table "public"."media_lead_inbox" to "authenticated";
grant UPDATE on table "public"."media_lead_inbox" to "authenticated";
grant DELETE on table "public"."media_lead_inbox" to "service_role";
grant INSERT on table "public"."media_lead_inbox" to "service_role";
grant MAINTAIN on table "public"."media_lead_inbox" to "service_role";
grant REFERENCES on table "public"."media_lead_inbox" to "service_role";
grant SELECT on table "public"."media_lead_inbox" to "service_role";
grant TRIGGER on table "public"."media_lead_inbox" to "service_role";
grant TRUNCATE on table "public"."media_lead_inbox" to "service_role";
grant UPDATE on table "public"."media_lead_inbox" to "service_role";
grant DELETE on table "public"."media_master" to "anon";
grant INSERT on table "public"."media_master" to "anon";
grant MAINTAIN on table "public"."media_master" to "anon";
grant REFERENCES on table "public"."media_master" to "anon";
grant SELECT on table "public"."media_master" to "anon";
grant TRIGGER on table "public"."media_master" to "anon";
grant TRUNCATE on table "public"."media_master" to "anon";
grant UPDATE on table "public"."media_master" to "anon";
grant DELETE on table "public"."media_master" to "authenticated";
grant INSERT on table "public"."media_master" to "authenticated";
grant MAINTAIN on table "public"."media_master" to "authenticated";
grant REFERENCES on table "public"."media_master" to "authenticated";
grant SELECT on table "public"."media_master" to "authenticated";
grant TRIGGER on table "public"."media_master" to "authenticated";
grant TRUNCATE on table "public"."media_master" to "authenticated";
grant UPDATE on table "public"."media_master" to "authenticated";
grant DELETE on table "public"."media_master" to "service_role";
grant INSERT on table "public"."media_master" to "service_role";
grant MAINTAIN on table "public"."media_master" to "service_role";
grant REFERENCES on table "public"."media_master" to "service_role";
grant SELECT on table "public"."media_master" to "service_role";
grant TRIGGER on table "public"."media_master" to "service_role";
grant TRUNCATE on table "public"."media_master" to "service_role";
grant UPDATE on table "public"."media_master" to "service_role";
grant DELETE on table "public"."media_monitoring_alerts" to "anon";
grant INSERT on table "public"."media_monitoring_alerts" to "anon";
grant MAINTAIN on table "public"."media_monitoring_alerts" to "anon";
grant REFERENCES on table "public"."media_monitoring_alerts" to "anon";
grant SELECT on table "public"."media_monitoring_alerts" to "anon";
grant TRIGGER on table "public"."media_monitoring_alerts" to "anon";
grant TRUNCATE on table "public"."media_monitoring_alerts" to "anon";
grant UPDATE on table "public"."media_monitoring_alerts" to "anon";
grant DELETE on table "public"."media_monitoring_alerts" to "authenticated";
grant INSERT on table "public"."media_monitoring_alerts" to "authenticated";
grant MAINTAIN on table "public"."media_monitoring_alerts" to "authenticated";
grant REFERENCES on table "public"."media_monitoring_alerts" to "authenticated";
grant SELECT on table "public"."media_monitoring_alerts" to "authenticated";
grant TRIGGER on table "public"."media_monitoring_alerts" to "authenticated";
grant TRUNCATE on table "public"."media_monitoring_alerts" to "authenticated";
grant UPDATE on table "public"."media_monitoring_alerts" to "authenticated";
grant DELETE on table "public"."media_monitoring_alerts" to "service_role";
grant INSERT on table "public"."media_monitoring_alerts" to "service_role";
grant MAINTAIN on table "public"."media_monitoring_alerts" to "service_role";
grant REFERENCES on table "public"."media_monitoring_alerts" to "service_role";
grant SELECT on table "public"."media_monitoring_alerts" to "service_role";
grant TRIGGER on table "public"."media_monitoring_alerts" to "service_role";
grant TRUNCATE on table "public"."media_monitoring_alerts" to "service_role";
grant UPDATE on table "public"."media_monitoring_alerts" to "service_role";
grant DELETE on table "public"."media_onboarding_projects" to "anon";
grant INSERT on table "public"."media_onboarding_projects" to "anon";
grant MAINTAIN on table "public"."media_onboarding_projects" to "anon";
grant REFERENCES on table "public"."media_onboarding_projects" to "anon";
grant SELECT on table "public"."media_onboarding_projects" to "anon";
grant TRIGGER on table "public"."media_onboarding_projects" to "anon";
grant TRUNCATE on table "public"."media_onboarding_projects" to "anon";
grant UPDATE on table "public"."media_onboarding_projects" to "anon";
grant DELETE on table "public"."media_onboarding_projects" to "authenticated";
grant INSERT on table "public"."media_onboarding_projects" to "authenticated";
grant MAINTAIN on table "public"."media_onboarding_projects" to "authenticated";
grant REFERENCES on table "public"."media_onboarding_projects" to "authenticated";
grant SELECT on table "public"."media_onboarding_projects" to "authenticated";
grant TRIGGER on table "public"."media_onboarding_projects" to "authenticated";
grant TRUNCATE on table "public"."media_onboarding_projects" to "authenticated";
grant UPDATE on table "public"."media_onboarding_projects" to "authenticated";
grant DELETE on table "public"."media_onboarding_projects" to "service_role";
grant INSERT on table "public"."media_onboarding_projects" to "service_role";
grant MAINTAIN on table "public"."media_onboarding_projects" to "service_role";
grant REFERENCES on table "public"."media_onboarding_projects" to "service_role";
grant SELECT on table "public"."media_onboarding_projects" to "service_role";
grant TRIGGER on table "public"."media_onboarding_projects" to "service_role";
grant TRUNCATE on table "public"."media_onboarding_projects" to "service_role";
grant UPDATE on table "public"."media_onboarding_projects" to "service_role";
grant DELETE on table "public"."media_onboarding_stage_gates" to "anon";
grant INSERT on table "public"."media_onboarding_stage_gates" to "anon";
grant MAINTAIN on table "public"."media_onboarding_stage_gates" to "anon";
grant REFERENCES on table "public"."media_onboarding_stage_gates" to "anon";
grant SELECT on table "public"."media_onboarding_stage_gates" to "anon";
grant TRIGGER on table "public"."media_onboarding_stage_gates" to "anon";
grant TRUNCATE on table "public"."media_onboarding_stage_gates" to "anon";
grant UPDATE on table "public"."media_onboarding_stage_gates" to "anon";
grant DELETE on table "public"."media_onboarding_stage_gates" to "authenticated";
grant INSERT on table "public"."media_onboarding_stage_gates" to "authenticated";
grant MAINTAIN on table "public"."media_onboarding_stage_gates" to "authenticated";
grant REFERENCES on table "public"."media_onboarding_stage_gates" to "authenticated";
grant SELECT on table "public"."media_onboarding_stage_gates" to "authenticated";
grant TRIGGER on table "public"."media_onboarding_stage_gates" to "authenticated";
grant TRUNCATE on table "public"."media_onboarding_stage_gates" to "authenticated";
grant UPDATE on table "public"."media_onboarding_stage_gates" to "authenticated";
grant DELETE on table "public"."media_onboarding_stage_gates" to "service_role";
grant INSERT on table "public"."media_onboarding_stage_gates" to "service_role";
grant MAINTAIN on table "public"."media_onboarding_stage_gates" to "service_role";
grant REFERENCES on table "public"."media_onboarding_stage_gates" to "service_role";
grant SELECT on table "public"."media_onboarding_stage_gates" to "service_role";
grant TRIGGER on table "public"."media_onboarding_stage_gates" to "service_role";
grant TRUNCATE on table "public"."media_onboarding_stage_gates" to "service_role";
grant UPDATE on table "public"."media_onboarding_stage_gates" to "service_role";
grant DELETE on table "public"."media_package_rate_cards" to "anon";
grant INSERT on table "public"."media_package_rate_cards" to "anon";
grant MAINTAIN on table "public"."media_package_rate_cards" to "anon";
grant REFERENCES on table "public"."media_package_rate_cards" to "anon";
grant SELECT on table "public"."media_package_rate_cards" to "anon";
grant TRIGGER on table "public"."media_package_rate_cards" to "anon";
grant TRUNCATE on table "public"."media_package_rate_cards" to "anon";
grant UPDATE on table "public"."media_package_rate_cards" to "anon";
grant DELETE on table "public"."media_package_rate_cards" to "authenticated";
grant INSERT on table "public"."media_package_rate_cards" to "authenticated";
grant MAINTAIN on table "public"."media_package_rate_cards" to "authenticated";
grant REFERENCES on table "public"."media_package_rate_cards" to "authenticated";
grant SELECT on table "public"."media_package_rate_cards" to "authenticated";
grant TRIGGER on table "public"."media_package_rate_cards" to "authenticated";
grant TRUNCATE on table "public"."media_package_rate_cards" to "authenticated";
grant UPDATE on table "public"."media_package_rate_cards" to "authenticated";
grant DELETE on table "public"."media_package_rate_cards" to "service_role";
grant INSERT on table "public"."media_package_rate_cards" to "service_role";
grant MAINTAIN on table "public"."media_package_rate_cards" to "service_role";
grant REFERENCES on table "public"."media_package_rate_cards" to "service_role";
grant SELECT on table "public"."media_package_rate_cards" to "service_role";
grant TRIGGER on table "public"."media_package_rate_cards" to "service_role";
grant TRUNCATE on table "public"."media_package_rate_cards" to "service_role";
grant UPDATE on table "public"."media_package_rate_cards" to "service_role";
grant DELETE on table "public"."media_payables" to "anon";
grant INSERT on table "public"."media_payables" to "anon";
grant MAINTAIN on table "public"."media_payables" to "anon";
grant REFERENCES on table "public"."media_payables" to "anon";
grant SELECT on table "public"."media_payables" to "anon";
grant TRIGGER on table "public"."media_payables" to "anon";
grant TRUNCATE on table "public"."media_payables" to "anon";
grant UPDATE on table "public"."media_payables" to "anon";
grant DELETE on table "public"."media_payables" to "authenticated";
grant INSERT on table "public"."media_payables" to "authenticated";
grant MAINTAIN on table "public"."media_payables" to "authenticated";
grant REFERENCES on table "public"."media_payables" to "authenticated";
grant SELECT on table "public"."media_payables" to "authenticated";
grant TRIGGER on table "public"."media_payables" to "authenticated";
grant TRUNCATE on table "public"."media_payables" to "authenticated";
grant UPDATE on table "public"."media_payables" to "authenticated";
grant DELETE on table "public"."media_payables" to "service_role";
grant INSERT on table "public"."media_payables" to "service_role";
grant MAINTAIN on table "public"."media_payables" to "service_role";
grant REFERENCES on table "public"."media_payables" to "service_role";
grant SELECT on table "public"."media_payables" to "service_role";
grant TRIGGER on table "public"."media_payables" to "service_role";
grant TRUNCATE on table "public"."media_payables" to "service_role";
grant UPDATE on table "public"."media_payables" to "service_role";
grant DELETE on table "public"."media_payment_gate_results" to "anon";
grant INSERT on table "public"."media_payment_gate_results" to "anon";
grant MAINTAIN on table "public"."media_payment_gate_results" to "anon";
grant REFERENCES on table "public"."media_payment_gate_results" to "anon";
grant SELECT on table "public"."media_payment_gate_results" to "anon";
grant TRIGGER on table "public"."media_payment_gate_results" to "anon";
grant TRUNCATE on table "public"."media_payment_gate_results" to "anon";
grant UPDATE on table "public"."media_payment_gate_results" to "anon";
grant DELETE on table "public"."media_payment_gate_results" to "authenticated";
grant INSERT on table "public"."media_payment_gate_results" to "authenticated";
grant MAINTAIN on table "public"."media_payment_gate_results" to "authenticated";
grant REFERENCES on table "public"."media_payment_gate_results" to "authenticated";
grant SELECT on table "public"."media_payment_gate_results" to "authenticated";
grant TRIGGER on table "public"."media_payment_gate_results" to "authenticated";
grant TRUNCATE on table "public"."media_payment_gate_results" to "authenticated";
grant UPDATE on table "public"."media_payment_gate_results" to "authenticated";
grant DELETE on table "public"."media_payment_gate_results" to "service_role";
grant INSERT on table "public"."media_payment_gate_results" to "service_role";
grant MAINTAIN on table "public"."media_payment_gate_results" to "service_role";
grant REFERENCES on table "public"."media_payment_gate_results" to "service_role";
grant SELECT on table "public"."media_payment_gate_results" to "service_role";
grant TRIGGER on table "public"."media_payment_gate_results" to "service_role";
grant TRUNCATE on table "public"."media_payment_gate_results" to "service_role";
grant UPDATE on table "public"."media_payment_gate_results" to "service_role";
grant DELETE on table "public"."media_quality_scores" to "anon";
grant INSERT on table "public"."media_quality_scores" to "anon";
grant MAINTAIN on table "public"."media_quality_scores" to "anon";
grant REFERENCES on table "public"."media_quality_scores" to "anon";
grant SELECT on table "public"."media_quality_scores" to "anon";
grant TRIGGER on table "public"."media_quality_scores" to "anon";
grant TRUNCATE on table "public"."media_quality_scores" to "anon";
grant UPDATE on table "public"."media_quality_scores" to "anon";
grant DELETE on table "public"."media_quality_scores" to "authenticated";
grant INSERT on table "public"."media_quality_scores" to "authenticated";
grant MAINTAIN on table "public"."media_quality_scores" to "authenticated";
grant REFERENCES on table "public"."media_quality_scores" to "authenticated";
grant SELECT on table "public"."media_quality_scores" to "authenticated";
grant TRIGGER on table "public"."media_quality_scores" to "authenticated";
grant TRUNCATE on table "public"."media_quality_scores" to "authenticated";
grant UPDATE on table "public"."media_quality_scores" to "authenticated";
grant DELETE on table "public"."media_quality_scores" to "service_role";
grant INSERT on table "public"."media_quality_scores" to "service_role";
grant MAINTAIN on table "public"."media_quality_scores" to "service_role";
grant REFERENCES on table "public"."media_quality_scores" to "service_role";
grant SELECT on table "public"."media_quality_scores" to "service_role";
grant TRIGGER on table "public"."media_quality_scores" to "service_role";
grant TRUNCATE on table "public"."media_quality_scores" to "service_role";
grant UPDATE on table "public"."media_quality_scores" to "service_role";
grant DELETE on table "public"."media_revenue_performance" to "anon";
grant INSERT on table "public"."media_revenue_performance" to "anon";
grant MAINTAIN on table "public"."media_revenue_performance" to "anon";
grant REFERENCES on table "public"."media_revenue_performance" to "anon";
grant SELECT on table "public"."media_revenue_performance" to "anon";
grant TRIGGER on table "public"."media_revenue_performance" to "anon";
grant TRUNCATE on table "public"."media_revenue_performance" to "anon";
grant UPDATE on table "public"."media_revenue_performance" to "anon";
grant DELETE on table "public"."media_revenue_performance" to "authenticated";
grant INSERT on table "public"."media_revenue_performance" to "authenticated";
grant MAINTAIN on table "public"."media_revenue_performance" to "authenticated";
grant REFERENCES on table "public"."media_revenue_performance" to "authenticated";
grant SELECT on table "public"."media_revenue_performance" to "authenticated";
grant TRIGGER on table "public"."media_revenue_performance" to "authenticated";
grant TRUNCATE on table "public"."media_revenue_performance" to "authenticated";
grant UPDATE on table "public"."media_revenue_performance" to "authenticated";
grant DELETE on table "public"."media_revenue_performance" to "service_role";
grant INSERT on table "public"."media_revenue_performance" to "service_role";
grant MAINTAIN on table "public"."media_revenue_performance" to "service_role";
grant REFERENCES on table "public"."media_revenue_performance" to "service_role";
grant SELECT on table "public"."media_revenue_performance" to "service_role";
grant TRIGGER on table "public"."media_revenue_performance" to "service_role";
grant TRUNCATE on table "public"."media_revenue_performance" to "service_role";
grant UPDATE on table "public"."media_revenue_performance" to "service_role";
grant DELETE on table "public"."media_settlements" to "anon";
grant INSERT on table "public"."media_settlements" to "anon";
grant MAINTAIN on table "public"."media_settlements" to "anon";
grant REFERENCES on table "public"."media_settlements" to "anon";
grant SELECT on table "public"."media_settlements" to "anon";
grant TRIGGER on table "public"."media_settlements" to "anon";
grant TRUNCATE on table "public"."media_settlements" to "anon";
grant UPDATE on table "public"."media_settlements" to "anon";
grant DELETE on table "public"."media_settlements" to "authenticated";
grant INSERT on table "public"."media_settlements" to "authenticated";
grant MAINTAIN on table "public"."media_settlements" to "authenticated";
grant REFERENCES on table "public"."media_settlements" to "authenticated";
grant SELECT on table "public"."media_settlements" to "authenticated";
grant TRIGGER on table "public"."media_settlements" to "authenticated";
grant TRUNCATE on table "public"."media_settlements" to "authenticated";
grant UPDATE on table "public"."media_settlements" to "authenticated";
grant DELETE on table "public"."media_settlements" to "service_role";
grant INSERT on table "public"."media_settlements" to "service_role";
grant MAINTAIN on table "public"."media_settlements" to "service_role";
grant REFERENCES on table "public"."media_settlements" to "service_role";
grant SELECT on table "public"."media_settlements" to "service_role";
grant TRIGGER on table "public"."media_settlements" to "service_role";
grant TRUNCATE on table "public"."media_settlements" to "service_role";
grant UPDATE on table "public"."media_settlements" to "service_role";
grant DELETE on table "public"."media_strategy" to "anon";
grant INSERT on table "public"."media_strategy" to "anon";
grant MAINTAIN on table "public"."media_strategy" to "anon";
grant REFERENCES on table "public"."media_strategy" to "anon";
grant SELECT on table "public"."media_strategy" to "anon";
grant TRIGGER on table "public"."media_strategy" to "anon";
grant TRUNCATE on table "public"."media_strategy" to "anon";
grant UPDATE on table "public"."media_strategy" to "anon";
grant DELETE on table "public"."media_strategy" to "authenticated";
grant INSERT on table "public"."media_strategy" to "authenticated";
grant MAINTAIN on table "public"."media_strategy" to "authenticated";
grant REFERENCES on table "public"."media_strategy" to "authenticated";
grant SELECT on table "public"."media_strategy" to "authenticated";
grant TRIGGER on table "public"."media_strategy" to "authenticated";
grant TRUNCATE on table "public"."media_strategy" to "authenticated";
grant UPDATE on table "public"."media_strategy" to "authenticated";
grant DELETE on table "public"."media_strategy" to "service_role";
grant INSERT on table "public"."media_strategy" to "service_role";
grant MAINTAIN on table "public"."media_strategy" to "service_role";
grant REFERENCES on table "public"."media_strategy" to "service_role";
grant SELECT on table "public"."media_strategy" to "service_role";
grant TRIGGER on table "public"."media_strategy" to "service_role";
grant TRUNCATE on table "public"."media_strategy" to "service_role";
grant UPDATE on table "public"."media_strategy" to "service_role";
grant DELETE on table "public"."media_supply_daily_snapshots" to "anon";
grant INSERT on table "public"."media_supply_daily_snapshots" to "anon";
grant MAINTAIN on table "public"."media_supply_daily_snapshots" to "anon";
grant REFERENCES on table "public"."media_supply_daily_snapshots" to "anon";
grant SELECT on table "public"."media_supply_daily_snapshots" to "anon";
grant TRIGGER on table "public"."media_supply_daily_snapshots" to "anon";
grant TRUNCATE on table "public"."media_supply_daily_snapshots" to "anon";
grant UPDATE on table "public"."media_supply_daily_snapshots" to "anon";
grant DELETE on table "public"."media_supply_daily_snapshots" to "authenticated";
grant INSERT on table "public"."media_supply_daily_snapshots" to "authenticated";
grant MAINTAIN on table "public"."media_supply_daily_snapshots" to "authenticated";
grant REFERENCES on table "public"."media_supply_daily_snapshots" to "authenticated";
grant SELECT on table "public"."media_supply_daily_snapshots" to "authenticated";
grant TRIGGER on table "public"."media_supply_daily_snapshots" to "authenticated";
grant TRUNCATE on table "public"."media_supply_daily_snapshots" to "authenticated";
grant UPDATE on table "public"."media_supply_daily_snapshots" to "authenticated";
grant DELETE on table "public"."media_supply_daily_snapshots" to "service_role";
grant INSERT on table "public"."media_supply_daily_snapshots" to "service_role";
grant MAINTAIN on table "public"."media_supply_daily_snapshots" to "service_role";
grant REFERENCES on table "public"."media_supply_daily_snapshots" to "service_role";
grant SELECT on table "public"."media_supply_daily_snapshots" to "service_role";
grant TRIGGER on table "public"."media_supply_daily_snapshots" to "service_role";
grant TRUNCATE on table "public"."media_supply_daily_snapshots" to "service_role";
grant UPDATE on table "public"."media_supply_daily_snapshots" to "service_role";
grant DELETE on table "public"."media_supply_packages" to "anon";
grant INSERT on table "public"."media_supply_packages" to "anon";
grant MAINTAIN on table "public"."media_supply_packages" to "anon";
grant REFERENCES on table "public"."media_supply_packages" to "anon";
grant SELECT on table "public"."media_supply_packages" to "anon";
grant TRIGGER on table "public"."media_supply_packages" to "anon";
grant TRUNCATE on table "public"."media_supply_packages" to "anon";
grant UPDATE on table "public"."media_supply_packages" to "anon";
grant DELETE on table "public"."media_supply_packages" to "authenticated";
grant INSERT on table "public"."media_supply_packages" to "authenticated";
grant MAINTAIN on table "public"."media_supply_packages" to "authenticated";
grant REFERENCES on table "public"."media_supply_packages" to "authenticated";
grant SELECT on table "public"."media_supply_packages" to "authenticated";
grant TRIGGER on table "public"."media_supply_packages" to "authenticated";
grant TRUNCATE on table "public"."media_supply_packages" to "authenticated";
grant UPDATE on table "public"."media_supply_packages" to "authenticated";
grant DELETE on table "public"."media_supply_packages" to "service_role";
grant INSERT on table "public"."media_supply_packages" to "service_role";
grant MAINTAIN on table "public"."media_supply_packages" to "service_role";
grant REFERENCES on table "public"."media_supply_packages" to "service_role";
grant SELECT on table "public"."media_supply_packages" to "service_role";
grant TRIGGER on table "public"."media_supply_packages" to "service_role";
grant TRUNCATE on table "public"."media_supply_packages" to "service_role";
grant UPDATE on table "public"."media_supply_packages" to "service_role";
grant DELETE on table "public"."media_tech_integrations" to "anon";
grant INSERT on table "public"."media_tech_integrations" to "anon";
grant MAINTAIN on table "public"."media_tech_integrations" to "anon";
grant REFERENCES on table "public"."media_tech_integrations" to "anon";
grant SELECT on table "public"."media_tech_integrations" to "anon";
grant TRIGGER on table "public"."media_tech_integrations" to "anon";
grant TRUNCATE on table "public"."media_tech_integrations" to "anon";
grant UPDATE on table "public"."media_tech_integrations" to "anon";
grant DELETE on table "public"."media_tech_integrations" to "authenticated";
grant INSERT on table "public"."media_tech_integrations" to "authenticated";
grant MAINTAIN on table "public"."media_tech_integrations" to "authenticated";
grant REFERENCES on table "public"."media_tech_integrations" to "authenticated";
grant SELECT on table "public"."media_tech_integrations" to "authenticated";
grant TRIGGER on table "public"."media_tech_integrations" to "authenticated";
grant TRUNCATE on table "public"."media_tech_integrations" to "authenticated";
grant UPDATE on table "public"."media_tech_integrations" to "authenticated";
grant DELETE on table "public"."media_tech_integrations" to "service_role";
grant INSERT on table "public"."media_tech_integrations" to "service_role";
grant MAINTAIN on table "public"."media_tech_integrations" to "service_role";
grant REFERENCES on table "public"."media_tech_integrations" to "service_role";
grant SELECT on table "public"."media_tech_integrations" to "service_role";
grant TRIGGER on table "public"."media_tech_integrations" to "service_role";
grant TRUNCATE on table "public"."media_tech_integrations" to "service_role";
grant UPDATE on table "public"."media_tech_integrations" to "service_role";
grant DELETE on table "public"."media_traffic_quality" to "anon";
grant INSERT on table "public"."media_traffic_quality" to "anon";
grant MAINTAIN on table "public"."media_traffic_quality" to "anon";
grant REFERENCES on table "public"."media_traffic_quality" to "anon";
grant SELECT on table "public"."media_traffic_quality" to "anon";
grant TRIGGER on table "public"."media_traffic_quality" to "anon";
grant TRUNCATE on table "public"."media_traffic_quality" to "anon";
grant UPDATE on table "public"."media_traffic_quality" to "anon";
grant DELETE on table "public"."media_traffic_quality" to "authenticated";
grant INSERT on table "public"."media_traffic_quality" to "authenticated";
grant MAINTAIN on table "public"."media_traffic_quality" to "authenticated";
grant REFERENCES on table "public"."media_traffic_quality" to "authenticated";
grant SELECT on table "public"."media_traffic_quality" to "authenticated";
grant TRIGGER on table "public"."media_traffic_quality" to "authenticated";
grant TRUNCATE on table "public"."media_traffic_quality" to "authenticated";
grant UPDATE on table "public"."media_traffic_quality" to "authenticated";
grant DELETE on table "public"."media_traffic_quality" to "service_role";
grant INSERT on table "public"."media_traffic_quality" to "service_role";
grant MAINTAIN on table "public"."media_traffic_quality" to "service_role";
grant REFERENCES on table "public"."media_traffic_quality" to "service_role";
grant SELECT on table "public"."media_traffic_quality" to "service_role";
grant TRIGGER on table "public"."media_traffic_quality" to "service_role";
grant TRUNCATE on table "public"."media_traffic_quality" to "service_role";
grant UPDATE on table "public"."media_traffic_quality" to "service_role";
grant DELETE on table "public"."media_trust_profiles" to "anon";
grant INSERT on table "public"."media_trust_profiles" to "anon";
grant MAINTAIN on table "public"."media_trust_profiles" to "anon";
grant REFERENCES on table "public"."media_trust_profiles" to "anon";
grant SELECT on table "public"."media_trust_profiles" to "anon";
grant TRIGGER on table "public"."media_trust_profiles" to "anon";
grant TRUNCATE on table "public"."media_trust_profiles" to "anon";
grant UPDATE on table "public"."media_trust_profiles" to "anon";
grant DELETE on table "public"."media_trust_profiles" to "authenticated";
grant INSERT on table "public"."media_trust_profiles" to "authenticated";
grant MAINTAIN on table "public"."media_trust_profiles" to "authenticated";
grant REFERENCES on table "public"."media_trust_profiles" to "authenticated";
grant SELECT on table "public"."media_trust_profiles" to "authenticated";
grant TRIGGER on table "public"."media_trust_profiles" to "authenticated";
grant TRUNCATE on table "public"."media_trust_profiles" to "authenticated";
grant UPDATE on table "public"."media_trust_profiles" to "authenticated";
grant DELETE on table "public"."media_trust_profiles" to "service_role";
grant INSERT on table "public"."media_trust_profiles" to "service_role";
grant MAINTAIN on table "public"."media_trust_profiles" to "service_role";
grant REFERENCES on table "public"."media_trust_profiles" to "service_role";
grant SELECT on table "public"."media_trust_profiles" to "service_role";
grant TRIGGER on table "public"."media_trust_profiles" to "service_role";
grant TRUNCATE on table "public"."media_trust_profiles" to "service_role";
grant UPDATE on table "public"."media_trust_profiles" to "service_role";
grant DELETE on table "public"."media_trust_score_history" to "anon";
grant INSERT on table "public"."media_trust_score_history" to "anon";
grant MAINTAIN on table "public"."media_trust_score_history" to "anon";
grant REFERENCES on table "public"."media_trust_score_history" to "anon";
grant SELECT on table "public"."media_trust_score_history" to "anon";
grant TRIGGER on table "public"."media_trust_score_history" to "anon";
grant TRUNCATE on table "public"."media_trust_score_history" to "anon";
grant UPDATE on table "public"."media_trust_score_history" to "anon";
grant DELETE on table "public"."media_trust_score_history" to "authenticated";
grant INSERT on table "public"."media_trust_score_history" to "authenticated";
grant MAINTAIN on table "public"."media_trust_score_history" to "authenticated";
grant REFERENCES on table "public"."media_trust_score_history" to "authenticated";
grant SELECT on table "public"."media_trust_score_history" to "authenticated";
grant TRIGGER on table "public"."media_trust_score_history" to "authenticated";
grant TRUNCATE on table "public"."media_trust_score_history" to "authenticated";
grant UPDATE on table "public"."media_trust_score_history" to "authenticated";
grant DELETE on table "public"."media_trust_score_history" to "service_role";
grant INSERT on table "public"."media_trust_score_history" to "service_role";
grant MAINTAIN on table "public"."media_trust_score_history" to "service_role";
grant REFERENCES on table "public"."media_trust_score_history" to "service_role";
grant SELECT on table "public"."media_trust_score_history" to "service_role";
grant TRIGGER on table "public"."media_trust_score_history" to "service_role";
grant TRUNCATE on table "public"."media_trust_score_history" to "service_role";
grant UPDATE on table "public"."media_trust_score_history" to "service_role";
grant DELETE on table "public"."metric_definitions" to "anon";
grant INSERT on table "public"."metric_definitions" to "anon";
grant MAINTAIN on table "public"."metric_definitions" to "anon";
grant REFERENCES on table "public"."metric_definitions" to "anon";
grant SELECT on table "public"."metric_definitions" to "anon";
grant TRIGGER on table "public"."metric_definitions" to "anon";
grant TRUNCATE on table "public"."metric_definitions" to "anon";
grant UPDATE on table "public"."metric_definitions" to "anon";
grant DELETE on table "public"."metric_definitions" to "authenticated";
grant INSERT on table "public"."metric_definitions" to "authenticated";
grant MAINTAIN on table "public"."metric_definitions" to "authenticated";
grant REFERENCES on table "public"."metric_definitions" to "authenticated";
grant SELECT on table "public"."metric_definitions" to "authenticated";
grant TRIGGER on table "public"."metric_definitions" to "authenticated";
grant TRUNCATE on table "public"."metric_definitions" to "authenticated";
grant UPDATE on table "public"."metric_definitions" to "authenticated";
grant DELETE on table "public"."metric_definitions" to "service_role";
grant INSERT on table "public"."metric_definitions" to "service_role";
grant MAINTAIN on table "public"."metric_definitions" to "service_role";
grant REFERENCES on table "public"."metric_definitions" to "service_role";
grant SELECT on table "public"."metric_definitions" to "service_role";
grant TRIGGER on table "public"."metric_definitions" to "service_role";
grant TRUNCATE on table "public"."metric_definitions" to "service_role";
grant UPDATE on table "public"."metric_definitions" to "service_role";
grant DELETE on table "public"."metric_funnel_snapshots" to "anon";
grant INSERT on table "public"."metric_funnel_snapshots" to "anon";
grant MAINTAIN on table "public"."metric_funnel_snapshots" to "anon";
grant REFERENCES on table "public"."metric_funnel_snapshots" to "anon";
grant SELECT on table "public"."metric_funnel_snapshots" to "anon";
grant TRIGGER on table "public"."metric_funnel_snapshots" to "anon";
grant TRUNCATE on table "public"."metric_funnel_snapshots" to "anon";
grant UPDATE on table "public"."metric_funnel_snapshots" to "anon";
grant DELETE on table "public"."metric_funnel_snapshots" to "authenticated";
grant INSERT on table "public"."metric_funnel_snapshots" to "authenticated";
grant MAINTAIN on table "public"."metric_funnel_snapshots" to "authenticated";
grant REFERENCES on table "public"."metric_funnel_snapshots" to "authenticated";
grant SELECT on table "public"."metric_funnel_snapshots" to "authenticated";
grant TRIGGER on table "public"."metric_funnel_snapshots" to "authenticated";
grant TRUNCATE on table "public"."metric_funnel_snapshots" to "authenticated";
grant UPDATE on table "public"."metric_funnel_snapshots" to "authenticated";
grant DELETE on table "public"."metric_funnel_snapshots" to "service_role";
grant INSERT on table "public"."metric_funnel_snapshots" to "service_role";
grant MAINTAIN on table "public"."metric_funnel_snapshots" to "service_role";
grant REFERENCES on table "public"."metric_funnel_snapshots" to "service_role";
grant SELECT on table "public"."metric_funnel_snapshots" to "service_role";
grant TRIGGER on table "public"."metric_funnel_snapshots" to "service_role";
grant TRUNCATE on table "public"."metric_funnel_snapshots" to "service_role";
grant UPDATE on table "public"."metric_funnel_snapshots" to "service_role";
grant DELETE on table "public"."metric_snapshots" to "anon";
grant INSERT on table "public"."metric_snapshots" to "anon";
grant MAINTAIN on table "public"."metric_snapshots" to "anon";
grant REFERENCES on table "public"."metric_snapshots" to "anon";
grant SELECT on table "public"."metric_snapshots" to "anon";
grant TRIGGER on table "public"."metric_snapshots" to "anon";
grant TRUNCATE on table "public"."metric_snapshots" to "anon";
grant UPDATE on table "public"."metric_snapshots" to "anon";
grant DELETE on table "public"."metric_snapshots" to "authenticated";
grant INSERT on table "public"."metric_snapshots" to "authenticated";
grant MAINTAIN on table "public"."metric_snapshots" to "authenticated";
grant REFERENCES on table "public"."metric_snapshots" to "authenticated";
grant SELECT on table "public"."metric_snapshots" to "authenticated";
grant TRIGGER on table "public"."metric_snapshots" to "authenticated";
grant TRUNCATE on table "public"."metric_snapshots" to "authenticated";
grant UPDATE on table "public"."metric_snapshots" to "authenticated";
grant DELETE on table "public"."metric_snapshots" to "service_role";
grant INSERT on table "public"."metric_snapshots" to "service_role";
grant MAINTAIN on table "public"."metric_snapshots" to "service_role";
grant REFERENCES on table "public"."metric_snapshots" to "service_role";
grant SELECT on table "public"."metric_snapshots" to "service_role";
grant TRIGGER on table "public"."metric_snapshots" to "service_role";
grant TRUNCATE on table "public"."metric_snapshots" to "service_role";
grant UPDATE on table "public"."metric_snapshots" to "service_role";
grant DELETE on table "public"."module_business_events" to "anon";
grant INSERT on table "public"."module_business_events" to "anon";
grant MAINTAIN on table "public"."module_business_events" to "anon";
grant REFERENCES on table "public"."module_business_events" to "anon";
grant SELECT on table "public"."module_business_events" to "anon";
grant TRIGGER on table "public"."module_business_events" to "anon";
grant TRUNCATE on table "public"."module_business_events" to "anon";
grant UPDATE on table "public"."module_business_events" to "anon";
grant DELETE on table "public"."module_business_events" to "authenticated";
grant INSERT on table "public"."module_business_events" to "authenticated";
grant MAINTAIN on table "public"."module_business_events" to "authenticated";
grant REFERENCES on table "public"."module_business_events" to "authenticated";
grant SELECT on table "public"."module_business_events" to "authenticated";
grant TRIGGER on table "public"."module_business_events" to "authenticated";
grant TRUNCATE on table "public"."module_business_events" to "authenticated";
grant UPDATE on table "public"."module_business_events" to "authenticated";
grant DELETE on table "public"."module_business_events" to "service_role";
grant INSERT on table "public"."module_business_events" to "service_role";
grant MAINTAIN on table "public"."module_business_events" to "service_role";
grant REFERENCES on table "public"."module_business_events" to "service_role";
grant SELECT on table "public"."module_business_events" to "service_role";
grant TRIGGER on table "public"."module_business_events" to "service_role";
grant TRUNCATE on table "public"."module_business_events" to "service_role";
grant UPDATE on table "public"."module_business_events" to "service_role";
grant DELETE on table "public"."notification_acknowledgements" to "anon";
grant INSERT on table "public"."notification_acknowledgements" to "anon";
grant MAINTAIN on table "public"."notification_acknowledgements" to "anon";
grant REFERENCES on table "public"."notification_acknowledgements" to "anon";
grant SELECT on table "public"."notification_acknowledgements" to "anon";
grant TRIGGER on table "public"."notification_acknowledgements" to "anon";
grant TRUNCATE on table "public"."notification_acknowledgements" to "anon";
grant UPDATE on table "public"."notification_acknowledgements" to "anon";
grant DELETE on table "public"."notification_acknowledgements" to "authenticated";
grant INSERT on table "public"."notification_acknowledgements" to "authenticated";
grant MAINTAIN on table "public"."notification_acknowledgements" to "authenticated";
grant REFERENCES on table "public"."notification_acknowledgements" to "authenticated";
grant SELECT on table "public"."notification_acknowledgements" to "authenticated";
grant TRIGGER on table "public"."notification_acknowledgements" to "authenticated";
grant TRUNCATE on table "public"."notification_acknowledgements" to "authenticated";
grant UPDATE on table "public"."notification_acknowledgements" to "authenticated";
grant DELETE on table "public"."notification_acknowledgements" to "service_role";
grant INSERT on table "public"."notification_acknowledgements" to "service_role";
grant MAINTAIN on table "public"."notification_acknowledgements" to "service_role";
grant REFERENCES on table "public"."notification_acknowledgements" to "service_role";
grant SELECT on table "public"."notification_acknowledgements" to "service_role";
grant TRIGGER on table "public"."notification_acknowledgements" to "service_role";
grant TRUNCATE on table "public"."notification_acknowledgements" to "service_role";
grant UPDATE on table "public"."notification_acknowledgements" to "service_role";
grant DELETE on table "public"."notification_logs" to "anon";
grant INSERT on table "public"."notification_logs" to "anon";
grant MAINTAIN on table "public"."notification_logs" to "anon";
grant REFERENCES on table "public"."notification_logs" to "anon";
grant SELECT on table "public"."notification_logs" to "anon";
grant TRIGGER on table "public"."notification_logs" to "anon";
grant TRUNCATE on table "public"."notification_logs" to "anon";
grant UPDATE on table "public"."notification_logs" to "anon";
grant DELETE on table "public"."notification_logs" to "authenticated";
grant INSERT on table "public"."notification_logs" to "authenticated";
grant MAINTAIN on table "public"."notification_logs" to "authenticated";
grant REFERENCES on table "public"."notification_logs" to "authenticated";
grant SELECT on table "public"."notification_logs" to "authenticated";
grant TRIGGER on table "public"."notification_logs" to "authenticated";
grant TRUNCATE on table "public"."notification_logs" to "authenticated";
grant UPDATE on table "public"."notification_logs" to "authenticated";
grant DELETE on table "public"."notification_logs" to "service_role";
grant INSERT on table "public"."notification_logs" to "service_role";
grant MAINTAIN on table "public"."notification_logs" to "service_role";
grant REFERENCES on table "public"."notification_logs" to "service_role";
grant SELECT on table "public"."notification_logs" to "service_role";
grant TRIGGER on table "public"."notification_logs" to "service_role";
grant TRUNCATE on table "public"."notification_logs" to "service_role";
grant UPDATE on table "public"."notification_logs" to "service_role";
grant DELETE on table "public"."notification_outbox" to "anon";
grant INSERT on table "public"."notification_outbox" to "anon";
grant MAINTAIN on table "public"."notification_outbox" to "anon";
grant REFERENCES on table "public"."notification_outbox" to "anon";
grant SELECT on table "public"."notification_outbox" to "anon";
grant TRIGGER on table "public"."notification_outbox" to "anon";
grant TRUNCATE on table "public"."notification_outbox" to "anon";
grant UPDATE on table "public"."notification_outbox" to "anon";
grant DELETE on table "public"."notification_outbox" to "authenticated";
grant INSERT on table "public"."notification_outbox" to "authenticated";
grant MAINTAIN on table "public"."notification_outbox" to "authenticated";
grant REFERENCES on table "public"."notification_outbox" to "authenticated";
grant SELECT on table "public"."notification_outbox" to "authenticated";
grant TRIGGER on table "public"."notification_outbox" to "authenticated";
grant TRUNCATE on table "public"."notification_outbox" to "authenticated";
grant UPDATE on table "public"."notification_outbox" to "authenticated";
grant DELETE on table "public"."notification_outbox" to "service_role";
grant INSERT on table "public"."notification_outbox" to "service_role";
grant MAINTAIN on table "public"."notification_outbox" to "service_role";
grant REFERENCES on table "public"."notification_outbox" to "service_role";
grant SELECT on table "public"."notification_outbox" to "service_role";
grant TRIGGER on table "public"."notification_outbox" to "service_role";
grant TRUNCATE on table "public"."notification_outbox" to "service_role";
grant UPDATE on table "public"."notification_outbox" to "service_role";
grant DELETE on table "public"."notifications" to "anon";
grant INSERT on table "public"."notifications" to "anon";
grant MAINTAIN on table "public"."notifications" to "anon";
grant REFERENCES on table "public"."notifications" to "anon";
grant SELECT on table "public"."notifications" to "anon";
grant TRIGGER on table "public"."notifications" to "anon";
grant TRUNCATE on table "public"."notifications" to "anon";
grant UPDATE on table "public"."notifications" to "anon";
grant DELETE on table "public"."notifications" to "authenticated";
grant INSERT on table "public"."notifications" to "authenticated";
grant MAINTAIN on table "public"."notifications" to "authenticated";
grant REFERENCES on table "public"."notifications" to "authenticated";
grant SELECT on table "public"."notifications" to "authenticated";
grant TRIGGER on table "public"."notifications" to "authenticated";
grant TRUNCATE on table "public"."notifications" to "authenticated";
grant UPDATE on table "public"."notifications" to "authenticated";
grant DELETE on table "public"."notifications" to "service_role";
grant INSERT on table "public"."notifications" to "service_role";
grant MAINTAIN on table "public"."notifications" to "service_role";
grant REFERENCES on table "public"."notifications" to "service_role";
grant SELECT on table "public"."notifications" to "service_role";
grant TRIGGER on table "public"."notifications" to "service_role";
grant TRUNCATE on table "public"."notifications" to "service_role";
grant UPDATE on table "public"."notifications" to "service_role";
grant DELETE on table "public"."okr_checkins" to "anon";
grant INSERT on table "public"."okr_checkins" to "anon";
grant MAINTAIN on table "public"."okr_checkins" to "anon";
grant REFERENCES on table "public"."okr_checkins" to "anon";
grant SELECT on table "public"."okr_checkins" to "anon";
grant TRIGGER on table "public"."okr_checkins" to "anon";
grant TRUNCATE on table "public"."okr_checkins" to "anon";
grant UPDATE on table "public"."okr_checkins" to "anon";
grant DELETE on table "public"."okr_checkins" to "authenticated";
grant INSERT on table "public"."okr_checkins" to "authenticated";
grant MAINTAIN on table "public"."okr_checkins" to "authenticated";
grant REFERENCES on table "public"."okr_checkins" to "authenticated";
grant SELECT on table "public"."okr_checkins" to "authenticated";
grant TRIGGER on table "public"."okr_checkins" to "authenticated";
grant TRUNCATE on table "public"."okr_checkins" to "authenticated";
grant UPDATE on table "public"."okr_checkins" to "authenticated";
grant DELETE on table "public"."okr_checkins" to "service_role";
grant INSERT on table "public"."okr_checkins" to "service_role";
grant MAINTAIN on table "public"."okr_checkins" to "service_role";
grant REFERENCES on table "public"."okr_checkins" to "service_role";
grant SELECT on table "public"."okr_checkins" to "service_role";
grant TRIGGER on table "public"."okr_checkins" to "service_role";
grant TRUNCATE on table "public"."okr_checkins" to "service_role";
grant UPDATE on table "public"."okr_checkins" to "service_role";
grant DELETE on table "public"."okr_key_results" to "anon";
grant INSERT on table "public"."okr_key_results" to "anon";
grant MAINTAIN on table "public"."okr_key_results" to "anon";
grant REFERENCES on table "public"."okr_key_results" to "anon";
grant SELECT on table "public"."okr_key_results" to "anon";
grant TRIGGER on table "public"."okr_key_results" to "anon";
grant TRUNCATE on table "public"."okr_key_results" to "anon";
grant UPDATE on table "public"."okr_key_results" to "anon";
grant DELETE on table "public"."okr_key_results" to "authenticated";
grant INSERT on table "public"."okr_key_results" to "authenticated";
grant MAINTAIN on table "public"."okr_key_results" to "authenticated";
grant REFERENCES on table "public"."okr_key_results" to "authenticated";
grant SELECT on table "public"."okr_key_results" to "authenticated";
grant TRIGGER on table "public"."okr_key_results" to "authenticated";
grant TRUNCATE on table "public"."okr_key_results" to "authenticated";
grant UPDATE on table "public"."okr_key_results" to "authenticated";
grant DELETE on table "public"."okr_key_results" to "service_role";
grant INSERT on table "public"."okr_key_results" to "service_role";
grant MAINTAIN on table "public"."okr_key_results" to "service_role";
grant REFERENCES on table "public"."okr_key_results" to "service_role";
grant SELECT on table "public"."okr_key_results" to "service_role";
grant TRIGGER on table "public"."okr_key_results" to "service_role";
grant TRUNCATE on table "public"."okr_key_results" to "service_role";
grant UPDATE on table "public"."okr_key_results" to "service_role";
grant DELETE on table "public"."okr_objectives" to "anon";
grant INSERT on table "public"."okr_objectives" to "anon";
grant MAINTAIN on table "public"."okr_objectives" to "anon";
grant REFERENCES on table "public"."okr_objectives" to "anon";
grant SELECT on table "public"."okr_objectives" to "anon";
grant TRIGGER on table "public"."okr_objectives" to "anon";
grant TRUNCATE on table "public"."okr_objectives" to "anon";
grant UPDATE on table "public"."okr_objectives" to "anon";
grant DELETE on table "public"."okr_objectives" to "authenticated";
grant INSERT on table "public"."okr_objectives" to "authenticated";
grant MAINTAIN on table "public"."okr_objectives" to "authenticated";
grant REFERENCES on table "public"."okr_objectives" to "authenticated";
grant SELECT on table "public"."okr_objectives" to "authenticated";
grant TRIGGER on table "public"."okr_objectives" to "authenticated";
grant TRUNCATE on table "public"."okr_objectives" to "authenticated";
grant UPDATE on table "public"."okr_objectives" to "authenticated";
grant DELETE on table "public"."okr_objectives" to "service_role";
grant INSERT on table "public"."okr_objectives" to "service_role";
grant MAINTAIN on table "public"."okr_objectives" to "service_role";
grant REFERENCES on table "public"."okr_objectives" to "service_role";
grant SELECT on table "public"."okr_objectives" to "service_role";
grant TRIGGER on table "public"."okr_objectives" to "service_role";
grant TRUNCATE on table "public"."okr_objectives" to "service_role";
grant UPDATE on table "public"."okr_objectives" to "service_role";
grant DELETE on table "public"."onboarding_checklist_items" to "anon";
grant INSERT on table "public"."onboarding_checklist_items" to "anon";
grant MAINTAIN on table "public"."onboarding_checklist_items" to "anon";
grant REFERENCES on table "public"."onboarding_checklist_items" to "anon";
grant SELECT on table "public"."onboarding_checklist_items" to "anon";
grant TRIGGER on table "public"."onboarding_checklist_items" to "anon";
grant TRUNCATE on table "public"."onboarding_checklist_items" to "anon";
grant UPDATE on table "public"."onboarding_checklist_items" to "anon";
grant DELETE on table "public"."onboarding_checklist_items" to "authenticated";
grant INSERT on table "public"."onboarding_checklist_items" to "authenticated";
grant MAINTAIN on table "public"."onboarding_checklist_items" to "authenticated";
grant REFERENCES on table "public"."onboarding_checklist_items" to "authenticated";
grant SELECT on table "public"."onboarding_checklist_items" to "authenticated";
grant TRIGGER on table "public"."onboarding_checklist_items" to "authenticated";
grant TRUNCATE on table "public"."onboarding_checklist_items" to "authenticated";
grant UPDATE on table "public"."onboarding_checklist_items" to "authenticated";
grant DELETE on table "public"."onboarding_checklist_items" to "service_role";
grant INSERT on table "public"."onboarding_checklist_items" to "service_role";
grant MAINTAIN on table "public"."onboarding_checklist_items" to "service_role";
grant REFERENCES on table "public"."onboarding_checklist_items" to "service_role";
grant SELECT on table "public"."onboarding_checklist_items" to "service_role";
grant TRIGGER on table "public"."onboarding_checklist_items" to "service_role";
grant TRUNCATE on table "public"."onboarding_checklist_items" to "service_role";
grant UPDATE on table "public"."onboarding_checklist_items" to "service_role";
grant DELETE on table "public"."onboarding_gate_results" to "anon";
grant INSERT on table "public"."onboarding_gate_results" to "anon";
grant MAINTAIN on table "public"."onboarding_gate_results" to "anon";
grant REFERENCES on table "public"."onboarding_gate_results" to "anon";
grant SELECT on table "public"."onboarding_gate_results" to "anon";
grant TRIGGER on table "public"."onboarding_gate_results" to "anon";
grant TRUNCATE on table "public"."onboarding_gate_results" to "anon";
grant UPDATE on table "public"."onboarding_gate_results" to "anon";
grant DELETE on table "public"."onboarding_gate_results" to "authenticated";
grant INSERT on table "public"."onboarding_gate_results" to "authenticated";
grant MAINTAIN on table "public"."onboarding_gate_results" to "authenticated";
grant REFERENCES on table "public"."onboarding_gate_results" to "authenticated";
grant SELECT on table "public"."onboarding_gate_results" to "authenticated";
grant TRIGGER on table "public"."onboarding_gate_results" to "authenticated";
grant TRUNCATE on table "public"."onboarding_gate_results" to "authenticated";
grant UPDATE on table "public"."onboarding_gate_results" to "authenticated";
grant DELETE on table "public"."onboarding_gate_results" to "service_role";
grant INSERT on table "public"."onboarding_gate_results" to "service_role";
grant MAINTAIN on table "public"."onboarding_gate_results" to "service_role";
grant REFERENCES on table "public"."onboarding_gate_results" to "service_role";
grant SELECT on table "public"."onboarding_gate_results" to "service_role";
grant TRIGGER on table "public"."onboarding_gate_results" to "service_role";
grant TRUNCATE on table "public"."onboarding_gate_results" to "service_role";
grant UPDATE on table "public"."onboarding_gate_results" to "service_role";
grant DELETE on table "public"."onboarding_stage_records" to "anon";
grant INSERT on table "public"."onboarding_stage_records" to "anon";
grant MAINTAIN on table "public"."onboarding_stage_records" to "anon";
grant REFERENCES on table "public"."onboarding_stage_records" to "anon";
grant SELECT on table "public"."onboarding_stage_records" to "anon";
grant TRIGGER on table "public"."onboarding_stage_records" to "anon";
grant TRUNCATE on table "public"."onboarding_stage_records" to "anon";
grant UPDATE on table "public"."onboarding_stage_records" to "anon";
grant DELETE on table "public"."onboarding_stage_records" to "authenticated";
grant INSERT on table "public"."onboarding_stage_records" to "authenticated";
grant MAINTAIN on table "public"."onboarding_stage_records" to "authenticated";
grant REFERENCES on table "public"."onboarding_stage_records" to "authenticated";
grant SELECT on table "public"."onboarding_stage_records" to "authenticated";
grant TRIGGER on table "public"."onboarding_stage_records" to "authenticated";
grant TRUNCATE on table "public"."onboarding_stage_records" to "authenticated";
grant UPDATE on table "public"."onboarding_stage_records" to "authenticated";
grant DELETE on table "public"."onboarding_stage_records" to "service_role";
grant INSERT on table "public"."onboarding_stage_records" to "service_role";
grant MAINTAIN on table "public"."onboarding_stage_records" to "service_role";
grant REFERENCES on table "public"."onboarding_stage_records" to "service_role";
grant SELECT on table "public"."onboarding_stage_records" to "service_role";
grant TRIGGER on table "public"."onboarding_stage_records" to "service_role";
grant TRUNCATE on table "public"."onboarding_stage_records" to "service_role";
grant UPDATE on table "public"."onboarding_stage_records" to "service_role";
grant DELETE on table "public"."opportunities" to "anon";
grant INSERT on table "public"."opportunities" to "anon";
grant MAINTAIN on table "public"."opportunities" to "anon";
grant REFERENCES on table "public"."opportunities" to "anon";
grant SELECT on table "public"."opportunities" to "anon";
grant TRIGGER on table "public"."opportunities" to "anon";
grant TRUNCATE on table "public"."opportunities" to "anon";
grant UPDATE on table "public"."opportunities" to "anon";
grant DELETE on table "public"."opportunities" to "authenticated";
grant INSERT on table "public"."opportunities" to "authenticated";
grant MAINTAIN on table "public"."opportunities" to "authenticated";
grant REFERENCES on table "public"."opportunities" to "authenticated";
grant SELECT on table "public"."opportunities" to "authenticated";
grant TRIGGER on table "public"."opportunities" to "authenticated";
grant TRUNCATE on table "public"."opportunities" to "authenticated";
grant UPDATE on table "public"."opportunities" to "authenticated";
grant DELETE on table "public"."opportunities" to "service_role";
grant INSERT on table "public"."opportunities" to "service_role";
grant MAINTAIN on table "public"."opportunities" to "service_role";
grant REFERENCES on table "public"."opportunities" to "service_role";
grant SELECT on table "public"."opportunities" to "service_role";
grant TRIGGER on table "public"."opportunities" to "service_role";
grant TRUNCATE on table "public"."opportunities" to "service_role";
grant UPDATE on table "public"."opportunities" to "service_role";
grant DELETE on table "public"."owner_identity_resolution_exceptions" to "anon";
grant INSERT on table "public"."owner_identity_resolution_exceptions" to "anon";
grant MAINTAIN on table "public"."owner_identity_resolution_exceptions" to "anon";
grant REFERENCES on table "public"."owner_identity_resolution_exceptions" to "anon";
grant SELECT on table "public"."owner_identity_resolution_exceptions" to "anon";
grant TRIGGER on table "public"."owner_identity_resolution_exceptions" to "anon";
grant TRUNCATE on table "public"."owner_identity_resolution_exceptions" to "anon";
grant UPDATE on table "public"."owner_identity_resolution_exceptions" to "anon";
grant DELETE on table "public"."owner_identity_resolution_exceptions" to "authenticated";
grant INSERT on table "public"."owner_identity_resolution_exceptions" to "authenticated";
grant MAINTAIN on table "public"."owner_identity_resolution_exceptions" to "authenticated";
grant REFERENCES on table "public"."owner_identity_resolution_exceptions" to "authenticated";
grant SELECT on table "public"."owner_identity_resolution_exceptions" to "authenticated";
grant TRIGGER on table "public"."owner_identity_resolution_exceptions" to "authenticated";
grant TRUNCATE on table "public"."owner_identity_resolution_exceptions" to "authenticated";
grant UPDATE on table "public"."owner_identity_resolution_exceptions" to "authenticated";
grant DELETE on table "public"."owner_identity_resolution_exceptions" to "service_role";
grant INSERT on table "public"."owner_identity_resolution_exceptions" to "service_role";
grant MAINTAIN on table "public"."owner_identity_resolution_exceptions" to "service_role";
grant REFERENCES on table "public"."owner_identity_resolution_exceptions" to "service_role";
grant SELECT on table "public"."owner_identity_resolution_exceptions" to "service_role";
grant TRIGGER on table "public"."owner_identity_resolution_exceptions" to "service_role";
grant TRUNCATE on table "public"."owner_identity_resolution_exceptions" to "service_role";
grant UPDATE on table "public"."owner_identity_resolution_exceptions" to "service_role";
grant DELETE on table "public"."payment_collections" to "anon";
grant INSERT on table "public"."payment_collections" to "anon";
grant MAINTAIN on table "public"."payment_collections" to "anon";
grant REFERENCES on table "public"."payment_collections" to "anon";
grant SELECT on table "public"."payment_collections" to "anon";
grant TRIGGER on table "public"."payment_collections" to "anon";
grant TRUNCATE on table "public"."payment_collections" to "anon";
grant UPDATE on table "public"."payment_collections" to "anon";
grant DELETE on table "public"."payment_collections" to "authenticated";
grant INSERT on table "public"."payment_collections" to "authenticated";
grant MAINTAIN on table "public"."payment_collections" to "authenticated";
grant REFERENCES on table "public"."payment_collections" to "authenticated";
grant SELECT on table "public"."payment_collections" to "authenticated";
grant TRIGGER on table "public"."payment_collections" to "authenticated";
grant TRUNCATE on table "public"."payment_collections" to "authenticated";
grant UPDATE on table "public"."payment_collections" to "authenticated";
grant DELETE on table "public"."payment_collections" to "service_role";
grant INSERT on table "public"."payment_collections" to "service_role";
grant MAINTAIN on table "public"."payment_collections" to "service_role";
grant REFERENCES on table "public"."payment_collections" to "service_role";
grant SELECT on table "public"."payment_collections" to "service_role";
grant TRIGGER on table "public"."payment_collections" to "service_role";
grant TRUNCATE on table "public"."payment_collections" to "service_role";
grant UPDATE on table "public"."payment_collections" to "service_role";
grant DELETE on table "public"."pgos_export_logs" to "anon";
grant INSERT on table "public"."pgos_export_logs" to "anon";
grant MAINTAIN on table "public"."pgos_export_logs" to "anon";
grant REFERENCES on table "public"."pgos_export_logs" to "anon";
grant SELECT on table "public"."pgos_export_logs" to "anon";
grant TRIGGER on table "public"."pgos_export_logs" to "anon";
grant TRUNCATE on table "public"."pgos_export_logs" to "anon";
grant UPDATE on table "public"."pgos_export_logs" to "anon";
grant DELETE on table "public"."pgos_export_logs" to "authenticated";
grant INSERT on table "public"."pgos_export_logs" to "authenticated";
grant MAINTAIN on table "public"."pgos_export_logs" to "authenticated";
grant REFERENCES on table "public"."pgos_export_logs" to "authenticated";
grant SELECT on table "public"."pgos_export_logs" to "authenticated";
grant TRIGGER on table "public"."pgos_export_logs" to "authenticated";
grant TRUNCATE on table "public"."pgos_export_logs" to "authenticated";
grant UPDATE on table "public"."pgos_export_logs" to "authenticated";
grant DELETE on table "public"."pgos_export_logs" to "service_role";
grant INSERT on table "public"."pgos_export_logs" to "service_role";
grant MAINTAIN on table "public"."pgos_export_logs" to "service_role";
grant REFERENCES on table "public"."pgos_export_logs" to "service_role";
grant SELECT on table "public"."pgos_export_logs" to "service_role";
grant TRIGGER on table "public"."pgos_export_logs" to "service_role";
grant TRUNCATE on table "public"."pgos_export_logs" to "service_role";
grant UPDATE on table "public"."pgos_export_logs" to "service_role";
grant DELETE on table "public"."pgos_generated_reports" to "anon";
grant INSERT on table "public"."pgos_generated_reports" to "anon";
grant MAINTAIN on table "public"."pgos_generated_reports" to "anon";
grant REFERENCES on table "public"."pgos_generated_reports" to "anon";
grant SELECT on table "public"."pgos_generated_reports" to "anon";
grant TRIGGER on table "public"."pgos_generated_reports" to "anon";
grant TRUNCATE on table "public"."pgos_generated_reports" to "anon";
grant UPDATE on table "public"."pgos_generated_reports" to "anon";
grant DELETE on table "public"."pgos_generated_reports" to "authenticated";
grant INSERT on table "public"."pgos_generated_reports" to "authenticated";
grant MAINTAIN on table "public"."pgos_generated_reports" to "authenticated";
grant REFERENCES on table "public"."pgos_generated_reports" to "authenticated";
grant SELECT on table "public"."pgos_generated_reports" to "authenticated";
grant TRIGGER on table "public"."pgos_generated_reports" to "authenticated";
grant TRUNCATE on table "public"."pgos_generated_reports" to "authenticated";
grant UPDATE on table "public"."pgos_generated_reports" to "authenticated";
grant DELETE on table "public"."pgos_generated_reports" to "service_role";
grant INSERT on table "public"."pgos_generated_reports" to "service_role";
grant MAINTAIN on table "public"."pgos_generated_reports" to "service_role";
grant REFERENCES on table "public"."pgos_generated_reports" to "service_role";
grant SELECT on table "public"."pgos_generated_reports" to "service_role";
grant TRIGGER on table "public"."pgos_generated_reports" to "service_role";
grant TRUNCATE on table "public"."pgos_generated_reports" to "service_role";
grant UPDATE on table "public"."pgos_generated_reports" to "service_role";
grant DELETE on table "public"."pgos_import_batches" to "anon";
grant INSERT on table "public"."pgos_import_batches" to "anon";
grant MAINTAIN on table "public"."pgos_import_batches" to "anon";
grant REFERENCES on table "public"."pgos_import_batches" to "anon";
grant SELECT on table "public"."pgos_import_batches" to "anon";
grant TRIGGER on table "public"."pgos_import_batches" to "anon";
grant TRUNCATE on table "public"."pgos_import_batches" to "anon";
grant UPDATE on table "public"."pgos_import_batches" to "anon";
grant DELETE on table "public"."pgos_import_batches" to "authenticated";
grant INSERT on table "public"."pgos_import_batches" to "authenticated";
grant MAINTAIN on table "public"."pgos_import_batches" to "authenticated";
grant REFERENCES on table "public"."pgos_import_batches" to "authenticated";
grant SELECT on table "public"."pgos_import_batches" to "authenticated";
grant TRIGGER on table "public"."pgos_import_batches" to "authenticated";
grant TRUNCATE on table "public"."pgos_import_batches" to "authenticated";
grant UPDATE on table "public"."pgos_import_batches" to "authenticated";
grant DELETE on table "public"."pgos_import_batches" to "service_role";
grant INSERT on table "public"."pgos_import_batches" to "service_role";
grant MAINTAIN on table "public"."pgos_import_batches" to "service_role";
grant REFERENCES on table "public"."pgos_import_batches" to "service_role";
grant SELECT on table "public"."pgos_import_batches" to "service_role";
grant TRIGGER on table "public"."pgos_import_batches" to "service_role";
grant TRUNCATE on table "public"."pgos_import_batches" to "service_role";
grant UPDATE on table "public"."pgos_import_batches" to "service_role";
grant DELETE on table "public"."pgos_production_hardening_items" to "anon";
grant INSERT on table "public"."pgos_production_hardening_items" to "anon";
grant MAINTAIN on table "public"."pgos_production_hardening_items" to "anon";
grant REFERENCES on table "public"."pgos_production_hardening_items" to "anon";
grant SELECT on table "public"."pgos_production_hardening_items" to "anon";
grant TRIGGER on table "public"."pgos_production_hardening_items" to "anon";
grant TRUNCATE on table "public"."pgos_production_hardening_items" to "anon";
grant UPDATE on table "public"."pgos_production_hardening_items" to "anon";
grant DELETE on table "public"."pgos_production_hardening_items" to "authenticated";
grant INSERT on table "public"."pgos_production_hardening_items" to "authenticated";
grant MAINTAIN on table "public"."pgos_production_hardening_items" to "authenticated";
grant REFERENCES on table "public"."pgos_production_hardening_items" to "authenticated";
grant SELECT on table "public"."pgos_production_hardening_items" to "authenticated";
grant TRIGGER on table "public"."pgos_production_hardening_items" to "authenticated";
grant TRUNCATE on table "public"."pgos_production_hardening_items" to "authenticated";
grant UPDATE on table "public"."pgos_production_hardening_items" to "authenticated";
grant DELETE on table "public"."pgos_production_hardening_items" to "service_role";
grant INSERT on table "public"."pgos_production_hardening_items" to "service_role";
grant MAINTAIN on table "public"."pgos_production_hardening_items" to "service_role";
grant REFERENCES on table "public"."pgos_production_hardening_items" to "service_role";
grant SELECT on table "public"."pgos_production_hardening_items" to "service_role";
grant TRIGGER on table "public"."pgos_production_hardening_items" to "service_role";
grant TRUNCATE on table "public"."pgos_production_hardening_items" to "service_role";
grant UPDATE on table "public"."pgos_production_hardening_items" to "service_role";
grant DELETE on table "public"."pgos_remediation_closure_items" to "anon";
grant INSERT on table "public"."pgos_remediation_closure_items" to "anon";
grant MAINTAIN on table "public"."pgos_remediation_closure_items" to "anon";
grant REFERENCES on table "public"."pgos_remediation_closure_items" to "anon";
grant SELECT on table "public"."pgos_remediation_closure_items" to "anon";
grant TRIGGER on table "public"."pgos_remediation_closure_items" to "anon";
grant TRUNCATE on table "public"."pgos_remediation_closure_items" to "anon";
grant UPDATE on table "public"."pgos_remediation_closure_items" to "anon";
grant DELETE on table "public"."pgos_remediation_closure_items" to "authenticated";
grant INSERT on table "public"."pgos_remediation_closure_items" to "authenticated";
grant MAINTAIN on table "public"."pgos_remediation_closure_items" to "authenticated";
grant REFERENCES on table "public"."pgos_remediation_closure_items" to "authenticated";
grant SELECT on table "public"."pgos_remediation_closure_items" to "authenticated";
grant TRIGGER on table "public"."pgos_remediation_closure_items" to "authenticated";
grant TRUNCATE on table "public"."pgos_remediation_closure_items" to "authenticated";
grant UPDATE on table "public"."pgos_remediation_closure_items" to "authenticated";
grant DELETE on table "public"."pgos_remediation_closure_items" to "service_role";
grant INSERT on table "public"."pgos_remediation_closure_items" to "service_role";
grant MAINTAIN on table "public"."pgos_remediation_closure_items" to "service_role";
grant REFERENCES on table "public"."pgos_remediation_closure_items" to "service_role";
grant SELECT on table "public"."pgos_remediation_closure_items" to "service_role";
grant TRIGGER on table "public"."pgos_remediation_closure_items" to "service_role";
grant TRUNCATE on table "public"."pgos_remediation_closure_items" to "service_role";
grant UPDATE on table "public"."pgos_remediation_closure_items" to "service_role";
grant DELETE on table "public"."pgos_remediation_closure_summary" to "anon";
grant INSERT on table "public"."pgos_remediation_closure_summary" to "anon";
grant MAINTAIN on table "public"."pgos_remediation_closure_summary" to "anon";
grant REFERENCES on table "public"."pgos_remediation_closure_summary" to "anon";
grant SELECT on table "public"."pgos_remediation_closure_summary" to "anon";
grant TRIGGER on table "public"."pgos_remediation_closure_summary" to "anon";
grant TRUNCATE on table "public"."pgos_remediation_closure_summary" to "anon";
grant UPDATE on table "public"."pgos_remediation_closure_summary" to "anon";
grant DELETE on table "public"."pgos_remediation_closure_summary" to "authenticated";
grant INSERT on table "public"."pgos_remediation_closure_summary" to "authenticated";
grant MAINTAIN on table "public"."pgos_remediation_closure_summary" to "authenticated";
grant REFERENCES on table "public"."pgos_remediation_closure_summary" to "authenticated";
grant SELECT on table "public"."pgos_remediation_closure_summary" to "authenticated";
grant TRIGGER on table "public"."pgos_remediation_closure_summary" to "authenticated";
grant TRUNCATE on table "public"."pgos_remediation_closure_summary" to "authenticated";
grant UPDATE on table "public"."pgos_remediation_closure_summary" to "authenticated";
grant DELETE on table "public"."pgos_remediation_closure_summary" to "service_role";
grant INSERT on table "public"."pgos_remediation_closure_summary" to "service_role";
grant MAINTAIN on table "public"."pgos_remediation_closure_summary" to "service_role";
grant REFERENCES on table "public"."pgos_remediation_closure_summary" to "service_role";
grant SELECT on table "public"."pgos_remediation_closure_summary" to "service_role";
grant TRIGGER on table "public"."pgos_remediation_closure_summary" to "service_role";
grant TRUNCATE on table "public"."pgos_remediation_closure_summary" to "service_role";
grant UPDATE on table "public"."pgos_remediation_closure_summary" to "service_role";
grant DELETE on table "public"."pgos_schema_migrations" to "anon";
grant INSERT on table "public"."pgos_schema_migrations" to "anon";
grant MAINTAIN on table "public"."pgos_schema_migrations" to "anon";
grant REFERENCES on table "public"."pgos_schema_migrations" to "anon";
grant SELECT on table "public"."pgos_schema_migrations" to "anon";
grant TRIGGER on table "public"."pgos_schema_migrations" to "anon";
grant TRUNCATE on table "public"."pgos_schema_migrations" to "anon";
grant UPDATE on table "public"."pgos_schema_migrations" to "anon";
grant DELETE on table "public"."pgos_schema_migrations" to "authenticated";
grant INSERT on table "public"."pgos_schema_migrations" to "authenticated";
grant MAINTAIN on table "public"."pgos_schema_migrations" to "authenticated";
grant REFERENCES on table "public"."pgos_schema_migrations" to "authenticated";
grant SELECT on table "public"."pgos_schema_migrations" to "authenticated";
grant TRIGGER on table "public"."pgos_schema_migrations" to "authenticated";
grant TRUNCATE on table "public"."pgos_schema_migrations" to "authenticated";
grant UPDATE on table "public"."pgos_schema_migrations" to "authenticated";
grant DELETE on table "public"."pgos_schema_migrations" to "service_role";
grant INSERT on table "public"."pgos_schema_migrations" to "service_role";
grant MAINTAIN on table "public"."pgos_schema_migrations" to "service_role";
grant REFERENCES on table "public"."pgos_schema_migrations" to "service_role";
grant SELECT on table "public"."pgos_schema_migrations" to "service_role";
grant TRIGGER on table "public"."pgos_schema_migrations" to "service_role";
grant TRUNCATE on table "public"."pgos_schema_migrations" to "service_role";
grant UPDATE on table "public"."pgos_schema_migrations" to "service_role";
grant DELETE on table "public"."pgos_sessions" to "anon";
grant INSERT on table "public"."pgos_sessions" to "anon";
grant MAINTAIN on table "public"."pgos_sessions" to "anon";
grant REFERENCES on table "public"."pgos_sessions" to "anon";
grant SELECT on table "public"."pgos_sessions" to "anon";
grant TRIGGER on table "public"."pgos_sessions" to "anon";
grant TRUNCATE on table "public"."pgos_sessions" to "anon";
grant UPDATE on table "public"."pgos_sessions" to "anon";
grant DELETE on table "public"."pgos_sessions" to "authenticated";
grant INSERT on table "public"."pgos_sessions" to "authenticated";
grant MAINTAIN on table "public"."pgos_sessions" to "authenticated";
grant REFERENCES on table "public"."pgos_sessions" to "authenticated";
grant SELECT on table "public"."pgos_sessions" to "authenticated";
grant TRIGGER on table "public"."pgos_sessions" to "authenticated";
grant TRUNCATE on table "public"."pgos_sessions" to "authenticated";
grant UPDATE on table "public"."pgos_sessions" to "authenticated";
grant DELETE on table "public"."pgos_sessions" to "service_role";
grant INSERT on table "public"."pgos_sessions" to "service_role";
grant MAINTAIN on table "public"."pgos_sessions" to "service_role";
grant REFERENCES on table "public"."pgos_sessions" to "service_role";
grant SELECT on table "public"."pgos_sessions" to "service_role";
grant TRIGGER on table "public"."pgos_sessions" to "service_role";
grant TRUNCATE on table "public"."pgos_sessions" to "service_role";
grant UPDATE on table "public"."pgos_sessions" to "service_role";
grant DELETE on table "public"."pgos_users" to "anon";
grant INSERT on table "public"."pgos_users" to "anon";
grant MAINTAIN on table "public"."pgos_users" to "anon";
grant REFERENCES on table "public"."pgos_users" to "anon";
grant SELECT on table "public"."pgos_users" to "anon";
grant TRIGGER on table "public"."pgos_users" to "anon";
grant TRUNCATE on table "public"."pgos_users" to "anon";
grant UPDATE on table "public"."pgos_users" to "anon";
grant DELETE on table "public"."pgos_users" to "authenticated";
grant INSERT on table "public"."pgos_users" to "authenticated";
grant MAINTAIN on table "public"."pgos_users" to "authenticated";
grant REFERENCES on table "public"."pgos_users" to "authenticated";
grant SELECT on table "public"."pgos_users" to "authenticated";
grant TRIGGER on table "public"."pgos_users" to "authenticated";
grant TRUNCATE on table "public"."pgos_users" to "authenticated";
grant UPDATE on table "public"."pgos_users" to "authenticated";
grant DELETE on table "public"."pgos_users" to "service_role";
grant INSERT on table "public"."pgos_users" to "service_role";
grant MAINTAIN on table "public"."pgos_users" to "service_role";
grant REFERENCES on table "public"."pgos_users" to "service_role";
grant SELECT on table "public"."pgos_users" to "service_role";
grant TRIGGER on table "public"."pgos_users" to "service_role";
grant TRUNCATE on table "public"."pgos_users" to "service_role";
grant UPDATE on table "public"."pgos_users" to "service_role";
grant DELETE on table "public"."production_runtime_acceptance_runs" to "anon";
grant INSERT on table "public"."production_runtime_acceptance_runs" to "anon";
grant MAINTAIN on table "public"."production_runtime_acceptance_runs" to "anon";
grant REFERENCES on table "public"."production_runtime_acceptance_runs" to "anon";
grant SELECT on table "public"."production_runtime_acceptance_runs" to "anon";
grant TRIGGER on table "public"."production_runtime_acceptance_runs" to "anon";
grant TRUNCATE on table "public"."production_runtime_acceptance_runs" to "anon";
grant UPDATE on table "public"."production_runtime_acceptance_runs" to "anon";
grant DELETE on table "public"."production_runtime_acceptance_runs" to "authenticated";
grant INSERT on table "public"."production_runtime_acceptance_runs" to "authenticated";
grant MAINTAIN on table "public"."production_runtime_acceptance_runs" to "authenticated";
grant REFERENCES on table "public"."production_runtime_acceptance_runs" to "authenticated";
grant SELECT on table "public"."production_runtime_acceptance_runs" to "authenticated";
grant TRIGGER on table "public"."production_runtime_acceptance_runs" to "authenticated";
grant TRUNCATE on table "public"."production_runtime_acceptance_runs" to "authenticated";
grant UPDATE on table "public"."production_runtime_acceptance_runs" to "authenticated";
grant DELETE on table "public"."production_runtime_acceptance_runs" to "service_role";
grant INSERT on table "public"."production_runtime_acceptance_runs" to "service_role";
grant MAINTAIN on table "public"."production_runtime_acceptance_runs" to "service_role";
grant REFERENCES on table "public"."production_runtime_acceptance_runs" to "service_role";
grant SELECT on table "public"."production_runtime_acceptance_runs" to "service_role";
grant TRIGGER on table "public"."production_runtime_acceptance_runs" to "service_role";
grant TRUNCATE on table "public"."production_runtime_acceptance_runs" to "service_role";
grant UPDATE on table "public"."production_runtime_acceptance_runs" to "service_role";
grant DELETE on table "public"."profiles" to "anon";
grant INSERT on table "public"."profiles" to "anon";
grant MAINTAIN on table "public"."profiles" to "anon";
grant REFERENCES on table "public"."profiles" to "anon";
grant SELECT on table "public"."profiles" to "anon";
grant TRIGGER on table "public"."profiles" to "anon";
grant TRUNCATE on table "public"."profiles" to "anon";
grant UPDATE on table "public"."profiles" to "anon";
grant DELETE on table "public"."profiles" to "authenticated";
grant INSERT on table "public"."profiles" to "authenticated";
grant MAINTAIN on table "public"."profiles" to "authenticated";
grant REFERENCES on table "public"."profiles" to "authenticated";
grant SELECT on table "public"."profiles" to "authenticated";
grant TRIGGER on table "public"."profiles" to "authenticated";
grant TRUNCATE on table "public"."profiles" to "authenticated";
grant UPDATE on table "public"."profiles" to "authenticated";
grant DELETE on table "public"."profiles" to "service_role";
grant INSERT on table "public"."profiles" to "service_role";
grant MAINTAIN on table "public"."profiles" to "service_role";
grant REFERENCES on table "public"."profiles" to "service_role";
grant SELECT on table "public"."profiles" to "service_role";
grant TRIGGER on table "public"."profiles" to "service_role";
grant TRUNCATE on table "public"."profiles" to "service_role";
grant UPDATE on table "public"."profiles" to "service_role";
grant DELETE on table "public"."proposal_media_selections" to "anon";
grant INSERT on table "public"."proposal_media_selections" to "anon";
grant MAINTAIN on table "public"."proposal_media_selections" to "anon";
grant REFERENCES on table "public"."proposal_media_selections" to "anon";
grant SELECT on table "public"."proposal_media_selections" to "anon";
grant TRIGGER on table "public"."proposal_media_selections" to "anon";
grant TRUNCATE on table "public"."proposal_media_selections" to "anon";
grant UPDATE on table "public"."proposal_media_selections" to "anon";
grant DELETE on table "public"."proposal_media_selections" to "authenticated";
grant INSERT on table "public"."proposal_media_selections" to "authenticated";
grant MAINTAIN on table "public"."proposal_media_selections" to "authenticated";
grant REFERENCES on table "public"."proposal_media_selections" to "authenticated";
grant SELECT on table "public"."proposal_media_selections" to "authenticated";
grant TRIGGER on table "public"."proposal_media_selections" to "authenticated";
grant TRUNCATE on table "public"."proposal_media_selections" to "authenticated";
grant UPDATE on table "public"."proposal_media_selections" to "authenticated";
grant DELETE on table "public"."proposal_media_selections" to "service_role";
grant INSERT on table "public"."proposal_media_selections" to "service_role";
grant MAINTAIN on table "public"."proposal_media_selections" to "service_role";
grant REFERENCES on table "public"."proposal_media_selections" to "service_role";
grant SELECT on table "public"."proposal_media_selections" to "service_role";
grant TRIGGER on table "public"."proposal_media_selections" to "service_role";
grant TRUNCATE on table "public"."proposal_media_selections" to "service_role";
grant UPDATE on table "public"."proposal_media_selections" to "service_role";
grant DELETE on table "public"."proposals" to "anon";
grant INSERT on table "public"."proposals" to "anon";
grant MAINTAIN on table "public"."proposals" to "anon";
grant REFERENCES on table "public"."proposals" to "anon";
grant SELECT on table "public"."proposals" to "anon";
grant TRIGGER on table "public"."proposals" to "anon";
grant TRUNCATE on table "public"."proposals" to "anon";
grant UPDATE on table "public"."proposals" to "anon";
grant DELETE on table "public"."proposals" to "authenticated";
grant INSERT on table "public"."proposals" to "authenticated";
grant MAINTAIN on table "public"."proposals" to "authenticated";
grant REFERENCES on table "public"."proposals" to "authenticated";
grant SELECT on table "public"."proposals" to "authenticated";
grant TRIGGER on table "public"."proposals" to "authenticated";
grant TRUNCATE on table "public"."proposals" to "authenticated";
grant UPDATE on table "public"."proposals" to "authenticated";
grant DELETE on table "public"."proposals" to "service_role";
grant INSERT on table "public"."proposals" to "service_role";
grant MAINTAIN on table "public"."proposals" to "service_role";
grant REFERENCES on table "public"."proposals" to "service_role";
grant SELECT on table "public"."proposals" to "service_role";
grant TRIGGER on table "public"."proposals" to "service_role";
grant TRUNCATE on table "public"."proposals" to "service_role";
grant UPDATE on table "public"."proposals" to "service_role";
grant DELETE on table "public"."publisher_ad_slots" to "anon";
grant INSERT on table "public"."publisher_ad_slots" to "anon";
grant MAINTAIN on table "public"."publisher_ad_slots" to "anon";
grant REFERENCES on table "public"."publisher_ad_slots" to "anon";
grant SELECT on table "public"."publisher_ad_slots" to "anon";
grant TRIGGER on table "public"."publisher_ad_slots" to "anon";
grant TRUNCATE on table "public"."publisher_ad_slots" to "anon";
grant UPDATE on table "public"."publisher_ad_slots" to "anon";
grant DELETE on table "public"."publisher_ad_slots" to "authenticated";
grant INSERT on table "public"."publisher_ad_slots" to "authenticated";
grant MAINTAIN on table "public"."publisher_ad_slots" to "authenticated";
grant REFERENCES on table "public"."publisher_ad_slots" to "authenticated";
grant SELECT on table "public"."publisher_ad_slots" to "authenticated";
grant TRIGGER on table "public"."publisher_ad_slots" to "authenticated";
grant TRUNCATE on table "public"."publisher_ad_slots" to "authenticated";
grant UPDATE on table "public"."publisher_ad_slots" to "authenticated";
grant DELETE on table "public"."publisher_ad_slots" to "service_role";
grant INSERT on table "public"."publisher_ad_slots" to "service_role";
grant MAINTAIN on table "public"."publisher_ad_slots" to "service_role";
grant REFERENCES on table "public"."publisher_ad_slots" to "service_role";
grant SELECT on table "public"."publisher_ad_slots" to "service_role";
grant TRIGGER on table "public"."publisher_ad_slots" to "service_role";
grant TRUNCATE on table "public"."publisher_ad_slots" to "service_role";
grant UPDATE on table "public"."publisher_ad_slots" to "service_role";
grant DELETE on table "public"."publisher_contacts" to "anon";
grant INSERT on table "public"."publisher_contacts" to "anon";
grant MAINTAIN on table "public"."publisher_contacts" to "anon";
grant REFERENCES on table "public"."publisher_contacts" to "anon";
grant SELECT on table "public"."publisher_contacts" to "anon";
grant TRIGGER on table "public"."publisher_contacts" to "anon";
grant TRUNCATE on table "public"."publisher_contacts" to "anon";
grant UPDATE on table "public"."publisher_contacts" to "anon";
grant DELETE on table "public"."publisher_contacts" to "authenticated";
grant INSERT on table "public"."publisher_contacts" to "authenticated";
grant MAINTAIN on table "public"."publisher_contacts" to "authenticated";
grant REFERENCES on table "public"."publisher_contacts" to "authenticated";
grant SELECT on table "public"."publisher_contacts" to "authenticated";
grant TRIGGER on table "public"."publisher_contacts" to "authenticated";
grant TRUNCATE on table "public"."publisher_contacts" to "authenticated";
grant UPDATE on table "public"."publisher_contacts" to "authenticated";
grant DELETE on table "public"."publisher_contacts" to "service_role";
grant INSERT on table "public"."publisher_contacts" to "service_role";
grant MAINTAIN on table "public"."publisher_contacts" to "service_role";
grant REFERENCES on table "public"."publisher_contacts" to "service_role";
grant SELECT on table "public"."publisher_contacts" to "service_role";
grant TRIGGER on table "public"."publisher_contacts" to "service_role";
grant TRUNCATE on table "public"."publisher_contacts" to "service_role";
grant UPDATE on table "public"."publisher_contacts" to "service_role";
grant DELETE on table "public"."publisher_contract_terms" to "anon";
grant INSERT on table "public"."publisher_contract_terms" to "anon";
grant MAINTAIN on table "public"."publisher_contract_terms" to "anon";
grant REFERENCES on table "public"."publisher_contract_terms" to "anon";
grant SELECT on table "public"."publisher_contract_terms" to "anon";
grant TRIGGER on table "public"."publisher_contract_terms" to "anon";
grant TRUNCATE on table "public"."publisher_contract_terms" to "anon";
grant UPDATE on table "public"."publisher_contract_terms" to "anon";
grant DELETE on table "public"."publisher_contract_terms" to "authenticated";
grant INSERT on table "public"."publisher_contract_terms" to "authenticated";
grant MAINTAIN on table "public"."publisher_contract_terms" to "authenticated";
grant REFERENCES on table "public"."publisher_contract_terms" to "authenticated";
grant SELECT on table "public"."publisher_contract_terms" to "authenticated";
grant TRIGGER on table "public"."publisher_contract_terms" to "authenticated";
grant TRUNCATE on table "public"."publisher_contract_terms" to "authenticated";
grant UPDATE on table "public"."publisher_contract_terms" to "authenticated";
grant DELETE on table "public"."publisher_contract_terms" to "service_role";
grant INSERT on table "public"."publisher_contract_terms" to "service_role";
grant MAINTAIN on table "public"."publisher_contract_terms" to "service_role";
grant REFERENCES on table "public"."publisher_contract_terms" to "service_role";
grant SELECT on table "public"."publisher_contract_terms" to "service_role";
grant TRIGGER on table "public"."publisher_contract_terms" to "service_role";
grant TRUNCATE on table "public"."publisher_contract_terms" to "service_role";
grant UPDATE on table "public"."publisher_contract_terms" to "service_role";
grant DELETE on table "public"."publisher_readiness_snapshots" to "anon";
grant INSERT on table "public"."publisher_readiness_snapshots" to "anon";
grant MAINTAIN on table "public"."publisher_readiness_snapshots" to "anon";
grant REFERENCES on table "public"."publisher_readiness_snapshots" to "anon";
grant SELECT on table "public"."publisher_readiness_snapshots" to "anon";
grant TRIGGER on table "public"."publisher_readiness_snapshots" to "anon";
grant TRUNCATE on table "public"."publisher_readiness_snapshots" to "anon";
grant UPDATE on table "public"."publisher_readiness_snapshots" to "anon";
grant DELETE on table "public"."publisher_readiness_snapshots" to "authenticated";
grant INSERT on table "public"."publisher_readiness_snapshots" to "authenticated";
grant MAINTAIN on table "public"."publisher_readiness_snapshots" to "authenticated";
grant REFERENCES on table "public"."publisher_readiness_snapshots" to "authenticated";
grant SELECT on table "public"."publisher_readiness_snapshots" to "authenticated";
grant TRIGGER on table "public"."publisher_readiness_snapshots" to "authenticated";
grant TRUNCATE on table "public"."publisher_readiness_snapshots" to "authenticated";
grant UPDATE on table "public"."publisher_readiness_snapshots" to "authenticated";
grant DELETE on table "public"."publisher_readiness_snapshots" to "service_role";
grant INSERT on table "public"."publisher_readiness_snapshots" to "service_role";
grant MAINTAIN on table "public"."publisher_readiness_snapshots" to "service_role";
grant REFERENCES on table "public"."publisher_readiness_snapshots" to "service_role";
grant SELECT on table "public"."publisher_readiness_snapshots" to "service_role";
grant TRIGGER on table "public"."publisher_readiness_snapshots" to "service_role";
grant TRUNCATE on table "public"."publisher_readiness_snapshots" to "service_role";
grant UPDATE on table "public"."publisher_readiness_snapshots" to "service_role";
grant DELETE on table "public"."publisher_supply_transparency" to "anon";
grant INSERT on table "public"."publisher_supply_transparency" to "anon";
grant MAINTAIN on table "public"."publisher_supply_transparency" to "anon";
grant REFERENCES on table "public"."publisher_supply_transparency" to "anon";
grant SELECT on table "public"."publisher_supply_transparency" to "anon";
grant TRIGGER on table "public"."publisher_supply_transparency" to "anon";
grant TRUNCATE on table "public"."publisher_supply_transparency" to "anon";
grant UPDATE on table "public"."publisher_supply_transparency" to "anon";
grant DELETE on table "public"."publisher_supply_transparency" to "authenticated";
grant INSERT on table "public"."publisher_supply_transparency" to "authenticated";
grant MAINTAIN on table "public"."publisher_supply_transparency" to "authenticated";
grant REFERENCES on table "public"."publisher_supply_transparency" to "authenticated";
grant SELECT on table "public"."publisher_supply_transparency" to "authenticated";
grant TRIGGER on table "public"."publisher_supply_transparency" to "authenticated";
grant TRUNCATE on table "public"."publisher_supply_transparency" to "authenticated";
grant UPDATE on table "public"."publisher_supply_transparency" to "authenticated";
grant DELETE on table "public"."publisher_supply_transparency" to "service_role";
grant INSERT on table "public"."publisher_supply_transparency" to "service_role";
grant MAINTAIN on table "public"."publisher_supply_transparency" to "service_role";
grant REFERENCES on table "public"."publisher_supply_transparency" to "service_role";
grant SELECT on table "public"."publisher_supply_transparency" to "service_role";
grant TRIGGER on table "public"."publisher_supply_transparency" to "service_role";
grant TRUNCATE on table "public"."publisher_supply_transparency" to "service_role";
grant UPDATE on table "public"."publisher_supply_transparency" to "service_role";
grant DELETE on table "public"."publisher_traffic_evidence_history" to "anon";
grant INSERT on table "public"."publisher_traffic_evidence_history" to "anon";
grant MAINTAIN on table "public"."publisher_traffic_evidence_history" to "anon";
grant REFERENCES on table "public"."publisher_traffic_evidence_history" to "anon";
grant SELECT on table "public"."publisher_traffic_evidence_history" to "anon";
grant TRIGGER on table "public"."publisher_traffic_evidence_history" to "anon";
grant TRUNCATE on table "public"."publisher_traffic_evidence_history" to "anon";
grant UPDATE on table "public"."publisher_traffic_evidence_history" to "anon";
grant DELETE on table "public"."publisher_traffic_evidence_history" to "authenticated";
grant INSERT on table "public"."publisher_traffic_evidence_history" to "authenticated";
grant MAINTAIN on table "public"."publisher_traffic_evidence_history" to "authenticated";
grant REFERENCES on table "public"."publisher_traffic_evidence_history" to "authenticated";
grant SELECT on table "public"."publisher_traffic_evidence_history" to "authenticated";
grant TRIGGER on table "public"."publisher_traffic_evidence_history" to "authenticated";
grant TRUNCATE on table "public"."publisher_traffic_evidence_history" to "authenticated";
grant UPDATE on table "public"."publisher_traffic_evidence_history" to "authenticated";
grant DELETE on table "public"."publisher_traffic_evidence_history" to "service_role";
grant INSERT on table "public"."publisher_traffic_evidence_history" to "service_role";
grant MAINTAIN on table "public"."publisher_traffic_evidence_history" to "service_role";
grant REFERENCES on table "public"."publisher_traffic_evidence_history" to "service_role";
grant SELECT on table "public"."publisher_traffic_evidence_history" to "service_role";
grant TRIGGER on table "public"."publisher_traffic_evidence_history" to "service_role";
grant TRUNCATE on table "public"."publisher_traffic_evidence_history" to "service_role";
grant UPDATE on table "public"."publisher_traffic_evidence_history" to "service_role";
grant DELETE on table "public"."publishers" to "anon";
grant INSERT on table "public"."publishers" to "anon";
grant MAINTAIN on table "public"."publishers" to "anon";
grant REFERENCES on table "public"."publishers" to "anon";
grant SELECT on table "public"."publishers" to "anon";
grant TRIGGER on table "public"."publishers" to "anon";
grant TRUNCATE on table "public"."publishers" to "anon";
grant UPDATE on table "public"."publishers" to "anon";
grant DELETE on table "public"."publishers" to "authenticated";
grant INSERT on table "public"."publishers" to "authenticated";
grant MAINTAIN on table "public"."publishers" to "authenticated";
grant REFERENCES on table "public"."publishers" to "authenticated";
grant SELECT on table "public"."publishers" to "authenticated";
grant TRIGGER on table "public"."publishers" to "authenticated";
grant TRUNCATE on table "public"."publishers" to "authenticated";
grant UPDATE on table "public"."publishers" to "authenticated";
grant DELETE on table "public"."publishers" to "service_role";
grant INSERT on table "public"."publishers" to "service_role";
grant MAINTAIN on table "public"."publishers" to "service_role";
grant REFERENCES on table "public"."publishers" to "service_role";
grant SELECT on table "public"."publishers" to "service_role";
grant TRIGGER on table "public"."publishers" to "service_role";
grant TRUNCATE on table "public"."publishers" to "service_role";
grant UPDATE on table "public"."publishers" to "service_role";
grant DELETE on table "public"."purchase_orders" to "anon";
grant INSERT on table "public"."purchase_orders" to "anon";
grant MAINTAIN on table "public"."purchase_orders" to "anon";
grant REFERENCES on table "public"."purchase_orders" to "anon";
grant SELECT on table "public"."purchase_orders" to "anon";
grant TRIGGER on table "public"."purchase_orders" to "anon";
grant TRUNCATE on table "public"."purchase_orders" to "anon";
grant UPDATE on table "public"."purchase_orders" to "anon";
grant DELETE on table "public"."purchase_orders" to "authenticated";
grant INSERT on table "public"."purchase_orders" to "authenticated";
grant MAINTAIN on table "public"."purchase_orders" to "authenticated";
grant REFERENCES on table "public"."purchase_orders" to "authenticated";
grant SELECT on table "public"."purchase_orders" to "authenticated";
grant TRIGGER on table "public"."purchase_orders" to "authenticated";
grant TRUNCATE on table "public"."purchase_orders" to "authenticated";
grant UPDATE on table "public"."purchase_orders" to "authenticated";
grant DELETE on table "public"."purchase_orders" to "service_role";
grant INSERT on table "public"."purchase_orders" to "service_role";
grant MAINTAIN on table "public"."purchase_orders" to "service_role";
grant REFERENCES on table "public"."purchase_orders" to "service_role";
grant SELECT on table "public"."purchase_orders" to "service_role";
grant TRIGGER on table "public"."purchase_orders" to "service_role";
grant TRUNCATE on table "public"."purchase_orders" to "service_role";
grant UPDATE on table "public"."purchase_orders" to "service_role";
grant DELETE on table "public"."quality_diagnostic_cases" to "anon";
grant INSERT on table "public"."quality_diagnostic_cases" to "anon";
grant MAINTAIN on table "public"."quality_diagnostic_cases" to "anon";
grant REFERENCES on table "public"."quality_diagnostic_cases" to "anon";
grant SELECT on table "public"."quality_diagnostic_cases" to "anon";
grant TRIGGER on table "public"."quality_diagnostic_cases" to "anon";
grant TRUNCATE on table "public"."quality_diagnostic_cases" to "anon";
grant UPDATE on table "public"."quality_diagnostic_cases" to "anon";
grant DELETE on table "public"."quality_diagnostic_cases" to "authenticated";
grant INSERT on table "public"."quality_diagnostic_cases" to "authenticated";
grant MAINTAIN on table "public"."quality_diagnostic_cases" to "authenticated";
grant REFERENCES on table "public"."quality_diagnostic_cases" to "authenticated";
grant SELECT on table "public"."quality_diagnostic_cases" to "authenticated";
grant TRIGGER on table "public"."quality_diagnostic_cases" to "authenticated";
grant TRUNCATE on table "public"."quality_diagnostic_cases" to "authenticated";
grant UPDATE on table "public"."quality_diagnostic_cases" to "authenticated";
grant DELETE on table "public"."quality_diagnostic_cases" to "service_role";
grant INSERT on table "public"."quality_diagnostic_cases" to "service_role";
grant MAINTAIN on table "public"."quality_diagnostic_cases" to "service_role";
grant REFERENCES on table "public"."quality_diagnostic_cases" to "service_role";
grant SELECT on table "public"."quality_diagnostic_cases" to "service_role";
grant TRIGGER on table "public"."quality_diagnostic_cases" to "service_role";
grant TRUNCATE on table "public"."quality_diagnostic_cases" to "service_role";
grant UPDATE on table "public"."quality_diagnostic_cases" to "service_role";
grant DELETE on table "public"."quality_diagnostic_conclusions" to "anon";
grant INSERT on table "public"."quality_diagnostic_conclusions" to "anon";
grant MAINTAIN on table "public"."quality_diagnostic_conclusions" to "anon";
grant REFERENCES on table "public"."quality_diagnostic_conclusions" to "anon";
grant SELECT on table "public"."quality_diagnostic_conclusions" to "anon";
grant TRIGGER on table "public"."quality_diagnostic_conclusions" to "anon";
grant TRUNCATE on table "public"."quality_diagnostic_conclusions" to "anon";
grant UPDATE on table "public"."quality_diagnostic_conclusions" to "anon";
grant DELETE on table "public"."quality_diagnostic_conclusions" to "authenticated";
grant INSERT on table "public"."quality_diagnostic_conclusions" to "authenticated";
grant MAINTAIN on table "public"."quality_diagnostic_conclusions" to "authenticated";
grant REFERENCES on table "public"."quality_diagnostic_conclusions" to "authenticated";
grant SELECT on table "public"."quality_diagnostic_conclusions" to "authenticated";
grant TRIGGER on table "public"."quality_diagnostic_conclusions" to "authenticated";
grant TRUNCATE on table "public"."quality_diagnostic_conclusions" to "authenticated";
grant UPDATE on table "public"."quality_diagnostic_conclusions" to "authenticated";
grant DELETE on table "public"."quality_diagnostic_conclusions" to "service_role";
grant INSERT on table "public"."quality_diagnostic_conclusions" to "service_role";
grant MAINTAIN on table "public"."quality_diagnostic_conclusions" to "service_role";
grant REFERENCES on table "public"."quality_diagnostic_conclusions" to "service_role";
grant SELECT on table "public"."quality_diagnostic_conclusions" to "service_role";
grant TRIGGER on table "public"."quality_diagnostic_conclusions" to "service_role";
grant TRUNCATE on table "public"."quality_diagnostic_conclusions" to "service_role";
grant UPDATE on table "public"."quality_diagnostic_conclusions" to "service_role";
grant DELETE on table "public"."quality_diagnostic_downstream_actions" to "anon";
grant INSERT on table "public"."quality_diagnostic_downstream_actions" to "anon";
grant MAINTAIN on table "public"."quality_diagnostic_downstream_actions" to "anon";
grant REFERENCES on table "public"."quality_diagnostic_downstream_actions" to "anon";
grant SELECT on table "public"."quality_diagnostic_downstream_actions" to "anon";
grant TRIGGER on table "public"."quality_diagnostic_downstream_actions" to "anon";
grant TRUNCATE on table "public"."quality_diagnostic_downstream_actions" to "anon";
grant UPDATE on table "public"."quality_diagnostic_downstream_actions" to "anon";
grant DELETE on table "public"."quality_diagnostic_downstream_actions" to "authenticated";
grant INSERT on table "public"."quality_diagnostic_downstream_actions" to "authenticated";
grant MAINTAIN on table "public"."quality_diagnostic_downstream_actions" to "authenticated";
grant REFERENCES on table "public"."quality_diagnostic_downstream_actions" to "authenticated";
grant SELECT on table "public"."quality_diagnostic_downstream_actions" to "authenticated";
grant TRIGGER on table "public"."quality_diagnostic_downstream_actions" to "authenticated";
grant TRUNCATE on table "public"."quality_diagnostic_downstream_actions" to "authenticated";
grant UPDATE on table "public"."quality_diagnostic_downstream_actions" to "authenticated";
grant DELETE on table "public"."quality_diagnostic_downstream_actions" to "service_role";
grant INSERT on table "public"."quality_diagnostic_downstream_actions" to "service_role";
grant MAINTAIN on table "public"."quality_diagnostic_downstream_actions" to "service_role";
grant REFERENCES on table "public"."quality_diagnostic_downstream_actions" to "service_role";
grant SELECT on table "public"."quality_diagnostic_downstream_actions" to "service_role";
grant TRIGGER on table "public"."quality_diagnostic_downstream_actions" to "service_role";
grant TRUNCATE on table "public"."quality_diagnostic_downstream_actions" to "service_role";
grant UPDATE on table "public"."quality_diagnostic_downstream_actions" to "service_role";
grant DELETE on table "public"."quality_diagnostic_evidence" to "anon";
grant INSERT on table "public"."quality_diagnostic_evidence" to "anon";
grant MAINTAIN on table "public"."quality_diagnostic_evidence" to "anon";
grant REFERENCES on table "public"."quality_diagnostic_evidence" to "anon";
grant SELECT on table "public"."quality_diagnostic_evidence" to "anon";
grant TRIGGER on table "public"."quality_diagnostic_evidence" to "anon";
grant TRUNCATE on table "public"."quality_diagnostic_evidence" to "anon";
grant UPDATE on table "public"."quality_diagnostic_evidence" to "anon";
grant DELETE on table "public"."quality_diagnostic_evidence" to "authenticated";
grant INSERT on table "public"."quality_diagnostic_evidence" to "authenticated";
grant MAINTAIN on table "public"."quality_diagnostic_evidence" to "authenticated";
grant REFERENCES on table "public"."quality_diagnostic_evidence" to "authenticated";
grant SELECT on table "public"."quality_diagnostic_evidence" to "authenticated";
grant TRIGGER on table "public"."quality_diagnostic_evidence" to "authenticated";
grant TRUNCATE on table "public"."quality_diagnostic_evidence" to "authenticated";
grant UPDATE on table "public"."quality_diagnostic_evidence" to "authenticated";
grant DELETE on table "public"."quality_diagnostic_evidence" to "service_role";
grant INSERT on table "public"."quality_diagnostic_evidence" to "service_role";
grant MAINTAIN on table "public"."quality_diagnostic_evidence" to "service_role";
grant REFERENCES on table "public"."quality_diagnostic_evidence" to "service_role";
grant SELECT on table "public"."quality_diagnostic_evidence" to "service_role";
grant TRIGGER on table "public"."quality_diagnostic_evidence" to "service_role";
grant TRUNCATE on table "public"."quality_diagnostic_evidence" to "service_role";
grant UPDATE on table "public"."quality_diagnostic_evidence" to "service_role";
grant DELETE on table "public"."rate_limit_buckets" to "anon";
grant INSERT on table "public"."rate_limit_buckets" to "anon";
grant MAINTAIN on table "public"."rate_limit_buckets" to "anon";
grant REFERENCES on table "public"."rate_limit_buckets" to "anon";
grant SELECT on table "public"."rate_limit_buckets" to "anon";
grant TRIGGER on table "public"."rate_limit_buckets" to "anon";
grant TRUNCATE on table "public"."rate_limit_buckets" to "anon";
grant UPDATE on table "public"."rate_limit_buckets" to "anon";
grant DELETE on table "public"."rate_limit_buckets" to "authenticated";
grant INSERT on table "public"."rate_limit_buckets" to "authenticated";
grant MAINTAIN on table "public"."rate_limit_buckets" to "authenticated";
grant REFERENCES on table "public"."rate_limit_buckets" to "authenticated";
grant SELECT on table "public"."rate_limit_buckets" to "authenticated";
grant TRIGGER on table "public"."rate_limit_buckets" to "authenticated";
grant TRUNCATE on table "public"."rate_limit_buckets" to "authenticated";
grant UPDATE on table "public"."rate_limit_buckets" to "authenticated";
grant DELETE on table "public"."rate_limit_buckets" to "service_role";
grant INSERT on table "public"."rate_limit_buckets" to "service_role";
grant MAINTAIN on table "public"."rate_limit_buckets" to "service_role";
grant REFERENCES on table "public"."rate_limit_buckets" to "service_role";
grant SELECT on table "public"."rate_limit_buckets" to "service_role";
grant TRIGGER on table "public"."rate_limit_buckets" to "service_role";
grant TRUNCATE on table "public"."rate_limit_buckets" to "service_role";
grant UPDATE on table "public"."rate_limit_buckets" to "service_role";
grant DELETE on table "public"."record_comments" to "anon";
grant INSERT on table "public"."record_comments" to "anon";
grant MAINTAIN on table "public"."record_comments" to "anon";
grant REFERENCES on table "public"."record_comments" to "anon";
grant SELECT on table "public"."record_comments" to "anon";
grant TRIGGER on table "public"."record_comments" to "anon";
grant TRUNCATE on table "public"."record_comments" to "anon";
grant UPDATE on table "public"."record_comments" to "anon";
grant DELETE on table "public"."record_comments" to "authenticated";
grant INSERT on table "public"."record_comments" to "authenticated";
grant MAINTAIN on table "public"."record_comments" to "authenticated";
grant REFERENCES on table "public"."record_comments" to "authenticated";
grant SELECT on table "public"."record_comments" to "authenticated";
grant TRIGGER on table "public"."record_comments" to "authenticated";
grant TRUNCATE on table "public"."record_comments" to "authenticated";
grant UPDATE on table "public"."record_comments" to "authenticated";
grant DELETE on table "public"."record_comments" to "service_role";
grant INSERT on table "public"."record_comments" to "service_role";
grant MAINTAIN on table "public"."record_comments" to "service_role";
grant REFERENCES on table "public"."record_comments" to "service_role";
grant SELECT on table "public"."record_comments" to "service_role";
grant TRIGGER on table "public"."record_comments" to "service_role";
grant TRUNCATE on table "public"."record_comments" to "service_role";
grant UPDATE on table "public"."record_comments" to "service_role";
grant DELETE on table "public"."role_capabilities" to "anon";
grant INSERT on table "public"."role_capabilities" to "anon";
grant MAINTAIN on table "public"."role_capabilities" to "anon";
grant REFERENCES on table "public"."role_capabilities" to "anon";
grant SELECT on table "public"."role_capabilities" to "anon";
grant TRIGGER on table "public"."role_capabilities" to "anon";
grant TRUNCATE on table "public"."role_capabilities" to "anon";
grant UPDATE on table "public"."role_capabilities" to "anon";
grant DELETE on table "public"."role_capabilities" to "authenticated";
grant INSERT on table "public"."role_capabilities" to "authenticated";
grant MAINTAIN on table "public"."role_capabilities" to "authenticated";
grant REFERENCES on table "public"."role_capabilities" to "authenticated";
grant SELECT on table "public"."role_capabilities" to "authenticated";
grant TRIGGER on table "public"."role_capabilities" to "authenticated";
grant TRUNCATE on table "public"."role_capabilities" to "authenticated";
grant UPDATE on table "public"."role_capabilities" to "authenticated";
grant DELETE on table "public"."role_capabilities" to "service_role";
grant INSERT on table "public"."role_capabilities" to "service_role";
grant MAINTAIN on table "public"."role_capabilities" to "service_role";
grant REFERENCES on table "public"."role_capabilities" to "service_role";
grant SELECT on table "public"."role_capabilities" to "service_role";
grant TRIGGER on table "public"."role_capabilities" to "service_role";
grant TRUNCATE on table "public"."role_capabilities" to "service_role";
grant UPDATE on table "public"."role_capabilities" to "service_role";
grant DELETE on table "public"."roles" to "anon";
grant INSERT on table "public"."roles" to "anon";
grant MAINTAIN on table "public"."roles" to "anon";
grant REFERENCES on table "public"."roles" to "anon";
grant SELECT on table "public"."roles" to "anon";
grant TRIGGER on table "public"."roles" to "anon";
grant TRUNCATE on table "public"."roles" to "anon";
grant UPDATE on table "public"."roles" to "anon";
grant DELETE on table "public"."roles" to "authenticated";
grant INSERT on table "public"."roles" to "authenticated";
grant MAINTAIN on table "public"."roles" to "authenticated";
grant REFERENCES on table "public"."roles" to "authenticated";
grant SELECT on table "public"."roles" to "authenticated";
grant TRIGGER on table "public"."roles" to "authenticated";
grant TRUNCATE on table "public"."roles" to "authenticated";
grant UPDATE on table "public"."roles" to "authenticated";
grant DELETE on table "public"."roles" to "service_role";
grant INSERT on table "public"."roles" to "service_role";
grant MAINTAIN on table "public"."roles" to "service_role";
grant REFERENCES on table "public"."roles" to "service_role";
grant SELECT on table "public"."roles" to "service_role";
grant TRIGGER on table "public"."roles" to "service_role";
grant TRUNCATE on table "public"."roles" to "service_role";
grant UPDATE on table "public"."roles" to "service_role";
grant DELETE on table "public"."route_permissions" to "anon";
grant INSERT on table "public"."route_permissions" to "anon";
grant MAINTAIN on table "public"."route_permissions" to "anon";
grant REFERENCES on table "public"."route_permissions" to "anon";
grant SELECT on table "public"."route_permissions" to "anon";
grant TRIGGER on table "public"."route_permissions" to "anon";
grant TRUNCATE on table "public"."route_permissions" to "anon";
grant UPDATE on table "public"."route_permissions" to "anon";
grant DELETE on table "public"."route_permissions" to "authenticated";
grant INSERT on table "public"."route_permissions" to "authenticated";
grant MAINTAIN on table "public"."route_permissions" to "authenticated";
grant REFERENCES on table "public"."route_permissions" to "authenticated";
grant SELECT on table "public"."route_permissions" to "authenticated";
grant TRIGGER on table "public"."route_permissions" to "authenticated";
grant TRUNCATE on table "public"."route_permissions" to "authenticated";
grant UPDATE on table "public"."route_permissions" to "authenticated";
grant DELETE on table "public"."route_permissions" to "service_role";
grant INSERT on table "public"."route_permissions" to "service_role";
grant MAINTAIN on table "public"."route_permissions" to "service_role";
grant REFERENCES on table "public"."route_permissions" to "service_role";
grant SELECT on table "public"."route_permissions" to "service_role";
grant TRIGGER on table "public"."route_permissions" to "service_role";
grant TRUNCATE on table "public"."route_permissions" to "service_role";
grant UPDATE on table "public"."route_permissions" to "service_role";
grant DELETE on table "public"."settlement_items" to "anon";
grant INSERT on table "public"."settlement_items" to "anon";
grant MAINTAIN on table "public"."settlement_items" to "anon";
grant REFERENCES on table "public"."settlement_items" to "anon";
grant SELECT on table "public"."settlement_items" to "anon";
grant TRIGGER on table "public"."settlement_items" to "anon";
grant TRUNCATE on table "public"."settlement_items" to "anon";
grant UPDATE on table "public"."settlement_items" to "anon";
grant DELETE on table "public"."settlement_items" to "authenticated";
grant INSERT on table "public"."settlement_items" to "authenticated";
grant MAINTAIN on table "public"."settlement_items" to "authenticated";
grant REFERENCES on table "public"."settlement_items" to "authenticated";
grant SELECT on table "public"."settlement_items" to "authenticated";
grant TRIGGER on table "public"."settlement_items" to "authenticated";
grant TRUNCATE on table "public"."settlement_items" to "authenticated";
grant UPDATE on table "public"."settlement_items" to "authenticated";
grant DELETE on table "public"."settlement_items" to "service_role";
grant INSERT on table "public"."settlement_items" to "service_role";
grant MAINTAIN on table "public"."settlement_items" to "service_role";
grant REFERENCES on table "public"."settlement_items" to "service_role";
grant SELECT on table "public"."settlement_items" to "service_role";
grant TRIGGER on table "public"."settlement_items" to "service_role";
grant TRUNCATE on table "public"."settlement_items" to "service_role";
grant UPDATE on table "public"."settlement_items" to "service_role";
grant DELETE on table "public"."settlements" to "anon";
grant INSERT on table "public"."settlements" to "anon";
grant MAINTAIN on table "public"."settlements" to "anon";
grant REFERENCES on table "public"."settlements" to "anon";
grant SELECT on table "public"."settlements" to "anon";
grant TRIGGER on table "public"."settlements" to "anon";
grant TRUNCATE on table "public"."settlements" to "anon";
grant UPDATE on table "public"."settlements" to "anon";
grant DELETE on table "public"."settlements" to "authenticated";
grant INSERT on table "public"."settlements" to "authenticated";
grant MAINTAIN on table "public"."settlements" to "authenticated";
grant REFERENCES on table "public"."settlements" to "authenticated";
grant SELECT on table "public"."settlements" to "authenticated";
grant TRIGGER on table "public"."settlements" to "authenticated";
grant TRUNCATE on table "public"."settlements" to "authenticated";
grant UPDATE on table "public"."settlements" to "authenticated";
grant DELETE on table "public"."settlements" to "service_role";
grant INSERT on table "public"."settlements" to "service_role";
grant MAINTAIN on table "public"."settlements" to "service_role";
grant REFERENCES on table "public"."settlements" to "service_role";
grant SELECT on table "public"."settlements" to "service_role";
grant TRIGGER on table "public"."settlements" to "service_role";
grant TRUNCATE on table "public"."settlements" to "service_role";
grant UPDATE on table "public"."settlements" to "service_role";
grant DELETE on table "public"."sla_instances" to "anon";
grant INSERT on table "public"."sla_instances" to "anon";
grant MAINTAIN on table "public"."sla_instances" to "anon";
grant REFERENCES on table "public"."sla_instances" to "anon";
grant SELECT on table "public"."sla_instances" to "anon";
grant TRIGGER on table "public"."sla_instances" to "anon";
grant TRUNCATE on table "public"."sla_instances" to "anon";
grant UPDATE on table "public"."sla_instances" to "anon";
grant DELETE on table "public"."sla_instances" to "authenticated";
grant INSERT on table "public"."sla_instances" to "authenticated";
grant MAINTAIN on table "public"."sla_instances" to "authenticated";
grant REFERENCES on table "public"."sla_instances" to "authenticated";
grant SELECT on table "public"."sla_instances" to "authenticated";
grant TRIGGER on table "public"."sla_instances" to "authenticated";
grant TRUNCATE on table "public"."sla_instances" to "authenticated";
grant UPDATE on table "public"."sla_instances" to "authenticated";
grant DELETE on table "public"."sla_instances" to "service_role";
grant INSERT on table "public"."sla_instances" to "service_role";
grant MAINTAIN on table "public"."sla_instances" to "service_role";
grant REFERENCES on table "public"."sla_instances" to "service_role";
grant SELECT on table "public"."sla_instances" to "service_role";
grant TRIGGER on table "public"."sla_instances" to "service_role";
grant TRUNCATE on table "public"."sla_instances" to "service_role";
grant UPDATE on table "public"."sla_instances" to "service_role";
grant DELETE on table "public"."sop_cards" to "anon";
grant INSERT on table "public"."sop_cards" to "anon";
grant MAINTAIN on table "public"."sop_cards" to "anon";
grant REFERENCES on table "public"."sop_cards" to "anon";
grant SELECT on table "public"."sop_cards" to "anon";
grant TRIGGER on table "public"."sop_cards" to "anon";
grant TRUNCATE on table "public"."sop_cards" to "anon";
grant UPDATE on table "public"."sop_cards" to "anon";
grant DELETE on table "public"."sop_cards" to "authenticated";
grant INSERT on table "public"."sop_cards" to "authenticated";
grant MAINTAIN on table "public"."sop_cards" to "authenticated";
grant REFERENCES on table "public"."sop_cards" to "authenticated";
grant SELECT on table "public"."sop_cards" to "authenticated";
grant TRIGGER on table "public"."sop_cards" to "authenticated";
grant TRUNCATE on table "public"."sop_cards" to "authenticated";
grant UPDATE on table "public"."sop_cards" to "authenticated";
grant DELETE on table "public"."sop_cards" to "service_role";
grant INSERT on table "public"."sop_cards" to "service_role";
grant MAINTAIN on table "public"."sop_cards" to "service_role";
grant REFERENCES on table "public"."sop_cards" to "service_role";
grant SELECT on table "public"."sop_cards" to "service_role";
grant TRIGGER on table "public"."sop_cards" to "service_role";
grant TRUNCATE on table "public"."sop_cards" to "service_role";
grant UPDATE on table "public"."sop_cards" to "service_role";
grant DELETE on table "public"."sop_metric_tolerances" to "anon";
grant INSERT on table "public"."sop_metric_tolerances" to "anon";
grant MAINTAIN on table "public"."sop_metric_tolerances" to "anon";
grant REFERENCES on table "public"."sop_metric_tolerances" to "anon";
grant SELECT on table "public"."sop_metric_tolerances" to "anon";
grant TRIGGER on table "public"."sop_metric_tolerances" to "anon";
grant TRUNCATE on table "public"."sop_metric_tolerances" to "anon";
grant UPDATE on table "public"."sop_metric_tolerances" to "anon";
grant DELETE on table "public"."sop_metric_tolerances" to "authenticated";
grant INSERT on table "public"."sop_metric_tolerances" to "authenticated";
grant MAINTAIN on table "public"."sop_metric_tolerances" to "authenticated";
grant REFERENCES on table "public"."sop_metric_tolerances" to "authenticated";
grant SELECT on table "public"."sop_metric_tolerances" to "authenticated";
grant TRIGGER on table "public"."sop_metric_tolerances" to "authenticated";
grant TRUNCATE on table "public"."sop_metric_tolerances" to "authenticated";
grant UPDATE on table "public"."sop_metric_tolerances" to "authenticated";
grant DELETE on table "public"."sop_metric_tolerances" to "service_role";
grant INSERT on table "public"."sop_metric_tolerances" to "service_role";
grant MAINTAIN on table "public"."sop_metric_tolerances" to "service_role";
grant REFERENCES on table "public"."sop_metric_tolerances" to "service_role";
grant SELECT on table "public"."sop_metric_tolerances" to "service_role";
grant TRIGGER on table "public"."sop_metric_tolerances" to "service_role";
grant TRUNCATE on table "public"."sop_metric_tolerances" to "service_role";
grant UPDATE on table "public"."sop_metric_tolerances" to "service_role";
grant DELETE on table "public"."system_audit_logs" to "anon";
grant INSERT on table "public"."system_audit_logs" to "anon";
grant MAINTAIN on table "public"."system_audit_logs" to "anon";
grant REFERENCES on table "public"."system_audit_logs" to "anon";
grant SELECT on table "public"."system_audit_logs" to "anon";
grant TRIGGER on table "public"."system_audit_logs" to "anon";
grant TRUNCATE on table "public"."system_audit_logs" to "anon";
grant UPDATE on table "public"."system_audit_logs" to "anon";
grant DELETE on table "public"."system_audit_logs" to "authenticated";
grant INSERT on table "public"."system_audit_logs" to "authenticated";
grant MAINTAIN on table "public"."system_audit_logs" to "authenticated";
grant REFERENCES on table "public"."system_audit_logs" to "authenticated";
grant SELECT on table "public"."system_audit_logs" to "authenticated";
grant TRIGGER on table "public"."system_audit_logs" to "authenticated";
grant TRUNCATE on table "public"."system_audit_logs" to "authenticated";
grant UPDATE on table "public"."system_audit_logs" to "authenticated";
grant DELETE on table "public"."system_audit_logs" to "service_role";
grant INSERT on table "public"."system_audit_logs" to "service_role";
grant MAINTAIN on table "public"."system_audit_logs" to "service_role";
grant REFERENCES on table "public"."system_audit_logs" to "service_role";
grant SELECT on table "public"."system_audit_logs" to "service_role";
grant TRIGGER on table "public"."system_audit_logs" to "service_role";
grant TRUNCATE on table "public"."system_audit_logs" to "service_role";
grant UPDATE on table "public"."system_audit_logs" to "service_role";
grant DELETE on table "public"."task_dependencies" to "anon";
grant INSERT on table "public"."task_dependencies" to "anon";
grant MAINTAIN on table "public"."task_dependencies" to "anon";
grant REFERENCES on table "public"."task_dependencies" to "anon";
grant SELECT on table "public"."task_dependencies" to "anon";
grant TRIGGER on table "public"."task_dependencies" to "anon";
grant TRUNCATE on table "public"."task_dependencies" to "anon";
grant UPDATE on table "public"."task_dependencies" to "anon";
grant DELETE on table "public"."task_dependencies" to "authenticated";
grant INSERT on table "public"."task_dependencies" to "authenticated";
grant MAINTAIN on table "public"."task_dependencies" to "authenticated";
grant REFERENCES on table "public"."task_dependencies" to "authenticated";
grant SELECT on table "public"."task_dependencies" to "authenticated";
grant TRIGGER on table "public"."task_dependencies" to "authenticated";
grant TRUNCATE on table "public"."task_dependencies" to "authenticated";
grant UPDATE on table "public"."task_dependencies" to "authenticated";
grant DELETE on table "public"."task_dependencies" to "service_role";
grant INSERT on table "public"."task_dependencies" to "service_role";
grant MAINTAIN on table "public"."task_dependencies" to "service_role";
grant REFERENCES on table "public"."task_dependencies" to "service_role";
grant SELECT on table "public"."task_dependencies" to "service_role";
grant TRIGGER on table "public"."task_dependencies" to "service_role";
grant TRUNCATE on table "public"."task_dependencies" to "service_role";
grant UPDATE on table "public"."task_dependencies" to "service_role";
grant DELETE on table "public"."task_items" to "anon";
grant INSERT on table "public"."task_items" to "anon";
grant MAINTAIN on table "public"."task_items" to "anon";
grant REFERENCES on table "public"."task_items" to "anon";
grant SELECT on table "public"."task_items" to "anon";
grant TRIGGER on table "public"."task_items" to "anon";
grant TRUNCATE on table "public"."task_items" to "anon";
grant UPDATE on table "public"."task_items" to "anon";
grant DELETE on table "public"."task_items" to "authenticated";
grant INSERT on table "public"."task_items" to "authenticated";
grant MAINTAIN on table "public"."task_items" to "authenticated";
grant REFERENCES on table "public"."task_items" to "authenticated";
grant SELECT on table "public"."task_items" to "authenticated";
grant TRIGGER on table "public"."task_items" to "authenticated";
grant TRUNCATE on table "public"."task_items" to "authenticated";
grant UPDATE on table "public"."task_items" to "authenticated";
grant DELETE on table "public"."task_items" to "service_role";
grant INSERT on table "public"."task_items" to "service_role";
grant MAINTAIN on table "public"."task_items" to "service_role";
grant REFERENCES on table "public"."task_items" to "service_role";
grant SELECT on table "public"."task_items" to "service_role";
grant TRIGGER on table "public"."task_items" to "service_role";
grant TRUNCATE on table "public"."task_items" to "service_role";
grant UPDATE on table "public"."task_items" to "service_role";
grant DELETE on table "public"."team_members" to "anon";
grant INSERT on table "public"."team_members" to "anon";
grant MAINTAIN on table "public"."team_members" to "anon";
grant REFERENCES on table "public"."team_members" to "anon";
grant SELECT on table "public"."team_members" to "anon";
grant TRIGGER on table "public"."team_members" to "anon";
grant TRUNCATE on table "public"."team_members" to "anon";
grant UPDATE on table "public"."team_members" to "anon";
grant DELETE on table "public"."team_members" to "authenticated";
grant INSERT on table "public"."team_members" to "authenticated";
grant MAINTAIN on table "public"."team_members" to "authenticated";
grant REFERENCES on table "public"."team_members" to "authenticated";
grant SELECT on table "public"."team_members" to "authenticated";
grant TRIGGER on table "public"."team_members" to "authenticated";
grant TRUNCATE on table "public"."team_members" to "authenticated";
grant UPDATE on table "public"."team_members" to "authenticated";
grant DELETE on table "public"."team_members" to "service_role";
grant INSERT on table "public"."team_members" to "service_role";
grant MAINTAIN on table "public"."team_members" to "service_role";
grant REFERENCES on table "public"."team_members" to "service_role";
grant SELECT on table "public"."team_members" to "service_role";
grant TRIGGER on table "public"."team_members" to "service_role";
grant TRUNCATE on table "public"."team_members" to "service_role";
grant UPDATE on table "public"."team_members" to "service_role";
grant DELETE on table "public"."tech_reference" to "anon";
grant INSERT on table "public"."tech_reference" to "anon";
grant MAINTAIN on table "public"."tech_reference" to "anon";
grant REFERENCES on table "public"."tech_reference" to "anon";
grant SELECT on table "public"."tech_reference" to "anon";
grant TRIGGER on table "public"."tech_reference" to "anon";
grant TRUNCATE on table "public"."tech_reference" to "anon";
grant UPDATE on table "public"."tech_reference" to "anon";
grant DELETE on table "public"."tech_reference" to "authenticated";
grant INSERT on table "public"."tech_reference" to "authenticated";
grant MAINTAIN on table "public"."tech_reference" to "authenticated";
grant REFERENCES on table "public"."tech_reference" to "authenticated";
grant SELECT on table "public"."tech_reference" to "authenticated";
grant TRIGGER on table "public"."tech_reference" to "authenticated";
grant TRUNCATE on table "public"."tech_reference" to "authenticated";
grant UPDATE on table "public"."tech_reference" to "authenticated";
grant DELETE on table "public"."tech_reference" to "service_role";
grant INSERT on table "public"."tech_reference" to "service_role";
grant MAINTAIN on table "public"."tech_reference" to "service_role";
grant REFERENCES on table "public"."tech_reference" to "service_role";
grant SELECT on table "public"."tech_reference" to "service_role";
grant TRIGGER on table "public"."tech_reference" to "service_role";
grant TRUNCATE on table "public"."tech_reference" to "service_role";
grant UPDATE on table "public"."tech_reference" to "service_role";
grant DELETE on table "public"."trusted_supply_candidates" to "anon";
grant INSERT on table "public"."trusted_supply_candidates" to "anon";
grant MAINTAIN on table "public"."trusted_supply_candidates" to "anon";
grant REFERENCES on table "public"."trusted_supply_candidates" to "anon";
grant SELECT on table "public"."trusted_supply_candidates" to "anon";
grant TRIGGER on table "public"."trusted_supply_candidates" to "anon";
grant TRUNCATE on table "public"."trusted_supply_candidates" to "anon";
grant UPDATE on table "public"."trusted_supply_candidates" to "anon";
grant DELETE on table "public"."trusted_supply_candidates" to "authenticated";
grant INSERT on table "public"."trusted_supply_candidates" to "authenticated";
grant MAINTAIN on table "public"."trusted_supply_candidates" to "authenticated";
grant REFERENCES on table "public"."trusted_supply_candidates" to "authenticated";
grant SELECT on table "public"."trusted_supply_candidates" to "authenticated";
grant TRIGGER on table "public"."trusted_supply_candidates" to "authenticated";
grant TRUNCATE on table "public"."trusted_supply_candidates" to "authenticated";
grant UPDATE on table "public"."trusted_supply_candidates" to "authenticated";
grant DELETE on table "public"."trusted_supply_candidates" to "service_role";
grant INSERT on table "public"."trusted_supply_candidates" to "service_role";
grant MAINTAIN on table "public"."trusted_supply_candidates" to "service_role";
grant REFERENCES on table "public"."trusted_supply_candidates" to "service_role";
grant SELECT on table "public"."trusted_supply_candidates" to "service_role";
grant TRIGGER on table "public"."trusted_supply_candidates" to "service_role";
grant TRUNCATE on table "public"."trusted_supply_candidates" to "service_role";
grant UPDATE on table "public"."trusted_supply_candidates" to "service_role";
grant DELETE on table "public"."uat_script_runs" to "anon";
grant INSERT on table "public"."uat_script_runs" to "anon";
grant MAINTAIN on table "public"."uat_script_runs" to "anon";
grant REFERENCES on table "public"."uat_script_runs" to "anon";
grant SELECT on table "public"."uat_script_runs" to "anon";
grant TRIGGER on table "public"."uat_script_runs" to "anon";
grant TRUNCATE on table "public"."uat_script_runs" to "anon";
grant UPDATE on table "public"."uat_script_runs" to "anon";
grant DELETE on table "public"."uat_script_runs" to "authenticated";
grant INSERT on table "public"."uat_script_runs" to "authenticated";
grant MAINTAIN on table "public"."uat_script_runs" to "authenticated";
grant REFERENCES on table "public"."uat_script_runs" to "authenticated";
grant SELECT on table "public"."uat_script_runs" to "authenticated";
grant TRIGGER on table "public"."uat_script_runs" to "authenticated";
grant TRUNCATE on table "public"."uat_script_runs" to "authenticated";
grant UPDATE on table "public"."uat_script_runs" to "authenticated";
grant DELETE on table "public"."uat_script_runs" to "service_role";
grant INSERT on table "public"."uat_script_runs" to "service_role";
grant MAINTAIN on table "public"."uat_script_runs" to "service_role";
grant REFERENCES on table "public"."uat_script_runs" to "service_role";
grant SELECT on table "public"."uat_script_runs" to "service_role";
grant TRIGGER on table "public"."uat_script_runs" to "service_role";
grant TRUNCATE on table "public"."uat_script_runs" to "service_role";
grant UPDATE on table "public"."uat_script_runs" to "service_role";
grant DELETE on table "public"."uat_script_step_results" to "anon";
grant INSERT on table "public"."uat_script_step_results" to "anon";
grant MAINTAIN on table "public"."uat_script_step_results" to "anon";
grant REFERENCES on table "public"."uat_script_step_results" to "anon";
grant SELECT on table "public"."uat_script_step_results" to "anon";
grant TRIGGER on table "public"."uat_script_step_results" to "anon";
grant TRUNCATE on table "public"."uat_script_step_results" to "anon";
grant UPDATE on table "public"."uat_script_step_results" to "anon";
grant DELETE on table "public"."uat_script_step_results" to "authenticated";
grant INSERT on table "public"."uat_script_step_results" to "authenticated";
grant MAINTAIN on table "public"."uat_script_step_results" to "authenticated";
grant REFERENCES on table "public"."uat_script_step_results" to "authenticated";
grant SELECT on table "public"."uat_script_step_results" to "authenticated";
grant TRIGGER on table "public"."uat_script_step_results" to "authenticated";
grant TRUNCATE on table "public"."uat_script_step_results" to "authenticated";
grant UPDATE on table "public"."uat_script_step_results" to "authenticated";
grant DELETE on table "public"."uat_script_step_results" to "service_role";
grant INSERT on table "public"."uat_script_step_results" to "service_role";
grant MAINTAIN on table "public"."uat_script_step_results" to "service_role";
grant REFERENCES on table "public"."uat_script_step_results" to "service_role";
grant SELECT on table "public"."uat_script_step_results" to "service_role";
grant TRIGGER on table "public"."uat_script_step_results" to "service_role";
grant TRUNCATE on table "public"."uat_script_step_results" to "service_role";
grant UPDATE on table "public"."uat_script_step_results" to "service_role";
grant DELETE on table "public"."user_preferences" to "anon";
grant INSERT on table "public"."user_preferences" to "anon";
grant MAINTAIN on table "public"."user_preferences" to "anon";
grant REFERENCES on table "public"."user_preferences" to "anon";
grant SELECT on table "public"."user_preferences" to "anon";
grant TRIGGER on table "public"."user_preferences" to "anon";
grant TRUNCATE on table "public"."user_preferences" to "anon";
grant UPDATE on table "public"."user_preferences" to "anon";
grant DELETE on table "public"."user_preferences" to "authenticated";
grant INSERT on table "public"."user_preferences" to "authenticated";
grant MAINTAIN on table "public"."user_preferences" to "authenticated";
grant REFERENCES on table "public"."user_preferences" to "authenticated";
grant SELECT on table "public"."user_preferences" to "authenticated";
grant TRIGGER on table "public"."user_preferences" to "authenticated";
grant TRUNCATE on table "public"."user_preferences" to "authenticated";
grant UPDATE on table "public"."user_preferences" to "authenticated";
grant DELETE on table "public"."user_preferences" to "service_role";
grant INSERT on table "public"."user_preferences" to "service_role";
grant MAINTAIN on table "public"."user_preferences" to "service_role";
grant REFERENCES on table "public"."user_preferences" to "service_role";
grant SELECT on table "public"."user_preferences" to "service_role";
grant TRIGGER on table "public"."user_preferences" to "service_role";
grant TRUNCATE on table "public"."user_preferences" to "service_role";
grant UPDATE on table "public"."user_preferences" to "service_role";
grant DELETE on table "public"."user_roles" to "anon";
grant INSERT on table "public"."user_roles" to "anon";
grant MAINTAIN on table "public"."user_roles" to "anon";
grant REFERENCES on table "public"."user_roles" to "anon";
grant SELECT on table "public"."user_roles" to "anon";
grant TRIGGER on table "public"."user_roles" to "anon";
grant TRUNCATE on table "public"."user_roles" to "anon";
grant UPDATE on table "public"."user_roles" to "anon";
grant DELETE on table "public"."user_roles" to "authenticated";
grant INSERT on table "public"."user_roles" to "authenticated";
grant MAINTAIN on table "public"."user_roles" to "authenticated";
grant REFERENCES on table "public"."user_roles" to "authenticated";
grant SELECT on table "public"."user_roles" to "authenticated";
grant TRIGGER on table "public"."user_roles" to "authenticated";
grant TRUNCATE on table "public"."user_roles" to "authenticated";
grant UPDATE on table "public"."user_roles" to "authenticated";
grant DELETE on table "public"."user_roles" to "service_role";
grant INSERT on table "public"."user_roles" to "service_role";
grant MAINTAIN on table "public"."user_roles" to "service_role";
grant REFERENCES on table "public"."user_roles" to "service_role";
grant SELECT on table "public"."user_roles" to "service_role";
grant TRIGGER on table "public"."user_roles" to "service_role";
grant TRUNCATE on table "public"."user_roles" to "service_role";
grant UPDATE on table "public"."user_roles" to "service_role";
grant DELETE on table "public"."vw_expiring_contracts" to "anon";
grant INSERT on table "public"."vw_expiring_contracts" to "anon";
grant MAINTAIN on table "public"."vw_expiring_contracts" to "anon";
grant REFERENCES on table "public"."vw_expiring_contracts" to "anon";
grant SELECT on table "public"."vw_expiring_contracts" to "anon";
grant TRIGGER on table "public"."vw_expiring_contracts" to "anon";
grant TRUNCATE on table "public"."vw_expiring_contracts" to "anon";
grant UPDATE on table "public"."vw_expiring_contracts" to "anon";
grant DELETE on table "public"."vw_expiring_contracts" to "authenticated";
grant INSERT on table "public"."vw_expiring_contracts" to "authenticated";
grant MAINTAIN on table "public"."vw_expiring_contracts" to "authenticated";
grant REFERENCES on table "public"."vw_expiring_contracts" to "authenticated";
grant SELECT on table "public"."vw_expiring_contracts" to "authenticated";
grant TRIGGER on table "public"."vw_expiring_contracts" to "authenticated";
grant TRUNCATE on table "public"."vw_expiring_contracts" to "authenticated";
grant UPDATE on table "public"."vw_expiring_contracts" to "authenticated";
grant DELETE on table "public"."vw_expiring_contracts" to "service_role";
grant INSERT on table "public"."vw_expiring_contracts" to "service_role";
grant MAINTAIN on table "public"."vw_expiring_contracts" to "service_role";
grant REFERENCES on table "public"."vw_expiring_contracts" to "service_role";
grant SELECT on table "public"."vw_expiring_contracts" to "service_role";
grant TRIGGER on table "public"."vw_expiring_contracts" to "service_role";
grant TRUNCATE on table "public"."vw_expiring_contracts" to "service_role";
grant UPDATE on table "public"."vw_expiring_contracts" to "service_role";
grant DELETE on table "public"."wizard_progress_records" to "anon";
grant INSERT on table "public"."wizard_progress_records" to "anon";
grant MAINTAIN on table "public"."wizard_progress_records" to "anon";
grant REFERENCES on table "public"."wizard_progress_records" to "anon";
grant SELECT on table "public"."wizard_progress_records" to "anon";
grant TRIGGER on table "public"."wizard_progress_records" to "anon";
grant TRUNCATE on table "public"."wizard_progress_records" to "anon";
grant UPDATE on table "public"."wizard_progress_records" to "anon";
grant DELETE on table "public"."wizard_progress_records" to "authenticated";
grant INSERT on table "public"."wizard_progress_records" to "authenticated";
grant MAINTAIN on table "public"."wizard_progress_records" to "authenticated";
grant REFERENCES on table "public"."wizard_progress_records" to "authenticated";
grant SELECT on table "public"."wizard_progress_records" to "authenticated";
grant TRIGGER on table "public"."wizard_progress_records" to "authenticated";
grant TRUNCATE on table "public"."wizard_progress_records" to "authenticated";
grant UPDATE on table "public"."wizard_progress_records" to "authenticated";
grant DELETE on table "public"."wizard_progress_records" to "service_role";
grant INSERT on table "public"."wizard_progress_records" to "service_role";
grant MAINTAIN on table "public"."wizard_progress_records" to "service_role";
grant REFERENCES on table "public"."wizard_progress_records" to "service_role";
grant SELECT on table "public"."wizard_progress_records" to "service_role";
grant TRIGGER on table "public"."wizard_progress_records" to "service_role";
grant TRUNCATE on table "public"."wizard_progress_records" to "service_role";
grant UPDATE on table "public"."wizard_progress_records" to "service_role";
grant DELETE on table "public"."work_item_events" to "anon";
grant INSERT on table "public"."work_item_events" to "anon";
grant MAINTAIN on table "public"."work_item_events" to "anon";
grant REFERENCES on table "public"."work_item_events" to "anon";
grant SELECT on table "public"."work_item_events" to "anon";
grant TRIGGER on table "public"."work_item_events" to "anon";
grant TRUNCATE on table "public"."work_item_events" to "anon";
grant UPDATE on table "public"."work_item_events" to "anon";
grant DELETE on table "public"."work_item_events" to "authenticated";
grant INSERT on table "public"."work_item_events" to "authenticated";
grant MAINTAIN on table "public"."work_item_events" to "authenticated";
grant REFERENCES on table "public"."work_item_events" to "authenticated";
grant SELECT on table "public"."work_item_events" to "authenticated";
grant TRIGGER on table "public"."work_item_events" to "authenticated";
grant TRUNCATE on table "public"."work_item_events" to "authenticated";
grant UPDATE on table "public"."work_item_events" to "authenticated";
grant DELETE on table "public"."work_item_events" to "service_role";
grant INSERT on table "public"."work_item_events" to "service_role";
grant MAINTAIN on table "public"."work_item_events" to "service_role";
grant REFERENCES on table "public"."work_item_events" to "service_role";
grant SELECT on table "public"."work_item_events" to "service_role";
grant TRIGGER on table "public"."work_item_events" to "service_role";
grant TRUNCATE on table "public"."work_item_events" to "service_role";
grant UPDATE on table "public"."work_item_events" to "service_role";
grant SELECT on sequence "public"."work_item_events_id_seq" to "anon";
grant UPDATE on sequence "public"."work_item_events_id_seq" to "anon";
grant USAGE on sequence "public"."work_item_events_id_seq" to "anon";
grant SELECT on sequence "public"."work_item_events_id_seq" to "authenticated";
grant UPDATE on sequence "public"."work_item_events_id_seq" to "authenticated";
grant USAGE on sequence "public"."work_item_events_id_seq" to "authenticated";
grant SELECT on sequence "public"."work_item_events_id_seq" to "service_role";
grant UPDATE on sequence "public"."work_item_events_id_seq" to "service_role";
grant USAGE on sequence "public"."work_item_events_id_seq" to "service_role";
grant DELETE on table "public"."work_item_links" to "anon";
grant INSERT on table "public"."work_item_links" to "anon";
grant MAINTAIN on table "public"."work_item_links" to "anon";
grant REFERENCES on table "public"."work_item_links" to "anon";
grant SELECT on table "public"."work_item_links" to "anon";
grant TRIGGER on table "public"."work_item_links" to "anon";
grant TRUNCATE on table "public"."work_item_links" to "anon";
grant UPDATE on table "public"."work_item_links" to "anon";
grant DELETE on table "public"."work_item_links" to "authenticated";
grant INSERT on table "public"."work_item_links" to "authenticated";
grant MAINTAIN on table "public"."work_item_links" to "authenticated";
grant REFERENCES on table "public"."work_item_links" to "authenticated";
grant SELECT on table "public"."work_item_links" to "authenticated";
grant TRIGGER on table "public"."work_item_links" to "authenticated";
grant TRUNCATE on table "public"."work_item_links" to "authenticated";
grant UPDATE on table "public"."work_item_links" to "authenticated";
grant DELETE on table "public"."work_item_links" to "service_role";
grant INSERT on table "public"."work_item_links" to "service_role";
grant MAINTAIN on table "public"."work_item_links" to "service_role";
grant REFERENCES on table "public"."work_item_links" to "service_role";
grant SELECT on table "public"."work_item_links" to "service_role";
grant TRIGGER on table "public"."work_item_links" to "service_role";
grant TRUNCATE on table "public"."work_item_links" to "service_role";
grant UPDATE on table "public"."work_item_links" to "service_role";
grant SELECT on sequence "public"."work_item_links_id_seq" to "anon";
grant UPDATE on sequence "public"."work_item_links_id_seq" to "anon";
grant USAGE on sequence "public"."work_item_links_id_seq" to "anon";
grant SELECT on sequence "public"."work_item_links_id_seq" to "authenticated";
grant UPDATE on sequence "public"."work_item_links_id_seq" to "authenticated";
grant USAGE on sequence "public"."work_item_links_id_seq" to "authenticated";
grant SELECT on sequence "public"."work_item_links_id_seq" to "service_role";
grant UPDATE on sequence "public"."work_item_links_id_seq" to "service_role";
grant USAGE on sequence "public"."work_item_links_id_seq" to "service_role";
grant DELETE on table "public"."work_items" to "anon";
grant INSERT on table "public"."work_items" to "anon";
grant MAINTAIN on table "public"."work_items" to "anon";
grant REFERENCES on table "public"."work_items" to "anon";
grant SELECT on table "public"."work_items" to "anon";
grant TRIGGER on table "public"."work_items" to "anon";
grant TRUNCATE on table "public"."work_items" to "anon";
grant UPDATE on table "public"."work_items" to "anon";
grant DELETE on table "public"."work_items" to "authenticated";
grant INSERT on table "public"."work_items" to "authenticated";
grant MAINTAIN on table "public"."work_items" to "authenticated";
grant REFERENCES on table "public"."work_items" to "authenticated";
grant SELECT on table "public"."work_items" to "authenticated";
grant TRIGGER on table "public"."work_items" to "authenticated";
grant TRUNCATE on table "public"."work_items" to "authenticated";
grant UPDATE on table "public"."work_items" to "authenticated";
grant DELETE on table "public"."work_items" to "service_role";
grant INSERT on table "public"."work_items" to "service_role";
grant MAINTAIN on table "public"."work_items" to "service_role";
grant REFERENCES on table "public"."work_items" to "service_role";
grant SELECT on table "public"."work_items" to "service_role";
grant TRIGGER on table "public"."work_items" to "service_role";
grant TRUNCATE on table "public"."work_items" to "service_role";
grant UPDATE on table "public"."work_items" to "service_role";
grant DELETE on table "public"."workflow_definitions" to "anon";
grant INSERT on table "public"."workflow_definitions" to "anon";
grant MAINTAIN on table "public"."workflow_definitions" to "anon";
grant REFERENCES on table "public"."workflow_definitions" to "anon";
grant SELECT on table "public"."workflow_definitions" to "anon";
grant TRIGGER on table "public"."workflow_definitions" to "anon";
grant TRUNCATE on table "public"."workflow_definitions" to "anon";
grant UPDATE on table "public"."workflow_definitions" to "anon";
grant DELETE on table "public"."workflow_definitions" to "authenticated";
grant INSERT on table "public"."workflow_definitions" to "authenticated";
grant MAINTAIN on table "public"."workflow_definitions" to "authenticated";
grant REFERENCES on table "public"."workflow_definitions" to "authenticated";
grant SELECT on table "public"."workflow_definitions" to "authenticated";
grant TRIGGER on table "public"."workflow_definitions" to "authenticated";
grant TRUNCATE on table "public"."workflow_definitions" to "authenticated";
grant UPDATE on table "public"."workflow_definitions" to "authenticated";
grant DELETE on table "public"."workflow_definitions" to "service_role";
grant INSERT on table "public"."workflow_definitions" to "service_role";
grant MAINTAIN on table "public"."workflow_definitions" to "service_role";
grant REFERENCES on table "public"."workflow_definitions" to "service_role";
grant SELECT on table "public"."workflow_definitions" to "service_role";
grant TRIGGER on table "public"."workflow_definitions" to "service_role";
grant TRUNCATE on table "public"."workflow_definitions" to "service_role";
grant UPDATE on table "public"."workflow_definitions" to "service_role";
grant DELETE on table "public"."workflow_gate_checks" to "anon";
grant INSERT on table "public"."workflow_gate_checks" to "anon";
grant MAINTAIN on table "public"."workflow_gate_checks" to "anon";
grant REFERENCES on table "public"."workflow_gate_checks" to "anon";
grant SELECT on table "public"."workflow_gate_checks" to "anon";
grant TRIGGER on table "public"."workflow_gate_checks" to "anon";
grant TRUNCATE on table "public"."workflow_gate_checks" to "anon";
grant UPDATE on table "public"."workflow_gate_checks" to "anon";
grant DELETE on table "public"."workflow_gate_checks" to "authenticated";
grant INSERT on table "public"."workflow_gate_checks" to "authenticated";
grant MAINTAIN on table "public"."workflow_gate_checks" to "authenticated";
grant REFERENCES on table "public"."workflow_gate_checks" to "authenticated";
grant SELECT on table "public"."workflow_gate_checks" to "authenticated";
grant TRIGGER on table "public"."workflow_gate_checks" to "authenticated";
grant TRUNCATE on table "public"."workflow_gate_checks" to "authenticated";
grant UPDATE on table "public"."workflow_gate_checks" to "authenticated";
grant DELETE on table "public"."workflow_gate_checks" to "service_role";
grant INSERT on table "public"."workflow_gate_checks" to "service_role";
grant MAINTAIN on table "public"."workflow_gate_checks" to "service_role";
grant REFERENCES on table "public"."workflow_gate_checks" to "service_role";
grant SELECT on table "public"."workflow_gate_checks" to "service_role";
grant TRIGGER on table "public"."workflow_gate_checks" to "service_role";
grant TRUNCATE on table "public"."workflow_gate_checks" to "service_role";
grant UPDATE on table "public"."workflow_gate_checks" to "service_role";
