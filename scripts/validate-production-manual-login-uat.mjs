import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import {
  buildUatUsers,
  formatSupabaseError,
  getSupabaseAnonKey,
  getSupabaseUrl,
  loadEnvFiles,
  roleCodes
} from "./supabase-uat-auth-lib.mjs";
import { normalizeBaseUrl } from "./validate-production-auth-readiness.mjs";

export const productionManualLoginRoleCodes = [
  "media_manager",
  "sales_manager",
  "finance_manager",
  "legal_manager",
  "product_owner",
  "audit_viewer"
];

export const productionManualLoginRouteChecks = [
  "/",
  "/workbench",
  "/guide"
];

export const productionRoleBoundaryChecks = [
  {
    role: "media_manager",
    expectedPublisherWrite: "allowed"
  },
  {
    role: "audit_viewer",
    expectedPublisherWrite: "blocked"
  }
];

export function parseArgs(argv) {
  const urlIndex = argv.indexOf("--url");
  const rolesArg = argv.find((arg) => arg.startsWith("--roles="));

  return {
    configOnly: argv.includes("--config-only"),
    url: urlIndex >= 0 ? argv[urlIndex + 1] : null,
    roles: rolesArg
      ? rolesArg
          .slice("--roles=".length)
          .split(",")
          .map((role) => role.trim())
          .filter(Boolean)
      : undefined
  };
}

function readJson(root, fileName) {
  return JSON.parse(readFileSync(resolve(root, fileName), "utf8"));
}

export function validatePackageScripts(packageJson) {
  const scripts = packageJson.scripts ?? {};
  const failures = [];

  if (scripts["validate:phase21"] !== "vitest run scripts/validate-production-manual-login-uat.test.mjs && node scripts/validate-production-manual-login-uat.mjs --config-only") {
    failures.push("package.json validate:phase21 must run the production manual login UAT test and config gate.");
  }

  if (scripts["smoke:production:manual-login"] !== "node scripts/validate-production-manual-login-uat.mjs") {
    failures.push("package.json must expose smoke:production:manual-login.");
  }

  return failures;
}

export function buildProductionManualLoginPlan(env = {}, args = {}) {
  const selectedRoles = args.roles ?? productionManualLoginRoleCodes;
  const unknownRoles = selectedRoles.filter((role) => !roleCodes.includes(role));

  return {
    url: args.url ?? null,
    supabaseUrl: getSupabaseUrl(env),
    anonKey: getSupabaseAnonKey(env),
    users: buildUatUsers(env, selectedRoles),
    unknownRoles,
    routeChecks: productionManualLoginRouteChecks,
    boundaryChecks: productionRoleBoundaryChecks.filter((check) => selectedRoles.includes(check.role))
  };
}

export function validateProductionManualLoginPlan(plan, { live = false } = {}) {
  const failures = [];

  if (plan.unknownRoles.length > 0) {
    failures.push(`Unknown role(s): ${plan.unknownRoles.join(", ")}`);
  }

  if (plan.users.length === 0) {
    failures.push("At least one UAT role is required for production manual login UAT.");
  }

  if (live && !plan.url) {
    failures.push("--url <production-url> is required.");
  }

  if (live && !plan.supabaseUrl) {
    failures.push("VITE_SUPABASE_URL or SUPABASE_URL is required.");
  }

  if (live && !plan.anonKey) {
    failures.push("VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required.");
  }

  const missingPasswords = plan.users.filter((user) => !user.password);
  if (live && missingPasswords.length > 0) {
    failures.push(
      `Missing UAT password for ${missingPasswords.map((user) => user.email).join(", ")}. Set PGOS_UAT_DEFAULT_PASSWORD or per-role password env.`
    );
  }

  return failures;
}

export function describeProductionManualLoginPlan(plan) {
  return {
    productionUrlConfigured: Boolean(plan.url),
    supabaseUrlConfigured: Boolean(plan.supabaseUrl),
    anonKeyConfigured: Boolean(plan.anonKey),
    routeChecks: plan.routeChecks,
    boundaryChecks: plan.boundaryChecks.map((check) => ({
      role: check.role,
      expectedPublisherWrite: check.expectedPublisherWrite
    })),
    users: plan.users.map((user) => ({
      email: user.email,
      role: user.primaryRole,
      passwordSource: user.password ? user.passwordEnvName : "missing"
    }))
  };
}

