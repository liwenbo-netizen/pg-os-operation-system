# Phase 16A UAT Deployment Runbook

## Purpose

Use this runbook to validate a PG OS UAT deployment with one repeatable command after migrations, environment variables, and UAT Auth users are prepared.

## Required Environment

Create `.env.local` from `.env.example` and configure:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENV=development
APP_BASE_URL=http://localhost:5173
PGOS_UAT_EMAIL_DOMAIN=
PGOS_UAT_EMAIL_PREFIX=
PGOS_UAT_DEFAULT_PASSWORD=
```

Notes:

- `VITE_SUPABASE_URL` must be the project URL. The scripts tolerate copied service URLs such as `/rest/v1` or `/auth/v1`.
- `VITE_SUPABASE_ANON_KEY` is used by live anon-session RLS and write probes.
- `SUPABASE_SERVICE_ROLE_KEY` is used only for UAT Auth bootstrap.
- `.env.local` must not be committed.

## Supabase Migration Order

Apply migrations in this order:

1. `supabase/migrations/202606290001_base_schema.sql`
2. `supabase/migrations/202606290002_rls_policies.sql`
3. `supabase/migrations/202606290004_user_roles_self_read_policy.sql`
4. `supabase/migrations/202606290005_contracts_write_policy.sql`
5. `supabase/migrations/202606290006_opportunity_stage_domain_alignment.sql`
6. `supabase/seed/202606290003_uat_seed.sql`

The two patch migrations are required for live gates:

- `202606290004_user_roles_self_read_policy.sql` lets authenticated users read their own `user_roles`.
- `202606290005_contracts_write_policy.sql` lets `legal_manager`, `finance_manager`, and `operations_director` write `contracts`.
- `202606290006_opportunity_stage_domain_alignment.sql` aligns `opportunities.stage` with the frontend Opportunity domain model.

## UAT Auth Bootstrap

Preview planned UAT users:

```bash
npm run bootstrap:uat-auth:dry-run
```

Create or sync UAT Auth users, profiles, roles, and user_roles:

```bash
npm run bootstrap:uat-auth
```

Reset passwords for existing UAT users only when needed:

```bash
node scripts/supabase-uat-auth-bootstrap.mjs --apply --reset-passwords
```

## Acceptance Commands

Local quality gate only:

```bash
npm run validate:uat:local
```

Live UAT gates only:

```bash
npm run validate:uat:live
```

Full UAT acceptance gate:

```bash
npm run validate:uat
```

`validate:uat` runs:

1. `npm run validate:secret-hygiene`
2. `npm run test`
3. `npm run lint`
4. `npm run build`
5. `npm run validate:domain-schema`
6. `npm run verify:uat-rls`
7. `npm run verify:uat-live-writes`

## Live Gate Coverage

`verify:uat-rls` confirms:

- `media_manager` can read own profile and roles.
- `media_manager` can read and write publishers.
- `audit_viewer` can read but cannot write publishers.

`verify:uat-live-writes` confirms:

- `sales_manager` writes advertiser, opportunity, and proposal records.
- `media_manager` writes publisher records.
- `integration_manager` writes publisher and integration project records.
- `data_analyst` writes commercial test and diagnostic records.
- `finance_manager` writes settlement records.
- `legal_manager` writes contract records.
- `audit_viewer` is blocked from business writes.
- actor-aware fields match the signed-in UAT user UUID.
- temporary probe rows are cleaned up.

## Cleanup And Rollback

Live probes clean up inserted rows automatically. If a run is interrupted, search rows with:

- `metadata->>'uat_probe' = 'true'`
- `metadata->>'trace_id'` equal to the trace printed by the failed command
- names beginning with `UAT`

Delete probe rows from child tables before parent tables:

1. `quality_diagnostic_evidence`
2. `quality_diagnostic_cases`
3. `commercial_tests`
4. `integration_projects`
5. `proposals`
6. `opportunities`
7. `advertisers`
8. `settlements`
9. `contracts`
10. `publishers`

Policy rollback should be done by replacing the policy with the previous approved migration state, not by disabling RLS.

## Failure Triage

If `verify:uat-rls` fails at `user_roles=false`:

- confirm `202606290004_user_roles_self_read_policy.sql` is applied;
- confirm the UAT user has a `profiles` row matching `auth.users.id`;
- confirm `user_roles.user_id` matches that profile id.

If `verify:uat-live-writes` fails at `legal_contract`:

- confirm `202606290005_contracts_write_policy.sql` is applied.

If a write fails with a check constraint:

- compare the frontend domain enum to the remote DB constraint;
- run `npm run validate:domain-schema`;
- confirm `202606290006_opportunity_stage_domain_alignment.sql` is applied when the failing table is `opportunities`.

If Auth Admin `listUsers` returns `AuthRetryableFetchError status=500`:

- the bootstrap script can still create fresh UAT users through the create-first fallback;
- existing users may need manual reconciliation if creation reports duplicates.

## Exit Criteria

UAT deployment is accepted when:

- `npm run validate:uat` passes;
- no probe cleanup failures are reported;
- no secrets are present in `.env.example`;
- local env files such as `.env.local` remain ignored by Git;
- Supabase migrations and runbook are aligned with the target project.
