import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { createInitialMediaWorkflowState } from "./mediaWorkflowService";
import { createInitialSalesWorkflowState, salesWorkflowService } from "./salesWorkflowService";

describe("salesWorkflowService phase 5", () => {
  it("creates advertiser, opportunity, and proposal as sales manager", () => {
    const user = authService.createMockUser("sales_manager");
    const initialState = createInitialSalesWorkflowState();

    const advertiserResult = salesWorkflowService.createAdvertiser(initialState, user, {
      name: "Phase Five Brand",
      industry: "Gaming",
      region: "CN"
    });
    const opportunityResult = salesWorkflowService.createOpportunity(advertiserResult.state, user, {
      advertiserId: advertiserResult.state.advertisers[0].id,
      name: "Phase Five Launch",
      expectedBudget: 24000,
      painPoints: ["Need App supply", "Need clean launch readiness"]
    });
    const proposalResult = salesWorkflowService.createProposalFromOpportunity(
      opportunityResult.state,
      user,
      opportunityResult.state.opportunities[0].id
    );

    expect(advertiserResult.guard.allowed).toBe(true);
    expect(opportunityResult.guard.allowed).toBe(true);
    expect(proposalResult.guard.allowed).toBe(true);
    expect(proposalResult.state.proposals[0].status).toBe("media_validation");
    expect(proposalResult.state.businessEvents[0].eventCode).toBe("proposal.created");
  });

  it("evaluates publisher readiness when selecting media for a proposal", () => {
    const user = authService.createMockUser("sales_manager");
    const mediaState = createInitialMediaWorkflowState();
    let state = createInitialSalesWorkflowState();

    const readyResult = salesWorkflowService.selectPublisherForProposal(
      state,
      mediaState,
      user,
      "proposal-daily-yoga",
      "publisher-233",
      8000
    );
    state = readyResult.state;

    const limitedResult = salesWorkflowService.selectPublisherForProposal(
      state,
      mediaState,
      user,
      "proposal-daily-yoga",
      "publisher-quzhi",
      5000
    );
    state = limitedResult.state;

    const blockedResult = salesWorkflowService.selectPublisherForProposal(
      state,
      mediaState,
      user,
      "proposal-daily-yoga",
      "publisher-new-ctv",
      5000
    );

    expect(readyResult.guard.reason_code).toBe("PROPOSAL_PUBLISHER_ALLOWED");
    expect(limitedResult.guard.reason_code).toBe("LIMITED_SELLABLE_ALLOWED");
    expect(blockedResult.guard.reason_code).toBe("TECHNICAL_NOT_LIVE");
    expect(blockedResult.state.proposalMediaSelections[0].guard_status).toBe("blocked");
  });

  it("allows sales director proposal approval only when selected media is not blocked", () => {
    const user = authService.createMockUser("sales_director");
    const mediaState = createInitialMediaWorkflowState();
    const state = createInitialSalesWorkflowState();

    const approvedResult = salesWorkflowService.approveProposal(state, mediaState, user, "proposal-daily-yoga");
    const blockedResult = salesWorkflowService.approveProposal(state, mediaState, user, "proposal-blocked");

    expect(approvedResult.guard.allowed).toBe(true);
    expect(approvedResult.state.proposals.find((proposal) => proposal.id === "proposal-daily-yoga")?.status).toBe(
      "approved_to_send"
    );
    expect(blockedResult.guard.allowed).toBe(false);
    expect(blockedResult.guard.reason_code).toBe("PROPOSAL_MEDIA_BLOCKED");
  });

  it("moves an approved proposal into a campaign and blocks non-AdOps campaign creation", () => {
    const adopsUser = authService.createMockUser("adops_manager");
    const readonlyUser = authService.createMockUser("audit_viewer");
    const state = createInitialSalesWorkflowState();

    const campaignResult = salesWorkflowService.createCampaignFromProposal(state, adopsUser, "proposal-daily-yoga");
    const blockedResult = salesWorkflowService.createCampaignFromProposal(state, readonlyUser, "proposal-daily-yoga");

    expect(campaignResult.guard.allowed).toBe(true);
    expect(campaignResult.state.campaigns[0].proposal_id).toBe("proposal-daily-yoga");
    expect(campaignResult.state.campaigns[0].status).toBe("launch_check");
    expect(blockedResult.guard.allowed).toBe(false);
    expect(blockedResult.guard.reason_code).toBe("CAMPAIGN_CREATE_FORBIDDEN");
  });

  it("evaluates campaign launch allocation separately from final launch checklist approval", () => {
    const adopsUser = authService.createMockUser("adops_manager");
    const operationsUser = authService.createMockUser("operations_director");
    const mediaState = createInitialMediaWorkflowState();
    let state = createInitialSalesWorkflowState();

    const allocationResult = salesWorkflowService.addPublisherToCampaign(
      state,
      mediaState,
      adopsUser,
      "campaign-ready",
      "publisher-233",
      12000
    );
    state = allocationResult.state;

    const blockedAllocationResult = salesWorkflowService.addPublisherToCampaign(
      state,
      mediaState,
      adopsUser,
      "campaign-ready",
      "publisher-quzhi",
      3000
    );
    state = blockedAllocationResult.state;

    const checklistResult = salesWorkflowService.markLaunchChecklistPassed(state, adopsUser, "campaign-ready");
    const approvalResult = salesWorkflowService.approveCampaignLaunch(
      checklistResult.state,
      mediaState,
      operationsUser,
      "campaign-ready"
    );

    expect(allocationResult.guard.reason_code).toBe("CAMPAIGN_LAUNCH_ALLOWED");
    expect(blockedAllocationResult.guard.reason_code).toBe("COMMERCIAL_TEST_NOT_PASSED");
    expect(checklistResult.guard.allowed).toBe(true);
    expect(approvalResult.guard.allowed).toBe(true);
    expect(approvalResult.state.campaigns.find((campaign) => campaign.id === "campaign-ready")?.status).toBe("approved");
  });

  it("blocks operations launch approval when campaign media allocation is not fully ready", () => {
    const user = authService.createMockUser("operations_director");
    const mediaState = createInitialMediaWorkflowState();
    const state = createInitialSalesWorkflowState();

    const result = salesWorkflowService.approveCampaignLaunch(state, mediaState, user, "campaign-blocked");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("CAMPAIGN_ALLOCATION_BLOCKED");
  });
});
