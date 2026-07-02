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
    scripts["validate:phase31"] !==
    "vitest run src/repositories/workflowRepository.test.ts scripts/validate-workflow-dirty-save.test.mjs && node scripts/validate-workflow-dirty-save.mjs --config-only"
  ) {
    failures.push("package.json validate:phase31 must run the workflow dirty save gate.");
  }

  if (!scripts["validate:phase30"]?.includes("validate-audit-log-business-rls-policy.mjs")) {
    failures.push("package.json must keep validate:phase30 wired to the audit log business RLS policy gate.");
  }

  return failures;
}

export function validateWorkflowDirtySave(root) {
  const failures = [];
  const requiredFiles = [
    "src/repositories/supabaseWorkflowRepository.ts",
    "src/repositories/workflowRepository.test.ts",
    "scripts/validate-uat.mjs",
    "supabase/migrations/202607020002_media_manager_integration_project_policy.sql",
    "supabase/policies/rls_policies.sql",
    "supabase/README.md",
    "docs/development-package/phase-31-workflow-dirty-save-rls-warning-cleanup.md"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 31 workflow dirty save cleanup.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const repository = readText(root, "src/repositories/supabaseWorkflowRepository.ts");
  const repositoryTests = readText(root, "src/repositories/workflowRepository.test.ts");
  const uatGate = readText(root, "scripts/validate-uat.mjs");
  const integrationPolicy = readText(root, "supabase/migrations/202607020002_media_manager_integration_project_policy.sql");
  const policyMirror = readText(root, "supabase/policies/rls_policies.sql");
  const supabaseReadme = readText(root, "supabase/README.md");
  const report = readText(root, "docs/development-package/phase-31-workflow-dirty-save-rls-warning-cleanup.md");

  for (const expected of [
    "lastSavedSnapshot",
    "filterDirtyTableRows",
    "filterDirtyRows",
    "rowFingerprint",
    "cloneWorkflowSnapshot",
    'table.table !== "audit_logs"',
    "this.lastSavedSnapshot = cloneWorkflowSnapshot(snapshot)"
  ]) {
    if (!repository.includes(expected)) {
      failures.push(`Supabase workflow repository must include ${expected}.`);
    }
  }

  for (const expected of [
    "dirty saves only changed rows after a loaded Supabase baseline",
    "dirty saves new business event rows without bulk audit log rewrites after a successful baseline save",
    "fakeSupabase.writes.advertisers).toBeUndefined",
    'call.table === "audit_logs")).toBe(false)',
    "module_business_events"
  ]) {
    if (!repositoryTests.includes(expected)) {
      failures.push(`workflowRepository.test.ts must cover ${expected}.`);
    }
  }

  if (!uatGate.includes('script: "validate:phase31"')) {
    failures.push("validate:uat:local must include the Phase 31 dirty save gate.");
  }

  for (const source of [integrationPolicy, policyMirror]) {
    if (!source.includes("integration_projects_write_integration") || !source.includes("'media_manager'")) {
      failures.push("Integration project RLS policy must allow media_manager onboarding writes.");
    }
  }

  if (!supabaseReadme.includes("202607020002_media_manager_integration_project_policy.sql")) {
    failures.push("supabase/README.md must list the Phase 31B integration project policy migration.");
  }

  for (const expected of [
    "Phase 31",
    "Workflow Snapshot Dirty Save",
    "RLS Warning Cleanup",
    "npm run validate:phase31",
    "202607020002_media_manager_integration_project_policy.sql",
    "module_business_events",
    "audit_logs"
  ]) {
    if (!report.includes(expected)) {
      failures.push(`Phase 31 report must mention ${expected}.`);
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
    ...validateWorkflowDirtySave(root)
  ];

  if (failures.length > 0) {
    printFailures("Workflow dirty save validation failed:", failures);
    process.exit(1);
  }

  console.log("Workflow dirty save validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
