import { describe, expect, it } from "vitest";
import {
  buildCm5bAuditRecoveryPlan,
  buildCm5bExecutionPlan,
  selectCm5bCandidate,
  validateCm5bGate
} from "./cm5b-live-uat-lib.mjs";

const candidate = (status) => ({
  id: `candidate-${status}`,
  lead_id: "lead-1",
  media_name: "CM-5B Media",
  status,
  created_at: "2026-07-16T00:00:00.000Z"
});

const validLead = {
  id: "lead-1",
  data_quality_level: "VERIFIED",
  priority_score: 86,
  media_contact_confirmed: true,
  business_interest_confirmed: true,
  ad_inventory_identified: true,
  integration_feasibility: "feasible",
  media_director_approved_at: "2026-07-15T00:00:00.000Z"
};

describe("CM-5B live UAT planner", () => {
  it("plans all transitions from candidate", () => {
    expect(buildCm5bExecutionPlan(candidate("candidate")).map((step) => step.toStatus)).toEqual([
      "readiness_started",
      "technical_review_passed",
      "onboarding_ready",
      "onboarding_project_created"
    ]);
  });

  it("resumes from a partially completed status", () => {
    expect(buildCm5bExecutionPlan(candidate("technical_review_passed")).map((step) => step.toStatus)).toEqual([
      "onboarding_ready",
      "onboarding_project_created"
    ]);
  });

  it("is idempotent when onboarding project already exists", () => {
    expect(buildCm5bExecutionPlan(candidate("onboarding_project_created"))).toEqual([]);
  });

  it("selects the least advanced non-rejected candidate", () => {
    const selected = selectCm5bCandidate(
      [candidate("onboarding_ready"), candidate("readiness_started"), candidate("rejected")],
      [validLead]
    );
    expect(selected?.status).toBe("readiness_started");
  });

  it("reports every failed trusted supply gate", () => {
    expect(
      validateCm5bGate(candidate("candidate"), {
        ...validLead,
        data_quality_level: "SEED_ONLY",
        priority_score: 60,
        media_contact_confirmed: false,
        business_interest_confirmed: false,
        ad_inventory_identified: false,
        integration_feasibility: "impossible",
        media_director_approved_at: undefined
      })
    ).toHaveLength(7);
  });

  it("only repairs missing audit actions backed by business events", () => {
    const recovery = buildCm5bAuditRecoveryPlan(
      [{ action: "china_media_ecosystem.readiness.start" }],
      [
        { id: "event-1", event_code: "china_media_ecosystem.technical_review_passed" },
        { id: "event-2", event_code: "china_media_ecosystem.onboarding_ready" },
        { id: "event-3", event_code: "china_media_ecosystem.onboarding_project_created" }
      ]
    );

    expect(recovery).toHaveLength(3);
    expect(recovery.every((item) => item.businessEvent)).toBe(true);
  });
});
