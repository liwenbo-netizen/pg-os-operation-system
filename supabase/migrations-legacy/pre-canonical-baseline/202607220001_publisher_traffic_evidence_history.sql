-- Publisher Phase 3B: immutable traffic evidence snapshots.

create table if not exists public.publisher_traffic_evidence_history (
  id uuid primary key default gen_random_uuid(),
  publisher_id uuid not null references public.publishers(id) on delete cascade,
  daily_active_users bigint,
  monthly_active_users bigint,
  daily_requests bigint,
  traffic_data_as_of date not null,
  traffic_source text not null,
  actor_user_id uuid references public.profiles(id),
  recorded_by_role text references public.roles(code),
  recorded_via text not null,
  created_at timestamptz not null default now(),
  constraint publisher_traffic_evidence_daily_active_users_nonnegative
    check (daily_active_users is null or daily_active_users >= 0),
  constraint publisher_traffic_evidence_monthly_active_users_nonnegative
    check (monthly_active_users is null or monthly_active_users >= 0),
  constraint publisher_traffic_evidence_daily_requests_nonnegative
    check (daily_requests is null or daily_requests >= 0),
  constraint publisher_traffic_evidence_has_metric
    check (daily_active_users is not null or monthly_active_users is not null or daily_requests is not null),
  constraint publisher_traffic_evidence_recorded_via_domain
    check (recorded_via in ('publisher_onboarding_created', 'publisher_profile_updated', 'migration_backfill'))
);

create index if not exists idx_publisher_traffic_evidence_publisher_date
  on public.publisher_traffic_evidence_history (publisher_id, traffic_data_as_of desc, created_at desc);

create index if not exists idx_publisher_traffic_evidence_publisher_created
  on public.publisher_traffic_evidence_history (publisher_id, created_at desc);

alter table public.publisher_traffic_evidence_history enable row level security;

drop policy if exists publisher_traffic_evidence_read_business
  on public.publisher_traffic_evidence_history;
create policy publisher_traffic_evidence_read_business
  on public.publisher_traffic_evidence_history
  for select
  using (auth.uid() is not null);

drop policy if exists publisher_traffic_evidence_insert_media
  on public.publisher_traffic_evidence_history;
create policy publisher_traffic_evidence_insert_media
  on public.publisher_traffic_evidence_history
  for insert
  with check (
    actor_user_id = auth.uid()
    and public.has_any_role(array['media_manager','media_director','operations_director'])
  );

grant select, insert on public.publisher_traffic_evidence_history to authenticated;

insert into public.publisher_traffic_evidence_history (
  publisher_id,
  daily_active_users,
  monthly_active_users,
  daily_requests,
  traffic_data_as_of,
  traffic_source,
  recorded_via,
  created_at
)
select
  publisher.id,
  publisher.daily_active_users,
  case
    when coalesce(publisher.metadata ->> 'monthly_active_users', '') ~ '^[0-9]+$'
      then (publisher.metadata ->> 'monthly_active_users')::bigint
    else null
  end,
  publisher.daily_requests,
  (publisher.metadata ->> 'traffic_data_as_of')::date,
  publisher.metadata ->> 'traffic_source',
  'migration_backfill',
  coalesce(publisher.updated_at, now())
from public.publishers as publisher
where coalesce(publisher.metadata ->> 'traffic_data_as_of', '') ~ '^\d{4}-\d{2}-\d{2}$'
  and coalesce(publisher.metadata ->> 'traffic_source', '') <> ''
  and (
    publisher.daily_active_users is not null
    or publisher.daily_requests is not null
    or coalesce(publisher.metadata ->> 'monthly_active_users', '') ~ '^[0-9]+$'
  )
  and not exists (
    select 1
    from public.publisher_traffic_evidence_history as history
    where history.publisher_id = publisher.id
      and history.recorded_via = 'migration_backfill'
      and history.traffic_data_as_of = (publisher.metadata ->> 'traffic_data_as_of')::date
  );

comment on table public.publisher_traffic_evidence_history is
  'Append-only publisher traffic evidence snapshots used for operational governance and audit review.';
