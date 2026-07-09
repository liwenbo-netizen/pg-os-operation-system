import { describe, expect, it } from "vitest";
import {
  getAcceptanceLedgerDomains,
  getAcceptanceLedgerPhases,
  productionUatAcceptanceLedger,
  summarizeAcceptanceLedger
} from "./uatAcceptanceLedgerService";

describe("uatAcceptanceLedgerService", () => {
  it("summarizes the formal production acceptance ledger", () => {
    const summary = summarizeAcceptanceLedger(productionUatAcceptanceLedger);

    expect(summary).toMatchObject({
      total: 6,
      passed: 6,
      failed: 0,
      blocked: 0,
      phaseCount: 3,
      auditProofCount: 5
    });
    expect(summary.businessDomainCount).toBeGreaterThanOrEqual(5);
    expect(summary.latestRecordedAt).toBe("2026-07-04T05:33:03.000Z");
  });

  it("keeps Phase 37-39 and the core business domains visible", () => {
    expect(getAcceptanceLedgerPhases(productionUatAcceptanceLedger)).toEqual(["Phase 37", "Phase 38", "Phase 39"]);
    expect(getAcceptanceLedgerDomains(productionUatAcceptanceLedger)).toEqual(
      expect.arrayContaining(["Platform", "Media", "Sales", "Finance", "Contract"])
    );
  });

  it("records source documents and audit markers for every sign-off item", () => {
    expect(productionUatAcceptanceLedger.every((item) => item.sourceDocument.endsWith(".md"))).toBe(true);
    expect(productionUatAcceptanceLedger.every((item) => item.auditMarkers.length > 0)).toBe(true);
  });
});
