-- Phase CM-5F and CM-5H: Trusted Supply Qualification and quality monitoring history.

create table if not exists public.media_trust_profiles (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null unique references public.publishers(id) on delete cascade,
  owner_user_id uuid references public.profiles(id),
  owner_role text not null references public.roles(code) default 'media_manager',
  status text not null default 'draft',
  total_score integer not null default 0,
  trust_level text not null default 'D',
  score_breakdown jsonb not null default '{}'::jsonb,
  suggested_pool text not null default 'opportunity',
  confirmed_pool text,
  advertiser_fit_tags jsonb not null default '[]'::jsonb,
  recommendation_reasons jsonb not null default '[]'::jsonb,
  risk_warnings jsonb not null default '[]'::jsonb,
  next_action text not null default 'Evaluate trusted supply readiness.',
  evaluated_at timestamptz not null default now(),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_media_trust_profile_status check (status in ('draft','evaluated','confirmed','monitoring')),
  constraint chk_media_trust_score check (total_score between 0 and 100),
  constraint chk_media_trust_level check (trust_level in ('S','A','B','C','D')),
  constraint chk_media_trust_suggested_pool check (suggested_pool in ('opportunity','test','core','risk','suspended')),
  constraint chk_media_trust_confirmed_pool check (confirmed_pool is null or confirmed_pool in ('opportunity','test','core','risk','suspended')),
  constraint chk_media_trust_breakdown_object check (jsonb_typeof(score_breakdown) = 'object'),
  constraint chk_media_trust_fit_tags_array check (jsonb_typeof(advertiser_fit_tags) = 'array'),
  constraint chk_media_trust_reasons_array check (jsonb_typeof(recommendation_reasons) = 'array'),
  constraint chk_media_trust_risks_array check (jsonb_typeof(risk_warnings) = 'array')
);

create table if not exists public.media_trust_score_history (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  total_score integer not null,
  trust_level text not null,
  score_breakdown jsonb not null default '{}'::jsonb,
  suggested_pool text not null,
  reasons jsonb not null default '[]'::jsonb,
  risk_warnings jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now(),
  calculated_by_role text not null references public.roles(code),
  constraint chk_media_trust_history_score check (total_score between 0 and 100),
  constraint chk_media_trust_history_level check (trust_level in ('S','A','B','C','D')),
  constraint chk_media_trust_history_pool check (suggested_pool in ('opportunity','test','core','risk','suspended'))
);

create index if not exists idx_media_trust_profiles_pool on public.media_trust_profiles(confirmed_pool, trust_level);
create index if not exists idx_media_trust_score_history_publisher on public.media_trust_score_history(publisher_id, calculated_at desc);

drop trigger if exists trg_media_trust_profiles_updated_at on public.media_trust_profiles;
create trigger trg_media_trust_profiles_updated_at
before update on public.media_trust_profiles
for each row execute function public.set_updated_at();

alter table public.media_trust_profiles enable row level security;
alter table public.media_trust_score_history enable row level security;

drop policy if exists media_trust_profiles_read_business on public.media_trust_profiles;
create policy media_trust_profiles_read_business
on public.media_trust_profiles for select
using (auth.uid() is not null);

drop policy if exists media_trust_profiles_write_media on public.media_trust_profiles;
create policy media_trust_profiles_write_media
on public.media_trust_profiles for all
using (public.has_any_role(array['media_manager','media_director','operations_director','data_analyst','system_admin']))
with check (public.has_any_role(array['media_manager','media_director','operations_director','data_analyst','system_admin']));
drop policy if exists media_trust_score_history_read_business on public.media_trust_score_history;
create policy media_trust_score_history_read_business
on public.media_trust_score_history for select
using (auth.uid() is not null);

drop policy if exists media_trust_score_history_insert_media on public.media_trust_score_history;
create policy media_trust_score_history_insert_media
on public.media_trust_score_history for insert
with check (public.has_any_role(array['media_manager','media_director','operations_director','data_analyst','system_admin']));
