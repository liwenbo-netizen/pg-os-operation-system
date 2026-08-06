import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatFailures } from "./baselineSafety.mjs";
import { validateBaselineEnvironment } from "./validate-baseline-environment.mjs";
import { validateSchemaBaseline } from "./validate-schema-baseline.mjs";

const catalogQueries = {
  extensions: `
    select coalesce(jsonb_agg(jsonb_build_object('name', e.extname, 'schema', n.nspname) order by e.extname), '[]'::jsonb) as data
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace`,
  enums: `
    select coalesce(jsonb_agg(jsonb_build_object('name', t.typname, 'values', (
      select array_agg(e.enumlabel order by e.enumsortorder) from pg_enum e where e.enumtypid = t.oid
    )) order by t.typname), '[]'::jsonb) as data
    from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'`,
  tables: `
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', c.relname,
      'rls_enabled', c.relrowsecurity,
      'force_rls', c.relforcerowsecurity,
      'is_partition', c.relispartition,
      'partition_bound', case when c.relispartition then pg_get_expr(c.relpartbound, c.oid) else null end,
      'partition_of', case when c.relispartition then (select p.relname from pg_inherits i join pg_class p on p.oid = i.inhparent where i.inhrelid = c.oid limit 1) else null end
    ) order by c.relname), '[]'::jsonb) as data
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')`,
  columns: `
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', t.relname,
      'name', a.attname,
      'type', format_type(a.atttypid, a.atttypmod),
      'not_null', a.attnotnull,
      'default', case when d.adrelid is not null then pg_get_expr(d.adbin, d.adrelid) else null end,
      'identity', a.attidentity,
      'ordinal', a.attnum
    ) order by t.relname, a.attnum), '[]'::jsonb) as data
    from pg_attribute a
    join pg_class t on t.oid = a.attrelid
    join pg_namespace n on n.oid = t.relnamespace
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where n.nspname = 'public' and a.attnum > 0 and not a.attisdropped and t.relkind in ('r', 'p')`,
  constraints: `
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', t.relname,
      'name', c.conname,
      'type', c.contype,
      'definition', pg_get_constraintdef(c.oid)
    ) order by t.relname, c.conname), '[]'::jsonb) as data
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'`,
  indexes: `
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', t.relname,
      'name', ic.relname,
      'definition', pg_get_indexdef(i.indexrelid)
    ) order by t.relname, ic.relname), '[]'::jsonb) as data
    from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    join pg_class t on t.oid = i.indrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and not i.indisprimary
      and not exists (select 1 from pg_constraint c where c.conindid = i.indexrelid)`,
  policies: `
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', p.tablename,
      'name', p.policyname,
      'permissive', p.permissive,
      'command', p.cmd,
      'roles', p.roles,
      'using', p.qual,
      'check', p.with_check
    ) order by p.tablename, p.policyname), '[]'::jsonb) as data
    from pg_policies p where p.schemaname = 'public'`,
  triggers: `
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname,
      'name', t.tgname,
      'definition', pg_get_triggerdef(t.oid)
    ) order by c.relname, t.tgname), '[]'::jsonb) as data
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and not t.tgisinternal`,
  functions: `
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', p.oid::regprocedure::text,
      'definition', pg_get_functiondef(p.oid)
    ) order by p.oid::regprocedure::text), '[]'::jsonb) as data
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind in ('f', 'p', 'a', 'w')`,
  views: `
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', c.relname,
      'definition', pg_get_viewdef(c.oid)
    ) order by c.relname), '[]'::jsonb) as data
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'`,
  sequences: `
    select coalesce(jsonb_agg(jsonb_build_object(
      'name', c.relname,
      'data_type', format_type(s.seqtypid, null)
    ) order by c.relname), '[]'::jsonb) as data
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_sequence s on s.seqrelid = c.oid
    where n.nspname = 'public' and c.relkind = 'S'`,
  table_grants: `
    select coalesce(jsonb_agg(jsonb_build_object(
      'object', c.relname,
      'kind', c.relkind,
      'role', case when a.grantee = 0 then 'public' else a.grantee::regrole::text end,
      'privilege', a.privilege_type
    ) order by c.relname, a.grantee, a.privilege_type), '[]'::jsonb) as data
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    cross join lateral aclexplode(c.relacl) a
    where n.nspname = 'public' and c.relkind in ('r', 'p', 'S', 'v')
      and (case when a.grantee = 0 then 'public' else a.grantee::regrole::text end) not in ('postgres', 'supabase_admin')`,
  schema_grants: `
    select coalesce(jsonb_agg(jsonb_build_object('role', case when a.grantee = 0 then 'public' else a.grantee::regrole::text end, 'privilege', a.privilege_type)
    order by a.grantee, a.privilege_type), '[]'::jsonb) as data
    from pg_namespace n cross join lateral aclexplode(n.nspacl) a
    where n.nspname = 'public'
      and (case when a.grantee = 0 then 'public' else a.grantee::regrole::text end) not in ('postgres', 'supabase_admin')`
};

