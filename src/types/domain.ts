import type { RoleCode } from "../constants/roles";
import type {
  CampaignStatus,
  CommercialTestStatus,
  ContractStatus,
  DiagnosticCaseStatus,
  ProposalStatus,
  SalesScaleStatus,
  SettlementStatus,
  Severity,
  TechnicalLiveStatus
} from "../constants/statuses";

export type UserId = string;
export type EntityId = string;

export type BusinessUser = {
  id: UserId;
  email: string;
  fullName: string;
  roles: RoleCode[];
  activeRole: RoleCode;
};

export type ObjectType =
  | "advertiser"
  | "opportunity"
  | "publisher"
  | "media_ecosystem_lead"
  | "trusted_supply_candidate"
  | "proposal"
  | "campaign"
  | "contract"
  | "diagnostic_case"
  | "okr"
  | "settlement"
  | "workbench_task"
  | "route"
  | "approval";

export type Publisher = {
  id: EntityId;
  name: string;
  region?: string;
  media_type?: string;
  integration_type?: string;
  technical_live_status: TechnicalLiveStatus;
  commercial_test_status: CommercialTestStatus;
  sales_scale_status: SalesScaleStatus;
  risk_level: Severity;
  daily_active_users?: number;
  daily_requests?: number;
};

export type PublisherContact = {
  id: EntityId;
  publisher_id: EntityId;
  name: string;
  role_title: string;
  email?: string;
  is_primary: boolean;
};

export type PublisherAdSlot = {
  id: EntityId;
  publisher_id: EntityId;
  slot_name: string;
  ad_format: string;
  placement_type: string;
  floor_price?: number;
  daily_requests?: number;
  status: "active" | "paused";
};

export type PublisherContractTerm = {
  id: EntityId;
  publisher_id: EntityId;
  contract_type: string;
  billing_model: string;
  settlement_cycle: string;
  payment_terms: string;
  revenue_share?: number;
};

export type IntegrationProject = {
  id: EntityId;
  publisher_id: EntityId;
  integration_type: string;
  status: TechnicalLiveStatus;
  checklist: Record<string, boolean>;
  notes: string;
};

export type CommercialTest = {
  id: EntityId;
  publisher_id: EntityId;
  test_name: string;
  status: CommercialTestStatus;
  target_budget: number;
  spend: number;
  fill_rate: number;
  clear_rate: number;
  ivt_rate: number;
  result_summary?: string;
};

export type MediaEcosystemTrack =
  | "VIDEO_LONG_FORM"
  | "SHORT_VIDEO_LIVE"
  | "NEWS_SEARCH_BROWSER"
  | "SOCIAL_COMMUNITY"
  | "ECOMMERCE_RETAIL_MEDIA"
  | "LOCAL_LIFE_TRAVEL"
  | "GAME_H5_IAA"
  | "WELLNESS_FEMALE_HEALTH"
  | "UTILITY_TOOLS"
  | "CTV_OTT_OEM"
  | "SMART_HARDWARE"
  | "AUDIO_PODCAST"
  | "CAMPUS_YOUTH"
  | "OUTDOOR_DOOH"
  | "AI_APP_CONTENT"
  | "OTHER_VERTICAL";

export type MediaExpansionStage =
  | "ECOSYSTEM_MAPPED"
  | "PRIORITY_SCREENED"
  | "OUTREACH_READY"
  | "CONTACTED"
  | "MEETING_SCHEDULED"
  | "BUSINESS_QUALIFIED"
  | "TECH_FEASIBILITY_CHECK"
  | "TRUSTED_SUPPLY_CANDIDATE"
  | "ONBOARDING_PROJECT_CREATED"
  | "REJECTED"
  | "ON_HOLD";

export type IntegrationFeasibility = "unknown" | "feasible" | "needs_work" | "impossible";

export type MediaEcosystemPriorityScore = {
  strategic_value: number;
  user_scale_growth: number;
  ad_scenario_value: number;
  programmatic_feasibility: number;
  advertiser_demand_match: number;
  commercial_negotiability: number;
  risk_compliance_control: number;
};

export type MediaEcosystemLead = {
  id: EntityId;
  media_name: string;
  company_name?: string;
  track: MediaEcosystemTrack;
  region: "CN" | "APAC" | "Global";
  stage: MediaExpansionStage;
  owner_role: RoleCode;
  priority_score: number;
  score_breakdown: MediaEcosystemPriorityScore;
  user_scale_note: string;
  ad_scenario_note: string;
  advertiser_demand_note: string;
  integration_feasibility: IntegrationFeasibility;
  media_contact_confirmed: boolean;
  business_interest_confirmed: boolean;
  ad_inventory_identified: boolean;
  risk_level: Severity;
  next_action: string;
  target_contact?: string;
  last_touch_at?: string;
  linked_publisher_id?: EntityId;
};

