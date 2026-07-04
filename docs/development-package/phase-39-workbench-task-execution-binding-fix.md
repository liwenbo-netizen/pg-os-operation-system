# Phase 39 Report - Workbench Task Execution Binding Fix

Status: CODE COMPLETE / LOCAL VALIDATED. Production UAT is pending Vercel deployment.

Recorded at: 2026-07-04 08:25:00 +08:00.

## Objective

Fix the Role Workbench task execution binding so visible derived tasks can be started or completed without returning `NOT_FOUND`.

The defect was observed during Contract UAT:

```text
Role Workbench -> Start selected task
Result: NOT_FOUND / Workbench task was not found.
```

## Root Cause

`WorkbenchService.getSnapshot` displays both persisted workbench tasks and derived tasks:

```text
context.workbenchState.tasks + createDerivedTasks(context)
```

`startTask` and `completeTask` previously searched only `state.tasks`.

That meant a derived task could be visible in the UI but unavailable to the action handler, so starting it returned `NOT_FOUND`.

## Fix

Implemented task action materialization:

- `startTask` and `completeTask` now accept the visible snapshot task list.
- If a task is not already persisted in `workbenchState.tasks`, the handler resolves it from the visible snapshot.
- Resolved derived tasks are materialized into `workbenchState.tasks` before status updates and activity creation.
- Started derived tasks now emit `workbench.task.start` audit events and `workbench.task_started` business events.

Implemented task navigation binding:

- Workbench `Start selected task` now opens the task `related_route` after a successful start.
- App-level route handling carries the task `source_object_id` to the target workspace.
- Finance and Contract pages accept the selected source object id and preselect the matching settlement or contract.

Implemented Supabase UUID alignment:

- Derived tasks use the source object UUID as the task id when the source object id is already a UUID.
- Non-UUID fixture ids keep their `derived-*` stable ids for local test fixtures.
- This lets Supabase-backed derived work items use UUID-compatible ids for future persistence and audit correlation.

## Files Changed

- `src/services/workbenchService.ts`
- `src/services/workbenchService.test.ts`
- `src/pages/workbench/WorkbenchOperationsPage.tsx`
- `src/pages/finance/FinanceSettlementPage.tsx`
- `src/pages/contracts/ContractWorkspacePage.tsx`
- `src/App.tsx`

## Validation

Local automated validation:

```text
npm run validate:phase10
npm run lint
npm run build
```

Result:

```text
PASS
```

Workbench regression coverage added:

- Finance Manager can start a derived settlement task.
- Finance Manager can start a derived finance-review contract task.
- Legal Manager can start a derived legal contract task.
- Sales Director can complete a derived proposal task.
- UUID source object ids become UUID-compatible derived task ids for Supabase-backed work items.

## Production UAT Plan

After Vercel deploys the commit:

1. Log in as `legal_manager`.
2. Open Role Workbench.
3. Select an open legal contract task.
4. Click `Start selected task`.
5. Expected: no `NOT_FOUND`; route opens Contract Workspace with the selected contract bound.
6. Log in as `finance_manager`.
7. Open Role Workbench.
8. Select a finance-review contract or settlement task.
9. Click `Start selected task`.
10. Expected: no `NOT_FOUND`; target workspace opens with the selected object bound.
11. Log in as CEO and open `/audit/events`.
12. Verify `workbench.task.start` and `workbench.task_started` events are visible, alongside route visit events.

## Follow-Up

Once production UAT passes, record the live CEO audit proof in this report and continue with the consolidated UAT history sign-off.
