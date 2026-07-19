import type { RoleCode } from "../constants/roles";
import type {
  Advertiser,
  AdvertiserContact,
  AuditEvent,
  BusinessContract,
  Campaign,
  CampaignMediaAllocation,
  CommercialTest,
  DiagnosticCase,
  DiagnosticEvidence,
  IntegrationEvidence,
  IntegrationProject,
  MediaEcosystemLead,
  MediaOutreachActivity,
  MediaSupplyPackage,
  MediaTrustProfile,
  MediaTrustScoreRecord,
  ModuleBusinessEvent,
  OkrObjective,
  Opportunity,
  Proposal,
  ProposalMediaSelection,
  Publisher,
  PublisherAdSlot,
  PublisherContact,
  PublisherContractTerm,
  Settlement,
  SopCard,
  TrustedSupplyCandidate,
  WorkbenchTask
} from "../types/domain";
import {
  createFixtureWorkflowSnapshot,
  type RepositorySkippedWrite,
  type WorkflowSaveContext,
  type WorkflowRepository,
  type WorkflowSnapshot
} from "./workflowRepository";
import { buildBusinessAuditAfterData } from "../services/businessAuditCoverage";

type SupabaseErrorLike = {
  message?: string;
};

type SupabaseResult<T> = {
  data: T[] | null;
  error: SupabaseErrorLike | null;
};

type SupabaseTableQuery = {
  select: (columns?: string) => Promise<SupabaseResult<Row>>;
  upsert: (rows: Row[], options?: { onConflict?: string }) => Promise<SupabaseResult<Row>>;
};

export type SupabaseLike = {
  from: (table: string) => SupabaseTableQuery;
};

type Row = Record<string, unknown>;

const publisherWriteRoles = new Set<RoleCode>([
  "media_director",
  "media_manager",
  "integration_manager",
  "operations_director"
]);
type LoadedRows = Record<string, Row[] | null>;
type AuditFieldConfig = {
  actorUserId?: true;
  ownerUserId?: true;
  createdBy?: true;
  updatedBy?: true;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TABLES_TO_LOAD = [
  "publishers",
  "publisher_contacts",
  "publisher_ad_slots",
  "publisher_contract_terms",
  "integration_projects",
  "commercial_tests",
  "media_trust_profiles",
  "media_trust_score_history",
  "media_supply_packages",
  "media_ecosystem_opportunities",
  "media_ecosystem_outreach_activities",
  "trusted_supply_candidates",
  "advertisers",
  "advertiser_contacts",
  "opportunities",
  "proposals",
  "proposal_media_selections",
  "campaigns",
  "campaign_media_allocations",
  "quality_diagnostic_cases",
  "quality_diagnostic_evidence",
  "contracts",
  "settlements",
  "sop_cards",
  "work_items",
  "okr_objectives",
  "okr_key_results"
] as const;

const AUDIT_FIELD_CONFIG: Record<string, AuditFieldConfig> = {
  audit_logs: { actorUserId: true },
  module_business_events: { ownerUserId: true },
  work_items: { ownerUserId: true, createdBy: true, updatedBy: true },
  publishers: { ownerUserId: true, createdBy: true, updatedBy: true },
  integration_projects: { ownerUserId: true },
  commercial_tests: { ownerUserId: true },
  media_trust_profiles: { ownerUserId: true },
  media_supply_packages: { ownerUserId: true, createdBy: true, updatedBy: true },
  media_ecosystem_opportunities: { ownerUserId: true, createdBy: true, updatedBy: true },
  media_ecosystem_outreach_activities: { actorUserId: true },
  trusted_supply_candidates: { ownerUserId: true, createdBy: true, updatedBy: true },
  advertisers: { ownerUserId: true, createdBy: true, updatedBy: true },
  opportunities: { ownerUserId: true, createdBy: true, updatedBy: true },
  proposals: { ownerUserId: true, createdBy: true, updatedBy: true },
  campaigns: { ownerUserId: true, createdBy: true, updatedBy: true },
  quality_diagnostic_cases: { ownerUserId: true, createdBy: true, updatedBy: true },
  quality_diagnostic_evidence: { createdBy: true },
  contracts: { ownerUserId: true, createdBy: true, updatedBy: true },
  settlements: { ownerUserId: true, createdBy: true, updatedBy: true },
  okr_objectives: { ownerUserId: true }
};

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function optionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function objectValue(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

function arrayValue<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function roleCode(value: unknown, fallback: RoleCode): RoleCode {
  return stringValue(value, fallback) as RoleCode;
}

function optionalUuid(value: unknown) {
  return isUuid(value) ? value : undefined;
}

function actorUserIdFromContext(context?: WorkflowSaveContext) {
  return optionalUuid(context?.actor?.id);
}

function applyActorFields(table: string, row: Row, actorUserId?: string): Row {
  const config = AUDIT_FIELD_CONFIG[table];
  if (!actorUserId || !config) {
    return row;
  }

  return {
    ...row,
    ...(config.actorUserId && !isUuid(row.actor_user_id) ? { actor_user_id: actorUserId } : {}),
    ...(config.ownerUserId && !isUuid(row.owner_user_id) ? { owner_user_id: actorUserId } : {}),
    ...(config.createdBy && !isUuid(row.created_by) ? { created_by: actorUserId } : {}),
    ...(config.updatedBy ? { updated_by: actorUserId } : {})
  };
}

function dateOnly(value: unknown) {
  return optionalString(value)?.slice(0, 10);
}

function rowsOrFallback<T>(rows: Row[] | null, fallback: T[], mapper: (row: Row) => T) {
  return rows === null ? fallback : rows.map(mapper);
}

function mapPublisher(row: Row): Publisher {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name, "Unnamed publisher"),
    legal_entity: optionalString(row.legal_entity),
    region: optionalString(row.region),
    media_type: optionalString(row.media_type),
    integration_type: optionalString(row.integration_type),
    technical_live_status: stringValue(row.technical_live_status, "draft") as Publisher["technical_live_status"],
    commercial_test_status: stringValue(row.commercial_test_status, "not_started") as Publisher["commercial_test_status"],
    sales_scale_status: stringValue(row.sales_scale_status, "not_allowed") as Publisher["sales_scale_status"],
    risk_level: stringValue(row.risk_level, "medium") as Publisher["risk_level"],
    daily_active_users: optionalNumber(row.daily_active_users),
    daily_requests: optionalNumber(row.daily_requests),
    metadata: objectValue(row.metadata) as Publisher["metadata"]
  };
}

function mapPublisherContact(row: Row): PublisherContact {
  return {
    id: stringValue(row.id),
    publisher_id: stringValue(row.publisher_id),
    name: stringValue(row.name, "Unnamed contact"),
    role_title: stringValue(row.role_title),
    email: optionalString(row.email),
    phone: optionalString(row.phone),
    is_primary: booleanValue(row.is_primary)
  };
}

function mapPublisherAdSlot(row: Row): PublisherAdSlot {
  return {
    id: stringValue(row.id),
    publisher_id: stringValue(row.publisher_id),
    slot_name: stringValue(row.slot_name, "Ad slot"),
    ad_format: stringValue(row.ad_format),
    placement_type: stringValue(row.placement_type),
    floor_price: optionalNumber(row.floor_price),
    currency: stringValue(row.currency, "CNY"),
    daily_requests: optionalNumber(row.daily_requests),
    creative_spec: optionalString(objectValue(row.metadata).creative_spec),
    status: stringValue(row.status, "active") === "paused" ? "paused" : "active"
  };
}

