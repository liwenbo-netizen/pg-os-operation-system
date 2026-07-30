import type {
  BusinessContract,
  CommercialTest,
  EntityId,
  IntegrationProject,
  MediaEcosystemLead,
  MediaOnboardingStage,
  MediaOnboardingStageGate,
  MediaSupplyPackage,
  MediaWorkflowState,
  Publisher,
  TrustedSupplyCandidate
} from "../types/domain";
import type { RoleCode } from "../constants/roles";

export const mediaOnboardingLifecycleStages = [
  "MEDIA_DISCOVERY",
  "BUSINESS_QUALIFICATION",
  "COMMERCIAL_AGREEMENT",
  "TECHNICAL_QUALIFICATION",
  "SDK_INTEGRATION",
  "QA_CERTIFICATION",
  "PILOT",
  "PRODUCTION_LAUNCH",
  "SCALE_OPERATION"
] as const satisfies readonly MediaOnboardingStage[];

export type MediaOnboardingLifecycleStage = MediaOnboardingStage;
export type MediaOnboardingLifecycleStatus = "ready" | "in_progress" | "blocked" | "on_hold" | "rejected" | "operating";

export type MediaOnboardingLifecycleItem = {
  id: string;
  mediaName: string;
  stage: MediaOnboardingLifecycleStage;
  stageIndex: number;
  status: MediaOnboardingLifecycleStatus;
  ownerRole?: RoleCode;
  ownerUserId?: string;
  nextAction: string;
  blockers: string[];
  source: "ecosystem" | "trusted_candidate" | "publisher";
  lifecycleObjectType: MediaOnboardingStageGate["lifecycle_object_type"];
  lifecycleObjectId: EntityId;
  stageGate?: MediaOnboardingStageGate;
  stageGates: MediaOnboardingStageGate[];
  priorityScore?: number;
  lead?: MediaEcosystemLead;
  candidate?: TrustedSupplyCandidate;
  publisher?: Publisher;
  contract?: BusinessContract;
  integration?: IntegrationProject;
  commercialTest?: CommercialTest;
  activeSupplyPackage?: MediaSupplyPackage;
};

export type MediaOnboardingLifecycleSummary = {
  total: number;
  active: number;
  blocked: number;
  technicalReady: number;
  pilotActive: number;
  launchReady: number;
  scaleOperating: number;
  byStage: Record<MediaOnboardingLifecycleStage, number>;
};

type LifecycleInput = {
  mediaState: MediaWorkflowState;
  contracts: BusinessContract[];
};

type LinkedRecords = {
  lead?: MediaEcosystemLead;
  candidate?: TrustedSupplyCandidate;
  publisher?: Publisher;
  contract?: BusinessContract;
  integration?: IntegrationProject;
  commercialTest?: CommercialTest;
  activeSupplyPackage?: MediaSupplyPackage;
};

const stageIndex = Object.fromEntries(mediaOnboardingLifecycleStages.map((stage, index) => [stage, index])) as Record<
  MediaOnboardingLifecycleStage,
  number
>;

function newest<T>(items: T[], getDate: (item: T) => string | undefined) {
  return [...items].sort((left, right) => (getDate(right) ?? "").localeCompare(getDate(left) ?? ""))[0];
}

function findCommercialTest(state: MediaWorkflowState, publisherId: EntityId) {
  const tests = state.commercialTests.filter((item) => item.publisher_id === publisherId);
  const active = tests.find((item) => ["testing", "ready_for_test"].includes(item.status));
  return active ?? tests.find((item) => item.status === "test_passed") ?? newest(tests, (item) => item.reviewed_at ?? item.end_date ?? item.start_date);
}

function findContract(contracts: BusinessContract[], publisherId: EntityId) {
  const publisherContracts = contracts.filter((contract) => contract.publisher_id === publisherId);
  return publisherContracts.find((contract) => contract.status === "signed") ?? newest(publisherContracts, (contract) => contract.signed_at ?? contract.effective_date);
}

