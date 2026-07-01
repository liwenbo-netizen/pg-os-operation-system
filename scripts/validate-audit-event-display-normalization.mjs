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

  if (scripts["validate:phase27"] !== "vitest run src/repositories/auditEventRepository.test.ts scripts/validate-audit-event-display-normalization.test.mjs && node scripts/validate-audit-event-display-normalization.mjs --config-only") {
    failures.push("package.json validate:phase27 must run audit event repository tests and the display normalization config gate.");
  }

  if (!scripts["validate:phase26"]?.includes("validate-real-audit-event-write-coverage.mjs")) {
    failures.push("package.json must keep validate:phase26 wired to the real audit write coverage gate.");
  }

  return failures;
}

export function validateAuditEventDisplayNormalization(root) {
  const failures = [];
  const requiredFiles = [
    "src/repositories/auditEventRepository.ts",
    "src/repositories/auditEventRepository.test.ts",
    "docs/development-package/phase-26-real-audit-event-write-coverage.md",
    "docs/development-package/phase-27-audit-event-display-normalization.md"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 27 audit event display normalization.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const repository = readText(root, "src/repositories/auditEventRepository.ts");
  if (!repository.includes('startsWith("auth.")') || !repository.includes('return "Auth"')) {
    failures.push("auditEventRepository must display auth.* audit events as Auth.");
  }
  if (!repository.includes('startsWith("route.")') || !repository.includes('startsWith("role.")')) {
    failures.push("auditEventRepository must classify route.* and role.* audit events.");
  }
  if (!repository.includes('return "System"')) {
    failures.push("auditEventRepository must display system audit events as System.");
  }
  if (!repository.includes('return "Guide"')) {
    failures.push("auditEventRepository must keep Guide display inference.");
  }

  const tests = readText(root, "src/repositories/auditEventRepository.test.ts");
  const requiredAssertions = [
    'inferObservabilityModule("route", "auth.sign_in")).toBe("Auth")',
    'inferObservabilityModule("route", "route.visit")).toBe("System")',
    'inferObservabilityModule("route", "role.switch")).toBe("System")',
    'inferObservabilityModule("route", "guide.opened")).toBe("Guide")'
  ];

  for (const assertion of requiredAssertions) {
    if (!tests.includes(assertion)) {
      failures.push(`auditEventRepository.test.ts must assert ${assertion}.`);
    }
  }

  const phase26 = readText(root, "docs/development-package/phase-26-real-audit-event-write-coverage.md");
  if (!phase26.includes("Production UAT was completed") || !phase26.includes("Decision: PASS")) {
    failures.push("Phase 26 report must record the manual production UAT PASS.");
  }

  const phase27 = readText(root, "docs/development-package/phase-27-audit-event-display-normalization.md");
  if (
    !phase27.includes("Production UAT was completed") ||
    !phase27.includes("https://pg-os-operation-system.vercel.app/") ||
    !phase27.includes("Observed role: `CEO`") ||
    !phase27.includes("auth.sign_in -> Auth") ||
    !phase27.includes("route.visit -> System") ||
    !phase27.includes("Observed source badge: `Supabase live`") ||
    !phase27.includes("Decision: PASS")
  ) {
    failures.push("Phase 27 report must record the production display normalization UAT PASS.");
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
    ...validateAuditEventDisplayNormalization(root)
  ];

  if (failures.length > 0) {
    printFailures("Audit event display normalization validation failed:", failures);
    process.exit(1);
  }

  console.log("Audit event display normalization config validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
