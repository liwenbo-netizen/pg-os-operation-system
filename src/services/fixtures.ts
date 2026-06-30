import type {
  Campaign,
  CampaignMediaAllocation,
  Advertiser,
  AdvertiserContact,
  BusinessContract,
  CommercialTest,
  ContractActivity,
  DiagnosticActivity,
  DiagnosticCase,
  DiagnosticEvidence,
  IntegrationProject,
  Proposal,
  ProposalMediaSelection,
  Publisher,
  PublisherAdSlot,
  PublisherContact,
  PublisherContractTerm,
  Settlement,
  SettlementActivity,
  SopActivity,
  SopCard,
  Opportunity,
  OkrObjective,
  WorkbenchTask,
  WorkbenchTaskActivity
} from "../types/domain";

export const fixturePublishers: Publisher[] = [
  {
    id: "publisher-233",
    name: "233",
    region: "CN",
    media_type: "App",
    integration_type: "SDK",
    technical_live_status: "technical_live_passed",
    commercial_test_status: "test_passed",
    sales_scale_status: "scale_ready",
    risk_level: "low",
    daily_active_users: 3200000,
    daily_requests: 18000000
  },
  {
    id: "publisher-quzhi",
    name: "QuZhi Campus",
    region: "CN",
    media_type: "App",
    integration_type: "API",
    technical_live_status: "technical_live_passed",
    commercial_test_status: "testing",
    sales_scale_status: "limited_sellable",
    risk_level: "medium",
    daily_active_users: 1100000,
    daily_requests: 6000000
  },
  {
    id: "publisher-lofter",
    name: "LOFTER",
    region: "CN",
    media_type: "App",
    integration_type: "API",
    technical_live_status: "technical_live_passed",
    commercial_test_status: "test_passed",
    sales_scale_status: "proposal_selectable",
    risk_level: "high",
    daily_active_users: 5000000,
    daily_requests: 22000000
  },
  {
    id: "publisher-new-ctv",
    name: "New CTV Partner",
    region: "CN",
    media_type: "CTV",
    integration_type: "VAST",
    technical_live_status: "in_integration",
    commercial_test_status: "not_started",
    sales_scale_status: "not_allowed",
    risk_level: "medium",
    daily_requests: 1000000
  }
];

export const fixturePublisherContacts: PublisherContact[] = [
  {
    id: "contact-233-primary",
    publisher_id: "publisher-233",
    name: "Zhang Wei",
    role_title: "Supply Lead",
    email: "supply.233@pgos.local",
    is_primary: true
  },
  {
    id: "contact-new-ctv-primary",
    publisher_id: "publisher-new-ctv",
    name: "Chen Yu",
    role_title: "CTV Partnership",
    email: "ctv.partner@pgos.local",
    is_primary: true
  }
];

export const fixturePublisherAdSlots: PublisherAdSlot[] = [
  {
    id: "slot-233-feed",
    publisher_id: "publisher-233",
    slot_name: "Feed Native Video",
    ad_format: "Video",
    placement_type: "Feed",
    floor_price: 18,
    daily_requests: 12000000,
    status: "active"
  },
  {
    id: "slot-new-ctv-preroll",
    publisher_id: "publisher-new-ctv",
    slot_name: "CTV Pre-roll",
    ad_format: "VAST",
    placement_type: "CTV",
    floor_price: 32,
    daily_requests: 1000000,
    status: "active"
  }
];

export const fixturePublisherContractTerms: PublisherContractTerm[] = [
  {
    id: "term-233-standard",
    publisher_id: "publisher-233",
    contract_type: "Framework",
    billing_model: "CPM",
    settlement_cycle: "Monthly",
    payment_terms: "Net 30",
    revenue_share: 0.68
  },
  {
    id: "term-new-ctv-draft",
    publisher_id: "publisher-new-ctv",
    contract_type: "Trial",
    billing_model: "CPM",
    settlement_cycle: "Monthly",
    payment_terms: "Net 45",
    revenue_share: 0.62
  }
];

