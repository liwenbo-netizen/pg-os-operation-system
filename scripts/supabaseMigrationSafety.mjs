import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export const approvedSupabaseCliVersion = "2.110.0";

export const migrationEnvironmentKeys = [
  "SUPABASE_STAGING_PROJECT_REF",
  "SUPABASE_STAGING_DB_URL",
  "SUPABASE_STAGING_DB_PASSWORD",
  "SUPABASE_STAGING_DB_HOST",
  "PG_OS_DATABASE_ENV",
  "PG_OS_NO_PRODUCTION_PROJECT",
  "PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY",
  "PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT",
  "PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY",
  "SUPABASE_PRODUCTION_PROJECT_REF",
  "SUPABASE_PRODUCTION_DB_HOST",
  "SUPABASE_ACCESS_TOKEN",
  "PG_OS_ENABLE_MIGRATION_WRITE",
  "PG_OS_MIGRATION_WRITE_SCOPE"
];

const alwaysRequiredKeys = [
  "SUPABASE_STAGING_PROJECT_REF",
  "SUPABASE_STAGING_DB_URL",
  "SUPABASE_STAGING_DB_PASSWORD",
  "SUPABASE_STAGING_DB_HOST",
  "PG_OS_DATABASE_ENV",
  "PG_OS_NO_PRODUCTION_PROJECT",
  "SUPABASE_ACCESS_TOKEN",
  "PG_OS_ENABLE_MIGRATION_WRITE"
];

const noProductionConfirmationKeys = [
  "PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY",
  "PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT",
  "PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY"
];

function normalized(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizedHost(value) {
  return normalized(value).toLowerCase().replace(/\.$/, "");
}

function databaseIdentity(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)) {
      return null;
    }

    return {
      host: normalizedHost(parsed.hostname),
      username: decodeURIComponent(parsed.username).toLowerCase()
    };
  } catch {
    return null;
  }
}

