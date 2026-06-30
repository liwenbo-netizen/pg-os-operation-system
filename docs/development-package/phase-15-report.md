# Phase 15 Report - Live Domain Write Probes / UAT Smoke Gate

Status: PASS for dry-run planning, local tests, and live UAT smoke gate.

## Objective

Verify that real Supabase Auth sessions, RLS policies, actor UUID fields, and core business-domain writes work together before deployment readiness work.

## Implemented Scope

- Added `scripts/supabase-live-write-probe-lib.mjs`.
- Added `scripts/validate-supabase-live-workflow-writes.mjs`.
- Added `scripts/supabase-live-write-probe-lib.test.mjs`.
- Added npm scripts:
  - `validate:phase15`
  - `verify:uat-live-writes:dry-run`
  - `verify:uat-live-writes`
- Added `supabase/migrations/202606290005_contracts_write_policy.sql`.
- Updated `supabase/README.md` migration order.
- Mirrored the contracts write policy in `supabase/policies/rls_policies.sql`.

## Probe Coverage

The live smoke gate signs in with anon sessions and probes:

- `sales_manager`: `advertisers -> opportunities -> proposals`
- `media_manager`: `publishers`
- `integration_manager`: `publishers -> integration_projects`
- `data_analyst`: `commercial_tests`
- `data_analyst`: `quality_diagnostic_cases -> quality_diagnostic_evidence`
- `finance_manager`: `settlements`
- `legal_manager`: `contracts`
- `audit_viewer`: blocked from `publishers` and `advertisers`

For actor-aware tables, probes verify that expected UUID columns match the signed-in UAT user:

- `owner_user_id`
- `created_by`
- `updated_by`
- `created_by` for diagnostic evidence

All probe rows are tagged with `metadata.uat_probe = true` where the table supports metadata and are cleaned up by default.

## Live Result

Live command:

```bash
npm run verify:uat-live-writes
```

Result:

```text
Trace: pgos-live-1782735974429
sales_chain: passed
media_publisher: passed
integration_project: passed
commercial_test: passed
diagnostics: passed
finance_settlement: passed
legal_contract: passed
audit_viewer_blocked: passed
Cleanup rows: 12
```

## Validation

- `npm run validate:phase15`
- `npm run verify:uat-live-writes:dry-run`
- `npm run verify:uat-live-writes`

## Notes

The first live pass exposed a remote `chk_opportunity_stage` constraint that accepted `discovery`, `negotiation`, `won`, and `lost`, while the frontend domain model also uses `need_confirmed`, `proposal_drafting`, and `proposal_review`. Phase 16B adds `202606290006_opportunity_stage_domain_alignment.sql` and returns the smoke probe to `proposal_drafting` so UAT covers the aligned business stage.

## Next Recommended Phase

Proceed to deployment readiness:

- add a consolidated UAT acceptance command that runs Phase 13 and Phase 15 gates;
- add rollback/cleanup runbooks for UAT probe artifacts;
- keep schema/domain enum drift covered by `npm run validate:domain-schema`.
