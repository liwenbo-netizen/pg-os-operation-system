import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const productionSmokePaths = [
  "/",
  "/workbench",
  "/guide",
  "/system/health",
  "/audit/events",
  "/uat/scripts",
  "/uat/history",
  "/contracts/uat-smoke",
  "/finance/settlements/uat-smoke",
  "/media/manager-workbench",
  "/sales/manager-workbench"
];

function parseArgs(argv) {
  const urlIndex = argv.indexOf("--url");
  return {
    configOnly: argv.includes("--config-only"),
    url: urlIndex >= 0 ? argv[urlIndex + 1] : null
  };
}

function readJson(root, fileName) {
  return JSON.parse(readFileSync(resolve(root, fileName), "utf8"));
}

export function validateVercelConfig(config) {
  const failures = [];

  if (config.framework !== "vite") {
    failures.push("vercel.json framework must be vite.");
  }

  if (config.installCommand !== "npm ci") {
    failures.push("vercel.json installCommand must be npm ci.");
  }

  if (config.buildCommand !== "npm run build") {
    failures.push("vercel.json buildCommand must be npm run build.");
  }

  if (config.outputDirectory !== "dist") {
    failures.push("vercel.json outputDirectory must be dist.");
  }

  const hasSpaRewrite = Array.isArray(config.rewrites)
    && config.rewrites.some((rewrite) => rewrite.source === "/(.*)" && rewrite.destination === "/index.html");

  if (!hasSpaRewrite) {
    failures.push("vercel.json must rewrite /(.*) to /index.html for SPA deep links.");
  }

  return failures;
}

export function validatePackageScripts(packageJson) {
  const failures = [];
  const scripts = packageJson.scripts ?? {};

  if (scripts.build !== "tsc --noEmit && vite build") {
    failures.push("package.json build script must run TypeScript check and Vite build.");
  }

  if (scripts["validate:phase18c"] !== "node scripts/validate-uat.mjs --local-only") {
    failures.push("package.json validate:phase18c must run the local UAT gate.");
  }

  if (!scripts["smoke:production"]?.includes("validate-production-deployment-smoke.mjs")) {
    failures.push("package.json must expose smoke:production.");
  }

  return failures;
}

function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, "");
}

async function fetchPath(baseUrl, path) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    headers: {
      accept: "text/html,application/xhtml+xml"
    }
  });
  const body = await response.text();

  return {
    path,
    status: response.status,
    ok: response.ok,
    hasReactRoot: body.includes('id="root"') || body.includes("id='root'")
  };
}

async function validateDeploymentUrl(url) {
  const results = [];
  for (const path of productionSmokePaths) {
    results.push(await fetchPath(url, path));
  }

  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const failures = [
    ...validateVercelConfig(readJson(root, "vercel.json")),
    ...validatePackageScripts(readJson(root, "package.json"))
  ];

  if (failures.length > 0) {
    console.error("Production deployment smoke validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Production deployment config validation passed.");
  console.log(`Smoke paths: ${productionSmokePaths.join(", ")}`);

  if (args.configOnly) {
    console.log("Config-only mode completed.");
    return;
  }

  if (!args.url) {
    console.log("No --url provided. Run with --url <deployment-url> after Vercel deploys.");
    return;
  }

  const results = await validateDeploymentUrl(args.url);
  const failedResults = results.filter((result) => !result.ok || !result.hasReactRoot);

  for (const result of results) {
    console.log(
      `${result.ok && result.hasReactRoot ? "PASS" : "FAIL"} ${result.path} status=${result.status} reactRoot=${result.hasReactRoot}`
    );
  }

  if (failedResults.length > 0) {
    console.error("Production deployment smoke checks failed.");
    process.exit(1);
  }

  console.log("Production deployment smoke checks passed.");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
