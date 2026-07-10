-- Phase CM-1B: China Media Ecosystem seed-aware schema and RLS.
-- This migration creates an isolated opportunity pool for seed media.
-- Seed rows must not be treated as trusted supply, deal-ready inventory, or publishers.

-- =============================
-- CHINA MEDIA ECOSYSTEM DOMAIN
-- =============================

create table if not exists public.media_ecosystem_segments (
  id uuid primary key default gen_random_uuid(),
  segment_code text not null unique,
  segment_name text not null,
  description text,
  strategic_priority text not null default 'P1',
  target_advertiser_industries jsonb not null default '[]'::jsonb,
  preferred_ad_formats jsonb not null default '[]'::jsonb,
  preferred_trading_modes jsonb not null default '[]'::jsonb,
  risk_notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_media_ecosystem_segment_code check (
    segment_code in (
      'VIDEO_LONG_FORM',
      'SHORT_VIDEO_LIVE',
      'NEWS_SEARCH_BROWSER',
      'SOCIAL_COMMUNITY',
      'ECOMMERCE_RETAIL_MEDIA',
      'LOCAL_LIFE_TRAVEL',
      'GAME_H5_IAA',
      'WELLNESS_FEMALE_HEALTH',
      'UTILITY_TOOLS',
      'CTV_OTT_OEM',
      'SMART_HARDWARE',
      'AUDIO_PODCAST',
      'CAMPUS_YOUTH',
      'OUTDOOR_DOOH',
      'AI_APP_CONTENT',
      'OTHER_VERTICAL'
    )
  )
);