export const fixtureIntegrationProjects: IntegrationProject[] = [
  {
    id: "integration-233-sdk",
    publisher_id: "publisher-233",
    integration_type: "SDK",
    status: "technical_live_passed",
    checklist: {
      sdk_configured: true,
      callback_verified: true,
      production_logs_checked: true
    },
    notes: "Production traffic verified."
  },
  {
    id: "integration-new-ctv-vast",
    publisher_id: "publisher-new-ctv",
    integration_type: "VAST",
    status: "in_integration",
    checklist: {
      vast_tag_received: true,
      callback_verified: false,
      production_logs_checked: false
    },
    notes: "Waiting callback proof from publisher."
  }
];

export const fixtureCommercialTests: CommercialTest[] = [
  {
    id: "test-233-scale",
    publisher_id: "publisher-233",
    test_name: "Scale readiness validation",
    status: "test_passed",
    target_budget: 500,
    spend: 486,
    fill_rate: 0.62,
    clear_rate: 0.72,
    ivt_rate: 0.018,
    result_summary: "Stable delivery and clean traffic."
  },
  {
    id: "test-quzhi-limited",
    publisher_id: "publisher-quzhi",
    test_name: "DY Wellness limited test",
    status: "testing",
    target_budget: 500,
    spend: 186,
    fill_rate: 0.42,
    clear_rate: 0.51,
    ivt_rate: 0.032,
    result_summary: "Monitoring fill rate before final conclusion."
  }
];

export const fixtureProposals: Proposal[] = [
  {
    id: "proposal-daily-yoga",
    opportunity_id: "opportunity-daily-yoga-q3",
    name: "Daily Yoga Q3 Proposal",
    status: "internal_review",
    budget: 20000,
    selectedPublisherIds: ["publisher-233"]
  },
  {
    id: "proposal-blocked",
    opportunity_id: "opportunity-ctv-test",
    name: "Blocked Media Proposal",
    status: "media_validation",
    budget: 18000,
    selectedPublisherIds: ["publisher-new-ctv"]
  }
];

export const fixtureAdvertisers: Advertiser[] = [
  {
    id: "advertiser-daily-yoga",
    name: "Daily Yoga",
    industry: "Wellness",
    region: "CN",
    status: "active"
  },
  {
    id: "advertiser-game-studio-a",
    name: "Game Studio A",
    industry: "Gaming",
    region: "CN",
    status: "active"
  },
  {
    id: "advertiser-travel-brand-b",
    name: "Travel Brand B",
    industry: "Travel",
    region: "CN",
    status: "active"
  }
];

export const fixtureAdvertiserContacts: AdvertiserContact[] = [
  {
    id: "contact-daily-yoga-cmo",
    advertiser_id: "advertiser-daily-yoga",
    name: "Liu Fang",
    role_title: "Growth Lead",
    email: "growth.dailyyoga@pgos.local",
    is_primary: true
  }
];

export const fixtureOpportunities: Opportunity[] = [
  {
    id: "opportunity-daily-yoga-q3",
    advertiser_id: "advertiser-daily-yoga",
    name: "Daily Yoga Q3 user growth",
    stage: "proposal_drafting",
    expected_budget: 20000,
    pain_points: ["Need stable wellness audience reach", "Avoid low clear-rate supply"]
  },
  {
    id: "opportunity-ctv-test",
    advertiser_id: "advertiser-travel-brand-b",
    name: "Travel Brand CTV trial",
    stage: "need_confirmed",
    expected_budget: 18000,
    pain_points: ["CTV inventory quality unknown", "Requires launch guard"]
  }
];

export const fixtureProposalMediaSelections: ProposalMediaSelection[] = [
  {
    id: "proposal-selection-233",
    proposal_id: "proposal-daily-yoga",
    publisher_id: "publisher-233",
    guard_status: "allowed",
    guard_reason: "PROPOSAL_PUBLISHER_ALLOWED",
    planned_budget: 12000
  }
];

