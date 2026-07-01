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

  if (scripts["validate:phase24"] !== "vitest run src/repositories/auditEventRepository.test.ts scripts/validate-production-audit-events.test.mjs && node scripts/validate-production-audit-events.mjs --config-only") {
    failures.push("package.json validate:phase24 must run the audit event repository tests and config gate.");
  }

  if (!scripts["smoke:production"]?.includes("validate-production-deployment-smoke.mjs")) {
    failures.push("package.json must keep smoke:production wired to validate-production-deployment-smoke.mjs.");
  }

  return failures;
}

export function validateAuditEventSource(root) {
  const failures = [];
  const requiredFiles = [
    "src/repositories/auditEventRepository.ts",
    "src/repositories/auditEventRepository.test.ts",
    "src/pages/audit/AuditEventConsolePage.tsx",
    "scripts/validate-production-audit-events.mjs",
    "scripts/validate-production-audit-events.test.mjs"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 24 audit event pagination.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const repository = readText(root, "src/repositories/auditEventRepository.ts");
  if (!repository.includes('from("audit_logs")') || !repository.includes('from("module_business_events")')) {
    failures.push("auditEventRepository must query audit_logs and module_business_events.");
  }
  if (!repository.includes(".range(0, fetchLimit - 1)")) {
    failures.push("auditEventRepository must use ranged pagination against Supabase.");
  }
  if (!repository.includes("createSnapshotAuditEventPage")) {
    failures.push("auditEventRepository must keep a snapshot fallback page.");
  }
  if (!repository.includes("mapAuditLogRow") || !repository.includes("mapBusinessEventRow")) {
    failures.push("auditEventRepository must map both audit and business event rows.");
  }

  const page = readText(root, "src/pages/audit/AuditEventConsolePage.tsx");
  if (!page.includes("createAuditEventRepository")) {
    failures.push("AuditEventConsolePage must load events through createAuditEventRepository.");
  }
  if (!page.includes("setPage") || !page.includes("hasNextPage")) {
    failures.push("AuditEventConsolePage must expose pagination controls.");
  }
  if (!page.includes("Supabase live") || !page.includes("Snapshot fallback")) {
    failures.push("AuditEventConsolePage must show the event source state.");
  }

  const smoke = readText(root, "scripts/validate-production-deployment-smoke.mjs");
  if (!smoke.includes('"/audit/events"')) {
    failures.push("production smoke paths must include /audit/events.");
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
    ...validateAuditEventSource(root)
  ];

  if (failures.length > 0) {
    printFailures("Production audit event validation failed:", failures);
    process.exit(1);
  }

  console.log("Production audit event config validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
