import type { GuardResult } from "../types/guards";
import type {
  AuditEvent,
  BusinessUser,
  CommercialTest,
  EntityId,
  MediaWorkflowState,
  ModuleBusinessEvent,
  Publisher,
  PublisherAdSlot,
  PublisherContact,
  PublisherContractTerm
} from "../types/domain";
import { auditService } from "./auditService";
import { fixtureRepository } from "./fixtures";
import { GuardService } from "./guardService";
import { rbacService } from "./rbacService";
import { rlsService } from "./rlsService";

type WorkflowResult = {
  state: MediaWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

type CreatePublisherInput = {
  name: string;
  region: string;
  mediaType: string;
  integrationType: string;
};

type AdSlotInput = {
  slotName: string;
  adFormat: string;
  placementType: string;
  floorPrice?: number;
  dailyRequests?: number;
};

type ContractTermInput = {
  contractType: string;
  billingModel: string;
  settlementCycle: string;
  paymentTerms: string;
  revenueShare?: number;
};

export function createInitialMediaWorkflowState(): MediaWorkflowState {
  return {
    publishers: fixtureRepository.publishers.map((publisher) => ({ ...publisher })),
    publisherContacts: fixtureRepository.publisherContacts.map((contact) => ({ ...contact })),
    publisherAdSlots: fixtureRepository.publisherAdSlots.map((slot) => ({ ...slot })),
    publisherContractTerms: fixtureRepository.publisherContractTerms.map((term) => ({ ...term })),
    integrationProjects: fixtureRepository.integrationProjects.map((project) => ({
      ...project,
      checklist: { ...project.checklist }
    })),
    commercialTests: fixtureRepository.commercialTests.map((test) => ({ ...test })),
    diagnosticCases: fixtureRepository.diagnosticCases.map((diagnosticCase) => ({ ...diagnosticCase })),
    diagnosticEvidence: fixtureRepository.diagnosticEvidence.map((evidence) => ({ ...evidence })),
    diagnosticActivities: fixtureRepository.diagnosticActivities.map((activity) => ({ ...activity })),
    auditEvents: [],
    businessEvents: []
  };
}

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

function createBusinessEvent(
  eventCode: string,
  objectId: EntityId,
  ownerRole: BusinessUser["activeRole"],
  payload?: Record<string, unknown>
): ModuleBusinessEvent {
  return {
    id: crypto.randomUUID(),
    eventCode,
    objectType: "publisher",
    objectId,
    ownerRole,
    createdAt: new Date().toISOString(),
    payload
  };
}

function appendEvents(
  state: MediaWorkflowState,
  user: BusinessUser,
  action: string,
  objectId: EntityId | undefined,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent
): MediaWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "publisher", guard, objectId);

  return {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };
}

function getGuardService(state: MediaWorkflowState) {
  return new GuardService({
    ...fixtureRepository,
    publishers: state.publishers,
    diagnosticCases: state.diagnosticCases
  });
}

function findPublisher(state: MediaWorkflowState, publisherId: EntityId) {
  return state.publishers.find((publisher) => publisher.id === publisherId);
}

function updatePublisher(
  state: MediaWorkflowState,
  publisherId: EntityId,
  patch: Partial<Publisher>
): MediaWorkflowState {
  return {
    ...state,
    publishers: state.publishers.map((publisher) =>
      publisher.id === publisherId
        ? {
            ...publisher,
            ...patch
          }
        : publisher
    )
  };
}

export class MediaWorkflowService {
  getPublisherSnapshot(state: MediaWorkflowState, publisherId: EntityId) {
    return {
      publisher: findPublisher(state, publisherId),
      contacts: state.publisherContacts.filter((contact) => contact.publisher_id === publisherId),
      adSlots: state.publisherAdSlots.filter((slot) => slot.publisher_id === publisherId),
      contractTerms: state.publisherContractTerms.filter((term) => term.publisher_id === publisherId),
      integrationProjects: state.integrationProjects.filter((project) => project.publisher_id === publisherId),
      commercialTests: state.commercialTests.filter((test) => test.publisher_id === publisherId),
      diagnosticCases: state.diagnosticCases.filter((diagnosticCase) => diagnosticCase.publisher_id === publisherId)
    };
  }

  getReadinessQueue(state: MediaWorkflowState) {
    return state.publishers.map((publisher) => ({
      publisher,
      openBlockingCases: state.diagnosticCases.filter(
        (diagnosticCase) =>
          diagnosticCase.publisher_id === publisher.id &&
          diagnosticCase.is_blocking_sales_scale &&
          !["closed", "rejected"].includes(diagnosticCase.status)
      ).length,
      adSlots: state.publisherAdSlots.filter((slot) => slot.publisher_id === publisher.id).length,
      terms: state.publisherContractTerms.filter((term) => term.publisher_id === publisher.id).length
    }));
  }

