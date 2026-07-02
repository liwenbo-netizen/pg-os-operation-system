# Phase 32 Report - Production Warning Diagnostics Center

Status: PASS. The top-right Supabase repository status is now a clickable diagnostics center instead of a count-only warning badge.

## Objective

Make production Supabase warnings self-diagnosing during UAT and operations. Operators should see the affected table, inferred action, raw error, active role, UTC+8 time, and suggested fix without relying on screenshots or guessing which RLS policy failed.

## Scope

Added diagnostics service:

```text
src/services/warningDiagnosticsService.ts
```

The service converts repository warnings and skipped writes into structured diagnostics:

- `table`
- `action`
- `error`
- `role`
- `time`
- `suggestion`

Updated shell header:

```text
src/app/AppShell.tsx
```

The Supabase repository status chip now opens a diagnostics panel. The panel displays active repository warnings and still shows a healthy empty state when no warning exists.

Updated app wiring:

```text
src/App.tsx
```

Repository health is now enriched with warning diagnostics before it reaches the shell.

## Diagnostic Rules

The first production rules cover:

- RLS failures: suggest checking Supabase policies for the active role and adding `WITH CHECK` for writes.
- Check constraint failures: suggest schema/domain enum alignment.
- Foreign key failures: suggest parent-row and write-order checks.
- UUID/fixture id skips: explain why fixture slug ids are not persisted.
- Missing configuration: suggest deployment environment variable review.

## Validation

Run:

```text
npm run validate:phase32
npm run lint
npm run build
```

Expected:

- Warning diagnostics service tests pass.
- Config validation confirms the header panel, service, UTC+8 formatting, and report markers exist.
- TypeScript and production build pass.

## Production Deployment Sign-off

Sign-off time: 2026-07-02 16:49:09 UTC+8.

Production URL:

```text
https://pg-os-operation-system.vercel.app/
```

Production smoke:

```text
npm run smoke:production -- --url https://pg-os-operation-system.vercel.app/
```

Result: PASS for `/`, `/workbench`, `/guide`, `/system/health`, `/audit/events`, `/contracts/uat-smoke`, `/finance/settlements/uat-smoke`, `/media/manager-workbench`, and `/sales/manager-workbench`.

Production bundle marker check:

```text
index-rgivAAFf.js
Supabase diagnostics: found
Suggested fix: found
```

Result: PASS. Vercel production is serving the Phase 32 diagnostics panel bundle.

## Acceptance Criteria

- Supabase repository warning status is clickable. PASS.
- Diagnostics show table, action, error, role, time, and suggested fix. PASS.
- Warning timestamps are displayed in UTC+8. PASS.
- RLS warning suggestions are actionable for Supabase policy fixes. PASS.
- `npm run validate:phase32` passes. PASS.
- Production smoke passes after Vercel deployment. PASS.
- Production bundle contains the diagnostics panel markers. PASS.
