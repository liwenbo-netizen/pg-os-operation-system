import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function readRequired(path) {
  const absolutePath = resolve(process.cwd(), path);

  if (!existsSync(absolutePath)) {
    throw new Error(`Missing required file: ${path}`);
  }

  return readFileSync(absolutePath, "utf8");
}

function expectIncludes(content, marker, label) {
  if (!content.includes(marker)) {
    throw new Error(`${label} is missing expected marker: ${marker}`);
  }
}

function main() {
  const packageJson = readRequired("package.json");
  const routeCatalog = readRequired("src/routes/routes.ts");
  const app = readRequired("src/App.tsx");
  const page = readRequired("src/pages/uat/UatScriptCenterPage.tsx");
  const service = readRequired("src/services/uatScriptService.ts");
  const report = readRequired("docs/development-package/phase-33-production-uat-script-center.md");

  expectIncludes(packageJson, "validate:phase33", "package scripts");
  expectIncludes(routeCatalog, "/uat/scripts", "route catalog");
  expectIncludes(routeCatalog, "UAT Script Center", "route catalog");
  expectIncludes(app, "UatScriptCenterPage", "app route binding");
  expectIncludes(page, "localStorage", "UAT page");
  expectIncludes(page, "Actual result", "UAT page");
  expectIncludes(page, "Pass", "UAT page");
  expectIncludes(page, "Fail", "UAT page");
  expectIncludes(service, "productionUatScripts", "UAT service");
  expectIncludes(service, "summarizeUatResults", "UAT service");
  expectIncludes(service, "ceo@poly-gamma.com", "UAT service");
  expectIncludes(report, "Phase 33", "Phase 33 report");
  expectIncludes(report, "npm run validate:phase33", "Phase 33 report");

  console.log("Production UAT script center validation passed.");

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
