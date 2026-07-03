import { describe, expect, it } from "vitest";
import type { UatRunHistoryItem, UatStepHistoryItem } from "../repositories/uatScriptResultRepository";
import { createUatHistoryCsv, createUatHistoryFileName, createUatHistoryJson } from "./uatHistoryExportService";

const run: UatRunHistoryItem = {
  id: "run-1",
  runKey: "production manual uat/current",
  environment: "production",
  productionUrl: "https://pg-os-operation-system.vercel.app",
  startedByRole: "ceo",
  status: "failed",
  summary: {
    total: 2,
    passed: 1,
    failed: 1,
    blocked: 0,
    pending: 0,
    completionRate: 100
  },
  createdAt: "2026-07-02T00:00:00.000Z",
  updatedAt: "2026-07-02T01:00:00.000Z"
};

const steps: UatStepHistoryItem[] = [
  {
    id: "step-1",
    runId: "run-1",
    scriptId: "ceo-observability-signoff",
    scriptTitle: "CEO production observability sign-off",
    roleCode: "ceo",
    stepId: "ceo-login",
    stepAction: "Sign in, then open workspace",
    expectedResult: "Workspace opens",
    status: "failed",
    actualResult: 'Warning says "RLS"',
    actorRole: "ceo",
    updatedAt: "2026-07-02T01:00:00.000Z"
  }
];

describe("uatHistoryExportService", () => {
  it("exports selected UAT run steps as escaped CSV", () => {
    const csv = createUatHistoryCsv(run, steps);

    expect(csv).toContain('"run_key","environment","production_url"');
    expect(csv).toContain('"Sign in, then open workspace"');
    expect(csv).toContain('"Warning says ""RLS"""');
  });

  it("exports selected UAT run steps as formatted JSON and stable file names", () => {
    const json = createUatHistoryJson(run, steps);

    expect(JSON.parse(json)).toMatchObject({
      run: { runKey: "production manual uat/current" },
      steps: [expect.objectContaining({ stepId: "ceo-login" })]
    });
    expect(createUatHistoryFileName(run, "csv")).toBe("pgos-production-manual-uat-current-2026-07-02.csv");
    expect(createUatHistoryFileName(run, "json")).toBe("pgos-production-manual-uat-current-2026-07-02.json");
  });
});
