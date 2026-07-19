import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requiredBusinessDomains = ["Media", "Sales", "Finance", "Contract"];
const requiredMarkers = [
  "businessDomain",
  "businessActions",
  "dataQualityChecks",
  "auditEvents",
  "Create publisher onboarding package",
  "Validate media",
  "Complete reconciliation",
  "Approve legal review"
];

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
    scripts["validate:phase36"] !==
    "vitest run src/services/uatScriptService.test.ts src/services/businessUatCoverageService.test.ts && node scripts/validate-business-uat-mainline.mjs --config-only"
  ) {
    failures.push("package.json validate:phase36 must run UAT script and business coverage checks.");
  }

  return failures;
}

export function validateBusinessUatMainline(root) {
  const failures = [];
  const requiredFiles = [
    "src/services/uatScriptService.ts",
    "src/services/uatScriptService.test.ts",
    "src/services/businessUatCoverageService.ts",
    "src/services/businessUatCoverageService.test.ts",
    "src/pages/uat/UatScriptCenterPage.tsx",
    "src/repositories/uatScriptResultRepository.ts",
    "docs/development-package/phase-36-business-mainline-uat-data-quality.md"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 36 business mainline UAT.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const service = readText(root, "src/services/uatScriptService.ts");
  const coverage = readText(root, "src/services/businessUatCoverageService.ts");
  const page = readText(root, "src/pages/uat/UatScriptCenterPage.tsx");
  const repository = readText(root, "src/repositories/uatScriptResultRepository.ts");
  const report = readText(root, "docs/development-package/phase-36-business-mainline-uat-data-quality.md");

  for (const marker of requiredMarkers) {
    if (!service.includes(marker)) {
      failures.push(`UAT script service must include ${marker}.`);
    }
  }

  for (const domain of requiredBusinessDomains) {
    if (!service.includes(`businessDomain: "${domain}"`)) {
      failures.push(`UAT script service must include ${domain} businessDomain.`);
    }

    if (!coverage.includes(domain)) {
      failures.push(`Business coverage service must validate ${domain}.`);
    }
  }

  for (const marker of ["buildBusinessUatCoverage", "Business mainline coverage", "Data quality checks", "Audit event markers"]) {
    if (!page.includes(marker)) {
      failures.push(`UAT Script Center page must include ${marker}.`);
    }
  }

  for (const marker of ["businessDomain", "businessActions", "dataQualityChecks", "stepBusinessAction"]) {
    if (!repository.includes(marker)) {
      failures.push(`UAT result repository metadata must include ${marker}.`);
    }
  }

  for (const marker of ["Phase 36", "Media", "Sales", "Finance", "Contract", "npm run validate:phase36"]) {
    if (!report.includes(marker)) {
      failures.push(`Phase 36 report must mention ${marker}.`);
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
    ...validateBusinessUatMainline(root)
  ];

  if (failures.length > 0) {
    printFailures("Business UAT mainline validation failed:", failures);
    process.exit(1);
  }

  console.log("Business UAT mainline validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
