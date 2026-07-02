# Phase 30 Report - Audit Logs Business RLS Policy

Status: PASS. PG OS now has a dedicated Supabase RLS policy for Phase 28/29 business audit rows, and the policy has been applied and live-probed in Supabase.

## Objective

Unblock production business audit UAT after the operator confirmed `publisher.create` was still not visible in `/audit/events`.

The production warning showed:

```text
audit_logs: new row violates row-level security policy for table "audit_logs"
```

That means the Phase 29 frontend direct write was running, but Supabase rejected the row before it reached `audit_logs`.

## Scope

New migration:

```text
supabase/migrations/202607020001_audit_logs_business_write_policy.sql
```

New policies:

```text
audit_logs_insert_business
audit_logs_update_own_business
```

Policy constraints:

- Requires an authenticated session.
- Requires `actor_user_id = auth.uid()`.
- Allows business object types such as `publisher`, `proposal`, `campaign`, `settlement`, and `contract`.
- Requires `after_data.businessAuditCoverage = phase28_core_business_action`.
- Excludes `audit_viewer` writes.
- Does not change privileged audit read access.

The update policy supports later workflow upsert attempts that reuse the same audit event id.

## Operator SQL

Run this migration manually in the Supabase SQL Editor:

```text
supabase/migrations/202607020001_audit_logs_business_write_policy.sql
```

Then redeploy is not required for the database policy itself, but the latest Vercel bundle should already include Phase 29 direct writes.

## Validation

Config validation:

```text
npm run validate:phase30
```

Regression validation:

```text
npm run validate:phase29
npm run validate:uat:local
```

## Live SQL Execution And Probe

Operator confirmed the migration SQL was executed in the Supabase SQL Editor on 2026-07-02.

Post-SQL live validation:

```text
npm run validate:uat:live
```

Result:

- Supabase UAT anon-session RLS gate passed.
- Supabase live workflow write smoke gate passed.
- Probe rows were cleaned up.

Dedicated Phase 30 audit probe:

- Signed in with a `media_manager` anon session.
- Inserted an `audit_logs` row for `publisher.create`.
- Verified `object_type = publisher`.
- Verified `after_data.businessAuditCoverage = phase28_core_business_action`.
- Read the row back with service role for verification.
- Deleted the probe row after readback.
- Trace: `02fc3e63-c74f-4421-b912-cbfb3e30d8ce`.

## Production UAT

After SQL execution:

1. Sign in as `media_manager`.
2. Click `New publisher`.
3. Sign in as `CEO`.
4. Open `/audit/events`.
5. Refresh the event stream.

Expected visible row:

```text
publisher.create -> Media / publisher / allowed
```

If other repository warnings remain for tables such as `integration_projects`, `commercial_tests`, or `module_business_events`, handle them separately as a dirty-table workflow save optimization. They should not block the direct `audit_logs` business row after this policy is applied.

## Acceptance Criteria

Phase 30 is accepted when:

- Business audit insert policy exists. PASS.
- Own-row business audit update policy exists. PASS.
- Policy requires the Phase 28 coverage marker. PASS.
- `audit_viewer` remains excluded from writes. PASS.
- Supabase migration order documents the new migration. PASS.
- `npm run validate:phase30` passes. PASS.
- Operator executed the migration SQL in Supabase. PASS.
- `npm run validate:uat:live` passes after SQL execution. PASS.
- Dedicated anon-session `audit_logs` write probe passes and cleans up its row. PASS.
