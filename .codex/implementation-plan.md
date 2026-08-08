# PG OS Implementation Plan After W0

**Planning status:** W0, CX-0004, CX-0101, and CX-0102 are complete. The versioned machine now has a default-off, read-only compatibility seam without changing production workflow behavior.
**Baseline status:** green after CX-0004 repaired the `Opportunity.stage` validator and CX-0101/CX-0102 passed all local gates.

## CX-0192 and ADR-001 (2026-08-06)

CX-0192 completed a **read-only** local/remote migration history reconciliation:

- Local: 24 date-based migration versions (`202606290001` … `202607300001`).
- Remote: 66 sequential versions (`000`–`065`) in `supabase_migrations.schema_migrations`.
- Match rate: 0/24 local versions exist remotely and 0/66 remote versions exist locally (zero overlap).
- Remote schema counts (178 tables / 3121 columns / 125 policies) exceed local static declarations
  (37 tables / 66 policies), confirming major drift that cannot be reconstructed from repository evidence alone.
- The old development package RAR is no longer available on disk, so the 66 sequential SQL files were not
  recoverable; `reconstruction_status: NOT_PROVEN`.
- No remote write, DDL, DML, Schema History Repair, baseline migration generation, or `db push/reset/up`
  was performed. `PG_OS_ENABLE_MIGRATION_WRITE=false` remains in effect.

ADR-001 (`docs/adr/ADR-001-server-authoritative-workflow-execution.md`) was written and recommends
**Supabase Edge Function + PostgreSQL RPC** as the server-authoritative workflow execution boundary,
with RPC as the transactional core. It explicitly records that workflow-controlled state must no longer
be modified by browser per-table upserts, and assigns responsibility boundaries to CX-0201 (persistence),
CX-0202 (RPC executor), and CX-0401 (Edge Function API contracts).

Current statuses:

```yaml
CX-0192: COMPLETED   # read-only reconciliation evidence captured
CX-0190: BLOCKED     # no-production-project denylist contract unresolved
CX-0201: BLOCKED     # must not be auto-unblocked by CX-0192
```

## CX-0193 (2026-08-06)

CX-0193 built the canonical-baseline toolchain and generated a **read-only candidate baseline** from the
staging source, but sandbox verification is blocked:

- Candidate: `supabase/baseline-candidate/` (178 tables, 3106 columns, 528 constraints, 399 indexes,
  125 policies, 51 triggers, 15 functions, 2 views, 4 sequences, 5 extensions) plus
  `.codex/schema-baseline/staging-catalog.json`. The candidate is **not** part of the formal migration chain.
- Tooling: `validate:baseline-environment`, `db:schema:baseline:generate`, `validate:schema-baseline`,
  `db:sandbox:rebuild`, `db:schema:diff`, `validate:baseline-reconstructability`, `validate:cx0193` (43 tests).
- Blockers: the account's second project (`PG-OS-CRM006B-R2-Rollback`) is `INACTIVE` and has no
  `SUPABASE_SANDBOX_*` environment configuration; its purpose as a disposable sandbox is unconfirmed.
  Per task safety rules, no write or reset was attempted.
- Outcome: `baseline_reconstructability: NOT_PROVEN`; `CX-0193: BLOCKED`; `CX-0190: BLOCKED`;
  `CX-0201: BLOCKED`.
- Required human action: confirm/activate a migration sandbox project and populate the new
  `.env.example` sandbox keys in `.env.migration.local` (ref, host, marker, confirmations, write flag),
  then rerun `db:sandbox:rebuild` and `db:schema:diff`.

Retry on 2026-08-06 (second CX-0193 request) ended the same way: the sandbox keys are still absent and
the only second project (`PG-OS-CRM006B-R2-Rollback`) remains `INACTIVE`, so identity verification fails
closed and no rebuild/diff/write was attempted. `validate:baseline-environment` now loads the protected
env file (`--env-file=.env.migration.local`) so its output reflects the real blocked state.

A third retry (same day) again found no sandbox configuration in `.env.migration.local`/other env files
and the second project still `INACTIVE`; both environment gates failed closed and no write was attempted.

On 2026-08-07 the first sandbox rebuild completed successfully (236/236 batches) and the first normalized
schema diff passed with **0 unexplained differences** across all compared dimensions. Three diff artifacts
(two check-constraint casts and one view predicate) were proven semantically equivalent by read-only SELECT
probes and normalized narrowly; no real business difference was excluded. Status:

```yaml
CX-0193: READY_FOR_SECOND_REBUILD
baseline_reconstructability: PARTIALLY_VERIFIED
```

Remaining before PROVEN: second reset+rebuild and second diff (repeatability), failure-recovery evidence,
then the reconstructability gate. CX-0190/CX-0201 stay BLOCKED.

On 2026-08-07 the second rebuild (same baseline hash `a9f1fce5…`) completed 236/236 batches, the second
normalized diff passed with 0 unexplained differences, repeatability PASSED, and failure recovery was
verified from the real failure→reset→success chain plus 57 focused tests. CX-0193 is **COMPLETED** with
`baseline_reconstructability: PROVEN`. The candidate baseline is NOT yet adopted; CX-0194 is the next task.
CX-0190 and CX-0201 remain BLOCKED.

