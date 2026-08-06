import { describe, expect, it } from "vitest";
import {
  extractOpportunityStageValuesFromDomain,
  extractOpportunityStageValuesFromSchema,
  validateOpportunityStageAlignment
} from "./validate-domain-schema-alignment.mjs";

describe("domain/schema alignment validation", () => {
  const schema = "constraint chk_opportunity_stage check (stage in ('A','B'))";

  it("extracts Opportunity.stage values from a normal interface and SQL check constraint", () => {
    expect(
      extractOpportunityStageValuesFromDomain(
        "export interface Opportunity { stage: 'A' | 'B'; }"
      )
    ).toEqual(["A", "B"]);

    expect(
      extractOpportunityStageValuesFromSchema(
        schema
      )
    ).toEqual(["A", "B"]);
  });

  it("ignores stage fields declared before Opportunity", () => {
    expect(
      extractOpportunityStageValuesFromDomain(`
        interface OtherEntity { stage: "OTHER_A" | "OTHER_B"; }
        interface Opportunity { stage: "A" | "B"; }
      `)
    ).toEqual(["A", "B"]);
  });

  it("ignores stage fields declared after Opportunity", () => {
    expect(
      extractOpportunityStageValuesFromDomain(`
        interface Opportunity { stage: "A" | "B"; }
        interface AnotherEntity { stage: "OTHER_C"; }
      `)
    ).toEqual(["A", "B"]);
  });

  it("supports Opportunity.stage after other properties, comments, newlines, and indentation", () => {
    expect(
      extractOpportunityStageValuesFromDomain(`
        export type Opportunity = {
          id: string;
          // The sales workflow stage.
          stage:
            "A"
            | "B";
          name: string;
        };
      `)
    ).toEqual(["A", "B"]);
  });

  it("reports actual TypeScript and database value differences", () => {
    const result = validateOpportunityStageAlignment({
      domain: 'export interface Opportunity { stage: "A" | "C"; }',
      schema,
      migration: schema
    });

    expect(result.failures).toEqual([
      "Base schema chk_opportunity_stage mismatch. TypeScript missing values: B. Database missing values: C.",
      "Alignment migration chk_opportunity_stage mismatch. TypeScript missing values: B. Database missing values: C."
    ]);
  });

  it("fails explicitly when Opportunity.stage is missing", () => {
    const result = validateOpportunityStageAlignment({
      domain: 'export interface Opportunity { id: string; }',
      schema,
      migration: schema
    });

    expect(result.failures).toEqual(["TypeScript Opportunity.stage extraction failed: Opportunity.stage property was not found."]);
  });

  it("fails explicitly when Opportunity is missing", () => {
    const result = validateOpportunityStageAlignment({
      domain: 'export interface OtherEntity { stage: "A" | "B"; }',
      schema,
      migration: schema
    });

    expect(result.failures).toEqual(["TypeScript Opportunity.stage extraction failed: Opportunity type or interface declaration was not found."]);
  });

  it("fails explicitly when multiple Opportunity declarations exist", () => {
    const result = validateOpportunityStageAlignment({
      domain: `
        interface Opportunity { stage: "A"; }
        type Opportunity = { stage: "B"; };
      `,
      schema,
      migration: schema
    });

    expect(result.failures).toEqual(["TypeScript Opportunity.stage extraction failed: Expected exactly one Opportunity declaration, found 2."]);
  });
});
