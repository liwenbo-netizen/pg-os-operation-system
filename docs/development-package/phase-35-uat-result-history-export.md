# Phase 35 Report - UAT Result History / Export View

Status: PASS. PG OS now includes a read-only UAT Result History page for production UAT evidence review and export.

## Objective

Turn Supabase-backed UAT checklist records into a reusable release evidence archive. Sign-off and audit roles can review previous UAT runs, inspect step-level actual results, filter evidence, and export records for release documentation.

## Scope

New route:

```text
/uat/history
```

Access is limited to the same sign-off/support roles as `/uat/scripts`:

- CEO
- Operations Director
- System Admin
- Audit Viewer

Updated repository:

```text
src/repositories/uatScriptResultRepository.ts
```

The repository now supports:

- Loading recent `uat_script_runs`.
- Selecting a run and loading related `uat_script_step_results`.
- Returning structured warnings when Supabase history cannot be loaded.

New page:

```text
src/pages/uat/UatResultHistoryPage.tsx
```

The page supports:

- Run history list.
- Selected run summary.
- Step evidence table.
- Role filter.
- Status filter.
- CSV export.
- JSON export.
- Supabase source/warning state display.

New export service:

```text
src/services/uatHistoryExportService.ts
```

The service creates stable CSV, JSON, and file names for the selected UAT run and visible step evidence.

## Validation

Run:

```text
npm run validate:phase35
npm run validate:phase34
npm run validate:phase18d
npm run lint
npm run build
```

Expected:

- UAT history repository tests pass.
- CSV/JSON export tests pass.
- Route guard tests confirm `/uat/history` access boundaries.
- Production smoke config includes `/uat/history`.
- TypeScript and production build pass.

## Acceptance Criteria

- `/uat/history` exists in the route catalog. PASS.
- `/uat/history` is limited to sign-off/support roles. PASS.
- Page loads UAT run history from Supabase. PASS.
- Page shows selected run step evidence. PASS.
- Page filters by role and step status. PASS.
- Page exports visible evidence as CSV and JSON. PASS.
- Production smoke includes `/uat/history`. PASS.
- `npm run validate:phase35` passes. PASS.
