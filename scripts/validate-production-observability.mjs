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

  if (scripts["validate:phase23"] !== "vitest run src/services/observabilityService.test.ts src/routes/routeGuards.test.ts scripts/validate-production-observability.test.mjs && node scripts/validate-production-observability.mjs --config-only") {
    failures.push("package.json validate:phase23 must run observability service, route guard, script tests, and config gate.");
  }

  if (!scripts["smoke:production"]?.includes("validate-production-deployment-smoke.mjs")) {
    failures.push("package.json must keep smoke:production wired to validate-production-deployment-smoke.mjs.");
  }

  return failures;
}

export function validateObservabilitySource(root) {
  const failures = [];
  const requiredFiles = [
    "src/app/ErrorBoundary.tsx",
    "src/pages/system/SystemHealthPage.tsx",
    "src/pages/audit/AuditEventConsolePage.tsx",
    "src/services/observabilityService.ts",
    "src/services/observabilityService.test.ts"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 23 observability.`);
    }
  }

  const routes = readText(root, "src/routes/routes.ts");
  if (!routes.includes('path: "/system/health"')) {
    failures.push("route catalog must include /system/health.");
  }
  if (!routes.includes('path: "/audit/events"')) {
    failures.push("route catalog must include /audit/events.");
  }
  if (!routes.includes('allowedRoles: ["ceo", "system_admin", "audit_viewer"]')) {
    failures.push("/audit/events must be limited to ceo, system_admin, and audit_viewer.");
  }

  const app = readText(root, "src/App.tsx");
  if (!app.includes("SystemHealthPage") || !app.includes("AuditEventConsolePage")) {
    failures.push("App.tsx must render SystemHealthPage and AuditEventConsolePage.");
  }

  const main = readText(root, "src/main.tsx");
  if (!main.includes("<ErrorBoundary>")) {
    failures.push("main.tsx must wrap App in ErrorBoundary.");
  }

  const smoke = readText(root, "scripts/validate-production-deployment-smoke.mjs");
  if (!smoke.includes('"/system/health"') || !smoke.includes('"/audit/events"')) {
    failures.push("production smoke paths must include /system/health and /audit/events.");
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
    ...validateObservabilitySource(root)
  ];

  if (failures.length > 0) {
    printFailures("Production observability validation failed:", failures);
    process.exit(1);
  }

  console.log("Production observability config validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
