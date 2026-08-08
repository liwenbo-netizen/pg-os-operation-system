import { describe, expect, it } from "vitest";
import {
  cleanupSandboxCompatibilityHistory,
  legacyHistoryDeleteSql
} from "./cleanup-sandbox-compatibility-history.mjs";
import { legacyLedgerVersions } from "./migrationHistoryCompatibility.mjs";

const environment = {
  SUPABASE_STAGING_PROJECT_REF: "aaaaaaaaaaaaaaaaaaaa",
  SUPABASE_STAGING_DB_URL: "postgresql://postgres.aaaaaaaaaaaaaaaaaaaa:pw@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  SUPABASE_STAGING_DB_HOST: "aws-0-ap-southeast-1.pooler.supabase.com",
  PG_OS_DATABASE_ENV: "staging",
  PG_OS_ENABLE_MIGRATION_WRITE: "false",
  PG_OS_NO_PRODUCTION_PROJECT: "true",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY: "owner",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT: "2026-08-01T00:00:00Z",
  PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY: "2026-12-31T00:00:00Z",
  SUPABASE_PRODUCTION_PROJECT_REF: "",
  SUPABASE_PRODUCTION_DB_HOST: "",
  SUPABASE_SANDBOX_PROJECT_REF: "bbbbbbbbbbbbbbbbbbbb",
  SUPABASE_SANDBOX_DB_HOST: "db.bbbbbbbbbbbbbbbbbbbb.supabase.co",
  PG_OS_MIGRATION_SANDBOX_MARKER: "migration_sandbox",
  PG_OS_MIGRATION_SANDBOX_NO_PRODUCTION_TRAFFIC: "true",
  PG_OS_MIGRATION_SANDBOX_NO_SENSITIVE_DATA: "true",
  PG_OS_MIGRATION_SANDBOX_RESET_ALLOWED: "true",
  PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true",
  SUPABASE_ACCESS_TOKEN: "test-token"
};

const project = {
  id: "bbbbbbbbbbbbbbbbbbbb",
  database: { host: "db.bbbbbbbbbbbbbbbbbbbb.supabase.co" },
  status: "ACTIVE_HEALTHY"
};

const manifest = { canonical_baseline: { version: "20260807120000" } };

describe("sandbox compatibility history cleanup", () => {
  it("requires explicit apply approval", async () => {
    const result = await cleanupSandboxCompatibilityHistory({ environment, project, manifest });
    expect(result.overall).toBe("BLOCKED");
    expect(result.staging_source_write).toBe(false);
  });

  it("deletes only the exact 000-065 marker range and preserves canonical history", async () => {
    let executedSql = "";
    const result = await cleanupSandboxCompatibilityHistory({
      environment,
      project,
      manifest,
      apply: true,
      now: new Date("2026-08-08T00:00:00Z"),
      executeBatchImpl: async (_token, _projectRef, _baseUrl, sql) => {
        executedSql = sql;
        return { status: "ok" };
      },
      readHistoryImpl: async () => ["20260807120000"]
    });
    expect(result.overall).toBe("SUCCESS");
    expect(result.deleted_versions).toEqual(legacyLedgerVersions());
    expect(executedSql).toBe(legacyHistoryDeleteSql());
    expect(executedSql).toContain("'000'");
    expect(executedSql).toContain("'065'");
    expect(executedSql).not.toContain("20260807120000");
  });

  it("fails when cleanup leaves unexpected history", async () => {
    const result = await cleanupSandboxCompatibilityHistory({
      environment,
      project,
      manifest,
      apply: true,
      now: new Date("2026-08-08T00:00:00Z"),
      executeBatchImpl: async () => ({ status: "ok" }),
      readHistoryImpl: async () => ["065", "20260807120000"]
    });
    expect(result.overall).toBe("FAILED");
    expect(result.error).toContain("mismatch");
  });
});
