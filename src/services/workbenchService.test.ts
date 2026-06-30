import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { createInitialContractWorkflowState } from "./contractService";
import { createInitialFinanceWorkflowState } from "./financeSettlementService";
import { createInitialMediaWorkflowState } from "./mediaWorkflowService";
import { createInitialSalesWorkflowState } from "./salesWorkflowService";
import { createInitialGuideWorkflowState } from "./sopService";
import { createInitialWorkbenchWorkflowState, workbenchService } from "./workbenchService";

function context() {
  return {
    workbenchState: createInitialWorkbenchWorkflowState(),
    mediaState: createInitialMediaWorkflowState(),
    salesState: createInitialSalesWorkflowState(),
    financeState: createInitialFinanceWorkflowState(),
    contractState: createInitialContractWorkflowState(),
    guideState: createInitialGuideWorkflowState()
  };
}

describe("workbenchService phase 10", () => {
  it("builds a role task queue with derived finance work", () => {
    const user = authService.createMockUser("finance_manager");
    const snapshot = workbenchService.getSnapshot(context(), user);

    expect(snapshot.summary.myTasks).toBeGreaterThan(0);
    expect(snapshot.tasks.some((task) => task.id === "derived-settlement-settlement-disputed")).toBe(true);
    expect(snapshot.tasks.every((task) => task.owner_role === "finance_manager")).toBe(true);
  });

  it("builds an executive snapshot across roles and modules", () => {
    const user = authService.createMockUser("ceo");
    const snapshot = workbenchService.getSnapshot(context(), user);

    expect(snapshot.summary.myTasks).toBeGreaterThan(6);
    expect(snapshot.summary.p0).toBeGreaterThan(0);
    expect(snapshot.okrs.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps system admin away from business tasks", () => {
    const user = authService.createMockUser("system_admin");
    const snapshot = workbenchService.getSnapshot(context(), user);

    expect(snapshot.tasks).toHaveLength(0);
    expect(snapshot.okrs).toHaveLength(0);
  });

  it("starts and completes an owned task", () => {
    const user = authService.createMockUser("sales_director");
    let state = createInitialWorkbenchWorkflowState();

    const startResult = workbenchService.startTask(state, user, "task-proposal-approval");
    state = startResult.state;

    const completeResult = workbenchService.completeTask(state, user, "task-proposal-approval");

    expect(startResult.guard.reason_code).toBe("WORKBENCH_TASK_STARTED");
    expect(completeResult.guard.reason_code).toBe("WORKBENCH_TASK_COMPLETED");
    expect(completeResult.state.tasks.find((task) => task.id === "task-proposal-approval")?.status).toBe("done");
    expect(completeResult.state.businessEvents[0].eventCode).toBe("workbench.task_completed");
  });

  it("blocks unrelated roles from completing another role's task", () => {
    const user = authService.createMockUser("sales_manager");
    const state = createInitialWorkbenchWorkflowState();

    const result = workbenchService.completeTask(state, user, "task-contract-review");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("WORKBENCH_TASK_FORBIDDEN");
  });

  it("does not complete blocked tasks before blocker resolution", () => {
    const user = authService.createMockUser("finance_manager");
    const state = createInitialWorkbenchWorkflowState();

    const result = workbenchService.completeTask(state, user, "task-settlement-dispute");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("WORKBENCH_TASK_BLOCKED");
  });

  it("updates OKR progress for a permitted owner", () => {
    const user = authService.createMockUser("media_director");
    const state = createInitialWorkbenchWorkflowState();

    const result = workbenchService.updateOkrProgress(state, user, "okr-scale-ready-publishers", 18);
    const objective = result.state.okrObjectives.find((candidate) => candidate.id === "okr-scale-ready-publishers");

    expect(result.guard.reason_code).toBe("OKR_PROGRESS_UPDATED");
    expect(objective?.current_value).toBe(18);
    expect(objective?.status).toBe("on_track");
  });

  it("blocks roles without OKR capability from updating OKRs", () => {
    const user = authService.createMockUser("audit_viewer");
    const state = createInitialWorkbenchWorkflowState();

    const result = workbenchService.updateOkrProgress(state, user, "okr-scale-ready-publishers", 20);

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("OKR_UPDATE_FORBIDDEN");
  });
});
