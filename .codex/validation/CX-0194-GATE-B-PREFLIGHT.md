# Validation Record: CX-0194 Gate B Preflight

**Task:** `CX-0194 Gate B Preflight - Canonical Migration Baseline Safety Closure`
**Date:** 2026-08-08
**Result:** `BLOCKED`
**Remote writes:** `0`

## Executive Result

Local Canonical migration, Workflow, compatibility, TypeScript, test, build, and UAT gates pass. The
current remote Schema remains semantically aligned with the Canonical Baseline, but Supabase CLI 2.110.0
cannot plan the active migration chain while remote legacy versions `000`-`065` are absent locally.
Both permitted dry-run variants fail and recommend marking all 66 legacy versions reverted. That advice
conflicts with ADR-002's accepted history-preservation requirement, so Gate B is not authorized.

## Scope and exclusions

- Changed only CI configuration, package validation wiring, README status, local schema evidence, and
  `.codex` governance/validation records.
- Did not change product code, Workflow routing, Feature Flag defaults, database Schema, business data,
  or remote Migration History.
- Did not execute `migration repair`, `db push`, `migration up`, `db reset`, DDL, or DML.
- Did not start CX-0201 or CX-0202.

## Changed files

- CI and command wiring: `.github/workflows/ci.yml`, `package.json`
- Operator status: `README.md`
- Governance: `.codex/baseline-report.md`, `.codex/command-map.yaml`,
  `.codex/decision-log.md`, `.codex/implementation-plan.md`, `.codex/latest-validation.yaml`,
  `.codex/repository-overlay.md`, `.codex/spec-gap-matrix.yaml`
- Read-only evidence: `.codex/schema-baseline/staging-catalog.json`,
  `.codex/schema-baseline/sandbox-catalog.json`, `.codex/schema-baseline/preflight-diff.json`
- Validation record: `.codex/validation/CX-0194-GATE-B-PREFLIGHT.md`

## Git baseline before Preflight changes

```yaml
branch: master
head: a7d89d33446fb74606973179918821c6e64bda8e
origin_master: af90a5cbe42a0c4eef54453b2ef9dfa049bb211b
behind: 0
ahead: 15
working_tree: CLEAN
remote_divergence: false
```

## Migration baseline

```yaml
active_migration: 20260807120000_pg_os_canonical_baseline.sql
active_migration_count: 1
canonical_sha256: 59bfb9e7e01a6264b410c02d9614b577201a4cf1e3b79752f4bcf359428481eb
legacy_archive_count: 24
legacy_active_chain: false
baseline_reconstructability: PROVEN
```

## Database read-only verification

```yaml
remote_migration_history:
  legacy_versions: "000-065"
  canonical_marker_present: false
db_push_dry_run:
  result: FAIL
  reason: "Remote migration versions 000-065 are not present in the active local migration directory."
db_push_dry_run_include_all:
  result: FAIL
  reason: "Same remote/local history incompatibility."
cli_recommendation_rejected: "migration repair --status reverted 000..065 conflicts with ADR-002 history preservation and was not executed"
schema_diff:
  staging_captured_at: "2026-08-08T13:35:58.156Z"
  sandbox_captured_at: "2026-08-08T13:37:09.647Z"
  matched_tables: 178
  unexplained_differences: 0
  result: PASS
remote_schema_writes: 0
remote_data_writes: 0
remote_history_writes: 0
```

## Workflow safety

```yaml
workflow_machine: PASS
spec_version: 1.8.0
schema_version: 2.5.0
roles: 16
transitions: 42
tasks: 19
compatibility_tests: "1 file / 14 tests PASS"
v25_provider_default: OFF
v25_validation_only_default: OFF
production_provider: LEGACY_UNCHANGED
```

## Commands and results

| Command | Result |
| --- | --- |
| `git fetch origin` | PASS; behind 0 / ahead 15; no divergence |
| `npm.cmd run validate:cx0194:preflight` | PASS |
| `npm.cmd run validate:domain-schema` | PASS |
| `npm.cmd run lint` | PASS |
| `npm.cmd test` | PASS; 74 files / 437 tests |
| `npm.cmd run build` | PASS with existing bundle-size warning |
| `npm.cmd run validate:phase18b` | PASS in 54.9s; secret hygiene checked 380 text files |
| `supabase migration list` | PASS; read-only; Canonical local-only |
| `supabase db push --dry-run` | FAIL; history incompatibility; zero writes |
| `supabase db push --dry-run --include-all` | FAIL; same incompatibility; zero writes |
| `db-schema-diff` remote read-only capture | PASS; 0 unexplained differences |

The first PowerShell invocations of `npm` were blocked by the host execution policy because they selected
`npm.ps1`. They were rerun through `npm.cmd`; this was an environment invocation issue, not a repository
test failure.

## CI status

The repository CI now runs `validate:cx0194:preflight` before `validate:phase18b`. Local execution passes.
GitHub CI was not run because the remote dry-run blocker prohibits the task's push step.

## Remaining blocker

ADR-002 Option A cannot yet be considered compatible with future CLI migration planning. A new read-only
decision must identify a strategy that both preserves the 66 legacy history entries and allows a dry-run
to succeed without planning Canonical SQL against the already-matching Schema. Until that is proven,
`migration repair --status applied 20260807120000` is not authorized.

## Rollback

Revert the local Preflight commit to remove CI/README/ledger changes. No database rollback is required.

## Final decision

```text
CX-0194 GATE B READINESS: BLOCKED
```