function mapPublisherContractTerm(row: Row): PublisherContractTerm {
  return {
    id: stringValue(row.id),
    publisher_id: stringValue(row.publisher_id),
    contract_type: stringValue(row.contract_type),
    billing_model: stringValue(row.billing_model),
    settlement_cycle: stringValue(row.settlement_cycle),
    payment_terms: stringValue(row.payment_terms),
    revenue_share: optionalNumber(row.revenue_share),
    currency: stringValue(row.currency, "CNY")
  };
}

function mapIntegrationProject(row: Row): IntegrationProject {
  return {
    id: stringValue(row.id),
    publisher_id: stringValue(row.publisher_id),
    integration_type: stringValue(row.integration_type),
    status: stringValue(row.status, "pending_integration") as IntegrationProject["status"],
    checklist: objectValue(row.checklist) as Record<string, boolean>,
    notes: stringValue(row.notes),
    evidence: arrayValue<IntegrationEvidence>(row.evidence),
    blocker: optionalString(row.blocker),
    next_action: optionalString(row.next_action),
    readiness_reviewed_at: optionalString(row.readiness_reviewed_at),
    go_live_date: optionalString(row.go_live_date)
  };
}

function mapCommercialTest(row: Row): CommercialTest {
  const metrics = objectValue(row.metrics);

  return {
    id: stringValue(row.id),
    publisher_id: stringValue(row.publisher_id),
    test_name: stringValue(row.test_name, "Commercial readiness test"),
    status: stringValue(row.status, "ready_for_test") as CommercialTest["status"],
    owner_user_id: optionalString(row.owner_user_id),
    owner_role: optionalString(row.owner_role) as CommercialTest["owner_role"],
    start_date: dateOnly(row.start_date),
    end_date: dateOnly(row.end_date),
    target_budget: numberValue(row.target_budget),
    currency: stringValue(row.currency, "CNY"),
    spend: numberValue(metrics.spend),
    fill_rate: numberValue(metrics.fill_rate),
    clear_rate: numberValue(metrics.clear_rate),
    ivt_rate: numberValue(metrics.ivt_rate),
    test_plan: Object.keys(objectValue(row.test_plan)).length
      ? (objectValue(row.test_plan) as CommercialTest["test_plan"])
      : undefined,
    next_action: optionalString(row.next_action),
    reviewed_at: optionalString(row.reviewed_at),
    result_summary: optionalString(row.result_summary)
  };
}

function mapMediaTrustProfile(row: Row): MediaTrustProfile {
  return {
    id: stringValue(row.id),
    publisher_id: stringValue(row.publisher_id),
    status: stringValue(row.status, "draft") as MediaTrustProfile["status"],
    total_score: numberValue(row.total_score),
    trust_level: stringValue(row.trust_level, "D") as MediaTrustProfile["trust_level"],
    score_breakdown: objectValue(row.score_breakdown) as MediaTrustProfile["score_breakdown"],
    suggested_pool: stringValue(row.suggested_pool, "opportunity") as MediaTrustProfile["suggested_pool"],
    confirmed_pool: optionalString(row.confirmed_pool) as MediaTrustProfile["confirmed_pool"],
    advertiser_fit_tags: arrayValue<string>(row.advertiser_fit_tags),
    recommendation_reasons: arrayValue<string>(row.recommendation_reasons),
    risk_warnings: arrayValue<string>(row.risk_warnings),
    owner_role: roleCode(row.owner_role, "media_manager"),
    next_action: stringValue(row.next_action, "Evaluate trusted supply readiness."),
    evaluated_at: stringValue(row.evaluated_at, new Date().toISOString()),
    confirmed_at: optionalString(row.confirmed_at)
  };
}

function mapMediaTrustScoreRecord(row: Row): MediaTrustScoreRecord {
  return {
    id: stringValue(row.id),
    publisher_id: stringValue(row.publisher_id),
    total_score: numberValue(row.total_score),
    trust_level: stringValue(row.trust_level, "D") as MediaTrustScoreRecord["trust_level"],
    score_breakdown: objectValue(row.score_breakdown) as MediaTrustScoreRecord["score_breakdown"],
    suggested_pool: stringValue(row.suggested_pool, "opportunity") as MediaTrustScoreRecord["suggested_pool"],
    reasons: arrayValue<string>(row.reasons),
    risk_warnings: arrayValue<string>(row.risk_warnings),
    calculated_at: stringValue(row.calculated_at, new Date().toISOString()),
    calculated_by_role: roleCode(row.calculated_by_role, "media_manager")
  };
}

function mapMediaSupplyPackage(row: Row): MediaSupplyPackage {
  return {
    id: stringValue(row.id),
    publisher_id: stringValue(row.publisher_id),
    package_name: stringValue(row.package_name, "Controlled supply package"),
    status: stringValue(row.status, "draft") as MediaSupplyPackage["status"],
    pool: stringValue(row.pool, "test") as MediaSupplyPackage["pool"],
    ad_formats: arrayValue<string>(row.ad_formats),
    placement_types: arrayValue<string>(row.placement_types),
    geo: stringValue(row.geo, "CN"),
    inventory_scale: numberValue(row.inventory_scale),
    floor_price: optionalNumber(row.floor_price),
    billing_model: optionalString(row.billing_model),
    advertiser_fit_tags: arrayValue<string>(row.advertiser_fit_tags),
    risk_notes: arrayValue<string>(row.risk_notes),
    owner_role: roleCode(row.owner_role, "media_manager"),
    created_at: stringValue(row.created_at, new Date().toISOString()),
    updated_at: stringValue(row.updated_at, new Date().toISOString()),
    activated_at: optionalString(row.activated_at)
  };
}

function mapMediaEcosystemOpportunity(row: Row): MediaEcosystemLead {
  const metadata = objectValue(row.metadata);
  const sourceCategory = [optionalString(row.source_primary_segment_cn), optionalString(row.source_secondary_category_cn)]
    .filter(Boolean)
    .join(" / ");
  const estimatedScale = [optionalNumber(row.estimated_dau) ? `DAU ${numberValue(row.estimated_dau)}` : undefined, optionalNumber(row.estimated_mau) ? `MAU ${numberValue(row.estimated_mau)}` : undefined]
    .filter(Boolean)
    .join(", ");
  const region = stringValue(metadata.region, "CN");

  return {
    id: stringValue(row.id),
    media_name: stringValue(row.media_name, "Unnamed media opportunity"),
    company_name: optionalString(row.company_entity),
    track: stringValue(row.ecosystem_segment, "OTHER_VERTICAL") as MediaEcosystemLead["track"],
    region: (["CN", "APAC", "Global"].includes(region) ? region : "CN") as MediaEcosystemLead["region"],
    stage: stringValue(row.ecosystem_status, "ECOSYSTEM_MAPPED") as MediaEcosystemLead["stage"],
    owner_user_id: optionalString(row.owner_user_id),
    owner_role: roleCode(row.owner_role, "media_manager"),
    verification_status: stringValue(row.verification_status, "UNVERIFIED") as MediaEcosystemLead["verification_status"],
    data_quality_level: stringValue(row.data_quality_level, "SEED_ONLY") as MediaEcosystemLead["data_quality_level"],
    review_required: booleanValue(row.review_required),
    seed_confidence: optionalString(row.seed_confidence),
    source_name: optionalString(row.source_name),
    source_version: optionalString(row.source_version),
    source_page: optionalNumber(row.source_page),
    priority_score: numberValue(row.priority_score),
    score_breakdown: {
      strategic_value: numberValue(row.strategic_segment_score),
      user_scale_growth: numberValue(row.user_scale_score),
      ad_scenario_value: numberValue(row.ad_context_score),
      programmatic_feasibility: numberValue(row.integration_feasibility_score),
      advertiser_demand_match: numberValue(row.advertiser_demand_score),
      commercial_negotiability: numberValue(row.commercial_feasibility_score),
      risk_compliance_control: numberValue(row.risk_control_score)
    },
    user_scale_note: estimatedScale || sourceCategory || "Seed media scale requires verification.",
    ad_scenario_note:
      optionalString(row.primary_scene_initial) ??
      optionalString(row.ad_formats_if_known) ??
      "Ad scenario requires verification.",
    advertiser_demand_note:
      optionalString(row.priority_score_reason) ??
      optionalString(row.notes) ??
      "Advertiser demand requires validation.",
    integration_feasibility: stringValue(row.integration_feasibility, "unknown") as MediaEcosystemLead["integration_feasibility"],
    media_contact_confirmed: booleanValue(row.media_contact_confirmed),
    business_interest_confirmed: booleanValue(row.business_interest_confirmed),
    ad_inventory_identified: booleanValue(row.ad_inventory_identified),
    media_director_approved_by: optionalString(row.media_director_approved_by),
    media_director_approved_at: optionalString(row.media_director_approved_at),
    risk_level: stringValue(metadata.risk_level, booleanValue(row.review_required) ? "high" : "medium") as MediaEcosystemLead["risk_level"],
    next_action: stringValue(row.next_action, "Assign owner and complete seed verification."),
    target_contact: dateOnly(row.target_contact_date),
    last_touch_at: optionalString(row.last_contact_at),
    linked_publisher_id: optionalString(row.linked_publisher_id)
  };
}

