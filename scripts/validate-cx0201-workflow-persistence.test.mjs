import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadWorkflowMachine } from "./workflowMachineLoader.mjs";
import {
  cx0201ContractPath,
  cx0201MigrationPath,
  cx0201RollbackPath,
  validateCx0201Sources
} from "./validate-cx0201-workflow-persistence.mjs";

const sources = {
  migration: readFileSync(cx0201MigrationPath, "utf8"),
  rollback: readFileSync(cx0201RollbackPath, "utf8"),
  contract: readFileSync(cx0201ContractPath, "utf8"),
  machine: loadWorkflowMachine()
};

describe("CX-0201 workflow persistence migration", () => {
  it("matches the V2.5 registries and remains expand-only", () => {
    expect(validateCx0201Sources(sources)).toEqual([]);
  });

  it("fails when a node-stage mapping is missing", () => {
    const migration = sources.migration.replace(
      "when 'S2_HANDOVER_REVIEW' then 'S2_BUSINESS_FOLLOW_UP'",
      ""
    );
    expect(validateCx0201Sources({ ...sources, migration }))
      .toContain("migration is missing node-stage mapping S2_HANDOVER_REVIEW -> S2_BUSINESS_FOLLOW_UP.");
  });

  it("fails on destructive forward SQL or widened legacy backfill", () => {
    const migration = `${sources.migration}\ndrop table public.publishers;`;
    expect(validateCx0201Sources({ ...sources, migration }))
      .toContain("forward migration must not contain destructive drop/truncate operations.");
    expect(validateCx0201Sources({
      ...sources,
      migration: sources.migration.replace(
        "where opportunity.ecosystem_status = 'ECOSYSTEM_MAPPED'",
        "where opportunity.ecosystem_status is not null"
      )
    })).toContain("migration is missing required contract: where opportunity.ecosystem_status = 'ECOSYSTEM_MAPPED'.");
  });
});
