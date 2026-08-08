import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  loadCompatibilityManifest,
  isSafeTemporaryProjectPath,
  materializeCompatibilityMigrations,
  parseDryRunPlan,
  parseMigrationList,
  redactCliOutput,
  validateAdoptedRemoteProbe,
  validateRemoteProbe,
  validateRepositoryCompatibilityContract
} from "./migrationHistoryCompatibility.mjs";
import { validateMigrationEnvironment, windowsCliOverride } from "./supabaseMigrationSafety.mjs";

function materializeTemporaryProject(root, manifest) {
  const base = resolve(tmpdir());
  const temporaryRoot = mkdtempSync(join(base, "pgos-cx0195-"));
  const supabaseDirectory = join(temporaryRoot, "supabase");
  const migrationsDirectory = join(supabaseDirectory, "migrations");
  mkdirSync(migrationsDirectory, { recursive: true });
  materializeCompatibilityMigrations({ destinationDirectory: migrationsDirectory, repositoryRoot: root, manifest });
  return { base, temporaryRoot };
}

function cleanupTemporaryProject(base, temporaryRoot) {
  const resolved = resolve(temporaryRoot);
  if (!isSafeTemporaryProjectPath(base, resolved)) {
    throw new Error("Refused unsafe CX-0195 temporary cleanup target.");
  }
  rmSync(resolved, { recursive: true, force: true });
}

function runSupabase(root, temporaryRoot, args) {
  const shim = resolve(root, "node_modules", "supabase", "dist", "supabase.js");
  const environment = { ...process.env };
  const override = windowsCliOverride(root);
  if (override) environment.SUPABASE_CLI_BINARY_OVERRIDE = override;
  return spawnSync(process.execPath, [shim, ...args], {
    cwd: temporaryRoot,
    env: environment,
    encoding: "utf8",
    windowsHide: true,
    timeout: 120_000
  });
}

export function validateLocalCompatibility(root = process.cwd()) {
  const manifest = loadCompatibilityManifest(root);
  return { manifest, failures: validateRepositoryCompatibilityContract(root, manifest) };
}

async function main() {
  const root = process.cwd();
  const remoteReadOnly = process.argv.includes("--remote-read-only");
  const remoteAdoptedReadOnly = process.argv.includes("--remote-adopted-read-only");
  const { manifest, failures } = validateLocalCompatibility(root);
  if (failures.length > 0) throw new Error(failures.join("\n"));

  const { base, temporaryRoot } = materializeTemporaryProject(root, manifest);
  try {
    if (!remoteReadOnly && !remoteAdoptedReadOnly) {
      console.log("Migration history compatibility validation passed.");
      console.log("legacy_runtime_markers: 66");
      console.log("repository_active_chain: canonical_first_with_incrementals");
      console.log("remote_writes: 0");
      return;
    }

    const environmentFailures = validateMigrationEnvironment(process.env, { requireReadOnly: true });
    if (environmentFailures.length > 0) throw new Error(environmentFailures.join("\n"));
    const databaseUrl = process.env.SUPABASE_STAGING_DB_URL;
    const common = ["--workdir", temporaryRoot, "--db-url", databaseUrl];
    const list = runSupabase(root, temporaryRoot, ["migration", "list", ...common]);
    const dryRun = runSupabase(root, temporaryRoot, ["db", "push", "--dry-run", ...common]);
    const includeAll = runSupabase(root, temporaryRoot, ["db", "push", "--dry-run", "--include-all", ...common]);
    const secrets = [databaseUrl, process.env.SUPABASE_STAGING_DB_PASSWORD];
    for (const [name, result] of [["migration list", list], ["db push --dry-run", dryRun], ["db push --dry-run --include-all", includeAll]]) {
      if (result.status !== 0) {
        const detail = redactCliOutput(`${result.stdout ?? ""}\n${result.stderr ?? ""}`, secrets).slice(0, 1000);
        throw new Error(`${name} failed without performing a write.\n${detail}`);
      }
    }
    const probe = {
      migrationRows: parseMigrationList(`${list.stdout ?? ""}\n${list.stderr ?? ""}`),
      defaultPlan: parseDryRunPlan(`${dryRun.stdout ?? ""}\n${dryRun.stderr ?? ""}`),
      includeAllPlan: parseDryRunPlan(`${includeAll.stdout ?? ""}\n${includeAll.stderr ?? ""}`),
      manifest
    };
    const probeFailures = remoteAdoptedReadOnly
      ? validateAdoptedRemoteProbe(probe)
      : validateRemoteProbe(probe);
    if (probeFailures.length > 0) throw new Error(probeFailures.join("\n"));
    console.log(remoteAdoptedReadOnly
      ? "Remote adopted migration history verification passed."
      : "Remote migration history compatibility dry-run passed.");
    console.log(remoteAdoptedReadOnly ? "history_versions_aligned: 67" : "legacy_versions_aligned: 66");
    console.log(remoteAdoptedReadOnly
      ? "planned_migrations: 0"
      : `planned_migration: ${manifest.canonical_baseline.file}`);
    console.log("remote_schema_writes: 0");
    console.log("remote_data_writes: 0");
    console.log("remote_history_writes: 0");
  } finally {
    cleanupTemporaryProject(base, temporaryRoot);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "Migration history compatibility validation failed.");
    process.exit(1);
  });
}
