# Phase 31 Report - Workflow Snapshot Dirty Save / RLS Warning Cleanup

Status: PASS. PG OS now dirty-saves Supabase workflow snapshots instead of upserting every workflow table after each local state change.

## Objective

Reduce noisy Supabase repository warnings caused by broad snapshot saves. Before this phase, a single Media action could trigger upserts for unrelated Sales, Finance, Contract, Guide, Workbench, `audit_logs`, and `module_business_events` rows.

That made production UAT harder to read because warnings such as unrelated table RLS failures could appear even when the user only touched one workflow surface.

## Scope

Changed adapter:

```text
src/repositories/supabaseWorkflowRepository.ts
```

The repository now:

- Captures the loaded Supabase workflow snapshot as the persisted baseline.
- Builds comparable row fingerprints per table and row id.
- Upserts only rows that are new or changed versus the baseline.
- Keeps the previous full-save behavior when no baseline exists.
- Updates the baseline after a warning-free save.
- Avoids re-upserting old `audit_logs` and `module_business_events` rows after a successful save.

## RLS Warning Cleanup Impact

Expected effect:

- Creating a publisher no longer attempts to write unrelated `advertisers`, `opportunities`, `settlements`, `sop_cards`, or `okr_objectives` rows.
- Repeated workflow actions no longer re-upsert old `module_business_events` rows that can require update policies.
- Direct `audit_logs` business rows from Phase 29/30 remain available for `/audit/events`.
- Remaining warnings should now correspond to the actually changed table, not unrelated snapshot noise.

## Validation

Config and regression validation:

```text
npm run validate:phase31
npm run validate:phase23
npm run validate:phase24
npm run validate:phase29
npm run validate:uat:local
```

Focused test coverage:

- Dirty save only changed rows after a loaded Supabase baseline.
- Dirty save only new audit/business event rows after a successful baseline save.
- Unrelated tables such as `advertisers` are not upserted for a Media-only change.
- `module_business_events` receives only the new business event row on the second save.

## Production UAT

After Vercel deploy:

1. Sign in as `media_manager`.
2. Open `Publisher 360`.
3. Click `New publisher`.
4. Check the top-right Supabase status.
5. Open `System Health`.
6. Sign in as CEO and open `/audit/events`.

Expected:

- Warning count should be lower than the previous broad snapshot save behavior.
- `publisher.create` should still appear in `/audit/events`.
- Any remaining warning should point at the table actually touched by the action.

## Acceptance Criteria

Phase 31 is accepted when:

- Supabase workflow repository keeps a persisted snapshot baseline. PASS.
- Save only upserts rows that are new or changed. PASS.
- Existing no-baseline full-save behavior remains covered. PASS.
- Audit/business events are dirty-saved row by row. PASS.
- `npm run validate:phase31` passes. PASS.
