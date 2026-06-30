-- Phase 13 UAT RLS correction.
-- Ensure authenticated users can read their own assigned PG OS roles after sign-in.

drop policy if exists user_roles_read_self_or_admin on public.user_roles;
create policy user_roles_read_self_or_admin on public.user_roles
for select using (
  user_id = auth.uid()
  or public.has_any_role(array['system_admin','audit_viewer','ceo'])
);
