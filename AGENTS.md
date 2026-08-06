# AGENTS.md — PG OS Codex Development Rules

## Scope

These instructions apply to the entire repository unless a deeper `AGENTS.md` provides more specific instructions.

## Required specification files

Before modifying PG OS product code, read:

1. `docs/PG_OS_AI_Native_Specification_V1.8.0_Codex_Implementation_Ready_Final_20260731.md`
2. `docs/PG_OS_Workflow_Machine_V2.5.0_Codex_Ready_20260731.yaml`
3. `docs/PG_OS_Codex_Implementation_Backlog_V1.0_20260731.md`
4. `.codex/repository-overlay.md` when it exists
5. every deeper `AGENTS.md` that applies to the target files

Update the paths above if the repository stores documentation elsewhere.

## First run

The first Codex run must perform only Wave W0:

- inspect the repository;
- discover real build, lint, typecheck, test and migration commands;
- create `.codex/repo-map.md`;
- create `.codex/baseline-report.md`;
- create `.codex/command-map.yaml`;
- create `.codex/repository-overlay.md`;
- create `.codex/spec-gap-matrix.yaml`;
- create `.codex/implementation-plan.md`.

Do not modify product code before these artifacts exist.

## Mandatory execution loop

1. Read Git status and applicable instructions.
2. Read the latest gap matrix and validation report.
3. Select one READY CodexTaskCard.
4. Inspect the existing implementation and tests.
5. Write a concise change-batch plan with excluded work.
6. Implement one coherent vertical slice.
7. Run the repository's real validation commands.
8. Write validation evidence and update the gap matrix.

## Architecture rules

- Preserve the existing language, framework, package manager and repository conventions.
- Prefer existing modules and adapters over parallel replacements.
- Do not add Docker as a required dependency.
- Do not directly update workflow-controlled fields.
- The server is the source of truth for transitions, guards, permissions and approvals.
- Frontend visibility is not authorization.
- Do not add unregistered states, roles, transitions, guards or approvals.
- Use after-commit outbox rules for events.
- Use optimistic locking and idempotency for workflow execution.
- Do not edit generated files directly.

## Change-batch rules

- One coherent capability per batch.
- Avoid unrelated refactors, repository-wide formatting and dependency upgrades.
- Prefer a vertical slice: domain/contract, persistence if needed, service, API/UI, authorization, tests and observability.
- Use feature flags for material user-facing or workflow changes.
- Use expand/contract for database changes.
- Every batch needs an executable rollback or flag-based disable path.

## Validation rules

Discover commands from the repository. Run the applicable format, lint, typecheck/compile, targeted unit, integration/contract, workflow/schema, authorization, migration, UI and production-safety tests.

Record actual commands and results. Separate pre-existing failures from new failures.

## Prohibited actions

- Do not rewrite the project in one batch.
- Do not mechanically create a table for every specification entity.
- Do not weaken or delete tests.
- Do not silently change externally visible behavior.
- Do not enable new defaults for all users without flags.
- Do not run destructive migrations without dry run and rollback.
- Do not claim production safety from mocks.
- Do not report only “tests passed”; list commands.

## Required completion report

Write `.codex/validation/<task-id>.md` and update `.codex/latest-validation.yaml` with task ID, summary, assumptions, spec sections, changed files, schema/data changes, flags, commands/results, evidence, failures, rollback and remaining gaps.

## Stop conditions

Stop destructive or security-sensitive work when there is unresolved data mapping, authorization, privacy/legal, state-definition or production-control risk. Record the blocker with evidence; safe reversible work may continue.
