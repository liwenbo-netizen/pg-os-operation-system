import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  loadEnvFiles
} from "./supabase-uat-auth-lib.mjs";

export const forbiddenProductionBundleEnvKeys = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "PGOS_UAT_DEFAULT_PASSWORD"
];

export function parseArgs(argv) {
  const urlIndex = argv.indexOf("--url");
  return {
    configOnly: argv.includes("--config-only"),
    url: urlIndex >= 0 ? argv[urlIndex + 1] : null
  };
}

export function normalizeBaseUrl(url) {
  return url.replace(/\/+$/, "");
}

export function readJson(root, fileName) {
  return JSON.parse(readFileSync(resolve(root, fileName), "utf8"));
}

export function validatePackageScripts(packageJson) {
  const scripts = packageJson.scripts ?? {};
  const failures = [];

  if (scripts["validate:phase20"] !== "vitest run scripts/validate-production-auth-readiness.test.mjs && node scripts/validate-production-auth-readiness.mjs --config-only") {
    failures.push("package.json validate:phase20 must run the production auth readiness test and config gate.");
  }

  if (scripts["smoke:production:auth"] !== "node scripts/validate-production-auth-readiness.mjs") {
    failures.push("package.json must expose smoke:production:auth.");
  }

  return failures;
}

export function buildProductionAuthReadinessPlan(env = {}, args = {}) {
  return {
    url: args.url ?? null,
    supabaseUrl: getSupabaseUrl(env),
    anonKey: getSupabaseAnonKey(env),
    forbiddenSecretKeys: collectForbiddenSecretKeys(env),
    configOnly: Boolean(args.configOnly)
  };
}

export function collectForbiddenSecretKeys(env = {}) {
  const perRolePasswordKeys = Object.keys(env).filter((key) => key.startsWith("PGOS_UAT_PASSWORD_"));
  return [...forbiddenProductionBundleEnvKeys, ...perRolePasswordKeys]
    .filter((key, index, keys) => keys.indexOf(key) === index)
    .filter((key) => Boolean(env[key]));
}

export function validateProductionAuthReadinessPlan(plan, { live = false } = {}) {
  const failures = [];

  if (live && !plan.url) {
    failures.push("--url <production-url> is required.");
  }

  if (live && !plan.supabaseUrl) {
    failures.push("VITE_SUPABASE_URL or SUPABASE_URL is required locally to verify the production bundle.");
  }

  if (live && !plan.anonKey) {
    failures.push("VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required locally to verify the production bundle.");
  }

  return failures;
}

export function extractJavaScriptAssetUrls(html, baseUrl) {
  const urls = [];
  const seen = new Set();
  const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+\.js(?:\?[^"']*)?)["'][^>]*>/gi;

  for (const match of html.matchAll(scriptPattern)) {
    const absoluteUrl = new URL(match[1], `${normalizeBaseUrl(baseUrl)}/`).toString();
    if (!seen.has(absoluteUrl)) {
      seen.add(absoluteUrl);
      urls.push(absoluteUrl);
    }
  }

  return urls;
}

export function checkBundleConfiguration(bundleText, plan) {
  return {
    supabaseUrlPresent: Boolean(plan.supabaseUrl && bundleText.includes(plan.supabaseUrl)),
    anonKeyPresent: Boolean(plan.anonKey && bundleText.includes(plan.anonKey))
  };
}

export function findForbiddenBundleSecretKeys(bundleText, env = {}, keys = collectForbiddenSecretKeys(env)) {
  return keys.filter((key) => {
    const value = env[key];
    return typeof value === "string" && value.length >= 8 && bundleText.includes(value);
  });
}

async function fetchText(url, accept) {
  const response = await fetch(url, {
    headers: {
      accept
    }
  });
  const body = await response.text();

  return {
    url,
    status: response.status,
    ok: response.ok,
    body
  };
}

export async function validateProductionAuthReadiness({ url, plan, env }) {
  const baseUrl = normalizeBaseUrl(url);
  const index = await fetchText(`${baseUrl}/`, "text/html,application/xhtml+xml");

  if (!index.ok) {
    throw new Error(`Production index failed: status=${index.status}`);
  }

  const assetUrls = extractJavaScriptAssetUrls(index.body, baseUrl);

  if (assetUrls.length === 0) {
    throw new Error("Production index does not reference a JavaScript bundle.");
  }

  const assets = [];
  for (const assetUrl of assetUrls) {
    const asset = await fetchText(assetUrl, "application/javascript,text/javascript,*/*");
    if (!asset.ok) {
      throw new Error(`Production JavaScript asset failed: status=${asset.status}`);
    }
    assets.push(asset.body);
  }

  const bundleText = assets.join("\n");
  const config = checkBundleConfiguration(bundleText, plan);
  const forbiddenSecretKeys = findForbiddenBundleSecretKeys(bundleText, env, plan.forbiddenSecretKeys);

  return {
    indexStatus: index.status,
    assetCount: assetUrls.length,
    supabaseUrlPresent: config.supabaseUrlPresent,
    anonKeyPresent: config.anonKeyPresent,
    forbiddenSecretKeys
  };
}

function printFailures(title, failures) {
  console.error(title);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();
  const env = loadEnvFiles(root);
  const plan = buildProductionAuthReadinessPlan(env, args);
  const packageFailures = validatePackageScripts(readJson(root, "package.json"));

  if (packageFailures.length > 0) {
    printFailures("Production auth readiness config validation failed:", packageFailures);
    process.exit(1);
  }

  console.log("Production auth readiness config validation passed.");

  if (args.configOnly) {
    console.log("Config-only mode completed.");
    return;
  }

  const planFailures = validateProductionAuthReadinessPlan(plan, { live: true });
  if (planFailures.length > 0) {
    printFailures("Production auth readiness plan validation failed:", planFailures);
    process.exit(1);
  }

  const result = await validateProductionAuthReadiness({
    url: plan.url,
    plan,
    env
  });

  console.log(`Production index status=${result.indexStatus}`);
  console.log(`Production JS assets checked=${result.assetCount}`);
  console.log(`Supabase URL present in production bundle=${result.supabaseUrlPresent}`);
  console.log(`Supabase anon key present in production bundle=${result.anonKeyPresent}`);
  console.log(`Forbidden server/UAT secrets present in production bundle=${result.forbiddenSecretKeys.length}`);

  const failures = [];
  if (!result.supabaseUrlPresent) {
    failures.push("Production bundle does not contain the configured Supabase URL.");
  }
  if (!result.anonKeyPresent) {
    failures.push("Production bundle does not contain the configured Supabase anon key.");
  }
  if (result.forbiddenSecretKeys.length > 0) {
    failures.push(`Production bundle contains forbidden secret value(s): ${result.forbiddenSecretKeys.join(", ")}`);
  }

  if (failures.length > 0) {
    printFailures("Production auth readiness checks failed:", failures);
    process.exit(1);
  }

  console.log("Production auth readiness checks passed.");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
