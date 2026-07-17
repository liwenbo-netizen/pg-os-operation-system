import { describe, expect, it } from "vitest";
import {
  buildCm5dPlan,
  cm5dAuditRequirements,
  cm5dEvidenceTypes,
  selectCm5dTarget,
  summarizeCm5dProof
} from "./cm5d-live-uat-lib.mjs";

describe("CM-5D live UAT planner", () => {
  it("selects an incomplete integration project linked to an onboarding candidate", () => {
    const selected = selectCm5dTarget(
      [
        { id: "candidate-a", publisher_id: "publisher-a", status: "onboarding_project_created" },
        { id: "candidate-b", publisher_id: "publisher-b", status: "onboarding_project_created" }
      ],
      [
        { id: "project-a", publisher_id: "publisher-a", status: "in_integration", evidence: [{}] },
        { id: "project-b", publisher_id: "publisher-b", status: "pending_integration", evidence: [] }
      ],
      [{ id: "publisher-a" }, { id: "publisher-b" }]
    );

    expect(selected.project.id).toBe("project-b");
  });

  it("excludes projects that already passed technical readiness", () => {
    expect(
      selectCm5dTarget(
        [{ id: "candidate", publisher_id: "publisher", status: "onboarding_project_created" }],
        [{ id: "project", publisher_id: "publisher", status: "technical_live_passed", evidence: [] }],
        [{ id: "publisher" }]
      )
    ).toBeUndefined();
  });

  it("builds an evidence-aware execution plan", () => {
    const plan = buildCm5dPlan({
      candidate: { id: "candidate", media_name: "Media" },
      publisher: { id: "publisher", name: "Media" },
      project: {
        id: "project",
        publisher_id: "publisher",
        status: "in_integration",
        evidence: [{ evidence_type: "connection_config" }]
      }
    });

    expect(plan.missingEvidence).toEqual(["test_request", "callback_log", "production_log"]);
    expect(plan.steps.find((step) => step.id === "start-execution").execute).toBe(false);
    expect(plan.steps.find((step) => step.id === "evidence-connection_config").execute).toBe(false);
  });

  it("requires action, event, four evidence pairs, and route proof", () => {
    const auditRows = [
      { action: cm5dAuditRequirements.startAction },
      { action: cm5dAuditRequirements.blockerAction },
      { action: cm5dAuditRequirements.resolveAction },
      ...cm5dEvidenceTypes.map(() => ({ action: cm5dAuditRequirements.evidenceAction })),
      { action: cm5dAuditRequirements.readinessAction }
    ];
    const businessRows = [
      { event_code: cm5dAuditRequirements.startEvent },
      { event_code: cm5dAuditRequirements.blockerEvent },
      { event_code: cm5dAuditRequirements.resolveEvent },
      ...cm5dEvidenceTypes.map(() => ({ event_code: cm5dAuditRequirements.evidenceEvent })),
      { event_code: cm5dAuditRequirements.readinessEvent }
    ];

    expect(summarizeCm5dProof({ auditRows, businessRows, routeRows: [{}] })).toMatchObject({
      complete: true,
      missing: [],
      counts: { evidenceAudits: 4, evidenceEvents: 4, routeVisits: 1 }
    });
    expect(summarizeCm5dProof({ auditRows: auditRows.slice(0, 3), businessRows: [], routeRows: [] }).complete).toBe(false);
  });
});
