import type { GuardResult } from "../types/guards";
import type {
  AuditEvent,
  BusinessUser,
  CommercialTest,
  EntityId,
  IntegrationEvidence,
  IntegrationEvidenceType,
  IntegrationProject,
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
  auditEvents?: AuditEvent[];
  businessEvent?: ModuleBusinessEvent;
  publisherId?: EntityId;
};

export type CreatePublisherInput = {
  name: string;
  region: string;
  mediaType: string;
  integrationType: string;
  legalEntity?: string;
  propertyName?: string;
  propertyIdentifierType?: string;
  propertyIdentifier?: string;
  dailyActiveUsers?: number;
  monthlyActiveUsers?: number;
  dailyRequests?: number;
  trafficDataAsOf?: string;
  trafficSource?: string;
};

export type PublisherContactInput = {
  name: string;
  roleTitle: string;
  email?: string;
  phone?: string;
};

export type AdSlotInput = {
  slotName: string;
  adFormat: string;
  placementType: string;
  floorPrice?: number;
  currency?: string;
  dailyRequests?: number;
  creativeSpec?: string;
};

export type ContractTermInput = {
  contractType: string;
  billingModel: string;
  settlementCycle: string;
  paymentTerms: string;
  revenueShare?: number;
  currency?: string;
};

export type PublisherOnboardingInput = {
  publisher: CreatePublisherInput;
  contact: PublisherContactInput;
  adSlot: AdSlotInput;
  contractTerm: ContractTermInput;
};

type TechnicalEvidenceInput = {
  evidenceType: IntegrationEvidenceType;
  title: string;
  reference: string;
};

export const integrationEvidenceDefinitions: Array<{
  type: IntegrationEvidenceType;
  checklistKey: string;
  label: string;
}> = [
  { type: "connection_config", checklistKey: "connection_config_received", label: "Connection configuration" },
  { type: "test_request", checklistKey: "test_request_verified", label: "Test request" },
  { type: "callback_log", checklistKey: "callback_verified", label: "Callback log" },
  { type: "production_log", checklistKey: "production_logs_checked", label: "Production log" }
];