function mapMediaOutreachActivity(row: Row): MediaOutreachActivity {
  return {
    id: stringValue(row.id),
    lead_id: stringValue(row.opportunity_id),
    event: stringValue(row.event, "outreach.updated"),
    actor_role: roleCode(row.actor_role, "media_manager"),
    created_at: stringValue(row.activity_at, stringValue(row.created_at, new Date().toISOString())),
    notes: optionalString(row.notes)
  };
}

function mapTrustedSupplyCandidate(row: Row): TrustedSupplyCandidate {
  return {
    id: stringValue(row.id),
    lead_id: stringValue(row.opportunity_id),
    media_name: stringValue(row.media_name, "Unnamed trusted supply candidate"),
    track: stringValue(row.track, "OTHER_VERTICAL") as TrustedSupplyCandidate["track"],
    priority_score: numberValue(row.priority_score),
    status: stringValue(row.status, "candidate") as TrustedSupplyCandidate["status"],
    owner_user_id: optionalString(row.owner_user_id),
    owner_role: roleCode(row.owner_role, "media_manager"),
    created_at: stringValue(row.created_at, new Date().toISOString()),
    evaluation_notes: stringValue(row.evaluation_notes, "Entered trusted supply network evaluation."),
    readiness_started_at: optionalString(row.readiness_started_at),
    technical_reviewed_at: optionalString(row.technical_reviewed_at),
    commercial_reviewed_at: optionalString(row.commercial_reviewed_at),
    onboarding_ready_at: optionalString(row.onboarding_ready_at),
    readiness_notes: optionalString(row.readiness_notes),
    publisher_id: optionalString(row.publisher_id)
  };
}

function mapAdvertiser(row: Row): Advertiser {
  return {
    id: stringValue(row.id),
    name: stringValue(row.name, "Unnamed advertiser"),
    industry: stringValue(row.industry),
    region: stringValue(row.region),
    status: stringValue(row.status, "active") === "paused" ? "paused" : "active"
  };
}

function mapAdvertiserContact(row: Row): AdvertiserContact {
  return {
    id: stringValue(row.id),
    advertiser_id: stringValue(row.advertiser_id),
    name: stringValue(row.name, "Unnamed contact"),
    role_title: stringValue(row.role_title),
    email: optionalString(row.email),
    is_primary: booleanValue(row.is_primary)
  };
}

function mapOpportunity(row: Row): Opportunity {
  return {
    id: stringValue(row.id),
    advertiser_id: stringValue(row.advertiser_id),
    name: stringValue(row.name, "Opportunity"),
    stage: stringValue(row.stage, "discovery") as Opportunity["stage"],
    expected_budget: numberValue(row.expected_budget),
    pain_points: arrayValue<string>(row.pain_points)
  };
}

function mapProposalMediaSelection(row: Row): ProposalMediaSelection {
  return {
    id: stringValue(row.id),
    proposal_id: stringValue(row.proposal_id),
    publisher_id: stringValue(row.publisher_id),
    guard_status: stringValue(row.guard_status, "pending") as ProposalMediaSelection["guard_status"],
    guard_reason: optionalString(row.guard_reason),
    planned_budget: numberValue(row.planned_budget)
  };
}

function mapProposal(row: Row, selections: ProposalMediaSelection[]): Proposal {
  const proposalId = stringValue(row.id);
  const selectedPublisherIds =
    arrayValue<string>(objectValue(row.metadata).selectedPublisherIds).length > 0
      ? arrayValue<string>(objectValue(row.metadata).selectedPublisherIds)
      : selections
          .filter((selection) => selection.proposal_id === proposalId && selection.guard_status !== "blocked")
          .map((selection) => selection.publisher_id);

  return {
    id: proposalId,
    opportunity_id: optionalString(row.opportunity_id),
    name: stringValue(row.name, "Proposal"),
    status: stringValue(row.status, "draft") as Proposal["status"],
    budget: optionalNumber(row.budget),
    selectedPublisherIds: Array.from(new Set(selectedPublisherIds))
  };
}

function mapCampaignMediaAllocation(row: Row): CampaignMediaAllocation {
  return {
    id: stringValue(row.id),
    campaign_id: stringValue(row.campaign_id),
    publisher_id: stringValue(row.publisher_id),
    guard_status: stringValue(row.guard_status, "pending") as CampaignMediaAllocation["guard_status"],
    guard_reason: optionalString(row.guard_reason),
    allocation_budget: numberValue(row.allocation_budget)
  };
}

function mapCampaign(row: Row, allocations: CampaignMediaAllocation[]): Campaign {
  const campaignId = stringValue(row.id);
  const launchCheck = objectValue(row.launch_check);
  const publisherIds =
    arrayValue<string>(objectValue(row.metadata).publisherIds).length > 0
      ? arrayValue<string>(objectValue(row.metadata).publisherIds)
      : allocations
          .filter((allocation) => allocation.campaign_id === campaignId && allocation.guard_status !== "blocked")
          .map((allocation) => allocation.publisher_id);

  return {
    id: campaignId,
    proposal_id: optionalString(row.proposal_id),
    advertiser_id: optionalString(row.advertiser_id),
    name: stringValue(row.name, "Campaign"),
    status: stringValue(row.status, "draft") as Campaign["status"],
    publisherIds: Array.from(new Set(publisherIds)),
    launchChecklistPassed: booleanValue(launchCheck.passed)
  };
}

