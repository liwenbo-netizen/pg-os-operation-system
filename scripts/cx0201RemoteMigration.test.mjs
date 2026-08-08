import { describe, expect, it } from "vitest";
import {
  canonicalMigrationVersion,
  cx0201Approval,
  cx0201MigrationFile,
  cx0201MigrationVersion,
  cx0201PushArguments,
  cx0201WriteScope,
  validateCx0201RemoteInvocation,
  validateCx0201RemotePostflight,
  validateCx0201RemotePreflight
} from "./cx0201RemoteMigration.mjs";
import { legacyLedgerVersions } from "./migrationHistoryCompatibility.mjs";

const baseEnvironment = {
  SUPABASE_STAGING_PROJECT_REF: "aaaaaaaaaaaaaaaaaaaa",
  SUPABASE_STAGING_DB_HOST: "db.aaaaaaaaaaaaaaaaaaaa.supabase.co",
  SUPABASE_STAGING_DB_URL: "postgresql://postgres.aaaaaaaaaaaaaaaaaaaa:pw@db.aaaaaaaaaaaaaaaaaaaa.supabase.co:5432/postgres",
  SUPABASE_STAGING_DB_PASSWORD: "pw",
  SUPABASE_ACCESS_TOKEN: "token",
  SUPABASE_PRODUCTION_PROJECT_REF: "",
  SUPABASE_PRODUCTION_DB_HOST: "",
  PG_OS_DATABASE_ENV: "staging",
  PG_OS_NO_PRODUCTION_PROJECT: "true",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY: "owner",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT: new Date().toISOString(),
  PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY: new Date(Date.now() + 86_400_000).toISOString(),
  PG_OS_ENABLE_MIGRATION_WRITE: "false"
};

function rows(cx0201Remote = "") {
  return [
    ...legacyLedgerVersions().map((version) => ({ local: version, remote: version })),
    { local: canonicalMigrationVersion, remote: canonicalMigrationVersion },
    { local: cx0201MigrationVersion, remote: cx0201Remote }
  ];
}

describe("CX-0201 remote migration gate", () => {
  it("allows a read-only dry-run without enabling writes", () => {
    expect(validateCx0201RemoteInvocation({ environment: baseEnvironment, argv: ["--dry-run"] })).toEqual([]);
  });

  it("requires the exact write scope and task approval for apply", () => {
    const environment = {
      ...baseEnvironment,
      PG_OS_ENABLE_MIGRATION_WRITE: "true",
      PG_OS_MIGRATION_WRITE_SCOPE: cx0201WriteScope
    };
    expect(validateCx0201RemoteInvocation({
      environment,
      argv: ["--apply", `--approved-task=${cx0201Approval}`]
    })).toEqual([]);
    expect(validateCx0201RemoteInvocation({ environment, argv: ["--apply"] }))
      .toContain(`CX-0201 apply requires --approved-task=${cx0201Approval}.`);
  });

  it("accepts only the single expected preflight plan", () => {
    expect(validateCx0201RemotePreflight({
      migrationRows: rows(),
      defaultPlan: [cx0201MigrationFile],
      includeAllPlan: [cx0201MigrationFile]
    })).toEqual([]);
    expect(validateCx0201RemotePreflight({
      migrationRows: rows(),
      defaultPlan: [cx0201MigrationFile, "unexpected.sql"],
      includeAllPlan: [cx0201MigrationFile]
    })).toContain(`default dry-run must plan only ${cx0201MigrationFile}.`);
  });

  it("requires complete alignment and an empty postflight plan", () => {
    expect(validateCx0201RemotePostflight({
      migrationRows: rows(cx0201MigrationVersion),
      defaultPlan: [],
      includeAllPlan: []
    })).toEqual([]);
    expect(validateCx0201RemotePostflight({
      migrationRows: rows(),
      defaultPlan: [cx0201MigrationFile],
      includeAllPlan: []
    })).toEqual(expect.arrayContaining([
      `Remote history is not aligned at ${cx0201MigrationVersion}.`,
      "Default dry-run must be empty after CX-0201 apply."
    ]));
  });

  it("builds a non-interactive push constrained to the temporary compatibility project", () => {
    expect(cx0201PushArguments({ temporaryRoot: "temp", databaseUrl: "postgres://db" }))
      .toEqual(["db", "push", "--yes", "--workdir", "temp", "--db-url", "postgres://db"]);
  });
});
