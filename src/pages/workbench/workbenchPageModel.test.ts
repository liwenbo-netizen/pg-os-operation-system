import { describe, expect, it } from "vitest";
import type { WorkbenchTask } from "../../types/domain";
import { getWorkbenchMetricValues, getWorkbenchTaskAction } from "./workbenchPageModel";

function task(status: WorkbenchTask["status"]): WorkbenchTask {
  return {
    id: `task-${status}`,
    title: "Test task",
    module: "Workbench",
    owner_role: "operations_director",
    related_route: "/workbench",
    priority: "P1",
    status,
    next_action: "Continue the workflow."
  };
}

describe("Workbench page guidance", () => {
  it("offers one state-aware primary task command", () => {
    expect(getWorkbenchTaskAction(task("open"))).toEqual({ kind: "start", disabled: false });
    expect(getWorkbenchTaskAction(task("in_progress"))).toEqual({ kind: "continue", disabled: false });
    expect(getWorkbenchTaskAction(task("blocked"))).toEqual({ kind: "blocked", disabled: true });
    expect(getWorkbenchTaskAction()).toEqual({ kind: "none", disabled: true });
  });

  it("keeps the first-view metric strip limited to four decision signals", () => {
    expect(getWorkbenchMetricValues({ myTasks: 8, p0: 2, blocked: 1, okrAtRisk: 3 })).toEqual([8, 2, 1, 3]);
    expect(getWorkbenchMetricValues({ myTasks: 8, p0: 2, blocked: 1, okrAtRisk: 3 })).toHaveLength(4);
  });
});
