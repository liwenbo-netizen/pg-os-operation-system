import { roleDefinitions } from "../constants/roles";
import { routeDefinitions } from "../routes/routes";
import type { BusinessUser, EntityId, ObjectType, ReadinessTargetField } from "../types/domain";
import type { GuardResult } from "../types/guards";
import { fixtureRepository } from "./fixtures";
import { rbacService } from "./rbacService";

type BusinessActionCode =
  | "approve_scale_readiness"
  | "approve_proposal"
  | "approve_campaign_launch"
  | "confirm_settlement";

function allowed(message: string, reasonCode = "ALLOWED"): GuardResult {
  return {
    allowed: true,
    severity: "info",
    reason_code: reasonCode,
    message,
    audit_required: false
  };
}

function warning(message: string, reasonCode = "WARNING_ALLOWED", requiredApprovalRole?: string): GuardResult {
  return {
    allowed: true,
    severity: "warning",
    reason_code: reasonCode,
    message,
    required_approval_role: requiredApprovalRole,
    audit_required: true
  };
}

function blocked(message: string, reasonCode: string, requiredApprovalRole?: string): GuardResult {
  return {
    allowed: false,
    severity: "blocked",
    reason_code: reasonCode,
    message,
    required_approval_role: requiredApprovalRole,
    audit_required: true
  };
}

export class GuardService {
  constructor(private readonly repository = fixtureRepository) {}

  canViewRoute(user: BusinessUser, routePath: string): GuardResult {
    const route = routeDefinitions.find((candidate) => candidate.path === routePath);

    if (!route) {
      return blocked("The requested PG OS route is not registered in the locked route catalog.", "ROUTE_NOT_FOUND");
    }

    if (rbacService.hasAnyRole(user, route.allowedRoles)) {
      return allowed("Route access is allowed for this role.", "ROUTE_ALLOWED");
    }

    return blocked("This role cannot access the route according to the locked RBAC matrix.", "ROLE_ROUTE_FORBIDDEN");
  }

  canAccessRecord(user: BusinessUser, objectType: ObjectType, objectId: EntityId): GuardResult {
    if (objectType === "publisher" && !this.getPublisher(objectId)) {
      return blocked("Publisher record was not found.", "NOT_FOUND");
    }

    if (objectType === "proposal" && !this.repository.proposals.some((proposal) => proposal.id === objectId)) {
      return blocked("Proposal record was not found.", "NOT_FOUND");
    }

    if (objectType === "campaign" && !this.repository.campaigns.some((campaign) => campaign.id === objectId)) {
      return blocked("Campaign record was not found.", "NOT_FOUND");
    }

    if (objectType === "contract" && !this.repository.contracts.some((contract) => contract.id === objectId)) {
      return blocked("Contract record was not found.", "NOT_FOUND");
    }

    if (objectType === "settlement" && !this.repository.settlements.some((settlement) => settlement.id === objectId)) {
      return blocked("Settlement record was not found.", "NOT_FOUND");
    }

    if (user.roles.length === 0) {
      return blocked("Authenticated user context is required.", "AUTH_REQUIRED");
    }

    return allowed("Record access is allowed by the current read policy.", "RECORD_ACCESS_ALLOWED");
  }

