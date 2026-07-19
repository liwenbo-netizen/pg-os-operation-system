import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function readText(root, fileName) {
  return readFileSync(resolve(root, fileName), "utf8");
}

function readJson(root, fileName) {
  return JSON.parse(readText(root, fileName));
}

export const directAuditPages = [
  "src/pages/media/MediaExperiencePage.tsx",
  "src/pages/sales/SalesExperiencePage.tsx",
  "src/pages/finance/FinanceSettlementPage.tsx",
  "src/pages/contracts/ContractWorkspacePage.tsx"
];

export function validatePackageScripts(packageJson) {
  const scripts = packageJson.scripts ?? {};
  const failures = [];

  if (
    scripts["validate:phase29"] !==
    "vitest run scripts/validate-direct-business-audit-writes.test.mjs && node scripts/validate-direct-business-audit-writes.mjs --config-only"
  ) {
    failures.push("package.json validate:phase29 must run the direct business audit write gate.");
  }

  if (!scripts["validate:phase28"]?.includes("validate-business-audit-write-coverage.mjs")) {
    failures.push("package.json must keep validate:phase28 wired to the business audit coverage gate.");
  }

  return failures;
}

export function validateDirectBusinessAuditWrites(root) {
  const failures = [];
  const requiredFiles = [
    "src/App.tsx",
    "src/repositories/auditLogRepository.ts",
    "src/services/businessAuditCoverage.ts",
    "docs/development-package/phase-29-direct-business-audit-writes.md",
    ...directAuditPages
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 29 direct business audit writes.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const app = readText(root, "src/App.tsx");
  for (const expected of [
    "buildBusinessAuditAfterData",
    "handleWorkflowAuditEvent",
    "recordAuditLogForUser(activeUser",
    "id: event.id",
    "createdAt: event.createdAt",
    "afterData: buildBusinessAuditAfterData(event, activeUser.activeRole)"
  ]) {
    if (!app.includes(expected)) {
      failures.push(`App.tsx must include ${expected}.`);
    }
  }

  for (const page of directAuditPages) {
    const source = readText(root, page);
    if (!source.includes("onAuditEvent: (event: AuditEvent) => void")) {
      failures.push(`${page} must accept an onAuditEvent callback.`);
    }
    if (
      !source.includes("onAuditEvent(result.auditEvent)") &&
      !source.includes("auditEvents.forEach(onAuditEvent)")
    ) {
      failures.push(`${page} must dispatch workflow audit events through onAuditEvent.`);
    }
  }

  const report = readText(root, "docs/development-package/phase-29-direct-business-audit-writes.md");
  for (const expected of [
    "Phase 29",
    "direct business audit writes",
    "publisher.create",
    "audit_logs",
    "npm run validate:phase29",
    "Production UAT"
  ]) {
    if (!report.includes(expected)) {
      failures.push(`Phase 29 report must mention ${expected}.`);
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
    ...validateDirectBusinessAuditWrites(root)
  ];

  if (failures.length > 0) {
    printFailures("Direct business audit write validation failed:", failures);
    process.exit(1);
  }

  console.log("Direct business audit write validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
