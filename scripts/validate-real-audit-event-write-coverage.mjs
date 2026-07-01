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

  if (scripts["validate:phase26"] !== "vitest run src/repositories/auditLogRepository.test.ts scripts/validate-real-audit-event-write-coverage.test.mjs && node scripts/validate-real-audit-event-write-coverage.mjs --config-only") {
    failures.push("package.json validate:phase26 must run audit log repository tests and the write coverage config gate.");
  }

  if (!scripts["validate:phase25"]?.includes("validate-system-health-live-observability.mjs")) {
    failures.push("package.json must keep validate:phase25 wired to the system health live observability gate.");
  }

  return failures;
}

export function validateRealAuditEventWriteCoverage(root) {
  const failures = [];
  const requiredFiles = [
    "src/App.tsx",
    "src/repositories/auditLogRepository.ts",
    "src/repositories/auditLogRepository.test.ts",
    "src/repositories/auditEventRepository.ts",
    "docs/development-package/phase-26-real-audit-event-write-coverage.md"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 26 real audit event write coverage.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const repository = readText(root, "src/repositories/auditLogRepository.ts");
  if (!repository.includes('from("audit_logs").insert')) {
    failures.push("auditLogRepository must insert into audit_logs.");
  }
  if (!repository.includes("createAuditLogRow")) {
    failures.push("auditLogRepository must expose a testable row mapper.");
  }
  if (!repository.includes("after_data")) {
    failures.push("auditLogRepository must write audit metadata into after_data.");
  }
  if (!repository.includes("optionalUuid")) {
    failures.push("auditLogRepository must guard uuid-only database columns.");
  }

  const app = readText(root, "src/App.tsx");
  if (!app.includes("createAuditLogRepository")) {
    failures.push("App must create an AuditLogRepository.");
  }

  const requiredActions = [
    "auth.sign_in",
    "auth.sign_out",
    "role.switch",
    "role.switch.denied",
    "route.visit",
    "route.denied"
  ];

  for (const action of requiredActions) {
    if (!app.includes(action)) {
      failures.push(`App must record ${action} audit events.`);
    }
  }

  if (!app.includes("recordAuditLogForUser")) {
    failures.push("App must centralize audit write calls through recordAuditLogForUser.");
  }

  const eventRepository = readText(root, "src/repositories/auditEventRepository.ts");
  if (!eventRepository.includes("mapAuditLogRow") || !eventRepository.includes('from("audit_logs")')) {
    failures.push("auditEventRepository must continue reading audit_logs for visible audit coverage.");
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
    ...validateRealAuditEventWriteCoverage(root)
  ];

  if (failures.length > 0) {
    printFailures("Real audit event write coverage validation failed:", failures);
    process.exit(1);
  }

  console.log("Real audit event write coverage config validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