function mapDiagnosticCase(row: Row): DiagnosticCase {
  const metadata = objectValue(row.metadata);

  return {
    id: stringValue(row.id),
    case_no: stringValue(row.case_no),
    case_type: stringValue(row.case_type),
    publisher_id: optionalString(row.publisher_id),
    campaign_id: optionalString(row.campaign_id),
    settlement_id: optionalString(row.settlement_id),
    status: stringValue(row.status, "opened") as DiagnosticCase["status"],
    severity: stringValue(row.severity, "medium") as DiagnosticCase["severity"],
    owner_role: optionalString(row.owner_role) as DiagnosticCase["owner_role"],
    affected_campaign_count: optionalNumber(metadata.affected_campaign_count),
    current_blocker: optionalString(metadata.current_blocker) ?? optionalString(row.impact_scope),
    next_action: optionalString(metadata.next_action) ?? optionalString(row.downstream_action),
    root_cause: optionalString(row.root_cause),
    responsibility_owner: optionalString(metadata.responsibility_owner),
    conclusion: optionalString(row.conclusion),
    follow_up_action: optionalString(metadata.follow_up_action),
    is_blocking_sales_scale: booleanValue(row.is_blocking_sales_scale),
    is_blocking_settlement: booleanValue(row.is_blocking_settlement)
  };
}

function mapDiagnosticEvidence(row: Row): DiagnosticEvidence {
  const data = objectValue(row.data);

  return {
    id: stringValue(row.id),
    diagnostic_case_id: stringValue(row.case_id),
    title: stringValue(row.title, "Evidence"),
    evidence_type: stringValue(row.evidence_type, "log_sample") as DiagnosticEvidence["evidence_type"],
    source: stringValue(row.content, "Supabase evidence"),
    metric_name: optionalString(data.metric_name),
    baseline_value: optionalNumber(data.baseline_value),
    current_value: optionalNumber(data.current_value),
    status: stringValue(data.status, "collected") as DiagnosticEvidence["status"]
  };
}

function mapSettlement(row: Row): Settlement {
  const metadata = objectValue(row.metadata);

  return {
    id: stringValue(row.id),
    campaign_id: stringValue(row.campaign_id),
    publisher_id: stringValue(row.publisher_id),
    status: stringValue(row.status, "draft") as Settlement["status"],
    reconciliationCompleted: booleanValue(metadata.reconciliationCompleted),
    currency: optionalString(row.currency),
    gross_amount: optionalNumber(metadata.gross_amount) ?? optionalNumber(row.amount),
    payable_amount: optionalNumber(metadata.payable_amount) ?? optionalNumber(row.amount),
    adjustment_amount: optionalNumber(metadata.adjustment_amount),
    reconciliation_delta: optionalNumber(metadata.reconciliation_delta),
    invoice_no: optionalString(metadata.invoice_no),
    due_date: optionalString(metadata.due_date),
    confirmed_at: optionalString(metadata.confirmed_at),
    invoice_issued_at: optionalString(metadata.invoice_issued_at),
    paid_at: optionalString(metadata.paid_at)
  };
}

function mapContract(row: Row): BusinessContract {
  const metadata = objectValue(row.metadata);
  const objectType = stringValue(row.object_type);

  return {
    id: stringValue(row.id),
    contract_no: stringValue(metadata.contract_no, stringValue(row.contract_name, "CON")),
    contract_type: stringValue(metadata.contract_type, "publisher_framework") as BusinessContract["contract_type"],
    counterparty_name: stringValue(metadata.counterparty_name, stringValue(row.counterparty, "Counterparty")),
    publisher_id: optionalString(metadata.publisher_id) ?? (objectType === "publisher" ? optionalString(row.object_id) : undefined),
    advertiser_id: optionalString(metadata.advertiser_id) ?? (objectType === "advertiser" ? optionalString(row.object_id) : undefined),
    settlement_id: optionalString(metadata.settlement_id) ?? (objectType === "settlement" ? optionalString(row.object_id) : undefined),
    status: stringValue(row.status, "draft") as BusinessContract["status"],
    owner_role: roleCode(metadata.owner_role, "legal_manager"),
    requested_by_role: roleCode(metadata.requested_by_role, "operations_director"),
    risk_level: stringValue(metadata.risk_level, "medium") as BusinessContract["risk_level"],
    currency: optionalString(metadata.currency),
    value_amount: optionalNumber(metadata.value_amount),
    effective_date: dateOnly(row.effective_date),
    expiration_date: dateOnly(row.expiry_date),
    blocker: optionalString(metadata.blocker),
    next_action: optionalString(metadata.next_action),
    legal_notes: optionalString(metadata.legal_notes),
    finance_notes: optionalString(metadata.finance_notes),
    signed_at: optionalString(metadata.signed_at),
    archived_at: optionalString(metadata.archived_at)
  };
}

function mapSopCard(row: Row): SopCard {
  const metadata = objectValue(row.metadata);
  const content = stringValue(row.content);
  const steps = arrayValue<string>(metadata.steps);

  return {
    id: stringValue(row.id),
    title: stringValue(row.title, "SOP"),
    module: stringValue(metadata.module, "Common") as SopCard["module"],
    scenario: stringValue(row.scenario),
    owner_role: roleCode(metadata.owner_role ?? row.role_code, "product_owner"),
    visible_roles: arrayValue<RoleCode>(metadata.visible_roles).length > 0 ? arrayValue<RoleCode>(metadata.visible_roles) : [roleCode(row.role_code, "product_owner")],
    status: stringValue(metadata.status, "published") as SopCard["status"],
    priority: stringValue(metadata.priority, "Reference") as SopCard["priority"],
    summary: stringValue(metadata.summary, content),
    steps: steps.length > 0 ? steps : content.split("\n").map((line) => line.trim()).filter(Boolean),
    related_route: optionalString(row.related_route),
    related_service: optionalString(metadata.related_service),
    version: numberValue(metadata.version, 1),
    updated_at: stringValue(row.updated_at, new Date().toISOString())
  };
}

function mapWorkbenchTask(row: Row): WorkbenchTask {
  const metadata = objectValue(row.metadata);
  const priority = stringValue(row.priority, "medium");

  return {
    id: stringValue(row.id),
    title: stringValue(row.title, "Task"),
    module: stringValue(metadata.module, "Workbench") as WorkbenchTask["module"],
    owner_role: roleCode(row.owner_role, "operations_director"),
    related_route: stringValue(metadata.related_route, "/workbench"),
    priority: priority === "critical" || priority === "high" ? "P0" : priority === "low" ? "P2" : "P1",
    status: stringValue(row.status, "open") === "waiting_external" ? "blocked" : (stringValue(row.status, "open") as WorkbenchTask["status"]),
    due_date: dateOnly(row.due_at),
    blocker: optionalString(metadata.blocker),
    next_action: stringValue(metadata.next_action, stringValue(row.description, "Continue task.")),
    source_object_type: optionalString(row.object_type) as WorkbenchTask["source_object_type"],
    source_object_id: optionalString(row.object_id)
  };
}

function mapOkrObjective(row: Row, keyResults: Row[]): OkrObjective {
  const objectiveId = stringValue(row.id);
  const relatedKeyResults = keyResults.filter((keyResult) => keyResult.objective_id === objectiveId);
  const firstKeyResult = relatedKeyResults[0] ?? {};
  const targetValue = numberValue(firstKeyResult.target_value);
  const currentValue = numberValue(firstKeyResult.current_value);
  const progressRatio = targetValue === 0 ? 1 : currentValue / targetValue;
  const status =
    stringValue(row.status) === "completed"
      ? "completed"
      : progressRatio >= 0.75
        ? "on_track"
        : progressRatio >= 0.5
          ? "at_risk"
          : "behind";

  return {
    id: objectiveId,
    title: stringValue(row.title, "OKR objective"),
    owner_role: roleCode(row.owner_role, "operations_director"),
    period: stringValue(row.period, "current"),
    status,
    target_value: targetValue,
    current_value: currentValue,
    unit: stringValue(firstKeyResult.unit),
    confidence: progressRatio >= 0.75 ? "high" : progressRatio >= 0.5 ? "medium" : "low"
  };
}

