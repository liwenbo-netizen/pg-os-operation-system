import { validateMigrationEnvironment } from "./supabaseMigrationSafety.mjs";

export const gateBWriteScope = "CX-0194_GATE_B_HISTORY_ONLY";
export const gateBApproval = "CX-0194-GATE-B";

export function validateGateBInvocation({ environment, argv, manifest }) {
  const failures = validateMigrationEnvironment(environment, {
    requireWrite: true,
    allowedNoProductionWriteScope: gateBWriteScope
  });
  if (!argv.includes("--apply")) failures.push("CX-0194 Gate B requires --apply.");
  if (!argv.includes(`--approved-task=${gateBApproval}`)) {
    failures.push(`CX-0194 Gate B requires --approved-task=${gateBApproval}.`);
  }
  if (argv.includes("--rollback")) failures.push("Apply and rollback cannot be requested together.");
  if (!/^\d{12,14}$/.test(manifest?.canonical_baseline?.version ?? "")) {
    failures.push("Canonical migration version is invalid.");
  }
  return [...new Set(failures)];
}

export function gateBRepairArguments({ temporaryRoot, databaseUrl, manifest }) {
  return [
    "migration",
    "repair",
    manifest.canonical_baseline.version,
    "--status",
    "applied",
    "--yes",
    "--workdir",
    temporaryRoot,
    "--db-url",
    databaseUrl
  ];
}
