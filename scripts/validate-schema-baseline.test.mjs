import { describe, expect, it } from "vitest";
import { splitTopLevelStatements } from "./baselineSafety.mjs";
import { validateSchemaBaseline } from "./validate-schema-baseline.mjs";

const clean = {
  "10_public_schema.sql": `
create table public.publishers (
  id uuid primary key,
  name text not null
);
alter table public.publishers enable row level security;
create policy "publishers_read" on public.publishers for select to authenticated using (true);
create or replace function public.touch_publisher() returns trigger language plpgsql as $fn$
begin
  insert into public.publishers_audit (publisher_id) values (new.id);
  return new;
end;
$fn$;
`
};

describe("validateSchemaBaseline", () => {
  it("passes a clean schema-only baseline including DML inside function bodies", () => {
    const result = validateSchemaBaseline(clean);
    expect(result.failures).toEqual([]);
  });

  it("fails when a secret-like JWT is present", () => {
    const files = { "10_public_schema.sql": clean["10_public_schema.sql"] + "\nselect 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.fakesignature';\n" };
    const result = validateSchemaBaseline(files);
    expect(result.failures.some((failure) => failure.includes("secret-like"))).toBe(true);
  });

  it("fails on top-level data DML but not DML inside a function body", () => {
    const withDml = { "seed.sql": "insert into public.publishers (id, name) values ('00000000-0000-0000-0000-000000000000', 'real');\n" };
    expect(validateSchemaBaseline(withDml).failures.some((failure) => failure.includes("data DML"))).toBe(true);
    expect(validateSchemaBaseline(clean).failures.some((failure) => failure.includes("data DML"))).toBe(false);
  });

  it("fails on dangerous DDL and TRUNCATE", () => {
    const dangerous = {
      "bad.sql": "drop schema public cascade;\ntruncate table public.publishers;\ndrop table public.publishers;"
    };
    const failures = validateSchemaBaseline(dangerous).failures;
    expect(failures.some((failure) => failure.includes("dangerous DDL"))).toBe(true);
  });

  it("fails on migration history repair references", () => {
    const files = { "bad.sql": "insert into supabase_migrations.schema_migrations (version) values ('001');" };
    const failures = validateSchemaBaseline(files).failures;
    expect(failures.some((failure) => failure.includes("migration-history repair"))).toBe(true);
  });

  it("does not flag a business table named pgos_schema_migrations", () => {
    const files = {
      "10_public_schema.sql": "create table public.pgos_schema_migrations (version varchar(16) primary key);"
    };
    const result = validateSchemaBaseline(files);
    expect(result.failures.some((failure) => failure.includes("migration-history repair"))).toBe(false);
  });

  it("fails on source connection information", () => {
    const files = { "bad.sql": "select 'db.aaaaaaaaaaaaaaaaaaaa.supabase.co';" };
    const failures = validateSchemaBaseline(files).failures;
    expect(failures.some((failure) => failure.includes("connection information"))).toBe(true);
  });

  it("reports non-portable owners and environment-specific grants for review", () => {
    const files = {
      "10_public_schema.sql": clean["10_public_schema.sql"] + "\nalter table public.publishers owner to postgres;\ngrant all on table public.publishers to postgres;"
    };
    const result = validateSchemaBaseline(files);
    expect(result.failures).toEqual([]);
    expect(result.review.some((item) => item.includes("OWNER"))).toBe(true);
    expect(result.review.some((item) => item.includes("GRANT"))).toBe(true);
  });

  it("fails when no files are provided", () => {
    const result = validateSchemaBaseline({});
    expect(result.failures.length).toBeGreaterThan(0);
  });
});

describe("splitTopLevelStatements with tagged dollar quotes", () => {
  it("keeps a $function$ body with internal semicolons as one statement", () => {
    const sql = `
create or replace function public.touch_publisher() returns trigger language plpgsql as $function$
begin
  insert into public.publishers_audit (publisher_id) values (new.id);
  update public.publishers set updated_at = now() where id = new.id;
  return new;
end;
$function$;
create table public.after_fn (id integer);
`;
    const statements = splitTopLevelStatements(sql);
    expect(statements.length).toBe(2);
    expect(statements[0]).toContain("create or replace function public.touch_publisher()");
    expect(statements[0]).toContain("$function$");
    expect(statements[1]).toContain("create table public.after_fn");
  });

  it("handles nested different dollar-quote tags", () => {
    const sql = `create function public.f() returns text language sql as $outer$
  select $inner$hello$inner$::text;
$outer$;`;
    const statements = splitTopLevelStatements(sql);
    expect(statements.length).toBe(1);
    expect(statements[0]).toContain("$inner$hello$inner$");
  });
});