  getSummary(state: MediaWorkflowState) {
    const total = state.publishers.length;
    const technicalLive = state.publishers.filter((publisher) => publisher.technical_live_status === "technical_live_passed").length;
    const testPassed = state.publishers.filter((publisher) => publisher.commercial_test_status === "test_passed").length;
    const proposalSelectable = state.publishers.filter((publisher) =>
      ["limited_sellable", "proposal_selectable", "scale_ready"].includes(publisher.sales_scale_status)
    ).length;
    const scaleReady = state.publishers.filter((publisher) => publisher.sales_scale_status === "scale_ready").length;
    const highRisk = state.publishers.filter((publisher) => ["high", "critical"].includes(publisher.risk_level)).length;

    return {
      total,
      technicalLive,
      testPassed,
      proposalSelectable,
      scaleReady,
      highRisk
    };
  }

  createPublisher(state: MediaWorkflowState, user: BusinessUser, input: CreatePublisherInput): WorkflowResult {
    if (!rlsService.canWriteTable(user, "publishers") || !rbacService.hasCapability(user, "publisher.manage")) {
      const guard = createBlocked("Current role cannot create publishers.", "PUBLISHER_CREATE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "publisher.create", undefined, guard), guard };
    }

    const id = crypto.randomUUID();
    const publisher: Publisher = {
      id,
      name: input.name,
      region: input.region,
      media_type: input.mediaType,
      integration_type: input.integrationType,
      technical_live_status: "draft",
      commercial_test_status: "not_started",
      sales_scale_status: "not_allowed",
      risk_level: "medium"
    };
    const integrationProject = {
      id: crypto.randomUUID(),
      publisher_id: id,
      integration_type: input.integrationType,
      status: "pending_integration" as const,
      checklist: {},
      notes: "Created from media onboarding."
    };
    const nextState: MediaWorkflowState = {
      ...state,
      publishers: [publisher, ...state.publishers],
      integrationProjects: [integrationProject, ...state.integrationProjects]
    };
    const guard = createAllowed("Publisher created and integration project initialized.", "PUBLISHER_CREATED");
    const businessEvent = createBusinessEvent("publisher.created", id, user.activeRole, { integrationType: input.integrationType });
    const eventState = appendEvents(nextState, user, "publisher.create", id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  addAdSlot(state: MediaWorkflowState, user: BusinessUser, publisherId: EntityId, input: AdSlotInput): WorkflowResult {
    if (!findPublisher(state, publisherId)) {
      const guard = createBlocked("Publisher record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "publisher_ad_slot.create", publisherId, guard), guard };
    }

    if (!rlsService.canWriteTable(user, "publisher_ad_slots")) {
      const guard = createBlocked("Current role cannot add publisher ad slots.", "AD_SLOT_CREATE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "publisher_ad_slot.create", publisherId, guard), guard };
    }

    const adSlot: PublisherAdSlot = {
      id: crypto.randomUUID(),
      publisher_id: publisherId,
      slot_name: input.slotName,
      ad_format: input.adFormat,
      placement_type: input.placementType,
      floor_price: input.floorPrice,
      daily_requests: input.dailyRequests,
      status: "active"
    };
    const nextState = {
      ...state,
      publisherAdSlots: [adSlot, ...state.publisherAdSlots]
    };
    const guard = createAllowed("Publisher ad slot added.", "AD_SLOT_CREATED");
    const businessEvent = createBusinessEvent("publisher.ad_slot_created", publisherId, user.activeRole, {
      slotName: input.slotName
    });
    const eventState = appendEvents(nextState, user, "publisher_ad_slot.create", publisherId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  addContractTerm(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    input: ContractTermInput
  ): WorkflowResult {
    if (!findPublisher(state, publisherId)) {
      const guard = createBlocked("Publisher record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "publisher_contract_term.create", publisherId, guard), guard };
    }

    if (!rlsService.canWriteTable(user, "publishers")) {
      const guard = createBlocked("Current role cannot add publisher commercial terms.", "CONTRACT_TERM_CREATE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "publisher_contract_term.create", publisherId, guard), guard };
    }

    const term: PublisherContractTerm = {
      id: crypto.randomUUID(),
      publisher_id: publisherId,
      contract_type: input.contractType,
      billing_model: input.billingModel,
      settlement_cycle: input.settlementCycle,
      payment_terms: input.paymentTerms,
      revenue_share: input.revenueShare
    };
    const nextState = {
      ...state,
      publisherContractTerms: [term, ...state.publisherContractTerms]
    };
    const guard = createAllowed("Publisher commercial terms added.", "CONTRACT_TERM_CREATED");
    const businessEvent = createBusinessEvent("publisher.contract_term_created", publisherId, user.activeRole, {
      billingModel: input.billingModel
    });
    const eventState = appendEvents(nextState, user, "publisher_contract_term.create", publisherId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  submitTechnicalValidation(state: MediaWorkflowState, user: BusinessUser, publisherId: EntityId): WorkflowResult {
    const guard = getGuardService(state).canUpdatePublisherReadiness(
      user,
      publisherId,
      "technical_live_status",
      "technical_live_passed"
    );

    if (!guard.allowed) {
      return { state: appendEvents(state, user, "publisher.technical_live.submit", publisherId, guard), guard };
    }

    const nextState = updatePublisher(state, publisherId, {
      technical_live_status: "technical_live_passed"
    });
    const withIntegration = {
      ...nextState,
      integrationProjects: nextState.integrationProjects.map((project) =>
        project.publisher_id === publisherId
          ? {
              ...project,
              status: "technical_live_passed" as const,
              checklist: {
                ...project.checklist,
                callback_verified: true,
                production_logs_checked: true
              },
              notes: "Production validation submitted and passed."
            }
          : project
      )
    };
    const businessEvent = createBusinessEvent("publisher.technical_live_passed", publisherId, user.activeRole);
    const eventState = appendEvents(withIntegration, user, "publisher.technical_live.submit", publisherId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  createCommercialTest(state: MediaWorkflowState, user: BusinessUser, publisherId: EntityId): WorkflowResult {
    const guard = getGuardService(state).canCreateCommercialTest(user, publisherId);

    if (!guard.allowed) {
      return { state: appendEvents(state, user, "commercial_test.create", publisherId, guard), guard };
    }

    const test: CommercialTest = {
      id: crypto.randomUUID(),
      publisher_id: publisherId,
      test_name: "Commercial readiness test",
      status: "testing",
      target_budget: 500,
      spend: 0,
      fill_rate: 0,
      clear_rate: 0,
      ivt_rate: 0
    };
    const nextState = updatePublisher(
      {
        ...state,
        commercialTests: [test, ...state.commercialTests]
      },
      publisherId,
      {
        commercial_test_status: "testing"
      }
    );
    const businessEvent = createBusinessEvent("publisher.commercial_test_started", publisherId, user.activeRole);
    const eventState = appendEvents(nextState, user, "commercial_test.create", publisherId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  submitCommercialTestConclusion(
    state: MediaWorkflowState,
    user: BusinessUser,
    testId: EntityId,
    outcome: "test_passed" | "test_failed"
  ): WorkflowResult {
    const test = state.commercialTests.find((candidate) => candidate.id === testId);

    if (!test) {
      const guard = createBlocked("Commercial test was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "commercial_test.conclude", undefined, guard), guard };
    }

    const guard = getGuardService(state).canUpdatePublisherReadiness(
      user,
      test.publisher_id,
      "commercial_test_status",
      outcome
    );

    if (!guard.allowed) {
      return { state: appendEvents(state, user, "commercial_test.conclude", test.publisher_id, guard), guard };
    }

    const nextState = updatePublisher(
      {
        ...state,
        commercialTests: state.commercialTests.map((candidate) =>
          candidate.id === testId
            ? {
                ...candidate,
                status: outcome,
                spend: candidate.spend || 486,
                fill_rate: candidate.fill_rate || 0.62,
                clear_rate: candidate.clear_rate || 0.72,
                ivt_rate: candidate.ivt_rate || 0.018,
                result_summary: outcome === "test_passed" ? "Commercial test passed." : "Commercial test failed."
              }
            : candidate
        )
      },
      test.publisher_id,
      {
        commercial_test_status: outcome
      }
    );
    const businessEvent = createBusinessEvent(`publisher.commercial_${outcome}`, test.publisher_id, user.activeRole);
    const eventState = appendEvents(nextState, user, "commercial_test.conclude", test.publisher_id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  approveSalesReadiness(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    targetStatus: "limited_sellable" | "proposal_selectable" | "scale_ready"
  ): WorkflowResult {
    const guard =
      targetStatus === "scale_ready"
        ? getGuardService(state).canApproveScaleReadiness(user, publisherId)
        : getGuardService(state).canUpdatePublisherReadiness(user, publisherId, "sales_scale_status", targetStatus);

    if (!guard.allowed) {
      return { state: appendEvents(state, user, "publisher.sales_readiness.approve", publisherId, guard), guard };
    }

    const nextState = updatePublisher(state, publisherId, {
      sales_scale_status: targetStatus
    });
    const businessEvent = createBusinessEvent("publisher.sales_readiness_approved", publisherId, user.activeRole, {
      targetStatus
    });
    const eventState = appendEvents(nextState, user, "publisher.sales_readiness.approve", publisherId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }
}

export const mediaWorkflowService = new MediaWorkflowService();