export const fixtureCampaigns: Campaign[] = [
  {
    id: "campaign-ready",
    proposal_id: "proposal-daily-yoga",
    advertiser_id: "advertiser-daily-yoga",
    name: "Daily Yoga Launch",
    status: "launch_check",
    publisherIds: ["publisher-233"],
    launchChecklistPassed: true
  },
  {
    id: "campaign-blocked",
    proposal_id: "proposal-blocked",
    advertiser_id: "advertiser-travel-brand-b",
    name: "CTV Launch Attempt",
    status: "launch_check",
    publisherIds: ["publisher-new-ctv"],
    launchChecklistPassed: true
  },
  {
    id: "campaign-checklist-open",
    proposal_id: "proposal-daily-yoga",
    advertiser_id: "advertiser-daily-yoga",
    name: "Checklist Incomplete",
    status: "launch_check",
    publisherIds: ["publisher-233"],
    launchChecklistPassed: false
  }
];

export const fixtureCampaignMediaAllocations: CampaignMediaAllocation[] = [
  {
    id: "campaign-allocation-233",
    campaign_id: "campaign-ready",
    publisher_id: "publisher-233",
    guard_status: "allowed",
    guard_reason: "CAMPAIGN_LAUNCH_ALLOWED",
    allocation_budget: 12000
  },
  {
    id: "campaign-allocation-new-ctv",
    campaign_id: "campaign-blocked",
    publisher_id: "publisher-new-ctv",
    guard_status: "blocked",
    guard_reason: "TECHNICAL_NOT_LIVE",
    allocation_budget: 8000
  }
];

export const fixtureDiagnosticCases: DiagnosticCase[] = [
  {
    id: "diagnostic-dc-001",
    case_no: "DC-001",
    case_type: "clear_rate_low",
    publisher_id: "publisher-lofter",
    status: "evidence_collection",
    severity: "high",
    owner_role: "data_analyst",
    affected_campaign_count: 3,
    current_blocker: "Clear rate dropped below launch threshold for LOFTER traffic.",
    next_action: "Collect bid funnel evidence and submit root cause.",
    is_blocking_sales_scale: true,
    is_blocking_settlement: false
  },
  {
    id: "diagnostic-dc-002",
    case_no: "DC-002",
    case_type: "fill_rate_low",
    publisher_id: "publisher-quzhi",
    status: "root_cause_analysis",
    severity: "medium",
    owner_role: "adops_manager",
    affected_campaign_count: 1,
    current_blocker: "Fill rate variance needs AdOps and publisher review.",
    next_action: "Confirm whether floor price change caused the fill drop.",
    is_blocking_sales_scale: false,
    is_blocking_settlement: false
  },
  {
    id: "diagnostic-dc-003",
    case_no: "DC-003",
    case_type: "settlement_dispute",
    publisher_id: "publisher-233",
    settlement_id: "settlement-disputed",
    status: "action_required",
    severity: "critical",
    owner_role: "finance_manager",
    affected_campaign_count: 1,
    current_blocker: "Settlement amount mismatch is unresolved.",
    next_action: "Attach reconciliation file and submit conclusion before finance confirmation.",
    is_blocking_sales_scale: false,
    is_blocking_settlement: true
  },
  {
    id: "diagnostic-dc-004",
    case_no: "DC-004",
    case_type: "callback_missing",
    publisher_id: "publisher-233",
    status: "conclusion_ready",
    severity: "medium",
    owner_role: "integration_manager",
    affected_campaign_count: 0,
    current_blocker: "Callback gap has a prepared conclusion.",
    next_action: "Close the diagnostic case.",
    root_cause: "Callback retry window was misconfigured during SDK release.",
    responsibility_owner: "integration_manager",
    conclusion: "Production callback logs are stable after retry window correction.",
    follow_up_action: "Add callback retry checklist to the integration SOP.",
    is_blocking_sales_scale: false,
    is_blocking_settlement: false
  }
];

