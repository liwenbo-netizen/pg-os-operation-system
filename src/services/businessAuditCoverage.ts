import type { RoleCode } from "../constants/roles";
import type { AuditEvent, ObjectType } from "../types/domain";

export type BusinessAuditModule = "Media" | "Sales" | "Campaigns" | "Finance" | "Contracts";

export type CoreBusinessAuditAction = {
  action: string;
  objectType: ObjectType;
  module: BusinessAuditModule;
  workflowSurface: string;
  criticality: "P0" | "P1";
};

export const CORE_BUSINESS_AUDIT_ACTIONS: CoreBusinessAuditAction[] = [
  {
    action: "publisher.onboarding.create",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Publisher Onboarding Wizard",
    criticality: "P0"
  },
  {
    action: "publisher.create",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Media Publisher Onboarding",
    criticality: "P0"
  },
  {
    action: "publisher.onboarding.update",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Publisher Profile Governance",
    criticality: "P0"
  },
  {
    action: "publisher.update",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Publisher Profile Governance",
    criticality: "P0"
  },
  {
    action: "publisher_contact.update",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Publisher Profile Governance",
    criticality: "P1"
  },
  {
    action: "publisher_ad_slot.update",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Publisher Profile Governance",
    criticality: "P1"
  },
  {
    action: "publisher_contract_term.update",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Publisher Profile Governance",
    criticality: "P1"
  },
  {
    action: "publisher_contact.create",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Media Publisher Onboarding",
    criticality: "P1"
  },
  {
    action: "publisher_ad_slot.create",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Media Publisher 360",
    criticality: "P1"
  },
  {
    action: "publisher_contract_term.create",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Media Publisher 360",
    criticality: "P1"
  },
  {
    action: "publisher.technical_live.submit",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Media Integration Readiness",
    criticality: "P0"
  },
  {
    action: "integration.execution.start",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Technical Integration Execution",
    criticality: "P0"
  },
  {
    action: "integration.evidence.record",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Technical Integration Evidence",
    criticality: "P0"
  },
  {
    action: "integration.blocker.set",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Technical Integration Blocker",
    criticality: "P0"
  },
  {
    action: "integration.blocker.resolve",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Technical Integration Blocker",
    criticality: "P1"
  },
  {
    action: "commercial_test.create",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Media Commercial Readiness",
    criticality: "P0"
  },
  {
    action: "commercial_test.conclude",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Media Commercial Readiness",
    criticality: "P0"
  },
  {
    action: "publisher.sales_readiness.approve",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Media Scale Approval",
    criticality: "P0"
  },
  {
    action: "trusted_supply.evaluate",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Trusted Supply Qualification",
    criticality: "P0"
  },
  {
    action: "trusted_supply.pool.confirm",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Trusted Supply Pool Confirmation",
    criticality: "P0"
  },
  {
    action: "trusted_supply.package.create",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Controlled Supply Packaging",
    criticality: "P0"
  },
  {
    action: "trusted_supply.package.activate",
    objectType: "publisher",
    module: "Media",
    workflowSurface: "Controlled Supply Activation",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.owner.assign",
    objectType: "media_ecosystem_lead",
    module: "Media",
    workflowSurface: "China Media Ecosystem Owner Assignment",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.owner.assign_batch",
    objectType: "media_ecosystem_lead",
    module: "Media",
    workflowSurface: "China Media Ecosystem Batch Owner Assignment",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.manual_review",
    objectType: "media_ecosystem_lead",
    module: "Media",
    workflowSurface: "China Media Ecosystem Manual Review",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.manual_review_batch",
    objectType: "media_ecosystem_lead",
    module: "Media",
    workflowSurface: "China Media Ecosystem Batch Manual Review",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.score.apply",
    objectType: "media_ecosystem_lead",
    module: "Media",
    workflowSurface: "China Media Ecosystem Priority Scoring",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.priority_screen",
    objectType: "media_ecosystem_lead",
    module: "Media",
    workflowSurface: "China Media Ecosystem Priority Screening",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.contact",
    objectType: "media_ecosystem_lead",
    module: "Media",
    workflowSurface: "China Media Ecosystem Outreach",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.business_qualify",
    objectType: "media_ecosystem_lead",
    module: "Media",
    workflowSurface: "China Media Ecosystem Business Qualification",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.trusted_gate.approve",
    objectType: "media_ecosystem_lead",
    module: "Media",
    workflowSurface: "Trusted Supply Candidate Gate Approval",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.trusted_candidate.create",
    objectType: "trusted_supply_candidate",
    module: "Media",
    workflowSurface: "Trusted Supply Candidate Creation",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.readiness.start",
    objectType: "trusted_supply_candidate",
    module: "Media",
    workflowSurface: "Trusted Supply Onboarding Readiness",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.technical_review.complete",
    objectType: "trusted_supply_candidate",
    module: "Media",
    workflowSurface: "Trusted Supply Technical Evaluation",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.commercial_review.complete",
    objectType: "trusted_supply_candidate",
    module: "Media",
    workflowSurface: "Trusted Supply Commercial Evaluation",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.onboarding_project.create",
    objectType: "trusted_supply_candidate",
    module: "Media",
    workflowSurface: "Trusted Supply Onboarding Project",
    criticality: "P0"
  },
  {
    action: "china_media_ecosystem.onboarding_handoff.create",
    objectType: "trusted_supply_candidate",
    module: "Media",
    workflowSurface: "Trusted Supply Onboarding Handoff",
    criticality: "P0"
  },
  {
    action: "advertiser.create",
    objectType: "advertiser",
    module: "Sales",
    workflowSurface: "Sales Advertiser Intake",
    criticality: "P1"
  },
  {
    action: "opportunity.create",
    objectType: "opportunity",
    module: "Sales",
    workflowSurface: "Sales Opportunity Intake",
    criticality: "P0"
  },
  {
    action: "proposal.create",
    objectType: "proposal",
    module: "Sales",
    workflowSurface: "Sales Proposal Flow",
    criticality: "P0"
  },
  {
    action: "proposal.publisher.select",
    objectType: "proposal",
    module: "Sales",
    workflowSurface: "Sales Proposal Media Validation",
    criticality: "P0"
  },
  {
    action: "proposal.approve",
    objectType: "proposal",
    module: "Sales",
    workflowSurface: "Sales Proposal Approval",
    criticality: "P0"
  },
  {
    action: "campaign.create",
    objectType: "campaign",
    module: "Campaigns",
    workflowSurface: "Campaign Creation",
    criticality: "P0"
  },
  {
    action: "campaign.publisher.allocate",
    objectType: "campaign",
    module: "Campaigns",
    workflowSurface: "Campaign Publisher Allocation",
    criticality: "P0"
  },
  {
    action: "campaign.launch_check.complete",
    objectType: "campaign",
    module: "Campaigns",
    workflowSurface: "Campaign Launch Checklist",
    criticality: "P0"
  },
  {
    action: "campaign.launch.approve",
    objectType: "campaign",
    module: "Campaigns",
    workflowSurface: "Campaign Launch Approval",
    criticality: "P0"
  },
  {
    action: "settlement.reconcile",
    objectType: "settlement",
    module: "Finance",
    workflowSurface: "Finance Reconciliation",
    criticality: "P0"
  },
  {
    action: "settlement.confirm",
    objectType: "settlement",
    module: "Finance",
    workflowSurface: "Finance Settlement Confirmation",
    criticality: "P0"
  },
  {
    action: "settlement.invoice.issue",
    objectType: "settlement",
    module: "Finance",
    workflowSurface: "Finance Invoice Issue",
    criticality: "P0"
  },
  {
    action: "settlement.payment.mark_paid",
    objectType: "settlement",
    module: "Finance",
    workflowSurface: "Finance Payment Confirmation",
    criticality: "P0"
  },
  {
    action: "contract.review.request",
    objectType: "contract",
    module: "Contracts",
    workflowSurface: "Contract Intake",
    criticality: "P0"
  },
  {
    action: "contract.legal_review.start",
    objectType: "contract",
    module: "Contracts",
    workflowSurface: "Contract Legal Review",
    criticality: "P0"
  },
  {
    action: "contract.finance_review.request",
    objectType: "contract",
    module: "Contracts",
    workflowSurface: "Contract Finance Review",
    criticality: "P0"
  },
  {
    action: "contract.finance_terms.approve",
    objectType: "contract",
    module: "Contracts",
    workflowSurface: "Contract Finance Terms Approval",
    criticality: "P0"
  },
  {
    action: "contract.legal_review.approve",
    objectType: "contract",
    module: "Contracts",
    workflowSurface: "Contract Legal Approval",
    criticality: "P0"
  },
  {
    action: "contract.redline.send",
    objectType: "contract",
    module: "Contracts",
    workflowSurface: "Contract Redline",
    criticality: "P1"
  },
  {
    action: "contract.sign",
    objectType: "contract",
    module: "Contracts",
    workflowSurface: "Contract Signing",
    criticality: "P0"
  },
  {
    action: "contract.archive",
    objectType: "contract",
    module: "Contracts",
    workflowSurface: "Contract Archive",
    criticality: "P1"
  }
];

const coreActionIndex = new Map(
  CORE_BUSINESS_AUDIT_ACTIONS.map((definition) => [`${definition.objectType}:${definition.action}`, definition])
);

export function getCoreBusinessAuditAction(action: string, objectType: ObjectType) {
  return coreActionIndex.get(`${objectType}:${action}`);
}

export function buildBusinessAuditAfterData(
  event: Pick<AuditEvent, "action" | "objectType" | "allowed" | "reasonCode">,
  actorRole?: RoleCode
) {
  const coreAction = getCoreBusinessAuditAction(event.action, event.objectType);

  return {
    allowed: event.allowed,
    reasonCode: event.reasonCode,
    ...(actorRole ? { actorRole } : {}),
    ...(coreAction
      ? {
          businessAuditCoverage: "phase28_core_business_action",
          businessModule: coreAction.module,
          workflowAction: coreAction.action,
          workflowSurface: coreAction.workflowSurface,
          criticality: coreAction.criticality
        }
      : {})
  };
}
