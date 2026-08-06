import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  approvedSupabaseCliVersion,
  formatFailures,
  loadSupabaseCliContract,
  windowsCliOverride
} from "./supabaseMigrationSafety.mjs";

export function validateSupabaseCli(root = process.cwd()) {
  const contract = loadSupabaseCliContract(root);
  if (contract.failures.length > 0) return contract.failures;

  const environment = { ...process.env };
  const override = windowsCliOverride(root);
  if (override) environment.SUPABASE_CLI_BINARY_OVERRIDE = override;

  const command = process.platform === "win32"
    ? (process.env.ComSpec ?? "cmd.exe")
    : "npx";
  const args = process.platform === "win32"
    ? ["/d", "/s", "/c", "npx.cmd supabase --version"]
    : ["supabase", "--version"];
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: environment,
    windowsHide: true
  });
  if (result.status !== 0) {
    return ["Project-local Supabase CLI could not be executed."];
  }
  if (result.stdout.trim() !== approvedSupabaseCliVersion) {
    return [`Supabase CLI must report ${approvedSupabaseCliVersion}.`];
  }

  return [];
}

function main() {
  const failures = validateSupabaseCli();
  if (failures.length > 0) {
    console.error(formatFailures("Supabase CLI validation failed:", failures));
    process.exit(1);
  }

  console.log(`Supabase CLI validation passed: ${approvedSupabaseCliVersion}.`);
  console.log("Execution method: project devDependency via npx supabase.");
  console.log("Docker was not started or required.");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) main();
