import type { GuardResult } from "../types/guards";
import type {
  Advertiser,
  AuditEvent,
  BusinessUser,
  Campaign,
  CampaignMediaAllocation,
  EntityId,
  MediaWorkflowState,
  ModuleBusinessEvent,
  ObjectType,
  Opportunity,
  Proposal,
  ProposalMediaSelection,
  SalesWorkflowState
} from "../types/domain";
import { auditService } from "./auditService";
import { fixtureRepository } from "./fixtures";
import { GuardService } from "./guardService";
import { rbacService } from "./rbacService";
import { rlsService } from "./rlsService";

type SalesWorkflowResult = {
  state: SalesWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

type CreateAdvertiserInput = {
  name: string;
  industry: string;
  region: string;
};

type CreateOpportunityInput = {
  advertiserId: EntityId;
  name: string;
  expectedBudget: number;
  painPoints: string[];
};

function createAllowed(message: string, reasonCode: string): GuardResult {
  return {
    allowed: true,
    severity: "info",
    reason_code: reasonCode,
    message,
    audit_required: true
  };
}

function createBlocked(message: string, reasonCode: string, requiredApprovalRole?: string): GuardResult {
  return {
    allowed: false,
    severity: "blocked",
    reason_code: reasonCode,
    message,
    required_approval_role: requiredApprovalRole,
    audit_required: true
  };
}

function toGuardStatus(guard: GuardResult): ProposalMediaSelection["guard_status"] {
  if (!guard.allowed) {
    return "blocked";
  }

  return guard.severity === "warning" ? "warning" : "allowed";
}

function createBusinessEvent(
  eventCode: string,
  objectType: ObjectType,
  objectId: EntityId,
  ownerRole: BusinessUser["activeRole"],
  payload?: Record<string, unknown>
): ModuleBusinessEvent {
  return {
    id: crypto.randomUUID(),
    eventCode,
    objectType,
    objectId,
    ownerRole,
    createdAt: new Date().toISOString(),
    payload
  };
}

function appendEvents(
  state: SalesWorkflowState,
  user: BusinessUser,
  action: string,
  objectType: ObjectType,
  objectId: EntityId | undefined,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent
): SalesWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, objectType, guard, objectId);

  return {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };
}

export function createInitialSalesWorkflowState(): SalesWorkflowState {
  return {
    advertisers: fixtureRepository.advertisers.map((advertiser) => ({ ...advertiser })),
    advertiserContacts: fixtureRepository.advertiserContacts.map((contact) => ({ ...contact })),
    opportunities: fixtureRepository.opportunities.map((opportunity) => ({
      ...opportunity,
      pain_points: [...opportunity.pain_points]
    })),
    proposals: fixtureRepository.proposals.map((proposal) => ({
      ...proposal,
      selectedPublisherIds: [...proposal.selectedPublisherIds]
    })),
    proposalMediaSelections: fixtureRepository.proposalMediaSelections.map((selection) => ({ ...selection })),
    campaigns: fixtureRepository.campaigns.map((campaign) => ({
      ...campaign,
      publisherIds: [...campaign.publisherIds]
    })),
    campaignMediaAllocations: fixtureRepository.campaignMediaAllocations.map((allocation) => ({ ...allocation })),
    auditEvents: [],
    businessEvents: []
  };
}

function getGuardService(salesState: SalesWorkflowState, mediaState: MediaWorkflowState) {
  return new GuardService({
    ...fixtureRepository,
    publishers: mediaState.publishers,
    diagnosticCases: mediaState.diagnosticCases,
    proposals: salesState.proposals,
    campaigns: salesState.campaigns
  });
}

function getAllocationGuardService(salesState: SalesWorkflowState, mediaState: MediaWorkflowState, campaignId: EntityId) {
  return getGuardService(
    {
      ...salesState,
      campaigns: salesState.campaigns.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              launchChecklistPassed: true
            }
          : campaign
      )
    },
    mediaState
  );
}

export class SalesWorkflowService {
  getSummary(state: SalesWorkflowState) {
    return {
      advertisers: state.advertisers.length,
      opportunities: state.opportunities.length,
      proposalDrafts: state.proposals.filter((proposal) => ["draft", "media_validation", "internal_review"].includes(proposal.status)).length,
      campaigns: state.campaigns.length,
      blockedMedia: state.proposalMediaSelections.filter((selection) => selection.guard_status === "blocked").length
    };
  }

