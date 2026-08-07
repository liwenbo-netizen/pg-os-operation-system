-- Phase SDK-2B: allow Ad Operations to own the pilot-and-scale stage check.

drop policy if exists integration_check_results_write_operators
  on public.integration_check_results;

create policy integration_check_results_write_operators
on public.integration_check_results for all
using (
  public.has_any_role(array[
    'integration_manager',
    'media_director',
    'operations_director'
  ])
  or (owner_role = 'media_manager' and public.has_role('media_manager'))
  or (owner_role = 'legal_manager' and public.has_role('legal_manager'))
  or (owner_role = 'data_analyst' and public.has_role('data_analyst'))
  or (owner_role = 'adops_manager' and public.has_role('adops_manager'))
)
with check (
  public.has_any_role(array[
    'integration_manager',
    'media_director',
    'operations_director'
  ])
  or (owner_role = 'media_manager' and public.has_role('media_manager'))
  or (owner_role = 'legal_manager' and public.has_role('legal_manager'))
  or (owner_role = 'data_analyst' and public.has_role('data_analyst'))
  or (owner_role = 'adops_manager' and public.has_role('adops_manager'))
);

comment on policy integration_check_results_write_operators
  on public.integration_check_results is
  'Integration leadership supervises all checks; Media, Legal, Data, and Ad Operations update only checks assigned to their role.';
