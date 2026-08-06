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

## CX-0192

```yaml
decision:
  id: CX-0192
  issue: "Remote Supabase migration history cannot be explained from the local repository alone."
  result: COMPLETED_READ_ONLY
  local_migration_count: 24
  remote_migration_count: 66
  matched_versions: 0
  remote_version_style: "sequential 000-065"
  local_version_style: "date-based YYYYMMDDNNNN"
  remote_public_tables: 178
  remote_public_policies: 125
  local_static_tables: 37
  local_static_policies: 66
  reconstruction_status: NOT_PROVEN
  evidence:
    - ".codex/schema-baseline/CX-0190.json refreshed 2026-08-06 through the Supabase Management API read-only endpoint"
    - "git log --all shows no deleted migration files; only master exists; no tags"
    - "Phase 13/16B/30 reports document manual SQL Editor execution, which does not record into schema_migrations"
    - "Old development package RAR is missing from Downloads, so the 66 sequential SQL files could not be recovered"
  hypothesis: "The remote project was initialized from the original development package (66 sequential migrations), while the current repository is the ZERO BUILD CLEANED rebuild (24 date-based migrations) applied manually via SQL Editor; strong but unproven."
  remote_changes_made: false
  baseline_migration_generated: false
  resolution: "Keep migration writes disabled; record evidence; require a user decision between rebuild-from-local and archive-replay before any write."
  rollback: "Remove the CX-0192 record and revert the refreshed local baseline file; no remote rollback is required."
```

## ADR-001

```yaml
decision:
  id: ADR-001
  issue: "Which architecture should own authoritative workflow state transitions?"
  options_compared:
    - browser_direct_supabase_writes
    - postgresql_rpc
    - supabase_edge_function_plus_rpc
    - standalone_node_api
  recommended: supabase_edge_function_plus_rpc
  transactional_core: postgresql_rpc
  rationale: "Repository has no Node server layer or server framework dependencies; Supabase already hosts RLS/triggers and an enabled edge runtime; Edge Function provides the stable API contract and error envelope required by INV-047 while RPC holds transaction/idempotency/locking/audit/outbox."
  binding_rule: "Workflow-controlled state must not continue to be modified by browser per-table upserts."
  responsibility_boundaries:
    CX-0201: "expand/contract persistence (five-dimensional state, version lock, history, idempotency), compatibility reads, controlled writes through the server path"
    CX-0202: "PL/pgSQL RPC evaluate/execute with transaction, idempotency, optimistic lock, guard registry evaluation, audit and outbox rows in the same transaction"
    CX-0401: "Edge Function HTTP contracts (state, available transitions, gate results, evaluate, execute) with stable error codes and JWT role mapping"
  rollback: "Default-off feature flags and kill switch from CX-0102; versioned RPC functions; expand/contract migrations; no browser-write fallback."
```

## CX-0193

```yaml
decision:
  id: CX-0193
  issue: "Can the remote Staging schema be reconstructed from a canonical schema-only baseline?"
  result: BLOCKED
  baseline_reconstructability: NOT_PROVEN
  candidate_baseline_generated: true
  candidate_location: supabase/baseline-candidate
  generation_method: "Management API read-only pg_catalog extraction; schema-only render in dependency order"
  object_counts: { tables: 178, columns: 3106, constraints: 528, indexes: 399, policies: 125, triggers: 51, functions: 15, views: 2, sequences: 4, extensions: 5 }
  sandbox:
    configured: false
    rebuilds_executed: 0
    blocker: "Second project (PG-OS-CRM006B-R2-Rollback) is INACTIVE and its purpose is unconfirmed; SUPABASE_SANDBOX_* variables are absent."
  remote_writes: false
  staging_source_writes: false
  migration_history_repair: false
  legacy_migrations: { count: 24, preserved: true, canonical_status: NOT_DECIDED }
  resolution: "Keep candidate baseline as a non-chain artifact; require user confirmation/activation of a migration sandbox and population of the new env keys before any rebuild; do not force PROVEN by ignoring unknown differences."
  rollback: "Remove supabase/baseline-candidate, staging-catalog.json, and CX-0193 scripts/tests/commands; no remote change requires rollback."
```
```
