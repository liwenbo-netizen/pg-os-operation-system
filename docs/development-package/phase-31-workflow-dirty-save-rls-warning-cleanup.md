# Phase 31 Report - Workflow Snapshot Dirty Save / RLS Warning Cleanup

Status: PASS. PG OS now dirty-saves Supabase workflow snapshots instead of upserting every workflow table after each local state change.

Update after production UAT: PASS. The operator found two remaining warnings after `media_manager` clicked `New publisher`: `integration_projects` and `audit_logs`.

Update after Phase 31B production retest: PASS. The SQL migration is applied, live RLS probe passed, and production smoke remains green.

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
- Avoids bulk `audit_logs` upserts after a loaded baseline because Phase 29 direct audit writes are the production audit path.
- Avoids re-upserting old `module_business_events` rows after a successful save.

New migration:

```text
supabase/migrations/202607020002_media_manager_integration_project_policy.sql
```

The migration aligns Supabase RLS with the Publisher 360 workflow by allowing `media_manager` to create the initial `integration_projects` row during publisher onboarding.

## RLS Warning Cleanup Impact

Expected effect:

- Creating a publisher no longer attempts to write unrelated `advertisers`, `opportunities`, `settlements`, `sop_cards`, or `okr_objectives` rows.
- Repeated workflow actions no longer re-upsert old `module_business_events` rows that can require update policies.
- Loaded-baseline snapshot saves no longer bulk upsert `audit_logs`, avoiding duplicate writes against the direct audit path.
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
- Dirty save only new business event rows after a successful baseline save.
- Loaded-baseline snapshot save does not bulk write `audit_logs`.
- Unrelated tables such as `advertisers` are not upserted for a Media-only change.
- `module_business_events` receives only the new business event row on the second save.

## Production UAT

Before retesting production, run this SQL in the Supabase SQL Editor:

```text
supabase/migrations/202607020002_media_manager_integration_project_policy.sql
```

After SQL execution and Vercel deploy:

1. Sign in as `media_manager`.
2. Open `Publisher 360`.
3. Click `New publisher`.
4. Check the top-right Supabase status.
5. Open `System Health`.
6. Sign in as CEO and open `/audit/events`.

Expected:

- Warning count should be lower than the previous broad snapshot save behavior.
- `publisher.create` should still appear in `/audit/events`.
- `integration_projects` should no longer warn for `media_manager` publisher onboarding.
- `audit_logs` should no longer warn from the snapshot save path.

## Phase 31B Production Retest Sign-off

Retest time: 2026-07-02 15:00:01 UTC+8.

Live RLS probe:

```text
traceId: phase31b-1782975530915-177a1bf2
media_manager publisher write: allowed
media_manager integration_projects write: allowed
actor field match: true
cleanup: completed
```

Production smoke:

```text
npm run smoke:production -- --url https://pg-os-operation-system.vercel.app/
```

Result: PASS for `/`, `/workbench`, `/guide`, `/system/health`, `/audit/events`, `/contracts/uat-smoke`, `/finance/settlements/uat-smoke`, `/media/manager-workbench`, and `/sales/manager-workbench`.

Regression gate:

```text
npm run validate:phase31
```

Result: PASS, 2 test files and 11 tests passed.

## Acceptance Criteria

Phase 31 is accepted when:

- Supabase workflow repository keeps a persisted snapshot baseline. PASS.
- Save only upserts rows that are new or changed. PASS.
- Existing no-baseline full-save behavior remains covered. PASS.
- Loaded-baseline bulk `audit_logs` writes are skipped in favor of direct audit writes. PASS.
- Business events are dirty-saved row by row. PASS.
- Media Manager integration project RLS migration exists. PASS.
- `npm run validate:phase31` passes. PASS.
- Phase 31B live RLS production retest passes for `media_manager` publisher onboarding. PASS.
- Production smoke remains green after SQL and Vercel deployment. PASS.