export type MediaOutreachActivity = {
  id: EntityId;
  lead_id: EntityId;
  event: string;
  actor_role: RoleCode;
  created_at: string;
  notes?: string;
};

export type TrustedSupplyCandidate = {
  id: EntityId;
  lead_id: EntityId;
  media_name: string;
  track: MediaEcosystemTrack;
  priority_score: number;
  status: "candidate" | "onboarding_project_created" | "rejected";
  owner_role: RoleCode;
  created_at: string;
  evaluation_notes: string;
  publisher_id?: EntityId;
};

export type Advertiser = {
  id: EntityId;
  name: string;
  industry: string;
  region: string;
  status: "active" | "paused";
};

export type AdvertiserContact = {
  id: EntityId;
  advertiser_id: EntityId;
  name: string;
  role_title: string;
  email?: string;
  is_primary: boolean;
};

export type Opportunity = {
  id: EntityId;
  advertiser_id: EntityId;
  name: string;
  stage: "discovery" | "need_confirmed" | "proposal_drafting" | "proposal_review" | "won" | "lost";
  expected_budget: number;
  pain_points: string[];
};

export type Proposal = {
  id: EntityId;
  opportunity_id?: EntityId;
  name: string;
  status: ProposalStatus;
  budget?: number;
  selectedPublisherIds: EntityId[];
};

export type ProposalMediaSelection = {
  id: EntityId;
  proposal_id: EntityId;
  publisher_id: EntityId;
  guard_status: "pending" | "allowed" | "warning" | "blocked";
  guard_reason?: string;
  planned_budget: number;
};

export type Campaign = {
  id: EntityId;
  proposal_id?: EntityId;
  advertiser_id?: EntityId;
  name: string;
  status: CampaignStatus;
  publisherIds: EntityId[];
  launchChecklistPassed: boolean;
};

export type CampaignMediaAllocation = {
  id: EntityId;
  campaign_id: EntityId;
  publisher_id: EntityId;
  guard_status: "pending" | "allowed" | "warning" | "blocked";
  guard_reason?: string;
  allocation_budget: number;
};

export type DiagnosticCase = {
  id: EntityId;
  case_no: string;
  case_type: string;
  publisher_id?: EntityId;
  campaign_id?: EntityId;
  settlement_id?: EntityId;
  status: DiagnosticCaseStatus;
  severity: Severity;
  owner_role?: RoleCode;
  affected_campaign_count?: number;
  current_blocker?: string;
  next_action?: string;
  root_cause?: string;
  responsibility_owner?: string;
  conclusion?: string;
  follow_up_action?: string;
  is_blocking_sales_scale: boolean;
  is_blocking_settlement: boolean;
};

export type DiagnosticEvidence = {
  id: EntityId;
  diagnostic_case_id: EntityId;
  title: string;
  evidence_type: "funnel_metric" | "log_sample" | "publisher_feedback" | "settlement_file" | "screenshot";
  source: string;
  metric_name?: string;
  baseline_value?: number;
  current_value?: number;
  status: "collected" | "needs_review" | "accepted";
};

export type DiagnosticActivity = {
  id: EntityId;
  diagnostic_case_id: EntityId;
  event: string;
  actor_role: RoleCode;
  created_at: string;
};

export type Settlement = {
  id: EntityId;
  campaign_id: EntityId;
  publisher_id: EntityId;
  status: SettlementStatus;
  reconciliationCompleted: boolean;
  currency?: string;
  gross_amount?: number;
  payable_amount?: number;
  adjustment_amount?: number;
  reconciliation_delta?: number;
  invoice_no?: string;
  due_date?: string;
  confirmed_at?: string;
  invoice_issued_at?: string;
  paid_at?: string;
};

export type SettlementActivity = {
  id: EntityId;
  settlement_id: EntityId;
  event: string;
  actor_role: RoleCode;
  created_at: string;
};

export type BusinessContract = {
  id: EntityId;
  contract_no: string;
  contract_type: "publisher_framework" | "advertiser_msa" | "settlement_side_letter" | "data_processing_addendum";
  counterparty_name: string;
  publisher_id?: EntityId;
  advertiser_id?: EntityId;
  settlement_id?: EntityId;
  status: ContractStatus;
  owner_role: RoleCode;
  requested_by_role: RoleCode;
  risk_level: Severity;
  currency?: string;
  value_amount?: number;
  effective_date?: string;
  expiration_date?: string;
  blocker?: string;
  next_action?: string;
  legal_notes?: string;
  finance_notes?: string;
  signed_at?: string;
  archived_at?: string;
};

