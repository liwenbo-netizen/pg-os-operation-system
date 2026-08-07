import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatFailures } from "./baselineSafety.mjs";
import { collectCatalogSnapshot } from "./generate-schema-baseline.mjs";
import { validateBaselineEnvironment } from "./validate-baseline-environment.mjs";

function normalizeValue(value) {
  return normalizeArrayCastCanonical(String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase());
}

// PostgreSQL re-parses "(ARRAY['v'::type, ...])::text[]" into
// "ARRAY[('v'::type)::text, ...]" when a constraint/view is re-created.
// The two forms are semantically equivalent (proven by read-only SELECT probes);
// this canonicalization makes the comparison textual while preserving semantics.
function normalizeArrayCastCanonical(value) {
  const convertItems = (items) => {
    const elements = items.split(",").map((entry) => entry.trim());
    if (elements.length === 0) return null;
    const converted = elements.map((entry) => {
      const simple = /^'[^']*'::[a-z0-9_ ]+$/.exec(entry);
      return simple ? `(${entry})::text` : null;
    });
    if (converted.some((entry) => entry === null)) return null;
    return `(array[${converted.join(", ")}])`;
  };
  let out = value.replace(/\(\(array\[([^\]]*)\]\)::text\[\]\)/g, (match, items) => convertItems(items) ?? match);
  out = out.replace(/\(array\[([^\]]*)\]\)::text\[\]/g, (match, items) => convertItems(items) ?? match);
  return out;
}

function sortByKey(list, key) {
  return [...list]
    .map((entry) => ({
      ...entry,
      _key: JSON.stringify(typeof key === "function" ? key(entry) : entry[key] ?? "")
    }))
    .sort((a, b) => a._key.localeCompare(b._key))
    .map(({ _key, ...rest }) => rest);
}

function keyFor(entry, key) {
  const value = entry[key];
  return typeof value === "string" ? normalizeValue(value) : JSON.stringify(value);
}

function diffList(source, rebuilt, key, label) {
  const keyForEntry = typeof key === "function" ? key : (entry) => keyFor(entry, key);
  const sourceMap = new Map(sortByKey(source, key).map((entry) => [keyForEntry(entry), entry]));
  const rebuiltMap = new Map(sortByKey(rebuilt, key).map((entry) => [keyForEntry(entry), entry]));
  const missing = [...sourceMap.keys()].filter((k) => !rebuiltMap.has(k)).sort();
  const extra = [...rebuiltMap.keys()].filter((k) => !sourceMap.has(k)).sort();
  const differences = [];
  for (const k of sourceMap.keys()) {
    if (!rebuiltMap.has(k)) continue;
    const a = sourceMap.get(k);
    const b = rebuiltMap.get(k);
    const aNormalized = Object.fromEntries(Object.entries(a).map(([field, value]) => [field, normalizeValue(value)]));
    const bNormalized = Object.fromEntries(Object.entries(b).map(([field, value]) => [field, normalizeValue(value)]));
    const differingFields = Object.keys(aNormalized).filter((field) => aNormalized[field] !== bNormalized[field]);
    if (differingFields.length > 0) {
      differences.push(`${label} ${k}: ${differingFields.join(",")}`);
    }
  }
  return { missing, extra, differences };
}

export function normalizeSnapshot(snapshot) {
  const normalizeList = (list) =>
    (Array.isArray(list) ? list : []).map((entry) =>
      Object.fromEntries(
        Object.entries(entry)
          .filter(([field]) => !["_key", "oid", "owner", "captured_at", "project_ref", "created_at"].includes(field))
          .map(([field, value]) => [field, normalizeValue(value)])
      )
    );

  return {
    tables: sortByKey(normalizeList(snapshot.tables), "name"),
    columns: sortByKey(normalizeList(snapshot.columns), "table"),
    constraints: sortByKey(normalizeList(snapshot.constraints), "table"),
    indexes: sortByKey(normalizeList(snapshot.indexes), "table"),
    policies: sortByKey(normalizeList(snapshot.policies), "table"),
    triggers: sortByKey(normalizeList(snapshot.triggers), "table"),
    functions: sortByKey(normalizeList(snapshot.functions), "name"),
    views: sortByKey(normalizeList(snapshot.views), "name"),
    sequences: sortByKey(normalizeList(snapshot.sequences), "name"),
    enums: sortByKey(normalizeList(snapshot.enums), "name"),
    extensions: sortByKey(normalizeList(snapshot.extensions), "name"),
    grants: sortByKey(
      [
        ...(Array.isArray(snapshot.table_grants) ? snapshot.table_grants : []).map((entry) => ({ ...entry, object_type: "table" })),
        ...(Array.isArray(snapshot.schema_grants) ? snapshot.schema_grants : []).map((entry) => ({ ...entry, object_type: "schema" }))
      ],
      "object"
    )
  };
}