function stageForLead(lead: MediaEcosystemLead): MediaOnboardingLifecycleStage {
  if (["ECOSYSTEM_MAPPED", "PRIORITY_SCREENED", "OUTREACH_READY"].includes(lead.stage)) return "MEDIA_DISCOVERY";
  if (["CONTACTED", "MEETING_SCHEDULED"].includes(lead.stage)) return "BUSINESS_QUALIFICATION";
  if (lead.stage === "BUSINESS_QUALIFIED") return "COMMERCIAL_AGREEMENT";
  return "TECHNICAL_QUALIFICATION";
}

function stageForPublisher(records: LinkedRecords): MediaOnboardingLifecycleStage {
  const { publisher, integration, commercialTest, contract, activeSupplyPackage } = records;
  if (!publisher) return records.lead ? stageForLead(records.lead) : "TECHNICAL_QUALIFICATION";

  const signedAgreement = contract?.status === "signed";
  const commercialStatus = commercialTest?.status ?? publisher.commercial_test_status;
  if (publisher.sales_scale_status === "scale_ready" && activeSupplyPackage && signedAgreement) return "SCALE_OPERATION";
  if (commercialStatus === "test_passed") return "PRODUCTION_LAUNCH";
  if (["testing", "ready_for_test", "test_failed", "paused"].includes(commercialStatus)) return "PILOT";
  if (publisher.technical_live_status === "technical_live_passed") return "QA_CERTIFICATION";
  if (["in_integration", "technical_review", "technical_blocked"].includes(integration?.status ?? publisher.technical_live_status)) {
    return "SDK_INTEGRATION";
  }
  return "TECHNICAL_QUALIFICATION";
}

function lifecycleStatus(
  records: LinkedRecords,
  stage: MediaOnboardingLifecycleStage,
  blockers: string[],
  stageGate?: MediaOnboardingStageGate
): MediaOnboardingLifecycleStatus {
  if (records.lead?.stage === "REJECTED") return "rejected";
  if (records.lead?.stage === "ON_HOLD") return "on_hold";
  if (stageGate?.status === "rejected") return "rejected";
  if (stageGate?.status === "blocked") return "blocked";
  if (blockers.length > 0) return "blocked";
  if (stage === "SCALE_OPERATION") return "operating";
  if (stageGate?.status === "approved" || stageGate?.status === "ready_for_approval") return "ready";
  if (stage === "PRODUCTION_LAUNCH" && records.publisher?.sales_scale_status === "scale_ready") return "ready";
  if (stage === "QA_CERTIFICATION" || stage === "COMMERCIAL_AGREEMENT") return "ready";
  return "in_progress";
}

function blockersFor(records: LinkedRecords, stage: MediaOnboardingLifecycleStage, state: MediaWorkflowState) {
  const blockers: string[] = [];
  const { lead, publisher, contract, integration, commercialTest, activeSupplyPackage } = records;

  if (lead?.integration_feasibility === "impossible") blockers.push("Integration feasibility is marked impossible.");
  if (integration?.blocker) blockers.push(integration.blocker);
  if (commercialTest?.status === "test_failed") blockers.push("The latest pilot did not pass its success criteria.");
  if (commercialTest?.status === "paused") blockers.push("The current pilot is paused.");

  if (publisher && stageIndex[stage] >= stageIndex.SDK_INTEGRATION && contract?.status !== "signed") {
    blockers.push(contract ? `Commercial agreement is ${contract.status.replace(/_/g, " ")}.` : "No signed publisher agreement is linked.");
  }

  const openDiagnostics = publisher
    ? state.diagnosticCases.filter(
        (item) => item.publisher_id === publisher.id && item.is_blocking_sales_scale && !["closed", "rejected"].includes(item.status)
      )
    : [];
  if (openDiagnostics.length > 0) blockers.push(`${openDiagnostics.length} blocking quality case(s) remain open.`);

  if (stage === "PRODUCTION_LAUNCH" && publisher?.sales_scale_status === "scale_ready" && !activeSupplyPackage) {
    blockers.push("No active controlled supply package is available for launch.");
  }
  if (stage === "SCALE_OPERATION" && !activeSupplyPackage) blockers.push("No active controlled supply package is available for scale operation.");

  return blockers;
}

