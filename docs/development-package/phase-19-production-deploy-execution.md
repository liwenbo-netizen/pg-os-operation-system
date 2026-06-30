# Phase 19 Report - Production Deploy Execution / Vercel

Status: PASS. Vercel production deployment is live, production smoke passed, and the post-deploy UAT gate passed.

## Objective

Execute production deployment from GitHub to Vercel and verify the deployed PG OS app with repeatable smoke gates.

## Current Repository State

GitHub repository:

```text
https://github.com/liwenbo-netizen/pg-os-operation-system
```

Branch:

```text
master
```

Latest deployment-prep commit:

```text
de73409 docs: add Vercel import URL
```

Configured deployment files:

- `vercel.json`
- `.github/workflows/ci.yml`
- `scripts/validate-production-deployment-smoke.mjs`
- `docs/development-package/phase-18C-deployment-prep.md`
- `docs/development-package/phase-18D-production-smoke-gate.md`

## Local CLI Status

Vercel CLI is not installed on this machine:

```text
vercel: command not found
```

Deployment should therefore be executed through Vercel Web:

```text
https://vercel.com/new
```

Deployment was completed manually through Vercel Web.

Production URL:

```text
https://pg-os-operation-system.vercel.app/
```

Project import URL:

```text
https://vercel.com/new/import?repository-name=pg-os-operation-system&s=https%3A%2F%2Fgithub.com%2Fliwenbo-netizen%2Fpg-os-operation-system&teamSlug=liwenbo-netizens-projects
```

## Vercel Import Settings

Import this GitHub repository:

```text
liwenbo-netizen/pg-os-operation-system
```

Use:

```text
Framework Preset: Vite
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
Production Branch: master
```

`vercel.json` already contains the SPA rewrite:

```text
/(.*) -> /index.html
```

## Environment Variables

Set only these Vercel project variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Frontend runtime note:

- The browser app reads `VITE_SUPABASE_URL`.
- The browser app reads `VITE_SUPABASE_ANON_KEY`.
- `APP_ENV` and `APP_BASE_URL` are not required for the current Vite browser runtime.

Do not set these in Vercel:

```text
SUPABASE_SERVICE_ROLE_KEY
PGOS_UAT_DEFAULT_PASSWORD
```

## Pre-Deploy Gates

Before pressing Deploy:

```text
npm run validate:phase18c
npm run validate:phase18d
npm run validate:secret-hygiene
```

Latest local results:

```text
npm run validate:phase18d
Test Files 1 passed (1)
Tests 3 passed (3)
Production deployment config validation passed.
Config-only mode completed.

npm run validate:phase18c
Test Files 16 passed (16)
Tests 94 passed (94)
PG OS UAT acceptance gate passed in 72.9s.

npm run validate:secret-hygiene
Secret hygiene validation passed.
Checked .gitignore, .env.example, Git env tracking, and 136 text files.
```

Before accepting production:

```text
npm run validate:uat
```

The full UAT gate remains local/manual because it signs into Supabase UAT and writes temporary probe rows.

## Post-Deploy Smoke

Executed:

```text
npm run smoke:production -- --url https://pg-os-operation-system.vercel.app/
```

Result:

```text
Production deployment config validation passed.
PASS / status=200 reactRoot=true
PASS /workbench status=200 reactRoot=true
PASS /guide status=200 reactRoot=true
PASS /contracts/uat-smoke status=200 reactRoot=true
PASS /finance/settlements/uat-smoke status=200 reactRoot=true
PASS /media/manager-workbench status=200 reactRoot=true
PASS /sales/manager-workbench status=200 reactRoot=true
Production deployment smoke checks passed.
```

Post-deploy full UAT executed:

```text
npm run validate:uat
PG OS UAT acceptance gate passed in 44.6s.
RLS trace: pgos-uat-1782824334603
Live write trace: pgos-live-1782824340084
Cleanup rows: 12
```

Manual browser checks still recommended for operator sign-off:

- Login page loads.
- Supabase login works for one UAT user.
- Assigned roles load from `user_roles`.
- `/workbench` loads.
- `/guide` loads.
- One Sales, Media, Finance, and Contract route loads.
- `audit_viewer` remains read-only.

## Exit Criteria

Phase 19 is accepted when:

- Vercel production deployment succeeds. PASS.
- `npm run smoke:production -- --url <deployment-url>` passes. PASS.
- `npm run validate:uat` passes after deployment. PASS.
- Production environment variables exclude service-role and UAT password secrets. PASS by operator guidance; do not add those secrets to Vercel.
