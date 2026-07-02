import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

function readText(root, fileName) {
  return readFileSync(resolve(root, fileName), "utf8");
}

function readJson(root, fileName) {
  return JSON.parse(readText(root, fileName));
}

export const phase30Migration = "supabase/migrations/202607020001_audit_logs_business_write_policy.sql";

export function validatePackageScripts(packageJson) {
  const scripts = packageJson.scripts ?? {};
  const failures = [];

  if (
    scripts["validate:phase30"] !==
    "vitest run scripts/validate-audit-log-business-rls-policy.test.mjs && node scripts/validate-audit-log-business-rls-policy.mjs --config-only"
  ) {
    failures.push("package.json validate:phase30 must run the audit log business RLS policy gate.");
  }

  if (!scripts["validate:phase29"]?.includes("validate-direct-business-audit-writes.mjs")) {
    failures.push("package.json must keep validate:phase29 wired to direct business audit writes.");
  }

  return failures;
}

export function validateAuditLogBusinessRlsPolicy(root) {
  const failures = [];
  const requiredFiles = [
    phase30Migration,
    "supabase/policies/rls_policies.sql",
    "supabase/README.md",
    "docs/development-package/phase-30-audit-logs-business-rls-policy.md"
  ];

  for (const fileName of requiredFiles) {
    if (!existsSync(resolve(root, fileName))) {
      failures.push(`${fileName} is required for Phase 30 audit log business RLS policy.`);
    }
  }

  if (failures.length > 0) {
    return failures;
  }

  const migration = readText(root, phase30Migration);
  const mirror = readText(root, "supabase/policies/rls_policies.sql");
  const readme = readText(root, "supabase/README.md");
  const report = readText(root, "docs/development-package/phase-30-audit-logs-business-rls-policy.md");

  for (const source of [migration, mirror]) {
    for (const expected of [
      "drop policy if exists audit_logs_insert_business",
      "create policy audit_logs_insert_business",
      "for insert with check",
      "actor_user_id = auth.uid()",
      "object_type in",
      "'publisher'",
      "'proposal'",
      "'campaign'",
      "'settlement'",
      "'contract'",
      "phase28_core_business_action",
      "not public.has_role('audit_viewer')",
      "drop policy if exists audit_logs_update_own_business",
      "create policy audit_logs_update_own_business",
      "for update using",
      "with check"
    ]) {
      if (!source.includes(expected)) {
        failures.push(`Audit log business RLS SQL must include ${expected}.`);
      }
    }
  }

  if (!readme.includes("202607020001_audit_logs_business_write_policy.sql")) {
    failures.push("supabase/README.md must list the Phase 30 migration in order.");
  }

  for (const expected of [
    "Phase 30",
    "audit_logs_insert_business",
    "audit_logs_update_own_business",
    "publisher.create",
    "npm run validate:phase30",
    "Supabase SQL Editor"
  ]) {
    if (!report.includes(expected)) {
      failures.push(`Phase 30 report must mention ${expected}.`);
    }
  }

  return failures;
}

function printFailures(title, failures) {
  console.error(title);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
}

async function main() {
  const configOnly = process.argv.includes("--config-only");
  const root = process.cwd();
  const failures = [
    ...validatePackageScripts(readJson(root, "package.json")),
    ...validateAuditLogBusinessRlsPolicy(root)
  ];

  if (failures.length > 0) {
    printFailures("Audit log business RLS policy validation failed:", failures);
    process.exit(1);
  }

  console.log("Audit log business RLS policy validation passed.");
  if (configOnly) {
    console.log("Config-only mode completed.");
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