export async function collectCatalogSnapshot({
  environment,
  baseUrl = "https://api.supabase.com/v1/projects",
  fetchImpl = globalThis.fetch
}) {
  const token = environment.SUPABASE_ACCESS_TOKEN;
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required for catalog collection.");
  const ref = environment.SUPABASE_STAGING_PROJECT_REF;
  const snapshot = { captured_at: new Date().toISOString(), project_ref: "PROTECTED_LOCAL_ENVIRONMENT" };
  for (const [name, sql] of Object.entries(catalogQueries)) {
    const response = await fetchImpl(`${baseUrl}/${encodeURIComponent(ref)}/database/query/read-only`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: sql }),
      signal: AbortSignal.timeout(120_000)
    });
    if (!response.ok) {
      throw new Error(`Catalog query ${name} returned HTTP ${response.status}.`);
    }
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload?.data;
    snapshot[name] = Array.isArray(rows) ? (rows[0]?.data ?? []) : [];
  }
  return snapshot;
}

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function renderIdentity(identity) {
  if (identity === "a") return " generated always as identity";
  if (identity === "d") return " generated by default as identity";
  return "";
}

export function renderBaseline(snapshot) {
  const parts = [];

  const extensionSql = (snapshot.extensions ?? [])
    .map((extension) => `create extension if not exists ${quoteIdent(extension.name)} with schema ${quoteIdent(extension.schema)};`)
    .join("\n");
  parts.push(`-- EXTENSION_MANAGED: dependencies required by public objects\n${extensionSql}`);

  const enumSql = (snapshot.enums ?? [])
    .map((entry) => `create type ${quoteIdent("public")}.${quoteIdent(entry.name)} as enum (${entry.values.map(quoteLiteral).join(", ")});`)
    .join("\n");
  if (enumSql) parts.push(`-- PG_OS_APPLICATION_MANAGED types\n${enumSql}`);

  const sequenceSql = (snapshot.sequences ?? [])
    .map((entry) => `create sequence if not exists ${quoteIdent("public")}.${quoteIdent(entry.name)} as ${entry.data_type};`)
    .join("\n");
  if (sequenceSql) parts.push(`-- PG_OS_APPLICATION_MANAGED sequences\n${sequenceSql}`);

  const tableParts = (snapshot.tables ?? []).map((table) => {
    const columns = (snapshot.columns ?? [])
      .filter((column) => column.table === table.name)
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((column) => {
        let line = `  ${quoteIdent(column.name)} ${column.type}`;
        line += renderIdentity(column.identity);
        if (column.not_null) line += " not null";
        if (column.default) line += ` default ${column.default}`;
        return line;
      });
    if (table.is_partition) {
      return `create table ${quoteIdent("public")}.${quoteIdent(table.name)} partition of ${quoteIdent("public")}.${quoteIdent(table.partition_of ?? "")} ${table.partition_bound ?? ""};`;
    }
    return `create table ${quoteIdent("public")}.${quoteIdent(table.name)} (\n${columns.join(",\n")}\n);`;
  });
  parts.push(`-- PG_OS_APPLICATION_MANAGED tables\n${tableParts.join("\n\n")}`);

  const constraintSql = (snapshot.constraints ?? [])
    .map((constraint) => `alter table ${quoteIdent("public")}.${quoteIdent(constraint.table)} add constraint ${quoteIdent(constraint.name)} ${constraint.definition};`)
    .join("\n");
  parts.push(`-- PG_OS_APPLICATION_MANAGED constraints\n${constraintSql}`);

  const indexSql = (snapshot.indexes ?? [])
    .map((index) => {
      const definition = index.definition.replace(/^create\s+index\b/i, "create index");
      return `${definition};`;
    })
    .join("\n");
  parts.push(`-- PG_OS_APPLICATION_MANAGED indexes\n${indexSql}`);

  const functionSql = (snapshot.functions ?? [])
    .map((entry) => `${entry.definition};`)
    .join("\n\n");
  parts.push(`-- PG_OS_APPLICATION_MANAGED functions\n${functionSql}`);

  const viewSql = (snapshot.views ?? [])
    .map((view) => `create or replace view ${quoteIdent("public")}.${quoteIdent(view.name)} as\n${view.definition};`)
    .join("\n\n");
  parts.push(`-- PG_OS_APPLICATION_MANAGED views\n${viewSql}`);

  const triggerSql = (snapshot.triggers ?? [])
    .map((trigger) => `${trigger.definition};`)
    .join("\n");
  parts.push(`-- PG_OS_APPLICATION_MANAGED triggers\n${triggerSql}`);

  const rlsSql = (snapshot.tables ?? [])
    .filter((table) => table.rls_enabled)
    .map((table) => {
      const lines = [`alter table ${quoteIdent("public")}.${quoteIdent(table.name)} enable row level security;`];
      if (table.force_rls) lines.push(`alter table ${quoteIdent("public")}.${quoteIdent(table.name)} force row level security;`);
      return lines.join("\n");
    })
    .join("\n");
  parts.push(`-- PG_OS_APPLICATION_MANAGED RLS state\n${rlsSql}`);

  const policySql = (snapshot.policies ?? [])
    .map((policy) => {
      const roles = (policy.roles ?? []).filter((role) => role !== "0");
      const roleClause = roles.length > 0 ? ` to ${roles.map(quoteIdent).join(", ")}` : "";
      const using = policy.using ? ` using (${policy.using})` : "";
      const check = policy.check ? ` with check (${policy.check})` : "";
      return `create policy ${quoteIdent(policy.name)} on ${quoteIdent("public")}.${quoteIdent(policy.table)} as ${policy.permissive} for ${policy.command}${roleClause}${using}${check};`;
    })
    .join("\n");
  parts.push(`-- PG_OS_APPLICATION_MANAGED policies\n${policySql}`);

  const grantSql = [
    ...(snapshot.schema_grants ?? []).map((grant) => `grant ${grant.privilege} on schema public to ${quoteIdent(grant.role)};`),
    ...(snapshot.table_grants ?? []).map((grant) => `grant ${grant.privilege} on ${grant.kind === "S" ? "sequence" : "table"} ${quoteIdent("public")}.${quoteIdent(grant.object)} to ${quoteIdent(grant.role)};`)
  ].join("\n");
  parts.push(`-- PG_OS_APPLICATION_MANAGED grants\n${grantSql}`);

  return parts.filter((part) => !part.endsWith("\n")).join("\n\n") + "\n";
}

