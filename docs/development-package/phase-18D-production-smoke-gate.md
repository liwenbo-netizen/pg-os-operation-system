# Phase 18D Report - Production Deploy Handoff / Smoke Gate

Status: PASS. Production smoke gate added for the Vercel deployment handoff.

## Objective

Make post-deployment verification repeatable after Vercel creates a production URL.

## Implemented Scope

- Added `scripts/validate-production-deployment-smoke.mjs`.
- Added `scripts/validate-production-deployment-smoke.test.mjs`.
- Added npm scripts:
  - `validate:phase18d`
  - `smoke:production`
- Updated README with the Phase 18D handoff.

## Validation Modes

Config-only validation:

```text
npm run validate:phase18d
Test Files 1 passed (1)
Tests 3 passed (3)
Production deployment config validation passed.
Config-only mode completed.
```

This checks:

- `vercel.json` uses Vite.
- Vercel install command is `npm ci`.
- Vercel build command is `npm run build`.
- Vercel output directory is `dist`.
- SPA deep links rewrite to `/index.html`.
- package scripts expose the deployment and smoke commands.

Post-deployment smoke:

```text
npm run smoke:production -- --url <deployment-url>
```

This checks that the deployed app returns a React root for:

- `/`
- `/workbench`
- `/guide`
- `/contracts/uat-smoke`
- `/finance/settlements/uat-smoke`
- `/media/manager-workbench`
- `/sales/manager-workbench`

## Manual Smoke Checklist

After deployment:

1. Open the production URL.
2. Confirm the login page loads.
3. Sign in with one UAT Supabase user.
4. Confirm assigned roles load from Supabase.
5. Open `/workbench`.
6. Open `/guide`.
7. Open one Sales, Media, Finance, and Contract workflow route.
8. Confirm `audit_viewer` remains read-only.
9. Run `npm run validate:uat` locally before calling the release accepted.

## Secret Boundary

Vercel should contain only:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
APP_ENV
APP_BASE_URL
```

Vercel should not contain:

```text
SUPABASE_SERVICE_ROLE_KEY
PGOS_UAT_DEFAULT_PASSWORD
```

## Validation

Secret hygiene:

```text
npm run validate:secret-hygiene
```
