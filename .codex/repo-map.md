# PG OS Repository Map

**Reconnaissance:** `W0_REPOSITORY_RECONNAISSANCE`
**Captured:** 2026-08-01 (Asia/Shanghai)
**Scope:** repository inspection and validation only. No product source, migration, dependency manifest, or business configuration was changed during W0.

## System Shape

PG OS is a TypeScript/Vite React single-page application. The browser creates a Supabase client when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present; otherwise the repository factory selects a local in-memory workflow repository.

```text
React pages and feature views
  -> App route selection and role guards
  -> domain services
  -> WorkflowRepository abstraction
  -> SupabaseWorkflowRepository or LocalWorkflowRepository
  -> Supabase tables, RLS policies, audit tables
```

Evidence:

- `src/lib/supabase.ts:1-37` creates the browser Supabase client and normalizes the project URL.
- `src/repositories/workflowRepositoryFactory.ts:6-13` selects Supabase when configured, otherwise `LocalWorkflowRepository`.
- `src/repositories/supabaseWorkflowRepository.ts:1818` persists table snapshots through direct client `upsert` calls.

## Top-Level Layout

| Area | Purpose | Evidence |
| --- | --- | --- |
| `src/app` | Shell, page composition, shared navigation | `src/app/AppShell.tsx` |
| `src/pages` | Route-level application experiences | `src/pages/media`, `src/pages/sales`, `src/pages/finance`, `src/pages/contracts`, `src/pages/uat` |
| `src/features` | Feature-focused supporting UI/domain pieces | `src/features/media`, `src/features/workbench`, and peer feature directories |
| `src/services` | Domain workflows, guards, audit and UAT orchestration | `mediaWorkflowService.ts`, `sdkIntegrationService.ts`, `guardService.ts` |
| `src/repositories` | Local/Supabase persistence adapters | `workflowRepository.ts`, `supabaseWorkflowRepository.ts`, `authSessionRepository.ts` |
| `src/types` | Shared domain and API types | `src/types/domain.ts`, `src/types/api.ts` |
| `src/constants` | Roles, capabilities and static business constants | `src/constants/roles.ts`, `src/constants/capabilities.ts` |
| `src/routes` | Route catalog and guard metadata | `src/routes/routes.ts` |
| `src/lib` | Supabase, i18n and presentation helpers | `src/lib/supabase.ts`, `src/lib/i18n.ts` |
| `supabase/migrations` | Versioned schema/RLS changes | `202606290001_base_schema.sql` through `202607300001_publisher_technical_handoff.sql` |
| `supabase/seed` | Controlled UAT and China ecosystem seed SQL | `202606290003_uat_seed.sql`, `202607100002_china_media_ecosystem_seed.sql` |
| `scripts` | Validation, live UAT and one controlled seed generator | `scripts/validate-*.mjs`, `scripts/generate-china-media-seed-sql.mjs` |
| `.github/workflows` | CI | `.github/workflows/ci.yml` |

## Core Business and Technical Paths

### Media lifecycle and onboarding

- `src/types/domain.ts:117-175` declares onboarding stages/gates and integration project types.
- `src/pages/media/MediaExperiencePage.tsx` and `src/pages/media/PublisherOnboardingWizard.tsx` are the media and publisher entry surfaces.
- `src/pages/media/MediaOnboardingLifecyclePage.tsx` is exposed through `src/routes/routes.ts:117`.
- `supabase/migrations/202607260001_media_onboarding_stage_gates.sql` provides a database gate-transition function and trigger.

### Technical integration

- `src/pages/media/TechnicalIntegrationWorkspace.tsx` is the integration workbench, exposed through `src/routes/routes.ts:155`.
- `src/services/sdkIntegrationService.ts:1164-2942` contains scoped checklist templates, gate completion evaluation and checklist update guards.
- `src/services/mediaWorkflowService.ts:164-2233` maintains the legacy integration evidence/checklist workflow.
- Migrations `202607270001` through `202607300001` progressively add playbooks, cross-role checks, commercial gates and media-to-engineering handover data.

### Authorization and audit

- `src/repositories/authSessionRepository.ts:286-324` resolves Supabase `profiles` and `user_roles` for authenticated sessions.
- `src/services/rbacService.ts:6-27`, `src/services/guardService.ts:49-382`, and `src/services/rlsService.ts:73-99` provide client-side capability, route and UI guard decisions.
- RLS DDL is versioned in `supabase/migrations/202606290002_rls_policies.sql` and mirrored in `supabase/policies/rls_policies.sql`.
- Audit/event repositories and UAT flows exist under `src/repositories/audit*`, `src/services/businessAuditCoverage*`, and `src/pages/audit`.

## Delivery and Validation

- Package manager: npm (`package-lock.json` exists; CI and Vercel use `npm ci`).
- Build: Vite with TypeScript type checking (`npm run build`).
- Tests: Vitest; W0 observed 63 test files and 322 tests.
- CI: `.github/workflows/ci.yml` runs `npm run validate:phase18b` on `master` pushes and pull requests.
- Deployment: `vercel.json` builds `dist` and rewrites all routes to `index.html`.

## Generated Artifacts

The only confirmed generated repository artifact is `supabase/seed/202607100002_china_media_ecosystem_seed.sql`, marked as generated by `scripts/generate-china-media-seed-sql.mjs`. W0 did not run the generator because it writes a seed file.

## Boundaries and Open Questions

1. The spec requires a server-side workflow executor with transactions, idempotency and optimistic locking. Current production persistence is a browser Supabase adapter using per-table snapshot `upsert` calls; it is not yet a proven server-side executor.
2. The repository contains a trigger for media onboarding stage gates, but W0 did not find a code loader for the supplied V2.5 workflow-machine YAML or a general transition engine consuming it.
3. `supabase/README.md` lists migrations only through `202607260001`; six newer integration migrations are present but absent from that documented order.
4. No source-level feature-flag system, durable outbox, or backend timer/job runner was found in the inspected application paths.
5. A current domain/schema validation failure must be resolved before the existing CI gate can become green. See `baseline-report.md` and `spec-gap-matrix.yaml`.
