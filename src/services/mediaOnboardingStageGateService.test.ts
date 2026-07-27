import { describe, expect, it } from "vitest";
import type { BusinessUser } from "../types/domain";
import { createInitialMediaWorkflowState } from "./mediaWorkflowService";
import {
  mediaOnboardingStageGateDefinitions,
  mediaOnboardingStageGateService
} from "./mediaOnboardingStageGateService";

const mediaManager: BusinessUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "media_manager@poly-gamma.com",
  fullName: "Media Manager",
  roles: ["media_manager"],
  activeRole: "media_manager"
};

const mediaDirector: BusinessUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "media_director@poly-gamma.com",
  fullName: "Media Director",
  roles: ["media_director"],
  activeRole: "media_director"
};

const salesManager: BusinessUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "sales_manager@poly-gamma.com",
  fullName: "Sales Manager",
  roles: ["sales_manager"],
  activeRole: "sales_manager"
};

const target = {
  objectType: "media_ecosystem_lead" as const,
  objectId: "44444444-4444-4444-8444-444444444444",
  stage: "MEDIA_DISCOVERY" as const
};

describe("mediaOnboardingStageGateService", () => {
  it("starts a stage gate with controlled deliverable and KPI templates", () => {
    const result = mediaOnboardingStageGateService.startGate(
      createInitialMediaWorkflowState(),
      mediaManager,
      target
    );

    expect(result.guard.allowed).toBe(true);
    expect(result.gate).toMatchObject({
      lifecycle_object_type: "media_ecosystem_lead",
      lifecycle_object_id: target.objectId,
      stage: "MEDIA_DISCOVERY",
      status: "in_progress",
      owner_role: "media_manager"
    });
    expect(result.gate?.deliverables).toHaveLength(
      mediaOnboardingStageGateDefinitions.MEDIA_DISCOVERY.deliverables.length
    );
    expect(result.state.businessEvents[0].eventCode).toBe("media_onboarding.stage_gate_started");
  });

  it("blocks submission until planning, evidence, KPIs, and blockers are complete", () => {
    const started = mediaOnboardingStageGateService.startGate(
      createInitialMediaWorkflowState(),
      mediaManager,
      target
    );
    if (!started.gate) throw new Error("Gate was not created");

    const incomplete = mediaOnboardingStageGateService.requestApproval(
      started.state,
      mediaManager,
      started.gate.id
    );

    expect(incomplete.guard).toMatchObject({
      allowed: false,
      reason_code: "MEDIA_ONBOARDING_GATE_INCOMPLETE"
    });
    expect(incomplete.state.auditEvents[0].action).toBe("media_onboarding.stage_gate.submit");
  });

  it("submits complete evidence and requires an approval role before approval", () => {
    const started = mediaOnboardingStageGateService.startGate(
      createInitialMediaWorkflowState(),
      mediaManager,
      target
    );
    if (!started.gate) throw new Error("Gate was not created");

    const updated = mediaOnboardingStageGateService.updateGate(
      started.state,
      mediaManager,
      started.gate.id,
      {
        ownerRole: "media_manager",
        targetDate: "2026-08-15",
        deliverables: started.gate.deliverables.map((item) => ({
          ...item,
          completed: true,
          evidence: `Evidence for ${item.code}`
        })),
        kpiEvidence: started.gate.kpi_evidence.map((item) => ({
          ...item,
          value: item.code === "priority_score" ? "82" : "verified"
        })),
        notes: "Discovery evidence complete."
      }
    );
    const submitted = mediaOnboardingStageGateService.requestApproval(
      updated.state,
      mediaManager,
      started.gate.id
    );
    const denied = mediaOnboardingStageGateService.approveGate(
      submitted.state,
      mediaManager,
      started.gate.id
    );
    const approved = mediaOnboardingStageGateService.approveGate(
      submitted.state,
      mediaDirector,
      started.gate.id
    );

    expect(submitted.gate?.status).toBe("ready_for_approval");
    expect(denied.guard.reason_code).toBe("MEDIA_ONBOARDING_GATE_APPROVE_FORBIDDEN");
    expect(approved.gate).toMatchObject({
      status: "approved",
      approved_by_role: "media_director"
    });
    expect(approved.state.businessEvents[0].eventCode).toBe("media_onboarding.stage_gate_approved");
  });

  it("rejects unrelated roles at the service boundary", () => {
    const result = mediaOnboardingStageGateService.startGate(
      createInitialMediaWorkflowState(),
      salesManager,
      target
    );

    expect(result.guard).toMatchObject({
      allowed: false,
      reason_code: "MEDIA_ONBOARDING_GATE_START_FORBIDDEN"
    });
    expect(result.state.mediaOnboardingStageGates).toHaveLength(0);
  });
});
