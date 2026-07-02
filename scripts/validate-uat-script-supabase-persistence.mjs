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
    scripts["validate:phase34"] !==
    "vitest run src/services/uatScriptService.test.ts src/repositories/uatScriptResultRepository.test.ts && node scripts/validate-uat-script-supabase-persistence.mjs --config-only"
  ) {
    failures.push("package.json validate:phase34 must run UAT script service and Supabase persistence checks.");
  }

  if (!scripts["validate:phase33"]?.includes("validate-production-uat-script-center.mjs")) {
    failures.push("package.json must keep validate:phase33 wired to the UAT Script Center gate.");
  }

  return failures;
}

export function validateUatScriptPersistence(root) {
  const failures = [];
  const requiredFiles = [
    "src/pages/uat/UatScriptCenterPage.tsx",
    "src/repositories/uatScriptResultRepository.ts",
    "src/repositories/uatScriptResultRepository.test.ts",
    "src/services/uatScriptService.ts",
    "supabase/migrations/202607020003_uat_script_results.sql",
    "supabase/README.md",
    "docs/development-package/phase-34-uat-script-supabase-persistence.md"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 34 UAT result persistence.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const page = readText(root, "src/pages/uat/UatScriptCenterPage.tsx");
  const repository = readText(root, "src/repositories/uatScriptResultRepository.ts");
  const repositoryTest = readText(root, "src/repositories/uatScriptResultRepository.test.ts");
  const service = readText(root, "src/services/uatScriptService.ts");
  const migration = readText(root, "supabase/migrations/202607020003_uat_script_results.sql");
  const readme = readText(root, "supabase/README.md");
  const report = readText(root, "docs/development-package/phase-34-uat-script-supabase-persistence.md");

  for (const expected of [
    "createUatScriptResultRepository",
    "mergeUatScriptResults",
    "Supabase synced",
    "Supabase warning",
    "saveResults",
    "loadResults"
  ]) {
    if (!page.includes(expected)) {
      failures.push(`UAT Script Center page must include ${expected}.`);
    }
  }

  for (const expected of [
    "uat_script_runs",
    "uat_script_step_results",
    "DEFAULT_UAT_RUN_KEY",
    "summarizeUatResults",
    "onConflict: \"run_key\"",
    "onConflict: \"run_id,step_id\""
  ]) {
    if (!repository.includes(expected)) {
      failures.push(`UAT result repository must include ${expected}.`);
    }
  }

  for (const expected of [
    "loads Supabase UAT step results",
    "saves the run summary",
    "returns warnings instead of throwing"
  ]) {
    if (!repositoryTest.includes(expected)) {
      failures.push(`UAT result repository tests must cover ${expected}.`);
    }
  }

  if (!service.includes("mergeUatScriptResults")) {
    failures.push("UAT script service must merge local and Supabase results.");
  }

  for (const expected of [
    "create table if not exists public.uat_script_runs",
    "create table if not exists public.uat_script_step_results",
    "enable row level security",
    "uat_script_runs_write_signoff",
    "uat_script_step_results_write_signoff",
    "'ceo','operations_director','system_admin','audit_viewer'"
  ]) {
    if (!migration.includes(expected)) {
      failures.push(`Phase 34 migration must include ${expected}.`);
    }
  }

  if (!readme.includes("202607020003_uat_script_results.sql")) {
    failures.push("supabase/README.md must list the Phase 34 UAT result migration.");
  }

  for (const expected of [
    "Phase 34",
    "UAT Script Supabase Persistence",
    "uat_script_runs",
    "uat_script_step_results",
    "npm run validate:phase34"
  ]) {
    if (!report.includes(expected)) {
      failures.push(`Phase 34 report must mention ${expected}.`);
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
    ...validateUatScriptPersistence(root)
  ];

  if (failures.length > 0) {
    printFailures("UAT script Supabase persistence validation failed:", failures);
    process.exit(1);
  }

  console.log("UAT script Supabase persistence validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
