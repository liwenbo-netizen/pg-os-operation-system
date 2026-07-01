import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function readText(root, fileName) {
  return readFileSync(resolve(root, fileName), "utf8");
}

function readJson(root, fileName) {
  return JSON.parse(readText(root, fileName));
}

export const requiredCoreBusinessAuditActions = [
  "publisher.create",
  "publisher.technical_live.submit",
  "commercial_test.conclude",
  "publisher.sales_readiness.approve",
  "opportunity.create",
  "proposal.create",
  "proposal.publisher.select",
  "proposal.approve",
  "campaign.create",
  "campaign.launch_check.complete",
  "campaign.launch.approve",
  "settlement.reconcile",
  "settlement.confirm",
  "settlement.invoice.issue",
  "settlement.payment.mark_paid",
  "contract.review.request",
  "contract.legal_review.approve",
  "contract.finance_terms.approve",
  "contract.sign",
  "contract.archive"
];

export function validatePackageScripts(packageJson) {
  const scripts = packageJson.scripts ?? {};
  const failures = [];

  if (
    scripts["validate:phase28"] !==
    "vitest run src/services/businessAuditCoverage.test.ts src/repositories/workflowRepository.test.ts scripts/validate-business-audit-write-coverage.test.mjs && node scripts/validate-business-audit-write-coverage.mjs --config-only"
  ) {
    failures.push("package.json validate:phase28 must run business audit coverage tests and config gate.");
  }

  if (!scripts["validate:phase27"]?.includes("validate-audit-event-display-normalization.mjs")) {
    failures.push("package.json must keep validate:phase27 wired to the display normalization gate.");
  }

  return failures;
}

export function validateBusinessAuditWriteCoverage(root) {
  const failures = [];
  const requiredFiles = [
    "src/services/businessAuditCoverage.ts",
    "src/services/businessAuditCoverage.test.ts",
    "src/repositories/supabaseWorkflowRepository.ts",
    "src/repositories/workflowRepository.test.ts",
    "docs/development-package/phase-28-business-audit-write-coverage.md"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 28 business audit write coverage.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const coverage = readText(root, "src/services/businessAuditCoverage.ts");
  if (!coverage.includes("CORE_BUSINESS_AUDIT_ACTIONS")) {
    failures.push("businessAuditCoverage must define the core business audit action manifest.");
  }
  if (!coverage.includes("buildBusinessAuditAfterData")) {
    failures.push("businessAuditCoverage must expose the audit after_data mapper.");
  }
  if (!coverage.includes("phase28_core_business_action")) {
    failures.push("business audit after_data must include the Phase 28 coverage marker.");
  }

  for (const action of requiredCoreBusinessAuditActions) {
    if (!coverage.includes(action)) {
      failures.push(`businessAuditCoverage must include ${action}.`);
    }
  }

  const repository = readText(root, "src/repositories/supabaseWorkflowRepository.ts");
  if (!repository.includes("buildBusinessAuditAfterData(event, context?.actor?.activeRole)")) {
    failures.push("Supabase workflow repository must enrich audit_logs after_data through buildBusinessAuditAfterData.");
  }
  if (!repository.includes('table: "audit_logs"')) {
    failures.push("Supabase workflow repository must keep writing workflow audit events to audit_logs.");
  }

  const workflowTests = readText(root, "src/repositories/workflowRepository.test.ts");
  for (const expected of [
    "phase28_core_business_action",
    "publisher.create",
    "proposal.approve",
    "settlement.confirm",
    "contract.sign",
    "businessModule"
  ]) {
    if (!workflowTests.includes(expected)) {
      failures.push(`workflowRepository.test.ts must assert ${expected}.`);
    }
  }

  const report = readText(root, "docs/development-package/phase-28-business-audit-write-coverage.md");
  for (const expected of [
    "Phase 28",
    "Media",
    "Sales",
    "Finance",
    "Contracts",
    "npm run validate:phase28",
    "phase28_core_business_action"
  ]) {
    if (!report.includes(expected)) {
      failures.push(`Phase 28 report must mention ${expected}.`);
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
    ...validateBusinessAuditWriteCoverage(root)
  ];

  if (failures.length > 0) {
    printFailures("Business audit write coverage validation failed:", failures);
    process.exit(1);
  }

  console.log("Business audit write coverage config validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