  canUpdatePublisherReadiness(
    user: BusinessUser,
    publisherId: EntityId,
    targetField: ReadinessTargetField,
    targetStatus: string
  ): GuardResult {
    const publisher = this.getPublisher(publisherId);

    if (!publisher) {
      return blocked("Publisher record was not found.", "NOT_FOUND");
    }

    if (targetField === "technical_live_status") {
      if (!rbacService.hasAnyRole(user, ["integration_manager", "media_director", "operations_director"])) {
        return blocked("Only integration, media leadership, or operations can update technical readiness.", "FORBIDDEN", "integration_manager");
      }

      return allowed(`Technical readiness can move to ${targetStatus}.`, "TECHNICAL_READINESS_ALLOWED");
    }

    if (targetField === "commercial_test_status") {
      if (!rbacService.hasAnyRole(user, ["adops_manager", "data_analyst", "media_director", "operations_director"])) {
        return blocked("Only AdOps, Data, Media Director, or Operations can update commercial test status.", "FORBIDDEN", "adops_manager");
      }

      if (publisher.technical_live_status !== "technical_live_passed") {
        return blocked("Commercial testing cannot proceed before technical live is passed.", "TECHNICAL_NOT_LIVE");
      }

      return allowed(`Commercial test status can move to ${targetStatus}.`, "COMMERCIAL_TEST_ALLOWED");
    }

    if (!rbacService.hasRole(user, "media_director")) {
      return blocked("Only media_director can approve publisher sales scale readiness.", "FORBIDDEN", "media_director");
    }

    if (publisher.technical_live_status !== "technical_live_passed" || publisher.commercial_test_status !== "test_passed") {
      return blocked("Sales scale readiness requires technical_live_passed and test_passed.", "READINESS_NOT_COMPLETE", "media_director");
    }

    return allowed(`Sales scale readiness can move to ${targetStatus}.`, "SALES_SCALE_ALLOWED");
  }

  canSelectPublisherForProposal(user: BusinessUser, publisherId: EntityId, proposalId: EntityId): GuardResult {
    if (!rbacService.hasAnyRole(user, ["sales_manager", "sales_director", "operations_director"])) {
      return blocked("Only sales or operations roles can select publishers for proposals.", "FORBIDDEN", "sales_manager");
    }

    const publisher = this.getPublisher(publisherId);

    if (!publisher) {
      return blocked("Publisher record was not found.", "NOT_FOUND");
    }

    if (!this.repository.proposals.some((proposal) => proposal.id === proposalId)) {
      return blocked("Proposal record was not found.", "NOT_FOUND");
    }

    if (publisher.technical_live_status !== "technical_live_passed") {
      return blocked("Publisher cannot be selected before technical live is passed.", "TECHNICAL_NOT_LIVE");
    }

    if (!["test_passed", "testing"].includes(publisher.commercial_test_status)) {
      return blocked("Publisher requires test_passed or testing commercial status for proposal selection.", "COMMERCIAL_TEST_NOT_READY");
    }

    if (!["limited_sellable", "proposal_selectable", "scale_ready"].includes(publisher.sales_scale_status)) {
      return blocked("Publisher is not in an allowed sales scale status for proposal selection.", "SALES_SCALE_NOT_ALLOWED");
    }

    const blockingCase = this.getOpenBlockingSalesCase(publisher.id);
    if (blockingCase) {
      return blocked(`Publisher has blocking diagnostic case ${blockingCase.case_no}.`, "BLOCKING_DIAGNOSTIC_CASE", "data_analyst");
    }

    if (publisher.commercial_test_status === "testing" || publisher.sales_scale_status === "limited_sellable") {
      return warning("Publisher is limited sellable and can only be used with review context.", "LIMITED_SELLABLE_ALLOWED", "sales_director");
    }

    return allowed("Publisher is selectable for proposal.", "PROPOSAL_PUBLISHER_ALLOWED");
  }

  canLaunchCampaignWithPublisher(user: BusinessUser, publisherId: EntityId, campaignId: EntityId): GuardResult {
    if (!rbacService.hasAnyRole(user, ["adops_manager", "operations_director", "customer_success_manager"])) {
      return blocked("Only AdOps, Operations, or Customer Success can prepare campaign launch.", "FORBIDDEN", "adops_manager");
    }

    const publisher = this.getPublisher(publisherId);
    const campaign = this.repository.campaigns.find((candidate) => candidate.id === campaignId);

    if (!publisher || !campaign) {
      return blocked("Campaign or publisher record was not found.", "NOT_FOUND");
    }

    if (!campaign.launchChecklistPassed) {
      return blocked("Campaign launch checklist is not complete.", "LAUNCH_CHECKLIST_INCOMPLETE", "adops_manager");
    }

    if (publisher.technical_live_status !== "technical_live_passed") {
      return blocked("Campaign launch requires technical_live_passed.", "TECHNICAL_NOT_LIVE");
    }

    if (publisher.commercial_test_status !== "test_passed") {
      return blocked("Campaign launch requires commercial test_passed.", "COMMERCIAL_TEST_NOT_PASSED");
    }

    if (!["proposal_selectable", "scale_ready"].includes(publisher.sales_scale_status)) {
      return blocked("Campaign launch requires proposal_selectable or scale_ready.", "SALES_SCALE_NOT_READY");
    }

    const blockingCase = this.getOpenBlockingSalesCase(publisher.id);
    if (blockingCase) {
      return blocked(`Campaign launch is blocked by diagnostic case ${blockingCase.case_no}.`, "BLOCKING_DIAGNOSTIC_CASE", "data_analyst");
    }

    return allowed("Campaign can launch with this publisher.", "CAMPAIGN_LAUNCH_ALLOWED");
  }

