-- Phase 30 RLS correction.
-- Allow authenticated business users to write their own Phase 28/29 business audit rows.

drop policy if exists audit_logs_insert_business on public.audit_logs;
create policy audit_logs_insert_business on public.audit_logs
for insert with check (
  auth.uid() is not null
  and actor_user_id = auth.uid()
  and object_type in (
    'advertiser',
    'opportunity',
    'publisher',
    'proposal',
    'campaign',
    'contract',
    'diagnostic_case',
    'okr',
    'settlement',
    'workbench_task',
    'approval'
  )
  and coalesce(after_data ->> 'businessAuditCoverage', '') = 'phase28_core_business_action'
  and not public.has_role('audit_viewer')
);

drop policy if exists audit_logs_update_own_business on public.audit_logs;
create policy audit_logs_update_own_business on public.audit_logs
for update using (
  auth.uid() is not null
  and actor_user_id = auth.uid()
  and object_type in (
    'advertiser',
    'opportunity',
    'publisher',
    'proposal',
    'campaign',
    'contract',
    'diagnostic_case',
    'okr',
    'settlement',
    'workbench_task',
    'approval'
  )
  and coalesce(after_data ->> 'businessAuditCoverage', '') = 'phase28_core_business_action'
  and not public.has_role('audit_viewer')
)
with check (
  auth.uid() is not null
  and actor_user_id = auth.uid()
  and object_type in (
    'advertiser',
    'opportunity',
    'publisher',
    'proposal',
    'campaign',
    'contract',
    'diagnostic_case',
    'okr',
    'settlement',
    'workbench_task',
    'approval'
  )
  and coalesce(after_data ->> 'businessAuditCoverage', '') = 'phase28_core_business_action'
  and not public.has_role('audit_viewer')
);
