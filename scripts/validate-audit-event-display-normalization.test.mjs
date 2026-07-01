import { describe, expect, it } from "vitest";
import {
  validateAuditEventDisplayNormalization,
  validatePackageScripts
} from "./validate-audit-event-display-normalization.mjs";

describe("validate-audit-event-display-normalization", () => {
  it("requires the Phase 27 validation command", () => {
    const failures = validatePackageScripts({
      scripts: {
        "validate:phase26": "vitest run src/repositories/auditLogRepository.test.ts scripts/validate-real-audit-event-write-coverage.test.mjs && node scripts/validate-real-audit-event-write-coverage.mjs --config-only",
        "validate:phase27": "vitest run src/repositories/auditEventRepository.test.ts scripts/validate-audit-event-display-normalization.test.mjs && node scripts/validate-audit-event-display-normalization.mjs --config-only"
      }
    });

    expect(failures).toEqual([]);
  });

  it("accepts the checked-in audit event display normalization source", () => {
    expect(validateAuditEventDisplayNormalization(process.cwd())).toEqual([]);
  });
});
