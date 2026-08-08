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

## CX-0193-RETRY

```yaml
decision:
  id: CX-0193-RETRY
  issue: "Retry sandbox rebuild and baseline verification after the user's continuation request."
  result: BLOCKED
  sandbox_identity_verified: false
  reasons:
    - "SUPABASE_SANDBOX_PROJECT_REF/DB_HOST and all PG_OS_MIGRATION_SANDBOX_* confirmation keys are absent from .env.migration.local."
    - "Management API shows the only second project (PG-OS-CRM006B-R2-Rollback) as INACTIVE; its purpose as a migration sandbox is unconfirmed."
  writes_attempted: 0
  source_writes: 0
  command_changes:
    - "package.json validate:baseline-environment now runs with --env-file=.env.migration.local so the documented command reflects real environment state."
  resolution: "Do not attempt sandbox writes; keep CX-0193 BLOCKED and reconstruction NOT_PROVEN until the user configures and activates a migration sandbox."
  rollback: "Revert the package.json command change if desired; no remote change requires rollback."
```

## CX-0193-RETRY-2

```yaml
decision:
  id: CX-0193-RETRY-2
  issue: "Third continuation request claims sandbox preparation is complete."
  result: BLOCKED
  actual_evidence:
    - "No SUPABASE_SANDBOX_* or PG_OS_MIGRATION_SANDBOX_* keys exist in .env.migration.local (last modified 2026-08-02) or any other env file."
    - "node --env-file=.env.migration.local reports all sandbox keys unset."
    - "Management API: second project mvfmvskersjijdgktrbd is still INACTIVE."
  writes_attempted: 0
  resolution: "Do not trust claims over environment evidence; keep writes disabled until the sandbox project is ACTIVE and the sandbox keys are present in the Git-ignored env file."
  rollback: "None required; no changes beyond documentation."
```

## CX-0193-FIRST-REBUILD

```yaml
decision:
  id: CX-0193-FIRST-REBUILD
  issue: "Execute the first sandbox rebuild and normalized diff after sandbox identity was verified."
  result: READY_FOR_SECOND_REBUILD
  baseline_reconstructability: PARTIALLY_VERIFIED
  rebuild_1: SUCCESS (236/236 batches, reset completed)
  schema_diff_1: PASS (0 unexplained differences)
  renderer_fixes:
    - "generated columns rendered as GENERATED ALWAYS AS ... STORED"
    - "unique indexes created before referencing foreign keys"
    - "tagged dollar quotes ($function$/$fn$) preserved in statement splitting"
    - "transient 5xx/network failures retried idempotently; SQL 400s fail fast"
  normalization_evidence:
    - "Read-only SELECT probes on sandbox proved (ARRAY[...])::text[] and ARRAY[(...)::text,...] equivalent (three probes true)."
    - "Narrow canonicalization applied only to that cast form; no business semantic difference excluded."
  staging_source_writes: 0
  next_step: "Second reset+rebuild and second diff required before PROVEN; CX-0194/CX-0201 not started."
  rollback: "Sandbox is disposable; candidate baseline and catalog/diff evidence are local artifacts. No production or migration-chain change."
```

## CX-0193-PROVEN

```yaml
decision:
  id: CX-0193-PROVEN
  issue: "Second sandbox rebuild, repeatability, failure recovery, and final reconstructability decision."
  result: PROVEN
  cx0193_status: COMPLETED
  baseline_reconstructability: PROVEN
  baseline_hash: a9f1fce5bc61c936b0c0933405b9d3222628f690b4756b16369b5eb9798a149d
  rebuild_1_retry_1: SUCCESS (236/236)
  rebuild_2: SUCCESS (236/236)
  schema_diff_1: PASS (0 unexplained)
  schema_diff_2: PASS (0 unexplained)
  repeatability: PASS
  failure_recovery: VERIFIED
  staging_source_writes: 0
  secrets_exposed: false
  next_task: CX-0194 (NOT_STARTED)
  note: "Candidate baseline remains outside the formal migration chain; adoption requires CX-0194. CX-0190 and CX-0201 stay BLOCKED."
  rollback: "Sandbox is disposable; local evidence and docs can be reverted; no production/migration-chain change was made."
```

## CX-0194-GATE-A

```yaml
decision:
  id: CX-0194-GATE-A
  issue: "Adopt the CX-0193 PROVEN baseline as the canonical migration chain and archive pre-baseline migrations."
  result: READY_FOR_STAGING_HISTORY_ADOPTION
  canonical_baseline_version: "20260807120000"
  baseline_hashes: { candidate: a9f1fce5bc61c936b0c0933405b9d3222628f690b4756b16369b5eb9798a149d, canonical: 59bfb9e7e01a6264b410c02d9614b577201a4cf1e3b79752f4bcf359428481eb }
  legacy_archive: { count: 24, content_unchanged: true, active_chain: false }
  sandbox: { rebuild_1: SUCCESS, rebuild_2: SUCCESS, history: [20260807120000], diff_zero: true, incremental_contract: VERIFIED }
  staging_adoption_recommendation: OPTION_A (migration repair --status applied 20260807120000)
  staging_writes: 0
  gate_b: NOT_STARTED
  note: "CX-0190 and CX-0201 remain BLOCKED. Gate B requires explicit approval and a no-production recheck."
  rollback: "Revert adoption commit / restore legacy paths; sandbox disposable; staging untouched."
```

