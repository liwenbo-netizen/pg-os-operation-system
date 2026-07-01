import { describe, expect, it } from "vitest";
import {
  directAuditPages,
  validateDirectBusinessAuditWrites,
  validatePackageScripts
} from "./validate-direct-business-audit-writes.mjs";

describe("validate-direct-business-audit-writes", () => {
  it("accepts the expected validate:phase29 package script", () => {
    expect(
      validatePackageScripts({
        scripts: {
          "validate:phase28": "node scripts/validate-business-audit-write-coverage.mjs --config-only",
          "validate:phase29": "vitest run scripts/validate-direct-business-audit-writes.test.mjs && node scripts/validate-direct-business-audit-writes.mjs --config-only"
        }
      })
    ).toEqual([]);
  });

  it("tracks the direct audit pages", () => {
    expect(directAuditPages).toEqual([
      "src/pages/media/MediaExperiencePage.tsx",
      "src/pages/sales/SalesExperiencePage.tsx",
      "src/pages/finance/FinanceSettlementPage.tsx",
      "src/pages/contracts/ContractWorkspacePage.tsx"
    ]);
  });

  it("accepts the checked-in direct business audit write wiring", () => {
    expect(validateDirectBusinessAuditWrites(process.cwd())).toEqual([]);
  });
});
