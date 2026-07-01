import { describe, expect, it } from "vitest";
import {
  validatePackageScripts,
  validateSystemHealthLiveObservability
} from "./validate-system-health-live-observability.mjs";

describe("validate-system-health-live-observability", () => {
  it("requires the Phase 25 validation command", () => {
    const failures = validatePackageScripts({
      scripts: {
        "validate:phase24": "vitest run src/repositories/auditEventRepository.test.ts scripts/validate-production-audit-events.test.mjs && node scripts/validate-production-audit-events.mjs --config-only",
        "validate:phase25": "vitest run src/services/observabilityService.test.ts scripts/validate-system-health-live-observability.test.mjs && node scripts/validate-system-health-live-observability.mjs --config-only"
      }
    });

    expect(failures).toEqual([]);
  });

  it("accepts the checked-in system health live observability source", () => {
    expect(validateSystemHealthLiveObservability(process.cwd())).toEqual([]);
  });
});
