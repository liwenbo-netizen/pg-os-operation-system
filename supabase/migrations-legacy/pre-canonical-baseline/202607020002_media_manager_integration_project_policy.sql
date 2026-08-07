-- Phase 31B RLS correction.
-- Media Manager creates the initial integration project during Publisher 360 onboarding.

drop policy if exists integration_projects_write_integration on public.integration_projects;
create policy integration_projects_write_integration on public.integration_projects
for all using (public.has_any_role(array['integration_manager','media_manager','media_director','operations_director']))
with check (public.has_any_role(array['integration_manager','media_manager','media_director','operations_director']));
