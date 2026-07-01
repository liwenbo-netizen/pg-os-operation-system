# Phase 23 Report - Production Observability / Error & Audit Console

Status: IN PROGRESS. Adds the first production observability layer for support, audit review, and runtime recovery.

## Objective

Move PG OS from production-login-ready to production-support-ready by making runtime state, audit events, and support diagnostics visible in the application.

## Scope

This phase adds:

- Runtime `ErrorBoundary` around the app.
- `/system/health` route for auth, repository, warnings, active route, and event coverage.
- `/audit/events` route for read-only audit and business event review.
- `ObservabilityService` for health checks and event aggregation.
- `npm run validate:phase23`.
- Production smoke coverage for `/system/health` and `/audit/events`.

## Access Model

`/system/health` is visible to all authenticated PG OS roles because it is read-only and useful during support calls.

`/audit/events` is limited to:

```text
ceo
system_admin
audit_viewer
```

This matches the audit-read intent used by the existing RBAC/RLS model.

## Validation

Config and local validation:

```text
npm run validate:phase23
```

Production deep-link smoke after deployment:

```text
npm run smoke:production -- --url https://pg-os-operation-system.vercel.app/
```

## Acceptance Criteria

Phase 23 is accepted when:

- `npm run validate:phase23` passes.
- `npm run test` passes.
- `npm run build` passes.
- Production smoke includes `/system/health` and `/audit/events`.
- Secret hygiene passes.
