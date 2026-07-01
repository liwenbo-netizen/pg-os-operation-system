# Phase 26 Report - Real Audit Event Write Coverage

Status: PASS. PG OS now writes first-class system audit events into Supabase `audit_logs` instead of relying only on workflow snapshot save events.

## Objective

Close the observability loop by adding real audit writes for authentication, role changes, and route access decisions.

Phase 24 made audit/business events readable from Supabase. Phase 25 aligned System Health to that live source. Phase 26 adds the missing write coverage for system-level audit events.

## Scope

This phase adds:

- `AuditLogRepository` for frontend-safe `audit_logs` inserts through the Supabase anon session.
- Audit row mapping with UUID guards for nullable UUID columns.
- `auth.sign_in` audit writes after successful Supabase login.
- `auth.sign_out` audit writes before Supabase session termination.
- `role.switch` audit writes for allowed role changes.
- `role.switch.denied` audit writes for unassigned role attempts.
- `route.visit` audit writes for allowed in-app route navigation.
- `route.denied` audit writes for blocked route navigation attempts.
- `npm run validate:phase26`.

## Event Ownership

`audit_logs` now covers system and authorization events:

```text
auth.sign_in
auth.sign_out
role.switch
role.switch.denied
route.visit
route.denied
```

`module_business_events` continues to cover business workflow events such as publisher creation, proposal flow changes, settlement work, guide usage, and workbench operations.

## Data Safety

The frontend writes through the existing Supabase anon session only. It does not use the service role key.

Route paths and non-UUID business identifiers are stored in `after_data`. The `object_id` database column is populated only when the value is a valid UUID, preventing route paths from violating UUID constraints.

Audit writes are non-blocking for normal navigation and role switching. Sign-out writes are attempted before session termination so the authenticated anon session can satisfy RLS.

## Validation

Config and repository validation:

```text
npm run validate:phase26
```

Expected result:

```text
PASS
Real audit event write coverage config validation passed.
```

Regression validation:

```text
npm run test
npm run build
npm run validate:phase24
npm run validate:phase25
npm run validate:secret-hygiene
```

## Production UAT

Production UAT was completed with the CEO role after Vercel deployment:

```text
URL: https://pg-os-operation-system.vercel.app/
Role: CEO
System Health: Supabase live, 10 audit event(s), 2 business event(s)
Audit Events: Supabase live
Observed audit events: auth.sign_in, auth.sign_out, route.visit
Observed audit status: allowed
Decision: PASS
```

This confirms `/audit/events` shows both event classes from the live Supabase source:

- `audit_logs`: `auth.sign_in`, `auth.sign_out`, `route.visit`.
- `module_business_events`: existing business workflow events.

## Acceptance Criteria

Phase 26 is accepted when:

- `audit_logs` insert code exists behind a repository adapter. PASS.
- Auth, role, and route audit event writes are wired. PASS.
- `object_id` UUID safety is enforced. PASS.
- `/audit/events` can read the resulting audit rows through existing live event pagination. PASS.
- `npm run validate:phase26` passes. PASS.