function toPublisherRow(publisher: Publisher): Row {
  return {
    id: publisher.id,
    name: publisher.name,
    legal_entity: publisher.legal_entity,
    region: publisher.region,
    media_type: publisher.media_type,
    integration_type: publisher.integration_type,
    technical_live_status: publisher.technical_live_status,
    commercial_test_status: publisher.commercial_test_status,
    sales_scale_status: publisher.sales_scale_status,
    risk_level: publisher.risk_level,
    daily_active_users: publisher.daily_active_users,
    daily_requests: publisher.daily_requests,
    metadata: publisher.metadata ?? {}
  };
}

function priorityLevelFromScore(score: number) {
  if (score >= 85) {
    return "A";
  }

  if (score >= 70) {
    return "B";
  }

  if (score > 0) {
    return "C";
  }

  return "UNSCORED";
}

function toMediaEcosystemOpportunityRow(lead: MediaEcosystemLead): Row {
  return {
    id: lead.id,
    media_name: lead.media_name,
    company_entity: lead.company_name,
    ecosystem_segment: lead.track,
    ecosystem_status: lead.stage,
    owner_user_id: optionalUuid(lead.owner_user_id),
    owner_role: lead.owner_role,
    verification_status: lead.verification_status,
    data_quality_level: lead.data_quality_level,
    review_required: lead.review_required,
    seed_confidence: lead.seed_confidence,
    source_name: lead.source_name,
    source_version: lead.source_version,
    source_page: lead.source_page,
    next_action: lead.next_action,
    target_contact_date: lead.target_contact,
    last_contact_at: lead.last_touch_at,
    strategic_segment_score: lead.score_breakdown.strategic_value,
    user_scale_score: lead.score_breakdown.user_scale_growth,
    ad_context_score: lead.score_breakdown.ad_scenario_value,
    integration_feasibility_score: lead.score_breakdown.programmatic_feasibility,
    advertiser_demand_score: lead.score_breakdown.advertiser_demand_match,
    commercial_feasibility_score: lead.score_breakdown.commercial_negotiability,
    risk_control_score: lead.score_breakdown.risk_compliance_control,
    priority_level: priorityLevelFromScore(lead.priority_score),
    priority_score_reason: lead.advertiser_demand_note,
    integration_feasibility: lead.integration_feasibility,
    media_contact_confirmed: lead.media_contact_confirmed,
    business_interest_confirmed: lead.business_interest_confirmed,
    ad_inventory_identified: lead.ad_inventory_identified,
    media_director_approved_by: optionalUuid(lead.media_director_approved_by),
    media_director_approved_at: lead.media_director_approved_at,
    linked_publisher_id: optionalUuid(lead.linked_publisher_id),
    metadata: {
      region: lead.region,
      risk_level: lead.risk_level,
      user_scale_note: lead.user_scale_note,
      ad_scenario_note: lead.ad_scenario_note
    }
  };
}

function toMediaOutreachActivityRow(activity: MediaOutreachActivity): Row {
  return {
    id: activity.id,
    opportunity_id: activity.lead_id,
    event: activity.event,
    actor_role: activity.actor_role,
    activity_at: activity.created_at,
    notes: activity.notes
  };
}

function toTrustedSupplyCandidateRow(candidate: TrustedSupplyCandidate): Row {
  return {
    id: candidate.id,
    opportunity_id: candidate.lead_id,
    media_name: candidate.media_name,
    track: candidate.track,
    priority_score: candidate.priority_score,
    status: candidate.status,
    owner_user_id: optionalUuid(candidate.owner_user_id),
    owner_role: candidate.owner_role,
    evaluation_notes: candidate.evaluation_notes,
    readiness_started_at: candidate.readiness_started_at,
    technical_reviewed_at: candidate.technical_reviewed_at,
    commercial_reviewed_at: candidate.commercial_reviewed_at,
    onboarding_ready_at: candidate.onboarding_ready_at,
    readiness_notes: candidate.readiness_notes,
    publisher_id: optionalUuid(candidate.publisher_id),
    created_at: candidate.created_at
  };
}

function toCampaignPriority(priority: WorkbenchTask["priority"]) {
  return priority === "P0" ? "high" : priority === "P2" ? "low" : "medium";
}

function toWorkItemStatus(status: WorkbenchTask["status"]) {
  return status;
}

function normalizeComparableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeComparableValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Row)
        .filter(([, objectValue]) => objectValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([objectKey, objectValue]) => [objectKey, normalizeComparableValue(objectValue)])
    );
  }

  return value;
}

function rowFingerprint(row: Row) {
  return JSON.stringify(normalizeComparableValue(row));
}

function filterDirtyRows(rows: Row[], baselineRows: Row[]) {
  const baselineById = new Map(baselineRows.map((row) => [String(row.id), rowFingerprint(row)]));

  return rows.filter((row) => baselineById.get(String(row.id)) !== rowFingerprint(row));
}

function filterDirtyTableRows<T extends { table: string; rows: Row[] }>(tableRows: T[], baselineTableRows?: T[]) {
  if (!baselineTableRows) {
    return tableRows;
  }

  const baselineByTable = new Map(baselineTableRows.map((table) => [table.table, table.rows]));

  return tableRows
    .filter((table) => table.table !== "audit_logs")
    .map((table) => ({
      ...table,
      rows: filterDirtyRows(table.rows, baselineByTable.get(table.table) ?? [])
    }));
}

function prepareRows(table: string, rows: Row[], requiredUuidFields: string[], skippedWrites: RepositorySkippedWrite[]) {
  return rows.flatMap((row) => {
    const id = row.id;

    if (!isUuid(id)) {
      skippedWrites.push({
        table,
        id: typeof id === "string" ? id : undefined,
        reason: "Skipped non-UUID primary key; Supabase locked schema uses uuid ids."
      });
      return [];
    }

    const invalidField = requiredUuidFields.find((field) => !isUuid(row[field]));

    if (invalidField) {
      skippedWrites.push({
        table,
        id,
        reason: `Skipped row because ${invalidField} is missing or not a UUID.`
      });
      return [];
    }

    return [row];
  });
}

function collectAuditEvents(snapshot: WorkflowSnapshot) {
  return [
    ...snapshot.mediaState.auditEvents,
    ...snapshot.salesState.auditEvents,
    ...snapshot.financeState.auditEvents,
    ...snapshot.contractState.auditEvents,
    ...snapshot.guideState.auditEvents,
    ...snapshot.workbenchState.auditEvents
  ];
}

function collectBusinessEvents(snapshot: WorkflowSnapshot) {
  return [
    ...snapshot.mediaState.businessEvents,
    ...snapshot.salesState.businessEvents,
    ...snapshot.financeState.businessEvents,
    ...snapshot.contractState.businessEvents,
    ...snapshot.guideState.businessEvents,
    ...snapshot.workbenchState.businessEvents
  ];
}

function cloneWorkflowSnapshot(snapshot: WorkflowSnapshot): WorkflowSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as WorkflowSnapshot;
}

export class SupabaseWorkflowRepository implements WorkflowRepository {
  readonly mode = "supabase" as const;
  private lastSavedSnapshot: WorkflowSnapshot | null = null;

  constructor(private readonly client: SupabaseLike) {}

