import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { guardService } from "./guardService";
import { rlsService } from "./rlsService";

const user = authService.createMockUser.bind(authService);

describe("GuardService publisher readiness", () => {
  it("blocks system_admin from business approval authority", () => {
    expect(
      guardService.canPerformBusinessApproval(user("system_admin"), "approve_scale_readiness", "publisher", "publisher-233")
    ).toMatchObject({
      allowed: false,
      reason_code: "BUSINESS_APPROVAL_FORBIDDEN"
    });
  });

  it("allows media_director to approve scale-ready publisher 233", () => {
    expect(guardService.canApproveScaleReadiness(user("media_director"), "publisher-233")).toMatchObject({
      allowed: true,
      reason_code: "SCALE_READINESS_ALLOWED"
    });
  });

  it("blocks scale approval when an open diagnostic case blocks sales scale", () => {
    expect(guardService.canApproveScaleReadiness(user("media_director"), "publisher-lofter")).toMatchObject({
      allowed: false,
      reason_code: "BLOCKING_DIAGNOSTIC_CASE"
    });
  });

  it("blocks media_manager from directly approving scale readiness", () => {
    expect(guardService.canApproveScaleReadiness(user("media_manager"), "publisher-233")).toMatchObject({
      allowed: false,
      required_approval_role: "media_director"
    });
  });
});

describe("GuardService proposal and campaign readiness", () => {
  it("allows sales to select 233 for proposal", () => {
    expect(guardService.canSelectPublisherForProposal(user("sales_manager"), "publisher-233", "proposal-daily-yoga")).toMatchObject({
      allowed: true,
      reason_code: "PROPOSAL_PUBLISHER_ALLOWED"
    });
  });

  it("warns but allows QuZhi Campus as limited sellable", () => {
    expect(guardService.canSelectPublisherForProposal(user("sales_manager"), "publisher-quzhi", "proposal-daily-yoga")).toMatchObject({
      allowed: true,
      severity: "warning",
      reason_code: "LIMITED_SELLABLE_ALLOWED"
    });
  });

  it("blocks New CTV Partner for proposal selection", () => {
    expect(guardService.canSelectPublisherForProposal(user("sales_manager"), "publisher-new-ctv", "proposal-daily-yoga")).toMatchObject({
      allowed: false,
      reason_code: "TECHNICAL_NOT_LIVE"
    });
  });

  it("blocks campaign launch for unready media", () => {
    expect(guardService.canLaunchCampaignWithPublisher(user("adops_manager"), "publisher-new-ctv", "campaign-blocked")).toMatchObject({
      allowed: false,
      reason_code: "TECHNICAL_NOT_LIVE"
    });
  });

  it("blocks campaign approval when launch checklist is incomplete", () => {
    expect(guardService.canApproveCampaignLaunch(user("operations_director"), "campaign-checklist-open")).toMatchObject({
      allowed: false,
      reason_code: "CAMPAIGN_ALLOCATION_BLOCKED"
    });
  });
});

describe("GuardService diagnostic and settlement controls", () => {
  it("does not close a diagnostic case before conclusion_ready", () => {
    expect(guardService.canCloseDiagnosticCase(user("data_analyst"), "diagnostic-dc-001")).toMatchObject({
      allowed: false,
      reason_code: "DIAGNOSTIC_NOT_CONCLUSION_READY"
    });
  });

  it("allows closing diagnostic case when conclusion is ready", () => {
    expect(guardService.canCloseDiagnosticCase(user("data_analyst"), "diagnostic-dc-004")).toMatchObject({
      allowed: true,
      reason_code: "DIAGNOSTIC_CLOSE_ALLOWED"
    });
  });

  it("blocks settlement confirmation with unresolved settlement dispute", () => {
    expect(guardService.canConfirmSettlement(user("finance_manager"), "settlement-disputed")).toMatchObject({
      allowed: false,
      reason_code: "SETTLEMENT_DISPUTE_UNRESOLVED"
    });
  });

  it("allows settlement confirmation after reconciliation with no open dispute", () => {
    expect(guardService.canConfirmSettlement(user("finance_manager"), "settlement-clean")).toMatchObject({
      allowed: true,
      reason_code: "SETTLEMENT_CONFIRM_ALLOWED"
    });
  });
});

describe("RLS policy mirror", () => {
  it("keeps audit_viewer read-only", () => {
    expect(rlsService.canReadTable(user("audit_viewer"), "audit_logs")).toBe(true);
    expect(rlsService.canWriteTable(user("audit_viewer"), "approvals")).toBe(false);
    expect(rlsService.canWriteTable(user("audit_viewer"), "publishers")).toBe(false);
  });

  it("does not allow system_admin to write business approvals", () => {
    expect(rlsService.canWriteTable(user("system_admin"), "approvals")).toBe(false);
  });

  it("allows finance_manager to write settlements", () => {
    expect(rlsService.canWriteTable(user("finance_manager"), "settlements")).toBe(true);
  });
});

