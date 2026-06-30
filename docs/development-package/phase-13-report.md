# Phase 13 Report - Supabase UAT Auth Bootstrap and RLS Verification

Status: PASS for local script validation, live Auth bootstrap, and live anon-session RLS verification.

## Objective

Create a repeatable UAT bootstrap path for real Supabase Auth users, synchronized `profiles`, assigned `user_roles`, and anon-session RLS verification.

## Implemented Scope

- Added `scripts/supabase-uat-auth-lib.mjs` with shared UAT user planning, env loading, bootstrap logic, and RLS verification planning.
- Added `scripts/supabase-uat-auth-bootstrap.mjs`.
- Added `scripts/validate-supabase-uat-rls.mjs`.
- Added offline tests for the UAT auth plan and admin bootstrap behavior.
- Added npm scripts for dry-run, live bootstrap, dry-run RLS verification, live RLS verification, and Phase 13 validation.
- Extended `.env.example` with UAT auth variables.
- Added `supabase/migrations/202606290004_user_roles_self_read_policy.sql` to repair live environments where `user_roles` privileged-read policy was applied before the Phase 12 self-read change.

## UAT Users

The default plan creates one Auth user per locked PG OS role:

- `ceo`
- `operations_director`
- `sales_director`
- `sales_manager`
- `media_director`
- `media_manager`
- `adops_manager`
- `integration_manager`
- `data_analyst`
- `finance_manager`
- `legal_manager`
- `customer_success_manager`
- `product_owner`
- `system_admin`
- `audit_viewer`

Each user gets:

- Supabase Auth account
- `profiles` row with the same UUID as `auth.users.id`
- `user_roles` row for the role
- `profiles.metadata.pgos_uat = true`

## Environment

Required for live bootstrap:

- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `PGOS_UAT_DEFAULT_PASSWORD` or per-role `PGOS_UAT_PASSWORD_<ROLE>`

Required for live RLS verification:

- `VITE_SUPABASE_URL` or `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
- UAT user passwords

Optional:

- `PGOS_UAT_EMAIL_DOMAIN`
- `PGOS_UAT_EMAIL_PREFIX`

## Commands

Dry-run bootstrap:

```bash
npm run bootstrap:uat-auth:dry-run
```

Live bootstrap:

```bash
npm run bootstrap:uat-auth
```

Live bootstrap with password reset for existing UAT users:

```bash
node scripts/supabase-uat-auth-bootstrap.mjs --apply --reset-passwords
```

Dry-run RLS verification:

```bash
npm run verify:uat-rls:dry-run
```

Live RLS verification:

```bash
npm run verify:uat-rls
```

## RLS Verification Coverage

The live verifier signs in with anon sessions and checks:

- `media_manager` can read own profile.
- `media_manager` can read own `user_roles`.
- `media_manager` can read `publishers`.
- `media_manager` can insert a UAT publisher probe.
- `audit_viewer` can read `publishers`.
- `audit_viewer` is blocked from inserting a publisher probe.

Publisher probes are tagged with `metadata.uat_probe = true` and are cleaned up by default.

## Live Execution Notes

Live bootstrap was executed against the configured Supabase project with no email prefix:

- Created Auth users: 15
- Updated Auth users: 0
- Profiles upserted: 15
- User roles upserted: 15
- Roles upserted: 15

`auth.admin.listUsers` returned `AuthRetryableFetchError status=500`, so bootstrap used the create-first fallback path. The fallback succeeded because the UAT users did not already exist.

Initial live RLS verification failed at:

```text
media_manager RLS read expectation failed. profile=true, user_roles=false, publishers=true
```

Service-role diagnostics confirmed the `media_manager` `user_roles` row exists. The anon session cannot read it, while `audit_viewer` can. This indicates the remote database still has a privileged-only `user_roles` read policy and needs `migrations/202606290004_user_roles_self_read_policy.sql` applied.

After `migrations/202606290004_user_roles_self_read_policy.sql` was applied manually in Supabase SQL Editor, live RLS verification passed:

```text
Trace: pgos-uat-1782727252847
media_manager: profile=true, user_roles=true, publishers_read=true, publishers_write=allowed
audit_viewer: profile=true, user_roles=true, publishers_read=true, publishers_write=blocked
```

## Validation

- `npm run validate:phase2`
- `npm run validate:phase12`
- `npm run validate:phase13`
- `npm run bootstrap:uat-auth:dry-run`
- `npm run verify:uat-rls:dry-run`
- `npm run test`
- `npm run lint`
- `npm run build`
- `npm run bootstrap:uat-auth`
- `npm run verify:uat-rls`

## Next Recommended Phase

Add focused live write probes for actor-bound workflow fields, then proceed to deployment readiness checks.
