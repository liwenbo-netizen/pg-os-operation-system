-- Phase 15 UAT smoke gate correction.
-- Align live contract writes with the locked RBAC model.

drop policy if exists contracts_read_business on public.contracts;
create policy contracts_read_business on public.contracts
for select using (auth.uid() is not null);

drop policy if exists contracts_write_legal_finance on public.contracts;
create policy contracts_write_legal_finance on public.contracts
for all using (public.has_any_role(array['legal_manager','finance_manager','operations_director']))
with check (public.has_any_role(array['legal_manager','finance_manager','operations_director']));
