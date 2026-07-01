import { describe, expect, it } from "vitest";
import {
  requiredCoreBusinessAuditActions,
  validateBusinessAuditWriteCoverage,
  validatePackageScripts
} from "./validate-business-audit-write-coverage.mjs";

describe("validate-business-audit-write-coverage", () => {
  it("accepts the expected validate:phase28 package script", () => {
    expect(
      validatePackageScripts({
        scripts: {
          "validate:phase27": "node scripts/validate-audit-event-display-normalization.mjs --config-only",
          "validate:phase28": "vitest run src/services/businessAuditCoverage.test.ts src/repositories/workflowRepository.test.ts scripts/validate-business-audit-write-coverage.test.mjs && node scripts/validate-business-audit-write-coverage.mjs --config-only"
        }
      })
    ).toEqual([]);
  });

  it("tracks representative core action codes", () => {
    expect(requiredCoreBusinessAuditActions).toEqual(
      expect.arrayContaining([
        "publisher.create",
        "proposal.approve",
        "settlement.confirm",
        "contract.sign"
      ])
    );
  });

  it("accepts the checked-in Phase 28 business audit coverage source", () => {
    expect(validateBusinessAuditWriteCoverage(process.cwd())).toEqual([]);
  });
});
