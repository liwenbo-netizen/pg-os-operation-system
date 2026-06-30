import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { diagnosticWorkflowService } from "./diagnosticWorkflowService";
import { createInitialFinanceWorkflowState, financeSettlementService } from "./financeSettlementService";
import { createInitialMediaWorkflowState } from "./mediaWorkflowService";
import { createInitialSalesWorkflowState } from "./salesWorkflowService";

describe("financeSettlementService phase 7", () => {
  it("completes reconciliation and lets finance confirm a clean settlement", () => {
    const operationsUser = authService.createMockUser("operations_director");
    const financeUser = authService.createMockUser("finance_manager");
    const mediaState = createInitialMediaWorkflowState();
    let state = createInitialFinanceWorkflowState();

    const reconcileResult = financeSettlementService.completeReconciliation(
      state,
      operationsUser,
      "settlement-unreconciled",
      -120
    );
    state = reconcileResult.state;

    const confirmResult = financeSettlementService.confirmSettlement(state, mediaState, financeUser, "settlement-unreconciled");

    expect(reconcileResult.guard.reason_code).toBe("SETTLEMENT_RECONCILED");
    expect(confirmResult.guard.reason_code).toBe("SETTLEMENT_CONFIRM_ALLOWED");
    expect(confirmResult.state.settlements.find((settlement) => settlement.id === "settlement-unreconciled")?.status).toBe(
      "confirmed"
    );
  });

  it("blocks read-only roles from settlement reconciliation", () => {
    const user = authService.createMockUser("audit_viewer");
    const state = createInitialFinanceWorkflowState();

    const result = financeSettlementService.completeReconciliation(state, user, "settlement-unreconciled");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("SETTLEMENT_RECONCILE_FORBIDDEN");
  });

  it("blocks finance confirmation while a settlement dispute diagnostic case is open", () => {
    const user = authService.createMockUser("finance_manager");
    const mediaState = createInitialMediaWorkflowState();
    const state = createInitialFinanceWorkflowState();

    const result = financeSettlementService.confirmSettlement(state, mediaState, user, "settlement-disputed");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("SETTLEMENT_DISPUTE_UNRESOLVED");
  });

  it("confirms a disputed settlement after the diagnostic case is concluded and closed", () => {
    const user = authService.createMockUser("finance_manager");
    let mediaState = createInitialMediaWorkflowState();
    const state = createInitialFinanceWorkflowState();

    const conclusionResult = diagnosticWorkflowService.submitConclusion(mediaState, user, "diagnostic-dc-003", {
      rootCause: "Publisher invoice included invalid retry traffic.",
      responsibilityOwner: "publisher",
      conclusion: "Finance adjustment accepted and dispute resolved.",
      followUpAction: "Update settlement SOP with retry traffic exclusion."
    });
    mediaState = conclusionResult.state;

    const closeResult = diagnosticWorkflowService.closeDiagnosticCase(mediaState, user, "diagnostic-dc-003");
    mediaState = closeResult.state;

    const confirmResult = financeSettlementService.confirmSettlement(state, mediaState, user, "settlement-disputed");

    expect(closeResult.guard.allowed).toBe(true);
    expect(confirmResult.guard.allowed).toBe(true);
    expect(confirmResult.state.settlements.find((settlement) => settlement.id === "settlement-disputed")?.status).toBe(
      "confirmed"
    );
  });

  it("issues invoice and marks payment after confirmation", () => {
    const user = authService.createMockUser("finance_manager");
    const mediaState = createInitialMediaWorkflowState();
    let state = createInitialFinanceWorkflowState();

    const confirmResult = financeSettlementService.confirmSettlement(state, mediaState, user, "settlement-clean");
    state = confirmResult.state;

    const invoiceResult = financeSettlementService.issueInvoice(state, user, "settlement-clean");
    state = invoiceResult.state;

    const paidResult = financeSettlementService.markPaid(state, user, "settlement-clean");

    expect(invoiceResult.guard.reason_code).toBe("SETTLEMENT_INVOICED");
    expect(paidResult.guard.reason_code).toBe("SETTLEMENT_PAID");
    expect(paidResult.state.settlements.find((settlement) => settlement.id === "settlement-clean")?.status).toBe("paid");
  });

  it("does not issue invoice before settlement confirmation", () => {
    const user = authService.createMockUser("finance_manager");
    const state = createInitialFinanceWorkflowState();

    const result = financeSettlementService.issueInvoice(state, user, "settlement-clean");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("SETTLEMENT_NOT_CONFIRMED");
  });

  it("returns a settlement snapshot with campaign, publisher, blockers, and activity", () => {
    const mediaState = createInitialMediaWorkflowState();
    const salesState = createInitialSalesWorkflowState();
    const state = createInitialFinanceWorkflowState();

    const snapshot = financeSettlementService.getSettlementSnapshot(
      state,
      mediaState,
      salesState,
      "settlement-disputed"
    );

    expect(snapshot.settlement?.id).toBe("settlement-disputed");
    expect(snapshot.campaign?.id).toBe("campaign-ready");
    expect(snapshot.publisher?.id).toBe("publisher-233");
    expect(snapshot.diagnosticCases[0].id).toBe("diagnostic-dc-003");
    expect(snapshot.activities.length).toBeGreaterThan(0);
  });
});
