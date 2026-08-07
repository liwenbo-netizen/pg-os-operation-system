-- Keep publisher readiness aligned with the commercial-test record without
-- granting AdOps broad update access to the publishers table.

create or replace function public.sync_publisher_commercial_test_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.publishers
  set
    commercial_test_status = new.status,
    updated_at = now()
  where id = new.publisher_id
    and commercial_test_status is distinct from new.status;

  return new;
end;
$$;

drop trigger if exists trg_sync_publisher_commercial_test_status on public.commercial_tests;
create trigger trg_sync_publisher_commercial_test_status
after insert or update of status on public.commercial_tests
for each row execute function public.sync_publisher_commercial_test_status();

with latest_test as (
  select distinct on (publisher_id)
    publisher_id,
    status
  from public.commercial_tests
  order by
    publisher_id,
    coalesce(reviewed_at, updated_at, created_at) desc nulls last,
    id desc
)
update public.publishers as publisher
set
  commercial_test_status = latest_test.status,
  updated_at = now()
from latest_test
where publisher.id = latest_test.publisher_id
  and publisher.commercial_test_status is distinct from latest_test.status;
