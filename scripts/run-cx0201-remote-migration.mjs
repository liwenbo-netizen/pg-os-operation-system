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
  validateRepositoryCompatibilityContract
} from "./migrationHistoryCompatibility.mjs";
import {
  cx0201MigrationFile,
  cx0201MigrationVersion,
  cx0201PushArguments,
  validateCx0201RemoteInvocation,
  validateCx0201RemotePostflight,
  validateCx0201RemotePreflight
} from "./cx0201RemoteMigration.mjs";
import { windowsCliOverride } from "./supabaseMigrationSafety.mjs";

function createTemporaryProject(root, manifest) {
  const base = resolve(tmpdir());
  const temporaryRoot = mkdtempSync(join(base, "pgos-cx0195-cx0201-"));
  const migrationsDirectory = join(temporaryRoot, "supabase", "migrations");
  mkdirSync(migrationsDirectory, { recursive: true });
  materializeCompatibilityMigrations({ destinationDirectory: migrationsDirectory, repositoryRoot: root, manifest });
  return { base, temporaryRoot };
}

function cleanupTemporaryProject(base, temporaryRoot) {
  if (!isSafeTemporaryProjectPath(base, temporaryRoot)) throw new Error("Refused unsafe CX-0201 temporary cleanup target.");
  rmSync(temporaryRoot, { recursive: true, force: true });
}

function runSupabase(root, temporaryRoot, args) {
  const environment = { ...process.env };
  const override = windowsCliOverride(root);
  if (override) environment.SUPABASE_CLI_BINARY_OVERRIDE = override;
  return spawnSync(process.execPath, [resolve(root, "node_modules", "supabase", "dist", "supabase.js"), ...args], {
    cwd: temporaryRoot,
    env: environment,
    encoding: "utf8",
    windowsHide: true,
    timeout: 180_000
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
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const manifest = loadCompatibilityManifest(root);
  const failures = [
    ...validateRepositoryCompatibilityContract(root, manifest),
    ...validateCx0201RemoteInvocation({ environment: process.env, argv })
  ];
  if (failures.length > 0) throw new Error(failures.join("\n"));

  const databaseUrl = process.env.SUPABASE_STAGING_DB_URL;
  const secrets = [databaseUrl, process.env.SUPABASE_STAGING_DB_PASSWORD, process.env.SUPABASE_ACCESS_TOKEN];
  const { base, temporaryRoot } = createTemporaryProject(root, manifest);
  try {
    const before = captureProbe(root, temporaryRoot, databaseUrl, secrets);
    const beforeFailures = validateCx0201RemotePreflight(before);
    if (beforeFailures.length > 0) throw new Error(beforeFailures.join("\n"));

    if (!apply) {
      console.log("CX-0201 remote dry-run passed.");
      console.log(`planned_migration: ${cx0201MigrationFile}`);
      console.log("remote_writes: 0");
      return;
    }

    const push = runSupabase(root, temporaryRoot, cx0201PushArguments({ temporaryRoot, databaseUrl }));
    requireSuccess("CX-0201 db push", push, secrets);
    const after = captureProbe(root, temporaryRoot, databaseUrl, secrets);
    const afterFailures = validateCx0201RemotePostflight(after);
    if (afterFailures.length > 0) throw new Error(afterFailures.join("\n"));

    const evidence = {
      task_id: "CX-0201",
      captured_at: new Date().toISOString(),
      target_class: "NO_PRODUCTION_PROJECT",
      migration_version: cx0201MigrationVersion,
      planned_before: before.defaultPlan,
      applied_migrations: [cx0201MigrationFile],
      planned_after: after.defaultPlan,
      result: "PASS"
    };
    const output = resolve(root, ".codex", "schema-baseline", "cx0201-remote-apply.json");
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log("CX-0201 remote migration passed.");
    console.log(`migration_applied: ${cx0201MigrationFile}`);
    console.log("post_apply_plan: empty");
  } finally {
    cleanupTemporaryProject(base, temporaryRoot);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : "CX-0201 remote migration failed.");
    process.exit(1);
  });
}
