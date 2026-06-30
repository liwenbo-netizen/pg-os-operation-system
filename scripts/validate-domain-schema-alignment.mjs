import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function extractOpportunityStageValuesFromDomain(contents) {
  const match = contents.match(/stage:\s*([^;]+);/);
  if (!match) {
    return [];
  }

  return [...match[1].matchAll(/"([^"]+)"/g)].map((value) => value[1]);
}

export function extractOpportunityStageValuesFromSchema(contents) {
  const match = contents.match(/constraint\s+chk_opportunity_stage\s+check\s*\(\s*stage\s+in\s*\(([^)]+)\)\s*\)/i);
  if (!match) {
    return [];
  }

  return [...match[1].matchAll(/'([^']+)'/g)].map((value) => value[1]);
}

function sameSet(left, right) {
  return left.length === right.length && left.every((value) => right.includes(value));
}

function main() {
  const root = process.cwd();
  const domain = readFileSync(resolve(root, "src/types/domain.ts"), "utf8");
  const schema = readFileSync(resolve(root, "supabase/migrations/202606290001_base_schema.sql"), "utf8");
  const migration = readFileSync(resolve(root, "supabase/migrations/202606290006_opportunity_stage_domain_alignment.sql"), "utf8");
  const domainValues = extractOpportunityStageValuesFromDomain(domain);
  const schemaValues = extractOpportunityStageValuesFromSchema(schema);
  const migrationValues = extractOpportunityStageValuesFromSchema(migration);
  const failures = [];

  if (domainValues.length === 0) {
    failures.push("Opportunity.stage values were not found in src/types/domain.ts.");
  }

  if (!sameSet(domainValues, schemaValues)) {
    failures.push(`base schema chk_opportunity_stage mismatch. domain=${domainValues.join(",")} schema=${schemaValues.join(",")}`);
  }

  if (!sameSet(domainValues, migrationValues)) {
    failures.push(`alignment migration chk_opportunity_stage mismatch. domain=${domainValues.join(",")} migration=${migrationValues.join(",")}`);
  }

  if (failures.length > 0) {
    console.error("Domain/schema alignment validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Domain/schema alignment validation passed.");
  console.log(`Opportunity.stage values: ${domainValues.join(", ")}`);
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
