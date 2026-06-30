-- PG OS V2.11 RLS POLICY LOCKED
-- Apply after 06_DATABASE_BASE_SCHEMA_LOCKED.sql.

create or replace function public.current_user_id()
returns uuid language sql stable as $$
  select auth.uid()
$$;

create or replace function public.has_role(role_code_input text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role_code = role_code_input
  );
$$;

create or replace function public.has_any_role(role_codes text[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role_code = any(role_codes)
  );
$$;

create or replace function public.has_capability(capability_code_input text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_capabilities rc on rc.role_code = ur.role_code
    where ur.user_id = auth.uid()
      and rc.capability_code = capability_code_input
  );
$$;

-- Enable RLS
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles','user_roles','roles','capability_tags','role_capabilities','route_permissions',
    'work_items','approvals','comments','attachments','audit_logs','module_business_events',
    'publishers','publisher_contacts','publisher_ad_slots','publisher_contract_terms','publisher_supply_transparency',
    'integration_projects','commercial_tests','advertisers','advertiser_contacts','opportunities','proposals','proposal_media_selections',
    'campaigns','campaign_media_allocations','quality_diagnostic_cases','quality_diagnostic_evidence','metric_funnel_snapshots',
    'contracts','settlements','settlement_items','invoices','okr_objectives','okr_key_results','sop_cards','wizard_progress_records'
  ] LOOP
    EXECUTE format('alter table public.%I enable row level security', t);
  END LOOP;
END $$;

-- Admin / audit read policies
drop policy if exists profiles_read_self_or_admin on public.profiles;
create policy profiles_read_self_or_admin on public.profiles
for select using (id = auth.uid() or public.has_any_role(array['ceo','operations_director','system_admin','audit_viewer']));

drop policy if exists roles_read_authenticated on public.roles;
create policy roles_read_authenticated on public.roles for select using (auth.uid() is not null);
drop policy if exists user_roles_read_self_or_admin on public.user_roles;
create policy user_roles_read_self_or_admin on public.user_roles
for select using (user_id = auth.uid() or public.has_any_role(array['system_admin','audit_viewer','ceo']));
drop policy if exists capability_read_authenticated on public.capability_tags;
create policy capability_read_authenticated on public.capability_tags for select using (auth.uid() is not null);
drop policy if exists role_capabilities_read_authenticated on public.role_capabilities;
create policy role_capabilities_read_authenticated on public.role_capabilities for select using (auth.uid() is not null);
drop policy if exists route_permissions_read_authenticated on public.route_permissions;
create policy route_permissions_read_authenticated on public.route_permissions for select using (auth.uid() is not null);

-- Generic audit read only
drop policy if exists audit_logs_read_privileged on public.audit_logs;
create policy audit_logs_read_privileged on public.audit_logs
for select using (public.has_any_role(array['ceo','operations_director','audit_viewer','system_admin']));

drop policy if exists audit_logs_insert_system on public.audit_logs;
create policy audit_logs_insert_system on public.audit_logs
for insert with check (auth.uid() is not null);

-- Media domain
drop policy if exists publishers_read_business on public.publishers;
create policy publishers_read_business on public.publishers
for select using (public.has_any_role(array['ceo','operations_director','sales_director','sales_manager','media_director','media_manager','adops_manager','integration_manager','data_analyst','finance_manager','legal_manager','customer_success_manager','product_owner','audit_viewer','system_admin']));

drop policy if exists publishers_write_media on public.publishers;
create policy publishers_write_media on public.publishers
for all using (public.has_any_role(array['media_director','media_manager','integration_manager','operations_director']))
with check (public.has_any_role(array['media_director','media_manager','integration_manager','operations_director'])) ;

drop policy if exists media_child_read_business on public.publisher_contacts;
create policy media_child_read_business on public.publisher_contacts
for select using (public.has_any_role(array['ceo','operations_director','sales_director','sales_manager','media_director','media_manager','adops_manager','integration_manager','data_analyst','finance_manager','legal_manager','customer_success_manager','product_owner','audit_viewer','system_admin']));

drop policy if exists media_child_write_media on public.publisher_contacts;
create policy media_child_write_media on public.publisher_contacts
for all using (public.has_any_role(array['media_director','media_manager','integration_manager','operations_director']))
with check (public.has_any_role(array['media_director','media_manager','integration_manager','operations_director']));