export const fixtureDiagnosticEvidence: DiagnosticEvidence[] = [
  {
    id: "evidence-dc-001-clear-rate",
    diagnostic_case_id: "diagnostic-dc-001",
    title: "Clear rate fell from 71% to 42%",
    evidence_type: "funnel_metric",
    source: "Campaign funnel monitor",
    metric_name: "clear_rate",
    baseline_value: 0.71,
    current_value: 0.42,
    status: "accepted"
  },
  {
    id: "evidence-dc-001-bid-log",
    diagnostic_case_id: "diagnostic-dc-001",
    title: "Bid logs show timeout spike after 20:00",
    evidence_type: "log_sample",
    source: "AdOps log export",
    metric_name: "timeout_rate",
    baseline_value: 0.03,
    current_value: 0.19,
    status: "collected"
  },
  {
    id: "evidence-dc-003-recon",
    diagnostic_case_id: "diagnostic-dc-003",
    title: "Publisher invoice exceeds reconciled delivery",
    evidence_type: "settlement_file",
    source: "Finance reconciliation workbook",
    metric_name: "settlement_delta",
    baseline_value: 0,
    current_value: 1840,
    status: "needs_review"
  },
  {
    id: "evidence-dc-004-callback",
    diagnostic_case_id: "diagnostic-dc-004",
    title: "Callback retry evidence accepted",
    evidence_type: "log_sample",
    source: "Integration production logs",
    metric_name: "callback_success_rate",
    baseline_value: 0.94,
    current_value: 0.995,
    status: "accepted"
  }
];

export const fixtureDiagnosticActivities: DiagnosticActivity[] = [
  {
    id: "activity-dc-001-opened",
    diagnostic_case_id: "diagnostic-dc-001",
    event: "Case opened from clear-rate anomaly.",
    actor_role: "data_analyst",
    created_at: "2026-06-25T09:00:00.000Z"
  },
  {
    id: "activity-dc-001-evidence",
    diagnostic_case_id: "diagnostic-dc-001",
    event: "Funnel evidence attached.",
    actor_role: "adops_manager",
    created_at: "2026-06-25T11:30:00.000Z"
  },
  {
    id: "activity-dc-003-opened",
    diagnostic_case_id: "diagnostic-dc-003",
    event: "Settlement dispute linked to finance confirmation.",
    actor_role: "finance_manager",
    created_at: "2026-06-26T07:15:00.000Z"
  },
  {
    id: "activity-dc-004-conclusion",
    diagnostic_case_id: "diagnostic-dc-004",
    event: "Conclusion prepared for callback gap.",
    actor_role: "integration_manager",
    created_at: "2026-06-26T14:40:00.000Z"
  }
];

export const fixtureSettlements: Settlement[] = [
  {
    id: "settlement-clean",
    campaign_id: "campaign-ready",
    publisher_id: "publisher-233",
    status: "pending_review",
    reconciliationCompleted: true,
    currency: "USD",
    gross_amount: 12840,
    payable_amount: 8731,
    adjustment_amount: 0,
    reconciliation_delta: 0,
    due_date: "2026-07-15"
  },
  {
    id: "settlement-disputed",
    campaign_id: "campaign-ready",
    publisher_id: "publisher-233",
    status: "exception_review",
    reconciliationCompleted: true,
    currency: "USD",
    gross_amount: 11800,
    payable_amount: 8024,
    adjustment_amount: -1840,
    reconciliation_delta: 1840,
    due_date: "2026-07-18"
  },
  {
    id: "settlement-unreconciled",
    campaign_id: "campaign-ready",
    publisher_id: "publisher-233",
    status: "reconciling",
    reconciliationCompleted: false,
    currency: "USD",
    gross_amount: 9200,
    payable_amount: 6256,
    adjustment_amount: 0,
    reconciliation_delta: 420,
    due_date: "2026-07-20"
  }
];

