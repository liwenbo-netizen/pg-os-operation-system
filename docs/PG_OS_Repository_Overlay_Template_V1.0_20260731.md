# PG OS Repository Overlay Template V1.0

> Copy this file to `.codex/repository-overlay.md` and replace placeholders with repository evidence.

## 1. Project identity

```yaml
repository_name:
primary_language:
frameworks: []
package_manager:
database:
ui_framework:
test_frameworks: []
current_branch:
current_commit:
```

## 2. Applicable AGENTS.md

```yaml
agents_files:
  - path:
    scope:
```

## 3. Repository commands

```yaml
commands:
  install:
  format_check:
  lint:
  typecheck:
  unit_test:
  integration_test:
  e2e_test:
  build:
  migration_check:
  schema_lint:
  code_generation:
```

## 4. Module mapping

```yaml
modules:
  workflow_engine:
    paths: []
    status: DISCOVERED|MAPPED|VALIDATED
  domain_models:
    paths: []
  database_migrations:
    paths: []
  application_services:
    paths: []
  api_layer:
    paths: []
  authorization:
    paths: []
  audit_and_outbox:
    paths: []
  timers_and_jobs:
    paths: []
  frontend_routes:
    paths: []
  design_system:
    paths: []
  feature_flags:
    paths: []
  tests:
    paths: []
  generated_code:
    paths: []
    generator_sources: []
```

## 5. Existing workflow model

```yaml
existing_state_fields: []
existing_transition_entry_points: []
direct_state_patch_paths: []
locking_and_idempotency:
transaction_and_outbox:
known_invariants: []
```

## 6. Roles and data scopes

```yaml
role_mapping:
  CEO:
  MEDIA_PROCUREMENT_DIRECTOR:
  MEDIA_PROCUREMENT_MANAGER:
  TECHNICAL_LEAD:
  SDK_INTEGRATION_ENGINEER:
  OPERATIONS_LEAD:
  OPERATIONS_SPECIALIST:
  SALES_DIRECTOR:
  SALES_MANAGER:
  FINANCE_REVIEWER:
  LEGAL_REVIEWER:
data_scope_model:
delegation_model:
```

## 7. UI mapping

```yaml
app_shell:
workspace_home:
routing:
forms:
tables:
stepper_or_wizard:
document_viewer:
notifications:
loading_empty_error_patterns:
accessibility_patterns:
```

## 8. Gaps and adapter points

```yaml
highest_priority_gaps: []
conflicts: []
safe_adapter_points: []
migration_risks: []
```

## 9. Feature flags and rollout

```yaml
existing_flag_system:
proposed_flags: []
kill_switches: []
pilot_roles: []
```

## 10. Decisions

Link every specification/repository conflict to `.codex/decision-log.md`.