export function diffSnapshots(source, rebuilt) {
  const a = normalizeSnapshot(source);
  const b = normalizeSnapshot(rebuilt);

  const tables = diffList(a.tables, b.tables, "name", "table");
  const columns = diffList(a.columns, b.columns, "table", "column");
  const constraints = diffList(a.constraints, b.constraints, "table", "constraint");
  const indexes = diffList(a.indexes, b.indexes, "table", "index");
  const policies = diffList(a.policies, b.policies, "table", "policy");
  const triggers = diffList(a.triggers, b.triggers, "table", "trigger");
  const functions = diffList(a.functions, b.functions, "name", "function");
  const views = diffList(a.views, b.views, "name", "view");
  const sequences = diffList(a.sequences, b.sequences, "name", "sequence");
  const enums = diffList(a.enums, b.enums, "name", "enum");
  const extensions = diffList(a.extensions, b.extensions, "name", "extension");
  const grants = diffList(
    a.grants,
    b.grants,
    (entry) => [entry.object_type, entry.object, entry.role, entry.privilege].join("|"),
    "grant"
  );

  const rlsDifferences = [];
  const sourceRls = new Map(a.tables.map((table) => [keyFor(table, "name"), table.rls_enabled]));
  const rebuiltRls = new Map(b.tables.map((table) => [keyFor(table, "name"), table.rls_enabled]));
  for (const name of sourceRls.keys()) {
    if (rebuiltRls.has(name) && sourceRls.get(name) !== rebuiltRls.get(name)) {
      rlsDifferences.push(`table ${name}: rls_enabled ${sourceRls.get(name)} -> ${rebuiltRls.get(name)}`);
    }
  }

  const unexplainedDifferences = [
    ...tables.missing.map((name) => `missing table ${name}`),
    ...tables.extra.map((name) => `extra table ${name}`),
    ...columns.missing.map((name) => `missing column ${name}`),
    ...columns.extra.map((name) => `extra column ${name}`),
    ...columns.differences,
    ...constraints.missing.map((name) => `missing constraint ${name}`),
    ...constraints.extra.map((name) => `extra constraint ${name}`),
    ...constraints.differences,
    ...indexes.differences,
    ...rlsDifferences,
    ...policies.differences,
    ...policies.missing.map((name) => `missing policy ${name}`),
    ...policies.extra.map((name) => `extra policy ${name}`),
    ...triggers.differences,
    ...triggers.missing.map((name) => `missing trigger ${name}`),
    ...triggers.extra.map((name) => `extra trigger ${name}`),
    ...functions.differences,
    ...functions.missing.map((name) => `missing function ${name}`),
    ...functions.extra.map((name) => `extra function ${name}`),
    ...views.differences,
    ...views.missing.map((name) => `missing view ${name}`),
    ...views.extra.map((name) => `extra view ${name}`),
    ...sequences.differences,
    ...sequences.missing.map((name) => `missing sequence ${name}`),
    ...sequences.extra.map((name) => `extra sequence ${name}`),
    ...enums.differences,
    ...extensions.differences,
    ...extensions.missing.map((name) => `missing extension ${name}`),
    ...extensions.extra.map((name) => `extra extension ${name}`),
    ...grants.differences,
    ...grants.missing.map((name) => `missing grant ${name}`),
    ...grants.extra.map((name) => `extra grant ${name}`)
  ].sort();

  return {
    matched_tables: a.tables.filter((table) => b.tables.some((other) => keyFor(other, "name") === keyFor(table, "name"))).length,
    missing_tables: tables.missing,
    extra_tables: tables.extra,
    column_differences: [...columns.missing, ...columns.extra, ...columns.differences],
    constraint_differences: [...constraints.missing, ...constraints.extra, ...constraints.differences],
    index_differences: indexes.differences,
    rls_differences: rlsDifferences,
    policy_differences: [...policies.missing, ...policies.extra, ...policies.differences],
    trigger_differences: [...triggers.missing, ...triggers.extra, ...triggers.differences],
    function_differences: [...functions.missing, ...functions.extra, ...functions.differences],
    view_differences: [...views.missing, ...views.extra, ...views.differences],
    sequence_differences: [...sequences.missing, ...sequences.extra, ...sequences.differences],
    extension_differences: [...extensions.missing, ...extensions.extra, ...extensions.differences],
    grant_differences: [...grants.missing, ...grants.extra, ...grants.differences],
    excluded_differences: [],
    unexplained_differences: [...new Set(unexplainedDifferences)]
  };
}

