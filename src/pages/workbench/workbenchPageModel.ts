import type { WorkbenchTask } from "../../types/domain";

export type WorkbenchTaskActionKind = "start" | "continue" | "blocked" | "none";

export function getWorkbenchTaskAction(task?: WorkbenchTask): {
  kind: WorkbenchTaskActionKind;
  disabled: boolean;
} {
  if (!task || task.status === "done") {
    return { kind: "none", disabled: true };
  }

  if (task.status === "blocked") {
    return { kind: "blocked", disabled: true };
  }

  return {
    kind: task.status === "in_progress" ? "continue" : "start",
    disabled: false
  };
}

export function getWorkbenchMetricValues(summary: {
  myTasks: number;
  p0: number;
  blocked: number;
  okrAtRisk: number;
}) {
  return [summary.myTasks, summary.p0, summary.blocked, summary.okrAtRisk];
}