## CX-0194-GATE-B-PREFLIGHT

```yaml
decision:
  id: CX-0194-GATE-B-PREFLIGHT
  issue: "Prove Canonical migration-history adoption is safe before writing the remote marker."
  result: BLOCKED
  local_migration_chain: PASS
  canonical_hash: 59bfb9e7e01a6264b410c02d9614b577201a4cf1e3b79752f4bcf359428481eb
  remote_migration_history:
    legacy_versions: "000-065"
    canonical_20260807120000: ABSENT
  remote_schema_diff: "PASS (178 matched tables, 0 unexplained differences)"
  dry_run:
    default: "FAIL - remote versions 000-065 are absent from the active local chain"
    include_all: "FAIL - same migration-history incompatibility"
  rejected_cli_suggestion: "Do not mark legacy versions 000-065 reverted without a new approved decision; that conflicts with ADR-002 history preservation."
  remote_writes: 0
  gate_b_authorized: false
  next_required_decision: "Design and prove a preservation-compatible migration-history/CLI strategy, then repeat Gate B Preflight."
  rollback: "Revert the local CI/README/ledger commit; remote database requires no rollback because it was read-only."
```

## CX-0195

```yaml
decision:
  id: CX-0195
  issue: "Preserve remote Migration History 000-065 while restoring Supabase CLI planning compatibility."
  root_cause: "Supabase CLI rejects remote migration versions that are absent from the local planning directory."
  result: COMPLETED
  strategy: runtime_ledger_marker_adapter
  repository_active_chain: canonical_only
  compatibility_markers: "runtime temporary only; 000-065; select 1;"
  original_legacy_sql_claimed: false
  staging_read_only_probe:
    migration_list: PASS_66_ALIGNED
    default_dry_run: PLAN_CANONICAL_ONLY
    include_all_dry_run: PLAN_CANONICAL_ONLY
    writes: 0
  sandbox_rehearsal:
    compatibility_rebuild: SUCCESS_301_BATCHES
    compatibility_history_count: 67
    compatibility_schema_diff: PASS_ZERO
    canonical_cleanup_rebuild: SUCCESS_235_BATCHES
    final_history: [20260807120000]
    final_schema_diff: PASS_ZERO
  gate_b_authorized: false
  next_task: "Repeat CX-0194 Gate B Preflight through the approved adapter."
  rollback: "Remove the adapter/manifest/ADR and evidence; Sandbox is canonical-only and Staging was untouched."
```

## CX-0194-GATE-B-PREFLIGHT-REPEAT

```yaml
decision:
  id: CX-0194-GATE-B-PREFLIGHT-REPEAT
  issue: "Repeat Gate B Preflight through the CX-0195 runtime ledger adapter."
  result: PASSED_PENDING_GITHUB_CI
  safety_mode: NO_PRODUCTION_PROJECT
  migration_safety: PASS
  canonical_chain: PASS
  remote_history_alignment: PASS_66
  dry_run_default: PLAN_CANONICAL_ONLY
  dry_run_include_all: PLAN_CANONICAL_ONLY
  schema_diff: PASS_ZERO_178_TABLES
  full_tests: PASS_76_FILES_447_TESTS
  phase18b: PASS
  staging_writes: 0
  gate_b_authorized: false
  remaining_gate: GITHUB_CI
  rollback: "Revert local Preflight evidence and package command wiring; no database rollback required."
```

## CX-0194-GATE-B-PREFLIGHT-CI-PORTABILITY

```yaml
decision:
  id: CX-0194-GATE-B-PREFLIGHT-CI-PORTABILITY
  issue: "GitHub run 31266562871 rejected Canonical hashes captured from mixed Windows line endings."
  root_cause: "Git stores SQL as LF while the prior manifest froze mixed Windows line endings; after that repair, run 31267260465 exposed a Windows-only temporary cleanup separator check."
  result: REMEDIATED_PENDING_GITHUB_CI
  sql_semantics_changed: false
  database_changed: false
  migration_executed: false
  resolution: "Enforce LF for SQL, freeze Git-canonical hashes, add a carriage-return test, and make cleanup validation use platform-native resolved parent/name checks."
  local_validation: "PASS - Preflight, 76 files / 449 tests, Typecheck, Build, Phase18B, remote read-only plan"
  staging_writes: 0
  gate_b_authorized: false
  rollback: "Revert the LF attribute, hash metadata, regression test, and evidence commit; no database rollback required."
```
