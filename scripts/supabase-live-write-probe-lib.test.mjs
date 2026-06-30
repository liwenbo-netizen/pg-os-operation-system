import { describe, expect, it } from "vitest";
import {
  buildLiveWriteProbePlan,
  describeLiveWriteProbePlan,
  liveWriteProbeRequiredRoles,
  validateLiveWriteProbePlan
} from "./supabase-live-write-probe-lib.mjs";

describe("Supabase live workflow write probe plan", () => {
  it("builds the UAT smoke gate across core business domains", () => {
    const plan = buildLiveWriteProbePlan({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "anon",
      PGOS_UAT_DEFAULT_PASSWORD: "secret-password"
    });
    const description = describeLiveWriteProbePlan(plan);

    expect(plan.checks.map((check) => check.id)).toEqual([
      "sales_chain",
      "media_publisher",
      "integration_project",
      "commercial_test",
      "diagnostics",
      "finance_settlement",
      "legal_contract",
      "audit_viewer_blocked"
    ]);
    expect(description.checks.find((check) => check.id === "legal_contract")).toMatchObject({
      roles: ["legal_manager"],
      tables: ["contracts"],
      migration: "supabase/migrations/202606290005_contracts_write_policy.sql"
    });
    expect(description.checks.every((check) => !("password" in check))).toBe(true);
  });

  it("validates live settings and all required probe roles", () => {
    const plan = buildLiveWriteProbePlan({}, { roles: liveWriteProbeRequiredRoles });

    expect(validateLiveWriteProbePlan(plan, { live: true })).toEqual([
      "VITE_SUPABASE_URL or SUPABASE_URL is required.",
      "VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required.",
      "Missing password for sales_manager@pgos-uat.local, media_manager@pgos-uat.local, integration_manager@pgos-uat.local, data_analyst@pgos-uat.local, finance_manager@pgos-uat.local, legal_manager@pgos-uat.local, audit_viewer@pgos-uat.local. Set PGOS_UAT_DEFAULT_PASSWORD or per-role password env."
    ]);
  });

  it("flags missing roles when a narrowed role set cannot cover the smoke gate", () => {
    const plan = buildLiveWriteProbePlan(
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_ANON_KEY: "anon",
        PGOS_UAT_DEFAULT_PASSWORD: "secret-password"
      },
      { roles: ["sales_manager"] }
    );

    expect(validateLiveWriteProbePlan(plan, { live: true })).toEqual([
      "Missing UAT probe role(s): media_manager, integration_manager, data_analyst, finance_manager, legal_manager, audit_viewer"
    ]);
  });
});
