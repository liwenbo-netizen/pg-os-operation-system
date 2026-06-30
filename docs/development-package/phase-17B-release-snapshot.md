# Phase 17B Report - Git Baseline + Release Snapshot

Status: PASS. Full UAT gate passed and the repository is ready for a baseline commit review.

## Objective

Create a release snapshot for the current PG OS V2.11 UAT-ready implementation and confirm the Git baseline can be prepared without committing local secrets or generated artifacts.

## Implemented Scope

- Added `validate:phase17b` as an alias for the full UAT acceptance gate.
- Updated the Phase 16A deployment runbook so the documented `validate:uat` steps include secret hygiene.
- Captured the latest full UAT result with live Supabase RLS and workflow write probes.
- Documented Git baseline scope and exclusions.

## Full UAT Result

Command:

```text
npm run validate:uat
```

Result:

```text
PG OS UAT acceptance gate passed in 87.6s.
```

Step summary:

- Secret hygiene passed. The gate checked `.gitignore`, `.env.example`, Git env tracking, and 125 text files.
- Vitest passed: 15 test files, 91 tests.
- TypeScript check passed.
- Production build passed.
- Domain/schema alignment passed for `Opportunity.stage`.
- Supabase anon-session RLS gate passed.
- Supabase live workflow write smoke gate passed.

Live traces:

```text
RLS trace: pgos-uat-1782742064993
Live writes trace: pgos-live-1782742081922
Live write cleanup rows: 12
```

Post-snapshot local validation:

```text
npm run validate:phase17a
Secret hygiene validation passed.
Checked .gitignore, .env.example, Git env tracking, and 126 text files.

npm run validate:uat:local
PG OS UAT acceptance gate passed in 35.3s.
```

## Release Snapshot

Current implementation includes:

- React + TypeScript + Vite app shell and role-aware navigation.
- Phase 4-10 workflow surfaces for Media, Sales, Diagnostics, Finance, Contracts, Guide, OKR, and Workbench operations.
- Supabase repository adapter for workflow persistence.
- Supabase Auth session binding with profile and user role resolution.
- UAT Auth bootstrap scripts and anon-session RLS verification.
- Actor UUID binding for workflow writes.
- Live domain write probes across core business modules.
- Domain/schema enum alignment for `opportunities.stage`.
- Secret hygiene gate and local env protection.

Supabase migration order:

1. `supabase/migrations/202606290001_base_schema.sql`
2. `supabase/migrations/202606290002_rls_policies.sql`
3. `supabase/migrations/202606290004_user_roles_self_read_policy.sql`
4. `supabase/migrations/202606290005_contracts_write_policy.sql`
5. `supabase/migrations/202606290006_opportunity_stage_domain_alignment.sql`
6. `supabase/seed/202606290003_uat_seed.sql`

## Git Baseline Readiness

Ready for baseline review:

- App source under `src/`.
- Supabase schema, policies, migrations, and seed under `supabase/`.
- Validation and bootstrap scripts under `scripts/`.
- Development package reports under `docs/development-package/`.
- Project config, package manifest, lockfile, and `.env.example`.

Excluded from baseline:

- `.env.local`
- `.env`
- `.env.*`
- `dist/`
- `node_modules/`
- coverage, test reports, Vite cache, logs, and TypeScript build info

Current Git status remains uncommitted by design. Create the baseline commit only after final review.

Suggested commit message:

```text
baseline: PG OS V2.11 UAT-ready operation system
```

## Known Non-Blocking Warnings

- Vite reports the main JS chunk is larger than 500 kB after minification.
- Vite plugin timing output may appear during production builds.
- UAT bootstrap can still hit Supabase Auth Admin `listUsers` 500 responses on some runs; existing fallback behavior remains documented in the runbook.

## Next Gate

Use either command for the same full acceptance gate:

```text
npm run validate:uat
npm run validate:phase17b
```
