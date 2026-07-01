# Phase 22 Report - Production UX / Manual Sign-off Completion

Status: PASS. Production Supabase login was manually confirmed by the operator and backed by production smoke, auth readiness, and role/RLS preflight gates.

## Objective

Close the production deployment/UAT loop with a traceable record that the deployed PG OS site is reachable, wired to Supabase, and usable for the production login path.

## Production URL

```text
https://pg-os-operation-system.vercel.app/
```

## Manual Sign-off

Operator confirmation on 2026-07-01:

- Production site opened at `https://pg-os-operation-system.vercel.app/`.
- Login page showed Supabase mode and `Supabase env: configured`.
- `media_manager@poly-gamma.com` was able to sign in after the Supabase project URL normalization fix deployed.
- The prior browser error `Invalid path specified in request URL` was resolved by commit `b656379 fix: normalize Supabase project URL`.

No password, token, service-role key, or anon key value is recorded in this report.

## Automated Evidence

Latest supporting gates:

```text
npm run test
Test Files 19 passed (19)
Tests 107 passed (107)

npm run build
Production build passed.

npm run validate:phase21
Production manual login UAT config validation passed.

npm run smoke:production:auth -- --url https://pg-os-operation-system.vercel.app/
Production auth readiness checks passed.
```

Previous Phase 21 production role/RLS preflight also passed:

```text
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

## Security Item

Secret rotation remains deferred while PG OS is in testing and polishing. Before formal production usage, rotate:

- `SUPABASE_SERVICE_ROLE_KEY`
- `PGOS_UAT_DEFAULT_PASSWORD`
- Any future `PGOS_UAT_PASSWORD_*` values

The production browser bundle gate continues to verify that server-only and UAT-only secret values are not bundled into frontend assets.

## Final Acceptance

Phase 22 is accepted when:

- Production URL opens. PASS.
- Production Supabase env is configured. PASS.
- Production Supabase login succeeds for the operator-tested role. PASS.
- Production auth readiness gate passes. PASS.
- Production role/RLS preflight has passed for representative roles, including `audit_viewer` write blocking. PASS.
- Secret rotation is tracked as a pre-formal-production security item. PASS.
