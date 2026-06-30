# PG OS

PG OS is the Poly-Gamma China business operation system. This repository follows the V2.11 ZERO BUILD CLEANED development package and must be built phase by phase.

## Current Phase

Phase 18C prepares the app for Vercel deployment:

- `vercel.json` configures Vite build output and SPA route rewrites
- `npm run validate:phase18c` runs the deployment-prep local UAT gate
- Production env values should be configured in Vercel project settings
- Service-role and UAT password secrets remain local/operator-only

Earlier completed phases:

Phase 18B adds GitHub Actions CI for the local UAT gate:

- `.github/workflows/ci.yml` runs on push and pull request to `master`
- CI uses Node.js 22, `npm ci`, and `npm run validate:phase18b`
- CI covers secret hygiene, tests, type check, build, and domain/schema alignment
- Live Supabase RLS and write probes remain manual UAT/release gates

Phase 18A pushes the PG OS V2.11 baseline to GitHub:

- `origin` points to `https://github.com/liwenbo-netizen/pg-os-operation-system.git`
- Remote branch `master` tracks the Phase 17C baseline
- Baseline commit `2f8941b` is backed up on GitHub
- Secret hygiene still passes after remote setup

Phase 17C creates the first Git baseline commit for the UAT-ready PG OS V2.11 system:

- Baseline commit is prepared after secret hygiene and staged-file review
- `.env.local` and generated artifacts remain ignored
- Commit message: `baseline: PG OS V2.11 UAT-ready operation system`

Phase 17B captures the UAT-ready release snapshot and Git baseline readiness:

- `npm run validate:phase17b` runs the full UAT acceptance gate
- Latest full UAT gate passed with live Supabase RLS and workflow write probes
- Release snapshot documents migration order, scope, exclusions, warnings, and suggested baseline commit message
- Git baseline is ready for final review; local secrets and generated artifacts remain ignored

Phase 17A adds secret hygiene and Git baseline readiness:

- `npm run validate:secret-hygiene` checks `.gitignore`, `.env.example`, Git env tracking, and source/docs for high-risk secret patterns
- `npm run validate:phase17a` runs the secret hygiene tests and gate
- `npm run validate:uat` now includes secret hygiene before local and live UAT gates
- `.gitignore` protects local env variants, build outputs, cache, logs, coverage, and test reports

Phase 16B aligned the frontend domain enum and Supabase schema constraint:

- `Opportunity.stage` and `public.opportunities.stage` now share `discovery`, `need_confirmed`, `proposal_drafting`, `proposal_review`, `won`, and `lost`
- The live database migration normalizes legacy stage values before applying the check constraint
- `npm run validate:domain-schema` is part of the local UAT gate

Phase 16A adds the consolidated UAT acceptance gate and deployment runbook:

- `npm run validate:uat` runs local quality gates and live Supabase UAT gates
- `npm run validate:uat:local` runs secret hygiene, tests, lint, build, and domain/schema alignment
- `npm run validate:uat:live` runs live RLS and workflow write probes only
- Deployment runbook documents environment variables, migration order, UAT bootstrap, cleanup, rollback, and failure triage

Phase 15 added live domain write probes / UAT smoke gate:

- Real UAT sessions probe Sales, Media, Integration, Diagnostics, Finance, Legal, and Audit Viewer write paths
- Actor-aware UUID fields are verified for core domain writes
- Probe rows are automatically cleaned up

Phase 14 added authenticated workflow audit binding:

- Supabase workflow writes can bind `owner_user_id`, `created_by`, `updated_by`, and `actor_user_id` to the authenticated user
- Mock non-UUID users are guarded from writing invalid profile foreign keys

Phase 13 adds Supabase UAT auth bootstrap and RLS verification:

- Service-role bootstrap script creates UAT Auth users
- Bootstrap synchronizes `profiles` with Auth user ids
- Bootstrap assigns `user_roles` for every locked PG OS role
- Anon-session verifier signs in as UAT users and probes RLS reads/writes
- Dry-run commands are available for safe local validation

Phase 12 added Supabase Auth / RLS session binding:

- Mock role login remains available for local prototype work
- Supabase account login is available when env credentials are configured
- Supabase sessions bind to `profiles.id = auth.uid()`
- Assigned PG OS roles load from `user_roles`
- Supabase role switching is limited to roles assigned to the current user
- `user_roles` RLS now allows users to read their own assigned roles

Phase 11 added the Supabase repository adapter:

- Workflow snapshot abstraction for Media, Sales, Finance, Contract, Guide, and Workbench states
- Fixture repository fallback when Supabase credentials are absent
- Supabase table adapter for load and debounced save of Phase 4-10 workflow records
- UUID-safe write guard for the locked Supabase schema
- App shell data-source badge for fixture, loading, synced, and warning states
- Adapter tests covering load mapping, table fallback, and skipped fixture-only slug ids

Phase 10 added OKR / Workbench operations:

- Role Workbench under `/workbench`
- CEO operating dashboard under `/ceo/dashboard`
- Cross-module task queue derived from Media, Sales, Campaign, Diagnostic, Finance, Contract, and Guide states
- Task start / completion workflow with audit and business events
- OKR visibility and progress update workflow
- Executive summary for P0 risks, blocked work, recent events, and OKR health

Phase 9 added the Guide / SOP Center:

