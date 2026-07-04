# Phase 39 Report - Workbench Task Execution Binding Fix

Status: PRODUCTION UAT PASSED.

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

## Production UAT Result

Production site:

```text
https://pg-os-operation-system.vercel.app/
```

Result:

```text
PASS
```

Legal Manager live test:

- Role: `legal_manager`
- Source page: Role Workbench
- Selected task: `Handle contract: CON-003`
- Action: `Start selected task`
- Result: Contract Workspace opened with `CON-003` selected.
- Contract state: `redline`
- Regression check: no `NOT_FOUND`
- Repository state: `Supabase synced`
- Warning state: no Supabase warning

Finance Manager live test:

- Role: `finance_manager`
- Source page: Role Workbench
- Selected task: `Handle contract: CON-002`
- Action: `Start selected task`
- Result: user-assisted production UAT confirmed Contract Workspace opened with `CON-002` selected.
- Follow-up state check: task is `in_progress`
- Regression check: no `NOT_FOUND`
- Repository state: `Supabase synced`
- Warning state: no Supabase warning

CEO audit proof:

- Audit page: `/audit/events`
- Loaded at: `2026-07-04 13:33:03 UTC+8`
- Legal event: `workbench.task_started`
- Legal actor: `legal_manager`
- Legal task id: `11111111-1111-4111-8111-111111111003`
- Legal timestamp: `2026-07-04 12:59:06 UTC+8`
- Finance event: `workbench.task_started`
- Finance actor: `finance_manager`
- Finance task id: `11111111-1111-4111-8111-111111111002`
- Finance timestamp: `2026-07-04 13:07:25 UTC+8`
- Supporting event type visible: `route.visit`
- Regression check: audit stream has no `NOT_FOUND`
- Repository state: `Supabase live`

## Follow-Up

Phase 39 is closed. Continue with consolidated UAT result history sign-off or the next business-flow hardening phase.