  canCreateCommercialTest(user: BusinessUser, publisherId: EntityId): GuardResult {
    const publisher = this.getPublisher(publisherId);

    if (!publisher) {
      return blocked("Publisher record was not found.", "NOT_FOUND");
    }

    if (!rbacService.hasAnyRole(user, ["adops_manager", "data_analyst", "media_director", "operations_director"])) {
      return blocked("Only AdOps, Data, Media Director, or Operations can create commercial tests.", "FORBIDDEN", "adops_manager");
    }

    if (publisher.technical_live_status !== "technical_live_passed") {
      return blocked("Commercial test requires technical_live_passed.", "TECHNICAL_NOT_LIVE");
    }

    return allowed("Commercial test can be created.", "COMMERCIAL_TEST_CREATE_ALLOWED");
  }

  canApproveScaleReadiness(user: BusinessUser, publisherId: EntityId): GuardResult {
    const publisher = this.getPublisher(publisherId);

    if (!publisher) {
      return blocked("Publisher record was not found.", "NOT_FOUND");
    }

    if (!rbacService.hasRole(user, "media_director")) {
      return blocked("Only media_director can approve scale readiness.", "FORBIDDEN", "media_director");
    }

    if (publisher.technical_live_status !== "technical_live_passed" || publisher.commercial_test_status !== "test_passed") {
      return blocked("Scale readiness approval requires technical_live_passed and test_passed.", "READINESS_NOT_COMPLETE", "media_director");
    }

    const blockingCase = this.getOpenBlockingSalesCase(publisher.id);
    if (blockingCase) {
      return blocked(`Scale readiness is blocked by diagnostic case ${blockingCase.case_no}.`, "BLOCKING_DIAGNOSTIC_CASE", "data_analyst");
    }

    return allowed("Scale readiness can be approved.", "SCALE_READINESS_ALLOWED");
  }

  canApproveProposal(user: BusinessUser, proposalId: EntityId): GuardResult {
    if (!rbacService.hasRole(user, "sales_director")) {
      return blocked("Only sales_director can approve proposals.", "FORBIDDEN", "sales_director");
    }

    const proposal = this.repository.proposals.find((candidate) => candidate.id === proposalId);
    if (!proposal) {
      return blocked("Proposal record was not found.", "NOT_FOUND");
    }

    const blockedSelection = proposal.selectedPublisherIds
      .map((publisherId) => this.canSelectPublisherForProposal(user, publisherId, proposalId))
      .find((result) => !result.allowed);

    if (blockedSelection) {
      return blocked(`Proposal has blocked publisher selection: ${blockedSelection.message}`, "PROPOSAL_MEDIA_BLOCKED", "sales_manager");
    }

    return allowed("Proposal can be approved.", "PROPOSAL_APPROVAL_ALLOWED");
  }

  canApproveCampaignLaunch(user: BusinessUser, campaignId: EntityId): GuardResult {
    if (!rbacService.hasRole(user, "operations_director")) {
      return blocked("Only operations_director can approve campaign launch.", "FORBIDDEN", "operations_director");
    }

    const campaign = this.repository.campaigns.find((candidate) => candidate.id === campaignId);
    if (!campaign) {
      return blocked("Campaign record was not found.", "NOT_FOUND");
    }

    const blockedAllocation = campaign.publisherIds
      .map((publisherId) => this.canLaunchCampaignWithPublisher(user, publisherId, campaign.id))
      .find((result) => !result.allowed);

    if (blockedAllocation) {
      return blocked(`Campaign launch has blocked publisher allocation: ${blockedAllocation.message}`, "CAMPAIGN_ALLOCATION_BLOCKED", "adops_manager");
    }

    return allowed("Campaign launch can be approved.", "CAMPAIGN_APPROVAL_ALLOWED");
  }

