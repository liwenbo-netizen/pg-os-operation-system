import { describe, expect, it } from "vitest";
import {
  validateAuditEventSource,
  validatePackageScripts
} from "./validate-production-audit-events.mjs";

describe("validate-production-audit-events", () => {
  it("requires the Phase 24 validation command", () => {
    const failures = validatePackageScripts({
      scripts: {
        "validate:phase24": "vitest run src/repositories/auditEventRepository.test.ts scripts/validate-production-audit-events.test.mjs && node scripts/validate-production-audit-events.mjs --config-only",
        "smoke:production": "node scripts/validate-production-deployment-smoke.mjs"
      }
    });

    expect(failures).toEqual([]);
  });

  it("accepts the checked-in audit event pagination source", () => {
    expect(validateAuditEventSource(process.cwd())).toEqual([]);
  });
});