export function createInitialMediaWorkflowState(): MediaWorkflowState {
  return {
    publishers: fixtureRepository.publishers.map((publisher) => ({ ...publisher })),
    publisherContacts: fixtureRepository.publisherContacts.map((contact) => ({ ...contact })),
    publisherAdSlots: fixtureRepository.publisherAdSlots.map((slot) => ({ ...slot })),
    publisherContractTerms: fixtureRepository.publisherContractTerms.map((term) => ({ ...term })),
    integrationProjects: fixtureRepository.integrationProjects.map((project) => ({
      ...project,
      checklist: { ...project.checklist },
      evidence: project.evidence?.map((evidence) => ({ ...evidence })) ?? []
    })),
    commercialTests: fixtureRepository.commercialTests.map((test) => ({ ...test })),
    mediaTrustProfiles: [],
    mediaTrustScoreHistory: [],
    mediaSupplyPackages: [],
    mediaEcosystemLeads: fixtureRepository.mediaEcosystemLeads.map((lead) => ({
      ...lead,
      score_breakdown: { ...lead.score_breakdown }
    })),
    mediaOutreachActivities: fixtureRepository.mediaOutreachActivities.map((activity) => ({ ...activity })),
    trustedSupplyCandidates: fixtureRepository.trustedSupplyCandidates.map((candidate) => ({ ...candidate })),
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

function findIntegrationProject(state: MediaWorkflowState, publisherId: EntityId) {
  return state.integrationProjects.find((project) => project.publisher_id === publisherId);
}

function updateIntegrationProject(
  state: MediaWorkflowState,
  projectId: EntityId,
  patch: Partial<IntegrationProject>
): MediaWorkflowState {
  return {
    ...state,
    integrationProjects: state.integrationProjects.map((project) =>
      project.id === projectId
        ? {
            ...project,
            ...patch
          }
        : project
    )
  };
}

function canManageTechnicalExecution(user: BusinessUser) {
  return rlsService.canWriteTable(user, "integration_projects") && rbacService.hasCapability(user, "integration.manage");
}

function checklistItemDone(project: IntegrationProject, evidenceType: IntegrationEvidenceType, checklistKey: string) {
  if (evidenceType === "connection_config") {
    return Boolean(
      project.checklist[checklistKey] || project.checklist.vast_tag_received || project.checklist.sdk_configured
    );
  }

  return Boolean(project.checklist[checklistKey]);
}

function nextMissingEvidence(project: IntegrationProject) {
  return integrationEvidenceDefinitions.find(
    (definition) => !checklistItemDone(project, definition.type, definition.checklistKey)
  );
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

  getIntegrationExecutionSnapshot(state: MediaWorkflowState, publisherId: EntityId) {
    const publisher = findPublisher(state, publisherId);
    const project = findIntegrationProject(state, publisherId);
    const evidence = project?.evidence ?? [];
    const items = project
      ? integrationEvidenceDefinitions.map((definition) => ({
          ...definition,
          done: checklistItemDone(project, definition.type, definition.checklistKey),
          evidence: evidence.find((item) => item.evidence_type === definition.type)
        }))
      : [];

    return {
      publisher,
      project,
      items,
      completed: items.filter((item) => item.done && item.evidence).length,
      total: integrationEvidenceDefinitions.length,
      ready: Boolean(project && !project.blocker && items.length > 0 && items.every((item) => item.done && item.evidence))
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
      legal_entity: input.legalEntity,
      region: input.region,
      media_type: input.mediaType,
      integration_type: input.integrationType,
      technical_live_status: "draft",
      commercial_test_status: "not_started",
      sales_scale_status: "not_allowed",
      risk_level: "medium",
      daily_active_users: input.dailyActiveUsers,
      daily_requests: input.dailyRequests,
      metadata: {
        property_name: input.propertyName,
        property_identifier_type: input.propertyIdentifierType,
        property_identifier: input.propertyIdentifier,
        monthly_active_users: input.monthlyActiveUsers,
        traffic_data_as_of: input.trafficDataAsOf,
        traffic_source: input.trafficSource
      }
    };
    const integrationProject = {
      id: crypto.randomUUID(),
      publisher_id: id,
      integration_type: input.integrationType,
      status: "pending_integration" as const,
      checklist: {},
      notes: "Created from media onboarding.",
      evidence: [],
      next_action: "Start technical execution and record connection configuration evidence."
    };
    const nextState: MediaWorkflowState = {
      ...state,
      publishers: [publisher, ...state.publishers],
      integrationProjects: [integrationProject, ...state.integrationProjects]
    };
    const guard = createAllowed("Publisher created and integration project initialized.", "PUBLISHER_CREATED");
    const businessEvent = createBusinessEvent("publisher.created", id, user.activeRole, {
      integrationType: input.integrationType,
      mediaType: input.mediaType,
      propertyIdentifierType: input.propertyIdentifierType
    });
    const eventState = appendEvents(nextState, user, "publisher.create", id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  addPublisherContact(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    input: PublisherContactInput
  ): WorkflowResult {
    if (!findPublisher(state, publisherId)) {
      const guard = createBlocked("Publisher record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "publisher_contact.create", publisherId, guard), guard };
    }

    if (!rlsService.canWriteTable(user, "publisher_contacts")) {
      const guard = createBlocked("Current role cannot add publisher contacts.", "PUBLISHER_CONTACT_CREATE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "publisher_contact.create", publisherId, guard), guard };
    }

    const contact: PublisherContact = {
      id: crypto.randomUUID(),
      publisher_id: publisherId,
      name: input.name,
      role_title: input.roleTitle,
      email: input.email,
      phone: input.phone,
      is_primary: true
    };
    const nextState = {
      ...state,
      publisherContacts: [contact, ...state.publisherContacts]
    };
    const guard = createAllowed("Primary publisher contact added.", "PUBLISHER_CONTACT_CREATED");
    const businessEvent = createBusinessEvent("publisher.contact_created", publisherId, user.activeRole, {
      roleTitle: input.roleTitle
    });
    const eventState = appendEvents(nextState, user, "publisher_contact.create", publisherId, guard, businessEvent);

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
      currency: input.currency ?? "CNY",
      daily_requests: input.dailyRequests,
      creative_spec: input.creativeSpec,
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

    if (!rlsService.canWriteTable(user, "publisher_contract_terms")) {
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
      revenue_share: input.revenueShare,
      currency: input.currency ?? "CNY"
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

  createPublisherOnboarding(
    state: MediaWorkflowState,
    user: BusinessUser,
    input: PublisherOnboardingInput
  ): WorkflowResult {
    const canCreateAllRecords =
      rlsService.canWriteTable(user, "publishers") &&
      rlsService.canWriteTable(user, "publisher_contacts") &&
      rlsService.canWriteTable(user, "publisher_ad_slots") &&
      rlsService.canWriteTable(user, "publisher_contract_terms") &&
      rbacService.hasCapability(user, "publisher.manage");

    if (!canCreateAllRecords) {
      const guard = createBlocked(
        "Current role cannot create a complete publisher onboarding package.",
        "PUBLISHER_ONBOARDING_FORBIDDEN",
        "media_manager"
      );
      const eventState = appendEvents(state, user, "publisher.onboarding.create", undefined, guard);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    const requiredText = [
      input.publisher.name,
      input.publisher.legalEntity,
      input.publisher.propertyName,
      input.publisher.propertyIdentifier,
      input.publisher.trafficDataAsOf,
      input.publisher.trafficSource,
      input.contact.name,
      input.contact.roleTitle,
      input.adSlot.slotName,
      input.adSlot.adFormat,
      input.adSlot.placementType,
      input.contractTerm.billingModel,
      input.contractTerm.settlementCycle,
      input.contractTerm.paymentTerms
    ];
    const validScale =
      (input.publisher.dailyActiveUsers ?? 0) > 0 &&
      (input.publisher.dailyRequests ?? 0) > 0 &&
      (input.adSlot.dailyRequests ?? 0) > 0;

    if (requiredText.some((value) => !value?.trim()) || !validScale) {
      const guard = createBlocked(
        "Publisher onboarding requires complete identity, traffic, inventory, contact, and commercial data.",
        "PUBLISHER_ONBOARDING_INVALID"
      );
      const eventState = appendEvents(state, user, "publisher.onboarding.create", undefined, guard);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    const publisherResult = this.createPublisher(state, user, input.publisher);
    const publisherId = publisherResult.businessEvent?.objectId;
    if (!publisherResult.guard.allowed || !publisherId) {
      return publisherResult;
    }

    const contactResult = this.addPublisherContact(publisherResult.state, user, publisherId, input.contact);
    const slotResult = this.addAdSlot(contactResult.state, user, publisherId, input.adSlot);
    const termResult = this.addContractTerm(slotResult.state, user, publisherId, input.contractTerm);
    const guard = createAllowed(
      "Publisher onboarding package created with identity, traffic, inventory, contact, commercial terms, and integration project.",
      "PUBLISHER_ONBOARDING_CREATED"
    );
    const businessEvent = createBusinessEvent("publisher.onboarding_created", publisherId, user.activeRole, {
      adSlotCount: 1,
      contactCount: 1,
      commercialTermCount: 1,
      integrationType: input.publisher.integrationType
    });
    const eventState = appendEvents(
      termResult.state,
      user,
      "publisher.onboarding.create",
      publisherId,
      guard,
      businessEvent
    );
    const auditEvents = [
      eventState.auditEvents[0],
      publisherResult.auditEvent,
      contactResult.auditEvent,
      slotResult.auditEvent,
      termResult.auditEvent
    ].filter((event): event is AuditEvent => Boolean(event));

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      auditEvents,
      businessEvent,
      publisherId
    };
  }

  startTechnicalExecution(state: MediaWorkflowState, user: BusinessUser, publisherId: EntityId): WorkflowResult {
    const publisher = findPublisher(state, publisherId);
    const project = findIntegrationProject(state, publisherId);
    if (!publisher || !project) {
      const guard = createBlocked("Publisher or integration project was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "integration.execution.start", publisherId, guard), guard };
    }
    if (!canManageTechnicalExecution(user)) {
      const guard = createBlocked(
        "Current role cannot start technical integration execution.",
        "INTEGRATION_EXECUTION_FORBIDDEN",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "integration.execution.start", publisherId, guard), guard };
    }
    if (project.status === "technical_live_passed") {
      const guard = createBlocked("Technical readiness has already passed.", "TECHNICAL_READINESS_ALREADY_PASSED");
      return { state: appendEvents(state, user, "integration.execution.start", publisherId, guard), guard };
    }
    if (["in_integration", "technical_review"].includes(project.status)) {
      const guard = createBlocked("Technical integration execution is already active.", "INTEGRATION_EXECUTION_ALREADY_STARTED");
      return { state: appendEvents(state, user, "integration.execution.start", publisherId, guard), guard };
    }
    if (project.blocker || project.status === "technical_blocked") {
      const guard = createBlocked(
        "Resolve the active technical blocker before restarting execution.",
        "TECHNICAL_BLOCKER_ACTIVE",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "integration.execution.start", publisherId, guard), guard };
    }

    const nextAction = nextMissingEvidence(project);
    const nextState = updatePublisher(
      updateIntegrationProject(state, project.id, {
        status: "in_integration",
        next_action: nextAction ? `Record ${nextAction.label.toLowerCase()} evidence.` : "Submit technical readiness review."
      }),
      publisherId,
      { technical_live_status: "in_integration" }
    );
    const guard = createAllowed("Technical integration execution started.", "INTEGRATION_EXECUTION_STARTED");
    const businessEvent = createBusinessEvent("integration.execution_started", publisherId, user.activeRole, {
      integrationProjectId: project.id
    });
    const eventState = appendEvents(nextState, user, "integration.execution.start", publisherId, guard, businessEvent);

    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent };
  }

  recordTechnicalEvidence(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    input: TechnicalEvidenceInput
  ): WorkflowResult {
    const publisher = findPublisher(state, publisherId);
    const project = findIntegrationProject(state, publisherId);
    if (!publisher || !project) {
      const guard = createBlocked("Publisher or integration project was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "integration.evidence.record", publisherId, guard), guard };
    }
    if (!canManageTechnicalExecution(user)) {
      const guard = createBlocked(
        "Current role cannot record technical evidence.",
        "INTEGRATION_EVIDENCE_FORBIDDEN",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "integration.evidence.record", publisherId, guard), guard };
    }
    if (!["in_integration", "technical_review"].includes(project.status)) {
      const guard = createBlocked(
        "Start technical execution before recording evidence.",
        "INTEGRATION_EXECUTION_NOT_STARTED",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "integration.evidence.record", publisherId, guard), guard };
    }
    if (project.blocker || project.status === "technical_blocked") {
      const guard = createBlocked("Resolve the active blocker before recording evidence.", "TECHNICAL_BLOCKER_ACTIVE");
      return { state: appendEvents(state, user, "integration.evidence.record", publisherId, guard), guard };
    }
    if (!input.title.trim() || !input.reference.trim()) {
      const guard = createBlocked("Evidence title and reference are required.", "INTEGRATION_EVIDENCE_REQUIRED");
      return { state: appendEvents(state, user, "integration.evidence.record", publisherId, guard), guard };
    }

    const definition = integrationEvidenceDefinitions.find((item) => item.type === input.evidenceType);
    if (!definition) {
      const guard = createBlocked("Unsupported integration evidence type.", "INTEGRATION_EVIDENCE_TYPE_INVALID");
      return { state: appendEvents(state, user, "integration.evidence.record", publisherId, guard), guard };
    }
    const existing = (project.evidence ?? []).find((item) => item.evidence_type === input.evidenceType);
    const evidence: IntegrationEvidence = {
      id: existing?.id ?? crypto.randomUUID(),
      evidence_type: input.evidenceType,
      title: input.title.trim(),
      reference: input.reference.trim(),
      recorded_at: new Date().toISOString(),
      recorded_by_user_id: user.id,
      recorded_by_role: user.activeRole
    };
    const nextEvidence = [evidence, ...(project.evidence ?? []).filter((item) => item.evidence_type !== input.evidenceType)];
    const nextChecklist = { ...project.checklist, [definition.checklistKey]: true };
    const projectWithEvidence = { ...project, evidence: nextEvidence, checklist: nextChecklist };
    const nextMissing = nextMissingEvidence(projectWithEvidence);
    const nextState = updatePublisher(
      updateIntegrationProject(state, project.id, {
        evidence: nextEvidence,
        checklist: nextChecklist,
        status: nextMissing ? "in_integration" : "technical_review",
        next_action: nextMissing ? `Record ${nextMissing.label.toLowerCase()} evidence.` : "Submit technical readiness review."
      }),
      publisherId,
      { technical_live_status: nextMissing ? "in_integration" : "technical_review" }
    );
    const guard = createAllowed("Technical evidence recorded.", "INTEGRATION_EVIDENCE_RECORDED");
    const businessEvent = createBusinessEvent("integration.evidence_recorded", publisherId, user.activeRole, {
      integrationProjectId: project.id,
      evidenceType: input.evidenceType,
      evidenceId: evidence.id
    });
    const eventState = appendEvents(nextState, user, "integration.evidence.record", publisherId, guard, businessEvent);

    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent };
  }

  setTechnicalBlocker(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    blocker: string
  ): WorkflowResult {
    const publisher = findPublisher(state, publisherId);
    const project = findIntegrationProject(state, publisherId);
    if (!publisher || !project) {
      const guard = createBlocked("Publisher or integration project was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "integration.blocker.set", publisherId, guard), guard };
    }
    if (project.status === "technical_live_passed") {
      const guard = createBlocked("Passed technical readiness cannot be blocked.", "TECHNICAL_READINESS_ALREADY_PASSED");
      return { state: appendEvents(state, user, "integration.blocker.set", publisherId, guard), guard };
    }
    if (!canManageTechnicalExecution(user)) {
      const guard = createBlocked("Current role cannot set technical blockers.", "INTEGRATION_BLOCKER_FORBIDDEN", "integration_manager");
      return { state: appendEvents(state, user, "integration.blocker.set", publisherId, guard), guard };
    }
    if (!blocker.trim()) {
      const guard = createBlocked("A concrete blocker description is required.", "INTEGRATION_BLOCKER_REQUIRED");
      return { state: appendEvents(state, user, "integration.blocker.set", publisherId, guard), guard };
    }

    const nextState = updatePublisher(
      updateIntegrationProject(state, project.id, {
        status: "technical_blocked",
        blocker: blocker.trim(),
        next_action: "Resolve the active technical blocker, then resume evidence collection."
      }),
      publisherId,
      { technical_live_status: "technical_blocked" }
    );
    const guard = createAllowed("Technical blocker recorded.", "INTEGRATION_BLOCKER_SET");
    const businessEvent = createBusinessEvent("integration.blocked", publisherId, user.activeRole, {
      integrationProjectId: project.id,
      blocker: blocker.trim()
    });
    const eventState = appendEvents(nextState, user, "integration.blocker.set", publisherId, guard, businessEvent);

    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent };
  }

  resolveTechnicalBlocker(state: MediaWorkflowState, user: BusinessUser, publisherId: EntityId): WorkflowResult {
    const publisher = findPublisher(state, publisherId);
    const project = findIntegrationProject(state, publisherId);
    if (!publisher || !project) {
      const guard = createBlocked("Publisher or integration project was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "integration.blocker.resolve", publisherId, guard), guard };
    }
    if (!canManageTechnicalExecution(user)) {
      const guard = createBlocked(
        "Current role cannot resolve technical blockers.",
        "INTEGRATION_BLOCKER_FORBIDDEN",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "integration.blocker.resolve", publisherId, guard), guard };
    }
    if (!project.blocker && project.status !== "technical_blocked") {
      const guard = createBlocked("No active technical blocker exists.", "INTEGRATION_BLOCKER_NOT_FOUND");
      return { state: appendEvents(state, user, "integration.blocker.resolve", publisherId, guard), guard };
    }

    const nextMissing = nextMissingEvidence(project);
    const nextState = updatePublisher(
      updateIntegrationProject(state, project.id, {
        status: nextMissing ? "in_integration" : "technical_review",
        blocker: undefined,
        next_action: nextMissing ? `Record ${nextMissing.label.toLowerCase()} evidence.` : "Submit technical readiness review."
      }),
      publisherId,
      { technical_live_status: nextMissing ? "in_integration" : "technical_review" }
    );
    const guard = createAllowed("Technical blocker resolved.", "INTEGRATION_BLOCKER_RESOLVED");
    const businessEvent = createBusinessEvent("integration.blocker_resolved", publisherId, user.activeRole, {
      integrationProjectId: project.id
    });
    const eventState = appendEvents(nextState, user, "integration.blocker.resolve", publisherId, guard, businessEvent);

    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent };
  }

  submitTechnicalReadiness(state: MediaWorkflowState, user: BusinessUser, publisherId: EntityId): WorkflowResult {
    const project = findIntegrationProject(state, publisherId);
    if (!project) {
      const guard = createBlocked("Integration project was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "publisher.technical_live.submit", publisherId, guard), guard };
    }
    if (project.status === "technical_live_passed") {
      const guard = createBlocked("Technical readiness has already passed.", "TECHNICAL_READINESS_ALREADY_PASSED");
      return { state: appendEvents(state, user, "publisher.technical_live.submit", publisherId, guard), guard };
    }
    if (!canManageTechnicalExecution(user)) {
      const guard = createBlocked(
        "Current role cannot submit technical readiness.",
        "INTEGRATION_READINESS_FORBIDDEN",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "publisher.technical_live.submit", publisherId, guard), guard };
    }
    if (project.blocker || project.status === "technical_blocked") {
      const guard = createBlocked("Resolve the active technical blocker before readiness review.", "TECHNICAL_BLOCKER_ACTIVE");
      return { state: appendEvents(state, user, "publisher.technical_live.submit", publisherId, guard), guard };
    }
    const evidenceTypes = new Set((project.evidence ?? []).map((item) => item.evidence_type));
    const missing = integrationEvidenceDefinitions.filter(
      (definition) =>
        !checklistItemDone(project, definition.type, definition.checklistKey) || !evidenceTypes.has(definition.type)
    );
    if (missing.length > 0) {
      const guard = createBlocked(
        `Technical readiness requires evidence for: ${missing.map((item) => item.label).join(", ")}.`,
        "TECHNICAL_EVIDENCE_INCOMPLETE",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "publisher.technical_live.submit", publisherId, guard), guard };
    }

    const guard = getGuardService(state).canUpdatePublisherReadiness(
      user,
      publisherId,
      "technical_live_status",
      "technical_live_passed"
    );

    if (!guard.allowed) {
      return { state: appendEvents(state, user, "publisher.technical_live.submit", publisherId, guard), guard };
    }

    const readinessReviewedAt = new Date().toISOString();
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
                ...project.checklist
              },
              blocker: undefined,
              next_action: "Technical readiness passed. Continue to commercial validation.",
              readiness_reviewed_at: readinessReviewedAt,
              go_live_date: readinessReviewedAt.slice(0, 10),
              notes: "Production validation evidence reviewed and passed."
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

  submitTechnicalValidation(state: MediaWorkflowState, user: BusinessUser, publisherId: EntityId): WorkflowResult {
    return this.submitTechnicalReadiness(state, user, publisherId);
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
      owner_user_id: user.id,
      owner_role: user.activeRole,
      start_date: new Date().toISOString().slice(0, 10),
      target_budget: 500,
      currency: "CNY",
      spend: 0,
      fill_rate: 0,
      clear_rate: 0,
      ivt_rate: 0,
      test_plan: {
        inventory_scope: "Primary verified inventory",
        min_fill_rate: 0.5,
        min_clear_rate: 0.6,
        max_ivt_rate: 0.03,
        notes: "Validate stable delivery, traffic quality, and commercial operability."
      },
      next_action: "Run controlled traffic and record delivery metrics."
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
                end_date: new Date().toISOString().slice(0, 10),
                reviewed_at: new Date().toISOString(),
                next_action:
                  outcome === "test_passed"
                    ? "Evaluate trusted supply qualification and confirm the operating pool."
                    : "Resolve quality or commercial blockers before retesting.",
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
