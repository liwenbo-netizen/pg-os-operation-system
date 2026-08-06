# PG OS Repository Overlay

> Completed from `docs/PG_OS_Repository_Overlay_Template_V1.0_20260731.md` during W0. Assertions below cite repository evidence captured in `.codex/repo-map.md` and `.codex/baseline-report.md`.

## 1. Project identity

```yaml
repository_name: PG OS Operation System
primary_language: TypeScript
frameworks: [React 18, Vite 8, Tailwind CSS, TanStack React Query, Supabase JS]
package_manager: npm
database: Supabase PostgreSQL with RLS policies and versioned SQL migrations
ui_framework: React plus Tailwind CSS and Lucide React
test_frameworks: [Vitest]
current_branch: master
current_commit: "af90a5c Guide technical solution setup workflow"
```

## 2. Applicable AGENTS.md

```yaml
agents_files:
  - path: AGENTS.md
    scope: repository root and all project files
```

## 3. Repository commands

```yaml
commands:
  install: npm ci
  format_check: null
  lint: npm run lint
  typecheck: npm run lint
  unit_test: npm test
  integration_test: "focused Vitest validators in package.json; no separate integration command"
  e2e_test: null
  build: npm run build
  migration_check: npm run validate:phase2
  schema_lint: npm run validate:domain-schema
  code_generation: npm run generate:china-media:seed-sql
  supabase_cli: npm run validate:supabase-cli
  migration_dry_run: null
  schema_diff: null
  migration_safety_gate: npm run validate:migration-safety
```

## 4. Module mapping

```yaml
modules:
  workflow_engine:
    paths: [src/services/mediaWorkflowService.ts, src/services/sdkIntegrationService.ts, src/services/guardService.ts]
    status: DISCOVERED
  domain_models:
    paths: [src/types/domain.ts, src/types/api.ts]
  database_migrations:
    paths: [supabase/migrations, supabase/policies/rls_policies.sql, supabase/seed]
  application_services:
    paths: [src/services]
  api_layer:
    paths: [src/lib/supabase.ts, src/repositories]
    note: "No server API/controller layer was discovered; browser-side Supabase repositories are the current integration boundary."
  authorization:
    paths: [src/constants/roles.ts, src/constants/capabilities.ts, src/services/rbacService.ts, src/services/guardService.ts, src/services/rlsService.ts, src/repositories/authSessionRepository.ts]
  audit_and_outbox:
    paths: [src/repositories/auditEventRepository.ts, src/repositories/auditLogRepository.ts, src/services/businessAuditCoverage.ts]
    note: "Audit exists; a durable outbox implementation was not found."
  timers_and_jobs:
    paths: []
    note: "No application timer/job runner was discovered."
  frontend_routes:
    paths: [src/routes/routes.ts, src/App.tsx, src/app/AppShell.tsx]
  design_system:
    paths: [src/styles.css, src/components, src/app/AppShell.tsx]
  feature_flags:
    paths: [src/config/workflowFeatureFlags.ts, src/services/workflowDefinitionCompatibility.ts]
    note: "CX-0102 provides isolated default-off Workflow V2.5 provider flags and a kill switch; App.tsx does not consume them."
  tests:
    paths: [src/**/*.test.ts, scripts/*.test.mjs]
  generated_code:
    paths: [supabase/seed/202607100002_china_media_ecosystem_seed.sql]
    generator_sources: [scripts/generate-china-media-seed-sql.mjs]
```

## 5. Existing workflow model

```yaml
existing_state_fields:
  - "MediaOnboardingStage and MediaOnboardingStageGate in src/types/domain.ts:117-175"
  - "IntegrationProject and IntegrationProjectProfile in src/types/domain.ts:175-381"
  - "MediaWorkflowState in src/types/domain.ts:799-807"
existing_transition_entry_points:
  - "Domain service guards and actions in src/services/mediaWorkflowService.ts"
  - "SDK integration checklist actions in src/services/sdkIntegrationService.ts:2767-2942"
  - "Database stage-gate trigger in supabase/migrations/202607260001_media_onboarding_stage_gates.sql"
direct_state_patch_paths:
  - "Supabase snapshot upserts in src/repositories/supabaseWorkflowRepository.ts:1818-1838"
locking_and_idempotency: "Workbench task records map a version field, but W0 found no general write predicate or idempotency record for transition execution."
transaction_and_outbox: "No transaction-backed server transition executor or durable outbox publisher was discovered."
known_invariants:
  - "Client guards prevent selected invalid domain actions."
  - "Database migration defines media onboarding stage-gate transition enforcement."
  - "V2.5 specification requires transaction, idempotency, optimistic locking, after-commit events and zero side effects."
```

## 6. Roles and data scopes

```yaml
role_mapping:
  CEO: "Role definitions and capabilities in src/constants/roles.ts and src/constants/capabilities.ts"
  MEDIA_PROCUREMENT_DIRECTOR: "Existing media director role uses the repository's media-workflow UI and guards."
  MEDIA_PROCUREMENT_MANAGER: "Existing media manager role uses the repository's media-workflow UI and guards."
  TECHNICAL_LEAD: "Technical ownership is represented in SDK integration service/UI; canonical V1.8 mapping requires a gap review."
  SDK_INTEGRATION_ENGINEER: "Technical integration role and checklist ownership exist; canonical V1.8 mapping requires a gap review."
  OPERATIONS_LEAD: "Role/capability mapping exists in constants and guarded routes."
  OPERATIONS_SPECIALIST: "Role/capability mapping exists in constants and guarded routes."
  SALES_DIRECTOR: "Role/capability mapping exists in constants and guarded routes."
  SALES_MANAGER: "Role/capability mapping exists in constants and guarded routes."
  FINANCE_REVIEWER: "Current finance_manager role must be reconciled against the V1.8 canonical role vocabulary."
  LEGAL_REVIEWER: "Current legal_manager role must be reconciled against the V1.8 canonical role vocabulary."
data_scope_model: "Supabase Auth resolves profiles/user_roles; SQL RLS policies and a client rlsService are present."
delegation_model: "No verified delegation/audit model was found in W0."
```