create table if not exists public.media_ecosystem_opportunities (
  id uuid primary key default gen_random_uuid(),
  seed_id text unique,
  media_name text not null,
  company_entity text,
  source_primary_segment_cn text,
  source_secondary_category_cn text,
  ecosystem_segment text not null references public.media_ecosystem_segments(segment_code),
  ecosystem_segment_cn text,
  media_type_initial text,
  primary_scene_initial text,
  ad_formats_if_known text,
  potential_inventory text,
  potential_integration_methods text,
  estimated_dau bigint,
  estimated_mau bigint,
  geo_coverage text,
  audience_tags jsonb not null default '[]'::jsonb,
  ecosystem_status text not null default 'ECOSYSTEM_MAPPED',
  verification_status text not null default 'UNVERIFIED',
  data_quality_level text not null default 'SEED_ONLY',
  trust_status text not null default 'NOT_VERIFIED',
  trusted_supply_candidate boolean not null default false,
  deal_ready_status text not null default 'NOT_READY',
  recommended_trading_mode text not null default 'NEEDS_REVIEW',
  seed_priority_level text,
  priority_level text not null default 'UNSCORED',
  owner_user_id uuid references public.profiles(id),
  owner_role text references public.roles(code) default 'media_manager',
  next_action text not null default 'Assign owner and complete seed verification.',
  target_contact_date date,
  last_contact_at timestamptz,
  strategic_segment_score integer not null default 0,
  user_scale_score integer not null default 0,
  ad_context_score integer not null default 0,
  integration_feasibility_score integer not null default 0,
  advertiser_demand_score integer not null default 0,
  commercial_feasibility_score integer not null default 0,
  risk_control_score integer not null default 0,
  priority_score integer generated always as (
    strategic_segment_score
    + user_scale_score
    + ad_context_score
    + integration_feasibility_score
    + advertiser_demand_score
    + commercial_feasibility_score
    + risk_control_score
  ) stored,
  priority_score_reason text,
  integration_feasibility text not null default 'unknown',
  media_contact_confirmed boolean not null default false,
  business_interest_confirmed boolean not null default false,
  ad_inventory_identified boolean not null default false,
  media_director_approved_by uuid references public.profiles(id),
  media_director_approved_at timestamptz,
  linked_publisher_id uuid references public.publishers(id),
  review_required boolean not null default false,
  seed_confidence text,
  import_batch_id text,
  source_name text,
  source_version text,
  source_file text,
  source_page integer,
  forbidden_commitments text,
  trusted_supply_link_rule text,
  pmp_trading_link_rule text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_media_ecosystem_status check (
    ecosystem_status in (
      'ECOSYSTEM_MAPPED',
      'PRIORITY_SCREENED',
      'OUTREACH_READY',
      'CONTACTED',
      'MEETING_SCHEDULED',
      'BUSINESS_QUALIFIED',
      'TECH_FEASIBILITY_CHECK',
      'TRUSTED_SUPPLY_CANDIDATE',
      'ONBOARDING_PROJECT_CREATED',
      'REJECTED',
      'ON_HOLD'
    )
  ),
  constraint chk_media_ecosystem_verification_status check (
    verification_status in ('UNVERIFIED','IN_REVIEW','VERIFIED','REJECTED')
  ),
  constraint chk_media_ecosystem_data_quality check (
    data_quality_level in ('SEED_ONLY','MANUAL_REVIEWED','OPERATOR_CONFIRMED','SOURCE_VERIFIED')
  ),
  constraint chk_media_ecosystem_trust_status check (
    trust_status in ('NOT_VERIFIED','TRUST_REVIEW','TRUSTED','REJECTED')
  ),
  constraint chk_media_ecosystem_deal_ready_status check (
    deal_ready_status in ('NOT_READY','REVIEW_REQUIRED','READY','REJECTED')
  ),
  constraint chk_media_ecosystem_recommended_trading_mode check (
    recommended_trading_mode in (
      'NEEDS_REVIEW',
      'PREFERRED_DEAL',
      'PRIVATE_AUCTION',
      'CURATED_PACKAGE',
      'PROGRAMMATIC_GUARANTEED',
      'FIXED_CPM_TEST',
      'DIRECT_IO',
      'NOT_RECOMMENDED'
    )
  ),
  constraint chk_media_ecosystem_seed_priority check (
    seed_priority_level is null or seed_priority_level in ('A','B','C','D')
  ),
  constraint chk_media_ecosystem_priority_level check (
    priority_level in ('A','B','C','D','UNSCORED')
  ),
  constraint chk_media_ecosystem_integration_feasibility check (
    integration_feasibility in ('unknown','feasible','needs_work','impossible')
  ),
  constraint chk_media_ecosystem_score_bounds check (
    strategic_segment_score between 0 and 20
    and user_scale_score between 0 and 15
    and ad_context_score between 0 and 15
    and integration_feasibility_score between 0 and 15
    and advertiser_demand_score between 0 and 15
    and commercial_feasibility_score between 0 and 10
    and risk_control_score between 0 and 10
  ),
  constraint chk_media_ecosystem_seed_only_safety check (
    data_quality_level <> 'SEED_ONLY'
    or (
      verification_status = 'UNVERIFIED'
      and trust_status = 'NOT_VERIFIED'
      and trusted_supply_candidate = false
      and deal_ready_status = 'NOT_READY'
      and recommended_trading_mode = 'NEEDS_REVIEW'
    )
  ),
  constraint chk_media_ecosystem_candidate_gate check (
    trusted_supply_candidate = false
    or (
      data_quality_level <> 'SEED_ONLY'
      and priority_score >= 70
      and media_contact_confirmed = true
      and business_interest_confirmed = true
      and ad_inventory_identified = true
      and integration_feasibility <> 'impossible'
      and media_director_approved_at is not null
    )
  )
);

