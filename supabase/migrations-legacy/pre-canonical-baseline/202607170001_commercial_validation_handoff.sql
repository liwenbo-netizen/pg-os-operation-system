-- Phase CM-5E: Commercial Validation Handoff.

alter table public.commercial_tests
  add column if not exists owner_role text references public.roles(code),
  add column if not exists test_plan jsonb not null default '{}'::jsonb,
  add column if not exists next_action text,
  add column if not exists reviewed_at timestamptz;

alter table public.commercial_tests
  drop constraint if exists chk_commercial_tests_test_plan_object;

alter table public.commercial_tests
  add constraint chk_commercial_tests_test_plan_object
  check (jsonb_typeof(test_plan) = 'object');

update public.commercial_tests
set
  owner_role = coalesce(owner_role, 'adops_manager'),
  next_action = coalesce(
    next_action,
    case
      when status = 'test_passed' then 'Evaluate trusted supply qualification and confirm the operating pool.'
      when status = 'test_failed' then 'Resolve quality or commercial blockers before retesting.'
      else 'Run controlled traffic and record delivery metrics.'
    end
  )
where owner_role is null or next_action is null;
