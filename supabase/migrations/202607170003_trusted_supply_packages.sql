-- Phase CM-5G: Controlled supply packaging and advertiser-fit inputs.

create table if not exists public.media_supply_packages (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  package_name text not null,
  status text not null default 'draft',
  pool text not null,
  ad_formats jsonb not null default '[]'::jsonb,
  placement_types jsonb not null default '[]'::jsonb,
  geo text not null default 'CN',
  inventory_scale bigint not null default 0,
  floor_price numeric(14,4),
  billing_model text,
  advertiser_fit_tags jsonb not null default '[]'::jsonb,
  risk_notes jsonb not null default '[]'::jsonb,
  owner_user_id uuid references public.profiles(id),
  owner_role text not null references public.roles(code) default 'media_manager',
  activated_at timestamptz,
  created_by uuid references public.profiles(id),
  updated_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_media_supply_package_status check (status in ('draft','active','paused','retired')),
  constraint chk_media_supply_package_pool check (pool in ('opportunity','test','core','risk','suspended')),
  constraint chk_media_supply_ad_formats_array check (jsonb_typeof(ad_formats) = 'array'),
  constraint chk_media_supply_placements_array check (jsonb_typeof(placement_types) = 'array'),
  constraint chk_media_supply_fit_tags_array check (jsonb_typeof(advertiser_fit_tags) = 'array'),
  constraint chk_media_supply_risk_notes_array check (jsonb_typeof(risk_notes) = 'array')
);

create index if not exists idx_media_supply_packages_active on public.media_supply_packages(status, pool, publisher_id);

drop trigger if exists trg_media_supply_packages_updated_at on public.media_supply_packages;
create trigger trg_media_supply_packages_updated_at
before update on public.media_supply_packages
for each row execute function public.set_updated_at();

alter table public.media_supply_packages enable row level security;

drop policy if exists media_supply_packages_read_business on public.media_supply_packages;
create policy media_supply_packages_read_business
on public.media_supply_packages for select
using (auth.uid() is not null);

drop policy if exists media_supply_packages_write_media on public.media_supply_packages;
create policy media_supply_packages_write_media
on public.media_supply_packages for all
using (public.has_any_role(array['media_manager','media_director','operations_director','system_admin']))
with check (public.has_any_role(array['media_manager','media_director','operations_director','system_admin']));