async function fetchRoute(fetchImplementation, baseUrl, path) {
  const response = await fetchImplementation(`${normalizeBaseUrl(baseUrl)}${path}`, {
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

async function runRoleSessionCheck({ client, user, traceId, boundaryCheck, cleanup = true }) {
  const signIn = await client.auth.signInWithPassword({
    email: user.email,
    password: user.password
  });

  if (signIn.error || !signIn.data.user) {
    throw new Error(`${user.primaryRole} sign-in failed: ${signIn.error ? formatSupabaseError(signIn.error) : "no user returned"}`);
  }

  const userId = signIn.data.user.id;
  const profileRead = await client.from("profiles").select("id,email,full_name").eq("id", userId).maybeSingle();
  const userRolesRead = await client.from("user_roles").select("role_code").eq("user_id", userId);
  const assignedRoles = (userRolesRead.data ?? []).map((row) => row.role_code).filter(Boolean);
  const profileReadOk = !profileRead.error && Boolean(profileRead.data);
  const userRolesReadOk = !userRolesRead.error && assignedRoles.includes(user.primaryRole);

  if (!profileReadOk || !userRolesReadOk) {
    throw new Error(
      `${user.primaryRole} auth binding failed. profile=${profileReadOk}, expected_role=${user.primaryRole}, roles=${assignedRoles.join(",") || "none"}`
    );
  }

  let publisherWrite = "not_checked";
  let cleanupRows = 0;

  if (boundaryCheck) {
    const writeAttempt = await client
      .from("publishers")
      .insert({
        name: `Production Manual Login UAT ${traceId} ${user.primaryRole}`,
        region: "UAT",
        media_type: "Probe",
        integration_type: "Probe",
        metadata: {
          uat_probe: true,
          trace_id: traceId,
          role: user.primaryRole,
          gate: "production_manual_login_uat"
        }
      })
      .select("id")
      .maybeSingle();

    const writeAllowed = !writeAttempt.error && Boolean(writeAttempt.data?.id);
    publisherWrite = writeAllowed ? "allowed" : "blocked";

    if (writeAllowed && cleanup) {
      const deleteAttempt = await client.from("publishers").delete().eq("id", writeAttempt.data.id);
      if (!deleteAttempt.error) {
        cleanupRows += 1;
      }
    }

    if (publisherWrite !== boundaryCheck.expectedPublisherWrite) {
      throw new Error(
        `${user.primaryRole} publisher write expectation failed. expected=${boundaryCheck.expectedPublisherWrite}, actual=${publisherWrite}`
      );
    }
  }

  await client.auth.signOut();

  return {
    role: user.primaryRole,
    email: user.email,
    profileRead: profileReadOk,
    assignedRoles,
    publisherWrite,
    cleanupRows
  };
}

export async function runProductionManualLoginUat({
  createSupabaseClient = createClient,
  fetchImplementation = fetch,
  plan,
  traceId = `pgos-prod-login-${Date.now()}`
}) {
  const routeResults = [];
  for (const path of plan.routeChecks) {
    routeResults.push(await fetchRoute(fetchImplementation, plan.url, path));
  }

  const failedRoutes = routeResults.filter((route) => !route.ok || !route.hasReactRoot);
  if (failedRoutes.length > 0) {
    throw new Error(`Production route preflight failed for ${failedRoutes.map((route) => route.path).join(", ")}`);
  }

  const boundaryChecksByRole = new Map(plan.boundaryChecks.map((check) => [check.role, check]));
  const sessionResults = [];

  for (const user of plan.users) {
    const client = createSupabaseClient(plan.supabaseUrl, plan.anonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    sessionResults.push(
      await runRoleSessionCheck({
        client,
        user,
        traceId,
        boundaryCheck: boundaryChecksByRole.get(user.primaryRole)
      })
    );
  }

  return {
    traceId,
    routeResults,
    sessionResults,
    cleanupRows: sessionResults.reduce((total, result) => total + result.cleanupRows, 0)
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
  const packageFailures = validatePackageScripts(readJson(root, "package.json"));

  if (packageFailures.length > 0) {
    printFailures("Production manual login UAT config validation failed:", packageFailures);
    process.exit(1);
  }

  console.log("Production manual login UAT config validation passed.");

  const env = loadEnvFiles(root);
  const plan = buildProductionManualLoginPlan(env, args);
  const planFailures = validateProductionManualLoginPlan(plan, { live: !args.configOnly });

  if (planFailures.length > 0) {
    printFailures("Production manual login UAT plan validation failed:", planFailures);
    process.exit(1);
  }

  if (args.configOnly) {
    const output = describeProductionManualLoginPlan(plan);
    console.log(`Manual login roles: ${output.users.map((user) => user.role).join(", ")}`);
    console.log(`Boundary checks: ${output.boundaryChecks.map((check) => `${check.role}:${check.expectedPublisherWrite}`).join(", ")}`);
    console.log("Config-only mode completed.");
    return;
  }

  const result = await runProductionManualLoginUat({
    plan
  });

  console.log("Production manual login UAT preflight completed.");
  console.log(`- Trace: ${result.traceId}`);
  for (const route of result.routeResults) {
    console.log(`  - route ${route.path}: status=${route.status}, reactRoot=${route.hasReactRoot}`);
  }
  for (const session of result.sessionResults) {
    console.log(
      `  - ${session.role}: profile=${session.profileRead}, roles=${session.assignedRoles.join("|")}, publisher_write=${session.publisherWrite}`
    );
  }
  console.log(`- Cleanup rows: ${result.cleanupRows}`);
  console.log("Manual browser sign-off remains required for visual login UX.");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