export const fixtureSettlementActivities: SettlementActivity[] = [
  {
    id: "settlement-activity-clean-reconciled",
    settlement_id: "settlement-clean",
    event: "Reconciliation completed and ready for finance confirmation.",
    actor_role: "finance_manager",
    created_at: "2026-06-26T10:20:00.000Z"
  },
  {
    id: "settlement-activity-disputed-exception",
    settlement_id: "settlement-disputed",
    event: "Exception review opened because publisher invoice exceeded delivery.",
    actor_role: "finance_manager",
    created_at: "2026-06-26T12:00:00.000Z"
  },
  {
    id: "settlement-activity-unreconciled-started",
    settlement_id: "settlement-unreconciled",
    event: "Settlement reconciliation started.",
    actor_role: "operations_director",
    created_at: "2026-06-27T09:00:00.000Z"
  }
];

export const fixtureContracts: BusinessContract[] = [
  {
    id: "contract-233-framework",
    contract_no: "CON-001",
    contract_type: "publisher_framework",
    counterparty_name: "233",
    publisher_id: "publisher-233",
    status: "legal_review",
    owner_role: "legal_manager",
    requested_by_role: "media_director",
    risk_level: "medium",
    currency: "USD",
    value_amount: 8731,
    effective_date: "2026-07-01",
    expiration_date: "2027-06-30",
    blocker: "Data processing clause needs Legal approval.",
    next_action: "Approve legal review or send redline."
  },
  {
    id: "contract-daily-yoga-msa",
    contract_no: "CON-002",
    contract_type: "advertiser_msa",
    counterparty_name: "Daily Yoga",
    advertiser_id: "advertiser-daily-yoga",
    status: "finance_review",
    owner_role: "legal_manager",
    requested_by_role: "sales_director",
    risk_level: "low",
    currency: "USD",
    value_amount: 20000,
    effective_date: "2026-07-01",
    expiration_date: "2026-09-30",
    blocker: "Finance needs to verify payment terms.",
    next_action: "Finance review payment terms."
  },
  {
    id: "contract-settlement-side-letter",
    contract_no: "CON-003",
    contract_type: "settlement_side_letter",
    counterparty_name: "233",
    publisher_id: "publisher-233",
    settlement_id: "settlement-disputed",
    status: "redline",
    owner_role: "legal_manager",
    requested_by_role: "finance_manager",
    risk_level: "high",
    currency: "USD",
    value_amount: 8024,
    effective_date: "2026-07-18",
    blocker: "Settlement dispute adjustment needs counterparty acceptance.",
    next_action: "Resolve redline before signing.",
    finance_notes: "Adjustment amount must match final settlement confirmation."
  },
  {
    id: "contract-signed-archive",
    contract_no: "CON-004",
    contract_type: "publisher_framework",
    counterparty_name: "LOFTER",
    publisher_id: "publisher-lofter",
    status: "signed",
    owner_role: "legal_manager",
    requested_by_role: "media_director",
    risk_level: "medium",
    currency: "USD",
    value_amount: 15000,
    effective_date: "2026-06-15",
    expiration_date: "2027-06-14",
    next_action: "Archive signed contract.",
    signed_at: "2026-06-20T10:00:00.000Z"
  }
];

export const fixtureContractActivities: ContractActivity[] = [
  {
    id: "contract-activity-233-created",
    contract_id: "contract-233-framework",
    event: "Media requested publisher framework review.",
    actor_role: "media_director",
    created_at: "2026-06-26T09:00:00.000Z"
  },
  {
    id: "contract-activity-dy-finance",
    contract_id: "contract-daily-yoga-msa",
    event: "Finance review requested for payment terms.",
    actor_role: "legal_manager",
    created_at: "2026-06-26T12:30:00.000Z"
  },
  {
    id: "contract-activity-side-letter-redline",
    contract_id: "contract-settlement-side-letter",
    event: "Counterparty redline recorded for settlement side letter.",
    actor_role: "legal_manager",
    created_at: "2026-06-27T15:00:00.000Z"
  },
  {
    id: "contract-activity-lofter-signed",
    contract_id: "contract-signed-archive",
    event: "Signed contract received from LOFTER.",
    actor_role: "legal_manager",
    created_at: "2026-06-20T10:10:00.000Z"
  }
];

