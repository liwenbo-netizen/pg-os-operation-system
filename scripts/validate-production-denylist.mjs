import { fileURLToPath } from "node:url";
import {
  formatFailures,
  migrationSafetyMode,
  validateMigrationEnvironment
} from "./supabaseMigrationSafety.mjs";

function main() {
  const failures = validateMigrationEnvironment(process.env).filter((failure) =>
    failure.includes("Project Ref")
    || failure.includes("Host")
    || failure.startsWith("SUPABASE_STAGING_")
    || failure.startsWith("SUPABASE_PRODUCTION_")
    || failure.startsWith("PG_OS_DATABASE_ENV")
  );
  if (failures.length > 0) {
    console.error(formatFailures("Production denylist validation failed:", failures));
    process.exit(1);
  }

  console.log("Production denylist validation passed.");
  if (migrationSafetyMode(process.env) === "NO_PRODUCTION_PROJECT") {
    console.log("No-production-project declaration is current; a production denylist is not applicable.");
  } else {
    console.log("Staging and production identifiers differ.");
  }
  console.log("Project refs and hosts were not logged.");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) main();
