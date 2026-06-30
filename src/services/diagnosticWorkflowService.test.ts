import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { diagnosticWorkflowService } from "./diagnosticWorkflowService";
import { fixtureRepository } from "./fixtures";
import { GuardService } from "./guardService";
import { createInitialMediaWorkflowState } from "./mediaWorkflowService";

function guardWithState(state: ReturnType<typeof createInitialMediaWorkflowState>) {
  return new GuardService({
    ...fixtureRepository,
    publishers: state.publishers,
    diagnosticCases: state.diagnosticCases
  });
}

describe("diagnosticWorkflowService phase 6", () => {
  it("creates a blocking diagnostic case and applies it to publisher scale readiness", () => {
    const user = authService.createMockUser("data_analyst");
    const state = createInitialMediaWorkflowState();

    const result = diagnosticWorkflowService.createDiagnosticCase(state, user, {
      caseType: "ivt_spike",
      publisherId: "publisher-233",
      severity: "high",
      ownerRole: "data_analyst",
      currentBlocker: "IVT spike blocks scale readiness.",
      nextAction: "Collect IVT evidence.",
      affectedCampaignCount: 2,
      isBlockingSalesScale: true,
      isBlockingSettlement: false
    });
    const guard = guardWithState(result.state).canApproveScaleReadiness(
      authService.createMockUser("media_director"),
      "publisher-233"
    );

    expect(result.guard.allowed).toBe(true);
    expect(result.state.diagnosticCases[0].case_no).toBe("DC-005");
    expect(guard.allowed).toBe(false);
    expect(guard.reason_code).toBe("BLOCKING_DIAGNOSTIC_CASE");
  });

  it("blocks read-only roles from creating diagnostic cases", () => {
    const user = authService.createMockUser("audit_viewer");
    const state = createInitialMediaWorkflowState();

    const result = diagnosticWorkflowService.createDiagnosticCase(state, user, {
      caseType: "fill_rate_low",
      publisherId: "publisher-233",
      severity: "medium",
      ownerRole: "data_analyst",
      currentBlocker: "Fill rate needs review.",
      nextAction: "Collect funnel evidence.",
      isBlockingSalesScale: false,
      isBlockingSettlement: false
    });

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("DIAGNOSTIC_CREATE_FORBIDDEN");
  });

  it("collects evidence, moves to root cause analysis, and submits a conclusion", () => {
    const user = authService.createMockUser("data_analyst");
    let state = createInitialMediaWorkflowState();

    const evidenceResult = diagnosticWorkflowService.addEvidence(state, user, "diagnostic-dc-001", {
      title: "Timeout rate doubled during evening traffic.",
      evidenceType: "funnel_metric",
      source: "Funnel monitor",
      metricName: "timeout_rate",
      baselineValue: 0.04,
      currentValue: 0.12
    });
    state = evidenceResult.state;

    const rootCauseResult = diagnosticWorkflowService.moveToRootCauseAnalysis(state, user, "diagnostic-dc-001");
    state = rootCauseResult.state;

    const conclusionResult = diagnosticWorkflowService.submitConclusion(state, user, "diagnostic-dc-001", {
      rootCause: "Publisher timeout increased after floor and cache change.",
      responsibilityOwner: "publisher",
      conclusion: "Clear rate drop is attributable to publisher timeout configuration.",
      followUpAction: "Ask Media Manager to confirm floor rollback and monitor for 48 hours."
    });

    expect(evidenceResult.guard.reason_code).toBe("DIAGNOSTIC_EVIDENCE_ADDED");
    expect(rootCauseResult.guard.reason_code).toBe("ROOT_CAUSE_ANALYSIS_STARTED");
    expect(conclusionResult.guard.reason_code).toBe("DIAGNOSTIC_CONCLUSION_READY");
    expect(conclusionResult.state.diagnosticCases.find((diagnosticCase) => diagnosticCase.id === "diagnostic-dc-001")?.status).toBe(
      "conclusion_ready"
    );
  });

  it("does not close a diagnostic case before conclusion is ready", () => {
    const user = authService.createMockUser("data_analyst");
    const state = createInitialMediaWorkflowState();

    const result = diagnosticWorkflowService.closeDiagnosticCase(state, user, "diagnostic-dc-001");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("DIAGNOSTIC_NOT_CONCLUSION_READY");
  });

  it("closes a scale-blocking diagnostic case and releases publisher readiness approval", () => {
    const dataUser = authService.createMockUser("data_analyst");
    const mediaDirector = authService.createMockUser("media_director");
    let state = createInitialMediaWorkflowState();

    const conclusionResult = diagnosticWorkflowService.submitConclusion(state, dataUser, "diagnostic-dc-001", {
      rootCause: "LOFTER clear-rate drop came from a publisher timeout spike.",
      responsibilityOwner: "publisher",
      conclusion: "Publisher fixed timeout config and traffic recovered.",
      followUpAction: "Monitor clear rate for the next two launches."
    });
    state = conclusionResult.state;

    const closeResult = diagnosticWorkflowService.closeDiagnosticCase(state, dataUser, "diagnostic-dc-001");
    const guard = guardWithState(closeResult.state).canApproveScaleReadiness(mediaDirector, "publisher-lofter");

    expect(closeResult.guard.allowed).toBe(true);
    expect(closeResult.state.diagnosticCases.find((diagnosticCase) => diagnosticCase.id === "diagnostic-dc-001")?.status).toBe("closed");
    expect(guard.allowed).toBe(true);
  });

  it("closes a settlement dispute and releases finance settlement confirmation", () => {
    const user = authService.createMockUser("finance_manager");
    let state = createInitialMediaWorkflowState();

    const conclusionResult = diagnosticWorkflowService.submitConclusion(state, user, "diagnostic-dc-003", {
      rootCause: "Publisher invoice included invalid retry traffic.",
      responsibilityOwner: "publisher",
      conclusion: "Finance adjustment accepted and dispute resolved.",
      followUpAction: "Update settlement SOP with retry traffic exclusion."
    });
    state = conclusionResult.state;

    const closeResult = diagnosticWorkflowService.closeDiagnosticCase(state, user, "diagnostic-dc-003");
    const guard = guardWithState(closeResult.state).canConfirmSettlement(user, "settlement-disputed");

    expect(closeResult.guard.allowed).toBe(true);
    expect(guard.allowed).toBe(true);
    expect(guard.reason_code).toBe("SETTLEMENT_CONFIRM_ALLOWED");
  });
});