- Guide Center under `/guide`
- Searchable role and scenario SOP cards
- Role recommendations and SOP activity logging
- Product Owner / Operations SOP draft, publish, and update flow
- SOPs tied to completed Media, Proposal, Campaign, Diagnostic, Finance, and Contract workflows

Phase 8 added the contract and legal collaboration mainline:

- Contract workspace under `/contracts/:id`
- Contract review requests from Finance / Operations collaboration roles
- Legal review, Finance terms review, redline, signing, and archive transitions
- Settlement-linked contracts blocked from signing while settlement dispute diagnostics remain open
- Contract activities, audit events, and business events for every write action

Phase 7 added the finance settlement mainline:

- Finance settlement workspace under `/finance/settlements/:id`
- Reconciliation completion and pending review handoff
- Finance Manager settlement confirmation through `GuardService.canConfirmSettlement`
- Invoice issue and paid status transitions
- Settlement dispute diagnostic blockers remain live across Finance and Diagnostics

Phase 6 added the diagnostic case mainline:

- Diagnostic case workspace for quality, funnel, and settlement issues
- Evidence collection, root-cause analysis, conclusion submission, and case closure
- Diagnostic blockers connected to publisher scale readiness
- Settlement dispute blockers connected to finance confirmation
- Shared guard state used by Media, Sales, Campaign, and Diagnostic flows

Phase 5 added the advertiser to campaign mainline:

- Advertiser and opportunity in-memory workflow state
- Proposal creation from opportunity
- Proposal media validation through shared publisher readiness guards
- Sales Director proposal approval
- Campaign creation from approved proposal context
- Campaign publisher allocation guard
- Launch checklist and Operations Director launch approval

Phase 1 created the runnable source skeleton:

- React + TypeScript + Vite
- Tailwind CSS base styling
- Supabase client wiring
- Role simulation login page
- App shell with text navigation
- Locked 15-role catalog
- Locked core route catalog
- Basic route guard tests

Phase 3 adds the first service-level control layer:

- `AuthService` role simulation
- `RbacService` role/capability checks
- `RlsService` local mirror of locked RLS write/read policy intent
- `GuardService` implementation of core business guard contracts
- UAT-aligned fixture data for publisher readiness, proposal, campaign, diagnostic, and settlement controls

Phase 4 added Media P0 readiness workflows for publisher profile, technical integration, commercial test, and scale readiness approval.

## Setup

```bash
npm install
npm run build
npm run test
npm run validate:phase2
npm run validate:phase3
npm run validate:phase4
npm run validate:phase5
npm run validate:phase6
npm run validate:phase7
npm run validate:phase8
npm run validate:phase9
npm run validate:phase10
npm run validate:phase11
npm run validate:phase12
npm run validate:phase13
npm run validate:phase15
npm run validate:phase16b
npm run validate:phase17a
npm run validate:phase17b
npm run validate:phase18b
npm run validate:phase18c
npm run validate:uat:local
```

Copy `.env.example` to `.env.local` when Supabase credentials exist.

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
APP_ENV=development
APP_BASE_URL=http://localhost:5173
PGOS_UAT_EMAIL_DOMAIN=pgos-uat.local
PGOS_UAT_EMAIL_PREFIX=
PGOS_UAT_DEFAULT_PASSWORD=
```

For Supabase Auth mode, create Auth users first, then insert matching rows into `public.profiles` with the same UUID as `auth.users.id`, and assign at least one row in `public.user_roles`.

UAT auth bootstrap and RLS verification:

```bash
npm run bootstrap:uat-auth:dry-run
npm run bootstrap:uat-auth
npm run verify:uat-rls:dry-run
npm run verify:uat-rls
npm run verify:uat-live-writes:dry-run
npm run verify:uat-live-writes
npm run validate:secret-hygiene
npm run validate:uat
```

`bootstrap:uat-auth` requires `SUPABASE_SERVICE_ROLE_KEY`. `verify:uat-rls`, `verify:uat-live-writes`, and `validate:uat` use the anon key and sign in as generated UAT users to verify RLS and live workflow writes.

Deployment runbook:

[Phase 16A UAT Deployment Runbook](docs/development-package/phase-16A-uat-deployment-runbook.md)

Secret hygiene and Git baseline readiness:

[Phase 17A Secret Hygiene Report](docs/development-package/phase-17A-secret-hygiene-git-baseline-report.md)

Release snapshot and baseline review:

[Phase 17B Release Snapshot](docs/development-package/phase-17B-release-snapshot.md)

Git baseline commit:

[Phase 17C Git Baseline Commit Report](docs/development-package/phase-17C-git-baseline-commit.md)

GitHub remote baseline push:

[Phase 18A GitHub Remote Push Report](docs/development-package/phase-18A-github-remote-push.md)

GitHub Actions CI local gate:

[Phase 18B GitHub Actions CI Report](docs/development-package/phase-18B-github-actions-ci-local-gate.md)

Deployment prep:

[Phase 18C Deployment Prep Report](docs/development-package/phase-18C-deployment-prep.md)

## Development Rules

- Pages must not write directly to the database.
- Mutating actions must go through services.
- Critical status transitions must go through guards.
- Mutating actions must write audit logs.
- Critical business events must write module business events.
- Frontend permission checks are UX only; backend guards and RLS are the hard controls.
- `system_admin` does not own business approval permissions by default.
- `audit_viewer` remains read-only.
