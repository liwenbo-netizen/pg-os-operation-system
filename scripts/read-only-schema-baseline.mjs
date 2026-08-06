import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatFailures,
  migrationSafetyMode,
  migrationWriteStatus,
  validateMigrationEnvironment
} from "./supabaseMigrationSafety.mjs";

export const schemaBaselineSql = `
select
  (select count(*)::int from pg_catalog.pg_extension) as extensions,
  (select count(*)::int
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')) as tables,
  (select count(*)::int
     from information_schema.columns c
    where c.table_schema = 'public') as columns,
  (select count(*)::int
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('v', 'm')) as views,
  (select count(*)::int
     from pg_catalog.pg_proc p
     join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f') as functions,
  (select count(*)::int
     from pg_catalog.pg_trigger t
     join pg_catalog.pg_class c on c.oid = t.tgrelid
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal) as triggers,
  (select count(*)::int
     from pg_catalog.pg_constraint c
     join pg_catalog.pg_namespace n on n.oid = c.connamespace
    where n.nspname = 'public') as constraints,
  (select count(*)::int
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('i', 'I')) as indexes,
  (select count(*)::int
     from pg_catalog.pg_class c
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and c.relrowsecurity) as row_level_security,
  (select count(*)::int
     from pg_catalog.pg_policy p
     join pg_catalog.pg_class c on c.oid = p.polrelid
     join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public') as policies,
  (select coalesce(pg_catalog.json_agg(m.version order by m.version), '[]'::pg_catalog.json)
     from supabase_migrations.schema_migrations m) as migration_versions
`;

const countFields = [
  "extensions",
  "tables",
  "columns",
  "views",
  "functions",
  "triggers",
  "constraints",
  "indexes",
  "row_level_security",
  "policies"
];

function toCount(value, field) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`Read-only baseline response contains an invalid ${field} count.`);
  }
  return count;
}

function normalizeVersions(value) {
  const values = Array.isArray(value) ? value : [];
  return [...new Set(values.map((entry) => String(entry)))].sort();
}

export function assertReadOnlyQuery(query) {
  const normalized = query.trim();
  if (!/^select\b/i.test(normalized)) {
    throw new Error("Schema baseline query must begin with SELECT.");
  }
  if (/\b(insert|update|delete|merge|alter|create|drop|truncate|grant|revoke|comment|vacuum|analyze|call|do)\b/i.test(normalized)) {
    throw new Error("Schema baseline query contains a write-capable SQL keyword.");
  }
  const statements = normalized.replace(/;\s*$/, "").split(";").filter((part) => part.trim());
  if (statements.length !== 1) {
    throw new Error("Schema baseline query must contain exactly one SELECT statement.");
  }
}

export function listLocalMigrationVersions(root = process.cwd()) {
  const directory = resolve(root, "supabase", "migrations");
  if (!existsSync(directory)) {
    throw new Error("Local migration directory is missing.");
  }

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d{12}_.+\.sql$/i.test(entry.name))
    .map((entry) => entry.name.slice(0, 12))
    .sort();
}

export function extractBaselineRow(payload) {
  const rows = Array.isArray(payload) ? payload : payload?.data;
  if (!Array.isArray(rows) || rows.length !== 1 || !rows[0] || typeof rows[0] !== "object") {
    throw new Error("Read-only baseline endpoint returned an unexpected response shape.");
  }
  return rows[0];
}

