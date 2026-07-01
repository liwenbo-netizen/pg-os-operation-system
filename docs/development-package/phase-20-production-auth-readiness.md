# Phase 20 Report - Production Auth Readiness Gate

Status: PASS. The repeatable production auth readiness gate is implemented, Vercel Production env was redeployed, and the production bundle now contains the Supabase frontend env values without leaking server-only or UAT-only secrets.

## Objective

Verify that the deployed Vercel browser bundle is wired to Supabase Auth without leaking server-only or UAT-only secrets.

## Scope

This phase adds:

- `scripts/validate-production-auth-readiness.mjs`
- `scripts/validate-production-auth-readiness.test.mjs`
- `npm run validate:phase20`
- `npm run smoke:production:auth -- --url <deployment-url>`

## Gate Behavior

The live production auth readiness gate:

- Fetches the production `index.html`.
- Extracts referenced JavaScript bundle assets.
- Confirms the configured Supabase project URL is present in the deployed browser bundle.
- Confirms the configured Supabase anon key is present in the deployed browser bundle.
- Confirms service-role and UAT password values are not present in the deployed browser bundle.

The gate does not print secret values. If a forbidden value is detected, it prints only the environment variable name.

## Commands

Config-only validation:

```text
npm run validate:phase20
```

Latest result on 2026-07-01:

```text
PASS
Test Files 1 passed (1)
Tests 5 passed (5)
Production auth readiness config validation passed.
```

Live production validation:

```text
npm run smoke:production:auth -- --url https://pg-os-operation-system.vercel.app/
```

Latest result after Vercel redeploy on 2026-07-01:

```text
Production index status=200
Production JS assets checked=1
Supabase URL present in production bundle=true
Supabase anon key present in production bundle=true
Forbidden server/UAT secrets present in production bundle=0
Production auth readiness checks passed.
```

## Vercel Env Fix

The first live check failed because the Vercel production deployment did not yet contain the frontend Supabase env values. The operator added these variables in Vercel Project Settings -> Environment Variables for the Production environment, then redeployed:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Do not add:

```text
SUPABASE_SERVICE_ROLE_KEY
PGOS_UAT_DEFAULT_PASSWORD
PGOS_UAT_PASSWORD_*
```

Follow-up production route smoke after redeploy also passed:

```text
npm run smoke:production -- --url https://pg-os-operation-system.vercel.app/
PASS / status=200 reactRoot=true
PASS /workbench status=200 reactRoot=true
PASS /guide status=200 reactRoot=true
PASS /contracts/uat-smoke status=200 reactRoot=true
PASS /finance/settlements/uat-smoke status=200 reactRoot=true
PASS /media/manager-workbench status=200 reactRoot=true
PASS /sales/manager-workbench status=200 reactRoot=true
Production deployment smoke checks passed.
```

## Acceptance Criteria

Phase 20 is accepted when:

- `npm run validate:phase20` passes. PASS.
- `npm run smoke:production:auth -- --url https://pg-os-operation-system.vercel.app/` passes. PASS.
- No `SUPABASE_SERVICE_ROLE_KEY`, `PGOS_UAT_DEFAULT_PASSWORD`, or per-role `PGOS_UAT_PASSWORD_*` value appears in the production browser bundle. PASS.
