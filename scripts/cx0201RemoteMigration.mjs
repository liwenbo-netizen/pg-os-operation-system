import { legacyLedgerVersions } from "./migrationHistoryCompatibility.mjs";
import { validateMigrationEnvironment } from "./supabaseMigrationSafety.mjs";

export const cx0201WriteScope = "CX-0201_WORKFLOW_PERSISTENCE";
export const cx0201Approval = "CX-0201";
export const cx0201MigrationFile = "20260809013000_workflow_persistence_foundation.sql";
export const cx0201MigrationVersion = "20260809013000";
export const canonicalMigrationVersion = "20260807120000";

export function validateCx0201RemoteInvocation({ environment, argv }) {
  const apply = argv.includes("--apply");
  const dryRun = argv.includes("--dry-run");
  const failures = validateMigrationEnvironment(environment, apply
    ? { requireWrite: true, allowedNoProductionWriteScope: cx0201WriteScope }
    : { requireReadOnly: true });
  if (apply === dryRun) failures.push("CX-0201 requires exactly one of --dry-run or --apply.");
  if (apply && !argv.includes(`--approved-task=${cx0201Approval}`)) {
    failures.push(`CX-0201 apply requires --approved-task=${cx0201Approval}.`);
  }
  return [...new Set(failures)];
}

function expectedVersions() {
  return [...legacyLedgerVersions(), canonicalMigrationVersion, cx0201MigrationVersion];
}

export function validateCx0201RemotePreflight({ migrationRows, defaultPlan, includeAllPlan }) {
  const failures = [];
  const rows = new Map(migrationRows.map((row) => [row.local, row]));
  for (const version of [...legacyLedgerVersions(), canonicalMigrationVersion]) {
    if (rows.get(version)?.remote !== version) failures.push(`Remote history is not aligned at ${version}.`);
  }
  const pending = rows.get(cx0201MigrationVersion);
  if (!pending || pending.remote) failures.push(`${cx0201MigrationVersion} must be local-only before CX-0201 apply.`);
  if (migrationRows.length !== expectedVersions().length) {
    failures.push(`CX-0201 preflight must expose exactly ${expectedVersions().length} migration rows.`);
  }
  for (const [name, plan] of [["default", defaultPlan], ["include-all", includeAllPlan]]) {
    if (JSON.stringify(plan) !== JSON.stringify([cx0201MigrationFile])) {
      failures.push(`${name} dry-run must plan only ${cx0201MigrationFile}.`);
    }
  }
  return failures;
}

export function validateCx0201RemotePostflight({ migrationRows, defaultPlan, includeAllPlan }) {
  const failures = [];
  const rows = new Map(migrationRows.map((row) => [row.local, row]));
  for (const version of expectedVersions()) {
    if (rows.get(version)?.remote !== version) failures.push(`Remote history is not aligned at ${version}.`);
  }
  if (migrationRows.length !== expectedVersions().length) {
    failures.push(`CX-0201 postflight must expose exactly ${expectedVersions().length} migration rows.`);
  }
  if (defaultPlan.length > 0) failures.push("Default dry-run must be empty after CX-0201 apply.");
  if (includeAllPlan.length > 0) failures.push("Include-all dry-run must be empty after CX-0201 apply.");
  return failures;
}

export function cx0201PushArguments({ temporaryRoot, databaseUrl }) {
  return ["db", "push", "--yes", "--workdir", temporaryRoot, "--db-url", databaseUrl];
}