-- Repeat similar policies for media child tables
drop policy if exists publisher_ad_slots_read_business on public.publisher_ad_slots;
create policy publisher_ad_slots_read_business on public.publisher_ad_slots for select using (auth.uid() is not null);
drop policy if exists publisher_ad_slots_write_media on public.publisher_ad_slots;
create policy publisher_ad_slots_write_media on public.publisher_ad_slots for all using (public.has_any_role(array['media_director','media_manager','integration_manager','operations_director'])) with check (public.has_any_role(array['media_director','media_manager','integration_manager','operations_director']));
drop policy if exists publisher_contract_terms_read_business on public.publisher_contract_terms;
create policy publisher_contract_terms_read_business on public.publisher_contract_terms for select using (auth.uid() is not null);
drop policy if exists publisher_contract_terms_write_media_finance_legal on public.publisher_contract_terms;
create policy publisher_contract_terms_write_media_finance_legal on public.publisher_contract_terms for all using (public.has_any_role(array['media_director','media_manager','finance_manager','legal_manager','operations_director'])) with check (public.has_any_role(array['media_director','media_manager','finance_manager','legal_manager','operations_director']));
drop policy if exists publisher_supply_transparency_read_business on public.publisher_supply_transparency;
create policy publisher_supply_transparency_read_business on public.publisher_supply_transparency for select using (auth.uid() is not null);
drop policy if exists publisher_supply_transparency_write_media on public.publisher_supply_transparency;
create policy publisher_supply_transparency_write_media on public.publisher_supply_transparency for all using (public.has_any_role(array['media_director','media_manager','integration_manager','operations_director'])) with check (public.has_any_role(array['media_director','media_manager','integration_manager','operations_director']));
drop policy if exists integration_projects_read_business on public.integration_projects;
create policy integration_projects_read_business on public.integration_projects for select using (auth.uid() is not null);
drop policy if exists integration_projects_write_integration on public.integration_projects;
create policy integration_projects_write_integration on public.integration_projects for all using (public.has_any_role(array['integration_manager','media_director','operations_director'])) with check (public.has_any_role(array['integration_manager','media_director','operations_director']));
drop policy if exists commercial_tests_read_business on public.commercial_tests;
create policy commercial_tests_read_business on public.commercial_tests for select using (auth.uid() is not null);
drop policy if exists commercial_tests_write_ops_media on public.commercial_tests;
create policy commercial_tests_write_ops_media on public.commercial_tests for all using (public.has_any_role(array['adops_manager','media_director','operations_director','data_analyst'])) with check (public.has_any_role(array['adops_manager','media_director','operations_director','data_analyst']));

-- Sales domain
drop policy if exists advertisers_read_business on public.advertisers;
create policy advertisers_read_business on public.advertisers for select using (auth.uid() is not null);
drop policy if exists advertisers_write_sales on public.advertisers;
create policy advertisers_write_sales on public.advertisers for all using (public.has_any_role(array['sales_director','sales_manager','operations_director','customer_success_manager'])) with check (public.has_any_role(array['sales_director','sales_manager','operations_director','customer_success_manager']));
drop policy if exists advertiser_contacts_read_business on public.advertiser_contacts;
create policy advertiser_contacts_read_business on public.advertiser_contacts for select using (auth.uid() is not null);
drop policy if exists advertiser_contacts_write_sales on public.advertiser_contacts;
create policy advertiser_contacts_write_sales on public.advertiser_contacts for all using (public.has_any_role(array['sales_director','sales_manager','operations_director','customer_success_manager'])) with check (public.has_any_role(array['sales_director','sales_manager','operations_director','customer_success_manager']));
drop policy if exists opportunities_read_business on public.opportunities;
create policy opportunities_read_business on public.opportunities for select using (auth.uid() is not null);
drop policy if exists opportunities_write_sales on public.opportunities;
create policy opportunities_write_sales on public.opportunities for all using (public.has_any_role(array['sales_director','sales_manager','operations_director','customer_success_manager'])) with check (public.has_any_role(array['sales_director','sales_manager','operations_director','customer_success_manager']));
drop policy if exists proposals_read_business on public.proposals;
create policy proposals_read_business on public.proposals for select using (auth.uid() is not null);
drop policy if exists proposals_write_sales on public.proposals;
create policy proposals_write_sales on public.proposals for all using (public.has_any_role(array['sales_director','sales_manager','operations_director','customer_success_manager'])) with check (public.has_any_role(array['sales_director','sales_manager','operations_director','customer_success_manager']));
drop policy if exists proposal_media_read_business on public.proposal_media_selections;
create policy proposal_media_read_business on public.proposal_media_selections for select using (auth.uid() is not null);
drop policy if exists proposal_media_write_sales on public.proposal_media_selections;
create policy proposal_media_write_sales on public.proposal_media_selections for all using (public.has_any_role(array['sales_director','sales_manager','operations_director','customer_success_manager'])) with check (public.has_any_role(array['sales_director','sales_manager','operations_director','customer_success_manager']));

