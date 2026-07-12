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
      total: 8,
      passed: 8,
      failed: 0,
      blocked: 0,
      phaseCount: 5,
      auditProofCount: 7
    });
    expect(summary.businessDomainCount).toBeGreaterThanOrEqual(5);
    expect(summary.latestRecordedAt).toBe("2026-07-12T08:01:11.000Z");
  });

  it("keeps Phase 37-CM-5A and the core business domains visible", () => {
    expect(getAcceptanceLedgerPhases(productionUatAcceptanceLedger)).toEqual(["CM-4B", "CM-5A", "Phase 37", "Phase 38", "Phase 39"]);
    expect(getAcceptanceLedgerDomains(productionUatAcceptanceLedger)).toEqual(
      expect.arrayContaining(["Platform", "Media", "Sales", "Finance", "Contract"])
    );
  });

  it("records source documents and audit markers for every sign-off item", () => {
    expect(productionUatAcceptanceLedger.every((item) => item.sourceDocument.endsWith(".md"))).toBe(true);
    expect(productionUatAcceptanceLedger.every((item) => item.auditMarkers.length > 0)).toBe(true);
  });
});