CX-0194 Gate A completed on 2026-08-07: canonical baseline `20260807120000` adopted (manifest + frozen
hashes), 24 legacy migrations archived, `validate:migration-chain` enforced, sandbox canonical-chain
rebuilds 1 and 2 SUCCESS with history `[20260807120000]` and 0-diff, incremental fixture contract verified
and cleaned. Status: `CX-0194: READY_FOR_STAGING_HISTORY_ADOPTION` (`gate_a: COMPLETED`, `gate_b: NOT_STARTED`).
ADR-002 recommends OPTION_A (`migration repair --status applied 20260807120000`) for Gate B.

CX-0194 Gate B Preflight on 2026-08-08 invalidated the assumption that OPTION_A is already compatible
with the repository's future `db push` path. Both `db push --dry-run` and the `--include-all` variant stop
because remote legacy versions `000`-`065` are absent from the active local chain; the CLI recommends
marking all 66 versions reverted, which conflicts with the accepted requirement to preserve that history.
The current remote read-only Schema Diff still passes with 178 matched tables and zero unexplained
differences, so the blocker is history/planner compatibility rather than Schema drift. No remote write was
performed. `CX-0194 Gate B`, `CX-0190`, and `CX-0201` remain `BLOCKED` until a preservation-compatible
history strategy passes dry-run.

CX-0195 completed on 2026-08-08. ADR-003 now defines a runtime-only ledger adapter that materializes
no-op markers for preserved remote versions `000`-`065` in a temporary Supabase workdir while keeping
the repository migration chain canonical-only. Read-only Staging probes aligned all 66 versions and both
dry-run modes planned only the Canonical Baseline. A disposable Sandbox rehearsal rebuilt the 67-file
compatibility chain, produced a zero-diff Schema, and was then restored to canonical-only with exact history
`[20260807120000]` and another zero-diff result. Staging writes remained zero. The next task is to repeat
CX-0194 Gate B Preflight through the approved adapter; actual Gate B writes remain separately blocked and
unauthorized.

CX-0194 Gate B Preflight Repeat passed locally and remotely read-only on 2026-08-09. Migration safety,
Canonical chain, reconstructability, 66-version adapter alignment, both dry-run modes, 178-table Schema Diff,
448 tests, Typecheck, Build and Phase18B are green. The first pushed Preflight failed GitHub CI because its
frozen SQL hashes reflected mixed Windows line endings; SQL is now LF-canonical and the manifests and
regression coverage are aligned without changing SQL semantics. Staging writes remain zero. Status is
`REMEDIATED_PENDING_GITHUB_CI`; after the remediation commit passes CI, CX-0194 may move to
`READY_FOR_GATE_B_APPROVAL`, but Gate B itself still requires separate explicit authorization.

## Immediate Sequencing Rule

CX-0004 is complete. It proved that the existing six `Opportunity.stage` values already matched both SQL constraints and repaired only the validator's parsing scope. `npm run validate:domain-schema` and `npm run validate:phase18b` now pass.

The repair remained deliberately separate from V1.8 workflow work, so no schema mistake was hidden inside a state-machine migration.

## Recommended Work Order

| Order | Batch | Backlog cards | Objective | Required exit evidence |
| --- | --- | --- | --- | --- |
| B0 | Baseline repair | CX-0004 | Completed: scope TypeScript AST extraction to `Opportunity.stage`; preserve the existing domain and SQL values. | `validate:domain-schema` and `validate:phase18b` pass. |
| W1 | Foundation and compatibility | CX-0101, CX-0102 | Completed: versioned static loading plus read-only Legacy/V2.5 adapters and temporary default-off flags. | Valid machine loads; invalid references fail fast; Legacy remains default; explicit V2.5 never silently falls back. |
| W2 | Workflow kernel | CX-0201 to CX-0204 | Introduce five-dimensional persistence, server-authoritative transitions, guards, durable audit/outbox and timing. | Atomic/idempotent/version-conflict/after-commit tests, with no direct generic workflow patch. |
| W3 | Domain and authorization | CX-0301, CX-0302 | Fill only missing readiness/passport objects and canonical role/data-scope/field ownership rules. | Positive and negative authorization tests, expiry/staleness and delegation evidence. |
| W4 | API and orchestration | CX-0401, CX-0402 | Expose server contracts for state, gates, transition evaluation/execution, guided work and role workspaces. | Contract tests show server truth, stable machine error codes and re-evaluation on submit. |
| W5 | Role workspaces | CX-0501, CX-0502 | Adapt the current AppShell/workbench into a role-adaptive guided experience; start with one or two high-value flows. | 1280px/keyboard evidence, role-scoped navigation and correctly routed next action. |
| W6 | Commercial/runtime controls | CX-0601, CX-0602 | Build composite readiness, sellability passport, gray/ramp control, pause/recovery and rollback. | Six readiness dimensions, passport expiry behavior, stop-loss and real control-path tests. |
| W7 | Historical rollout and hardening | CX-0701, CX-0702 | Backfill safely, pilot by role, record usability evidence and remove temporary seams only after proof. | Dry-run/backfill reports, pilot matrix, rollback drill and final validation record. |

