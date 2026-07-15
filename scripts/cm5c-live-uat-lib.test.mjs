import { describe, expect, it } from "vitest";
import {
  buildCm5cPlan,
  cm5cHandoffEvent,
  selectCm5cCandidate,
  summarizeCm5cProof
} from "./cm5c-live-uat-lib.mjs";

const candidate = (id, leadId, publisherId, createdAt = "2026-07-01T00:00:00.000Z") => ({
  id,
  lead_id: leadId,
  publisher_id: publisherId,
  media_name: id,
  status: "onboarding_project_created",
  created_at: createdAt
});

describe("CM-5C live UAT planner", () => {
  it("prefers an unconfirmed candidate with complete onboarding artifacts", () => {
    const confirmed = candidate("confirmed", "lead-confirmed", "publisher-confirmed", "2026-06-01T00:00:00.000Z");
    const pending = candidate("pending", "lead-pending", "publisher-pending", "2026-07-01T00:00:00.000Z");

    expect(
      selectCm5cCandidate(
        [confirmed, pending],
        [{ lead_id: confirmed.lead_id, event: cm5cHandoffEvent }],
        [
          { id: "project-confirmed", publisher_id: confirmed.publisher_id },
          { id: "project-pending", publisher_id: pending.publisher_id }
        ]
      )
    ).toEqual(pending);
  });

  it("builds an idempotent execution plan", () => {
    const selected = candidate("candidate", "lead", "publisher");
    const plan = buildCm5cPlan({
      candidate: selected,
      activities: [{ lead_id: "lead", event: cm5cHandoffEvent }],
      integrationProject: { id: "project", publisher_id: "publisher" },
      persistedTask: { id: "project", status: "in_progress" }
    });

    expect(plan.handoffConfirmed).toBe(true);
    expect(plan.taskAlreadyStarted).toBe(true);
    expect(plan.steps.map((step) => step.execute)).toEqual([false, false, true, true, true]);
  });

  it("requires every audit and business event proof group", () => {
    expect(
      summarizeCm5cProof({
        handoffAudits: [{}],
        handoffEvents: [{}],
        taskAudits: [{}],
        taskEvents: [{}],
        routeAudits: [{}]
      })
    ).toMatchObject({ complete: true, missing: [] });

    expect(
      summarizeCm5cProof({
        handoffAudits: [{}],
        handoffEvents: [],
        taskAudits: [{}],
        taskEvents: [],
        routeAudits: [{}]
      })
    ).toMatchObject({ complete: false, missing: ["handoffEvents", "taskEvents"] });
  });
});
