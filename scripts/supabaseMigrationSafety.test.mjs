import { describe, expect, it } from "vitest";
import {
  approvedSupabaseCliVersion,
  formatFailures,
  migrationSafetyMode,
  migrationWriteStatus,
  validateMigrationEnvironment,
  validateSupabaseCliManifest
} from "./supabaseMigrationSafety.mjs";

const now = new Date("2026-08-02T00:00:00.000Z");
const sharedEnvironment = {
  SUPABASE_STAGING_PROJECT_REF: "stagingref",
  SUPABASE_STAGING_DB_URL: "postgresql://postgres.stagingref:secret@db.stagingref.supabase.co:5432/postgres",
  SUPABASE_STAGING_DB_PASSWORD: "secret",
  SUPABASE_STAGING_DB_HOST: "db.stagingref.supabase.co",
  PG_OS_DATABASE_ENV: "staging",
  SUPABASE_ACCESS_TOKEN: "token",
  PG_OS_ENABLE_MIGRATION_WRITE: "false"
};
const noProductionEnvironment = {
  ...sharedEnvironment,
  PG_OS_NO_PRODUCTION_PROJECT: "true",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY: "repository_owner",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT: "2026-08-01T00:00:00.000Z",
  PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY: "2026-08-15T00:00:00.000Z",
  SUPABASE_PRODUCTION_PROJECT_REF: "",
  SUPABASE_PRODUCTION_DB_HOST: ""
};
const productionDenylistEnvironment = {
  ...sharedEnvironment,
  PG_OS_NO_PRODUCTION_PROJECT: "false",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY: "",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT: "",
  PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY: "",
  SUPABASE_PRODUCTION_PROJECT_REF: "productionref",
  SUPABASE_PRODUCTION_DB_HOST: "db.productionref.supabase.co"
};

describe("Supabase migration safety", () => {
  it("requires an exact CLI version in the manifest and lockfile", () => {
    expect(validateSupabaseCliManifest(
      { devDependencies: { supabase: approvedSupabaseCliVersion } },
      { packages: { "node_modules/supabase": { version: approvedSupabaseCliVersion } } }
    )).toEqual([]);

    expect(validateSupabaseCliManifest(
      { devDependencies: { supabase: `^${approvedSupabaseCliVersion}` } },
      { packages: { "node_modules/supabase": { version: approvedSupabaseCliVersion } } }
    )).toContain(`package.json must pin supabase to exactly ${approvedSupabaseCliVersion}.`);
  });

  it("accepts a complete no-production-project declaration with writes disabled", () => {
    expect(migrationSafetyMode(noProductionEnvironment)).toBe("NO_PRODUCTION_PROJECT");
    expect(validateMigrationEnvironment(noProductionEnvironment, { now })).toEqual([]);
    expect(migrationWriteStatus(noProductionEnvironment)).toEqual({
      write_status: "DISABLED",
      reason: "MIGRATION_WRITE_NOT_APPROVED"
    });
  });

  it.each([
    ["confirmation owner", "PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY", "PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY is required in no-production-project mode."],
    ["confirmation date", "PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT", "PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT is required in no-production-project mode."],
    ["staging Project Ref", "SUPABASE_STAGING_PROJECT_REF", "SUPABASE_STAGING_PROJECT_REF is required."],
    ["staging Host", "SUPABASE_STAGING_DB_HOST", "SUPABASE_STAGING_DB_HOST is required."]
  ])("rejects a missing %s", (_label, key, message) => {
    expect(validateMigrationEnvironment({ ...noProductionEnvironment, [key]: "" }, { now }))
      .toContain(message);
  });

  it("rejects expired review metadata", () => {
    expect(validateMigrationEnvironment({
      ...noProductionEnvironment,
      PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY: "2026-08-01T00:00:00.000Z"
    }, { now })).toContain("No-production-project confirmation review date has expired.");
  });

  it("keeps no-production-project mode mutually exclusive with a production denylist", () => {
    expect(validateMigrationEnvironment({
      ...noProductionEnvironment,
      SUPABASE_PRODUCTION_PROJECT_REF: "productionref",
      SUPABASE_PRODUCTION_DB_HOST: "db.productionref.supabase.co"
    }, { now })).toContain(
      "Production Project Ref and Host must be empty in no-production-project mode."
    );
  });

  it("requires a complete production denylist when no-production-project mode is false", () => {
    expect(validateMigrationEnvironment({
      ...productionDenylistEnvironment,
      SUPABASE_PRODUCTION_PROJECT_REF: "",
      SUPABASE_PRODUCTION_DB_HOST: ""
    }, { now })).toEqual(expect.arrayContaining([
      "SUPABASE_PRODUCTION_PROJECT_REF is required in production-denylist mode.",
      "SUPABASE_PRODUCTION_DB_HOST is required in production-denylist mode."
    ]));
  });

  it("rejects production environment markers", () => {
    expect(validateMigrationEnvironment({
      ...noProductionEnvironment,
      PG_OS_DATABASE_ENV: "production"
    }, { now })).toContain("PG_OS_DATABASE_ENV must equal staging.");
  });

  it("rejects writes in no-production-project and read-only modes", () => {
    const writeEnabled = {
      ...noProductionEnvironment,
      PG_OS_ENABLE_MIGRATION_WRITE: "true"
    };
    expect(validateMigrationEnvironment(writeEnabled, { now, requireReadOnly: true }))
      .toEqual(expect.arrayContaining([
        "Migration writes are forbidden while no-production-project mode is active.",
        "PG_OS_ENABLE_MIGRATION_WRITE must equal false for read-only operations."
      ]));
  });

  it("does not allow no-production-project mode to bypass staging identity checks", () => {
    expect(validateMigrationEnvironment({
      ...noProductionEnvironment,
      SUPABASE_STAGING_DB_URL: "postgresql://postgres.otherref:secret@db.otherref.supabase.co:5432/postgres"
    }, { now })).toEqual(expect.arrayContaining([
      "Staging database URL identity does not match SUPABASE_STAGING_DB_HOST.",
      "Staging database identity does not match SUPABASE_STAGING_PROJECT_REF."
    ]));
  });

  it("requires an explicit mode", () => {
    expect(validateMigrationEnvironment({
      ...noProductionEnvironment,
      PG_OS_NO_PRODUCTION_PROJECT: ""
    }, { now })).toContain("PG_OS_NO_PRODUCTION_PROJECT must equal true or false.");
  });

  it("keeps failure output free of refs, tokens, passwords, and database URLs", () => {
    const failures = validateMigrationEnvironment({
      ...productionDenylistEnvironment,
      SUPABASE_STAGING_DB_PASSWORD: "",
      SUPABASE_ACCESS_TOKEN: "",
      SUPABASE_STAGING_PROJECT_REF: "productionref"
    }, { now });
    const output = formatFailures("failed", failures);

    expect(output).not.toContain(sharedEnvironment.SUPABASE_STAGING_DB_PASSWORD);
    expect(output).not.toContain(sharedEnvironment.SUPABASE_ACCESS_TOKEN);
    expect(output).not.toContain(sharedEnvironment.SUPABASE_STAGING_DB_URL);
    expect(output).not.toContain(productionDenylistEnvironment.SUPABASE_PRODUCTION_PROJECT_REF);
  });
});
