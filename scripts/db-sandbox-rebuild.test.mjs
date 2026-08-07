import { describe, expect, it } from "vitest";
import { computeBaselineHash, defaultExecuteBatch, executeSandboxRebuild, planBatches, sandboxRebuildGate } from "./db-sandbox-rebuild.mjs";

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
  PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "false",
  SUPABASE_ACCESS_TOKEN: "test-token"
};

const project = {
  id: "bbbbbbbbbbbbbbbbbbbb",
  database: { host: "db.bbbbbbbbbbbbbbbbbbbb.supabase.co" },
  status: "ACTIVE_HEALTHY"
};

const files = {
  "10_public_schema.sql": `
create table public.publishers (id uuid primary key, name text not null);
alter table public.publishers enable row level security;
create policy "publishers_read" on public.publishers for select to authenticated using (true);
`
};

describe("sandboxRebuildGate", () => {
  it("blocks apply mode when sandbox writes are not explicitly approved", () => {
    const failures = sandboxRebuildGate(environment, { project, requireWrite: true, now: new Date("2026-08-06T00:00:00Z") });
    expect(failures.some((failure) => failure.includes("must equal true for explicit sandbox write approval"))).toBe(true);
  });

  it("accepts an active, verified sandbox with explicit write approval", () => {
    const env = { ...environment, PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true" };
    const failures = sandboxRebuildGate(env, { project, requireWrite: true, now: new Date("2026-08-06T00:00:00Z") });
    expect(failures).toEqual([]);
  });

  it("fails when the verified project identity is the staging source", () => {
    const env = { ...environment, PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true" };
    const failures = sandboxRebuildGate(env, {
      project: { id: "aaaaaaaaaaaaaaaaaaaa", database: { host: "db.aaaaaaaaaaaaaaaaaaaa.supabase.co" }, status: "ACTIVE_HEALTHY" },
      requireWrite: true,
      now: new Date("2026-08-06T00:00:00Z")
    });
    expect(failures.length).toBeGreaterThan(0);
  });

  it("fails when the sandbox project is inactive", () => {
    const env = { ...environment, PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true" };
    const failures = sandboxRebuildGate(env, {
      project: { ...project, status: "INACTIVE" },
      requireWrite: true,
      now: new Date("2026-08-06T00:00:00Z")
    });
    expect(failures.some((failure) => failure.includes("not active"))).toBe(true);
  });

  it("passes read-only checks even when the sandbox write flag is enabled", () => {
    const env = { ...environment, PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true" };
    const failures = sandboxRebuildGate(env, {
      project,
      requireWrite: false,
      acceptAnySandboxWriteFlag: true,
      now: new Date("2026-08-06T00:00:00Z")
    });
    expect(failures).toEqual([]);
  });
});

describe("planBatches", () => {
  it("splits statements into bounded batches", () => {
    const batches = planBatches({ "a.sql": "select 1; select 2; select 3;" }, 2);
    expect(batches.length).toBe(2);
    expect(batches[0].statements).toEqual(["select 1", "select 2"]);
    expect(batches[1].statements).toEqual(["select 3"]);
  });
});

describe("computeBaselineHash", () => {
  it("is deterministic for identical file sets", () => {
    const files = { "a.sql": "select 1;", "b.sql": "select 2;" };
    expect(computeBaselineHash(files)).toBe(computeBaselineHash({ ...files }));
  });

  it("changes when baseline content changes", () => {
    const before = computeBaselineHash({ "a.sql": "select 1;" });
    const after = computeBaselineHash({ "a.sql": "select 2;" });
    expect(before).not.toBe(after);
  });
});

describe("executeSandboxRebuild", () => {
  it("marks the overall result FAILED and never success when a batch fails", async () => {
    const env = { ...environment, PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true" };
    let call = 0;
    const result = await executeSandboxRebuild({
      environment: env,
      files,
      project,
      options: { apply: true, maxStatementsPerBatch: 1, now: new Date("2026-08-06T00:00:00Z") },
      executeBatchImpl: async () => {
        call += 1;
        return call === 2 ? { status: "failed", error: "syntax error" } : { status: "ok", error: null };
      }
    });
    expect(result.overall).toBe("FAILED");
    expect(result.batches.some((batch) => batch.status === "failed")).toBe(true);
    expect(result.staging_source_write).toBe(false);
  });

  it("reports SUCCESS only when every batch succeeds", async () => {
    const env = { ...environment, PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true" };
    const result = await executeSandboxRebuild({
      environment: env,
      files,
      project,
      options: { apply: true, reset: true, now: new Date("2026-08-06T00:00:00Z") },
      executeBatchImpl: async () => ({ status: "ok", error: null })
    });
    expect(result.overall).toBe("SUCCESS");
    expect(result.reset).toBe(true);
    expect(result.staging_source_write).toBe(false);
    expect(result.baseline_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("returns BLOCKED without executing anything when the gate fails", async () => {
    let executed = false;
    const result = await executeSandboxRebuild({
      environment,
      files,
      project,
      options: { apply: true, now: new Date("2026-08-06T00:00:00Z") },
      executeBatchImpl: async () => {
        executed = true;
        return { status: "ok", error: null };
      }
    });
    expect(result.overall).toBe("BLOCKED");
    expect(executed).toBe(false);
  });

  it("never executes batches without explicit --apply approval", async () => {
    let executed = false;
    const env = { ...environment, PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true" };
    const result = await executeSandboxRebuild({
      environment: env,
      files,
      project,
      options: { apply: false, now: new Date("2026-08-06T00:00:00Z") },
      executeBatchImpl: async () => {
        executed = true;
        return { status: "ok", error: null };
      }
    });
    expect(result.overall).toBe("BLOCKED");
    expect(result.gate.some((failure) => failure.includes("--apply"))).toBe(true);
    expect(executed).toBe(false);
  });
});

describe("defaultExecuteBatch", () => {
  it("retries transient 5xx failures and succeeds", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      if (calls < 3) return { ok: false, status: 503, json: async () => ({ message: "upstream connect error" }) };
      return { ok: true, status: 200, json: async () => ({}) };
    };
    const result = await defaultExecuteBatch("token", "bbbbbbbbbbbbbbbbbbbb", "https://api.supabase.com/v1/projects", "select 1", {
      fetchImpl,
      maxRetries: 3,
      retryDelayMs: 1
    });
    expect(result.status).toBe("ok");
    expect(calls).toBe(3);
  });

  it("fails fast on SQL-level 400 errors without retrying", async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls += 1;
      return { ok: false, status: 400, json: async () => ({ message: "syntax error" }) };
    };
    const result = await defaultExecuteBatch("token", "bbbbbbbbbbbbbbbbbbbb", "https://api.supabase.com/v1/projects", "bad sql", {
      fetchImpl,
      maxRetries: 3,
      retryDelayMs: 1
    });
    expect(result.status).toBe("failed");
    expect(result.error).toContain("syntax error");
    expect(calls).toBe(1);
  });
});
