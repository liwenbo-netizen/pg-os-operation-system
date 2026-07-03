import { describe, expect, it } from "vitest";
import { buildBusinessUatCoverage, coreBusinessDomains, assertBusinessUatCoverage } from "./businessUatCoverageService";
import { productionUatScripts } from "./uatScriptService";

describe("businessUatCoverageService", () => {
  it("covers every core business domain with action, audit, and data quality evidence", () => {
    const coverage = assertBusinessUatCoverage(productionUatScripts);

    expect(coverage.coveredDomains).toBe(coreBusinessDomains.length);
    expect(coverage.missingDomains).toEqual([]);
    expect(coverage.warnings).toEqual([]);
    expect(coverage.domains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          domain: "Media",
          auditEvents: expect.arrayContaining(["publisher.create", "publisher_ad_slot.create"]),
          dataQualityChecks: expect.arrayContaining([
            expect.stringContaining("Publisher"),
            expect.stringContaining("Ad slot")
          ])
        }),
        expect.objectContaining({
          domain: "Sales",
          auditEvents: expect.arrayContaining(["proposal.publisher.select"]),
          routes: expect.arrayContaining(["/proposals/:id/wizard"])
        }),
        expect.objectContaining({
          domain: "Finance",
          auditEvents: expect.arrayContaining(["settlement.confirm"]),
          routes: expect.arrayContaining(["/finance/settlements/:id"])
        }),
        expect.objectContaining({
          domain: "Contract",
          auditEvents: expect.arrayContaining(["contract.legal_review.approve"]),
          routes: expect.arrayContaining(["/contracts/:id"])
        })
      ])
    );
  });

  it("reports actionable warnings when a business domain is missing", () => {
    const coverage = buildBusinessUatCoverage(
      productionUatScripts.filter((script) => script.businessDomain !== "Finance")
    );

    expect(coverage.missingDomains).toEqual(["Finance"]);
    expect(coverage.warnings).toEqual(expect.arrayContaining([expect.stringContaining("Finance: missing production UAT script")]));
  });
});