-- Campaign / diagnostics / finance
drop policy if exists campaigns_read_business on public.campaigns;
create policy campaigns_read_business on public.campaigns for select using (auth.uid() is not null);
drop policy if exists campaigns_write_ops on public.campaigns;
create policy campaigns_write_ops on public.campaigns for all using (public.has_any_role(array['adops_manager','operations_director','customer_success_manager'])) with check (public.has_any_role(array['adops_manager','operations_director','customer_success_manager']));
drop policy if exists campaign_allocations_read_business on public.campaign_media_allocations;
create policy campaign_allocations_read_business on public.campaign_media_allocations for select using (auth.uid() is not null);
drop policy if exists campaign_allocations_write_ops on public.campaign_media_allocations;
create policy campaign_allocations_write_ops on public.campaign_media_allocations for all using (public.has_any_role(array['adops_manager','operations_director'])) with check (public.has_any_role(array['adops_manager','operations_director']));

drop policy if exists diagnostics_read_business on public.quality_diagnostic_cases;
create policy diagnostics_read_business on public.quality_diagnostic_cases for select using (auth.uid() is not null);
drop policy if exists diagnostics_write_quality on public.quality_diagnostic_cases;
create policy diagnostics_write_quality on public.quality_diagnostic_cases for all using (public.has_any_role(array['operations_director','media_director','media_manager','adops_manager','integration_manager','data_analyst','finance_manager'])) with check (public.has_any_role(array['operations_director','media_director','media_manager','adops_manager','integration_manager','data_analyst','finance_manager']));
drop policy if exists diagnostics_evidence_read_business on public.quality_diagnostic_evidence;
create policy diagnostics_evidence_read_business on public.quality_diagnostic_evidence for select using (auth.uid() is not null);
drop policy if exists diagnostics_evidence_write_quality on public.quality_diagnostic_evidence;
create policy diagnostics_evidence_write_quality on public.quality_diagnostic_evidence for all using (public.has_any_role(array['operations_director','media_director','media_manager','adops_manager','integration_manager','data_analyst','finance_manager'])) with check (public.has_any_role(array['operations_director','media_director','media_manager','adops_manager','integration_manager','data_analyst','finance_manager']));
drop policy if exists metric_snapshots_read_business on public.metric_funnel_snapshots;
create policy metric_snapshots_read_business on public.metric_funnel_snapshots for select using (auth.uid() is not null);
drop policy if exists metric_snapshots_write_data on public.metric_funnel_snapshots;
create policy metric_snapshots_write_data on public.metric_funnel_snapshots for all using (public.has_any_role(array['data_analyst','operations_director'])) with check (public.has_any_role(array['data_analyst','operations_director']));

drop policy if exists settlements_read_business on public.settlements;
create policy settlements_read_business on public.settlements for select using (auth.uid() is not null);
drop policy if exists settlements_write_finance on public.settlements;
create policy settlements_write_finance on public.settlements for all using (public.has_any_role(array['finance_manager','operations_director'])) with check (public.has_any_role(array['finance_manager','operations_director']));
drop policy if exists settlement_items_read_business on public.settlement_items;
create policy settlement_items_read_business on public.settlement_items for select using (auth.uid() is not null);
drop policy if exists settlement_items_write_finance on public.settlement_items;
create policy settlement_items_write_finance on public.settlement_items for all using (public.has_any_role(array['finance_manager','operations_director'])) with check (public.has_any_role(array['finance_manager','operations_director']));
drop policy if exists invoices_read_business on public.invoices;
create policy invoices_read_business on public.invoices for select using (auth.uid() is not null);
drop policy if exists invoices_write_finance on public.invoices;
create policy invoices_write_finance on public.invoices for all using (public.has_any_role(array['finance_manager','operations_director'])) with check (public.has_any_role(array['finance_manager','operations_director']));