  async loadSnapshot() {
    const fallback = createFixtureWorkflowSnapshot();
    const warnings: string[] = [];
    const loadedRows: LoadedRows = {};

    await Promise.all(
      TABLES_TO_LOAD.map(async (table) => {
        try {
          const { data, error } = await this.client.from(table).select("*");
          if (error) {
            warnings.push(`${table}: ${error.message ?? "read failed"}`);
            loadedRows[table] = null;
            return;
          }

          loadedRows[table] = data ?? [];
        } catch (error) {
          warnings.push(`${table}: ${error instanceof Error ? error.message : "read failed"}`);
          loadedRows[table] = null;
        }
      })
    );

    const proposalMediaSelections = rowsOrFallback(
      loadedRows.proposal_media_selections,
      fallback.salesState.proposalMediaSelections,
      mapProposalMediaSelection
    );
    const campaignMediaAllocations = rowsOrFallback(
      loadedRows.campaign_media_allocations,
      fallback.salesState.campaignMediaAllocations,
      mapCampaignMediaAllocation
    );

    const snapshot: WorkflowSnapshot = {
      mediaState: {
        ...fallback.mediaState,
        publishers: rowsOrFallback(loadedRows.publishers, fallback.mediaState.publishers, mapPublisher),
        publisherContacts: rowsOrFallback(loadedRows.publisher_contacts, fallback.mediaState.publisherContacts, mapPublisherContact),
        publisherAdSlots: rowsOrFallback(loadedRows.publisher_ad_slots, fallback.mediaState.publisherAdSlots, mapPublisherAdSlot),
        publisherContractTerms: rowsOrFallback(
          loadedRows.publisher_contract_terms,
          fallback.mediaState.publisherContractTerms,
          mapPublisherContractTerm
        ),
        integrationProjects: rowsOrFallback(loadedRows.integration_projects, fallback.mediaState.integrationProjects, mapIntegrationProject),
        commercialTests: rowsOrFallback(loadedRows.commercial_tests, fallback.mediaState.commercialTests, mapCommercialTest),
        mediaTrustProfiles: rowsOrFallback(
          loadedRows.media_trust_profiles,
          fallback.mediaState.mediaTrustProfiles,
          mapMediaTrustProfile
        ),
        mediaTrustScoreHistory: rowsOrFallback(
          loadedRows.media_trust_score_history,
          fallback.mediaState.mediaTrustScoreHistory,
          mapMediaTrustScoreRecord
        ),
        mediaSupplyPackages: rowsOrFallback(
          loadedRows.media_supply_packages,
          fallback.mediaState.mediaSupplyPackages,
          mapMediaSupplyPackage
        ),
        mediaEcosystemLeads: rowsOrFallback(
          loadedRows.media_ecosystem_opportunities,
          fallback.mediaState.mediaEcosystemLeads,
          mapMediaEcosystemOpportunity
        ),
        mediaOutreachActivities: rowsOrFallback(
          loadedRows.media_ecosystem_outreach_activities,
          fallback.mediaState.mediaOutreachActivities,
          mapMediaOutreachActivity
        ),
        trustedSupplyCandidates: rowsOrFallback(
          loadedRows.trusted_supply_candidates,
          fallback.mediaState.trustedSupplyCandidates,
          mapTrustedSupplyCandidate
        ),
        diagnosticCases: rowsOrFallback(loadedRows.quality_diagnostic_cases, fallback.mediaState.diagnosticCases, mapDiagnosticCase),
        diagnosticEvidence: rowsOrFallback(loadedRows.quality_diagnostic_evidence, fallback.mediaState.diagnosticEvidence, mapDiagnosticEvidence)
      },
      salesState: {
        ...fallback.salesState,
        advertisers: rowsOrFallback(loadedRows.advertisers, fallback.salesState.advertisers, mapAdvertiser),
        advertiserContacts: rowsOrFallback(loadedRows.advertiser_contacts, fallback.salesState.advertiserContacts, mapAdvertiserContact),
        opportunities: rowsOrFallback(loadedRows.opportunities, fallback.salesState.opportunities, mapOpportunity),
        proposals:
          loadedRows.proposals === null
            ? fallback.salesState.proposals
            : loadedRows.proposals.map((proposal) => mapProposal(proposal, proposalMediaSelections)),
        proposalMediaSelections,
        campaigns:
          loadedRows.campaigns === null
            ? fallback.salesState.campaigns
            : loadedRows.campaigns.map((campaign) => mapCampaign(campaign, campaignMediaAllocations)),
        campaignMediaAllocations
      },
      financeState: {
        ...fallback.financeState,
        settlements: rowsOrFallback(loadedRows.settlements, fallback.financeState.settlements, mapSettlement)
      },
      contractState: {
        ...fallback.contractState,
        contracts: rowsOrFallback(loadedRows.contracts, fallback.contractState.contracts, mapContract)
      },
      guideState: {
        ...fallback.guideState,
        sopCards: rowsOrFallback(loadedRows.sop_cards, fallback.guideState.sopCards, mapSopCard)
      },
      workbenchState: {
        ...fallback.workbenchState,
        tasks: rowsOrFallback(loadedRows.work_items, fallback.workbenchState.tasks, mapWorkbenchTask),
        okrObjectives:
          loadedRows.okr_objectives === null
            ? fallback.workbenchState.okrObjectives
            : loadedRows.okr_objectives.map((objective) => mapOkrObjective(objective, loadedRows.okr_key_results ?? []))
      }
    };

    this.lastSavedSnapshot = cloneWorkflowSnapshot(snapshot);

    return {
      snapshot,
      health: {
        mode: this.mode,
        source: warnings.length > 0 ? "supabase-with-fallback" : "supabase",
        loadedAt: new Date().toISOString(),
        warnings
      }
    };
  }

