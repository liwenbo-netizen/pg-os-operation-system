import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sandboxRebuildGate, verifySandboxProjectIdentity } from "./db-sandbox-rebuild.mjs";
import { validateMigrationEnvironment } from "./supabaseMigrationSafety.mjs";

export const cx0201SandboxProofSql = `
select jsonb_build_object(
  'workflow_instances_table', to_regclass('public.workflow_instances') is not null,
  'transition_executions_table', to_regclass('public.workflow_transition_executions') is not null,
  'compatibility_view', to_regclass('public.workflow_instance_compatibility_v') is not null,
  'stage_for_node_function', to_regprocedure('public.workflow_stage_for_node(text)') is not null,
  'stage_node_valid_function', to_regprocedure('public.workflow_stage_node_is_valid(text,text)') is not null,
  'workflow_instances_rls', coalesce((
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'workflow_instances'
  ), false),
  'transition_executions_rls', coalesce((
    select c.relrowsecurity
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'workflow_transition_executions'
  ), false),
  'authenticated_can_insert_instance', has_table_privilege('authenticated', 'public.workflow_instances', 'INSERT'),
  'anon_can_insert_instance', has_table_privilege('anon', 'public.workflow_instances', 'INSERT'),
  'mapped_opportunities', (
    select count(*) from public.media_ecosystem_opportunities where ecosystem_status = 'ECOSYSTEM_MAPPED'
  ),
  'mapped_instances', (
    select count(*)
    from public.workflow_instances instance
    join public.media_ecosystem_opportunities opportunity on opportunity.id = instance.opportunity_id
    where opportunity.ecosystem_status = 'ECOSYSTEM_MAPPED'
  ),
  'non_mapped_instances', (
    select count(*)
    from public.workflow_instances instance
    join public.media_ecosystem_opportunities opportunity on opportunity.id = instance.opportunity_id
    where opportunity.ecosystem_status <> 'ECOSYSTEM_MAPPED'
  ),
  'history_versions', (
    select coalesce(jsonb_agg(version order by version), '[]'::jsonb)
    from supabase_migrations.schema_migrations
  )
) as data;
`;

export const cx0201SandboxRollbackProofSql = `
select jsonb_build_object(
  'workflow_instances_table', to_regclass('public.workflow_instances') is not null,
  'transition_executions_table', to_regclass('public.workflow_transition_executions') is not null,
  'compatibility_view', to_regclass('public.workflow_instance_compatibility_v') is not null,
  'stage_for_node_function', to_regprocedure('public.workflow_stage_for_node(text)') is not null,
  'stage_node_valid_function', to_regprocedure('public.workflow_stage_node_is_valid(text,text)') is not null
) as data;
`;

function rowsFromPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  throw new Error("CX-0201 sandbox proof returned an unsupported response shape.");
}

export function validateCx0201SandboxProof(proof) {
  const failures = [];
  for (const field of [
    "workflow_instances_table",
    "transition_executions_table",
    "compatibility_view",
    "stage_for_node_function",
    "stage_node_valid_function",
    "workflow_instances_rls",
    "transition_executions_rls"
  ]) {
    if (proof?.[field] !== true) failures.push(`${field} must be true.`);
  }
  if (proof?.authenticated_can_insert_instance !== false) {
    failures.push("authenticated must not have direct INSERT on workflow_instances.");
  }
  if (proof?.anon_can_insert_instance !== false) {
    failures.push("anon must not have direct INSERT on workflow_instances.");
  }
  if (Number(proof?.mapped_instances) !== Number(proof?.mapped_opportunities)) {
    failures.push("Every unambiguous ECOSYSTEM_MAPPED opportunity must have one workflow instance.");
  }
  if (Number(proof?.non_mapped_instances) !== 0) {
    failures.push("Historical states outside ECOSYSTEM_MAPPED must not be guessed during backfill.");
  }
  const history = Array.isArray(proof?.history_versions) ? proof.history_versions : [];
  for (const version of ["20260807120000", "20260809013000"]) {
    if (!history.includes(version)) failures.push(`Migration history is missing ${version}.`);
  }
  return failures;
}

