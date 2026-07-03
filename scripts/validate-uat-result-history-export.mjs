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
  const scripts = packageJson.scripts ?? {};
  const failures = [];

  if (
    scripts["validate:phase35"] !==
    "vitest run src/repositories/uatScriptResultRepository.test.ts src/services/uatHistoryExportService.test.ts src/routes/routeGuards.test.ts scripts/validate-production-deployment-smoke.test.mjs && node scripts/validate-uat-result-history-export.mjs --config-only"
  ) {
    failures.push("package.json validate:phase35 must run UAT history, export, route, and smoke checks.");
  }

  if (!scripts["validate:phase34"]?.includes("validate-uat-script-supabase-persistence.mjs")) {
    failures.push("package.json must keep validate:phase34 wired to UAT persistence.");
  }

  return failures;
}

export function validateUatResultHistory(root) {
  const failures = [];
  const requiredFiles = [
    "src/pages/uat/UatResultHistoryPage.tsx",
    "src/repositories/uatScriptResultRepository.ts",
    "src/repositories/uatScriptResultRepository.test.ts",
    "src/services/uatHistoryExportService.ts",
    "src/services/uatHistoryExportService.test.ts",
    "src/routes/routes.ts",
    "src/App.tsx",
    "scripts/validate-production-deployment-smoke.mjs",
    "docs/development-package/phase-35-uat-result-history-export.md"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 35 UAT result history.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const page = readText(root, "src/pages/uat/UatResultHistoryPage.tsx");
  const repository = readText(root, "src/repositories/uatScriptResultRepository.ts");
  const repositoryTests = readText(root, "src/repositories/uatScriptResultRepository.test.ts");
  const exportService = readText(root, "src/services/uatHistoryExportService.ts");
  const exportTests = readText(root, "src/services/uatHistoryExportService.test.ts");
  const routes = readText(root, "src/routes/routes.ts");
  const app = readText(root, "src/App.tsx");
  const smoke = readText(root, "scripts/validate-production-deployment-smoke.mjs");
  const report = readText(root, "docs/development-package/phase-35-uat-result-history-export.md");

  for (const expected of [
    "loadHistory",
    "createUatHistoryCsv",
    "createUatHistoryJson",
    "Step evidence",
    "CSV",
    "JSON"
  ]) {
    if (!page.includes(expected)) {
      failures.push(`UAT result history page must include ${expected}.`);
    }
  }

  for (const expected of [
    "UatRunHistoryItem",
    "UatStepHistoryItem",
    "UatScriptHistoryLoadResult",
    "loadHistory",
    "uat_script_runs",
    "uat_script_step_results",
    "order(\"updated_at\""
  ]) {
    if (!repository.includes(expected)) {
      failures.push(`UAT result repository must include ${expected}.`);
    }
  }

  if (!repositoryTests.includes("loads Supabase UAT run history with the selected run step details")) {
    failures.push("UAT result repository tests must cover run history loading.");
  }

  for (const expected of ["createUatHistoryCsv", "createUatHistoryJson", "createUatHistoryFileName"]) {
    if (!exportService.includes(expected) || !exportTests.includes(expected)) {
      failures.push(`UAT history export service and tests must include ${expected}.`);
    }
  }

  if (!routes.includes("/uat/history") || !routes.includes("UAT Result History")) {
    failures.push("Route catalog must include /uat/history.");
  }

  if (!app.includes("UatResultHistoryPage") || !app.includes('activeRoute.path === "/uat/history"')) {
    failures.push("App route binding must render UatResultHistoryPage.");
  }

  if (!smoke.includes('"/uat/history"')) {
    failures.push("Production smoke paths must include /uat/history.");
  }

  for (const expected of [
    "Phase 35",
    "UAT Result History",
    "/uat/history",
    "CSV",
    "JSON",
    "npm run validate:phase35"
  ]) {
    if (!report.includes(expected)) {
      failures.push(`Phase 35 report must mention ${expected}.`);
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
    ...validateUatResultHistory(root)
  ];

  if (failures.length > 0) {
    printFailures("UAT result history validation failed:", failures);
    process.exit(1);
  }

  console.log("UAT result history validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
