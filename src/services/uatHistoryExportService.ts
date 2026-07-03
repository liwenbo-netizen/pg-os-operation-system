import type { UatRunHistoryItem, UatStepHistoryItem } from "../repositories/uatScriptResultRepository";

function csvCell(value: unknown) {
  const text = value === undefined || value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function createUatHistoryCsv(run: UatRunHistoryItem, steps: UatStepHistoryItem[]) {
  const header = [
    "run_key",
    "environment",
    "production_url",
    "run_status",
    "completion_rate",
    "script_id",
    "role_code",
    "step_id",
    "step_status",
    "step_action",
    "expected_result",
    "actual_result",
    "actor_role",
    "updated_at"
  ];
  const rows = steps.map((step) => [
    run.runKey,
    run.environment,
    run.productionUrl ?? "",
    run.status,
    run.summary.completionRate,
    step.scriptId,
    step.roleCode,
    step.stepId,
    step.status,
    step.stepAction,
    step.expectedResult,
    step.actualResult,
    step.actorRole ?? "",
    step.updatedAt
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function createUatHistoryJson(run: UatRunHistoryItem, steps: UatStepHistoryItem[]) {
  return JSON.stringify(
    {
      run,
      steps
    },
    null,
    2
  );
}

export function createUatHistoryFileName(run: UatRunHistoryItem, extension: "csv" | "json") {
  const key = run.runKey.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "uat-run";
  const date = run.updatedAt.slice(0, 10) || "latest";

  return `pgos-${key}-${date}.${extension}`;
}
