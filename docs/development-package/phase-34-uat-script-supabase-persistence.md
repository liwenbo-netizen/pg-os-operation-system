# Phase 34 Report - UAT Script Supabase Persistence

Status: PASS pending production SQL execution. PG OS now has code-level support for storing Production UAT Script Center results in Supabase with local browser fallback.

## Objective

Move `/uat/scripts` from browser-only checklist storage to a database-backed UAT evidence record. The page still keeps local browser persistence so manual validation work is not lost when Supabase is unavailable or an RLS policy is missing.

## Scope

New Supabase migration:

```text
supabase/migrations/202607020003_uat_script_results.sql
```

It creates:

- `uat_script_runs` for the production UAT run header, summary, environment, production URL, and sign-off actor.
- `uat_script_step_results` for each checklist step status, actual result, actor, expected result, and updated timestamp.

RLS is aligned with the `/uat/scripts` route boundary:

- `ceo`
- `operations_director`
- `system_admin`
- `audit_viewer`

New repository:

```text
src/repositories/uatScriptResultRepository.ts
```

The repository supports:

- Loading the current production UAT run from Supabase.
- Saving run summary and all configured checklist steps.
- Returning structured warnings instead of throwing on missing migration, RLS denial, or network failure.
- Falling back to local browser storage when Supabase is not configured.

Updated page:

```text
src/pages/uat/UatScriptCenterPage.tsx
```

The page now:

- Loads local results immediately.
- Loads Supabase results in Supabase auth mode.
- Merges local and remote step results by newest `updatedAt`.
- Saves locally first, then debounces Supabase writes.
- Shows `Supabase synced`, `Supabase warning`, or `Local only` status in the UAT script sidebar.

## Validation

Run:

```text
npm run validate:phase34
npm run validate:phase33
npm run lint
npm run build
```

Expected:

- UAT script merge tests pass.
- Supabase UAT result repository tests pass.
- Phase 34 config gate confirms repository, migration, page wiring, and report markers.
- TypeScript and production build pass.

## Production SQL Step

Before production UAT records can be stored remotely, execute:

```text
supabase/migrations/202607020003_uat_script_results.sql
```

After execution, sign in to production with CEO or another `/uat/scripts` sign-off role, open `/uat/scripts`, mark one checklist step, and confirm the sidebar shows `Supabase synced`.

## Acceptance Criteria

- `/uat/scripts` remains available to sign-off/support roles. PASS.
- UAT results continue to persist locally. PASS.
- UAT results can persist to Supabase after the migration is applied. PASS.
- Supabase warnings are visible in the page instead of failing silently. PASS.
- Migration creates `uat_script_runs` and `uat_script_step_results` with RLS. PASS.
- `npm run validate:phase34` passes. PASS.

## Production Sign-Off

Recorded at: 2026-07-02 22:44:57 UTC+8.

Production URL:

```text
https://pg-os-operation-system.vercel.app/
```

Database migration executed:

```text
supabase/migrations/202607020003_uat_script_results.sql
```

Executed:

```text
npm run validate:phase34
npm run smoke:production -- --url https://pg-os-operation-system.vercel.app/
```

Production verification:

- Vercel production bundle contains `uat_script_runs`, `uat_script_step_results`, `/uat/scripts`, and sync status markers. PASS.
- Supabase REST probe returned HTTP 200 for `uat_script_runs`. PASS.
- Supabase REST probe returned HTTP 200 for `uat_script_step_results`. PASS.
- Production smoke confirms `/uat/scripts` returns HTTP 200 with React root. PASS.
- Phase 34 is ready for CEO/manual UAT step marking and remote result persistence. PASS.
