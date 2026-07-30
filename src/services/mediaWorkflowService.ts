import type { GuardResult } from "../types/guards";
import type {
  AuditEvent,
  BusinessUser,
  CommercialTest,
  EntityId,
  IntegrationEvidence,
  IntegrationEvidenceType,
  IntegrationHandoffPackage,
  IntegrationHandoffStatus,
  IntegrationProject,
  MediaWorkflowState,
  ModuleBusinessEvent,
  Publisher,
  PublisherAdSlot,
  PublisherContact,
  PublisherContractTerm,
  PublisherTrafficEvidenceRecord
} from "../types/domain";
import { auditService } from "./auditService";
import { fixtureRepository } from "./fixtures";
import { GuardService } from "./guardService";
import { rbacService } from "./rbacService";
import { rlsService } from "./rlsService";
import { incompleteIntegrationChecks } from "./sdkIntegrationService";

type WorkflowResult = {
  state: MediaWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  auditEvents?: AuditEvent[];
  businessEvent?: ModuleBusinessEvent;
  publisherId?: EntityId;
  changedFields?: string[];
  changedAreas?: PublisherOnboardingChangeArea[];
};

export type PublisherOnboardingChangeArea =
  | "publisher"
  | "contact"
  | "ad_slot"
  | "contract_term"
  | "integration";

const publisherTrafficEvidenceFields = new Set([
  "publisher.daily_active_users",
  "publisher.monthly_active_users",
  "publisher.daily_requests",
  "publisher.traffic_data_as_of",
  "publisher.traffic_source"
]);

type PublisherOnboardingChange = {
  area: PublisherOnboardingChangeArea;
  field: string;
  before: unknown;
  after: unknown;
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
  handoff: {
    mediaEngineeringContact: string;
    targetPilotDate: string;
    targetGoLiveDate: string;
    launchRequirements: string;
    integrationExpectations: string;
  };
};

export type PublisherTechnicalHandoffSnapshot = {
  publisher?: Publisher;
  project?: IntegrationProject;
  status: IntegrationHandoffStatus;
  package: IntegrationHandoffPackage;
  completeness: Array<{
    code: string;
    label: string;
    labelZh: string;
    complete: boolean;
  }>;
  completed: number;
  total: number;
  readyToSubmit: boolean;
  nextAction: string;
  nextActionZh: string;
};

export type PublisherDuplicateKind = "name" | "property_identifier";

export type PublisherDuplicate = {
  kind: PublisherDuplicateKind;
  publisherId: EntityId;
  publisherName: string;
};

export type PublisherArchiveSnapshot = {
  archived: boolean;
  archiveReason?: string;
  duplicateTestRecords: number;
  contacts: number;
  adSlots: number;
  contractTerms: number;
  integrationProjects: number;
  commercialTests: number;
  diagnosticCases: number;
  trustedSupplyRecords: number;
  productionProtected: boolean;
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
    publisherTrafficEvidenceHistory: [],
    mediaOnboardingStageGates: [],
    publisherContacts: fixtureRepository.publisherContacts.map((contact) => ({ ...contact })),
    publisherAdSlots: fixtureRepository.publisherAdSlots.map((slot) => ({ ...slot })),
    publisherContractTerms: fixtureRepository.publisherContractTerms.map((term) => ({ ...term })),
    integrationProjects: fixtureRepository.integrationProjects.map((project) => ({
      ...project,
      checklist: { ...project.checklist },
      evidence: project.evidence?.map((evidence) => ({ ...evidence })) ?? []
    })),
    integrationProjectProfiles: [],
    integrationCheckResults: [],
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
  businessEvent?: ModuleBusinessEvent,
  metadata?: Record<string, unknown>
): MediaWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "publisher", guard, objectId, metadata);

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

function findPublisherRecord(state: MediaWorkflowState, publisherId: EntityId) {
  return state.publishers.find((publisher) => publisher.id === publisherId);
}

function findPublisher(state: MediaWorkflowState, publisherId: EntityId) {
  const publisher = findPublisherRecord(state, publisherId);
  return publisher && !isPublisherArchived(publisher) ? publisher : undefined;
}

export function isPublisherArchived(publisher: Publisher) {
  return Boolean(publisher.metadata?.archived_at);
}

export function isLikelyTestPublisher(publisher: Publisher) {
  return /\b(demo|uat|test|sample|sandbox)\b|测试|演示/i.test(publisher.name);
}

function normalizedPublisherName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function publisherIsProductionProtected(publisher: Publisher) {
  return (
    publisher.technical_live_status === "technical_live_passed" ||
    publisher.commercial_test_status === "test_passed" ||
    ["proposal_selectable", "scale_ready"].includes(publisher.sales_scale_status)
  );
}

function canArchivePublishers(user: BusinessUser) {
  return (
    rlsService.canWriteTable(user, "publishers") &&
    rbacService.hasCapability(user, "publisher.manage") &&
    rbacService.hasAnyRole(user, ["media_director", "operations_director"])
  );
}

function createPublisherTrafficEvidenceRecord(
  publisherId: EntityId,
  user: BusinessUser,
  input: CreatePublisherInput,
  recordedVia: PublisherTrafficEvidenceRecord["recorded_via"]
): PublisherTrafficEvidenceRecord | undefined {
  if (!input.trafficDataAsOf?.trim() || !input.trafficSource?.trim()) return undefined;
  if (![input.dailyActiveUsers, input.monthlyActiveUsers, input.dailyRequests].some((value) => (value ?? 0) > 0)) {
    return undefined;
  }

  return {
    id: crypto.randomUUID(),
    publisher_id: publisherId,
    daily_active_users: input.dailyActiveUsers,
    monthly_active_users: input.monthlyActiveUsers,
    daily_requests: input.dailyRequests,
    traffic_data_as_of: input.trafficDataAsOf,
    traffic_source: input.trafficSource,
    recorded_by_user_id: user.id,
    recorded_by_role: user.activeRole,
    recorded_via: recordedVia,
    created_at: new Date().toISOString()
  };
}

function trafficEvidenceEventPayload(record: PublisherTrafficEvidenceRecord) {
  return {
    evidenceRecordId: record.id,
    trafficDataAsOf: record.traffic_data_as_of,
    trafficSource: record.traffic_source,
    dailyActiveUsers: record.daily_active_users,
    monthlyActiveUsers: record.monthly_active_users,
    dailyRequests: record.daily_requests,
    recordedVia: record.recorded_via
  };
}

function normalizePublisherName(value?: string) {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";
}

function comparableChangeValue(value: unknown) {
  return value === undefined ? null : value;
}

