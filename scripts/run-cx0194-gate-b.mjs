import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  isSafeTemporaryProjectPath,
  loadCompatibilityManifest,
  materializeCompatibilityMigrations,
  parseDryRunPlan,
  parseMigrationList,
  redactCliOutput,
  validateAdoptedRemoteProbe,
  validateRemoteProbe,
  validateRepositoryCompatibilityContract
} from "./migrationHistoryCompatibility.mjs";
import { gateBRepairArguments, validateGateBInvocation } from "./cx0194GateB.mjs";
import { windowsCliOverride } from "./supabaseMigrationSafety.mjs";

function createTemporaryProject(root, manifest) {
  const base = resolve(tmpdir());
  const temporaryRoot = mkdtempSync(join(base, "pgos-cx0195-gate-b-"));
  const migrationsDirectory = join(temporaryRoot, "supabase", "migrations");
  mkdirSync(migrationsDirectory, { recursive: true });
  materializeCompatibilityMigrations({ destinationDirectory: migrationsDirectory, repositoryRoot: root, manifest });
  return { base, temporaryRoot };
}

function cleanupTemporaryProject(base, temporaryRoot) {
  if (!isSafeTemporaryProjectPath(base, temporaryRoot)) {
    throw new Error("Refused unsafe CX-0194 Gate B temporary cleanup target.");
  }
  rmSync(temporaryRoot, { recursive: true, force: true });
}

function runSupabase(root, temporaryRoot, args) {
  const environment = { ...process.env };
  const override = windowsCliOverride(root);
  if (override) environment.SUPABASE_CLI_BINARY_OVERRIDE = override;
  return spawnSync(process.execPath, [
    resolve(root, "node_modules", "supabase", "dist", "supabase.js"),
    ...args
  ], {
    cwd: temporaryRoot,
    env: environment,
    encoding: "utf8",
    windowsHide: true,
    timeout: 120_000
  });
}

function requireSuccess(name, result, secrets) {
  if (result.status === 0) return;
  const detail = redactCliOutput(`${result.stdout ?? ""}\n${result.stderr ?? ""}`, secrets).slice(0, 1200);
  throw new Error(`${name} failed.\n${detail}`);
}

function captureProbe(root, temporaryRoot, databaseUrl, secrets) {
  const common = ["--workdir", temporaryRoot, "--db-url", databaseUrl];
  const list = runSupabase(root, temporaryRoot, ["migration", "list", ...common]);
  const dryRun = runSupabase(root, temporaryRoot, ["db", "push", "--dry-run", ...common]);
  const includeAll = runSupabase(root, temporaryRoot, ["db", "push", "--dry-run", "--include-all", ...common]);
  requireSuccess("migration list", list, secrets);
  requireSuccess("db push --dry-run", dryRun, secrets);
  requireSuccess("db push --dry-run --include-all", includeAll, secrets);
  return {
    migrationRows: parseMigrationList(`${list.stdout ?? ""}\n${list.stderr ?? ""}`),
    defaultPlan: parseDryRunPlan(`${dryRun.stdout ?? ""}\n${dryRun.stderr ?? ""}`),
    includeAllPlan: parseDryRunPlan(`${includeAll.stdout ?? ""}\n${includeAll.stderr ?? ""}`)
  };
}

async function main() {
  const root = process.cwd();
  const manifest = loadCompatibilityManifest(root);
  const localFailures = validateRepositoryCompatibilityContract(root, manifest);
  const invocationFailures = validateGateBInvocation({
    environment: process.env,
    argv: process.argv.slice(2),
    manifest
  });
  const failures = [...localFailures, ...invocationFailures];
  if (failures.length > 0) throw new Error(failures.join("\n"));

  const databaseUrl = process.env.SUPABASE_STAGING_DB_URL;
  const secrets = [databaseUrl, process.env.SUPABASE_STAGING_DB_PASSWORD, process.env.SUPABASE_ACCESS_TOKEN];
  const { base, temporaryRoot } = createTemporaryProject(root, manifest);
  try {
    const before = captureProbe(root, temporaryRoot, databaseUrl, secrets);
    const beforeFailures = validateRemoteProbe({ ...before, manifest });
    if (beforeFailures.length > 0) throw new Error(beforeFailures.join("\n"));

    const repair = runSupabase(root, temporaryRoot, gateBRepairArguments({
      temporaryRoot,
      databaseUrl,
      manifest
    }));
    requireSuccess("canonical migration history adoption", repair, secrets);

    const after = captureProbe(root, temporaryRoot, databaseUrl, secrets);
    const afterFailures = validateAdoptedRemoteProbe({ ...after, manifest });
    if (afterFailures.length > 0) throw new Error(afterFailures.join("\n"));

    const evidence = {
      task_id: "CX-0194-GATE-B",
      captured_at: new Date().toISOString(),
      target_class: "NO_PRODUCTION_PROJECT",
      canonical_version: manifest.canonical_baseline.version,
      before: {
        aligned_legacy_versions: 66,
        canonical_history_present: false,
        planned_migrations: before.defaultPlan
      },
      write: {
        migration_history_rows_added: 1,
        schema_writes: 0,
        data_writes: 0
      },
      after: {
        aligned_history_versions: after.migrationRows.length,
        canonical_history_present: true,
        planned_migrations: after.defaultPlan
      },
      result: "PASS"
    };
    const outputPath = resolve(root, ".codex", "schema-baseline", "cx0194-gate-b-adoption.json");
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log("CX-0194 Gate B migration history adoption passed.");
    console.log(`canonical_version: ${manifest.canonical_baseline.version}`);
    console.log("migration_history_rows_added: 1");
    console.log("remote_schema_writes: 0");
    console.log("remote_data_writes: 0");
    console.log("post_adoption_plan: empty");
  } finally {
    cleanupTemporaryProject(base, temporaryRoot);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "CX-0194 Gate B failed.");
    process.exit(1);
  });
}
