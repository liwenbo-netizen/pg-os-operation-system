# Phase 19 Report - Production Deploy Execution / Vercel

Status: READY FOR VERCEL WEB IMPORT. Repository-side deployment preparation is complete; Vercel project creation requires account authorization in the Vercel UI.

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
4b88e50 deploy: add production smoke gate
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
APP_ENV=production
APP_BASE_URL=<vercel-production-url>
```

Frontend runtime note:

- The browser app reads `VITE_SUPABASE_URL`.
- The browser app reads `VITE_SUPABASE_ANON_KEY`.
- `APP_ENV` and `APP_BASE_URL` are deployment metadata for operator/runbook consistency.

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

After Vercel returns a production URL, run:

```text
npm run smoke:production -- --url <deployment-url>
```

Then manually verify:

- Login page loads.
- Supabase login works for one UAT user.
- Assigned roles load from `user_roles`.
- `/workbench` loads.
- `/guide` loads.
- One Sales, Media, Finance, and Contract route loads.
- `audit_viewer` remains read-only.

## Exit Criteria

Phase 19 is accepted when:

- Vercel production deployment succeeds.
- `npm run smoke:production -- --url <deployment-url>` passes.
- `npm run validate:uat` passes after deployment.
- Production environment variables exclude service-role and UAT password secrets.
