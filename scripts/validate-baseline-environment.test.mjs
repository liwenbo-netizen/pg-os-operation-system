import { describe, expect, it } from "vitest";
import { validateBaselineEnvironment } from "./validate-baseline-environment.mjs";

const base = {
  SUPABASE_STAGING_PROJECT_REF: "aaaaaaaaaaaaaaaaaaaa",
  SUPABASE_STAGING_DB_URL: "postgresql://postgres.aaaaaaaaaaaaaaaaaaaa:secret@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres",
  SUPABASE_STAGING_DB_HOST: "aws-0-ap-southeast-1.pooler.supabase.com",
  SUPABASE_STAGING_DB_PASSWORD: "secret",
  PG_OS_DATABASE_ENV: "staging",
  PG_OS_ENABLE_MIGRATION_WRITE: "false",
  PG_OS_NO_PRODUCTION_PROJECT: "true",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_BY: "owner",
  PG_OS_NO_PRODUCTION_PROJECT_CONFIRMED_AT: "2026-08-01T00:00:00Z",
  PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY: "2026-12-31T00:00:00Z",
  SUPABASE_PRODUCTION_PROJECT_REF: "",
  SUPABASE_PRODUCTION_DB_HOST: "",
  SUPABASE_SANDBOX_PROJECT_REF: "bbbbbbbbbbbbbbbbbbbb",
  SUPABASE_SANDBOX_DB_HOST: "aws-0-ap-northeast-1.pooler.supabase.com",
  PG_OS_MIGRATION_SANDBOX_MARKER: "migration_sandbox",
  PG_OS_MIGRATION_SANDBOX_NO_PRODUCTION_TRAFFIC: "true",
  PG_OS_MIGRATION_SANDBOX_NO_SENSITIVE_DATA: "true",
  PG_OS_MIGRATION_SANDBOX_RESET_ALLOWED: "true",
  PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "false"
};

const now = new Date("2026-08-06T00:00:00Z");

describe("validateBaselineEnvironment", () => {
  it("accepts a fully configured read-only environment", () => {
    expect(validateBaselineEnvironment(base, { now })).toEqual([]);
  });

  it("accepts explicit sandbox write approval only when requested", () => {
    const write = { ...base, PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true" };
    expect(validateBaselineEnvironment(write, { now })).not.toEqual([]);
    expect(validateBaselineEnvironment(write, { now, requireSandboxWrite: true })).toEqual([]);
  });

  it("fails when source and sandbox Project Refs are identical", () => {
    const env = { ...base, SUPABASE_SANDBOX_PROJECT_REF: base.SUPABASE_STAGING_PROJECT_REF };
    const failures = validateBaselineEnvironment(env, { now });
    expect(failures.some((failure) => failure.includes("Project Ref must differ"))).toBe(true);
  });

  it("fails when source and sandbox Database Hosts are identical", () => {
    const env = { ...base, SUPABASE_SANDBOX_DB_HOST: base.SUPABASE_STAGING_DB_HOST };
    const failures = validateBaselineEnvironment(env, { now });
    expect(failures.some((failure) => failure.includes("Database Host must differ"))).toBe(true);
  });

  it("always rejects source writes", () => {
    const env = { ...base, PG_OS_ENABLE_MIGRATION_WRITE: "true" };
    const failures = validateBaselineEnvironment(env, { now });
    expect(failures.some((failure) => failure.includes("Staging source writes are forbidden"))).toBe(true);
  });

  it("keeps sandbox writes disabled by default", () => {
    const env = { ...base, PG_OS_ENABLE_MIGRATION_SANDBOX_WRITE: "true" };
    const failures = validateBaselineEnvironment(env, { now });
    expect(failures.some((failure) => failure.includes("must equal false by default"))).toBe(true);
  });

  it("fails when the review date has expired", () => {
    const env = {
      ...base,
      PG_OS_NO_PRODUCTION_PROJECT_REVIEW_BY: "2026-08-01T00:00:00Z"
    };
    const failures = validateBaselineEnvironment(env, { now });
    expect(failures.some((failure) => failure.includes("review date has expired"))).toBe(true);
  });

  it("fails when the second project purpose is unconfirmed", () => {
    const env = {
      ...base,
      SUPABASE_SANDBOX_PROJECT_REF: "",
      SUPABASE_SANDBOX_DB_HOST: "",
      PG_OS_MIGRATION_SANDBOX_MARKER: "",
      PG_OS_MIGRATION_SANDBOX_NO_PRODUCTION_TRAFFIC: "",
      PG_OS_MIGRATION_SANDBOX_NO_SENSITIVE_DATA: "",
      PG_OS_MIGRATION_SANDBOX_RESET_ALLOWED: ""
    };
    const failures = validateBaselineEnvironment(env, { now });
    expect(failures.some((failure) => failure.includes("purpose is unconfirmed"))).toBe(true);
  });

  it("fails when a fake production project is present", () => {
    const env = { ...base, SUPABASE_PRODUCTION_PROJECT_REF: "cccccccccccccccccccc" };
    const failures = validateBaselineEnvironment(env, { now });
    expect(failures.some((failure) => failure.includes("fake production project is forbidden"))).toBe(true);
  });
});
