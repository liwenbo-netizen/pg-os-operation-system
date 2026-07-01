import { describe, expect, it } from "vitest";
import {
  validatePackageScripts,
  validateRealAuditEventWriteCoverage
} from "./validate-real-audit-event-write-coverage.mjs";

describe("validate-real-audit-event-write-coverage", () => {
  it("requires the Phase 26 validation command", () => {
    const failures = validatePackageScripts({
      scripts: {
        "validate:phase25": "vitest run src/services/observabilityService.test.ts scripts/validate-system-health-live-observability.test.mjs && node scripts/validate-system-health-live-observability.mjs --config-only",
        "validate:phase26": "vitest run src/repositories/auditLogRepository.test.ts scripts/validate-real-audit-event-write-coverage.test.mjs && node scripts/validate-real-audit-event-write-coverage.mjs --config-only"
      }
    });

    expect(failures).toEqual([]);
  });

  it("accepts the checked-in real audit event write coverage source", () => {
    expect(validateRealAuditEventWriteCoverage(process.cwd())).toEqual([]);
  });
});
