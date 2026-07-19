import type {
  ContractWorkflowState,
  EntityId,
  FinanceWorkflowState,
  MediaWorkflowState,
  SalesWorkflowState,
  WorkbenchTask
} from "../../types/domain";

export type WorkbenchHandoffKind =
  | "advertiser"
  | "opportunity"
  | "proposal"
  | "campaign"
  | "publisher"
  | "ecosystemLead"
  | "trustedCandidate"
  | "integration"
  | "diagnostic"
  | "settlement"
  | "contract"
  | "task";

export type WorkbenchHandoffNode = {
  key: string;
  kind: WorkbenchHandoffKind;
  label: string;
  route?: string;
  objectId?: EntityId;
};

export type WorkbenchHandoffContext = {
  upstream: WorkbenchHandoffNode[];
  current: WorkbenchHandoffNode;
  downstream: WorkbenchHandoffNode[];
};

export type WorkbenchHandoffInput = {
  mediaState: MediaWorkflowState;
  salesState: SalesWorkflowState;
  financeState: FinanceWorkflowState;
  contractState: ContractWorkflowState;
};

export type WorkbenchModuleSummary = {
  module: WorkbenchTask["module"];
  total: number;
  p0: number;
  blocked: number;
  nextTask?: WorkbenchTask;
};

function node(kind: WorkbenchHandoffKind, label: string, route?: string, objectId?: EntityId): WorkbenchHandoffNode {
  return {
    key: `${kind}-${objectId ?? label}`,
    kind,
    label,
    route,
    objectId
  };
}

function unique(nodes: WorkbenchHandoffNode[]) {
  return Array.from(new Map(nodes.map((item) => [item.key, item])).values());
}

function findOpportunityChain(input: WorkbenchHandoffInput, opportunityId?: EntityId) {
  const opportunity = input.salesState.opportunities.find((item) => item.id === opportunityId);
  const advertiser = input.salesState.advertisers.find((item) => item.id === opportunity?.advertiser_id);
  return { opportunity, advertiser };
}

function findProposalChain(input: WorkbenchHandoffInput, proposalId?: EntityId) {
  const proposal = input.salesState.proposals.find((item) => item.id === proposalId);
  return { proposal, ...findOpportunityChain(input, proposal?.opportunity_id) };
}

function findCampaignChain(input: WorkbenchHandoffInput, campaignId?: EntityId) {
  const campaign = input.salesState.campaigns.find((item) => item.id === campaignId);
  return { campaign, ...findProposalChain(input, campaign?.proposal_id) };
}

function getCurrentNode(task: WorkbenchTask, input: WorkbenchHandoffInput): WorkbenchHandoffNode {
  const objectId = task.source_object_id;

  if (task.source_object_type === "proposal") {
    const proposal = input.salesState.proposals.find((item) => item.id === objectId);
    return node("proposal", proposal?.name ?? task.title, "/proposals/:id/wizard", objectId);
  }
  if (task.source_object_type === "campaign") {
    const campaign = input.salesState.campaigns.find((item) => item.id === objectId);
    return node("campaign", campaign?.name ?? task.title, "/campaigns/:id/wizard", objectId);
  }
  if (task.source_object_type === "opportunity") {
    const opportunity = input.salesState.opportunities.find((item) => item.id === objectId);
    return node("opportunity", opportunity?.name ?? task.title, "/sales/manager-workbench", objectId);
  }
  if (task.source_object_type === "advertiser") {
    const advertiser = input.salesState.advertisers.find((item) => item.id === objectId);
    return node("advertiser", advertiser?.name ?? task.title, "/sales/manager-workbench", objectId);
  }
  if (task.source_object_type === "settlement") {
    return node("settlement", objectId ?? task.title, "/finance/settlements/:id", objectId);
  }
  if (task.source_object_type === "contract") {
    const contract = input.contractState.contracts.find((item) => item.id === objectId);
    return node("contract", contract?.contract_no ?? task.title, "/contracts/:id", objectId);
  }
  if (task.source_object_type === "publisher") {
    const publisher = input.mediaState.publishers.find((item) => item.id === objectId);
    return node("publisher", publisher?.name ?? task.title, "/media/publishers/:id", objectId);
  }
  if (task.source_object_type === "trusted_supply_candidate") {
    const candidate = input.mediaState.trustedSupplyCandidates.find((item) => item.id === objectId);
    return node("trustedCandidate", candidate?.media_name ?? task.title, "/media/china-ecosystem", objectId);
  }
  if (task.source_object_type === "media_ecosystem_lead") {
    const lead = input.mediaState.mediaEcosystemLeads.find((item) => item.id === objectId);
    return node("ecosystemLead", lead?.media_name ?? task.title, "/media/china-ecosystem", objectId);
  }
  if (task.source_object_type === "diagnostic_case") {
    const diagnostic = input.mediaState.diagnosticCases.find((item) => item.id === objectId);
    return node("diagnostic", diagnostic?.case_no ?? task.title, "/diagnostics/:id", objectId);
  }

  return node("task", task.title, task.related_route, objectId);
}

