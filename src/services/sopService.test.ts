import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { createInitialGuideWorkflowState, sopService } from "./sopService";

describe("sopService phase 9", () => {
  it("searches SOP cards by query, role, and module", () => {
    const state = createInitialGuideWorkflowState();

    const financeResults = sopService.searchSopCards(state, {
      query: "settlement",
      role: "finance_manager",
      module: "Finance"
    });

    expect(financeResults.length).toBe(1);
    expect(financeResults[0].id).toBe("sop-finance-settlement-confirm");
  });

  it("returns role recommendations only for visible published SOP cards", () => {
    const user = authService.createMockUser("legal_manager");
    const state = createInitialGuideWorkflowState();

    const results = sopService.getRoleRecommendations(state, user);

    expect(results.some((sopCard) => sopCard.id === "sop-contract-signing")).toBe(true);
    expect(results.every((sopCard) => sopCard.visible_roles.includes("legal_manager"))).toBe(true);
  });

  it("records SOP open activity for a visible role", () => {
    const user = authService.createMockUser("finance_manager");
    const state = createInitialGuideWorkflowState();

    const result = sopService.openSopCard(state, user, "sop-finance-settlement-confirm");

    expect(result.guard.allowed).toBe(true);
    expect(result.guard.reason_code).toBe("SOP_OPENED");
    expect(result.state.sopActivities[0].event).toBe("SOP opened.");
    expect(result.state.auditEvents[0].reasonCode).toBe("SOP_OPENED");
  });

  it("blocks opening a role-restricted SOP for an unrelated role", () => {
    const user = authService.createMockUser("sales_manager");
    const state = createInitialGuideWorkflowState();

    const result = sopService.openSopCard(state, user, "sop-contract-signing");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("SOP_ROLE_FORBIDDEN");
  });

  it("lets Product Owner create and publish a draft SOP", () => {
    const user = authService.createMockUser("product_owner");
    let state = createInitialGuideWorkflowState();

    const createResult = sopService.createDraftSop(state, user, {
      title: "Campaign launch exception handling",
      module: "Campaigns",
      scenario: "Launch blocker",
      ownerRole: "operations_director",
      visibleRoles: ["adops_manager", "operations_director", "customer_success_manager", "audit_viewer"],
      priority: "P1",
      summary: "Handle launch blockers before Operations approval.",
      steps: ["Review launch guard", "Create diagnostic case if blocker repeats", "Request Operations approval after fix"],
      relatedRoute: "/campaigns/:id/wizard",
      relatedService: "CampaignService"
    });
    state = createResult.state;

    const publishResult = sopService.publishSop(state, user, createResult.state.sopCards[0].id);

    expect(createResult.guard.reason_code).toBe("SOP_DRAFT_CREATED");
    expect(publishResult.guard.reason_code).toBe("SOP_PUBLISHED");
    expect(publishResult.state.sopCards[0].status).toBe("published");
  });

  it("blocks read-only roles from creating SOP cards", () => {
    const user = authService.createMockUser("audit_viewer");
    const state = createInitialGuideWorkflowState();

    const result = sopService.createDraftSop(state, user, {
      title: "Readonly SOP",
      module: "Common",
      scenario: "Audit",
      ownerRole: "product_owner",
      visibleRoles: ["audit_viewer"],
      priority: "Reference",
      summary: "Should not be created.",
      steps: ["No write"]
    });

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("SOP_CREATE_FORBIDDEN");
  });

  it("lets Operations update SOP steps and increments version", () => {
    const user = authService.createMockUser("operations_director");
    const state = createInitialGuideWorkflowState();

    const result = sopService.updateSopSteps(
      state,
      user,
      "sop-finance-settlement-confirm",
      [
        "Complete reconciliation and review adjustment amount.",
        "Resolve open settlement dispute diagnostic cases.",
        "Confirm settlement, issue invoice, mark paid, and attach payment proof."
      ],
      "Updated settlement SOP with payment proof step."
    );

    const updatedCard = result.state.sopCards.find((sopCard) => sopCard.id === "sop-finance-settlement-confirm");

    expect(result.guard.reason_code).toBe("SOP_UPDATED");
    expect(updatedCard?.version).toBe(2);
    expect(updatedCard?.summary).toBe("Updated settlement SOP with payment proof step.");
  });

  it("does not publish SOP cards without steps", () => {
    const user = authService.createMockUser("product_owner");
    let state = createInitialGuideWorkflowState();

    const createResult = sopService.createDraftSop(state, user, {
      title: "Empty SOP",
      module: "Common",
      scenario: "Invalid",
      ownerRole: "product_owner",
      visibleRoles: ["product_owner"],
      priority: "Reference",
      summary: "Missing steps.",
      steps: []
    });
    state = createResult.state;

    const publishResult = sopService.publishSop(state, user, createResult.state.sopCards[0].id);

    expect(publishResult.guard.allowed).toBe(false);
    expect(publishResult.guard.reason_code).toBe("SOP_STEPS_REQUIRED");
  });
});