create table if not exists public.media_ecosystem_outreach_activities (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.media_ecosystem_opportunities(id) on delete cascade,
  event text not null,
  actor_role text references public.roles(code),
  actor_user_id uuid references public.profiles(id),
  activity_at timestamptz not null default now(),
  next_action text,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trusted_supply_candidates (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.media_ecosystem_opportunities(id) on delete restrict,
  media_name text,
  track text,
  priority_score integer,
  status text not null default 'candidate',
  owner_user_id uuid references public.profiles(id),
  owner_role text references public.roles(code) default 'media_manager',
  evaluation_notes text not null default 'Entered trusted supply network evaluation. Candidate status is not trusted approval.',
  publisher_id uuid references public.publishers(id),
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trusted_supply_candidates_one_per_opportunity unique(opportunity_id),
  constraint chk_trusted_supply_candidate_status check (
    status in ('candidate','onboarding_project_created','rejected')
  )
);

create table if not exists public.media_ecosystem_conversion_logs (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.media_ecosystem_opportunities(id) on delete cascade,
  trusted_supply_candidate_id uuid references public.trusted_supply_candidates(id),
  publisher_id uuid references public.publishers(id),
  from_status text,
  to_status text not null,
  conversion_type text not null,
  conversion_reason text,
  created_by uuid references public.profiles(id),
  created_by_role text references public.roles(code),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint chk_media_ecosystem_conversion_type check (
    conversion_type in (
      'seed_import',
      'owner_assignment',
      'stage_change',
      'trusted_supply_candidate',
      'publisher_onboarding',
      'rejected',
      'on_hold'
    )
  )
);

insert into public.media_ecosystem_segments(segment_code, segment_name, strategic_priority, description)
values
  ('VIDEO_LONG_FORM','长视频 / 视频平台','P1','Long-form video and premium online video ecosystem.'),
  ('SHORT_VIDEO_LIVE','短视频 / 直播','P1','Short video and live streaming ecosystem.'),
  ('NEWS_SEARCH_BROWSER','资讯 / 搜索 / 浏览器','P1','News, search, and browser traffic ecosystem.'),
  ('SOCIAL_COMMUNITY','社交 / 社区','P1','Social and community media ecosystem.'),
  ('ECOMMERCE_RETAIL_MEDIA','电商 / Retail Media','P1','E-commerce and retail media ecosystem.'),
  ('LOCAL_LIFE_TRAVEL','本地生活 / 旅行','P1','Local life, travel, and location service ecosystem.'),
  ('GAME_H5_IAA','游戏 / H5 / IAA','P1','Game, H5, and in-app advertising ecosystem.'),
  ('WELLNESS_FEMALE_HEALTH','健康 / 女性健康','P1','Wellness and female health vertical ecosystem.'),
  ('UTILITY_TOOLS','工具应用','P1','Utility and app tools ecosystem.'),
  ('CTV_OTT_OEM','CTV / OTT / OEM','P1','Connected TV, OTT, and device OEM ecosystem.'),
  ('SMART_HARDWARE','智能硬件','P2','Smart hardware and device ecosystem.'),
  ('AUDIO_PODCAST','音频 / Podcast','P1','Audio, music, podcast, and radio ecosystem.'),
  ('CAMPUS_YOUTH','校园 / 青年','P2','Campus and youth audience ecosystem.'),
  ('OUTDOOR_DOOH','户外 / DOOH','P1','Digital out-of-home and offline screen ecosystem.'),
  ('AI_APP_CONTENT','AI 应用 / 内容工具','P1','AI app and AI content tool ecosystem.'),
  ('OTHER_VERTICAL','其他垂直','P2','Other vertical media ecosystem opportunities.')
on conflict (segment_code) do update
set segment_name = excluded.segment_name,
    strategic_priority = excluded.strategic_priority,
    description = excluded.description;

-- =============================
-- SAFETY TRIGGERS
-- =============================

create or replace function public.assert_trusted_supply_candidate_gate()
returns trigger language plpgsql security definer set search_path = public as $$
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
end $$;

create or replace function public.sync_trusted_supply_candidate_opportunity()
returns trigger language plpgsql security definer set search_path = public as $$
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
end $$;

drop trigger if exists trg_trusted_supply_candidate_gate on public.trusted_supply_candidates;
create trigger trg_trusted_supply_candidate_gate
before insert or update on public.trusted_supply_candidates
for each row execute function public.assert_trusted_supply_candidate_gate();

drop trigger if exists trg_sync_trusted_supply_candidate_opportunity on public.trusted_supply_candidates;
create trigger trg_sync_trusted_supply_candidate_opportunity
after insert on public.trusted_supply_candidates
for each row execute function public.sync_trusted_supply_candidate_opportunity();

-- Attach updated_at trigger to ecosystem tables.
do $$
declare t text;
begin
  foreach t in array array[
    'media_ecosystem_segments',
    'media_ecosystem_opportunities',
    'media_ecosystem_outreach_activities',
    'trusted_supply_candidates'
  ] loop
    execute format('drop trigger if exists trg_%s_updated_at on public.%I', t, t);
    execute format('create trigger trg_%s_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- =============================
-- INDEXES
-- =============================

create index if not exists idx_media_ecosystem_opportunities_segment_status
  on public.media_ecosystem_opportunities(ecosystem_segment, ecosystem_status);

create index if not exists idx_media_ecosystem_opportunities_owner
  on public.media_ecosystem_opportunities(owner_user_id, owner_role, ecosystem_status);

create index if not exists idx_media_ecosystem_opportunities_batch
  on public.media_ecosystem_opportunities(import_batch_id, data_quality_level, verification_status);

create index if not exists idx_media_ecosystem_opportunities_review
  on public.media_ecosystem_opportunities(review_required, seed_confidence);

create unique index if not exists idx_media_ecosystem_opportunities_source_name_version
  on public.media_ecosystem_opportunities(lower(media_name), coalesce(source_name, ''), coalesce(source_version, ''))
  where seed_id is null;

create index if not exists idx_media_ecosystem_outreach_opportunity
  on public.media_ecosystem_outreach_activities(opportunity_id, activity_at desc);

create index if not exists idx_trusted_supply_candidates_status
  on public.trusted_supply_candidates(status, owner_role);

create index if not exists idx_media_ecosystem_conversion_logs_opportunity
  on public.media_ecosystem_conversion_logs(opportunity_id, created_at desc);

-- =============================
-- RLS
-- =============================

alter table public.media_ecosystem_segments enable row level security;
alter table public.media_ecosystem_opportunities enable row level security;
alter table public.media_ecosystem_outreach_activities enable row level security;
alter table public.trusted_supply_candidates enable row level security;
alter table public.media_ecosystem_conversion_logs enable row level security;

drop policy if exists media_ecosystem_segments_read_business on public.media_ecosystem_segments;
create policy media_ecosystem_segments_read_business
on public.media_ecosystem_segments for select
using (auth.uid() is not null);

drop policy if exists media_ecosystem_segments_write_director on public.media_ecosystem_segments;
create policy media_ecosystem_segments_write_director
on public.media_ecosystem_segments for all
using (public.has_any_role(array['media_director','operations_director','system_admin']))
with check (public.has_any_role(array['media_director','operations_director','system_admin']));

drop policy if exists media_ecosystem_opportunities_read_business on public.media_ecosystem_opportunities;
create policy media_ecosystem_opportunities_read_business
on public.media_ecosystem_opportunities for select
using (auth.uid() is not null);

drop policy if exists media_ecosystem_opportunities_insert_media on public.media_ecosystem_opportunities;
create policy media_ecosystem_opportunities_insert_media
on public.media_ecosystem_opportunities for insert
with check (public.has_any_role(array['media_manager','media_director','operations_director','system_admin']));

drop policy if exists media_ecosystem_opportunities_update_media on public.media_ecosystem_opportunities;
create policy media_ecosystem_opportunities_update_media
on public.media_ecosystem_opportunities for update
using (public.has_any_role(array['media_manager','media_director','operations_director','system_admin']))
with check (public.has_any_role(array['media_manager','media_director','operations_director','system_admin']));

drop policy if exists media_ecosystem_opportunities_delete_director on public.media_ecosystem_opportunities;
create policy media_ecosystem_opportunities_delete_director
on public.media_ecosystem_opportunities for delete
using (public.has_any_role(array['media_director','operations_director','system_admin']));

drop policy if exists media_ecosystem_outreach_read_business on public.media_ecosystem_outreach_activities;
create policy media_ecosystem_outreach_read_business
on public.media_ecosystem_outreach_activities for select
using (auth.uid() is not null);

drop policy if exists media_ecosystem_outreach_write_media on public.media_ecosystem_outreach_activities;
create policy media_ecosystem_outreach_write_media
on public.media_ecosystem_outreach_activities for all
using (public.has_any_role(array['media_manager','media_director','operations_director','system_admin']))
with check (public.has_any_role(array['media_manager','media_director','operations_director','system_admin']));

drop policy if exists trusted_supply_candidates_read_business on public.trusted_supply_candidates;
create policy trusted_supply_candidates_read_business
on public.trusted_supply_candidates for select
using (auth.uid() is not null);

drop policy if exists trusted_supply_candidates_write_media on public.trusted_supply_candidates;
create policy trusted_supply_candidates_write_media
on public.trusted_supply_candidates for all
using (public.has_any_role(array['media_manager','media_director','operations_director','system_admin']))
with check (public.has_any_role(array['media_manager','media_director','operations_director','system_admin']));

drop policy if exists media_ecosystem_conversion_logs_read_business on public.media_ecosystem_conversion_logs;
create policy media_ecosystem_conversion_logs_read_business
on public.media_ecosystem_conversion_logs for select
using (auth.uid() is not null);

drop policy if exists media_ecosystem_conversion_logs_insert_media on public.media_ecosystem_conversion_logs;
create policy media_ecosystem_conversion_logs_insert_media
on public.media_ecosystem_conversion_logs for insert
with check (public.has_any_role(array['media_manager','media_director','operations_director','system_admin']));

