# PG OS Implementation Plan After W0

**Planning status:** W0, CX-0004, CX-0101, and CX-0102 are complete. The versioned machine now has a default-off, read-only compatibility seam without changing production workflow behavior.
**Baseline status:** green after CX-0004 repaired the `Opportunity.stage` validator and CX-0101/CX-0102 passed all local gates.

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
