# Phase 24 Report - Supabase Audit Events Pagination

Status: PASS. `/audit/events` now reads live Supabase audit/business event tables with frontend-safe pagination and snapshot fallback.

## Objective

Move the audit event console from a frontend-only workflow snapshot to the production event source of record.

## Scope

This phase adds:

- `AuditEventRepository` for read-only Supabase event access.
- Live reads from `audit_logs` and `module_business_events`.
- Global newest-first pagination across both event tables.
- Row mapping from Supabase snake_case records into `ObservabilityEvent`.
- Snapshot fallback when Supabase is not configured or both live reads fail.
- Partial live mode when one event table succeeds and the other is blocked by RLS or unavailable.
- `/audit/events` refresh, pagination, source status, and warning display.
- `npm run validate:phase24`.

## Access Model

The frontend uses only the configured Supabase anon client. It does not use the service role key.

Route access remains limited to:

```text
ceo
system_admin
audit_viewer
```

Database access remains governed by Supabase RLS:

- `audit_logs`: privileged audit-read roles.
- `module_business_events`: authenticated business users.

## Fallback Behavior

If Supabase frontend config is missing, the page shows the current frontend workflow snapshot and labels the source as `Snapshot fallback`.

If one table fails and the other succeeds, the page shows the successful live rows, labels the source as `Supabase partial`, and renders the warning.

If both live reads fail, the page falls back to the snapshot and renders both table warnings.

## Validation

Config and repository validation:

```text
npm run validate:phase24
```

Latest result:

```text
PASS
Test Files 2 passed (2)
Tests 8 passed (8)
Production audit event config validation passed.
```

Build:

```text
npm run build
Production build passed.
```

Regression expectations:

- Existing Phase 23 observability gate remains green.
- Production smoke continues to include `/audit/events`.
- Manual production UAT should log in as an audit-capable role and confirm the page source shows `Supabase live` or `Supabase partial` instead of snapshot-only state.

## Manual Production Sign-Off

Operator sign-off was completed on the production deployment:

```text
URL: https://pg-os-operation-system.vercel.app/audit/events
Role: CEO
Result: Supabase live source badge visible
Observed event: publisher.created / module_business_events / business
Decision: PASS
```

This confirms the production `/audit/events` route is no longer limited to the current frontend snapshot and can read the live Supabase event stream through the browser anon session.

## Acceptance Criteria

Phase 24 is accepted when:

- `npm run validate:phase24` passes. PASS.
- `npm run build` passes. PASS.
- `/audit/events` reads `audit_logs` and `module_business_events` through Supabase anon session code. PASS.
- `/audit/events` keeps snapshot fallback and warning visibility. PASS.
- Route and RLS boundaries remain unchanged. PASS.
