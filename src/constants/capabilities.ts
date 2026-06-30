import type { RoleCode } from "./roles";

export const capabilityCodes = [
  "publisher.manage",
  "publisher.readiness.approve",
  "integration.manage",
  "advertiser.manage",
  "proposal.manage",
  "proposal.approve",
  "campaign.manage",
  "campaign.launch.approve",
  "diagnostic.manage",
  "settlement.manage",
  "settlement.confirm",
  "contract.manage",
  "okr.manage",
  "sop.manage",
  "audit.read",
  "system.admin"
] as const;

export type CapabilityCode = (typeof capabilityCodes)[number];

export const roleCapabilities: Record<RoleCode, CapabilityCode[]> = {
  ceo: ["audit.read", "okr.manage"],
  operations_director: [
    "publisher.manage",
    "integration.manage",
    "advertiser.manage",
    "proposal.manage",
    "campaign.manage",
    "campaign.launch.approve",
    "diagnostic.manage",
    "settlement.manage",
    "okr.manage",
    "sop.manage",
    "audit.read"
  ],
  sales_director: ["advertiser.manage", "proposal.manage", "proposal.approve", "okr.manage", "audit.read"],
  sales_manager: ["advertiser.manage", "proposal.manage"],
  media_director: ["publisher.manage", "publisher.readiness.approve", "integration.manage", "diagnostic.manage", "okr.manage", "audit.read"],
  media_manager: ["publisher.manage", "diagnostic.manage"],
  adops_manager: ["campaign.manage", "diagnostic.manage"],
  integration_manager: ["integration.manage", "diagnostic.manage"],
  data_analyst: ["diagnostic.manage"],
  finance_manager: ["settlement.manage", "settlement.confirm", "diagnostic.manage"],
  legal_manager: ["contract.manage"],
  customer_success_manager: ["advertiser.manage", "campaign.manage"],
  product_owner: ["okr.manage", "sop.manage"],
  system_admin: ["system.admin"],
  audit_viewer: ["audit.read"]
};