function addPublisherOnboardingChange(
  changes: PublisherOnboardingChange[],
  area: PublisherOnboardingChangeArea,
  field: string,
  before: unknown,
  after: unknown
) {
  const comparableBefore = comparableChangeValue(before);
  const comparableAfter = comparableChangeValue(after);
  if (Object.is(comparableBefore, comparableAfter)) return;
  changes.push({ area, field, before: comparableBefore, after: comparableAfter });
}

function collectPublisherOnboardingChanges(
  publisher: Publisher,
  contact: PublisherContact | undefined,
  adSlot: PublisherAdSlot | undefined,
  contractTerm: PublisherContractTerm | undefined,
  integrationProject: IntegrationProject | undefined,
  input: PublisherOnboardingInput
) {
  const changes: PublisherOnboardingChange[] = [];
  const add = addPublisherOnboardingChange.bind(null, changes);

  add("publisher", "publisher.name", publisher.name, input.publisher.name);
  add("publisher", "publisher.legal_entity", publisher.legal_entity, input.publisher.legalEntity);
  add("publisher", "publisher.region", publisher.region, input.publisher.region);
  add("publisher", "publisher.media_type", publisher.media_type, input.publisher.mediaType);
  add("publisher", "publisher.integration_type", publisher.integration_type, input.publisher.integrationType);
  add("publisher", "publisher.daily_active_users", publisher.daily_active_users, input.publisher.dailyActiveUsers);
  add("publisher", "publisher.daily_requests", publisher.daily_requests, input.publisher.dailyRequests);
  add("publisher", "publisher.property_name", publisher.metadata?.property_name, input.publisher.propertyName);
  add(
    "publisher",
    "publisher.property_identifier_type",
    publisher.metadata?.property_identifier_type,
    input.publisher.propertyIdentifierType
  );
  add(
    "publisher",
    "publisher.property_identifier",
    publisher.metadata?.property_identifier,
    input.publisher.propertyIdentifier
  );
  add(
    "publisher",
    "publisher.monthly_active_users",
    publisher.metadata?.monthly_active_users,
    input.publisher.monthlyActiveUsers
  );
  add(
    "publisher",
    "publisher.traffic_data_as_of",
    publisher.metadata?.traffic_data_as_of,
    input.publisher.trafficDataAsOf
  );
  add("publisher", "publisher.traffic_source", publisher.metadata?.traffic_source, input.publisher.trafficSource);

  add("contact", "contact.name", contact?.name, input.contact.name);
  add("contact", "contact.role_title", contact?.role_title, input.contact.roleTitle);
  add("contact", "contact.email", contact?.email, input.contact.email);
  add("contact", "contact.phone", contact?.phone, input.contact.phone);

  add("ad_slot", "ad_slot.slot_name", adSlot?.slot_name, input.adSlot.slotName);
  add("ad_slot", "ad_slot.ad_format", adSlot?.ad_format, input.adSlot.adFormat);
  add("ad_slot", "ad_slot.placement_type", adSlot?.placement_type, input.adSlot.placementType);
  add("ad_slot", "ad_slot.floor_price", adSlot?.floor_price, input.adSlot.floorPrice);
  add("ad_slot", "ad_slot.currency", adSlot?.currency, input.adSlot.currency ?? "CNY");
  add("ad_slot", "ad_slot.daily_requests", adSlot?.daily_requests, input.adSlot.dailyRequests);
  add("ad_slot", "ad_slot.creative_spec", adSlot?.creative_spec, input.adSlot.creativeSpec);

  add("contract_term", "contract_term.contract_type", contractTerm?.contract_type, input.contractTerm.contractType);
  add("contract_term", "contract_term.billing_model", contractTerm?.billing_model, input.contractTerm.billingModel);
  add(
    "contract_term",
    "contract_term.settlement_cycle",
    contractTerm?.settlement_cycle,
    input.contractTerm.settlementCycle
  );
  add("contract_term", "contract_term.payment_terms", contractTerm?.payment_terms, input.contractTerm.paymentTerms);
  add("contract_term", "contract_term.revenue_share", contractTerm?.revenue_share, input.contractTerm.revenueShare);
  add("contract_term", "contract_term.currency", contractTerm?.currency, input.contractTerm.currency ?? "CNY");

  add(
    "integration",
    "integration.integration_type",
    integrationProject?.integration_type,
    input.publisher.integrationType
  );
  add(
    "integration",
    "integration.handoff.media_engineering_contact",
    integrationProject?.handoff_package?.media_engineering_contact,
    input.handoff.mediaEngineeringContact
  );
  add(
    "integration",
    "integration.handoff.target_pilot_date",
    integrationProject?.handoff_package?.target_pilot_date,
    input.handoff.targetPilotDate
  );
  add(
    "integration",
    "integration.handoff.target_go_live_date",
    integrationProject?.handoff_package?.target_go_live_date,
    input.handoff.targetGoLiveDate
  );
  add(
    "integration",
    "integration.handoff.launch_requirements",
    integrationProject?.handoff_package?.launch_requirements,
    input.handoff.launchRequirements
  );
  add(
    "integration",
    "integration.handoff.integration_expectations",
    integrationProject?.handoff_package?.integration_expectations,
    input.handoff.integrationExpectations
  );

  return changes;
}

function maskPublisherAuditValue(field: string, value: unknown) {
  if (typeof value !== "string" || !value) return value;
  if (field === "contact.email") {
    const [localPart, domain] = value.split("@");
    return domain ? `${localPart.slice(0, 1)}***@${domain}` : "[redacted]";
  }
  if (field === "contact.phone") {
    const digits = value.replace(/\D/g, "");
    return digits ? `***${digits.slice(-4)}` : "[redacted]";
  }
  return value;
}

function buildPublisherChangeMetadata(changes: PublisherOnboardingChange[]) {
  return {
    changedFields: changes.map((change) => change.field),
    changedAreas: Array.from(new Set(changes.map((change) => change.area))),
    changes: Object.fromEntries(
      changes.map((change) => [
        change.field,
        {
          before: maskPublisherAuditValue(change.field, change.before),
          after: maskPublisherAuditValue(change.field, change.after)
        }
      ])
    )
  };
}

function normalizePropertyIdentifier(value?: string, identifierType?: string) {
  const normalized = value?.trim().toLocaleLowerCase() ?? "";
  if (identifierType !== "web_domain") return normalized;

  return normalized
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "");
}

function findPublisherDuplicate(
  state: MediaWorkflowState,
  input: Pick<CreatePublisherInput, "name" | "propertyIdentifier" | "propertyIdentifierType">,
  excludePublisherId?: EntityId
): PublisherDuplicate | undefined {
  const candidateName = normalizePublisherName(input.name);
  const candidateIdentifier = normalizePropertyIdentifier(input.propertyIdentifier, input.propertyIdentifierType);

  for (const publisher of state.publishers) {
    if (publisher.id === excludePublisherId) continue;

    if (candidateIdentifier) {
      const existingIdentifier = normalizePropertyIdentifier(
        publisher.metadata?.property_identifier,
        publisher.metadata?.property_identifier_type
      );
      if (candidateIdentifier === existingIdentifier) {
        return { kind: "property_identifier", publisherId: publisher.id, publisherName: publisher.name };
      }
    }

    if (candidateName && candidateName === normalizePublisherName(publisher.name)) {
      return { kind: "name", publisherId: publisher.id, publisherName: publisher.name };
    }
  }

  return undefined;
}

