import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { baselineFileName } from "./validate-migration-chain.mjs";

const root = process.cwd();

// CX-0194 Gate A: the active migration chain is now the canonical baseline.
// The 24 pre-baseline migrations are archived as historical reference and are
// no longer part of the active chain, so static validation targets the baseline.
const files = {
  baseline: `supabase/migrations/${baselineFileName}`,
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
  // The proven canonical baseline legitimately contains 'passed' in CHECK constraints
  // (integration_check_results.status, uat_script_step_results.status); the legacy
  // generic-'passed' API-shape check applied to pre-baseline files only.
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
  if (!contents.baseline.includes(status) && !contents.seed.includes(status)) {
    failures.push(`locked status value missing from canonical baseline/seed: ${status}`);
  }
}

const createTableCount = [...contents.baseline.matchAll(/create table "public"\."/g)].length;
const createPolicyCount = [...contents.baseline.matchAll(/create policy /g)].length;

if (createTableCount < 150) {
  failures.push(`expected at least 150 tables in canonical baseline, found ${createTableCount}`);
}
if (createPolicyCount < 100) {
  failures.push(`expected at least 100 policies in canonical baseline, found ${createPolicyCount}`);
}
if (!contents.baseline.includes("approvals_write_business")) {
  failures.push("approvals_write_business policy must exist in the canonical baseline");
}
if (!contents.baseline.includes("audit_viewer") || !contents.baseline.includes("system_admin")) {
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