  createAdvertiser(state: SalesWorkflowState, user: BusinessUser, input: CreateAdvertiserInput): SalesWorkflowResult {
    if (!rlsService.canWriteTable(user, "advertisers") || !rbacService.hasCapability(user, "advertiser.manage")) {
      const guard = createBlocked("Current role cannot create advertisers.", "ADVERTISER_CREATE_FORBIDDEN", "sales_manager");
      return { state: appendEvents(state, user, "advertiser.create", "advertiser", undefined, guard), guard };
    }

    const id = crypto.randomUUID();
    const advertiser: Advertiser = {
      id,
      name: input.name,
      industry: input.industry,
      region: input.region,
      status: "active"
    };
    const nextState = {
      ...state,
      advertisers: [advertiser, ...state.advertisers]
    };
    const guard = createAllowed("Advertiser created.", "ADVERTISER_CREATED");
    const businessEvent = createBusinessEvent("advertiser.created", "advertiser", id, user.activeRole, {
      industry: input.industry
    });
    const eventState = appendEvents(nextState, user, "advertiser.create", "advertiser", id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  createOpportunity(state: SalesWorkflowState, user: BusinessUser, input: CreateOpportunityInput): SalesWorkflowResult {
    if (!state.advertisers.some((advertiser) => advertiser.id === input.advertiserId)) {
      const guard = createBlocked("Advertiser was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "opportunity.create", "opportunity", undefined, guard), guard };
    }

    if (!rlsService.canWriteTable(user, "opportunities") || !rbacService.hasCapability(user, "advertiser.manage")) {
      const guard = createBlocked("Current role cannot create opportunities.", "OPPORTUNITY_CREATE_FORBIDDEN", "sales_manager");
      return { state: appendEvents(state, user, "opportunity.create", "opportunity", undefined, guard), guard };
    }

    const id = crypto.randomUUID();
    const opportunity: Opportunity = {
      id,
      advertiser_id: input.advertiserId,
      name: input.name,
      stage: "need_confirmed",
      expected_budget: input.expectedBudget,
      pain_points: input.painPoints
    };
    const nextState = {
      ...state,
      opportunities: [opportunity, ...state.opportunities]
    };
    const guard = createAllowed("Opportunity created.", "OPPORTUNITY_CREATED");
    const businessEvent = createBusinessEvent("opportunity.created", "opportunity", id, user.activeRole, {
      expectedBudget: input.expectedBudget
    });
    const eventState = appendEvents(nextState, user, "opportunity.create", "opportunity", id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  createProposalFromOpportunity(state: SalesWorkflowState, user: BusinessUser, opportunityId: EntityId): SalesWorkflowResult {
    const opportunity = state.opportunities.find((candidate) => candidate.id === opportunityId);

    if (!opportunity) {
      const guard = createBlocked("Opportunity was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "proposal.create", "proposal", undefined, guard), guard };
    }

    if (!rlsService.canWriteTable(user, "proposals") || !rbacService.hasCapability(user, "proposal.manage")) {
      const guard = createBlocked("Current role cannot create proposals.", "PROPOSAL_CREATE_FORBIDDEN", "sales_manager");
      return { state: appendEvents(state, user, "proposal.create", "proposal", undefined, guard), guard };
    }

    const id = crypto.randomUUID();
    const proposal: Proposal = {
      id,
      opportunity_id: opportunity.id,
      name: `${opportunity.name} Proposal`,
      status: "media_validation",
      budget: opportunity.expected_budget,
      selectedPublisherIds: []
    };
    const nextState = {
      ...state,
      proposals: [proposal, ...state.proposals],
      opportunities: state.opportunities.map((candidate) =>
        candidate.id === opportunity.id
          ? {
              ...candidate,
              stage: "proposal_drafting" as const
            }
          : candidate
      )
    };
    const guard = createAllowed("Proposal created from opportunity.", "PROPOSAL_CREATED");
    const businessEvent = createBusinessEvent("proposal.created", "proposal", id, user.activeRole, {
      opportunityId
    });
    const eventState = appendEvents(nextState, user, "proposal.create", "proposal", id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  selectPublisherForProposal(
    state: SalesWorkflowState,
    mediaState: MediaWorkflowState,
    user: BusinessUser,
    proposalId: EntityId,
    publisherId: EntityId,
    plannedBudget: number
  ): SalesWorkflowResult {
    const guard = getGuardService(state, mediaState).canSelectPublisherForProposal(user, publisherId, proposalId);
    const proposal = state.proposals.find((candidate) => candidate.id === proposalId);

    if (!proposal) {
      const notFound = createBlocked("Proposal was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "proposal.publisher.select", "proposal", proposalId, notFound), guard: notFound };
    }

    const selection: ProposalMediaSelection = {
      id: crypto.randomUUID(),
      proposal_id: proposalId,
      publisher_id: publisherId,
      guard_status: toGuardStatus(guard),
      guard_reason: guard.reason_code,
      planned_budget: plannedBudget
    };
    const selectedPublisherIds = guard.allowed
      ? Array.from(new Set([...proposal.selectedPublisherIds, publisherId]))
      : proposal.selectedPublisherIds;
    const nextState = {
      ...state,
      proposals: state.proposals.map((candidate) =>
        candidate.id === proposalId
          ? {
              ...candidate,
              selectedPublisherIds,
              status: guard.allowed ? ("internal_review" as const) : candidate.status
            }
          : candidate
      ),
      proposalMediaSelections: [
        selection,
        ...state.proposalMediaSelections.filter(
          (candidate) => !(candidate.proposal_id === proposalId && candidate.publisher_id === publisherId)
        )
      ]
    };
    const businessEvent = createBusinessEvent("proposal.publisher_guard_evaluated", "proposal", proposalId, user.activeRole, {
      publisherId,
      guard: guard.reason_code
    });
    const eventState = appendEvents(nextState, user, "proposal.publisher.select", "proposal", proposalId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  approveProposal(state: SalesWorkflowState, mediaState: MediaWorkflowState, user: BusinessUser, proposalId: EntityId): SalesWorkflowResult {
    const guard = getGuardService(state, mediaState).canApproveProposal(user, proposalId);

    if (!guard.allowed) {
      return { state: appendEvents(state, user, "proposal.approve", "proposal", proposalId, guard), guard };
    }

    const nextState = {
      ...state,
      proposals: state.proposals.map((proposal) =>
        proposal.id === proposalId
          ? {
              ...proposal,
              status: "approved_to_send" as const
            }
          : proposal
      )
    };
    const businessEvent = createBusinessEvent("proposal.approved_to_send", "proposal", proposalId, user.activeRole);
    const eventState = appendEvents(nextState, user, "proposal.approve", "proposal", proposalId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  createCampaignFromProposal(state: SalesWorkflowState, user: BusinessUser, proposalId: EntityId): SalesWorkflowResult {
    const proposal = state.proposals.find((candidate) => candidate.id === proposalId);

    if (!proposal) {
      const guard = createBlocked("Proposal was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "campaign.create", "campaign", undefined, guard), guard };
    }

    if (!rlsService.canWriteTable(user, "campaigns") || !rbacService.hasCapability(user, "campaign.manage")) {
      const guard = createBlocked("Current role cannot create campaigns.", "CAMPAIGN_CREATE_FORBIDDEN", "adops_manager");
      return { state: appendEvents(state, user, "campaign.create", "campaign", undefined, guard), guard };
    }

    const opportunity = state.opportunities.find((candidate) => candidate.id === proposal.opportunity_id);
    const id = crypto.randomUUID();
    const campaign: Campaign = {
      id,
      proposal_id: proposal.id,
      advertiser_id: opportunity?.advertiser_id,
      name: `${proposal.name} Campaign`,
      status: "launch_check",
      publisherIds: [],
      launchChecklistPassed: false
    };
    const nextState = {
      ...state,
      campaigns: [campaign, ...state.campaigns]
    };
    const guard = createAllowed("Campaign created from proposal.", "CAMPAIGN_CREATED");
    const businessEvent = createBusinessEvent("campaign.created", "campaign", id, user.activeRole, {
      proposalId
    });
    const eventState = appendEvents(nextState, user, "campaign.create", "campaign", id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  addPublisherToCampaign(
    state: SalesWorkflowState,
    mediaState: MediaWorkflowState,
    user: BusinessUser,
    campaignId: EntityId,
    publisherId: EntityId,
    allocationBudget: number
  ): SalesWorkflowResult {
    const guard = getAllocationGuardService(state, mediaState, campaignId).canLaunchCampaignWithPublisher(
      user,
      publisherId,
      campaignId
    );
    const campaign = state.campaigns.find((candidate) => candidate.id === campaignId);

    if (!campaign) {
      const notFound = createBlocked("Campaign was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "campaign.publisher.allocate", "campaign", campaignId, notFound), guard: notFound };
    }

    const allocation: CampaignMediaAllocation = {
      id: crypto.randomUUID(),
      campaign_id: campaignId,
      publisher_id: publisherId,
      guard_status: toGuardStatus(guard),
      guard_reason: guard.reason_code,
      allocation_budget: allocationBudget
    };
    const publisherIds = guard.allowed ? Array.from(new Set([...campaign.publisherIds, publisherId])) : campaign.publisherIds;
    const nextState = {
      ...state,
      campaigns: state.campaigns.map((candidate) =>
        candidate.id === campaignId
          ? {
              ...candidate,
              publisherIds
            }
          : candidate
      ),
      campaignMediaAllocations: [
        allocation,
        ...state.campaignMediaAllocations.filter(
          (candidate) => !(candidate.campaign_id === campaignId && candidate.publisher_id === publisherId)
        )
      ]
    };
    const businessEvent = createBusinessEvent("campaign.publisher_guard_evaluated", "campaign", campaignId, user.activeRole, {
      publisherId,
      guard: guard.reason_code
    });
    const eventState = appendEvents(nextState, user, "campaign.publisher.allocate", "campaign", campaignId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  markLaunchChecklistPassed(state: SalesWorkflowState, user: BusinessUser, campaignId: EntityId): SalesWorkflowResult {
    const campaign = state.campaigns.find((candidate) => candidate.id === campaignId);

    if (!campaign) {
      const guard = createBlocked("Campaign was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "campaign.launch_check.complete", "campaign", campaignId, guard), guard };
    }

    if (!rlsService.canWriteTable(user, "campaigns") || !rbacService.hasCapability(user, "campaign.manage")) {
      const guard = createBlocked("Current role cannot complete campaign launch checklist.", "LAUNCH_CHECKLIST_FORBIDDEN", "adops_manager");
      return { state: appendEvents(state, user, "campaign.launch_check.complete", "campaign", campaignId, guard), guard };
    }

    const nextState = {
      ...state,
      campaigns: state.campaigns.map((candidate) =>
        candidate.id === campaignId
          ? {
              ...candidate,
              launchChecklistPassed: true,
              status: "pending_approval" as const
            }
          : candidate
      )
    };
    const guard = createAllowed("Campaign launch checklist completed.", "LAUNCH_CHECKLIST_PASSED");
    const businessEvent = createBusinessEvent("campaign.launch_check_passed", "campaign", campaignId, user.activeRole);
    const eventState = appendEvents(nextState, user, "campaign.launch_check.complete", "campaign", campaignId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  approveCampaignLaunch(state: SalesWorkflowState, mediaState: MediaWorkflowState, user: BusinessUser, campaignId: EntityId): SalesWorkflowResult {
    const guard = getGuardService(state, mediaState).canApproveCampaignLaunch(user, campaignId);

    if (!guard.allowed) {
      return { state: appendEvents(state, user, "campaign.launch.approve", "campaign", campaignId, guard), guard };
    }

    const nextState = {
      ...state,
      campaigns: state.campaigns.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              status: "approved" as const
            }
          : campaign
      )
    };
    const businessEvent = createBusinessEvent("campaign.launch_approved", "campaign", campaignId, user.activeRole);
    const eventState = appendEvents(nextState, user, "campaign.launch.approve", "campaign", campaignId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }
}

export const salesWorkflowService = new SalesWorkflowService();