  async saveSnapshot(snapshot: WorkflowSnapshot, context?: WorkflowSaveContext) {
    const warnings: string[] = [];
    const skippedWrites: RepositorySkippedWrite[] = [];
    const savedTables: string[] = [];
    const actorUserId = actorUserIdFromContext(context);

    const buildTableRows = (snapshot: WorkflowSnapshot): Array<{ table: string; rows: Row[]; uuidFields: string[] }> => [
      {
        table: "publishers",
        rows: snapshot.mediaState.publishers.map(toPublisherRow),
        uuidFields: []
      },
      {
        table: "publisher_contacts",
        rows: snapshot.mediaState.publisherContacts.map((contact) => ({
          id: contact.id,
          publisher_id: contact.publisher_id,
          name: contact.name,
          role_title: contact.role_title,
          email: contact.email,
          phone: contact.phone,
          is_primary: contact.is_primary
        })),
        uuidFields: ["publisher_id"]
      },
      {
        table: "publisher_ad_slots",
        rows: snapshot.mediaState.publisherAdSlots.map((slot) => ({
          id: slot.id,
          publisher_id: slot.publisher_id,
          slot_name: slot.slot_name,
          ad_format: slot.ad_format,
          placement_type: slot.placement_type,
          floor_price: slot.floor_price,
          currency: slot.currency ?? "CNY",
          daily_requests: slot.daily_requests,
          metadata: { creative_spec: slot.creative_spec },
          status: slot.status
        })),
        uuidFields: ["publisher_id"]
      },
      {
        table: "publisher_contract_terms",
        rows: snapshot.mediaState.publisherContractTerms.map((term) => ({
          id: term.id,
          publisher_id: term.publisher_id,
          contract_type: term.contract_type,
          billing_model: term.billing_model,
          settlement_cycle: term.settlement_cycle,
          payment_terms: term.payment_terms,
          revenue_share: term.revenue_share,
          currency: term.currency ?? "CNY"
        })),
        uuidFields: ["publisher_id"]
      },
      {
        table: "integration_projects",
        rows: snapshot.mediaState.integrationProjects.map((project) => ({
          id: project.id,
          publisher_id: project.publisher_id,
          integration_type: project.integration_type,
          status: project.status,
          notes: project.notes,
          checklist: project.checklist,
          evidence: project.evidence ?? [],
          blocker: project.blocker,
          next_action: project.next_action,
          readiness_reviewed_at: project.readiness_reviewed_at,
          go_live_date: project.go_live_date
        })),
        uuidFields: ["publisher_id"]
      },
      {
        table: "commercial_tests",
        rows: snapshot.mediaState.commercialTests.map((test) => ({
          id: test.id,
          publisher_id: test.publisher_id,
          test_name: test.test_name,
          status: test.status,
          owner_user_id: optionalUuid(test.owner_user_id),
          owner_role: test.owner_role,
          start_date: test.start_date,
          end_date: test.end_date,
          target_budget: test.target_budget,
          currency: test.currency ?? "CNY",
          test_plan: test.test_plan ?? {},
          next_action: test.next_action,
          reviewed_at: test.reviewed_at,
          result_summary: test.result_summary,
          metrics: {
            spend: test.spend,
            fill_rate: test.fill_rate,
            clear_rate: test.clear_rate,
            ivt_rate: test.ivt_rate
          }
        })),
        uuidFields: ["publisher_id"]
      },
      {
        table: "media_trust_profiles",
        rows: snapshot.mediaState.mediaTrustProfiles.map((profile) => ({
          id: profile.id,
          publisher_id: profile.publisher_id,
          status: profile.status,
          total_score: profile.total_score,
          trust_level: profile.trust_level,
          score_breakdown: profile.score_breakdown,
          suggested_pool: profile.suggested_pool,
          confirmed_pool: profile.confirmed_pool,
          advertiser_fit_tags: profile.advertiser_fit_tags,
          recommendation_reasons: profile.recommendation_reasons,
          risk_warnings: profile.risk_warnings,
          owner_role: profile.owner_role,
          next_action: profile.next_action,
          evaluated_at: profile.evaluated_at,
          confirmed_at: profile.confirmed_at
        })),
        uuidFields: ["publisher_id"]
      },
      {
        table: "media_trust_score_history",
        rows: snapshot.mediaState.mediaTrustScoreHistory.map((record) => ({
          id: record.id,
          publisher_id: record.publisher_id,
          total_score: record.total_score,
          trust_level: record.trust_level,
          score_breakdown: record.score_breakdown,
          suggested_pool: record.suggested_pool,
          reasons: record.reasons,
          risk_warnings: record.risk_warnings,
          calculated_at: record.calculated_at,
          calculated_by_role: record.calculated_by_role
        })),
        uuidFields: ["publisher_id"]
      },
      {
        table: "media_supply_packages",
        rows: snapshot.mediaState.mediaSupplyPackages.map((packageRecord) => ({
          id: packageRecord.id,
          publisher_id: packageRecord.publisher_id,
          package_name: packageRecord.package_name,
          status: packageRecord.status,
          pool: packageRecord.pool,
          ad_formats: packageRecord.ad_formats,
          placement_types: packageRecord.placement_types,
          geo: packageRecord.geo,
          inventory_scale: packageRecord.inventory_scale,
          floor_price: packageRecord.floor_price,
          billing_model: packageRecord.billing_model,
          advertiser_fit_tags: packageRecord.advertiser_fit_tags,
          risk_notes: packageRecord.risk_notes,
          owner_role: packageRecord.owner_role,
          activated_at: packageRecord.activated_at,
          created_at: packageRecord.created_at,
          updated_at: packageRecord.updated_at
        })),
        uuidFields: ["publisher_id"]
      },
      {
        table: "media_ecosystem_opportunities",
        rows: snapshot.mediaState.mediaEcosystemLeads.map(toMediaEcosystemOpportunityRow),
        uuidFields: []
      },
      {
        table: "media_ecosystem_outreach_activities",
        rows: snapshot.mediaState.mediaOutreachActivities.map(toMediaOutreachActivityRow),
        uuidFields: ["opportunity_id"]
      },
      {
        table: "trusted_supply_candidates",
        rows: snapshot.mediaState.trustedSupplyCandidates.map(toTrustedSupplyCandidateRow),
        uuidFields: ["opportunity_id"]
      },
      {
        table: "advertisers",
        rows: snapshot.salesState.advertisers.map((advertiser) => ({
          id: advertiser.id,
          name: advertiser.name,
          industry: advertiser.industry,
          region: advertiser.region,
          status: advertiser.status
        })),
        uuidFields: []
      },
      {
        table: "advertiser_contacts",
        rows: snapshot.salesState.advertiserContacts.map((contact) => ({
          id: contact.id,
          advertiser_id: contact.advertiser_id,
          name: contact.name,
          role_title: contact.role_title,
          email: contact.email,
          is_primary: contact.is_primary
        })),
        uuidFields: ["advertiser_id"]
      },
      {
        table: "opportunities",
        rows: snapshot.salesState.opportunities.map((opportunity) => ({
          id: opportunity.id,
          advertiser_id: opportunity.advertiser_id,
          name: opportunity.name,
          stage: opportunity.stage,
          expected_budget: opportunity.expected_budget,
          pain_points: opportunity.pain_points
        })),
        uuidFields: ["advertiser_id"]
      },
      {
        table: "proposals",
        rows: snapshot.salesState.proposals.map((proposal) => ({
          id: proposal.id,
          opportunity_id: proposal.opportunity_id,
          name: proposal.name,
          status: proposal.status,
          budget: proposal.budget,
          metadata: {
            selectedPublisherIds: proposal.selectedPublisherIds
          }
        })),
        uuidFields: ["opportunity_id"]
      },
      {
        table: "proposal_media_selections",
        rows: snapshot.salesState.proposalMediaSelections.map((selection) => ({
          id: selection.id,
          proposal_id: selection.proposal_id,
          publisher_id: selection.publisher_id,
          guard_status: selection.guard_status,
          guard_reason: selection.guard_reason,
          planned_budget: selection.planned_budget
        })),
        uuidFields: ["proposal_id", "publisher_id"]
      },
      {
        table: "campaigns",
        rows: snapshot.salesState.campaigns.map((campaign) => ({
          id: campaign.id,
          proposal_id: optionalUuid(campaign.proposal_id),
          advertiser_id: campaign.advertiser_id,
          name: campaign.name,
          status: campaign.status,
          launch_check: {
            passed: campaign.launchChecklistPassed
          },
          metadata: {
            publisherIds: campaign.publisherIds
          }
        })),
        uuidFields: ["advertiser_id"]
      },
      {
        table: "campaign_media_allocations",
        rows: snapshot.salesState.campaignMediaAllocations.map((allocation) => ({
          id: allocation.id,
          campaign_id: allocation.campaign_id,
          publisher_id: allocation.publisher_id,
          guard_status: allocation.guard_status,
          guard_reason: allocation.guard_reason,
          allocation_budget: allocation.allocation_budget
        })),
        uuidFields: ["campaign_id", "publisher_id"]
      },
      {
        table: "quality_diagnostic_cases",
        rows: snapshot.mediaState.diagnosticCases.map((diagnosticCase) => ({
          id: diagnosticCase.id,
          case_no: diagnosticCase.case_no,
          case_type: diagnosticCase.case_type,
          title: `${diagnosticCase.case_no} ${diagnosticCase.case_type}`,
          publisher_id: optionalUuid(diagnosticCase.publisher_id),
          campaign_id: optionalUuid(diagnosticCase.campaign_id),
          settlement_id: optionalUuid(diagnosticCase.settlement_id),
          owner_role: diagnosticCase.owner_role,
          status: diagnosticCase.status,
          severity: diagnosticCase.severity,
          impact_scope: diagnosticCase.current_blocker,
          downstream_action: diagnosticCase.next_action,
          root_cause: diagnosticCase.root_cause,
          conclusion: diagnosticCase.conclusion,
          is_blocking_sales_scale: diagnosticCase.is_blocking_sales_scale,
          is_blocking_settlement: diagnosticCase.is_blocking_settlement,
          metadata: {
            affected_campaign_count: diagnosticCase.affected_campaign_count,
            responsibility_owner: diagnosticCase.responsibility_owner,
            follow_up_action: diagnosticCase.follow_up_action
          }
        })),
        uuidFields: []
      },
      {
        table: "quality_diagnostic_evidence",
        rows: snapshot.mediaState.diagnosticEvidence.map((evidence) => ({
          id: evidence.id,
          case_id: evidence.diagnostic_case_id,
          evidence_type: evidence.evidence_type,
          title: evidence.title,
          content: evidence.source,
          data: {
            metric_name: evidence.metric_name,
            baseline_value: evidence.baseline_value,
            current_value: evidence.current_value,
            status: evidence.status
          }
        })),
        uuidFields: ["case_id"]
      },
      {
        table: "contracts",
        rows: snapshot.contractState.contracts.map((contract) => ({
          id: contract.id,
          object_type: contract.publisher_id ? "publisher" : contract.advertiser_id ? "advertiser" : contract.settlement_id ? "settlement" : "contract",
          object_id: optionalUuid(contract.publisher_id ?? contract.advertiser_id ?? contract.settlement_id),
          contract_name: contract.contract_no,
          counterparty: contract.counterparty_name,
          status: contract.status,
          effective_date: contract.effective_date,
          expiry_date: contract.expiration_date,
          metadata: {
            contract_no: contract.contract_no,
            contract_type: contract.contract_type,
            counterparty_name: contract.counterparty_name,
            publisher_id: contract.publisher_id,
            advertiser_id: contract.advertiser_id,
            settlement_id: contract.settlement_id,
            owner_role: contract.owner_role,
            requested_by_role: contract.requested_by_role,
            risk_level: contract.risk_level,
            currency: contract.currency,
            value_amount: contract.value_amount,
            blocker: contract.blocker,
            next_action: contract.next_action,
            legal_notes: contract.legal_notes,
            finance_notes: contract.finance_notes,
            signed_at: contract.signed_at,
            archived_at: contract.archived_at
          }
        })),
        uuidFields: []
      },
      {
        table: "settlements",
        rows: snapshot.financeState.settlements.map((settlement) => ({
          id: settlement.id,
          campaign_id: optionalUuid(settlement.campaign_id),
          publisher_id: optionalUuid(settlement.publisher_id),
          period_start: settlement.due_date ?? new Date().toISOString().slice(0, 10),
          period_end: settlement.due_date ?? new Date().toISOString().slice(0, 10),
          status: settlement.status,
          amount: settlement.gross_amount ?? settlement.payable_amount ?? 0,
          currency: settlement.currency,
          metadata: {
            reconciliationCompleted: settlement.reconciliationCompleted,
            gross_amount: settlement.gross_amount,
            payable_amount: settlement.payable_amount,
            adjustment_amount: settlement.adjustment_amount,
            reconciliation_delta: settlement.reconciliation_delta,
            invoice_no: settlement.invoice_no,
            due_date: settlement.due_date,
            confirmed_at: settlement.confirmed_at,
            invoice_issued_at: settlement.invoice_issued_at,
            paid_at: settlement.paid_at
          }
        })),
        uuidFields: []
      },
      {
        table: "sop_cards",
        rows: snapshot.guideState.sopCards.map((sopCard) => ({
          id: sopCard.id,
          title: sopCard.title,
          scenario: sopCard.scenario,
          role_code: sopCard.owner_role,
          content: sopCard.steps.join("\n"),
          related_route: sopCard.related_route,
          metadata: {
            module: sopCard.module,
            owner_role: sopCard.owner_role,
            visible_roles: sopCard.visible_roles,
            status: sopCard.status,
            priority: sopCard.priority,
            summary: sopCard.summary,
            steps: sopCard.steps,
            related_service: sopCard.related_service,
            version: sopCard.version,
            updated_at: sopCard.updated_at
          }
        })),
        uuidFields: []
      },
      {
        table: "work_items",
        rows: snapshot.workbenchState.tasks.map((task) => ({
          id: task.id,
          title: task.title,
          description: task.next_action,
          object_type: task.source_object_type,
          object_id: optionalUuid(task.source_object_id),
          owner_role: task.owner_role,
          status: toWorkItemStatus(task.status),
          priority: toCampaignPriority(task.priority),
          due_at: task.due_date,
          metadata: {
            module: task.module,
            related_route: task.related_route,
            blocker: task.blocker,
            next_action: task.next_action,
            source_object_id: task.source_object_id
          }
        })),
        uuidFields: []
      },
      {
        table: "okr_objectives",
        rows: snapshot.workbenchState.okrObjectives.map((objective) => ({
          id: objective.id,
          title: objective.title,
          owner_role: objective.owner_role,
          period: objective.period,
          status: objective.status
        })),
        uuidFields: []
      },
      {
        table: "audit_logs",
        rows: collectAuditEvents(snapshot).map((event: AuditEvent) => ({
          id: event.id,
          actor_user_id: optionalUuid(event.actorUserId),
          action: event.action,
          object_type: event.objectType,
          object_id: optionalUuid(event.objectId),
          after_data: buildBusinessAuditAfterData(event, context?.actor?.activeRole),
          created_at: event.createdAt
        })),
        uuidFields: []
      },
      {
        table: "module_business_events",
        rows: collectBusinessEvents(snapshot).map((event: ModuleBusinessEvent) => ({
          id: event.id,
          event_code: event.eventCode,
          object_type: event.objectType,
          object_id: optionalUuid(event.objectId),
          owner_role: event.ownerRole,
          payload: event.payload ?? {},
          created_at: event.createdAt
        })),
        uuidFields: ["object_id"]
      }
    ];
    const tableRows = filterDirtyTableRows(
      buildTableRows(snapshot),
      this.lastSavedSnapshot ? buildTableRows(this.lastSavedSnapshot) : undefined
    );

    for (const table of tableRows) {
      if (
        table.table === "publishers" &&
        context?.actor &&
        !publisherWriteRoles.has(context.actor.activeRole)
      ) {
        table.rows.forEach((row) =>
          skippedWrites.push({
            table: table.table,
            id: typeof row.id === "string" ? row.id : undefined,
            reason: "Publisher readiness is synchronized from the permitted domain record by a database trigger."
          })
        );
        continue;
      }

      const rows = prepareRows(table.table, table.rows, table.uuidFields, skippedWrites).map((row) =>
        applyActorFields(table.table, row, actorUserId)
      );
      if (rows.length === 0) {
        continue;
      }

      try {
        const { error } = await this.client.from(table.table).upsert(rows, { onConflict: "id" });
        if (error) {
          warnings.push(`${table.table}: ${error.message ?? "upsert failed"}`);
          continue;
        }

        savedTables.push(table.table);
      } catch (error) {
        warnings.push(`${table.table}: ${error instanceof Error ? error.message : "upsert failed"}`);
      }
    }

    if (warnings.length === 0) {
      this.lastSavedSnapshot = cloneWorkflowSnapshot(snapshot);
    }

    return {
      ok: warnings.length === 0,
      mode: this.mode,
      savedTables,
      warnings,
      skippedWrites
    };
  }
}
