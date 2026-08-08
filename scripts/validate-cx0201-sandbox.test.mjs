import { describe, expect, it, vi } from "vitest";
import {
  collectCx0201SandboxProof,
  cx0201SandboxProofSql,
  validateCx0201SandboxProof,
  validateCx0201SandboxRollbackProof
} from "./validate-cx0201-sandbox.mjs";

const environment = {
  SUPABASE_ACCESS_TOKEN: "token",
  SUPABASE_STAGING_PROJECT_REF: "aaaaaaaaaaaaaaaaaaaa",
  SUPABASE_STAGING_DB_HOST: "db.aaaaaaaaaaaaaaaaaaaa.supabase.co",
  SUPABASE_STAGING_DB_URL: "postgresql://postgres.aaaaaaaaaaaaaaaaaaaa:pw@db.aaaaaaaaaaaaaaaaaaaa.supabase.co:5432/postgres",
  SUPABASE_STAGING_DB_PASSWORD: "pw",
  SUPABASE_PRODUCTION_PROJECT_REF: "",
  SUPABASE_PRODUCTION_DB_HOST: "",
  SUPABASE_SANDBOX_PROJECT_REF: "bbbbbbbbbbbbbbbbbbbb",
  SUPABASE_SANDBOX_DB_HOST: "db.bbbbbbbbbbbbbbbbbbbb.supabase.co",
  PG_OS_DATABASE_ENV: "staging",
  PG_OS_NO_PRODUCTION_PROJECT: "true",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY: "owner",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT: new Date().toISOString(),
  PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY: new Date(Date.now() + 86_400_000).toISOString(),
  PG_OS_ENABLE_MIGRATION_WRITE: "false",
  PG_OS_MIGRATION_SANDBOX_MARKER: "migration_sandbox",
  PG_OS_MIGRATION_SANDBOX_NO_PRODUCTION_TRAFFIC: "true",
  PG_OS_MIGRATION_SANDBOX_NO_SENSITIVE_DATA: "true",
  PG_OS_MIGRATION_SANDBOX_RESET_ALLOWED: "true",
  PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true"
};

const validProof = {
  workflow_instances_table: true,
  transition_executions_table: true,
  compatibility_view: true,
  stage_for_node_function: true,
  stage_node_valid_function: true,
  workflow_instances_rls: true,
  transition_executions_rls: true,
  authenticated_can_insert_instance: false,
  anon_can_insert_instance: false,
  mapped_opportunities: 2,
  mapped_instances: 2,
  non_mapped_instances: 0,
  history_versions: ["20260807120000", "20260809013000"]
};

describe("CX-0201 sandbox proof", () => {
  it("uses only a read-only SELECT and validates the expected persistence posture", () => {
    expect(cx0201SandboxProofSql.trimStart().toLowerCase().startsWith("select ")).toBe(true);
    expect(cx0201SandboxProofSql.split(";").filter((statement) => statement.trim())).toHaveLength(1);
    expect(validateCx0201SandboxProof(validProof)).toEqual([]);
  });

  it("fails closed on guessed backfill, write grants, or missing history", () => {
    expect(validateCx0201SandboxProof({
      ...validProof,
      authenticated_can_insert_instance: true,
      non_mapped_instances: 1,
      history_versions: ["20260807120000"]
    })).toEqual(expect.arrayContaining([
      "authenticated must not have direct INSERT on workflow_instances.",
      "Historical states outside ECOSYSTEM_MAPPED must not be guessed during backfill.",
      "Migration history is missing 20260809013000."
    ]));
  });

  it("proves the additive objects are absent after rollback", () => {
    expect(validateCx0201SandboxRollbackProof({
      ...validProof,
      workflow_instances_table: false,
      transition_executions_table: false,
      compatibility_view: false,
      stage_for_node_function: false,
      stage_node_valid_function: false
    })).toEqual([]);
    expect(validateCx0201SandboxRollbackProof(validProof)).toHaveLength(5);
  });

  it("verifies sandbox identity before querying the read-only endpoint", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: environment.SUPABASE_SANDBOX_PROJECT_REF,
          status: "ACTIVE_HEALTHY",
          database: { host: environment.SUPABASE_SANDBOX_DB_HOST }
        })
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ data: validProof }] });

    const result = await collectCx0201SandboxProof({ environment, fetchImpl });
    expect(result.failures).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[1][0]).toContain("bbbbbbbbbbbbbbbbbbbb/database/query/read-only");
  });

  it("verifies the configured non-production project before a remote proof", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: environment.SUPABASE_STAGING_PROJECT_REF, status: "ACTIVE_HEALTHY" })
      })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ data: validProof }] });

    const result = await collectCx0201SandboxProof({ environment, fetchImpl, target: "staging" });
    expect(result.target).toBe("VERIFIED_NO_PRODUCTION_PROJECT");
    expect(fetchImpl.mock.calls[1][0]).toContain("aaaaaaaaaaaaaaaaaaaa/database/query/read-only");
  });
});