export function classifyBaseline(snapshot) {
  const classifications = [
    ...(snapshot.extensions ?? []).map((entry) => ({ object: entry.name, class: "EXTENSION_MANAGED", source: "staging_source" })),
    ...(snapshot.tables ?? []).map((entry) => ({ object: `public.${entry.name}`, class: "PG_OS_APPLICATION_MANAGED", source: "staging_source" })),
    ...(snapshot.policies ?? []).map((entry) => ({ object: `public.${entry.table}.${entry.name}`, class: "PG_OS_APPLICATION_MANAGED", source: "staging_source" })),
    ...(snapshot.functions ?? []).map((entry) => ({ object: entry.name, class: "PG_OS_APPLICATION_MANAGED", source: "staging_source" })),
    ...(snapshot.triggers ?? []).map((entry) => ({ object: `public.${entry.table}.${entry.name}`, class: "PG_OS_APPLICATION_MANAGED", source: "staging_source" })),
    ...(snapshot.views ?? []).map((entry) => ({ object: `public.${entry.name}`, class: "PG_OS_APPLICATION_MANAGED", source: "staging_source" }))
  ];
  return classifications;
}

export async function generateSchemaBaseline({
  environment,
  root = process.cwd(),
  now = new Date(),
  collectCatalogImpl
}) {
  const failures = validateBaselineEnvironment(environment, {
    now,
    requireSandbox: false,
    requireSandboxWrite: false
  });
  if (failures.length > 0) {
    throw new Error(formatFailures("Baseline generation blocked by environment safety check:", failures));
  }

  const collector = collectCatalogImpl ?? collectCatalogSnapshot;
  const snapshot = await collector({ environment });
  const sql = renderBaseline(snapshot);

  const outputDirectory = resolve(root, "supabase", "baseline-candidate");
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(resolve(outputDirectory, "00_extensions.sql"), sql.split("\n\n-- PG_OS_APPLICATION_MANAGED types")[0], "utf8");
  writeFileSync(resolve(outputDirectory, "10_public_schema.sql"), sql, "utf8");

  const staticCheck = validateSchemaBaseline({ "10_public_schema.sql": sql });
  if (staticCheck.failures.length > 0) {
    throw new Error(formatFailures("Generated candidate baseline failed static review:", staticCheck.failures));
  }

  const classifications = classifyBaseline(snapshot);
  const manifest = {
    task_id: "CX-0193",
    generated_at: now.toISOString(),
    source_project_ref_env: "SUPABASE_STAGING_PROJECT_REF",
    source_identity_verified: true,
    source_writes: false,
    method: "Management API read-only pg_catalog extraction, schema-only render",
    files: ["00_extensions.sql", "10_public_schema.sql"],
    object_counts: {
      extensions: snapshot.extensions?.length ?? 0,
      tables: snapshot.tables?.length ?? 0,
      columns: snapshot.columns?.length ?? 0,
      constraints: snapshot.constraints?.length ?? 0,
      indexes: snapshot.indexes?.length ?? 0,
      policies: snapshot.policies?.length ?? 0,
      triggers: snapshot.triggers?.length ?? 0,
      functions: snapshot.functions?.length ?? 0,
      views: snapshot.views?.length ?? 0,
      sequences: snapshot.sequences?.length ?? 0
    },
    object_classification: {
      PG_OS_APPLICATION_MANAGED: classifications.filter((entry) => entry.class === "PG_OS_APPLICATION_MANAGED").length,
      SUPABASE_PLATFORM_MANAGED: 0,
      EXTENSION_MANAGED: classifications.filter((entry) => entry.class === "EXTENSION_MANAGED").length,
      LEGACY_UNKNOWN: 0,
      EXCLUDED_WITH_REASON: [
        "auth schema (Supabase platform managed)",
        "storage schema (Supabase platform managed)",
        "supabase_migrations schema (migration history repair is forbidden)",
        "real business data (schema-only extraction)",
        "owner statements (non-portable; rendered without OWNER TO)",
        "postgres/supabase_admin grants (platform roles)"
      ]
    },
    static_review: {
      status: "PASS",
      notes: staticCheck.review
    },
    formal_migration_chain: false
  };
  writeFileSync(resolve(outputDirectory, "manifest.yaml"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  mkdirSync(resolve(root, ".codex", "schema-baseline"), { recursive: true });
  writeFileSync(resolve(root, ".codex", "schema-baseline", "staging-catalog.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  return {
    outputDirectory,
    files: ["00_extensions.sql", "10_public_schema.sql"],
    snapshot,
    classifications
  };
}

async function main() {
  try {
    const result = await generateSchemaBaseline({ environment: process.env, now: new Date() });
    console.log(`Candidate schema baseline generated in ${result.outputDirectory}.`);
    console.log(`tables: ${result.snapshot.tables.length}, columns: ${result.snapshot.columns.length}, policies: ${result.snapshot.policies.length}, triggers: ${result.snapshot.triggers.length}, functions: ${result.snapshot.functions.length}`);
    console.log("Candidate files are NOT part of the formal migration chain.");
    console.log("staging_source_writes: false");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Candidate schema baseline generation failed.");
    process.exit(1);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
