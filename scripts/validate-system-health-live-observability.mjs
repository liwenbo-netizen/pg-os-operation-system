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

  if (scripts["validate:phase25"] !== "vitest run src/services/observabilityService.test.ts scripts/validate-system-health-live-observability.test.mjs && node scripts/validate-system-health-live-observability.mjs --config-only") {
    failures.push("package.json validate:phase25 must run observability service tests and the live health config gate.");
  }

  if (!scripts["validate:phase24"]?.includes("validate-production-audit-events.mjs")) {
    failures.push("package.json must keep validate:phase24 wired to the audit events gate.");
  }

  return failures;
}

export function validateSystemHealthLiveObservability(root) {
  const failures = [];
  const requiredFiles = [
    "src/pages/system/SystemHealthPage.tsx",
    "src/services/observabilityService.ts",
    "src/services/observabilityService.test.ts",
    "src/repositories/auditEventRepository.ts",
    "docs/development-package/phase-25-system-health-live-observability.md"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 25 live observability alignment.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const healthPage = readText(root, "src/pages/system/SystemHealthPage.tsx");
  if (!healthPage.includes("createAuditEventRepository")) {
    failures.push("SystemHealthPage must load live event coverage through createAuditEventRepository.");
  }
  if (!healthPage.includes("eventCoverage")) {
    failures.push("SystemHealthPage must pass eventCoverage into buildSystemHealthChecks.");
  }
  if (!healthPage.includes("Supabase live") || !healthPage.includes("Snapshot fallback")) {
    failures.push("SystemHealthPage must show live and fallback event source states.");
  }
  if (!healthPage.includes("eventPage.warnings")) {
    failures.push("SystemHealthPage must surface live event source warnings.");
  }

  const service = readText(root, "src/services/observabilityService.ts");
  if (!service.includes("SystemHealthEventCoverage")) {
    failures.push("observabilityService must define SystemHealthEventCoverage.");
  }
  if (!service.includes("Supabase live") || !service.includes("Supabase partial")) {
    failures.push("observabilityService must describe Supabase live and partial event coverage.");
  }
  if (!service.includes("buildSnapshotEventCoverage")) {
    failures.push("observabilityService must retain snapshot fallback coverage.");
  }

  const phase24 = readText(root, "docs/development-package/phase-24-supabase-audit-events-pagination.md");
  if (!phase24.includes("Manual Production Sign-Off") || !phase24.includes("Supabase live")) {
    failures.push("Phase 24 report must include the manual production sign-off result.");
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
    ...validateSystemHealthLiveObservability(root)
  ];

  if (failures.length > 0) {
    printFailures("System health live observability validation failed:", failures);
    process.exit(1);
  }

  console.log("System health live observability config validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
