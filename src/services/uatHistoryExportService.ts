import type { UatRunHistoryItem, UatStepHistoryItem } from "../repositories/uatScriptResultRepository";
import type { UatAcceptanceLedgerItem } from "./uatAcceptanceLedgerService";

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

export function createUatAcceptanceLedgerCsv(items: UatAcceptanceLedgerItem[]) {
  const header = [
    "phase",
    "title",
    "business_domains",
    "roles",
    "status",
    "recorded_at",
    "production_url",
    "evidence_kinds",
    "audit_markers",
    "proof_points",
    "source_document",
    "follow_up"
  ];
  const rows = items.map((item) => [
    item.phase,
    item.title,
    item.businessDomains.join("; "),
    item.roles.join("; "),
    item.status,
    item.recordedAt,
    item.productionUrl,
    item.evidenceKinds.join("; "),
    item.auditMarkers.join("; "),
    item.proofPoints.join("; "),
    item.sourceDocument,
    item.followUp
  ]);

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function createUatAcceptanceLedgerJson(items: UatAcceptanceLedgerItem[]) {
  return JSON.stringify(
    {
      ledger: items
    },
    null,
    2
  );
}

export function createUatAcceptanceLedgerFileName(items: UatAcceptanceLedgerItem[], extension: "csv" | "json") {
  const latestDate =
    items
      .map((item) => item.recordedAt)
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0]
      ?.slice(0, 10) ?? "latest";

  return `pgos-production-uat-acceptance-ledger-${latestDate}.${extension}`;
}