export function getWorkbenchHandoffContext(task: WorkbenchTask, input: WorkbenchHandoffInput): WorkbenchHandoffContext {
  const upstream: WorkbenchHandoffNode[] = [];
  const downstream: WorkbenchHandoffNode[] = [];
  const objectId = task.source_object_id;

  if (task.source_object_type === "proposal") {
    const { opportunity, advertiser } = findProposalChain(input, objectId);
    if (advertiser) upstream.push(node("advertiser", advertiser.name, "/sales/manager-workbench", advertiser.id));
    if (opportunity) upstream.push(node("opportunity", opportunity.name, "/sales/manager-workbench", opportunity.id));
    const campaign = input.salesState.campaigns.find((item) => item.proposal_id === objectId);
    if (campaign) downstream.push(node("campaign", campaign.name, "/campaigns/:id/wizard", campaign.id));
    const settlement = input.financeState.settlements.find((item) => item.campaign_id === campaign?.id);
    if (settlement) downstream.push(node("settlement", settlement.id, "/finance/settlements/:id", settlement.id));
  } else if (task.source_object_type === "campaign") {
    const { proposal, opportunity, advertiser } = findCampaignChain(input, objectId);
    if (advertiser) upstream.push(node("advertiser", advertiser.name, "/sales/manager-workbench", advertiser.id));
    if (opportunity) upstream.push(node("opportunity", opportunity.name, "/sales/manager-workbench", opportunity.id));
    if (proposal) upstream.push(node("proposal", proposal.name, "/proposals/:id/wizard", proposal.id));
    input.financeState.settlements
      .filter((item) => item.campaign_id === objectId)
      .forEach((item) => downstream.push(node("settlement", item.id, "/finance/settlements/:id", item.id)));
    input.contractState.contracts
      .filter((item) => item.advertiser_id === advertiser?.id)
      .forEach((item) => downstream.push(node("contract", item.contract_no, "/contracts/:id", item.id)));
  } else if (task.source_object_type === "settlement") {
    const settlement = input.financeState.settlements.find((item) => item.id === objectId);
    const { campaign, proposal } = findCampaignChain(input, settlement?.campaign_id);
    const publisher = input.mediaState.publishers.find((item) => item.id === settlement?.publisher_id);
    if (proposal) upstream.push(node("proposal", proposal.name, "/proposals/:id/wizard", proposal.id));
    if (campaign) upstream.push(node("campaign", campaign.name, "/campaigns/:id/wizard", campaign.id));
    if (publisher) upstream.push(node("publisher", publisher.name, "/media/publishers/:id", publisher.id));
    input.contractState.contracts
      .filter((item) => item.settlement_id === objectId)
      .forEach((item) => downstream.push(node("contract", item.contract_no, "/contracts/:id", item.id)));
  } else if (task.source_object_type === "contract") {
    const contract = input.contractState.contracts.find((item) => item.id === objectId);
    const advertiser = input.salesState.advertisers.find((item) => item.id === contract?.advertiser_id);
    const publisher = input.mediaState.publishers.find((item) => item.id === contract?.publisher_id);
    const settlement = input.financeState.settlements.find((item) => item.id === contract?.settlement_id);
    const campaign = input.salesState.campaigns.find((item) => item.id === settlement?.campaign_id);
    if (advertiser) upstream.push(node("advertiser", advertiser.name, "/sales/manager-workbench", advertiser.id));
    if (campaign) upstream.push(node("campaign", campaign.name, "/campaigns/:id/wizard", campaign.id));
    if (publisher) upstream.push(node("publisher", publisher.name, "/media/publishers/:id", publisher.id));
    if (settlement) upstream.push(node("settlement", settlement.id, "/finance/settlements/:id", settlement.id));
  } else if (task.source_object_type === "publisher") {
    const lead = input.mediaState.mediaEcosystemLeads.find((item) => item.linked_publisher_id === objectId);
    const candidate = input.mediaState.trustedSupplyCandidates.find(
      (item) => item.publisher_id === objectId || item.lead_id === lead?.id
    );
    if (lead) upstream.push(node("ecosystemLead", lead.media_name, "/media/china-ecosystem", lead.id));
    if (candidate) upstream.push(node("trustedCandidate", candidate.media_name, "/media/china-ecosystem", candidate.id));
    const integration = input.mediaState.integrationProjects.find((item) => item.publisher_id === objectId);
    if (integration) downstream.push(node("integration", integration.id, "/media/integration-wizard/:id", objectId));
    const proposal = input.salesState.proposals.find((item) => item.selectedPublisherIds.includes(objectId ?? ""));
    if (proposal) downstream.push(node("proposal", proposal.name, "/proposals/:id/wizard", proposal.id));
    const campaign = input.salesState.campaigns.find((item) => item.publisherIds.includes(objectId ?? ""));
    if (campaign) downstream.push(node("campaign", campaign.name, "/campaigns/:id/wizard", campaign.id));
  } else if (task.source_object_type === "trusted_supply_candidate") {
    const candidate = input.mediaState.trustedSupplyCandidates.find((item) => item.id === objectId);
    const lead = input.mediaState.mediaEcosystemLeads.find((item) => item.id === candidate?.lead_id);
    const publisher = input.mediaState.publishers.find((item) => item.id === candidate?.publisher_id);
    if (lead) upstream.push(node("ecosystemLead", lead.media_name, "/media/china-ecosystem", lead.id));
    if (publisher) downstream.push(node("publisher", publisher.name, "/media/publishers/:id", publisher.id));
    const integration = input.mediaState.integrationProjects.find((item) => item.publisher_id === publisher?.id);
    if (integration && publisher) downstream.push(node("integration", integration.id, "/media/integration-wizard/:id", publisher.id));
  } else if (task.source_object_type === "media_ecosystem_lead") {
    const candidate = input.mediaState.trustedSupplyCandidates.find((item) => item.lead_id === objectId);
    if (candidate) downstream.push(node("trustedCandidate", candidate.media_name, "/media/china-ecosystem", candidate.id));
    const publisher = input.mediaState.publishers.find(
      (item) => item.id === candidate?.publisher_id || item.id === input.mediaState.mediaEcosystemLeads.find((lead) => lead.id === objectId)?.linked_publisher_id
    );
    if (publisher) downstream.push(node("publisher", publisher.name, "/media/publishers/:id", publisher.id));
  } else if (task.source_object_type === "diagnostic_case") {
    const diagnostic = input.mediaState.diagnosticCases.find((item) => item.id === objectId);
    const publisher = input.mediaState.publishers.find((item) => item.id === diagnostic?.publisher_id);
    const campaign = input.salesState.campaigns.find((item) => item.id === diagnostic?.campaign_id);
    const settlement = input.financeState.settlements.find((item) => item.id === diagnostic?.settlement_id);
    if (publisher) upstream.push(node("publisher", publisher.name, "/media/publishers/:id", publisher.id));
    if (campaign) upstream.push(node("campaign", campaign.name, "/campaigns/:id/wizard", campaign.id));
    if (settlement) downstream.push(node("settlement", settlement.id, "/finance/settlements/:id", settlement.id));
  } else if (task.source_object_type === "opportunity") {
    const { opportunity, advertiser } = findOpportunityChain(input, objectId);
    if (advertiser) upstream.push(node("advertiser", advertiser.name, "/sales/manager-workbench", advertiser.id));
    const proposal = input.salesState.proposals.find((item) => item.opportunity_id === opportunity?.id);
    if (proposal) downstream.push(node("proposal", proposal.name, "/proposals/:id/wizard", proposal.id));
  }

  return {
    upstream: unique(upstream),
    current: getCurrentNode(task, input),
    downstream: unique(downstream)
  };
}

const moduleOrder: WorkbenchTask["module"][] = ["Media", "Sales", "Campaigns", "Contracts", "Finance", "Diagnostics", "Guide", "Admin", "Workbench"];

export function getWorkbenchModuleSummaries(tasks: WorkbenchTask[]): WorkbenchModuleSummary[] {
  return moduleOrder
    .map((module) => {
      const moduleTasks = tasks.filter((task) => task.module === module && task.status !== "done");
      return {
        module,
        total: moduleTasks.length,
        p0: moduleTasks.filter((task) => task.priority === "P0").length,
        blocked: moduleTasks.filter((task) => task.status === "blocked").length,
        nextTask: moduleTasks.find((task) => task.status !== "blocked") ?? moduleTasks[0]
      };
    })
    .filter((summary) => summary.total > 0);
}
