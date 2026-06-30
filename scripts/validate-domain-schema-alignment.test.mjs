import { describe, expect, it } from "vitest";
import {
  extractOpportunityStageValuesFromDomain,
  extractOpportunityStageValuesFromSchema
} from "./validate-domain-schema-alignment.mjs";

describe("domain/schema alignment validation", () => {
  it("extracts Opportunity.stage values from TypeScript and SQL check constraints", () => {
    expect(
      extractOpportunityStageValuesFromDomain(
        'export type Opportunity = { stage: "discovery" | "need_confirmed" | "proposal_drafting"; };'
      )
    ).toEqual(["discovery", "need_confirmed", "proposal_drafting"]);

    expect(
      extractOpportunityStageValuesFromSchema(
        "constraint chk_opportunity_stage check (stage in ('discovery','need_confirmed','proposal_drafting'))"
      )
    ).toEqual(["discovery", "need_confirmed", "proposal_drafting"]);
  });
});