export function diffResultPasses(diff) {
  return (
    Array.isArray(diff.unexplained_differences)
    && diff.unexplained_differences.length === 0
    && Array.isArray(diff.missing_tables)
    && diff.missing_tables.length === 0
    && Array.isArray(diff.extra_tables)
    && diff.extra_tables.length === 0
  );
}

async function main() {
  const sourcePath = process.argv.find((arg) => arg.startsWith("--source="))?.slice("--source=".length);
  const rebuiltPath = process.argv.find((arg) => arg.startsWith("--rebuilt="))?.slice("--rebuilt=".length);
  const outputPath = process.argv.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
  try {
    let source;
    let rebuilt;
    let output = outputPath;
    if (!sourcePath || !rebuiltPath) {
      // Capture mode: read-only catalog collection from staging source and migration sandbox.
      const failures = validateBaselineEnvironment(process.env, {
        requireSandbox: true,
        requireSandboxWrite: false,
        acceptAnySandboxWriteFlag: true,
        now: new Date()
      });
      if (failures.length > 0) {
        throw new Error(formatFailures("Schema diff capture blocked by environment safety check:", failures));
      }
      source = await collectCatalogSnapshot({
        environment: process.env,
        targetRef: process.env.SUPABASE_STAGING_PROJECT_REF
      });
      rebuilt = await collectCatalogSnapshot({
        environment: process.env,
        targetRef: process.env.SUPABASE_SANDBOX_PROJECT_REF
      });
      output ??= resolve(process.cwd(), ".codex", "schema-baseline", "diff-1.json");
      const baselineDirectory = resolve(process.cwd(), ".codex", "schema-baseline");
      mkdirSync(baselineDirectory, { recursive: true });
      writeFileSync(resolve(baselineDirectory, "staging-catalog.json"), `${JSON.stringify(source, null, 2)}\n`, "utf8");
      writeFileSync(resolve(baselineDirectory, "sandbox-catalog.json"), `${JSON.stringify(rebuilt, null, 2)}\n`, "utf8");
    } else {
      source = JSON.parse(readFileSync(sourcePath, "utf8"));
      rebuilt = JSON.parse(readFileSync(rebuiltPath, "utf8"));
    }
    const diff = diffSnapshots(source, rebuilt);
    const passed = diffResultPasses(diff);
    console.log(`normalized_schema_diff: ${passed ? "PASS" : "FAIL"}`);
    console.log(`matched_tables: ${diff.matched_tables}`);
    console.log(`missing_tables: ${diff.missing_tables.length}`);
    console.log(`extra_tables: ${diff.extra_tables.length}`);
    console.log(`unexplained_differences: ${diff.unexplained_differences.length}`);
    if (output) {
      const outputPathResolved = resolve(process.cwd(), output);
      mkdirSync(dirname(outputPathResolved), { recursive: true });
      writeFileSync(outputPathResolved, `${JSON.stringify(diff, null, 2)}\n`, "utf8");
      console.log(`diff_saved: ${outputPathResolved}`);
    }
    if (!passed) {
      console.error(formatFailures("Normalized schema diff failed:", diff.unexplained_differences.slice(0, 20)));
      process.exit(1);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Normalized schema diff failed.");
    process.exit(1);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