export type ContractActivity = {
  id: EntityId;
  contract_id: EntityId;
  event: string;
  actor_role: RoleCode;
  created_at: string;
};

export type SopCard = {
  id: EntityId;
  title: string;
  module: "Common" | "Media" | "Sales" | "Campaigns" | "Diagnostics" | "Finance" | "Contracts" | "Admin";
  scenario: string;
  owner_role: RoleCode;
  visible_roles: RoleCode[];
  status: "draft" | "published" | "deprecated";
  priority: "P0" | "P1" | "Reference";
  summary: string;
  steps: string[];
  related_route?: string;
  related_service?: string;
  version: number;
  updated_at: string;
};

export type SopActivity = {
  id: EntityId;
  sop_card_id: EntityId;
  event: string;
  actor_role: RoleCode;
  created_at: string;
};

export type WorkbenchTask = {
  id: EntityId;
  title: string;
  module: "Media" | "Sales" | "Campaigns" | "Diagnostics" | "Finance" | "Contracts" | "Guide" | "Admin" | "Workbench";
  owner_role: RoleCode;
  related_route: string;
  priority: "P0" | "P1" | "P2";
  status: "open" | "in_progress" | "done" | "blocked";
  due_date?: string;
  blocker?: string;
  next_action: string;
  source_object_type?: ObjectType;
  source_object_id?: EntityId;
};

export type WorkbenchTaskActivity = {
  id: EntityId;
  task_id: EntityId;
  event: string;
  actor_role: RoleCode;
  created_at: string;
};

export type OkrObjective = {
  id: EntityId;
  title: string;
  owner_role: RoleCode;
  period: string;
  status: "on_track" | "at_risk" | "behind" | "completed";
  target_value: number;
  current_value: number;
  unit: string;
  confidence: "high" | "medium" | "low";
};

export type ReadinessTargetField = "technical_live_status" | "commercial_test_status" | "sales_scale_status";

export type AuditEvent = {
  id: string;
  actorUserId: UserId;
  action: string;
  objectType: ObjectType;
  objectId?: EntityId;
  allowed: boolean;
  reasonCode: string;
  createdAt: string;
};

export type ModuleBusinessEvent = {
  id: string;
  eventCode: string;
  objectType: ObjectType;
  objectId: EntityId;
  ownerRole?: RoleCode;
  createdAt: string;
  payload?: Record<string, unknown>;
};

export type MediaWorkflowState = {
  publishers: Publisher[];
  publisherContacts: PublisherContact[];
  publisherAdSlots: PublisherAdSlot[];
  publisherContractTerms: PublisherContractTerm[];
  integrationProjects: IntegrationProject[];
  commercialTests: CommercialTest[];
  mediaEcosystemLeads: MediaEcosystemLead[];
  mediaOutreachActivities: MediaOutreachActivity[];
  trustedSupplyCandidates: TrustedSupplyCandidate[];
  diagnosticCases: DiagnosticCase[];
  diagnosticEvidence: DiagnosticEvidence[];
  diagnosticActivities: DiagnosticActivity[];
  auditEvents: AuditEvent[];
  businessEvents: ModuleBusinessEvent[];
};

export type SalesWorkflowState = {
  advertisers: Advertiser[];
  advertiserContacts: AdvertiserContact[];
  opportunities: Opportunity[];
  proposals: Proposal[];
  proposalMediaSelections: ProposalMediaSelection[];
  campaigns: Campaign[];
  campaignMediaAllocations: CampaignMediaAllocation[];
  auditEvents: AuditEvent[];
  businessEvents: ModuleBusinessEvent[];
};

export type FinanceWorkflowState = {
  settlements: Settlement[];
  settlementActivities: SettlementActivity[];
  auditEvents: AuditEvent[];
  businessEvents: ModuleBusinessEvent[];
};

export type ContractWorkflowState = {
  contracts: BusinessContract[];
  contractActivities: ContractActivity[];
  auditEvents: AuditEvent[];
  businessEvents: ModuleBusinessEvent[];
};

export type GuideWorkflowState = {
  sopCards: SopCard[];
  sopActivities: SopActivity[];
  auditEvents: AuditEvent[];
  businessEvents: ModuleBusinessEvent[];
};

export type WorkbenchWorkflowState = {
  tasks: WorkbenchTask[];
  taskActivities: WorkbenchTaskActivity[];
  okrObjectives: OkrObjective[];
  auditEvents: AuditEvent[];
  businessEvents: ModuleBusinessEvent[];
};
