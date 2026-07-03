import { describe, expect, it } from "vitest";
import { createInitialSalesWorkflowState } from "../../services/salesWorkflowService";
import { resolveCreateOpportunityAdvertiserId } from "./salesExperiencePageModel";

describe("salesExperiencePageModel", () => {
  it("binds new opportunities to the newest available advertiser instead of a fixture id", () => {
    const initialState = createInitialSalesWorkflowState();
    const newAdvertiser = {
      ...initialState.advertisers[0],
      id: "supabase-generated-advertiser-id",
      name: "Supabase Generated Advertiser"
    };
    const state = {
      ...initialState,
      advertisers: [newAdvertiser, ...initialState.advertisers]
    };

    expect(resolveCreateOpportunityAdvertiserId(state)).toBe("supabase-generated-advertiser-id");
  });

  it("returns undefined when no advertiser context is available", () => {
    const state = {
      ...createInitialSalesWorkflowState(),
      advertisers: []
    };

    expect(resolveCreateOpportunityAdvertiserId(state)).toBeUndefined();
  });
});
