export const technicalLiveStatuses = [
  "draft",
  "pending_integration",
  "in_integration",
  "technical_review",
  "technical_live_passed",
  "technical_blocked",
  "deprecated"
] as const;

export type TechnicalLiveStatus = (typeof technicalLiveStatuses)[number];

export const commercialTestStatuses = [
  "not_started",
  "ready_for_test",
  "testing",
  "test_passed",
  "test_failed",
  "paused"
] as const;

export type CommercialTestStatus = (typeof commercialTestStatuses)[number];

export const salesScaleStatuses = [
  "not_allowed",
  "limited_sellable",
  "proposal_selectable",
  "scale_ready",
  "scale_blocked",
  "paused"
] as const;

export type SalesScaleStatus = (typeof salesScaleStatuses)[number];

export const diagnosticCaseStatuses = [
  "opened",
  "triage",
  "evidence_collection",
  "root_cause_analysis",
  "action_required",
  "conclusion_ready",
  "closed",
  "rejected"
] as const;

export type DiagnosticCaseStatus = (typeof diagnosticCaseStatuses)[number];

export const severities = ["low", "medium", "high", "critical"] as const;

export type Severity = (typeof severities)[number];

export const proposalStatuses = [
  "draft",
  "media_validation",
  "internal_review",
  "approved_to_send",
  "sent_to_client",
  "client_feedback",
  "won",
  "lost",
  "cancelled"
] as const;

export type ProposalStatus = (typeof proposalStatuses)[number];

export const campaignStatuses = [
  "draft",
  "launch_check",
  "pending_approval",
  "approved",
  "live",
  "paused",
  "completed",
  "cancelled",
  "blocked"
] as const;

export type CampaignStatus = (typeof campaignStatuses)[number];

export const settlementStatuses = [
  "draft",
  "reconciling",
  "pending_review",
  "exception_review",
  "confirmed",
  "invoiced",
  "paid",
  "blocked",
  "cancelled"
] as const;

export type SettlementStatus = (typeof settlementStatuses)[number];

export const contractStatuses = [
  "draft",
  "requested",
  "legal_review",
  "finance_review",
  "redline",
  "approved",
  "signing",
  "signed",
  "archived",
  "rejected",
  "cancelled"
] as const;

export type ContractStatus = (typeof contractStatuses)[number];

export const approvalStatuses = ["pending", "approved", "rejected", "cancelled"] as const;

export type ApprovalStatus = (typeof approvalStatuses)[number];
