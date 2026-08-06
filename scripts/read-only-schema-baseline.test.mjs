import { describe, expect, it, vi } from "vitest";
import {
  assertReadOnlyQuery,
  buildSchemaBaseline,
  collectReadOnlySchemaBaseline,
  schemaBaselineSql
} from "./read-only-schema-baseline.mjs";

const environment = {
  SUPABASE_STAGING_PROJECT_REF: "stagingref",
  SUPABASE_STAGING_DB_URL: "postgresql://postgres.stagingref:secret@db.stagingref.supabase.co:5432/postgres",
  SUPABASE_STAGING_DB_PASSWORD: "secret",
  SUPABASE_STAGING_DB_HOST: "db.stagingref.supabase.co",
  PG_OS_DATABASE_ENV: "staging",
  PG_OS_NO_PRODUCTION_PROJECT: "true",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY: "repository_owner",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT: "2026-08-01T00:00:00.000Z",
  PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY: "2099-08-15T00:00:00.000Z",
  SUPABASE_PRODUCTION_PROJECT_REF: "",
  SUPABASE_PRODUCTION_DB_HOST: "",
  SUPABASE_ACCESS_TOKEN: "token",
  PG_OS_ENABLE_MIGRATION_WRITE: "false"
};
const remoteRow = {
  extensions: 5,
  tables: 2,
  columns: 9,
  views: 1,
  functions: 3,
  triggers: 4,
  constraints: 6,
  indexes: 7,
  row_level_security: 2,
  policies: 8,
  migration_versions: ["202606290001", "202606290002"]
};

describe("read-only schema baseline", () => {
  it("uses exactly one read-only SELECT", () => {
    expect(() => assertReadOnlyQuery(schemaBaselineSql)).not.toThrow();
    expect(() => assertReadOnlyQuery("update public.items set name = 'x'"))
      .toThrow("Schema baseline query must begin with SELECT.");
    expect(() => assertReadOnlyQuery("select 1; delete from public.items"))
      .toThrow("Schema baseline query contains a write-capable SQL keyword.");
  });

  it("builds a redacted count-only baseline and detects aligned migration history", () => {
    const baseline = buildSchemaBaseline({
      row: remoteRow,
      localVersions: ["202606290001", "202606290002"],
      capturedAt: "2026-08-02T00:00:00.000Z"
    });

    expect(baseline.schema_baseline).toMatchObject({
      write_enabled: false,
      project_identity_verified: true,
      remote_schema_objects: 10,
      tables: 2,
      columns: 9,
      schema_drift: "NOT_DETECTED_IN_MIGRATION_HISTORY",
      dashboard_only_changes_suspected: false
    });
    const output = JSON.stringify(baseline);
    expect(output).not.toContain(environment.SUPABASE_STAGING_PROJECT_REF);
    expect(output).not.toContain(environment.SUPABASE_STAGING_DB_HOST);
    expect(output).not.toContain(environment.SUPABASE_ACCESS_TOKEN);
    expect(output).not.toContain(environment.SUPABASE_STAGING_DB_PASSWORD);
    expect(output).not.toContain(environment.SUPABASE_STAGING_DB_URL);
  });

  it("reports migration history drift without guessing a repair", () => {
    const baseline = buildSchemaBaseline({
      row: remoteRow,
      localVersions: ["202606290001", "202607010001"],
      capturedAt: "2026-08-02T00:00:00.000Z"
    });

    expect(baseline.schema_baseline.migration_history).toMatchObject({
      aligned: false,
      local_only_versions: ["202607010001"],
      remote_only_versions: ["202606290002"]
    });
    expect(baseline.schema_baseline.baseline_reconstructability)
      .toBe("BLOCKED_MIGRATION_HISTORY_DRIFT");
  });

  it("rejects write-enabled configuration before making a network request", async () => {
    const fetchImpl = vi.fn();
    await expect(collectReadOnlySchemaBaseline({
      environment: { ...environment, PG_OS_ENABLE_MIGRATION_WRITE: "true" },
      fetchImpl
    })).rejects.toThrow("Migration writes are forbidden");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sanitizes remote failures", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403 });
    let message = "";
    try {
      await collectReadOnlySchemaBaseline({ environment, fetchImpl });
    } catch (error) {
      message = error.message;
    }

    expect(message).toBe("Read-only schema baseline endpoint returned HTTP 403.");
    expect(message).not.toContain(environment.SUPABASE_STAGING_PROJECT_REF);
    expect(message).not.toContain(environment.SUPABASE_ACCESS_TOKEN);
    expect(message).not.toContain(environment.SUPABASE_STAGING_DB_URL);
  });
});
