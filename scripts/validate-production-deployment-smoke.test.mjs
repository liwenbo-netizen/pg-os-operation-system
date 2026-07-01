import { describe, expect, it } from "vitest";
import {
  productionSmokePaths,
  validatePackageScripts,
  validateVercelConfig
} from "./validate-production-deployment-smoke.mjs";

describe("validate-production-deployment-smoke", () => {
  it("accepts the Vercel SPA deployment contract", () => {
    const failures = validateVercelConfig({
      framework: "vite",
      installCommand: "npm ci",
      buildCommand: "npm run build",
      outputDirectory: "dist",
      rewrites: [
        {
          source: "/(.*)",
          destination: "/index.html"
        }
      ]
    });

    expect(failures).toEqual([]);
  });

  it("requires the smoke script and local deployment gate", () => {
    const failures = validatePackageScripts({
      scripts: {
        build: "tsc --noEmit && vite build",
        "validate:phase18c": "node scripts/validate-uat.mjs --local-only",
        "smoke:production": "node scripts/validate-production-deployment-smoke.mjs"
      }
    });

    expect(failures).toEqual([]);
  });

  it("covers root and representative deep links", () => {
    expect(productionSmokePaths).toContain("/");
    expect(productionSmokePaths).toContain("/workbench");
    expect(productionSmokePaths).toContain("/system/health");
    expect(productionSmokePaths).toContain("/audit/events");
    expect(productionSmokePaths).toContain("/contracts/uat-smoke");
    expect(productionSmokePaths).toContain("/finance/settlements/uat-smoke");
  });
});