## Completed Foundation Slice

**CX-0101 — Add versioned machine loading** is complete. The loader is deliberately a Node static-validation path rather than a runtime application dependency: it resolves the sole YAML source relative to its own module, safely parses the restricted YAML subset actually used by the V2.5 specification, validates its registries/references/DAG, and deep-freezes the result.

### Scope

- `scripts/workflowMachineLoader.mjs` is the versioned loader.
- `scripts/validate-workflow-machine.mjs` is the explicit static validation command.
- `scripts/workflowMachineLoader.test.mjs` covers valid load, immutability, parse/version/registry/reference/DAG failures and no application-entry coupling.
- The existing `mediaWorkflowService`, `sdkIntegrationService`, repository implementations and routes remain the default behavior.

### Existing adapter points

- `src/repositories/workflowRepository.ts` for workflow state read boundaries.
- `src/repositories/workflowRepositoryFactory.ts` for controlled repository composition.
- `src/services/guardService.ts` and `src/services/sdkIntegrationService.ts` for later registry adoption.
- `src/routes/routes.ts` for later, flag-gated guided UX routing.

### Explicit exclusions

- No migration, backfill, data rewrite, API redesign, UI redesign, or live UAT write was included.
- No duplicate hard-coded workflow registry, external YAML dependency, runtime JavaScript evaluation, or Vite asset loading was introduced.
- No default-on workflow change was made.

## Next Permitted Product Slice

**CX-0102 — Establish adapters and feature flags** is complete. `WorkflowDefinitionProvider` is intentionally read-only, the application entry does not import it, and both flags default to false. Validation-only mode can inspect the CX-0101 machine while Legacy stays active; explicit V2.5 mode fails clearly on initialization errors; the kill switch restores Legacy without loading V2.5.

The independent prerequisite **CX-0190 — Prepare Remote Supabase Migration Safety Environment** is partially prepared but remains `BLOCKED`. `supabase@2.110.0` is pinned as a project devDependency, project-local CLI validation passes, `supabase/config.toml` exists, migration documentation lists all 24 SQL migrations, and fail-closed environment/production-denylist validators have direct regression coverage. Protected local Staging identity, database credentials, token and marker are now configured with writes disabled; CLI authentication and a read-only remote Migration History query pass. The account exposes exactly one owner-attested cleanable, traffic-free and non-sensitive Project, so no real production Project Ref/Host exists for the mandatory denylist.

Consequently **CX-0201 — Align workflow persistence** remains `BLOCKED`. Before CX-0190 can enable writes, the production-denylist contract must be resolved without fabricated values, and read-only remote Schema baseline inspection plus an executable rollback plan must be completed.

## Validation Strategy

1. Use `npm ci`, `npm run lint`, `npm test`, `npm run build`, `npm run validate:phase2`, `npm run validate:domain-schema`, and `npm run validate:phase18b` as the common local gate.
2. Treat the full China media seed validator as environment-dependent until an explicit package path is supplied.
3. Do not apply migration SQL manually. Before any migration batch, establish an approved Supabase CLI/configuration path and rehearse on a non-production environment.
4. Do not use production-write scripts as routine regression tests; preserve them for scoped, approved live UAT with audit evidence.
5. Add a future browser/e2e strategy before W5, because no Playwright/Cypress runner was discovered.

## Non-Blocking Follow-Up Queue

- Bring `supabase/README.md` migration order in line with the six newer integration migrations, within a future documentation/migration-validation task.
- Set a measured Vite bundle budget and code-splitting plan after workflow foundation work is stable.
- Reassess and remove the two CX-0102 flags by 2027-01-31 or when the Legacy provider is retired after observation, whichever governance decision is approved.

## Task Card Summary

The authoritative W0 card status and evidence are in `.codex/spec-gap-matrix.yaml`:

- `CX-0001` through `CX-0003`: `SKIP_PRESENT_AND_VALIDATED` because the W0 artifacts are now present and validated.
- `CX-0004`: `COMPLETED` with a parser-only repair, regression coverage, and a green local CI-equivalent gate.
- `CX-0101`: `COMPLETED` with a static loader, deterministic failure contract, full V2.5 validation and green local gates.
- `CX-0102`: `COMPLETED` with a read-only compatibility provider, Legacy default, V2.5 static adapter, validation-only mode, explicit failure contract, and kill switch.
- `CX-0190`: `BLOCKED`; local CLI/config and protected Staging credentials are prepared, CLI authentication and remote Migration History reads pass, but the production-denylist contract plus dry-run/diff/cleanup evidence are absent.
- `CX-0201`: dependency-satisfied but still `BLOCKED` by the missing approved migration/dry-run environment recorded in the matrix.
- `CX-0201` through `CX-0702`: `BLOCKED` by their explicit Backlog dependencies and, where applicable, the baseline/environment blockers recorded in the matrix.
