-- SDK-2A: align database writes with the cross-role technical workspace.
-- Integration leadership owns the non-secret technical profile.
-- Legal and Data may update only checklist rows explicitly assigned to their role.

drop policy if exists integration_project_profiles_write_operators
  on public.integration_project_profiles;

create policy integration_project_profiles_write_operators
on public.integration_project_profiles for all
using (
  public.has_any_role(array[
    'integration_manager',
    'media_director',
    'operations_director'
  ])
)
with check (
  public.has_any_role(array[
    'integration_manager',
    'media_director',
    'operations_director'
  ])
);

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
  or (
    owner_role = 'legal_manager'
    and public.has_role('legal_manager')
  )
  or (
    owner_role = 'data_analyst'
    and public.has_role('data_analyst')
  )
)
with check (
  public.has_any_role(array[
    'integration_manager',
    'media_director',
    'operations_director'
  ])
  or (
    owner_role = 'legal_manager'
    and public.has_role('legal_manager')
  )
  or (
    owner_role = 'data_analyst'
    and public.has_role('data_analyst')
  )
);

comment on policy integration_project_profiles_write_operators
  on public.integration_project_profiles is
  'Integration leadership maintains the non-secret SDK technical profile.';

comment on policy integration_check_results_write_operators
  on public.integration_check_results is
  'Integration leadership may supervise all checks; Legal and Data may write only checks assigned to their own role.';
