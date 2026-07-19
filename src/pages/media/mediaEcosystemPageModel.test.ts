import { describe, expect, it } from "vitest";
import type { MediaEcosystemLead, TrustedSupplyCandidate } from "../../types/domain";
import {
  getEcosystemPrimaryAction,
  getEcosystemQueueCopy,
  getEcosystemStageLabel,
  getEcosystemTrackLabel
} from "./mediaEcosystemPageModel";

const lead: MediaEcosystemLead = {
  id: "lead-1",
  media_name: "Demo Media",
  track: "SHORT_VIDEO_LIVE",
  region: "CN",
  stage: "ECOSYSTEM_MAPPED",
  owner_role: "media_manager",
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
  },
  user_scale_note: "-",
  ad_scenario_note: "-",
  advertiser_demand_note: "-",
  integration_feasibility: "unknown",
  media_contact_confirmed: false,
  business_interest_confirmed: false,
  ad_inventory_identified: false,
  risk_level: "medium",
  next_action: "Review"
};

describe("media ecosystem page model", () => {
  it("localizes domain labels without changing stored enum values", () => {
    expect(getEcosystemTrackLabel("SHORT_VIDEO_LIVE", "zh-CN")).toBe("短视频与直播");
    expect(getEcosystemStageLabel("TECH_FEASIBILITY_CHECK", "zh-CN")).toBe("技术可行性评估");
    expect(getEcosystemQueueCopy("NEEDS_OWNER", "zh-CN").label).toBe("待分配负责人");
    expect(getEcosystemTrackLabel("SHORT_VIDEO_LIVE", "en-US")).toBe("Short video and live");
  });

  it("recommends one action in workflow order", () => {
    expect(getEcosystemPrimaryAction(lead, undefined)).toBe("claimOwner");
    expect(getEcosystemPrimaryAction({ ...lead, owner_user_id: "user-1" }, undefined)).toBe("markReviewed");
    expect(
      getEcosystemPrimaryAction(
        { ...lead, owner_user_id: "user-1", review_required: false, data_quality_level: "MANUAL_REVIEWED" },
        undefined
      )
    ).toBe("priorityScreen");
  });

  it("continues the trusted supply readiness sequence", () => {
    const qualifiedLead: MediaEcosystemLead = {
      ...lead,
      owner_user_id: "user-1",
      review_required: false,
      data_quality_level: "MANUAL_REVIEWED",
      priority_score: 82,
      media_contact_confirmed: true,
      business_interest_confirmed: true,
      ad_inventory_identified: true,
      integration_feasibility: "feasible",
      media_director_approved_at: "2026-07-17T00:00:00Z"
    };
    const candidate: TrustedSupplyCandidate = {
      id: "candidate-1",
      lead_id: lead.id,
      media_name: lead.media_name,
      track: lead.track,
      priority_score: 82,
      status: "technical_review_passed",
      owner_role: "media_manager",
      created_at: "2026-07-17T00:00:00Z",
      evaluation_notes: "Ready"
    };

    expect(getEcosystemPrimaryAction(qualifiedLead, undefined)).toBe("trustedCandidate");
    expect(getEcosystemPrimaryAction(qualifiedLead, candidate)).toBe("commercialReview");
    expect(
      getEcosystemPrimaryAction(qualifiedLead, { ...candidate, status: "onboarding_project_created" }, false)
    ).toBe("confirmHandoff");
    expect(
      getEcosystemPrimaryAction(qualifiedLead, { ...candidate, status: "onboarding_project_created" }, true)
    ).toBeUndefined();
  });
});