function nextActionFor(records: LinkedRecords, stage: MediaOnboardingLifecycleStage) {
  const { lead, candidate, publisher, contract, integration, commercialTest, activeSupplyPackage } = records;
  if (lead?.stage === "REJECTED") return lead.next_action;
  if (lead?.stage === "ON_HOLD") return lead.next_action;
  if (stage === "MEDIA_DISCOVERY") return lead?.next_action ?? "Confirm an owner, source, and next outreach action.";
  if (stage === "BUSINESS_QUALIFICATION") return lead?.next_action ?? "Confirm contact, business interest, inventory, and commercial fit.";
  if (stage === "COMMERCIAL_AGREEMENT") return contract?.next_action ?? "Open the commercial agreement and assign Legal and business owners.";
  if (stage === "TECHNICAL_QUALIFICATION") {
    return candidate?.readiness_notes ?? lead?.next_action ?? "Complete technical feasibility, privacy, and IVT qualification.";
  }
  if (stage === "SDK_INTEGRATION") return integration?.next_action ?? integration?.blocker ?? "Complete SDK or endpoint integration evidence.";
  if (stage === "QA_CERTIFICATION") return "Review technical evidence and record the certification decision before Pilot.";
  if (stage === "PILOT") return commercialTest?.next_action ?? "Run controlled traffic and record delivery, IVT, and commercial KPI evidence.";
  if (stage === "PRODUCTION_LAUNCH") {
    return publisher?.sales_scale_status === "scale_ready" && !activeSupplyPackage
      ? "Activate a controlled supply package and schedule production launch."
      : "Complete launch approval, commercial release, and supply package activation.";
  }
  return "Monitor scale KPI, IVT quality, revenue growth, and optimization actions.";
}

function itemFromRecords(records: LinkedRecords, state: MediaWorkflowState): MediaOnboardingLifecycleItem {
  const stage = records.publisher ? stageForPublisher(records) : records.lead ? stageForLead(records.lead) : "TECHNICAL_QUALIFICATION";
  const blockers = blockersFor(records, stage, state);
  const lifecycleObjectType: MediaOnboardingStageGate["lifecycle_object_type"] = records.lead
    ? "media_ecosystem_lead"
    : records.candidate
      ? "trusted_supply_candidate"
      : "publisher";
  const lifecycleObjectId = records.lead?.id ?? records.candidate?.id ?? records.publisher?.id ?? "unknown";
  const stageGates = state.mediaOnboardingStageGates.filter(
    (gate) => gate.lifecycle_object_type === lifecycleObjectType && gate.lifecycle_object_id === lifecycleObjectId
  );
  const stageGate = stageGates.find((gate) => gate.stage === stage);
  if (stageGate?.blocker && !blockers.includes(stageGate.blocker)) blockers.push(stageGate.blocker);
  const ownerRole = records.candidate?.owner_role ?? records.lead?.owner_role ?? records.commercialTest?.owner_role ?? records.contract?.owner_role;
  const ownerUserId = records.candidate?.owner_user_id ?? records.lead?.owner_user_id ?? records.commercialTest?.owner_user_id;
  const id = lifecycleObjectId;
  const mediaName = records.lead?.media_name ?? records.candidate?.media_name ?? records.publisher?.name ?? "Unnamed media";

  return {
    id: `lifecycle:${id}`,
    mediaName,
    stage,
    stageIndex: stageIndex[stage],
    status: lifecycleStatus(records, stage, blockers, stageGate),
    ownerRole: stageGate?.owner_role ?? ownerRole,
    ownerUserId: stageGate?.owner_user_id ?? ownerUserId,
    nextAction: nextActionFor(records, stage),
    blockers,
    source: records.publisher ? "publisher" : records.candidate ? "trusted_candidate" : "ecosystem",
    lifecycleObjectType,
    lifecycleObjectId,
    stageGate,
    stageGates,
    priorityScore: records.lead?.priority_score ?? records.candidate?.priority_score,
    ...records
  };
}

