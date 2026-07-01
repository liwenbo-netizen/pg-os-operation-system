import { describe, expect, it } from "vitest";
import {
  buildProductionAuthReadinessPlan,
  checkBundleConfiguration,
  collectForbiddenSecretKeys,
  extractJavaScriptAssetUrls,
  findForbiddenBundleSecretKeys,
  validatePackageScripts,
  validateProductionAuthReadinessPlan
} from "./validate-production-auth-readiness.mjs";

describe("validate-production-auth-readiness", () => {
  it("requires the package scripts used by the Phase 20 gate", () => {
    const failures = validatePackageScripts({
      scripts: {
        "validate:phase20": "vitest run scripts/validate-production-auth-readiness.test.mjs && node scripts/validate-production-auth-readiness.mjs --config-only",
        "smoke:production:auth": "node scripts/validate-production-auth-readiness.mjs"
      }
    });

    expect(failures).toEqual([]);
  });

  it("extracts production JavaScript bundle urls from an index document", () => {
    const urls = extractJavaScriptAssetUrls(
      `
        <script type="module" crossorigin src="/assets/index-abc123.js"></script>
        <script type="module" crossorigin src="https://cdn.example.com/extra.js?hash=1"></script>
      `,
      "https://pg-os-operation-system.vercel.app/"
    );

    expect(urls).toEqual([
      "https://pg-os-operation-system.vercel.app/assets/index-abc123.js",
      "https://cdn.example.com/extra.js?hash=1"
    ]);
  });

  it("builds a live plan from local Supabase env without exposing values", () => {
    const plan = buildProductionAuthReadinessPlan(
      {
        VITE_SUPABASE_URL: "https://example.supabase.co",
        VITE_SUPABASE_ANON_KEY: "anon-public-key",
        SUPABASE_SERVICE_ROLE_KEY: "server-secret-value"
      },
      {
        url: "https://app.example.com"
      }
    );

    expect(plan.url).toBe("https://app.example.com");
    expect(plan.supabaseUrl).toBe("https://example.supabase.co");
    expect(plan.anonKey).toBe("anon-public-key");
    expect(plan.forbiddenSecretKeys).toEqual(["SUPABASE_SERVICE_ROLE_KEY"]);
  });

  it("requires url and local frontend env for live verification", () => {
    const failures = validateProductionAuthReadinessPlan(
      {
        url: null,
        supabaseUrl: "",
        anonKey: "",
        forbiddenSecretKeys: []
      },
      { live: true }
    );

    expect(failures).toEqual([
      "--url <production-url> is required.",
      "VITE_SUPABASE_URL or SUPABASE_URL is required locally to verify the production bundle.",
      "VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required locally to verify the production bundle."
    ]);
  });

  it("checks Supabase frontend config and blocks server-only secrets in bundles", () => {
    const env = {
      VITE_SUPABASE_URL: "https://example.supabase.co",
      VITE_SUPABASE_ANON_KEY: "anon-public-key",
      SUPABASE_SERVICE_ROLE_KEY: "server-secret-value",
      PGOS_UAT_PASSWORD_MEDIA_MANAGER: "role-password-value"
    };
    const plan = buildProductionAuthReadinessPlan(env, {
      url: "https://app.example.com"
    });
    const bundle = [
      "https://example.supabase.co",
      "anon-public-key",
      "server-secret-value"
    ].join(";");

    expect(checkBundleConfiguration(bundle, plan)).toEqual({
      supabaseUrlPresent: true,
      anonKeyPresent: true
    });
    expect(collectForbiddenSecretKeys(env)).toEqual([
      "SUPABASE_SERVICE_ROLE_KEY",
      "PGOS_UAT_PASSWORD_MEDIA_MANAGER"
    ]);
    expect(findForbiddenBundleSecretKeys(bundle, env, plan.forbiddenSecretKeys)).toEqual([
      "SUPABASE_SERVICE_ROLE_KEY"
    ]);
  });
});
