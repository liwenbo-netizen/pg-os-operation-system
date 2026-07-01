import { describe, expect, it } from "vitest";
import {
  buildProductionManualLoginPlan,
  describeProductionManualLoginPlan,
  parseArgs,
  productionManualLoginRoleCodes,
  validatePackageScripts,
  validateProductionManualLoginPlan
} from "./validate-production-manual-login-uat.mjs";

describe("validate-production-manual-login-uat", () => {
  it("parses url and narrowed role arguments", () => {
    expect(parseArgs(["--url", "https://app.example.com", "--roles=media_manager,audit_viewer"])).toEqual({
      configOnly: false,
      url: "https://app.example.com",
      roles: ["media_manager", "audit_viewer"]
    });
  });

  it("requires the package scripts used by the Phase 21 gate", () => {
    const failures = validatePackageScripts({
      scripts: {
        "validate:phase21": "vitest run scripts/validate-production-manual-login-uat.test.mjs && node scripts/validate-production-manual-login-uat.mjs --config-only",
        "smoke:production:manual-login": "node scripts/validate-production-manual-login-uat.mjs"
      }
    });

    expect(failures).toEqual([]);
  });

  it("builds a redacted manual login plan from UAT env", () => {
    const plan = buildProductionManualLoginPlan(
      {
        VITE_SUPABASE_URL: "https://example.supabase.co/rest/v1/",
        VITE_SUPABASE_ANON_KEY: "anon-public-key",
        PGOS_UAT_EMAIL_DOMAIN: "poly-gamma.com",
        PGOS_UAT_DEFAULT_PASSWORD: "do-not-print"
      },
      {
        url: "https://app.example.com",
        roles: ["media_manager", "audit_viewer"]
      }
    );
    const description = describeProductionManualLoginPlan(plan);

    expect(plan.supabaseUrl).toBe("https://example.supabase.co");
    expect(plan.users.map((user) => user.primaryRole)).toEqual(["media_manager", "audit_viewer"]);
    expect(description.users).toEqual([
      {
        email: "media_manager@poly-gamma.com",
        role: "media_manager",
        passwordSource: "PGOS_UAT_DEFAULT_PASSWORD"
      },
      {
        email: "audit_viewer@poly-gamma.com",
        role: "audit_viewer",
        passwordSource: "PGOS_UAT_DEFAULT_PASSWORD"
      }
    ]);
    expect(JSON.stringify(description)).not.toContain("do-not-print");
  });

  it("validates live requirements and unknown roles", () => {
    const plan = buildProductionManualLoginPlan(
      {
        PGOS_UAT_EMAIL_DOMAIN: "poly-gamma.com"
      },
      {
        roles: ["media_manager", "unknown_role"]
      }
    );

    expect(validateProductionManualLoginPlan(plan, { live: true })).toEqual([
      "Unknown role(s): unknown_role",
      "--url <production-url> is required.",
      "VITE_SUPABASE_URL or SUPABASE_URL is required.",
      "VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required.",
      "Missing UAT password for media_manager@poly-gamma.com. Set PGOS_UAT_DEFAULT_PASSWORD or per-role password env."
    ]);
  });

  it("keeps representative default roles for manual sign-off", () => {
    expect(productionManualLoginRoleCodes).toEqual([
      "media_manager",
      "sales_manager",
      "finance_manager",
      "legal_manager",
      "product_owner",
      "audit_viewer"
    ]);
  });
});
