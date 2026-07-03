import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function readText(root, fileName) {
  return readFileSync(resolve(root, fileName), "utf8");
}

function readJson(root, fileName) {
  return JSON.parse(readText(root, fileName));
}

export function validatePackageScripts(packageJson) {
  const failures = [];
  const scripts = packageJson.scripts ?? {};

  if (
    scripts["validate:phase37"] !==
    "node scripts/validate-production-business-uat-signoff.mjs --config-only"
  ) {
    failures.push("package.json validate:phase37 must run production business UAT sign-off validation.");
  }

  if (!scripts["validate:phase36"]?.includes("validate-business-uat-mainline.mjs")) {
    failures.push("package.json must keep validate:phase36 wired to business mainline UAT validation.");
  }

  return failures;
}

export function validateProductionBusinessUatSignoff(root) {
  const failures = [];
  const requiredFiles = [
    "docs/development-package/phase-37-production-business-mainline-uat-signoff.md",
    "docs/development-package/phase-36-business-mainline-uat-data-quality.md",
    "scripts/validate-business-uat-mainline.mjs",
    "scripts/validate-production-deployment-smoke.mjs",
    "src/services/uatScriptService.ts",
    "src/pages/uat/UatScriptCenterPage.tsx"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 37 production business UAT sign-off.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const report = readText(root, "docs/development-package/phase-37-production-business-mainline-uat-signoff.md");
  const service = readText(root, "src/services/uatScriptService.ts");
  const page = readText(root, "src/pages/uat/UatScriptCenterPage.tsx");

  for (const marker of [
    "Phase 37",
    "https://pg-os-operation-system.vercel.app/",
    "npm run smoke:production -- --url https://pg-os-operation-system.vercel.app/",
    "Business mainline coverage",
    "Media",
    "Sales",
    "Finance",
    "Contract",
    "Supabase password was not entered by Codex",
    "User-Assisted Live-Write UAT"
  ]) {
    if (!report.includes(marker)) {
      failures.push(`Phase 37 report must mention ${marker}.`);
    }
  }

  for (const marker of [
    "Media Manager publisher onboarding closed loop",
    "Sales Manager proposal guard closed loop",
    "Finance settlement sign-off closed loop",
    "Legal contract review closed loop"
  ]) {
    if (!service.includes(marker)) {
      failures.push(`UAT script service must keep ${marker}.`);
    }
  }

  for (const marker of ["Business mainline coverage", "Business actions and audit markers", "Data quality checks"]) {
    if (!page.includes(marker)) {
      failures.push(`UAT Script Center must render ${marker}.`);
    }
  }

  return failures;
}

function printFailures(title, failures) {
  console.error(title);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
}

async function main() {
  const configOnly = process.argv.includes("--config-only");
  const root = process.cwd();
  const failures = [
    ...validatePackageScripts(readJson(root, "package.json")),
    ...validateProductionBusinessUatSignoff(root)
  ];

  if (failures.length > 0) {
    printFailures("Production business UAT sign-off validation failed:", failures);
    process.exit(1);
  }

  console.log("Production business UAT sign-off validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
