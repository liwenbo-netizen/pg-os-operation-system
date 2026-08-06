import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  classifyBaseline,
  generateSchemaBaseline,
  renderBaseline
} from "./generate-schema-baseline.mjs";

const sourceEnvironment = {
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
  SUPABASE_PRODUCTION_DB_HOST: ""
};

const snapshot = {
  captured_at: "2026-08-06T00:00:00Z",
  extensions: [{ name: "pgcrypto", schema: "extensions" }],
  enums: [{ name: "stage_enum", values: ["discovery", "won", "lost"] }],
  tables: [
    { name: "publishers", rls_enabled: true, force_rls: false, is_partition: false, partition_bound: null, partition_of: null }
  ],
  columns: [
    { table: "publishers", name: "id", type: "uuid", not_null: true, default: "gen_random_uuid()", identity: "", ordinal: 1 },
    { table: "publishers", name: "name", type: "text", not_null: true, default: null, identity: "", ordinal: 2 }
  ],
  constraints: [
    { table: "publishers", name: "publishers_pkey", type: "p", definition: "PRIMARY KEY (id)" }
  ],
  indexes: [
    { table: "publishers", name: "publishers_name_idx", definition: "CREATE INDEX publishers_name_idx ON public.publishers USING btree (name)" }
  ],
  policies: [
    { table: "publishers", name: "publishers_read", permissive: "PERMISSIVE", command: "SELECT", roles: ["authenticated"], using: "true", check: null }
  ],
  triggers: [
    { table: "publishers", name: "trg_touch", definition: "CREATE TRIGGER trg_touch AFTER INSERT ON public.publishers FOR EACH ROW EXECUTE FUNCTION public.touch_publisher()" }
  ],
  functions: [
    { name: "public.touch_publisher()", definition: "CREATE OR REPLACE FUNCTION public.touch_publisher() RETURNS trigger LANGUAGE plpgsql AS $function$\nbegin\n  return new;\nend;\n$function$" }
  ],
  views: [],
  sequences: [{ name: "publishers_id_seq", data_type: "bigint" }],
  table_grants: [
    { object: "publishers", kind: "r", role: "authenticated", privilege: "SELECT" }
  ],
  schema_grants: [
    { role: "anon", privilege: "USAGE" }
  ]
};

describe("renderBaseline", () => {
  it("renders schema-only DDL in dependency order", () => {
    const sql = renderBaseline(snapshot);
    expect(sql).toContain("create extension if not exists");
    expect(sql).toContain("create type \"public\".\"stage_enum\"");
    expect(sql).toContain("create table \"public\".\"publishers\"");
    expect(sql).toContain("add constraint \"publishers_pkey\" PRIMARY KEY (id)");
    expect(sql).toContain("create policy \"publishers_read\"");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("grant SELECT on table \"public\".\"publishers\" to \"authenticated\"");
  });

  it("renders partition tables with their parent and bound", () => {
    const sql = renderBaseline({
      ...snapshot,
      tables: [
        { name: "events_2026", rls_enabled: false, force_rls: false, is_partition: true, partition_bound: "FOR VALUES FROM ('2026-01-01') TO ('2027-01-01')", partition_of: "events" }
      ],
      columns: []
    });
    expect(sql).toContain("partition of \"public\".\"events\" FOR VALUES");
  });
});

describe("classifyBaseline", () => {
  it("classifies extensions as extension-managed and app objects as application-managed", () => {
    const entries = classifyBaseline(snapshot);
    expect(entries.some((entry) => entry.class === "EXTENSION_MANAGED")).toBe(true);
    expect(entries.filter((entry) => entry.class === "PG_OS_APPLICATION_MANAGED").length).toBeGreaterThanOrEqual(4);
  });
});

describe("generateSchemaBaseline", () => {
  it("blocks generation when source writes are enabled", async () => {
    const environment = { ...sourceEnvironment, PG_OS_ENABLE_MIGRATION_WRITE: "true" };
    await expect(generateSchemaBaseline({ environment, now: new Date("2026-08-06T00:00:00Z") }))
      .rejects.toThrow(/Staging source writes are forbidden/);
  });

  it("generates a static-review-passing candidate baseline from a read-only catalog snapshot", async () => {
    const root = mkdtempSync(join(tmpdir(), "cx0193-"));
    const result = await generateSchemaBaseline({
      environment: sourceEnvironment,
      root,
      now: new Date("2026-08-06T00:00:00Z"),
      collectCatalogImpl: async () => snapshot
    });
    expect(result.files).toEqual(["00_extensions.sql", "10_public_schema.sql"]);
    const finalSql = readFileSync(join(root, "supabase", "baseline-candidate", "10_public_schema.sql"), "utf8");
    expect(finalSql).not.toContain("owner to postgres");
    const manifest = JSON.parse(readFileSync(join(root, "supabase", "baseline-candidate", "manifest.yaml"), "utf8"));
    expect(manifest.object_classification.PG_OS_APPLICATION_MANAGED).toBeGreaterThanOrEqual(4);
    expect(manifest.formal_migration_chain).toBe(false);
    const catalog = JSON.parse(readFileSync(join(root, ".codex", "schema-baseline", "staging-catalog.json"), "utf8"));
    expect(catalog.tables.length).toBe(1);
  });
});
