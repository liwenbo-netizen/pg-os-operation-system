import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { chinaMediaEcosystemService } from "./chinaMediaEcosystemService";
import { createInitialMediaWorkflowState } from "./mediaWorkflowService";

const user = authService.createMockUser.bind(authService);

describe("ChinaMediaEcosystemService", () => {
  it("calculates the locked 100-point priority score", () => {
    expect(
      chinaMediaEcosystemService.calculatePriorityScore({
        strategic_value: 99,
        user_scale_growth: 99,
        ad_scenario_value: 15,
        programmatic_feasibility: 15,
        advertiser_demand_match: 15,
        commercial_negotiability: 10,
        risk_compliance_control: 10
      })
    ).toBe(100);
  });

  it("summarizes ecosystem leads without treating every mapped media as a target", () => {
    const state = createInitialMediaWorkflowState();
    const summary = chinaMediaEcosystemService.getSummary(state);

    expect(summary).toMatchObject({
      totalLeads: 5,
      activeLeads: 3,
      highPriority: 2,
      outreachPipeline: 2,
      eligibleForTrustedSupply: 1,
      trustedCandidates: 0
    });
  });

  it("blocks trusted supply candidate creation until all business gates pass", () => {
    const state = createInitialMediaWorkflowState();
    const result = chinaMediaEcosystemService.createTrustedSupplyCandidate(
      state,
      user("media_manager"),
      "ecosystem-lead-smart-tv-oem"
    );

    expect(result.guard).toMatchObject({
      allowed: false,
      reason_code: "TRUSTED_SUPPLY_GATE_BLOCKED"
    });
    expect(result.state.trustedSupplyCandidates).toHaveLength(0);
  });

  it("requires seed-only opportunities to be manually reviewed before scoring progression", () => {
    let state = createInitialMediaWorkflowState();
    const leadId = "ecosystem-lead-seed-only";
    state = {
      ...state,
      mediaEcosystemLeads: [
        {
          ...state.mediaEcosystemLeads[0],
          id: leadId,
          media_name: "Seed Only Media",
          stage: "ECOSYSTEM_MAPPED",
          verification_status: "UNVERIFIED",
          data_quality_level: "SEED_ONLY",
          review_required: true,
          priority_score: 0,
          score_breakdown: {
            strategic_value: 0,
            user_scale_growth: 0,
            ad_scenario_value: 0,
            programmatic_feasibility: 0,
            advertiser_demand_match: 0,
            commercial_negotiability: 0,
            risk_compliance_control: 0
          }
        }
      ],
      mediaOutreachActivities: []
    };

    const blockedScore = chinaMediaEcosystemService.applyManualScore(state, user("media_manager"), leadId, {
      strategic_value: 18,
      user_scale_growth: 12,
      ad_scenario_value: 12,
      programmatic_feasibility: 11,
      advertiser_demand_match: 12,
      commercial_negotiability: 5,
      risk_compliance_control: 5
    });

    expect(blockedScore.guard).toMatchObject({
      allowed: false,
      reason_code: "SEED_REVIEW_REQUIRED"
    });

    const claimed = chinaMediaEcosystemService.claimLeadOwner(state, user("media_manager"), leadId);
    expect(claimed.guard).toMatchObject({
      allowed: true,
      reason_code: "ECOSYSTEM_OWNER_ASSIGNED"
    });
    state = claimed.state;

    const reviewed = chinaMediaEcosystemService.markManualReviewed(state, user("media_manager"), leadId);
    expect(reviewed.state.mediaEcosystemLeads[0]).toMatchObject({
      verification_status: "IN_REVIEW",
      data_quality_level: "MANUAL_REVIEWED",
      review_required: false
    });
    state = reviewed.state;

    const scored = chinaMediaEcosystemService.applyManualScore(state, user("media_manager"), leadId, {
      strategic_value: 18,
      user_scale_growth: 12,
      ad_scenario_value: 12,
      programmatic_feasibility: 11,
      advertiser_demand_match: 12,
      commercial_negotiability: 5,
      risk_compliance_control: 5
    });

    expect(scored.guard).toMatchObject({
      allowed: true,
      reason_code: "ECOSYSTEM_SCORE_OUTREACH_READY"
    });
    expect(scored.state.mediaEcosystemLeads[0]).toMatchObject({
      priority_score: 75,
      stage: "OUTREACH_READY",
      owner_role: "media_manager"
    });
    expect(scored.state.businessEvents.map((event) => event.eventCode)).toEqual(
      expect.arrayContaining([
        "china_media_ecosystem.owner_assigned",
        "china_media_ecosystem.manual_reviewed",
        "china_media_ecosystem.score_applied"
      ])
    );
  });

  it("moves a qualified ecosystem lead into trusted candidate and onboarding project", () => {
    let state = createInitialMediaWorkflowState();

    const candidate = chinaMediaEcosystemService.createTrustedSupplyCandidate(
      state,
      user("media_manager"),
      "ecosystem-lead-redbook"
    );
    expect(candidate.guard).toMatchObject({
      allowed: true,
      reason_code: "TRUSTED_SUPPLY_CANDIDATE_CREATED"
    });
    state = candidate.state;
    expect(state.trustedSupplyCandidates[0]).toMatchObject({
      media_name: "RedBook Lifestyle Community",
      status: "candidate"
    });
    expect(state.mediaEcosystemLeads.find((lead) => lead.id === "ecosystem-lead-redbook")).toMatchObject({
      stage: "TRUSTED_SUPPLY_CANDIDATE"
    });

    const onboarding = chinaMediaEcosystemService.createOnboardingProject(
      state,
      user("media_manager"),
      state.trustedSupplyCandidates[0].id
    );
    expect(onboarding.guard).toMatchObject({
      allowed: true,
      reason_code: "ONBOARDING_PROJECT_CREATED"
    });
    expect(onboarding.state.publishers[0]).toMatchObject({
      name: "RedBook Lifestyle Community",
      technical_live_status: "draft",
      sales_scale_status: "not_allowed"
    });
    expect(onboarding.state.integrationProjects[0]).toMatchObject({
      publisher_id: onboarding.state.publishers[0].id,
      status: "pending_integration"
    });
    expect(onboarding.state.mediaEcosystemLeads.find((lead) => lead.id === "ecosystem-lead-redbook")).toMatchObject({
      stage: "ONBOARDING_PROJECT_CREATED",
      linked_publisher_id: onboarding.state.publishers[0].id
    });
    expect(onboarding.state.businessEvents.map((event) => event.eventCode)).toEqual(
      expect.arrayContaining([
        "china_media_ecosystem.trusted_candidate_created",
        "china_media_ecosystem.onboarding_project_created"
      ])
    );
  });

  it("keeps audit viewers read-only for ecosystem operations", () => {
    const state = createInitialMediaWorkflowState();
    const result = chinaMediaEcosystemService.recordContacted(
      state,
      user("audit_viewer"),
      "ecosystem-lead-smart-tv-oem"
    );

    expect(result.guard).toMatchObject({
      allowed: false,
      reason_code: "ECOSYSTEM_MANAGE_FORBIDDEN"
    });
    expect(result.state.mediaEcosystemLeads.find((lead) => lead.id === "ecosystem-lead-smart-tv-oem")).toMatchObject({
      media_contact_confirmed: false,
      stage: "OUTREACH_READY"
    });
  });
});