## 7. UI mapping

```yaml
app_shell: src/app/AppShell.tsx
workspace_home: src/pages/workbench/WorkbenchOperationsPage.tsx
routing: src/routes/routes.ts and src/App.tsx
forms: "Route pages and media wizard pages use controlled React form state."
tables: "Operational queues and audit tables are implemented in page modules."
stepper_or_wizard: "Publisher onboarding and TechnicalIntegrationWorkspace contain guided checklist/wizard flows."
document_viewer: "Not verified as a reusable component in W0."
notifications: "Page-level status and warning patterns exist; no central notification contract was verified."
loading_empty_error_patterns: "Implemented per page; no shared exhaustive state pattern was verified."
accessibility_patterns: "Responsive shell and ARIA labels are present in inspected views; no automated a11y runner was discovered."
```

## 8. Gaps and adapter points

```yaml
highest_priority_gaps:
  - "Repair Opportunity.stage domain/schema alignment so CI can pass."
  - "Load and validate the V2.5 workflow machine rather than leaving it only as documentation."
  - "Introduce a server-authoritative transition executor with transaction, idempotency and version handling."
conflicts:
  - "V2.5 specification requires server-enforced atomic transitions; current browser Supabase snapshot upserts are not proof of that guarantee."
  - "supabase/README.md migration order ends at 202607260001 while later migrations exist."
safe_adapter_points:
  - src/repositories/workflowRepository.ts
  - src/repositories/workflowRepositoryFactory.ts
  - src/services/guardService.ts
  - src/services/sdkIntegrationService.ts
migration_risks:
  - "Existing live data and RLS policies require expand/contract migrations and idempotent backfill."
  - "No Supabase CLI migration command is currently declared or available."
```

## 9. Feature flags and rollout

```yaml
existing_flag_system: "Bounded CX-0102 workflow provider flags only; no general rollout platform."
implemented_flags:
  - workflow_machine_v25_provider
  - workflow_machine_v25_validation_only
kill_switches: [workflow_machine_v25_provider]
default_provider: legacy
pilot_roles: []
```

## 10. Decisions

No decision log was created during read-only W0. The discovered conflicts and the required sequencing are recorded in `.codex/spec-gap-matrix.yaml` and `.codex/implementation-plan.md`; a future implementation task should create a decision record before resolving a material specification conflict.

## 11. Migration safety environment

```yaml
status: BLOCKED
approved_strategy: REMOTE_STAGING_SUPABASE
supabase_cli:
  global: false
  repository_local: true
  locked_version: 2.110.0
  approved_method: PROJECT_DEV_DEPENDENCY
  command_prefix: npx supabase
  windows_execution: "Official package supabase-go.exe selected through SUPABASE_CLI_BINARY_OVERRIDE because the new Windows executable does not run on this Windows 10 host."
supabase_config_toml: true
database_native_tools:
  psql: false
  pg_dump: false
docker:
  installed: false
  required: false
non_production_target:
  verified: true
  owner: "Repository owner attested the existing project has no production traffic, no sensitive/required data, and may be cleared/rebuilt. The protected Project identity was matched against the existing application configuration and the CLI account can see exactly one Project."
  target_allowlist: [protected_local_environment]
  production_denylist: []
  disposable_or_cleanable: owner_attested
  production_traffic_absent: owner_attested
  sensitive_data_absent: owner_attested
required_environment:
  SUPABASE_STAGING_PROJECT_REF: protected_local
  SUPABASE_STAGING_DB_URL: protected_local
  SUPABASE_STAGING_DB_PASSWORD: protected_local
  PG_OS_DATABASE_ENV: staging
  SUPABASE_PRODUCTION_PROJECT_REF: absent
  SUPABASE_PRODUCTION_DB_HOST: absent
  SUPABASE_ACCESS_TOKEN: protected_local
  PG_OS_ENABLE_MIGRATION_WRITE: false
secret_files:
  tracked_template: ".env.example contains empty application/UAT and migration-safety keys"
  ignored_local: ".env.migration.local contains protected migration values and is confirmed Git-ignored"
  migration_secrets_committed: false
ci_database_job: false
migration_directory: supabase/migrations
migration_count: 24
remote_migration_history: readable
remote_schema_drift: unverified
remote_schema_baseline_required: true
static_sql_validation: npm run validate:phase2
blocked_commands:
  - validate:migration-environment
  - validate:production-denylist
  - db:migration:dry-run
  - db:schema:diff
  - validate:migration-safety
required_approval:
  - "Resolve the approved safety contract for an account with exactly one owner-attested non-production Project: either provision a separate production denylist target or explicitly approve a no-production-project marker design."
  - "Keep PG_OS_ENABLE_MIGRATION_WRITE=false until that decision, remote Schema baseline review, and an executable rollback path are complete."
```