drop policy if exists contracts_read_business on public.contracts;
create policy contracts_read_business on public.contracts for select using (auth.uid() is not null);
drop policy if exists contracts_write_legal_finance on public.contracts;
create policy contracts_write_legal_finance on public.contracts for all using (public.has_any_role(array['legal_manager','finance_manager','operations_director'])) with check (public.has_any_role(array['legal_manager','finance_manager','operations_director']));

-- OKR / SOP / collaboration
drop policy if exists work_items_read_business on public.work_items;
create policy work_items_read_business on public.work_items for select using (auth.uid() is not null);
drop policy if exists work_items_write_business on public.work_items;
create policy work_items_write_business on public.work_items for all using (auth.uid() is not null and not public.has_role('audit_viewer')) with check (auth.uid() is not null and not public.has_role('audit_viewer'));
drop policy if exists approvals_read_business on public.approvals;
create policy approvals_read_business on public.approvals for select using (auth.uid() is not null);
drop policy if exists approvals_write_business on public.approvals;
create policy approvals_write_business on public.approvals for all using (auth.uid() is not null and not public.has_any_role(array['audit_viewer','system_admin'])) with check (auth.uid() is not null and not public.has_any_role(array['audit_viewer','system_admin'])) ;
drop policy if exists comments_read_business on public.comments;
create policy comments_read_business on public.comments for select using (auth.uid() is not null);
drop policy if exists comments_write_business on public.comments;
create policy comments_write_business on public.comments for insert with check (auth.uid() is not null and not public.has_role('audit_viewer'));
drop policy if exists attachments_read_business on public.attachments;
create policy attachments_read_business on public.attachments for select using (auth.uid() is not null);
drop policy if exists attachments_write_business on public.attachments;
create policy attachments_write_business on public.attachments for insert with check (auth.uid() is not null and not public.has_role('audit_viewer'));
drop policy if exists events_read_business on public.module_business_events;
create policy events_read_business on public.module_business_events for select using (auth.uid() is not null);
drop policy if exists events_insert_business on public.module_business_events;
create policy events_insert_business on public.module_business_events for insert with check (auth.uid() is not null);
drop policy if exists okr_read_business on public.okr_objectives;
create policy okr_read_business on public.okr_objectives for select using (auth.uid() is not null);
drop policy if exists okr_write_director on public.okr_objectives;
create policy okr_write_director on public.okr_objectives for all using (public.has_any_role(array['ceo','operations_director','sales_director','media_director','product_owner'])) with check (public.has_any_role(array['ceo','operations_director','sales_director','media_director','product_owner']));
drop policy if exists kr_read_business on public.okr_key_results;
create policy kr_read_business on public.okr_key_results for select using (auth.uid() is not null);
drop policy if exists kr_write_director on public.okr_key_results;
create policy kr_write_director on public.okr_key_results for all using (public.has_any_role(array['ceo','operations_director','sales_director','media_director','product_owner'])) with check (public.has_any_role(array['ceo','operations_director','sales_director','media_director','product_owner']));
drop policy if exists sop_read_business on public.sop_cards;
create policy sop_read_business on public.sop_cards for select using (auth.uid() is not null);
drop policy if exists sop_write_product on public.sop_cards;
create policy sop_write_product on public.sop_cards for all using (public.has_any_role(array['product_owner','operations_director'])) with check (public.has_any_role(array['product_owner','operations_director']));
drop policy if exists wizard_read_business on public.wizard_progress_records;
create policy wizard_read_business on public.wizard_progress_records for select using (auth.uid() is not null);
drop policy if exists wizard_write_business on public.wizard_progress_records;
create policy wizard_write_business on public.wizard_progress_records for all using (auth.uid() is not null and not public.has_role('audit_viewer')) with check (auth.uid() is not null and not public.has_role('audit_viewer'));

