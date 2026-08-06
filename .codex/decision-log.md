# Decision Log

```yaml
decision:
  id: CX-0004
  issue: Opportunity.stage schema validation failure
  root_cause: validator parsing scope included unrelated stage properties
  authoritative_domain_values_changed: false
  database_constraint_changed: false
  migration_required: false
  resolution: scope extraction to Opportunity.stage and add regression coverage
  authoritative_values:
    - discovery
    - need_confirmed
    - proposal_drafting
    - proposal_review
    - won
    - lost
  evidence:
    - src/types/domain.ts:568-577
    - supabase/migrations/202606290001_base_schema.sql:330-344
    - supabase/migrations/202606290006_opportunity_stage_domain_alignment.sql
    - scripts/validate-domain-schema-alignment.mjs
    - scripts/validate-domain-schema-alignment.test.mjs
  rollback: Revert the scoped validator and regression test; no schema or data rollback is required.
```

## CX-0101

```yaml
decision:
  id: CX-0101
  issue: "Workflow Machine V2.5 existed only as an unvalidated YAML specification."
  root_cause: "The repository had no YAML dependency, machine loader, registry validator, or workflow runtime integration."
  canonical_machine_file: docs/PG_OS_Workflow_Machine_V2.5.0_Codex_Ready_20260731.yaml
  resolution: "Add a Node static loader using a bounded non-executing YAML subset parser, then validate version, required registries, references, task dependencies, and immutability."
  runtime_transition_behavior_changed: false
  schema_or_data_changed: false
  dependency_changed: false
  feature_flag_required: false
  rationale: "CX-0101 only establishes safe loading/validation. It does not expose a material user-facing workflow change; future runtime adoption requires CX-0102 adapters and default-off flags."
  evidence:
    - scripts/workflowMachineLoader.mjs
    - scripts/validate-workflow-machine.mjs
    - scripts/workflowMachineLoader.test.mjs
    - "npm run validate:workflow-machine: 16 roles, 42 transitions, 19 tasks"
    - "npm test: 64 files, 339 tests"
  rollback: "Remove the loader, validator command, and focused tests. No application code, database schema, data, or workflow state relies on it."
```

## CX-0102

```yaml
decision:
  id: CX-0102
  issue: "Future V2.5 workflow adoption had no reversible provider seam or feature-flag lifecycle."
  existing_feature_flag_system: false
  selected_pattern: "Read-only WorkflowDefinitionProvider with Legacy and V2.5 adapters plus an explicit provider resolver."
  default_provider: legacy
  default_flags:
    workflow_machine_v25_provider: false
    workflow_machine_v25_validation_only: false
  v25_runtime_execution_enabled: false
  application_entry_integrated: false
  schema_or_data_changed: false
  resolution: "Keep all existing services and repositories on the Legacy path; allow loader-backed V2.5 definition reads only when explicitly composed; separate validation-only behavior from explicit activation; provide a kill switch."
  failure_contract:
    validation_only: "Report an actionable error and keep Legacy active."
    explicit_v25: "Fail initialization and never silently present Legacy as active V2.5."
  flag_governance:
    owner: PG_OS
    removal_date: 2027-01-31
    removal_condition: legacy_provider_retired_after_observation
    rollout_percentage: 0
  evidence:
    - src/config/workflowFeatureFlags.ts
    - src/services/workflowDefinitionCompatibility.ts
    - scripts/workflowDefinitionCompatibility.test.mjs
    - "npm run validate:workflow-compatibility: 14 tests"
    - "npm test: 65 files, 353 tests"
    - "npm run validate:phase18b: PASS"
  rollback: "Turn both flags off or activate the kill switch, then remove the isolated compatibility modules after callers are confirmed absent. No database or data rollback is required."
```

## CX-0190

```yaml
decision:
  id: CX-0190
  issue: "CX-0201 requires a repeatable and isolated Supabase migration dry-run environment."
  result: BLOCKED
  supabase_cli:
    installed: true
    locked_version: 2.110.0
    approved_execution_method: PROJECT_DEV_DEPENDENCY
    command_prefix: npx supabase
    windows_execution: "Official package supabase-go.exe through SUPABASE_CLI_BINARY_OVERRIDE on this Windows 10 host"
  repository_configuration:
    supabase_config_toml: true
    migration_environment_commands: true
    schema_diff_command: false
    ci_database_job: false
  database_tools:
    psql: false
    pg_dump: false
  docker_required: false
  approved_environment_strategy: REMOTE_STAGING_SUPABASE
  verified_non_production_environment: true
  required_environment_variables_present: partial
  owner_attestation: "Existing project has no production traffic, no sensitive/required data, and may be cleared/rebuilt."
  protected_staging_identity_verified: true
  cli_authentication_verified: true
  database_password_verified: true
  remote_migration_history_readable: true
  accessible_project_count: 1
  write_enabled: false
  rationale: "Protected Staging identity, database credentials, marker and access token are configured and verified, but the approved contract requires a real production Project Ref/Host denylist. The account exposes only one owner-attested non-production Project, so inventing placeholder denylist values would weaken the safety gate."
  resolution: "Keep remote link, migrations and SQL blocked until the no-production-project denylist contract is explicitly resolved and the read-only Schema baseline plus rollback path are reviewed."
  required_human_decisions:
    - "Either provision a real production-denylist target or explicitly approve a first-class no-production-project marker; do not fabricate Project values."
  rollback: "Revoke the temporary CLI token, rotate the database password again, remove the Git-ignored migration environment, and revert the local migration-safety tooling. No schema or data rollback is required."
```
