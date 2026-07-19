import { describe, expect, it } from "vitest";
import type { WorkbenchTask } from "../../types/domain";
import {
  getWorkbenchMetricValues,
  getWorkbenchModuleDisplayName,
  getWorkbenchTaskAction,
  getWorkbenchTaskDisplayTitle
} from "./workbenchPageModel";

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

  it("localizes generated task and module labels without changing stored task data", () => {
    const commercialTask = {
      ...task("in_progress"),
      title: "Complete commercial validation: QuZhi Campus",
      module: "Media" as const
    };

    expect(getWorkbenchTaskDisplayTitle(commercialTask, "zh-CN")).toBe("完成商业验证：QuZhi Campus");
    expect(getWorkbenchTaskDisplayTitle(commercialTask, "en-US")).toBe(commercialTask.title);
    expect(getWorkbenchModuleDisplayName(commercialTask.module, "zh-CN")).toBe("媒体");
  });
});