function buildLinkedRecords(input: LifecycleInput) {
  const { mediaState, contracts } = input;
  const claimedPublisherIds = new Set<EntityId>();
  const claimedCandidateIds = new Set<EntityId>();
  const cases: MediaOnboardingLifecycleItem[] = [];

  for (const lead of mediaState.mediaEcosystemLeads) {
    const candidate = mediaState.trustedSupplyCandidates.find((item) => item.lead_id === lead.id);
    const publisherId = candidate?.publisher_id ?? lead.linked_publisher_id;
    const publisher = publisherId
      ? mediaState.publishers.find((item) => item.id === publisherId && !item.metadata?.archived_at)
      : undefined;
    if (candidate) claimedCandidateIds.add(candidate.id);
    if (publisher) claimedPublisherIds.add(publisher.id);

    const integration = publisher ? mediaState.integrationProjects.find((item) => item.publisher_id === publisher.id) : undefined;
    const commercialTest = publisher ? findCommercialTest(mediaState, publisher.id) : undefined;
    const contract = publisher ? findContract(contracts, publisher.id) : undefined;
    const activeSupplyPackage = publisher
      ? mediaState.mediaSupplyPackages.find((item) => item.publisher_id === publisher.id && item.status === "active")
      : undefined;
    cases.push(itemFromRecords({ lead, candidate, publisher, integration, commercialTest, contract, activeSupplyPackage }, mediaState));
  }

  for (const candidate of mediaState.trustedSupplyCandidates) {
    if (claimedCandidateIds.has(candidate.id)) continue;
    const publisher = candidate.publisher_id
      ? mediaState.publishers.find(
          (item) => item.id === candidate.publisher_id && !item.metadata?.archived_at
        )
      : undefined;
    if (publisher) claimedPublisherIds.add(publisher.id);
    const integration = publisher ? mediaState.integrationProjects.find((item) => item.publisher_id === publisher.id) : undefined;
    const commercialTest = publisher ? findCommercialTest(mediaState, publisher.id) : undefined;
    const contract = publisher ? findContract(contracts, publisher.id) : undefined;
    const activeSupplyPackage = publisher
      ? mediaState.mediaSupplyPackages.find((item) => item.publisher_id === publisher.id && item.status === "active")
      : undefined;
    cases.push(itemFromRecords({ candidate, publisher, integration, commercialTest, contract, activeSupplyPackage }, mediaState));
  }

  for (const publisher of mediaState.publishers) {
    if (publisher.metadata?.archived_at) continue;
    if (claimedPublisherIds.has(publisher.id)) continue;
    const integration = mediaState.integrationProjects.find((item) => item.publisher_id === publisher.id);
    const commercialTest = findCommercialTest(mediaState, publisher.id);
    const contract = findContract(contracts, publisher.id);
    const activeSupplyPackage = mediaState.mediaSupplyPackages.find(
      (item) => item.publisher_id === publisher.id && item.status === "active"
    );
    cases.push(itemFromRecords({ publisher, integration, commercialTest, contract, activeSupplyPackage }, mediaState));
  }

  return cases.sort((left, right) => left.stageIndex - right.stageIndex || left.mediaName.localeCompare(right.mediaName));
}

export const mediaOnboardingLifecycleService = {
  getCases(input: LifecycleInput) {
    return buildLinkedRecords(input);
  },

  getSummary(input: LifecycleInput): MediaOnboardingLifecycleSummary {
    const cases = buildLinkedRecords(input);
    const byStage = Object.fromEntries(mediaOnboardingLifecycleStages.map((stage) => [stage, 0])) as MediaOnboardingLifecycleSummary["byStage"];
    cases.forEach((item) => {
      byStage[item.stage] += 1;
    });

    return {
      total: cases.length,
      active: cases.filter((item) => !["rejected", "on_hold"].includes(item.status)).length,
      blocked: cases.filter((item) => item.status === "blocked").length,
      technicalReady: cases.filter((item) => item.stage === "TECHNICAL_QUALIFICATION" && item.status !== "blocked").length,
      pilotActive: cases.filter((item) => item.stage === "PILOT").length,
      launchReady: cases.filter((item) => item.stage === "PRODUCTION_LAUNCH" && item.status === "ready").length,
      scaleOperating: cases.filter((item) => item.stage === "SCALE_OPERATION" && item.status === "operating").length,
      byStage
    };
  }
};