export function validateCx0201SandboxRollbackProof(proof) {
  const failures = [];
  for (const field of [
    "workflow_instances_table",
    "transition_executions_table",
    "compatibility_view",
    "stage_for_node_function",
    "stage_node_valid_function"
  ]) {
    if (proof?.[field] !== false) failures.push(`${field} must be false after rollback.`);
  }
  return failures;
}

export async function collectCx0201SandboxProof({
  environment,
  fetchImpl = globalThis.fetch,
  expectRollback = false,
  target = "sandbox"
}) {
  let ref;
  if (target === "sandbox") {
    const project = await verifySandboxProjectIdentity({ environment, fetchImpl });
    const gate = sandboxRebuildGate(environment, {
      requireWrite: false,
      acceptAnySandboxWriteFlag: true,
      now: new Date(),
      project
    });
    if (gate.length > 0) throw new Error(`CX-0201 sandbox identity check failed: ${gate.join(" ")}`);
    ref = environment.SUPABASE_SANDBOX_PROJECT_REF;
  } else if (target === "staging") {
    const failures = validateMigrationEnvironment(environment, { requireReadOnly: true });
    if (failures.length > 0) throw new Error(`CX-0201 remote proof safety check failed: ${failures.join(" ")}`);
    ref = environment.SUPABASE_STAGING_PROJECT_REF;
    const identity = await fetchImpl(`https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}`, {
      headers: { Authorization: `Bearer ${environment.SUPABASE_ACCESS_TOKEN}` },
      signal: AbortSignal.timeout(60_000)
    });
    if (!identity.ok) throw new Error(`CX-0201 remote identity check returned HTTP ${identity.status}.`);
    const project = await identity.json();
    if (project?.id !== ref || project?.status !== "ACTIVE_HEALTHY") {
      throw new Error("CX-0201 remote identity does not match the configured active non-production project.");
    }
  } else {
    throw new Error(`Unsupported CX-0201 proof target: ${target}.`);
  }
  const response = await fetchImpl(
    `https://api.supabase.com/v1/projects/${encodeURIComponent(ref)}/database/query/read-only`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${environment.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query: expectRollback ? cx0201SandboxRollbackProofSql : cx0201SandboxProofSql }),
      signal: AbortSignal.timeout(120_000)
    }
  );
  if (!response.ok) throw new Error(`CX-0201 sandbox proof returned HTTP ${response.status}.`);
  const rows = rowsFromPayload(await response.json());
  const proof = rows[0]?.data;
  if (!proof || typeof proof !== "object") throw new Error("CX-0201 sandbox proof row is missing.");
  return {
    task_id: "CX-0201",
    target: target === "sandbox" ? "VERIFIED_DISPOSABLE_MIGRATION_SANDBOX" : "VERIFIED_NO_PRODUCTION_PROJECT",
    method: "SUPABASE_MANAGEMENT_API_READ_ONLY",
    captured_at: new Date().toISOString(),
    proof,
    failures: expectRollback ? validateCx0201SandboxRollbackProof(proof) : validateCx0201SandboxProof(proof)
  };
}

async function main() {
  const output = process.argv.find((argument) => argument.startsWith("--output="))?.slice("--output=".length);
  const expectRollback = process.argv.includes("--expect-rollback");
  const target = process.argv.find((argument) => argument.startsWith("--target="))?.slice("--target=".length) ?? "sandbox";
  try {
    const result = await collectCx0201SandboxProof({ environment: process.env, expectRollback, target });
    if (output) {
      const path = resolve(process.cwd(), output);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    }
    if (result.failures.length > 0) {
      console.error("CX-0201 sandbox proof failed:");
      for (const failure of result.failures) console.error(`- ${failure}`);
      process.exit(1);
    }
    console.log(expectRollback
      ? "CX-0201 sandbox rollback proof passed."
      : target === "staging"
        ? "CX-0201 remote proof passed."
        : "CX-0201 sandbox proof passed.");
    if (expectRollback) {
      console.log("additive_objects_remaining: 0");
      return;
    }
    console.log(`mapped_backfill: ${result.proof.mapped_instances}/${result.proof.mapped_opportunities}`);
    console.log(`non_mapped_backfill: ${result.proof.non_mapped_instances}`);
    console.log("browser_direct_inserts: denied");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "CX-0201 sandbox proof failed.");
    process.exit(1);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