const allBusinessRoles = [
  "ceo",
  "operations_director",
  "sales_director",
  "sales_manager",
  "media_director",
  "media_manager",
  "adops_manager",
  "integration_manager",
  "data_analyst",
  "finance_manager",
  "legal_manager",
  "customer_success_manager",
  "product_owner",
  "audit_viewer"
] as const;

export const fixtureSopCards: SopCard[] = [
  {
    id: "sop-media-scale-readiness",
    title: "Approve publisher scale readiness",
    module: "Media",
    scenario: "Publisher readiness",
    owner_role: "media_director",
    visible_roles: ["media_director", "media_manager", "integration_manager", "adops_manager", "operations_director", "audit_viewer"],
    status: "published",
    priority: "P0",
    summary: "Use this SOP before moving a publisher to scale_ready.",
    steps: [
      "Confirm technical_live_passed and commercial test_passed.",
      "Check open blocking diagnostic cases.",
      "Approve sales scale readiness only when guard returns allowed."
    ],
    related_route: "/media/director-command-center",
    related_service: "PublisherReadinessService",
    version: 2,
    updated_at: "2026-06-25T10:00:00.000Z"
  },
  {
    id: "sop-diagnostic-conclusion",
    title: "Submit diagnostic conclusion",
    module: "Diagnostics",
    scenario: "Quality diagnostic case",
    owner_role: "data_analyst",
    visible_roles: ["data_analyst", "adops_manager", "media_director", "finance_manager", "operations_director", "audit_viewer"],
    status: "published",
    priority: "P0",
    summary: "Evidence, root cause, responsibility, conclusion, and follow-up action required before closure.",
    steps: [
      "Attach at least one accepted evidence item.",
      "Move case to root cause analysis.",
      "Submit conclusion and close only after conclusion_ready."
    ],
    related_route: "/diagnostics/:id",
    related_service: "DiagnosticCaseService",
    version: 1,
    updated_at: "2026-06-26T09:00:00.000Z"
  },
  {
    id: "sop-finance-settlement-confirm",
    title: "Confirm settlement after reconciliation",
    module: "Finance",
    scenario: "Settlement confirmation",
    owner_role: "finance_manager",
    visible_roles: ["finance_manager", "operations_director", "ceo", "audit_viewer"],
    status: "published",
    priority: "P0",
    summary: "Finance confirmation requires reconciliation complete and no open settlement dispute diagnostic case.",
    steps: [
      "Complete reconciliation and review adjustment amount.",
      "Resolve open settlement dispute diagnostic cases.",
      "Confirm settlement, issue invoice, and mark paid after payment proof."
    ],
    related_route: "/finance/settlements/:id",
    related_service: "FinanceSettlementService",
    version: 1,
    updated_at: "2026-06-27T10:00:00.000Z"
  },
  {
    id: "sop-contract-signing",
    title: "Sign and archive legal contract",
    module: "Contracts",
    scenario: "Contract signing",
    owner_role: "legal_manager",
    visible_roles: ["legal_manager", "finance_manager", "operations_director", "ceo", "audit_viewer"],
    status: "published",
    priority: "P1",
    summary: "Legal signing requires approved contract and no unresolved settlement dispute for side letters.",
    steps: [
      "Complete legal review and finance terms review when required.",
      "Confirm no linked settlement dispute remains open.",
      "Mark signed and archive the signed contract."
    ],
    related_route: "/contracts/:id",
    related_service: "ContractService",
    version: 1,
    updated_at: "2026-06-28T10:00:00.000Z"
  },
  {
    id: "sop-proposal-media-selection",
    title: "Validate proposal media selection",
    module: "Sales",
    scenario: "Proposal media recommendation",
    owner_role: "sales_manager",
    visible_roles: ["sales_manager", "sales_director", "operations_director", "audit_viewer"],
    status: "published",
    priority: "P1",
    summary: "Proposal media must be checked against publisher readiness and diagnostic blockers.",
    steps: [
      "Select publishers through proposal media validation.",
      "Treat warning publishers as limited sellable.",
      "Submit proposal approval only when blocked media is removed."
    ],
    related_route: "/proposals/:id/wizard",
    related_service: "ProposalService",
    version: 1,
    updated_at: "2026-06-25T12:00:00.000Z"
  },
  {
    id: "sop-common-rbac",
    title: "Role and approval boundaries",
    module: "Common",
    scenario: "RBAC and audit",
    owner_role: "product_owner",
    visible_roles: [...allBusinessRoles],
    status: "published",
    priority: "Reference",
    summary: "Business approval roles are separate from system administration and audit viewing.",
    steps: [
      "Use active role permissions for route access.",
      "Do not let system_admin approve business objects.",
      "Keep audit_viewer read-only."
    ],
    related_route: "/workbench",
    related_service: "RbacService",
    version: 3,
    updated_at: "2026-06-24T08:00:00.000Z"
  }
];