function validDate(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function migrationSafetyMode(environment) {
  const value = normalized(environment.PG_OS_NO_PRODUCTION_PROJECT);
  if (value === "true") return "NO_PRODUCTION_PROJECT";
  if (value === "false") return "PRODUCTION_DENYLIST";
  return "INVALID";
}

export function migrationWriteStatus(environment) {
  return normalized(environment.PG_OS_ENABLE_MIGRATION_WRITE) === "true"
    ? { write_status: "ENABLED", reason: "MIGRATION_WRITE_EXPLICITLY_ENABLED" }
    : { write_status: "DISABLED", reason: "MIGRATION_WRITE_NOT_APPROVED" };
}

export function validateSupabaseCliManifest(packageJson, packageLock) {
  const failures = [];
  const manifestVersion = packageJson.devDependencies?.supabase;
  const lockVersion = packageLock.packages?.["node_modules/supabase"]?.version;

  if (manifestVersion !== approvedSupabaseCliVersion) {
    failures.push(`package.json must pin supabase to exactly ${approvedSupabaseCliVersion}.`);
  }
  if (lockVersion !== approvedSupabaseCliVersion) {
    failures.push(`package-lock.json must lock supabase to ${approvedSupabaseCliVersion}.`);
  }

  return failures;
}

export function validateMigrationEnvironment(environment, options = {}) {
  const failures = [];
  const requireWrite = options.requireWrite ?? false;
  const requireReadOnly = options.requireReadOnly ?? false;
  const allowedNoProductionWriteScope = normalized(options.allowedNoProductionWriteScope);
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const values = Object.fromEntries(
    migrationEnvironmentKeys.map((key) => [key, normalized(environment[key])])
  );
  const mode = migrationSafetyMode(environment);

  for (const key of alwaysRequiredKeys) {
    if (!values[key]) failures.push(`${key} is required.`);
  }

  if (mode === "INVALID") {
    failures.push("PG_OS_NO_PRODUCTION_PROJECT must equal true or false.");
  }

  if (values.PG_OS_DATABASE_ENV && values.PG_OS_DATABASE_ENV !== "staging") {
    failures.push("PG_OS_DATABASE_ENV must equal staging.");
  }

  if (mode === "NO_PRODUCTION_PROJECT") {
    for (const key of noProductionConfirmationKeys) {
      if (!values[key]) failures.push(`${key} is required in no-production-project mode.`);
    }

    if (values.SUPABASE_PRODUCTION_PROJECT_REF || values.SUPABASE_PRODUCTION_DB_HOST) {
      failures.push("Production Project Ref and Host must be empty in no-production-project mode.");
    }

    const confirmedAt = validDate(values.PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT);
    const reviewBy = validDate(values.PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY);
    if (values.PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT && confirmedAt === null) {
      failures.push("PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT must be a valid ISO date.");
    }
    if (values.PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY && reviewBy === null) {
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
    const scopedNoProductionWrite = values.PG_OS_ENABLE_MIGRATION_WRITE === "true"
      && allowedNoProductionWriteScope
      && values.PG_OS_MIGRATION_WRITE_SCOPE === allowedNoProductionWriteScope;
    if (values.PG_OS_ENABLE_MIGRATION_WRITE === "true" && !scopedNoProductionWrite) {
      failures.push("Migration writes are forbidden while no-production-project mode is active.");
    }
  }

  if (mode === "PRODUCTION_DENYLIST") {
    if (!values.SUPABASE_PRODUCTION_PROJECT_REF) {
      failures.push("SUPABASE_PRODUCTION_PROJECT_REF is required in production-denylist mode.");
    }
    if (!values.SUPABASE_PRODUCTION_DB_HOST) {
      failures.push("SUPABASE_PRODUCTION_DB_HOST is required in production-denylist mode.");
    }
  }

  const stagingDatabase = values.SUPABASE_STAGING_DB_URL
    ? databaseIdentity(values.SUPABASE_STAGING_DB_URL)
    : null;
  if (values.SUPABASE_STAGING_DB_URL && !stagingDatabase) {
    failures.push("SUPABASE_STAGING_DB_URL must be a valid PostgreSQL connection URL.");
  }

  if (
    stagingDatabase?.host
    && values.SUPABASE_STAGING_DB_HOST
    && stagingDatabase.host !== normalizedHost(values.SUPABASE_STAGING_DB_HOST)
  ) {
    failures.push("Staging database URL identity does not match SUPABASE_STAGING_DB_HOST.");
  }

  if (
    values.SUPABASE_STAGING_PROJECT_REF
    && values.SUPABASE_PRODUCTION_PROJECT_REF
    && values.SUPABASE_STAGING_PROJECT_REF === values.SUPABASE_PRODUCTION_PROJECT_REF
  ) {
    failures.push("Staging Project Ref must differ from the production denylist Project Ref.");
  }

  if (
    values.SUPABASE_STAGING_DB_HOST
    && values.SUPABASE_PRODUCTION_DB_HOST
    && normalizedHost(values.SUPABASE_STAGING_DB_HOST)
      === normalizedHost(values.SUPABASE_PRODUCTION_DB_HOST)
  ) {
    failures.push("Staging database Host must differ from the production denylist Host.");
  }

  if (stagingDatabase && values.SUPABASE_STAGING_PROJECT_REF) {
    const projectRef = values.SUPABASE_STAGING_PROJECT_REF.toLowerCase();
    const identityMatches = stagingDatabase.host.includes(projectRef)
      || stagingDatabase.username.includes(projectRef);
    if (!identityMatches) {
      failures.push("Staging database identity does not match SUPABASE_STAGING_PROJECT_REF.");
    }
  }

  if (requireReadOnly && values.PG_OS_ENABLE_MIGRATION_WRITE !== "false") {
    failures.push("PG_OS_ENABLE_MIGRATION_WRITE must equal false for read-only operations.");
  }
  if (requireWrite && values.PG_OS_ENABLE_MIGRATION_WRITE !== "true") {
    failures.push("PG_OS_ENABLE_MIGRATION_WRITE must equal true for migration writes.");
  }

  return [...new Set(failures)];
}

export function loadSupabaseCliContract(root = process.cwd()) {
  const packagePath = resolve(root, "package.json");
  const lockPath = resolve(root, "package-lock.json");
  const configPath = resolve(root, "supabase", "config.toml");
  const failures = [];

  if (!existsSync(packagePath)) failures.push("package.json is missing.");
  if (!existsSync(lockPath)) failures.push("package-lock.json is missing.");
  if (!existsSync(configPath)) failures.push("supabase/config.toml is missing.");

  if (failures.length === 0) {
    failures.push(
      ...validateSupabaseCliManifest(
        JSON.parse(readFileSync(packagePath, "utf8")),
        JSON.parse(readFileSync(lockPath, "utf8"))
      )
    );
  }

  return { failures, configPath };
}

export function windowsCliOverride(root = process.cwd()) {
  if (process.platform !== "win32") return null;

  const goBinary = resolve(
    root,
    "node_modules",
    "@supabase",
    "cli-windows-x64",
    "bin",
    "supabase-go.exe"
  );
  return existsSync(goBinary) ? goBinary : null;
}

export function formatFailures(title, failures) {
  return [title, ...failures.map((failure) => `- ${failure}`)].join("\n");
}
