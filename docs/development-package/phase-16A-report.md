# Phase 16A Report - UAT Acceptance And Deployment Readiness

Status: PASS. Full UAT acceptance gate completed successfully.

## Objective

Turn the completed Supabase Auth, RLS, actor binding, and live write probes into a repeatable one-command UAT acceptance gate.

## Implemented Scope

- Added `scripts/validate-uat.mjs`.
- Added npm scripts:
  - `validate:uat`
  - `validate:uat:local`
  - `validate:uat:live`
- Added `docs/development-package/phase-16A-uat-deployment-runbook.md`.
- Updated README setup guidance to reference the UAT acceptance command.

## Acceptance Gate

`npm run validate:uat` runs:

- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run validate:domain-schema`
- `npm run verify:uat-rls`
- `npm run verify:uat-live-writes`

`npm run validate:uat:local` runs only local quality gates.

`npm run validate:uat:live` runs only live Supabase UAT gates.

## Live Result

Live command:

```bash
npm run validate:uat
```

Result:

```text
PG OS UAT acceptance gate passed in 77.8s.
RLS trace: pgos-uat-1782740448076
Live writes trace: pgos-live-1782740462074
Live write cleanup rows: 12
```

## Live Dependencies

The full gate requires:

- `.env.local` with Supabase URL, anon key, service role key, and UAT password.
- UAT Auth users bootstrapped with `npm run bootstrap:uat-auth`.
- Supabase migrations through `202606290006_opportunity_stage_domain_alignment.sql`.

## Domain/Schema Alignment

Phase 16B aligns `opportunities.stage` via `202606290006_opportunity_stage_domain_alignment.sql` and adds `npm run validate:domain-schema` to the UAT local gate.
