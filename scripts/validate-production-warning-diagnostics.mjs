import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readRequired(path) {
  const absolutePath = resolve(process.cwd(), path);

  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${path}`);
  }

  return readFileSync(absolutePath, "utf8");
}

function expectIncludes(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`${label} is missing expected marker: ${needle}`);
  }
}

function main() {
  const appShell = readRequired("src/app/AppShell.tsx");
  const diagnosticsService = readRequired("src/services/warningDiagnosticsService.ts");
  const report = readRequired("docs/development-package/phase-32-production-warning-diagnostics-center.md");

  expectIncludes(diagnosticsService, "buildWarningDiagnostics", "warning diagnostics service");
  expectIncludes(diagnosticsService, "row-level security", "warning diagnostics service");
  expectIncludes(diagnosticsService, "formatUtcPlus8DateTime", "warning diagnostics service");
  expectIncludes(appShell, "Supabase diagnostics", "AppShell");
  expectIncludes(appShell, "Suggested fix", "AppShell");
  expectIncludes(appShell, "aria-expanded", "AppShell");
  expectIncludes(report, "Phase 32", "Phase 32 report");
  expectIncludes(report, "npm run validate:phase32", "Phase 32 report");

  console.log("Production warning diagnostics validation passed.");

  if (process.argv.includes("--config-only")) {
    console.log("Config-only mode completed.");
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
