import { fileURLToPath } from "node:url";
import {
  formatFailures,
  migrationSafetyMode,
  migrationWriteStatus,
  validateMigrationEnvironment
} from "./supabaseMigrationSafety.mjs";

export function validateCurrentMigrationEnvironment(options = {}) {
  return validateMigrationEnvironment(process.env, options);
}

function main() {
  const requireWrite = process.argv.includes("--require-write");
  const requireReadOnly = process.argv.includes("--read-only");
  const failures = validateCurrentMigrationEnvironment({ requireWrite, requireReadOnly });
  if (failures.length > 0) {
    console.error(formatFailures("Migration environment validation failed:", failures));
    process.exit(1);
  }

  console.log("Migration environment validation passed.");
  console.log("Target marker: staging.");
  console.log(`Safety mode: ${migrationSafetyMode(process.env)}.`);
  const write = migrationWriteStatus(process.env);
  console.log(`write_status: ${write.write_status}`);
  console.log(`reason: ${write.reason}`);
  console.log("Project refs, hosts, URLs, passwords, and tokens were not logged.");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) main();
