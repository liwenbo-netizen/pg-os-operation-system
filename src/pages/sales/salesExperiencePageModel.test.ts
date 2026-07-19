import { describe, expect, it } from "vitest";
import { createInitialSalesWorkflowState } from "../../services/salesWorkflowService";
import {
  getCampaignPrimaryAction,
  getOpportunityPrimaryAction,
  getProposalPrimaryAction,
  getSalesStatusLabel,
  resolveCreateOpportunityAdvertiserId
} from "./salesExperiencePageModel";

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

  it("guides opportunity, proposal, and campaign actions in business order", () => {
    const state = createInitialSalesWorkflowState();
    const opportunity = state.opportunities[0];
    const proposal = state.proposals[0];
    const campaign = state.campaigns[0];

    expect(getOpportunityPrimaryAction(opportunity, [])).toBe("createProposal");
    expect(getProposalPrimaryAction({ ...proposal, status: "draft" }, [], [])).toBe("selectMedia");
    expect(getProposalPrimaryAction({ ...proposal, status: "draft" }, state.proposalMediaSelections, [])).toBe("approveProposal");
    expect(getCampaignPrimaryAction({ ...campaign, launchChecklistPassed: false }, 1)).toBe("completeChecklist");
    expect(getCampaignPrimaryAction({ ...campaign, launchChecklistPassed: true }, 1)).toBe("approveLaunch");
  });

  it("localizes sales status without changing the stored value", () => {
    expect(getSalesStatusLabel("proposal_review", "zh-CN")).toBe("提案审核");
    expect(getSalesStatusLabel("proposal_review", "en-US")).toBe("Proposal review");
  });
});
