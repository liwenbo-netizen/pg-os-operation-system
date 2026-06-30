import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { contractService, createInitialContractWorkflowState } from "./contractService";
import { diagnosticWorkflowService } from "./diagnosticWorkflowService";
import { createInitialFinanceWorkflowState } from "./financeSettlementService";
import { createInitialMediaWorkflowState } from "./mediaWorkflowService";
import { createInitialSalesWorkflowState } from "./salesWorkflowService";

describe("contractService phase 8", () => {
  it("lets Finance request a settlement side-letter contract review", () => {
    const user = authService.createMockUser("finance_manager");
    const state = createInitialContractWorkflowState();

    const result = contractService.requestContractReview(state, user, {
      contractType: "settlement_side_letter",
      counterpartyName: "233",
      publisherId: "publisher-233",
      settlementId: "settlement-clean",
      riskLevel: "medium",
      valueAmount: 8731,
      blocker: "Settlement adjustment needs legal document.",
      nextAction: "Legal intake review."
    });

    expect(result.guard.allowed).toBe(true);
    expect(result.guard.reason_code).toBe("CONTRACT_REVIEW_REQUESTED");
    expect(result.state.contracts[0].requested_by_role).toBe("finance_manager");
    expect(result.state.businessEvents[0].eventCode).toBe("contract.review_requested");
  });

  it("blocks read-only roles from requesting contract review", () => {
    const user = authService.createMockUser("audit_viewer");
    const state = createInitialContractWorkflowState();

    const result = contractService.requestContractReview(state, user, {
      contractType: "publisher_framework",
      counterpartyName: "Readonly Partner",
      riskLevel: "low"
    });

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("CONTRACT_REQUEST_FORBIDDEN");
  });

  it("moves a contract through Legal and Finance review", () => {
    const legalUser = authService.createMockUser("legal_manager");
    const financeUser = authService.createMockUser("finance_manager");
    let state = createInitialContractWorkflowState();

    const financeReviewResult = contractService.requestFinanceReview(state, legalUser, "contract-233-framework");
    state = financeReviewResult.state;

    const financeApproveResult = contractService.approveFinanceTerms(
      state,
      financeUser,
      "contract-233-framework",
      "Payment terms and settlement cycle verified."
    );
    state = financeApproveResult.state;

    const legalApproveResult = contractService.approveLegalReview(
      state,
      legalUser,
      "contract-233-framework",
      "Legal clauses approved."
    );

    expect(financeReviewResult.guard.reason_code).toBe("CONTRACT_FINANCE_REVIEW_REQUESTED");
    expect(financeApproveResult.guard.reason_code).toBe("CONTRACT_FINANCE_TERMS_APPROVED");
    expect(legalApproveResult.guard.reason_code).toBe("CONTRACT_LEGAL_REVIEW_APPROVED");
    expect(legalApproveResult.state.contracts.find((contract) => contract.id === "contract-233-framework")?.status).toBe(
      "approved"
    );
  });

  it("blocks Finance from approving legal review", () => {
    const user = authService.createMockUser("finance_manager");
    const state = createInitialContractWorkflowState();

    const result = contractService.approveLegalReview(state, user, "contract-233-framework", "Finance tried legal approval.");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("CONTRACT_LEGAL_APPROVAL_FORBIDDEN");
  });

  it("signs and archives a legally approved contract", () => {
    const user = authService.createMockUser("legal_manager");
    const mediaState = createInitialMediaWorkflowState();
    let state = createInitialContractWorkflowState();

    const legalApproveResult = contractService.approveLegalReview(
      state,
      user,
      "contract-233-framework",
      "Approved for signature."
    );
    state = legalApproveResult.state;

    const signResult = contractService.markSigned(state, mediaState, user, "contract-233-framework");
    state = signResult.state;

    const archiveResult = contractService.archiveSignedContract(state, user, "contract-233-framework");

    expect(signResult.guard.reason_code).toBe("CONTRACT_SIGNED");
    expect(archiveResult.guard.reason_code).toBe("CONTRACT_ARCHIVED");
    expect(archiveResult.state.contracts.find((contract) => contract.id === "contract-233-framework")?.status).toBe("archived");
  });

  it("blocks signing a settlement-linked contract while dispute diagnostic case is open", () => {
    const financeUser = authService.createMockUser("finance_manager");
    const legalUser = authService.createMockUser("legal_manager");
    const mediaState = createInitialMediaWorkflowState();
    let state = createInitialContractWorkflowState();

    const requestResult = contractService.requestContractReview(state, financeUser, {
      contractType: "settlement_side_letter",
      counterpartyName: "233 Dispute",
      publisherId: "publisher-233",
      settlementId: "settlement-disputed",
      riskLevel: "high",
      valueAmount: 8024
    });
    state = requestResult.state;

    const contractId = requestResult.state.contracts[0].id;
    const approveResult = contractService.approveLegalReview(state, legalUser, contractId, "Approved pending dispute closure.");
    state = approveResult.state;

    const signResult = contractService.markSigned(state, mediaState, legalUser, contractId);

    expect(signResult.guard.allowed).toBe(false);
    expect(signResult.guard.reason_code).toBe("CONTRACT_SETTLEMENT_DISPUTE_OPEN");
  });

  it("signs a settlement-linked contract after dispute diagnostic case is closed", () => {
    const financeUser = authService.createMockUser("finance_manager");
    const legalUser = authService.createMockUser("legal_manager");
    let mediaState = createInitialMediaWorkflowState();
    let state = createInitialContractWorkflowState();

    const conclusionResult = diagnosticWorkflowService.submitConclusion(mediaState, financeUser, "diagnostic-dc-003", {
      rootCause: "Publisher invoice included invalid retry traffic.",
      responsibilityOwner: "publisher",
      conclusion: "Finance adjustment accepted and dispute resolved.",
      followUpAction: "Update contract side-letter and settlement SOP."
    });
    mediaState = conclusionResult.state;

    const closeResult = diagnosticWorkflowService.closeDiagnosticCase(mediaState, financeUser, "diagnostic-dc-003");
    mediaState = closeResult.state;

    const requestResult = contractService.requestContractReview(state, financeUser, {
      contractType: "settlement_side_letter",
      counterpartyName: "233 Dispute Closed",
      publisherId: "publisher-233",
      settlementId: "settlement-disputed",
      riskLevel: "high",
      valueAmount: 8024
    });
    state = requestResult.state;

    const contractId = requestResult.state.contracts[0].id;
    const approveResult = contractService.approveLegalReview(state, legalUser, contractId, "Approved after dispute closure.");
    state = approveResult.state;

    const signResult = contractService.markSigned(state, mediaState, legalUser, contractId);

    expect(closeResult.guard.allowed).toBe(true);
    expect(signResult.guard.allowed).toBe(true);
    expect(signResult.guard.reason_code).toBe("CONTRACT_SIGNED");
  });

  it("returns a contract snapshot with linked publisher, settlement, and activities", () => {
    const mediaState = createInitialMediaWorkflowState();
    const salesState = createInitialSalesWorkflowState();
    const financeState = createInitialFinanceWorkflowState();
    const state = createInitialContractWorkflowState();

    const snapshot = contractService.getContractSnapshot(
      state,
      mediaState,
      salesState,
      financeState,
      "contract-settlement-side-letter"
    );

    expect(snapshot.contract?.id).toBe("contract-settlement-side-letter");
    expect(snapshot.publisher?.id).toBe("publisher-233");
    expect(snapshot.settlement?.id).toBe("settlement-disputed");
    expect(snapshot.settlementDisputes[0].id).toBe("diagnostic-dc-003");
    expect(snapshot.activities.length).toBeGreaterThan(0);
  });
});
