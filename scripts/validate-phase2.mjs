import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const files = {
  schema: "supabase/migrations/202606290001_base_schema.sql",
  rls: "supabase/migrations/202606290002_rls_policies.sql",
  seed: "supabase/seed/202606290003_uat_seed.sql"
};

const lockedStatusValues = [
  "technical_live_passed",
  "test_passed",
  "scale_ready",
  "proposal_selectable",
  "limited_sellable",
  "in_integration",
  "not_started",
  "not_allowed",
  "evidence_collection",
  "root_cause_analysis"
];

const forbiddenPatterns = [
  { label: "old ApiResponse shape", pattern: /\{\s*ok\s*:/ },
  { label: "legacy generic passed status", pattern: /(?<!test_|technical_live_)'passed'/ },
  { label: "legacy live_passed status", pattern: /(?<!technical_)live_passed/ },
  { label: "invalid generated flow typo", pattern: /technical_technical_live_passed/ },
  { label: "unsupported create policy if not exists", pattern: /create\s+policy\s+if\s+not\s+exists/i }
];

const contents = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(resolve(root, file), "utf8")])
);

const failures = [];

for (const [key, content] of Object.entries(contents)) {
  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(content)) {
      failures.push(`${files[key]} contains ${label}`);
    }
  }
}

for (const status of lockedStatusValues) {
  if (!contents.schema.includes(status) && !contents.seed.includes(status)) {
    failures.push(`locked status value missing from schema/seed: ${status}`);
  }
}

const createTableCount = [...contents.schema.matchAll(/create table if not exists public\./g)].length;
const dropPolicyCount = [...contents.rls.matchAll(/drop policy if exists /g)].length;
const createPolicyCount = [...contents.rls.matchAll(/create policy /g)].length;

if (createTableCount < 30) {
  failures.push(`expected at least 30 tables in base schema, found ${createTableCount}`);
}

if (dropPolicyCount === 0 || dropPolicyCount !== createPolicyCount) {
  failures.push(`policy drop/create count mismatch: drop=${dropPolicyCount}, create=${createPolicyCount}`);
}

if (!contents.rls.includes("not public.has_any_role(array['audit_viewer','system_admin'])")) {
  failures.push("approvals policy must continue excluding audit_viewer and system_admin writes");
}

if (failures.length > 0) {
  console.error("Phase 2 SQL validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Phase 2 SQL validation passed.");
console.log(`Tables: ${createTableCount}`);
console.log(`Policies: ${createPolicyCount}`);

