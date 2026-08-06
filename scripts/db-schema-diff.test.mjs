import { describe, expect, it } from "vitest";
import { diffResultPasses, diffSnapshots } from "./db-schema-diff.mjs";

const base = {
  captured_at: "2026-08-06T00:00:00Z",
  project_ref: "aaaaaaaaaaaaaaaaaaaa",
  tables: [
    { name: "publishers", rls_enabled: "true" },
    { name: "opportunities", rls_enabled: "true" }
  ],
  columns: [
    { table: "publishers", name: "id", data_type: "uuid", not_null: "true", default: "" },
    { table: "publishers", name: "name", data_type: "text", not_null: "true", default: "" },
    { table: "opportunities", name: "id", data_type: "uuid", not_null: "true", default: "" },
    { table: "opportunities", name: "stage", data_type: "text", not_null: "true", default: "" }
  ],
  constraints: [
    { table: "publishers", name: "publishers_pkey", type: "PRIMARY KEY", definition: "primary key (id)" },
    { table: "opportunities", name: "chk_opportunity_stage", type: "CHECK", definition: "check ((stage = ANY (ARRAY['discovery'::text, 'won'::text, 'lost'::text])))" }
  ],
  indexes: [],
  policies: [
    { table: "publishers", name: "publishers_read", command: "SELECT", roles: "authenticated", using: "true", check: "" }
  ],
  triggers: [],
  functions: [],
  views: [],
  sequences: [],
  enums: []
};

describe("diffSnapshots", () => {
  it("passes identical snapshots", () => {
    const diff = diffSnapshots(base, base);
    expect(diffResultPasses(diff)).toBe(true);
    expect(diff.unexplained_differences).toEqual([]);
  });

  it("passes only normalized non-semantic differences (whitespace, ordering, owners)", () => {
    const rebuilt = {
      ...base,
      captured_at: "2026-08-06T02:00:00Z",
      project_ref: "bbbbbbbbbbbbbbbbbbbb",
      columns: [
        ...base.columns.map((column) => ({ ...column, owner: "postgres" })),
        { table: "publishers", name: "name", data_type: "text", not_null: "true", default: "" }
      ],
      tables: [...base.tables].reverse(),
      constraints: base.constraints.map((constraint) => ({
        ...constraint,
        definition: constraint.definition.replace(/\s+/g, " ")
      }))
    };
    const diff = diffSnapshots(base, rebuilt);
    expect(diffResultPasses(diff)).toBe(true);
  });

  it("fails when a table is missing", () => {
    const rebuilt = { ...base, tables: base.tables.slice(0, 1) };
    const diff = diffSnapshots(base, rebuilt);
    expect(diff.missing_tables).toContain("opportunities");
    expect(diffResultPasses(diff)).toBe(false);
  });

  it("fails when a column is missing", () => {
    const rebuilt = { ...base, columns: base.columns.filter((column) => !(column.table === "publishers" && column.name === "name")) };
    const diff = diffSnapshots(base, rebuilt);
    expect(diff.column_differences.some((item) => item.includes("publishers"))).toBe(true);
    expect(diffResultPasses(diff)).toBe(false);
  });

  it("fails on constraint differences", () => {
    const rebuilt = {
      ...base,
      constraints: base.constraints.map((constraint) =>
        constraint.name === "chk_opportunity_stage"
          ? { ...constraint, definition: constraint.definition.replace("lost", "negotiation") }
          : constraint
      )
    };
    const diff = diffSnapshots(base, rebuilt);
    expect(diff.constraint_differences.length).toBeGreaterThan(0);
    expect(diffResultPasses(diff)).toBe(false);
  });

  it("fails on RLS and policy differences", () => {
    const rebuilt = {
      ...base,
      tables: base.tables.map((table) => (table.name === "publishers" ? { ...table, rls_enabled: "false" } : table)),
      policies: base.policies.map((policy) => (policy.name === "publishers_read" ? { ...policy, using: "false" } : policy))
    };
    const diff = diffSnapshots(base, rebuilt);
    expect(diff.rls_differences.length).toBeGreaterThan(0);
    expect(diff.policy_differences.length).toBeGreaterThan(0);
    expect(diffResultPasses(diff)).toBe(false);
  });

  it("fails on trigger and function differences", () => {
    const source = {
      ...base,
      triggers: [{ table: "publishers", name: "trg_touch", event: "AFTER INSERT", function: "public.touch_publisher()" }],
      functions: [{ name: "public.touch_publisher()", return_type: "trigger", language: "plpgsql" }]
    };
    const rebuilt = {
      ...base,
      triggers: [],
      functions: []
    };
    const diff = diffSnapshots(source, rebuilt);
    expect(diff.trigger_differences.length).toBeGreaterThan(0);
    expect(diff.function_differences.length).toBeGreaterThan(0);
    expect(diffResultPasses(diff)).toBe(false);
  });
});
