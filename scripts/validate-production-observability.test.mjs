import { describe, expect, it } from "vitest";
import { validatePackageScripts } from "./validate-production-observability.mjs";

describe("validate-production-observability", () => {
  it("requires the Phase 23 validation command", () => {
    const failures = validatePackageScripts({
      scripts: {
        "validate:phase23": "vitest run src/services/observabilityService.test.ts src/routes/routeGuards.test.ts scripts/validate-production-observability.test.mjs && node scripts/validate-production-observability.mjs --config-only",
        "smoke:production": "node scripts/validate-production-deployment-smoke.mjs"
      }
    });

    expect(failures).toEqual([]);
  });
});