function onboardingInputIsComplete(input: PublisherOnboardingInput) {
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
    input.contractTerm.paymentTerms,
    input.handoff.mediaEngineeringContact,
    input.handoff.targetPilotDate,
    input.handoff.targetGoLiveDate,
    input.handoff.launchRequirements,
    input.handoff.integrationExpectations
  ];

  return (
    requiredText.every((value) => Boolean(value?.trim())) &&
    (input.publisher.dailyActiveUsers ?? 0) > 0 &&
    (input.publisher.dailyRequests ?? 0) > 0 &&
    (input.adSlot.dailyRequests ?? 0) > 0
  );
}

function duplicateGuard(duplicate: PublisherDuplicate) {
  return createBlocked(
    duplicate.kind === "property_identifier"
      ? `This media property identifier already belongs to ${duplicate.publisherName}.`
      : `A publisher named ${duplicate.publisherName} already exists.`,
    duplicate.kind === "property_identifier" ? "PUBLISHER_IDENTIFIER_DUPLICATE" : "PUBLISHER_NAME_DUPLICATE"
  );
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

function integrationHandoffStatus(project: IntegrationProject | undefined): IntegrationHandoffStatus {
  // Existing integration projects predate the explicit handoff workflow and stay operational.
  return project?.handoff_status ?? "accepted";
}

function toIntegrationHandoffPackage(input: PublisherOnboardingInput): IntegrationHandoffPackage {
  return {
    media_engineering_contact: input.handoff.mediaEngineeringContact.trim(),
    target_pilot_date: input.handoff.targetPilotDate,
    target_go_live_date: input.handoff.targetGoLiveDate,
    launch_requirements: input.handoff.launchRequirements.trim(),
    integration_expectations: input.handoff.integrationExpectations.trim()
  };
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
  getPublisherDuplicate(
    state: MediaWorkflowState,
    input: Pick<CreatePublisherInput, "name" | "propertyIdentifier" | "propertyIdentifierType">,
    excludePublisherId?: EntityId
  ) {
    return findPublisherDuplicate(state, input, excludePublisherId);
  }

  getActivePublishers(state: MediaWorkflowState) {
    return state.publishers.filter((publisher) => !isPublisherArchived(publisher));
  }

  getArchivedPublishers(state: MediaWorkflowState) {
    return state.publishers.filter(isPublisherArchived);
  }

  getPublisherArchiveSnapshot(
    state: MediaWorkflowState,
    publisherId: EntityId
  ): PublisherArchiveSnapshot | undefined {
    const publisher = findPublisherRecord(state, publisherId);
    if (!publisher) return undefined;

    const normalizedName = normalizedPublisherName(publisher.name);
    return {
      archived: isPublisherArchived(publisher),
      archiveReason: publisher.metadata?.archive_reason,
      duplicateTestRecords: isLikelyTestPublisher(publisher)
        ? state.publishers.filter(
            (candidate) =>
              candidate.id !== publisherId &&
              !isPublisherArchived(candidate) &&
              !publisherIsProductionProtected(candidate) &&
              normalizedPublisherName(candidate.name) === normalizedName
          ).length
        : 0,
      contacts: state.publisherContacts.filter((item) => item.publisher_id === publisherId).length,
      adSlots: state.publisherAdSlots.filter((item) => item.publisher_id === publisherId).length,
      contractTerms: state.publisherContractTerms.filter((item) => item.publisher_id === publisherId).length,
      integrationProjects: state.integrationProjects.filter((item) => item.publisher_id === publisherId).length,
      commercialTests: state.commercialTests.filter((item) => item.publisher_id === publisherId).length,
      diagnosticCases: state.diagnosticCases.filter((item) => item.publisher_id === publisherId).length,
      trustedSupplyRecords:
        state.mediaTrustProfiles.filter((item) => item.publisher_id === publisherId).length +
        state.mediaSupplyPackages.filter((item) => item.publisher_id === publisherId).length,
      productionProtected: publisherIsProductionProtected(publisher)
    };
  }

  archivePublisher(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    reason = "Archived from Publisher 360."
  ): WorkflowResult {
    const publisher = findPublisherRecord(state, publisherId);
    if (!publisher) {
      const guard = createBlocked("Publisher record was not found.", "PUBLISHER_NOT_FOUND");
      return { state: appendEvents(state, user, "publisher.archive", publisherId, guard), guard };
    }
    if (!canArchivePublishers(user)) {
      const guard = createBlocked(
        "Only Media Director or Operations Director can archive publishers.",
        "PUBLISHER_ARCHIVE_FORBIDDEN",
        "media_director"
      );
      return { state: appendEvents(state, user, "publisher.archive", publisherId, guard), guard };
    }
    if (isPublisherArchived(publisher)) {
      const guard = {
        ...createAllowed("Publisher is already archived.", "PUBLISHER_ALREADY_ARCHIVED"),
        audit_required: false
      };
      return { state, guard };
    }
    if (publisherIsProductionProtected(publisher)) {
      const guard = createBlocked(
        "Production, test-passed, or sales-enabled publishers cannot be archived from the cleanup action.",
        "PUBLISHER_ARCHIVE_PRODUCTION_PROTECTED",
        "operations_director"
      );
      return { state: appendEvents(state, user, "publisher.archive", publisherId, guard), guard };
    }

    const archivedAt = new Date().toISOString();
    const archivedState: MediaWorkflowState = {
      ...state,
      publishers: state.publishers.map((item) =>
        item.id === publisherId
          ? {
              ...item,
              metadata: {
                ...item.metadata,
                archived_at: archivedAt,
                archived_by_role: user.activeRole,
                archive_reason: reason.trim() || "Archived from Publisher 360."
              }
            }
          : item
      )
    };
    const guard = createAllowed(
      "Publisher archived. Related business, technical, and audit records were retained.",
      "PUBLISHER_ARCHIVED"
    );
    const event = createBusinessEvent("publisher.archived", publisherId, user.activeRole, {
      archivedAt,
      reason: reason.trim() || "Archived from Publisher 360."
    });
    const eventState = appendEvents(
      archivedState,
      user,
      "publisher.archive",
      publisherId,
      guard,
      event,
      { archivedAt, reason }
    );

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent: event,
      publisherId
    };
  }

  restorePublisher(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId
  ): WorkflowResult {
    const publisher = findPublisherRecord(state, publisherId);
    if (!publisher) {
      const guard = createBlocked("Publisher record was not found.", "PUBLISHER_NOT_FOUND");
      return { state: appendEvents(state, user, "publisher.restore", publisherId, guard), guard };
    }
    if (!canArchivePublishers(user)) {
      const guard = createBlocked(
        "Only Media Director or Operations Director can restore publishers.",
        "PUBLISHER_RESTORE_FORBIDDEN",
        "media_director"
      );
      return { state: appendEvents(state, user, "publisher.restore", publisherId, guard), guard };
    }
    if (!isPublisherArchived(publisher)) {
      const guard = {
        ...createAllowed("Publisher is already active.", "PUBLISHER_ALREADY_ACTIVE"),
        audit_required: false
      };
      return { state, guard };
    }

    const restoredState: MediaWorkflowState = {
      ...state,
      publishers: state.publishers.map((item) => {
        if (item.id !== publisherId) return item;
        const metadata = { ...item.metadata };
        delete metadata.archived_at;
        delete metadata.archived_by_role;
        delete metadata.archive_reason;
        return { ...item, metadata };
      })
    };
    const guard = createAllowed("Publisher restored to the active media queue.", "PUBLISHER_RESTORED");
    const event = createBusinessEvent("publisher.restored", publisherId, user.activeRole);
    const eventState = appendEvents(restoredState, user, "publisher.restore", publisherId, guard, event);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent: event,
      publisherId
    };
  }

  archiveDuplicateTestPublishers(
    state: MediaWorkflowState,
    user: BusinessUser,
    keepPublisherId: EntityId
  ): WorkflowResult {
    const keepPublisher = findPublisherRecord(state, keepPublisherId);
    if (!keepPublisher) {
      const guard = createBlocked("Publisher record was not found.", "PUBLISHER_NOT_FOUND");
      return { state: appendEvents(state, user, "publisher.test_duplicates.archive", keepPublisherId, guard), guard };
    }
    if (!canArchivePublishers(user)) {
      const guard = createBlocked(
        "Only Media Director or Operations Director can archive duplicate test publishers.",
        "PUBLISHER_ARCHIVE_FORBIDDEN",
        "media_director"
      );
      return {
        state: appendEvents(state, user, "publisher.test_duplicates.archive", keepPublisherId, guard),
        guard
      };
    }
    if (!isLikelyTestPublisher(keepPublisher)) {
      const guard = createBlocked(
        "Batch cleanup is restricted to publishers clearly named as Demo, UAT, Test, Sample, Sandbox, 测试, or 演示.",
        "PUBLISHER_TEST_CLEANUP_SCOPE_REQUIRED"
      );
      return {
        state: appendEvents(state, user, "publisher.test_duplicates.archive", keepPublisherId, guard),
        guard
      };
    }

    const normalizedName = normalizedPublisherName(keepPublisher.name);
    const duplicateIds = state.publishers
      .filter(
        (publisher) =>
          publisher.id !== keepPublisherId &&
          !isPublisherArchived(publisher) &&
          normalizedPublisherName(publisher.name) === normalizedName &&
          !publisherIsProductionProtected(publisher)
      )
      .map((publisher) => publisher.id);
    if (duplicateIds.length === 0) {
      const guard = {
        ...createAllowed("No eligible duplicate test publishers were found.", "PUBLISHER_TEST_DUPLICATES_NOT_FOUND"),
        audit_required: false
      };
      return { state, guard };
    }

    const archivedAt = new Date().toISOString();
    const archivedIdSet = new Set(duplicateIds);
    const archivedState: MediaWorkflowState = {
      ...state,
      publishers: state.publishers.map((publisher) =>
        archivedIdSet.has(publisher.id)
          ? {
              ...publisher,
              metadata: {
                ...publisher.metadata,
                archived_at: archivedAt,
                archived_by_role: user.activeRole,
                archive_reason: `Duplicate test record; canonical publisher retained: ${keepPublisher.name} (${keepPublisher.id}).`
              }
            }
          : publisher
      )
    };
    const guard = createAllowed(
      `${duplicateIds.length} duplicate test publisher record(s) archived; the selected record was retained.`,
      "PUBLISHER_TEST_DUPLICATES_ARCHIVED"
    );
    const event = createBusinessEvent(
      "publisher.test_duplicates_archived",
      keepPublisherId,
      user.activeRole,
      { archivedPublisherIds: duplicateIds, archivedAt }
    );
    const eventState = appendEvents(
      archivedState,
      user,
      "publisher.test_duplicates.archive",
      keepPublisherId,
      guard,
      event,
      { archivedPublisherIds: duplicateIds, archivedAt }
    );

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent: event,
      publisherId: keepPublisherId
    };
  }

  getPublisherSnapshot(state: MediaWorkflowState, publisherId: EntityId) {
    return {
      publisher: findPublisherRecord(state, publisherId),
      trafficEvidenceHistory: state.publisherTrafficEvidenceHistory
        .filter((record) => record.publisher_id === publisherId)
        .sort((left, right) => right.created_at.localeCompare(left.created_at)),
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
    return this.getActivePublishers(state).map((publisher) => ({
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
    const activePublishers = this.getActivePublishers(state);
    const total = activePublishers.length;
    const technicalLive = activePublishers.filter((publisher) => publisher.technical_live_status === "technical_live_passed").length;
    const testPassed = activePublishers.filter((publisher) => publisher.commercial_test_status === "test_passed").length;
    const proposalSelectable = activePublishers.filter((publisher) =>
      ["limited_sellable", "proposal_selectable", "scale_ready"].includes(publisher.sales_scale_status)
    ).length;
    const scaleReady = activePublishers.filter((publisher) => publisher.sales_scale_status === "scale_ready").length;
    const highRisk = activePublishers.filter((publisher) => ["high", "critical"].includes(publisher.risk_level)).length;

    return {
      total,
      technicalLive,
      testPassed,
      proposalSelectable,
      scaleReady,
      highRisk
    };
  }

  getPublisherTechnicalHandoff(
    state: MediaWorkflowState,
    publisherId: EntityId
  ): PublisherTechnicalHandoffSnapshot {
    const publisher = findPublisher(state, publisherId);
    const project = findIntegrationProject(state, publisherId);
    const primaryContact =
      state.publisherContacts.find((item) => item.publisher_id === publisherId && item.is_primary) ??
      state.publisherContacts.find((item) => item.publisher_id === publisherId);
    const activeSlot = state.publisherAdSlots.find(
      (item) => item.publisher_id === publisherId && item.status === "active"
    );
    const commercialTerm = state.publisherContractTerms.find((item) => item.publisher_id === publisherId);
    const storedHandoff = project?.handoff_package;
    const handoffPackage: IntegrationHandoffPackage = {
      media_engineering_contact: storedHandoff?.media_engineering_contact ?? "",
      target_pilot_date: storedHandoff?.target_pilot_date ?? "",
      target_go_live_date: storedHandoff?.target_go_live_date ?? project?.go_live_date ?? "",
      launch_requirements: storedHandoff?.launch_requirements ?? "",
      integration_expectations: storedHandoff?.integration_expectations ?? ""
    };
    const completeness = [
      {
        code: "publisher_identity",
        label: "Publisher identity and property identifier",
        labelZh: "媒体主体与资产标识",
        complete: Boolean(
          publisher?.name &&
          publisher.legal_entity &&
          publisher.metadata?.property_identifier
        )
      },
      {
        code: "traffic",
        label: "Traffic scale and evidence date",
        labelZh: "流量规模与数据日期",
        complete: Boolean(
          (publisher?.daily_active_users ?? 0) > 0 &&
          (publisher?.daily_requests ?? 0) > 0 &&
          publisher?.metadata?.traffic_data_as_of
        )
      },
      {
        code: "inventory",
        label: "Active ad inventory and format",
        labelZh: "有效广告位与广告形式",
        complete: Boolean(activeSlot && (activeSlot.daily_requests ?? 0) > 0)
      },
      {
        code: "business_contact",
        label: "Publisher business contact",
        labelZh: "媒体商务联系人",
        complete: Boolean(primaryContact?.name && primaryContact.role_title)
      },
      {
        code: "commercial_terms",
        label: "Commercial and settlement terms",
        labelZh: "商务与结算条款",
        complete: Boolean(
          commercialTerm?.billing_model &&
          commercialTerm.settlement_cycle &&
          commercialTerm.payment_terms
        )
      },
      {
        code: "engineering_contact",
        label: "Publisher engineering contact",
        labelZh: "媒体研发联系人",
        complete: Boolean(handoffPackage.media_engineering_contact.trim())
      },
      {
        code: "target_dates",
        label: "Pilot and production target dates",
        labelZh: "联调与正式上线目标日期",
        complete: Boolean(
          handoffPackage.target_pilot_date &&
          handoffPackage.target_go_live_date
        )
      },
      {
        code: "launch_requirements",
        label: "Launch requirements and integration expectations",
        labelZh: "上线要求与接入期望",
        complete: Boolean(
          handoffPackage.launch_requirements.trim() &&
          handoffPackage.integration_expectations.trim()
        )
      }
    ];
    const completed = completeness.filter((item) => item.complete).length;
    const status = integrationHandoffStatus(project);
    const nextByStatus = {
      draft: {
        en: completed === completeness.length
          ? "Submit the complete intake package to the Integration Manager."
          : "Complete the missing intake fields before technical handoff.",
        zh: completed === completeness.length
          ? "资料已齐全，提交给技术经理接单。"
          : "补齐缺失资料后再提交技术交接。"
      },
      submitted: {
        en: "Waiting for the Integration Manager to accept or return the package.",
        zh: "等待技术经理接单或退回补充。"
      },
      accepted: {
        en: "Technical owner accepted the package. Continue route design and Gate 0-7.",
        zh: "技术经理已接单，继续确认接入路线并推进 Gate 0–7。"
      },
      changes_requested: {
        en: project?.handoff_feedback || "Update the requested items and resubmit the package.",
        zh: project?.handoff_feedback || "按技术经理反馈补充资料并重新提交。"
      }
    } satisfies Record<IntegrationHandoffStatus, { en: string; zh: string }>;

    return {
      publisher,
      project,
      status,
      package: handoffPackage,
      completeness,
      completed,
      total: completeness.length,
      readyToSubmit: Boolean(project && completed === completeness.length),
      nextAction: nextByStatus[status].en,
      nextActionZh: nextByStatus[status].zh
    };
  }

  submitTechnicalHandoff(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId
  ): WorkflowResult {
    const handoff = this.getPublisherTechnicalHandoff(state, publisherId);
    if (!handoff.publisher || !handoff.project) {
      const guard = createBlocked("Publisher or integration project was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "integration.handoff.submit", publisherId, guard), guard };
    }
    if (
      !rlsService.canWriteTable(user, "integration_projects") ||
      !rbacService.hasAnyRole(user, ["media_manager", "media_director", "operations_director"])
    ) {
      const guard = createBlocked(
        "Current role cannot submit a publisher technical handoff.",
        "INTEGRATION_HANDOFF_SUBMIT_FORBIDDEN",
        "media_manager"
      );
      return { state: appendEvents(state, user, "integration.handoff.submit", publisherId, guard), guard };
    }
    if (!handoff.readyToSubmit) {
      const missing = handoff.completeness.filter((item) => !item.complete);
      const guard = createBlocked(
        `Complete ${missing.length} handoff item(s): ${missing.map((item) => item.label).join(", ")}.`,
        "INTEGRATION_HANDOFF_INCOMPLETE",
        "media_manager"
      );
      return { state: appendEvents(state, user, "integration.handoff.submit", publisherId, guard), guard };
    }
    if (handoff.status === "accepted") {
      const guard = createBlocked(
        "The technical handoff has already been accepted.",
        "INTEGRATION_HANDOFF_ALREADY_ACCEPTED",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "integration.handoff.submit", publisherId, guard), guard };
    }

    const submittedAt = new Date().toISOString();
    const nextState = updateIntegrationProject(state, handoff.project.id, {
      handoff_status: "submitted",
      handoff_submitted_at: submittedAt,
      handoff_submitted_by: user.id,
      handoff_accepted_at: undefined,
      handoff_accepted_by: undefined,
      handoff_feedback: undefined,
      go_live_date: handoff.package.target_go_live_date,
      next_action: "Integration Manager accepts the handoff and confirms the technical route."
    });
    const guard = createAllowed("Publisher technical handoff submitted.", "INTEGRATION_HANDOFF_SUBMITTED");
    const businessEvent = createBusinessEvent("integration.handoff_submitted", publisherId, user.activeRole, {
      integrationProjectId: handoff.project.id,
      targetPilotDate: handoff.package.target_pilot_date,
      targetGoLiveDate: handoff.package.target_go_live_date
    });
    const eventState = appendEvents(nextState, user, "integration.handoff.submit", publisherId, guard, businessEvent);
    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent };
  }

  acceptTechnicalHandoff(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId
  ): WorkflowResult {
    const handoff = this.getPublisherTechnicalHandoff(state, publisherId);
    if (!handoff.project) {
      const guard = createBlocked("Integration project was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "integration.handoff.accept", publisherId, guard), guard };
    }
    if (
      !rlsService.canWriteTable(user, "integration_projects") ||
      !rbacService.hasAnyRole(user, ["integration_manager", "media_director", "operations_director"])
    ) {
      const guard = createBlocked(
        "Current role cannot accept a publisher technical handoff.",
        "INTEGRATION_HANDOFF_ACCEPT_FORBIDDEN",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "integration.handoff.accept", publisherId, guard), guard };
    }
    if (handoff.status !== "submitted") {
      const guard = createBlocked(
        "The Media Manager must submit the handoff before it can be accepted.",
        "INTEGRATION_HANDOFF_NOT_SUBMITTED",
        "media_manager"
      );
      return { state: appendEvents(state, user, "integration.handoff.accept", publisherId, guard), guard };
    }

    const acceptedAt = new Date().toISOString();
    const nextState = updateIntegrationProject(state, handoff.project.id, {
      handoff_status: "accepted",
      handoff_accepted_at: acceptedAt,
      handoff_accepted_by: user.id,
      handoff_feedback: undefined,
      next_action: "Confirm the approved integration route and complete Gate 0-7 prerequisites."
    });
    const guard = createAllowed("Publisher technical handoff accepted.", "INTEGRATION_HANDOFF_ACCEPTED");
    const businessEvent = createBusinessEvent("integration.handoff_accepted", publisherId, user.activeRole, {
      integrationProjectId: handoff.project.id
    });
    const eventState = appendEvents(nextState, user, "integration.handoff.accept", publisherId, guard, businessEvent);
    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent };
  }

  requestTechnicalHandoffChanges(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    feedback: string
  ): WorkflowResult {
    const handoff = this.getPublisherTechnicalHandoff(state, publisherId);
    if (!handoff.project) {
      const guard = createBlocked("Integration project was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "integration.handoff.return", publisherId, guard), guard };
    }
    if (
      !rbacService.hasAnyRole(user, ["integration_manager", "media_director", "operations_director"])
    ) {
      const guard = createBlocked(
        "Current role cannot return a publisher technical handoff.",
        "INTEGRATION_HANDOFF_RETURN_FORBIDDEN",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "integration.handoff.return", publisherId, guard), guard };
    }
    if (handoff.status !== "submitted" || !feedback.trim()) {
      const guard = createBlocked(
        "A submitted handoff and concrete feedback are required.",
        "INTEGRATION_HANDOFF_FEEDBACK_REQUIRED",
        "integration_manager"
      );
      return { state: appendEvents(state, user, "integration.handoff.return", publisherId, guard), guard };
    }

    const nextState = updateIntegrationProject(state, handoff.project.id, {
      handoff_status: "changes_requested",
      handoff_feedback: feedback.trim(),
      handoff_accepted_at: undefined,
      handoff_accepted_by: undefined,
      next_action: feedback.trim()
    });
    const guard = createAllowed("Publisher technical handoff returned for changes.", "INTEGRATION_HANDOFF_CHANGES_REQUESTED");
    const businessEvent = createBusinessEvent("integration.handoff_changes_requested", publisherId, user.activeRole, {
      integrationProjectId: handoff.project.id,
      feedback: feedback.trim()
    });
    const eventState = appendEvents(nextState, user, "integration.handoff.return", publisherId, guard, businessEvent);
    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent };
  }

  createPublisher(state: MediaWorkflowState, user: BusinessUser, input: CreatePublisherInput): WorkflowResult {
    if (
      !rlsService.canWriteTable(user, "publishers") ||
      !rlsService.canWriteTable(user, "publisher_traffic_evidence_history") ||
      !rbacService.hasCapability(user, "publisher.manage")
    ) {
      const guard = createBlocked("Current role cannot create publishers.", "PUBLISHER_CREATE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "publisher.create", undefined, guard), guard };
    }

    const duplicate = findPublisherDuplicate(state, input);
    if (duplicate) {
      const guard = duplicateGuard(duplicate);
      return { state: appendEvents(state, user, "publisher.create", duplicate.publisherId, guard), guard };
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
      next_action: "Complete the media intake package and submit it to the Integration Manager.",
      handoff_status: "draft" as const,
      handoff_package: {
        media_engineering_contact: "",
        target_pilot_date: "",
        target_go_live_date: "",
        launch_requirements: "",
        integration_expectations: ""
      }
    };
    const trafficEvidence = createPublisherTrafficEvidenceRecord(
      id,
      user,
      input,
      "publisher_onboarding_created"
    );
    let nextState: MediaWorkflowState = {
      ...state,
      publishers: [publisher, ...state.publishers],
      publisherTrafficEvidenceHistory: trafficEvidence
        ? [trafficEvidence, ...state.publisherTrafficEvidenceHistory]
        : state.publisherTrafficEvidenceHistory,
      integrationProjects: [integrationProject, ...state.integrationProjects]
    };
    const guard = createAllowed("Publisher created and integration project initialized.", "PUBLISHER_CREATED");
    if (trafficEvidence) {
      const evidencePayload = trafficEvidenceEventPayload(trafficEvidence);
      nextState = appendEvents(
        nextState,
        user,
        "publisher.traffic_evidence.record",
        id,
        createAllowed("Publisher traffic evidence recorded.", "PUBLISHER_TRAFFIC_EVIDENCE_RECORDED"),
        createBusinessEvent("publisher.traffic_evidence_recorded", id, user.activeRole, evidencePayload),
        evidencePayload
      );
    }
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
      auditEvents: eventState.auditEvents.slice(0, trafficEvidence ? 2 : 1),
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
      rlsService.canWriteTable(user, "publisher_traffic_evidence_history") &&
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

    if (!onboardingInputIsComplete(input)) {
      const guard = createBlocked(
        "Publisher onboarding requires complete identity, traffic, inventory, contact, and commercial data.",
        "PUBLISHER_ONBOARDING_INVALID"
      );
      const eventState = appendEvents(state, user, "publisher.onboarding.create", undefined, guard);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    const duplicate = findPublisherDuplicate(state, input.publisher);
    if (duplicate) {
      const guard = duplicateGuard(duplicate);
      const eventState = appendEvents(state, user, "publisher.onboarding.create", duplicate.publisherId, guard);
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
    const createdProject = findIntegrationProject(termResult.state, publisherId);
    const onboardingState = createdProject
      ? updateIntegrationProject(termResult.state, createdProject.id, {
          handoff_status: "draft",
          handoff_package: toIntegrationHandoffPackage(input),
          go_live_date: input.handoff.targetGoLiveDate,
          next_action: "Review the intake package and submit it to the Integration Manager."
        })
      : termResult.state;
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
      onboardingState,
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

  updatePublisherOnboarding(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    input: PublisherOnboardingInput
  ): WorkflowResult {
    const publisher = findPublisher(state, publisherId);
    if (!publisher) {
      const guard = createBlocked("Publisher record was not found.", "NOT_FOUND");
      const eventState = appendEvents(state, user, "publisher.onboarding.update", publisherId, guard);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    const canUpdateAllRecords =
      rlsService.canWriteTable(user, "publishers") &&
      rlsService.canWriteTable(user, "publisher_traffic_evidence_history") &&
      rlsService.canWriteTable(user, "publisher_contacts") &&
      rlsService.canWriteTable(user, "publisher_ad_slots") &&
      rlsService.canWriteTable(user, "publisher_contract_terms") &&
      rlsService.canWriteTable(user, "integration_projects") &&
      rbacService.hasCapability(user, "publisher.manage");

    if (!canUpdateAllRecords) {
      const guard = createBlocked(
        "Current role cannot update a complete publisher onboarding package.",
        "PUBLISHER_ONBOARDING_UPDATE_FORBIDDEN",
        "media_manager"
      );
      const eventState = appendEvents(state, user, "publisher.onboarding.update", publisherId, guard);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    if (!onboardingInputIsComplete(input)) {
      const guard = createBlocked(
        "Publisher onboarding requires complete identity, traffic, inventory, contact, and commercial data.",
        "PUBLISHER_ONBOARDING_INVALID"
      );
      const eventState = appendEvents(state, user, "publisher.onboarding.update", publisherId, guard);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    const duplicate = findPublisherDuplicate(state, input.publisher, publisherId);
    if (duplicate) {
      const guard = duplicateGuard(duplicate);
      const eventState = appendEvents(state, user, "publisher.onboarding.update", publisherId, guard);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    const currentContact =
      state.publisherContacts.find((contact) => contact.publisher_id === publisherId && contact.is_primary) ??
      state.publisherContacts.find((contact) => contact.publisher_id === publisherId);
    const currentSlot = state.publisherAdSlots.find((slot) => slot.publisher_id === publisherId);
    const currentTerm = state.publisherContractTerms.find((term) => term.publisher_id === publisherId);
    const currentProject = findIntegrationProject(state, publisherId);
    const changes = collectPublisherOnboardingChanges(
      publisher,
      currentContact,
      currentSlot,
      currentTerm,
      currentProject,
      input
    );
    const changedFields = changes.map((change) => change.field);
    const changedAreas = Array.from(new Set(changes.map((change) => change.area)));

    if (changes.length === 0) {
      const guard = {
        ...createAllowed("No publisher onboarding changes were detected.", "PUBLISHER_ONBOARDING_NO_CHANGES"),
        audit_required: false
      };
      return { state, guard, auditEvents: [], publisherId, changedFields, changedAreas };
    }

    const contactId = currentContact?.id ?? crypto.randomUUID();
    const slotId = currentSlot?.id ?? crypto.randomUUID();
    const termId = currentTerm?.id ?? crypto.randomUUID();
    const projectId = currentProject?.id ?? crypto.randomUUID();
    const changedAreaSet = new Set(changedAreas);
    const trafficEvidence = changes.some((change) => publisherTrafficEvidenceFields.has(change.field))
      ? createPublisherTrafficEvidenceRecord(publisherId, user, input.publisher, "publisher_profile_updated")
      : undefined;

    let nextState: MediaWorkflowState = {
      ...state,
      publishers: changedAreaSet.has("publisher")
        ? state.publishers.map((item) =>
            item.id === publisherId
              ? {
                  ...item,
                  name: input.publisher.name,
                  legal_entity: input.publisher.legalEntity,
                  region: input.publisher.region,
                  media_type: input.publisher.mediaType,
                  integration_type: input.publisher.integrationType,
                  daily_active_users: input.publisher.dailyActiveUsers,
                  daily_requests: input.publisher.dailyRequests,
                  metadata: {
                    ...item.metadata,
                    property_name: input.publisher.propertyName,
                    property_identifier_type: input.publisher.propertyIdentifierType,
                    property_identifier: input.publisher.propertyIdentifier,
                    monthly_active_users: input.publisher.monthlyActiveUsers,
                    traffic_data_as_of: input.publisher.trafficDataAsOf,
                    traffic_source: input.publisher.trafficSource
                  }
                }
              : item
          )
        : state.publishers,
      publisherTrafficEvidenceHistory: trafficEvidence
        ? [trafficEvidence, ...state.publisherTrafficEvidenceHistory]
        : state.publisherTrafficEvidenceHistory,
      publisherContacts: changedAreaSet.has("contact")
        ? currentContact
          ? state.publisherContacts.map((contact) =>
              contact.id === contactId
                ? {
                    ...contact,
                    name: input.contact.name,
                    role_title: input.contact.roleTitle,
                    email: input.contact.email,
                    phone: input.contact.phone,
                    is_primary: true
                  }
                : contact
            )
          : [
              {
                id: contactId,
                publisher_id: publisherId,
                name: input.contact.name,
                role_title: input.contact.roleTitle,
                email: input.contact.email,
                phone: input.contact.phone,
                is_primary: true
              },
              ...state.publisherContacts
            ]
        : state.publisherContacts,
      publisherAdSlots: changedAreaSet.has("ad_slot")
        ? currentSlot
          ? state.publisherAdSlots.map((slot) =>
              slot.id === slotId
                ? {
                    ...slot,
                    slot_name: input.adSlot.slotName,
                    ad_format: input.adSlot.adFormat,
                    placement_type: input.adSlot.placementType,
                    floor_price: input.adSlot.floorPrice,
                    currency: input.adSlot.currency ?? "CNY",
                    daily_requests: input.adSlot.dailyRequests,
                    creative_spec: input.adSlot.creativeSpec
                  }
                : slot
            )
          : [
              {
                id: slotId,
                publisher_id: publisherId,
                slot_name: input.adSlot.slotName,
                ad_format: input.adSlot.adFormat,
                placement_type: input.adSlot.placementType,
                floor_price: input.adSlot.floorPrice,
                currency: input.adSlot.currency ?? "CNY",
                daily_requests: input.adSlot.dailyRequests,
                creative_spec: input.adSlot.creativeSpec,
                status: "active"
              },
              ...state.publisherAdSlots
            ]
        : state.publisherAdSlots,
      publisherContractTerms: changedAreaSet.has("contract_term")
        ? currentTerm
          ? state.publisherContractTerms.map((term) =>
              term.id === termId
                ? {
                    ...term,
                    contract_type: input.contractTerm.contractType,
                    billing_model: input.contractTerm.billingModel,
                    settlement_cycle: input.contractTerm.settlementCycle,
                    payment_terms: input.contractTerm.paymentTerms,
                    revenue_share: input.contractTerm.revenueShare,
                    currency: input.contractTerm.currency ?? "CNY"
                  }
                : term
            )
          : [
              {
                id: termId,
                publisher_id: publisherId,
                contract_type: input.contractTerm.contractType,
                billing_model: input.contractTerm.billingModel,
                settlement_cycle: input.contractTerm.settlementCycle,
                payment_terms: input.contractTerm.paymentTerms,
                revenue_share: input.contractTerm.revenueShare,
                currency: input.contractTerm.currency ?? "CNY"
              },
              ...state.publisherContractTerms
            ]
        : state.publisherContractTerms,
      integrationProjects: changedAreaSet.has("integration")
        ? currentProject
          ? state.integrationProjects.map((project) =>
              project.id === projectId
                ? {
                    ...project,
                    integration_type: input.publisher.integrationType,
                    handoff_status:
                      integrationHandoffStatus(project) === "accepted"
                        ? "changes_requested"
                        : "draft",
                    handoff_package: toIntegrationHandoffPackage(input),
                    handoff_accepted_at: undefined,
                    handoff_accepted_by: undefined,
                    handoff_feedback:
                      integrationHandoffStatus(project) === "accepted"
                        ? "Media intake data changed after acceptance. Review and resubmit the handoff."
                        : project.handoff_feedback,
                    go_live_date: input.handoff.targetGoLiveDate,
                    next_action: "Review the updated intake package and submit it to the Integration Manager."
                  }
                : project
            )
          : [
              {
                id: projectId,
                publisher_id: publisherId,
                integration_type: input.publisher.integrationType,
                status: "pending_integration",
                checklist: {},
                notes: "Created while completing publisher profile governance.",
                evidence: [],
                next_action: "Review the intake package and submit it to the Integration Manager.",
                handoff_status: "draft",
                handoff_package: toIntegrationHandoffPackage(input),
                go_live_date: input.handoff.targetGoLiveDate
              },
              ...state.integrationProjects
            ]
        : state.integrationProjects
    };

    const candidateRecordUpdates: Array<{
      area: PublisherOnboardingChangeArea;
      action: string;
      eventCode: string;
    }> = [
      { area: "publisher", action: "publisher.update", eventCode: "publisher.updated" },
      {
        area: "contact",
        action: currentContact ? "publisher_contact.update" : "publisher_contact.create",
        eventCode: currentContact ? "publisher.contact_updated" : "publisher.contact_created"
      },
      {
        area: "ad_slot",
        action: currentSlot ? "publisher_ad_slot.update" : "publisher_ad_slot.create",
        eventCode: currentSlot ? "publisher.ad_slot_updated" : "publisher.ad_slot_created"
      },
      {
        area: "contract_term",
        action: currentTerm ? "publisher_contract_term.update" : "publisher_contract_term.create",
        eventCode: currentTerm ? "publisher.contract_term_updated" : "publisher.contract_term_created"
      },
      {
        area: "integration",
        action: currentProject ? "integration_project.update" : "integration_project.create",
        eventCode: currentProject ? "publisher.integration_project_updated" : "publisher.integration_project_created"
      }
    ];
    const recordUpdates = candidateRecordUpdates.filter((update) => changedAreaSet.has(update.area));
    const recordGuard = createAllowed("Publisher onboarding record updated.", "PUBLISHER_PROFILE_UPDATED");
    for (const update of recordUpdates) {
      const areaChanges = changes.filter((change) => change.area === update.area);
      const changeMetadata = buildPublisherChangeMetadata(areaChanges);
      nextState = appendEvents(
        nextState,
        user,
        update.action,
        publisherId,
        recordGuard,
        createBusinessEvent(update.eventCode, publisherId, user.activeRole, changeMetadata),
        changeMetadata
      );
    }

    if (trafficEvidence) {
      const evidencePayload = trafficEvidenceEventPayload(trafficEvidence);
      nextState = appendEvents(
        nextState,
        user,
        "publisher.traffic_evidence.record",
        publisherId,
        createAllowed("Publisher traffic evidence recorded.", "PUBLISHER_TRAFFIC_EVIDENCE_RECORDED"),
        createBusinessEvent("publisher.traffic_evidence_recorded", publisherId, user.activeRole, evidencePayload),
        evidencePayload
      );
    }

    const changeMetadata = buildPublisherChangeMetadata(changes);
    const guard = createAllowed(
      `Publisher onboarding package updated: ${changes.length} field${changes.length === 1 ? "" : "s"} across ${changedAreas.length} data area${changedAreas.length === 1 ? "" : "s"}.`,
      "PUBLISHER_ONBOARDING_UPDATED"
    );
    const businessEvent = createBusinessEvent("publisher.onboarding_updated", publisherId, user.activeRole, {
      integrationProjectId: projectId,
      propertyIdentifierType: input.publisher.propertyIdentifierType,
      ...changeMetadata
    });
    const eventState = appendEvents(
      nextState,
      user,
      "publisher.onboarding.update",
      publisherId,
      guard,
      businessEvent,
      changeMetadata
    );

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      auditEvents: eventState.auditEvents.slice(0, recordUpdates.length + (trafficEvidence ? 2 : 1)),
      businessEvent,
      publisherId,
      changedFields,
      changedAreas
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
    if (integrationHandoffStatus(project) !== "accepted") {
      const guard = createBlocked(
        "Accept the Media Manager handoff before starting technical execution.",
        "INTEGRATION_HANDOFF_ACCEPTANCE_REQUIRED",
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
    if (!rbacService.hasAnyRole(user, ["media_director", "operations_director"])) {
      const guard = createBlocked(
        "Current role cannot submit technical readiness.",
        "INTEGRATION_READINESS_FORBIDDEN",
        "media_director"
      );
      return { state: appendEvents(state, user, "publisher.technical_live.submit", publisherId, guard), guard };
    }
    if (project.blocker || project.status === "technical_blocked") {
      const guard = createBlocked("Resolve the active technical blocker before readiness review.", "TECHNICAL_BLOCKER_ACTIVE");
      return { state: appendEvents(state, user, "publisher.technical_live.submit", publisherId, guard), guard };
    }
    const integrationProfile = state.integrationProjectProfiles.find(
      (profile) => profile.integration_project_id === project.id
    );
    if (integrationProfile) {
      const incompleteChecks = incompleteIntegrationChecks(state, project.id, integrationProfile);
      if (incompleteChecks.length > 0) {
        const firstItems = incompleteChecks
          .slice(0, 4)
          .map((item) => item.code)
          .join(", ");
        const guard = createBlocked(
          `Technical readiness requires ${incompleteChecks.length} blocking checklist item(s): ${firstItems}${incompleteChecks.length > 4 ? ", ..." : ""}.`,
          "INTEGRATION_CHECKLIST_INCOMPLETE",
          "integration_manager"
        );
        return { state: appendEvents(state, user, "publisher.technical_live.submit", publisherId, guard), guard };
      }
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