export const fixtureSopActivities: SopActivity[] = [
  {
    id: "sop-activity-media-published",
    sop_card_id: "sop-media-scale-readiness",
    event: "SOP published for publisher readiness approval.",
    actor_role: "product_owner",
    created_at: "2026-06-25T10:00:00.000Z"
  },
  {
    id: "sop-activity-finance-published",
    sop_card_id: "sop-finance-settlement-confirm",
    event: "Finance settlement SOP published after Phase 7.",
    actor_role: "product_owner",
    created_at: "2026-06-27T10:00:00.000Z"
  },
  {
    id: "sop-activity-contract-published",
    sop_card_id: "sop-contract-signing",
    event: "Contract signing SOP published after Phase 8.",
    actor_role: "product_owner",
    created_at: "2026-06-28T10:00:00.000Z"
  }
];

export const fixtureWorkbenchTasks: WorkbenchTask[] = [
  {
    id: "task-scale-lofter-diagnostic",
    title: "Resolve LOFTER scale blocker",
    module: "Diagnostics",
    owner_role: "data_analyst",
    related_route: "/diagnostics/:id",
    priority: "P0",
    status: "open",
    due_date: "2026-06-30",
    blocker: "Open diagnostic case DC-001 blocks scale readiness.",
    next_action: "Submit root cause and conclusion.",
    source_object_type: "diagnostic_case",
    source_object_id: "diagnostic-dc-001"
  },
  {
    id: "task-settlement-dispute",
    title: "Close settlement dispute before finance confirmation",
    module: "Finance",
    owner_role: "finance_manager",
    related_route: "/finance/settlements/:id",
    priority: "P0",
    status: "blocked",
    due_date: "2026-07-01",
    blocker: "Settlement dispute diagnostic case DC-003 is still open.",
    next_action: "Resolve diagnostic conclusion and confirm settlement.",
    source_object_type: "settlement",
    source_object_id: "settlement-disputed"
  },
  {
    id: "task-proposal-approval",
    title: "Approve Daily Yoga proposal",
    module: "Sales",
    owner_role: "sales_director",
    related_route: "/proposals/:id/wizard",
    priority: "P1",
    status: "open",
    due_date: "2026-06-30",
    next_action: "Review selected publisher readiness and approve proposal.",
    source_object_type: "proposal",
    source_object_id: "proposal-daily-yoga"
  },
  {
    id: "task-contract-review",
    title: "Approve 233 framework contract review",
    module: "Contracts",
    owner_role: "legal_manager",
    related_route: "/contracts/:id",
    priority: "P1",
    status: "open",
    due_date: "2026-07-02",
    blocker: "Data processing clause needs Legal approval.",
    next_action: "Approve legal review or send redline.",
    source_object_type: "contract",
    source_object_id: "contract-233-framework"
  },
  {
    id: "task-sop-maintenance",
    title: "Publish launch escalation SOP",
    module: "Guide",
    owner_role: "product_owner",
    related_route: "/guide",
    priority: "P2",
    status: "open",
    due_date: "2026-07-05",
    next_action: "Review role visibility and publish SOP update.",
    source_object_type: "route",
    source_object_id: "sop-campaign-launch-escalation"
  }
];

