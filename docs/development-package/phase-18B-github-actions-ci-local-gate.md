# Phase 18B Report - GitHub Actions CI Local Gate

Status: PASS. GitHub Actions local validation workflow added.

## Objective

Add a GitHub Actions workflow that validates every push and pull request without requiring Supabase secrets or writing to the live UAT database.

## Implemented Scope

- Added `.github/workflows/ci.yml`.
- Added `validate:phase18b` as the CI-aligned local validation command.
- Updated README with the Phase 18B workflow and report link.

## Workflow

Workflow file:

```text
.github/workflows/ci.yml
```

Triggers:

- push to `master`
- pull request targeting `master`

Job:

```text
npm ci
npm run validate:phase18b
```

`validate:phase18b` runs the same local-only UAT gate as:

```text
npm run validate:uat:local
```

Coverage:

- Secret hygiene
- Vitest regression suite
- TypeScript type check
- Production build
- Domain/schema alignment

## Deliberate Exclusions

The CI workflow does not run these live UAT commands:

- `npm run verify:uat-rls`
- `npm run verify:uat-live-writes`
- `npm run validate:uat`

Those commands require Supabase credentials and can write temporary probe rows to the live UAT database. They remain manual release/UAT gates.

## Validation

Local validation:

```text
npm run validate:phase18b
PG OS UAT acceptance gate passed in 35.8s.
```

Secret hygiene:

```text
npm run validate:secret-hygiene
Secret hygiene validation passed.
Checked .gitignore, .env.example, Git env tracking, and 130 text files.
```

Known non-blocking build output:

- Vite reports the main JavaScript chunk is larger than 500 kB after minification.
- Vite plugin timing output can appear during production builds.
