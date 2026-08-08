import { describe, expect, it } from "vitest";
import {
  gateBApproval,
  gateBRepairArguments,
  gateBWriteScope,
  validateGateBInvocation
} from "./cx0194GateB.mjs";

const manifest = { canonical_baseline: { version: "20260807120000" } };
const environment = {
  SUPABASE_STAGING_PROJECT_REF: "stagingref",
  SUPABASE_STAGING_DB_URL: "postgresql://postgres.stagingref:secret@db.stagingref.supabase.co:5432/postgres",
  SUPABASE_STAGING_DB_PASSWORD: "secret",
  SUPABASE_STAGING_DB_HOST: "db.stagingref.supabase.co",
  SUPABASE_ACCESS_TOKEN: "token",
  PG_OS_DATABASE_ENV: "staging",
  PG_OS_NO_PRODUCTION_PROJECT: "true",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY: "repository_owner",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT: "2026-08-01T00:00:00.000Z",
  PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY: "2026-08-15T00:00:00.000Z",
  SUPABASE_PRODUCTION_PROJECT_REF: "",
  SUPABASE_PRODUCTION_DB_HOST: "",
  PG_OS_ENABLE_MIGRATION_WRITE: "true",
  PG_OS_MIGRATION_WRITE_SCOPE: gateBWriteScope
};

describe("CX-0194 Gate B", () => {
  it("requires apply, exact task approval, and exact write scope", () => {
    expect(validateGateBInvocation({
      environment,
      argv: ["--apply", `--approved-task=${gateBApproval}`],
      manifest
    })).toEqual([]);
    expect(validateGateBInvocation({ environment, argv: [], manifest }))
      .toEqual(expect.arrayContaining([
        "CX-0194 Gate B requires --apply.",
        `CX-0194 Gate B requires --approved-task=${gateBApproval}.`
      ]));
    expect(validateGateBInvocation({
      environment: { ...environment, PG_OS_MIGRATION_WRITE_SCOPE: "OTHER" },
      argv: ["--apply", `--approved-task=${gateBApproval}`],
      manifest
    })).toContain("Migration writes are forbidden while no-production-project mode is active.");
  });

  it("builds a single fixed canonical history repair command", () => {
    expect(gateBRepairArguments({
      temporaryRoot: "C:/temp/pgos-cx0194-gate-b",
      databaseUrl: "postgresql://redacted",
      manifest
    })).toEqual([
      "migration", "repair", "20260807120000", "--status", "applied", "--yes",
      "--workdir", "C:/temp/pgos-cx0194-gate-b", "--db-url", "postgresql://redacted"
    ]);
  });
});