export const fixtureWorkbenchTaskActivities: WorkbenchTaskActivity[] = [
  {
    id: "task-activity-scale-created",
    task_id: "task-scale-lofter-diagnostic",
    event: "Task created from blocking diagnostic case.",
    actor_role: "operations_director",
    created_at: "2026-06-25T13:00:00.000Z"
  },
  {
    id: "task-activity-settlement-blocked",
    task_id: "task-settlement-dispute",
    event: "Task blocked by unresolved settlement dispute.",
    actor_role: "finance_manager",
    created_at: "2026-06-26T13:00:00.000Z"
  }
];

export const fixtureOkrObjectives: OkrObjective[] = [
  {
    id: "okr-scale-ready-publishers",
    title: "Increase scale-ready publisher supply",
    owner_role: "media_director",
    period: "2026-Q3",
    status: "at_risk",
    target_value: 20,
    current_value: 13,
    unit: "publishers",
    confidence: "medium"
  },
  {
    id: "okr-clean-launches",
    title: "Raise clean campaign launch rate",
    owner_role: "operations_director",
    period: "2026-Q3",
    status: "on_track",
    target_value: 95,
    current_value: 88,
    unit: "%",
    confidence: "medium"
  },
  {
    id: "okr-settlement-cycle",
    title: "Reduce settlement confirmation cycle",
    owner_role: "finance_manager",
    period: "2026-Q3",
    status: "behind",
    target_value: 5,
    current_value: 8,
    unit: "days",
    confidence: "low"
  },
  {
    id: "okr-sop-coverage",
    title: "Publish SOP coverage for P0 workflows",
    owner_role: "product_owner",
    period: "2026-Q3",
    status: "on_track",
    target_value: 12,
    current_value: 6,
    unit: "SOP cards",
    confidence: "high"
  }
];

export const fixtureRepository = {
  advertisers: fixtureAdvertisers,
  advertiserContacts: fixtureAdvertiserContacts,
  opportunities: fixtureOpportunities,
  publishers: fixturePublishers,
  publisherContacts: fixturePublisherContacts,
  publisherAdSlots: fixturePublisherAdSlots,
  publisherContractTerms: fixturePublisherContractTerms,
  integrationProjects: fixtureIntegrationProjects,
  commercialTests: fixtureCommercialTests,
  proposals: fixtureProposals,
  proposalMediaSelections: fixtureProposalMediaSelections,
  campaigns: fixtureCampaigns,
  campaignMediaAllocations: fixtureCampaignMediaAllocations,
  diagnosticCases: fixtureDiagnosticCases,
  diagnosticEvidence: fixtureDiagnosticEvidence,
  diagnosticActivities: fixtureDiagnosticActivities,
  settlements: fixtureSettlements,
  settlementActivities: fixtureSettlementActivities,
  contracts: fixtureContracts,
  contractActivities: fixtureContractActivities,
  sopCards: fixtureSopCards,
  sopActivities: fixtureSopActivities,
  workbenchTasks: fixtureWorkbenchTasks,
  workbenchTaskActivities: fixtureWorkbenchTaskActivities,
  okrObjectives: fixtureOkrObjectives
};
