import { fileURLToPath } from "node:url";
import {
  formatFailures,
  normalizeHost,
  normalizeRef,
  parseDate,
  projectRefPattern
} from "./baselineSafety.mjs";

const requiredConfirmationKeys = [
  "PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY",
  "PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT",
  "PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY"
];

const sandboxConfirmationKeys = [
  "PG_OS_MIGRATION_SANDBOX_NO_PRODUCTION_TRAFFIC",
  "PG_OS_MIGRATION_SANDBOX_NO_SENSITIVE_DATA",
  "PG_OS_MIGRATION_SANDBOX_RESET_ALLOWED"
];

function databaseHost(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:"
      ? parsed.hostname.toLowerCase().replace(/\.$/, "")
      : null;
  } catch {
    return null;
  }
}

export function validateBaselineEnvironment(environment, options = {}) {
  const failures = [];
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const requireSandboxWrite = options.requireSandboxWrite ?? false;
  const requireSandbox = options.requireSandbox ?? true;
  const acceptAnySandboxWriteFlag = options.acceptAnySandboxWriteFlag ?? false;
  const value = (key) => (typeof environment[key] === "string" ? environment[key].trim() : "");

  // ---- Staging source identity (always read-only) ----
  const stagingRef = normalizeRef(environment.SUPABASE_STAGING_PROJECT_REF);
  const stagingHost = normalizeHost(environment.SUPABASE_STAGING_DB_HOST);
  const stagingUrl = value("SUPABASE_STAGING_DB_URL");

  if (!projectRefPattern.test(stagingRef)) {
    failures.push("SUPABASE_STAGING_PROJECT_REF must be a 20-character Supabase project ref.");
  }
  if (!stagingHost) {
    failures.push("SUPABASE_STAGING_DB_HOST is required for the staging source.");
  }
  if (!stagingUrl) {
    failures.push("SUPABASE_STAGING_DB_URL is required for the staging source.");
  } else {
    const urlHost = databaseHost(stagingUrl);
    if (!urlHost) {
      failures.push("SUPABASE_STAGING_DB_URL must be a valid PostgreSQL connection URL.");
    } else if (stagingHost && urlHost !== stagingHost) {
      failures.push("SUPABASE_STAGING_DB_URL hostname does not match SUPABASE_STAGING_DB_HOST.");
    }
  }
  if (value("PG_OS_DATABASE_ENV") !== "staging") {
    failures.push("PG_OS_DATABASE_ENV must equal staging.");
  }
  if (value("PG_OS_ENABLE_MIGRATION_WRITE") !== "false") {
    failures.push("Staging source writes are forbidden: PG_OS_ENABLE_MIGRATION_WRITE must equal false.");
  }

  // ---- No-production-project contract ----
  if (value("PG_OS_NO_PRODUCTION_PROJECT") !== "true") {
    failures.push("PG_OS_NO_PRODUCTION_PROJECT must equal true for baseline work.");
  }
  for (const key of requiredConfirmationKeys) {
    if (!value(key)) failures.push(`${key} is required.`);
  }
  if (environment.SUPABASE_PRODUCTION_PROJECT_REF?.trim()) {
    failures.push("SUPABASE_PRODUCTION_PROJECT_REF must be empty: a fake production project is forbidden.");
  }
  if (environment.SUPABASE_PRODUCTION_DB_HOST?.trim()) {
    failures.push("SUPABASE_PRODUCTION_DB_HOST must be empty: a fake production host is forbidden.");
  }

  const confirmedAt = parseDate(value("PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT"));
  const reviewBy = parseDate(value("PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY"));
  if (value("PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT") && confirmedAt === null) {
    failures.push("PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT must be a valid ISO date.");
  }
  if (value("PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY") && reviewBy === null) {
    failures.push("PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY must be a valid ISO date.");
  }
  if (confirmedAt !== null && confirmedAt > now.getTime()) {
    failures.push("No-production-project confirmation date cannot be in the future.");
  }
  if (reviewBy !== null && reviewBy <= now.getTime()) {
    failures.push("No-production-project confirmation review date has expired.");
  }
  if (confirmedAt !== null && reviewBy !== null && reviewBy <= confirmedAt) {
    failures.push("No-production-project review date must be after the confirmation date.");
  }

  // ---- Migration sandbox identity ----
  if (requireSandbox) {
    const sandboxRef = normalizeRef(environment.SUPABASE_SANDBOX_PROJECT_REF);
    const sandboxHost = normalizeHost(environment.SUPABASE_SANDBOX_DB_HOST);

    if (!sandboxRef) {
      failures.push("Migration sandbox project is not configured; the second project purpose is unconfirmed.");
    } else if (!projectRefPattern.test(sandboxRef)) {
      failures.push("SUPABASE_SANDBOX_PROJECT_REF must be a 20-character Supabase project ref.");
    }
    if (!sandboxHost) {
      failures.push("SUPABASE_SANDBOX_DB_HOST is required for the migration sandbox.");
    }
    if (sandboxRef && stagingRef && sandboxRef === stagingRef) {
      failures.push("Migration sandbox Project Ref must differ from the staging source Project Ref.");
    }
    if (sandboxHost && stagingHost && sandboxHost === stagingHost) {
      failures.push("Migration sandbox Database Host must differ from the staging source Database Host.");
    }
    if (value("PG_OS_MIGRATION_SANDBOX_MARKER") !== "migration_sandbox") {
      failures.push("PG_OS_MIGRATION_SANDBOX_MARKER must equal migration_sandbox.");
    }
    for (const key of sandboxConfirmationKeys) {
      if (value(key) !== "true") failures.push(`${key} must equal true.`);
    }
    if (!acceptAnySandboxWriteFlag) {
      if (requireSandboxWrite) {
        if (value("PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE") !== "true") {
          failures.push("PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE must equal true for explicit sandbox write approval.");
        }
      } else if (value("PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE") !== "false") {
        failures.push("PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE must equal false by default.");
      }
    }
  }

  return [...new Set(failures)];
}

function main() {
  const failures = validateBaselineEnvironment(process.env, { acceptAnySandboxWriteFlag: true });
  if (failures.length > 0) {
    console.error(formatFailures("Baseline environment safety check failed:", failures));
    process.exit(1);
  }
  const sandboxWrite = (process.env.PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE ?? "").trim() === "true";
  console.log("Baseline environment safety check passed.");
  console.log("source_writes: DISABLED");
  console.log(`sandbox_writes: ${sandboxWrite ? "ENABLED" : "DISABLED"}`);
  console.log("Project refs, hosts, URLs, passwords, and tokens were not logged.");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
