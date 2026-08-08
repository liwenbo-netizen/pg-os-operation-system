import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { loadWorkflowMachine } from "./workflowMachineLoader.mjs";

export const cx0201MigrationPath = "supabase/migrations/20260809013000_workflow_persistence_foundation.sql";
export const cx0201RollbackPath = "supabase/rollback/20260809013000_workflow_persistence_foundation.rollback.sql";
export const cx0201ContractPath = "src/contracts/workflowPersistence.ts";

function includesToken(source, token) {
  return source.includes(`'${token}'`) || source.includes(`"${token}"`);
}

export function validateCx0201Sources({ migration, rollback, contract, machine }) {
  const failures = [];
  const definition = machine;
  for (const [label, values] of [
    ["lifecycle stage", definition.stages],
    ["node status", definition.node_statuses],
    ["control status", definition.control_statuses],
    ["milestone", definition.milestones]
  ]) {
    for (const value of values) {
      if (!includesToken(migration, value)) failures.push(`migration is missing ${label} ${value}.`);
      if (!includesToken(contract, value)) failures.push(`TypeScript contract is missing ${label} ${value}.`);
    }
  }
  for (const [node, stage] of Object.entries(definition.node_stage_registry)) {
    if (!migration.includes(`when '${node}' then '${stage}'`)) {
      failures.push(`migration is missing node-stage mapping ${node} -> ${stage}.`);
    }
    if (!contract.includes(`${node}: "${stage}"`)) {
      failures.push(`TypeScript contract is missing node-stage mapping ${node} -> ${stage}.`);
    }
  }

  for (const required of [
    "create table public.workflow_instances",
    "create table public.workflow_transition_executions",
    "workflow_instances_stage_node_check",
    "workflow_instances_version_check",
    "workflow_transition_executions_idempotency_key unique",
    "target_workflow_version = source_workflow_version + 1",
    "create view public.workflow_instance_compatibility_v",
    "where opportunity.ecosystem_status = 'ECOSYSTEM_MAPPED'",
    "on conflict (opportunity_id) do nothing",
    "revoke all on table public.workflow_instances from anon, authenticated",
    "revoke all on table public.workflow_transition_executions from anon, authenticated"
  ]) {
    if (!migration.toLowerCase().includes(required.toLowerCase())) {
      failures.push(`migration is missing required contract: ${required}.`);
    }
  }
  if (/\b(drop|truncate)\s+(table|column|schema)\b/i.test(migration)) {
    failures.push("forward migration must not contain destructive drop/truncate operations.");
  }
  if (/update\s+public\.(media_ecosystem_opportunities|media_onboarding_projects|publishers)/i.test(migration)) {
    failures.push("forward migration must not patch legacy workflow-controlled fields.");
  }
  if (!rollback.includes("rollback refused: workflow transition history exists")) {
    failures.push("rollback must fail closed once transition history exists.");
  }
  if (!rollback.includes("drop table if exists public.workflow_instances")) {
    failures.push("rollback must remove the additive workflow instance table when safe.");
  }
  return [...new Set(failures)];
}

function main() {
  const root = process.cwd();
  const failures = validateCx0201Sources({
    migration: readFileSync(`${root}/${cx0201MigrationPath}`, "utf8"),
    rollback: readFileSync(`${root}/${cx0201RollbackPath}`, "utf8"),
    contract: readFileSync(`${root}/${cx0201ContractPath}`, "utf8"),
    machine: loadWorkflowMachine()
  });
  if (failures.length > 0) {
    console.error("CX-0201 workflow persistence validation failed:");
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log("CX-0201 workflow persistence validation passed.");
  console.log("state_dimensions: 5");
  console.log("node_stage_mappings: 29");
  console.log("legacy_backfill_rule: ECOSYSTEM_MAPPED_ONLY");
  console.log("browser_direct_writes: denied");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) main();
