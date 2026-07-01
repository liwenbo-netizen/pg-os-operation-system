# Phase 21 Report - Production Manual Login / Role UAT

Status: AUTOMATED PREFLIGHT PASS. Production login and role UAT preflight passed; manual browser sign-off remains for visual login UX confirmation.

Update after manual browser attempt:

- `media_manager` Supabase login initially failed with `Invalid path specified in request URL`.
- Root cause: Vercel `VITE_SUPABASE_URL` can be entered with a Supabase service path such as `/rest/v1/`, while the browser `createClient()` call requires the project root URL.
- Fix: the frontend now normalizes known Supabase service paths before creating the browser client.

## Objective

Verify that the deployed production app is usable as a real PG OS entry point after Phase 19 deployment and Phase 20 Supabase frontend env readiness.

## Scope

This phase adds:

- `scripts/validate-production-manual-login-uat.mjs`
- `scripts/validate-production-manual-login-uat.test.mjs`
- `npm run validate:phase21`
- `npm run smoke:production:manual-login -- --url <deployment-url>`

## Automated Preflight

The automated preflight verifies:

- Production `/`, `/workbench`, and `/guide` route shells load.
- Representative UAT users can sign in through Supabase anon sessions.
- Each UAT session can read its matching `profiles` row.
- Each UAT session can read its assigned `user_roles` row.
- `media_manager` publisher write remains allowed and is cleaned up.
- `audit_viewer` publisher write remains blocked.

The preflight never prints passwords or token values. It prints role codes, email addresses, route status, and boolean gate results only.

## Manual Browser Checklist

Run this after automated preflight passes:

1. Open `https://pg-os-operation-system.vercel.app/`.
2. Confirm the login page says `Supabase env: configured`.
3. Select the `Supabase` login mode.
4. Sign in as `media_manager` using the UAT password from the local operator vault or `.env.local`.
5. Confirm the header badge says `Supabase auth`.
6. Confirm the active role is `Media Manager`.
7. Confirm the role selector only exposes the authenticated user's assigned role.
8. Open `/workbench` and confirm it renders.
9. Open `/guide` and confirm it renders.
10. Sign out.
11. Sign in as `audit_viewer`.
12. Confirm `Audit Viewer` can read pages but cannot complete mutating workflow actions.

## Deferred Security Item

Because service-role and UAT password values were shared during setup, rotate these before formal production usage:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PGOS_UAT_DEFAULT_PASSWORD`
- Any `PGOS_UAT_PASSWORD_*` values if introduced later

Rotation is intentionally deferred while the system remains in testing and polishing.

## Commands

Config-only validation:

```text
npm run validate:phase21
```

Latest result on 2026-07-01:

```text
PASS
Test Files 1 passed (1)
Tests 5 passed (5)
Production manual login UAT config validation passed.
```

Live production preflight:

```text
npm run smoke:production:manual-login -- --url https://pg-os-operation-system.vercel.app/
```

Latest result on 2026-07-01:

```text
Production manual login UAT preflight completed.
Trace: pgos-prod-login-1782872281090
route /: status=200, reactRoot=true
route /workbench: status=200, reactRoot=true
route /guide: status=200, reactRoot=true
sales_manager: profile=true, roles=sales_manager, publisher_write=not_checked
media_manager: profile=true, roles=media_manager, publisher_write=allowed
finance_manager: profile=true, roles=finance_manager, publisher_write=not_checked
legal_manager: profile=true, roles=legal_manager, publisher_write=not_checked
product_owner: profile=true, roles=product_owner, publisher_write=not_checked
audit_viewer: profile=true, roles=audit_viewer, publisher_write=blocked
Cleanup rows: 1
```

## Acceptance Criteria

Phase 21 is accepted when:

- `npm run validate:phase21` passes. PASS.
- `npm run smoke:production:manual-login -- --url https://pg-os-operation-system.vercel.app/` passes. PASS.
- Manual browser checklist is completed for at least `media_manager` and `audit_viewer`. PENDING OPERATOR SIGN-OFF.
- Deferred secret rotation remains documented as a pre-formal-production security item. PASS.
