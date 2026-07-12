import { describe, expect, it } from "vitest";
import type { UatRunHistoryItem, UatStepHistoryItem } from "../repositories/uatScriptResultRepository";
import { productionUatAcceptanceLedger } from "./uatAcceptanceLedgerService";
import {
  createUatAcceptanceLedgerCsv,
  createUatAcceptanceLedgerFileName,
  createUatAcceptanceLedgerJson,
  createUatHistoryCsv,
  createUatHistoryFileName,
  createUatHistoryJson
} from "./uatHistoryExportService";

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

  it("exports the formal acceptance ledger as CSV and JSON", () => {
    const csv = createUatAcceptanceLedgerCsv(productionUatAcceptanceLedger);
    const json = createUatAcceptanceLedgerJson(productionUatAcceptanceLedger);

    expect(csv).toContain('"phase","title","business_domains"');
    expect(csv).toContain('"Phase 39"');
    expect(csv).toContain('"workbench.task_started; route.visit"');
    expect(csv).toContain('"CM-4B"');
    expect(csv).toContain('"china_media_ecosystem.owner.assign_batch; china_media_ecosystem.owner_assigned; china_media_ecosystem.manual_review_batch; china_media_ecosystem.manual_reviewed"');
    expect(csv).toContain('"CM-5A"');
    expect(csv).toContain(
      '"china_media_ecosystem.contact; china_media_ecosystem.contacted; china_media_ecosystem.business_qualify; china_media_ecosystem.business_qualified; china_media_ecosystem.trusted_gate.approve; china_media_ecosystem.trusted_gate_approved; china_media_ecosystem.trusted_candidate.create; china_media_ecosystem.trusted_candidate_created"'
    );
    expect(JSON.parse(json)).toMatchObject({
      ledger: expect.arrayContaining([
        expect.objectContaining({ phase: "Phase 37" }),
        expect.objectContaining({ phase: "CM-4B" }),
        expect.objectContaining({ phase: "CM-5A" })
      ])
    });
    expect(createUatAcceptanceLedgerFileName(productionUatAcceptanceLedger, "csv")).toBe(
      "pgos-production-uat-acceptance-ledger-2026-07-12.csv"
    );
  });
});