  canCloseDiagnosticCase(user: BusinessUser, diagnosticCaseId: EntityId): GuardResult {
    if (!rbacService.hasAnyRole(user, ["operations_director", "data_analyst", "media_director", "finance_manager"])) {
      return blocked("Only accountable diagnostic roles can close diagnostic cases.", "FORBIDDEN", "data_analyst");
    }

    const diagnosticCase = this.repository.diagnosticCases.find((candidate) => candidate.id === diagnosticCaseId);
    if (!diagnosticCase) {
      return blocked("Diagnostic case was not found.", "NOT_FOUND");
    }

    if (diagnosticCase.status !== "conclusion_ready") {
      return blocked("Diagnostic case can close only after conclusion_ready.", "DIAGNOSTIC_NOT_CONCLUSION_READY", "data_analyst");
    }

    return allowed("Diagnostic case can be closed.", "DIAGNOSTIC_CLOSE_ALLOWED");
  }

  canConfirmSettlement(user: BusinessUser, settlementId: EntityId): GuardResult {
    if (!rbacService.hasRole(user, "finance_manager")) {
      return blocked("Only finance_manager can confirm settlements.", "FORBIDDEN", "finance_manager");
    }

    const settlement = this.repository.settlements.find((candidate) => candidate.id === settlementId);
    if (!settlement) {
      return blocked("Settlement record was not found.", "NOT_FOUND");
    }

    const dispute = this.repository.diagnosticCases.find(
      (diagnosticCase) =>
        diagnosticCase.settlement_id === settlement.id &&
        diagnosticCase.is_blocking_settlement &&
        !["closed", "rejected"].includes(diagnosticCase.status)
    );

    if (dispute) {
      return blocked(`Settlement is blocked by unresolved diagnostic case ${dispute.case_no}.`, "SETTLEMENT_DISPUTE_UNRESOLVED", "finance_manager");
    }

    if (!settlement.reconciliationCompleted) {
      return blocked("Settlement cannot be confirmed before reconciliation is complete.", "RECONCILIATION_INCOMPLETE", "finance_manager");
    }

    return allowed("Settlement can be confirmed.", "SETTLEMENT_CONFIRM_ALLOWED");
  }

  canPerformBusinessApproval(
    user: BusinessUser,
    actionCode: BusinessActionCode,
    objectType: ObjectType,
    objectId: EntityId
  ): GuardResult {
    if (!rbacService.isBusinessApprovalRole(user) || rbacService.hasRole(user, "system_admin")) {
      return blocked("This role does not own business approval authority.", "BUSINESS_APPROVAL_FORBIDDEN");
    }

    if (actionCode === "approve_scale_readiness" && objectType === "publisher") {
      return this.canApproveScaleReadiness(user, objectId);
    }

    if (actionCode === "approve_proposal" && objectType === "proposal") {
      return this.canApproveProposal(user, objectId);
    }

    if (actionCode === "approve_campaign_launch" && objectType === "campaign") {
      return this.canApproveCampaignLaunch(user, objectId);
    }

    if (actionCode === "confirm_settlement" && objectType === "settlement") {
      return this.canConfirmSettlement(user, objectId);
    }

    return blocked("Business approval action and object type do not match.", "APPROVAL_ACTION_MISMATCH");
  }

  private getPublisher(publisherId: EntityId) {
    return this.repository.publishers.find((publisher) => publisher.id === publisherId);
  }

  private getOpenBlockingSalesCase(publisherId: EntityId) {
    return this.repository.diagnosticCases.find(
      (diagnosticCase) =>
        diagnosticCase.publisher_id === publisherId &&
        diagnosticCase.is_blocking_sales_scale &&
        !["closed", "rejected"].includes(diagnosticCase.status)
    );
  }
}

export const guardService = new GuardService();
