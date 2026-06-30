# Phase 18C Report - Deployment Prep

Status: PASS. Deployment-ready Vercel configuration and handoff notes added.

## Objective

Prepare PG OS for frontend deployment from GitHub without committing local Supabase credentials or running live database write probes from the hosting platform.

## Target Platform

Recommended target:

```text
Vercel
```

Reasons:

- Native GitHub import flow.
- Native Vite build detection.
- Simple SPA rewrite support through `vercel.json`.
- Environment variables can be configured per project without storing secrets in Git.

## Implemented Scope

- Added `vercel.json`.
- Added `validate:phase18c` as a deployment-prep validation command.
- Updated README with Phase 18C deployment prep notes.
- Documented environment variables and release gates.

## Vercel Configuration

File:

```text
vercel.json
```

Build settings:

```text
installCommand: npm ci
buildCommand: npm run build
outputDirectory: dist
framework: vite
```

SPA routing:

```text
/(.*) -> /index.html
```

This lets deep links such as `/workbench`, `/guide`, `/contracts/:id`, and `/finance/settlements/:id` load the React app correctly.

## Production Environment Variables

Set these in Vercel Project Settings, not in Git:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
APP_ENV=production
APP_BASE_URL=<production-url>
```

Do not set these in Vercel unless a future server-only deployment surface is added:

```text
SUPABASE_SERVICE_ROLE_KEY
PGOS_UAT_DEFAULT_PASSWORD
```

`SUPABASE_SERVICE_ROLE_KEY` must remain local/operator-only for bootstrap and administrative maintenance scripts.

## Deployment Flow

1. Import `liwenbo-netizen/pg-os-operation-system` into Vercel.
2. Keep branch as `master`.
3. Confirm build command is `npm run build`.
4. Confirm output directory is `dist`.
5. Add only public frontend runtime env values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `APP_ENV`
   - `APP_BASE_URL`
6. Deploy.
7. Smoke test login, role switch, major routes, and Supabase anon reads/writes under expected RLS behavior.

## Release Gates

Before production deployment:

```text
npm run validate:phase18c
npm run validate:uat
```

CI gate:

```text
npm run validate:phase18b
```

Manual live UAT gate:

```text
npm run validate:uat
```

The live UAT gate remains manual because it signs into Supabase and writes temporary probe rows.

## Validation

Local deployment-prep validation:

```text
npm run validate:phase18c
PG OS UAT acceptance gate passed in 37.3s.
```

Secret hygiene:

```text
npm run validate:secret-hygiene
Secret hygiene validation passed.
Checked .gitignore, .env.example, Git env tracking, and 132 text files.
```

Known non-blocking build output:

- Vite reports the main JavaScript chunk is larger than 500 kB after minification.
- Vite plugin timing output can appear during production builds.
