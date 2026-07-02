import { describe, expect, it } from "vitest";
import { validatePackageScripts, validateWorkflowDirtySave } from "./validate-workflow-dirty-save.mjs";

describe("validate-workflow-dirty-save", () => {
  it("accepts the expected validate:phase31 package script", () => {
    expect(
      validatePackageScripts({
        scripts: {
          "validate:phase30": "node scripts/validate-audit-log-business-rls-policy.mjs --config-only",
          "validate:phase31":
            "vitest run src/repositories/workflowRepository.test.ts scripts/validate-workflow-dirty-save.test.mjs && node scripts/validate-workflow-dirty-save.mjs --config-only"
        }
      })
    ).toEqual([]);
  });

  it("accepts the checked-in workflow dirty save implementation", () => {
    expect(validateWorkflowDirtySave(process.cwd())).toEqual([]);
  });
});