export function buildSchemaBaseline({ row, localVersions, capturedAt }) {
  const counts = Object.fromEntries(countFields.map((field) => [field, toCount(row[field], field)]));
  const remoteVersions = normalizeVersions(row.migration_versions);
  const normalizedLocalVersions = normalizeVersions(localVersions);
  const localOnly = normalizedLocalVersions.filter((version) => !remoteVersions.includes(version));
  const remoteOnly = remoteVersions.filter((version) => !normalizedLocalVersions.includes(version));
  const migrationHistoryAligned = localOnly.length === 0 && remoteOnly.length === 0;

  return {
    task_id: "CX-0190",
    captured_at: capturedAt,
    schema_baseline: {
      target_environment: "staging",
      write_enabled: false,
      write_status: "DISABLED",
      write_reason: "MIGRATION_WRITE_NOT_APPROVED",
      project_identity_verified: true,
      project_identity: "PROTECTED_LOCAL_ENVIRONMENT",
      safety_mode: "NO_PRODUCTION_PROJECT",
      migration_history: {
        local_count: normalizedLocalVersions.length,
        remote_count: remoteVersions.length,
        aligned: migrationHistoryAligned,
        local_only_versions: localOnly,
        remote_only_versions: remoteOnly
      },
      local_migration_files: normalizedLocalVersions.length,
      remote_schema_objects: counts.tables + counts.views + counts.functions + counts.triggers,
      remote_extensions: counts.extensions,
      tables: counts.tables,
      columns: counts.columns,
      views: counts.views,
      functions: counts.functions,
      triggers: counts.triggers,
      constraints: counts.constraints,
      indexes: counts.indexes,
      row_level_security: counts.row_level_security,
      policies: counts.policies,
      schema_drift: migrationHistoryAligned
        ? "NOT_DETECTED_IN_MIGRATION_HISTORY"
        : "DETECTED_IN_MIGRATION_HISTORY",
      dashboard_only_changes_suspected: remoteOnly.length > 0,
      baseline_reconstructability: migrationHistoryAligned
        ? "PARTIAL_HISTORY_ALIGNED_REPLAY_NOT_EXECUTED"
        : "BLOCKED_MIGRATION_HISTORY_DRIFT",
      blockers: migrationHistoryAligned
        ? [
            "Remote schema was not rebuilt from local migrations because mutation approval is absent.",
            "Semantic schema equivalence remains unproven until an approved dry run and schema diff are executed."
          ]
        : [
            "Remote and local migration histories differ.",
            "Do not enable writes until the migration history difference is explained and an approved dry run is complete."
          ],
      future_rule: {
        when_current_project_becomes_production: {
          migration_write: "FORBIDDEN",
          no_production_project_mode: "INVALID",
          new_staging_project_required: true
        }
      }
    }
  };
}

export async function collectReadOnlySchemaBaseline({
  environment,
  fetchImpl = globalThis.fetch,
  root = process.cwd(),
  capturedAt = new Date().toISOString()
}) {
  const failures = validateMigrationEnvironment(environment, { requireReadOnly: true });
  if (failures.length > 0) {
    throw new Error(formatFailures("Read-only schema baseline safety check failed:", failures));
  }
  if (migrationSafetyMode(environment) !== "NO_PRODUCTION_PROJECT") {
    throw new Error("CX-0190 read-only baseline requires NO_PRODUCTION_PROJECT safety mode.");
  }
  const write = migrationWriteStatus(environment);
  if (write.write_status !== "DISABLED") {
    throw new Error("Read-only schema baseline requires migration writes to remain disabled.");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("A Fetch implementation is required for the read-only baseline endpoint.");
  }

  assertReadOnlyQuery(schemaBaselineSql);
  const endpoint = `https://api.supabase.com/v1/projects/${encodeURIComponent(environment.SUPABASE_STAGING_PROJECT_REF)}/database/query/read-only`;
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${environment.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: schemaBaselineSql }),
      signal: AbortSignal.timeout(30_000)
    });
  } catch {
    throw new Error("Read-only schema baseline request failed before a response was received.");
  }

  if (!response.ok) {
    throw new Error(`Read-only schema baseline endpoint returned HTTP ${response.status}.`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Read-only schema baseline endpoint returned invalid JSON.");
  }

  return buildSchemaBaseline({
    row: extractBaselineRow(payload),
    localVersions: listLocalMigrationVersions(root),
    capturedAt
  });
}

function outputArgument(args) {
  const entry = args.find((argument) => argument.startsWith("--output="));
  return entry ? entry.slice("--output=".length) : null;
}

async function main() {
  try {
    const baseline = await collectReadOnlySchemaBaseline({ environment: process.env });
    const output = outputArgument(process.argv.slice(2));
    if (output) {
      const outputPath = resolve(process.cwd(), output);
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
    }

    const summary = baseline.schema_baseline;
    console.log("Read-only schema baseline passed.");
    console.log("target_environment: staging");
    console.log("write_status: DISABLED");
    console.log("reason: MIGRATION_WRITE_NOT_APPROVED");
    console.log(`migration_history_aligned: ${summary.migration_history.aligned}`);
    console.log(`remote_schema_objects: ${summary.remote_schema_objects}`);
    console.log("Project refs, hosts, URLs, passwords, and tokens were not logged.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Read-only schema baseline failed.");
    process.exit(1);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
