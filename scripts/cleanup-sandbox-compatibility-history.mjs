import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { formatFailures, normalizeRef } from "./baselineSafety.mjs";
import { defaultExecuteBatch, sandboxRebuildGate, verifySandboxProjectIdentity } from "./db-sandbox-rebuild.mjs";
import {
  legacyLedgerVersions,
  loadCompatibilityManifest,
  validateRepositoryCompatibilityContract
} from "./migrationHistoryCompatibility.mjs";

export function legacyHistoryDeleteSql() {
  const versions = legacyLedgerVersions().map((version) => `'${version}'`).join(", ");
  return `delete from supabase_migrations.schema_migrations where version in (${versions});`;
}

export async function cleanupSandboxCompatibilityHistory({
  environment,
  project,
  manifest,
  apply = false,
  now = new Date(),
  executeBatchImpl = defaultExecuteBatch,
  readHistoryImpl = defaultReadMigrationHistory
}) {
  if (!apply) {
    return {
      overall: "BLOCKED",
      gate: ["Explicit --apply approval is required before sandbox migration history cleanup."],
      deleted_versions: [],
      remaining_versions: [],
      staging_source_write: false
    };
  }

  const gate = sandboxRebuildGate(environment, { requireWrite: true, project, now });
  if (gate.length > 0) {
    return {
      overall: "BLOCKED",
      gate,
      deleted_versions: [],
      remaining_versions: [],
      staging_source_write: false
    };
  }

  const baseUrl = "https://api.supabase.com/v1/projects";
  const sandboxRef = normalizeRef(environment.SUPABASE_SANDBOX_PROJECT_REF);
  const token = environment.SUPABASE_ACCESS_TOKEN;
  const cleanup = await executeBatchImpl(token, sandboxRef, baseUrl, legacyHistoryDeleteSql());
  if (cleanup.status !== "ok") {
    return {
      overall: "FAILED",
      gate: [],
      error: cleanup.error ?? "sandbox compatibility history cleanup failed",
      deleted_versions: [],
      remaining_versions: [],
      staging_source_write: false
    };
  }

  const remainingVersions = await readHistoryImpl(token, sandboxRef, baseUrl);
  const expected = [manifest.canonical_baseline.version];
  if (JSON.stringify(remainingVersions) !== JSON.stringify(expected)) {
    return {
      overall: "FAILED",
      gate: [],
      error: `sandbox migration history mismatch after cleanup: ${JSON.stringify(remainingVersions)}`,
      deleted_versions: legacyLedgerVersions(),
      remaining_versions: remainingVersions,
      staging_source_write: false
    };
  }

  return {
    overall: "SUCCESS",
    gate: [],
    deleted_versions: legacyLedgerVersions(),
    remaining_versions: remainingVersions,
    staging_source_write: false,
    finished_at: new Date().toISOString()
  };
}

export async function defaultReadMigrationHistory(token, projectRef, baseUrl, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(`${baseUrl}/${encodeURIComponent(projectRef)}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      query: "select version from supabase_migrations.schema_migrations order by version;"
    }),
    signal: AbortSignal.timeout(120_000)
  });
  if (!response.ok) throw new Error(`Sandbox migration history verification returned HTTP ${response.status}.`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error("Sandbox migration history verification returned an unexpected payload.");
  return rows.map((row) => String(row.version));
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const outputPath = args.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
  const manifest = loadCompatibilityManifest();
  const contractFailures = validateRepositoryCompatibilityContract(process.cwd(), manifest);
  if (contractFailures.length > 0) {
    console.error(formatFailures("Compatibility contract validation failed:", contractFailures));
    process.exit(1);
  }

  const project = await verifySandboxProjectIdentity({ environment: process.env });
  const result = await cleanupSandboxCompatibilityHistory({
    environment: process.env,
    project,
    manifest,
    apply,
    now: new Date()
  });
  if (outputPath) writeLog(outputPath, result);
  if (result.overall !== "SUCCESS") {
    const messages = result.gate.length > 0 ? result.gate : [result.error ?? "sandbox history cleanup failed"];
    console.error(formatFailures("Sandbox compatibility history cleanup failed:", messages));
    process.exit(1);
  }
  console.log("sandbox_history_cleanup: PASS");
  console.log(`remaining_versions: ${result.remaining_versions.join(",")}`);
  console.log("staging_source_writes: false");
}

function writeLog(path, value) {
  const outputPath = resolve(process.cwd(), path);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
