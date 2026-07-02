import { describe, expect, it } from "vitest";
import {
  phase30Migration,
  validateAuditLogBusinessRlsPolicy,
  validatePackageScripts
} from "./validate-audit-log-business-rls-policy.mjs";

describe("validate-audit-log-business-rls-policy", () => {
  it("accepts the expected validate:phase30 package script", () => {
    expect(
      validatePackageScripts({
        scripts: {
          "validate:phase29": "node scripts/validate-direct-business-audit-writes.mjs --config-only",
          "validate:phase30": "vitest run scripts/validate-audit-log-business-rls-policy.test.mjs && node scripts/validate-audit-log-business-rls-policy.mjs --config-only"
        }
      })
    ).toEqual([]);
  });

  it("tracks the Phase 30 migration path", () => {
    expect(phase30Migration).toBe("supabase/migrations/202607020001_audit_logs_business_write_policy.sql");
  });

  it("accepts the checked-in audit log business RLS policy", () => {
    expect(validateAuditLogBusinessRlsPolicy(process.cwd())).toEqual([]);
  });
});
