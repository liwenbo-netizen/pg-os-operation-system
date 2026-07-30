-- Allow assigned business owners to close the commercial and settlement gates.

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
  or (owner_role = 'sales_manager' and public.has_role('sales_manager'))
  or (owner_role = 'finance_manager' and public.has_role('finance_manager'))
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
  or (owner_role = 'sales_manager' and public.has_role('sales_manager'))
  or (owner_role = 'finance_manager' and public.has_role('finance_manager'))
  or (owner_role = 'legal_manager' and public.has_role('legal_manager'))
  or (owner_role = 'data_analyst' and public.has_role('data_analyst'))
  or (owner_role = 'adops_manager' and public.has_role('adops_manager'))
);

comment on policy integration_check_results_write_operators
  on public.integration_check_results is
  'Integration leadership supervises all gates; Media, Sales, Finance, Legal, Data, and Ad Operations update only checks assigned to their role.';
