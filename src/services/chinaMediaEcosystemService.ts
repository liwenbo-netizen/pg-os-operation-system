import type {
  AuditEvent,
  BusinessUser,
  EntityId,
  IntegrationProject,
  MediaEcosystemLead,
  MediaEcosystemPriorityScore,
  MediaEcosystemTrack,
  MediaExpansionStage,
  MediaOutreachActivity,
  MediaWorkflowState,
  ModuleBusinessEvent,
  ObjectType,
  Publisher,
  TrustedSupplyCandidate
} from "../types/domain";
import type { GuardResult } from "../types/guards";
import { auditService } from "./auditService";
import { rbacService } from "./rbacService";

type WorkflowResult = {
  state: MediaWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

type TrackOpportunity = {
  track: MediaEcosystemTrack;
  leads: number;
  activeLeads: number;
  averageScore: number;
  highestScore: number;
  trustedCandidates: number;
  gapLevel: "covered" | "watch" | "gap";
  nextAction: string;
};

type EligibilityResult = {
  eligible: boolean;
  blockers: string[];
};

const priorityScoreCaps: MediaEcosystemPriorityScore = {
  strategic_value: 20,
  user_scale_growth: 15,
  ad_scenario_value: 15,
  programmatic_feasibility: 15,
  advertiser_demand_match: 15,
  commercial_negotiability: 10,
  risk_compliance_control: 10
};

export const mediaEcosystemTrackLabels: Record<MediaEcosystemTrack, string> = {
  VIDEO_LONG_FORM: "Video long form",
  SHORT_VIDEO_LIVE: "Short video live",
  NEWS_SEARCH_BROWSER: "News search browser",
  SOCIAL_COMMUNITY: "Social community",
  ECOMMERCE_RETAIL_MEDIA: "Ecommerce retail media",
  LOCAL_LIFE_TRAVEL: "Local life travel",
  GAME_H5_IAA: "Game H5 IAA",
  WELLNESS_FEMALE_HEALTH: "Wellness female health",
  UTILITY_TOOLS: "Utility tools",
  CTV_OTT_OEM: "CTV OTT OEM",
  SMART_HARDWARE: "Smart hardware",
  AUDIO_PODCAST: "Audio podcast",
  CAMPUS_YOUTH: "Campus youth",
  OUTDOOR_DOOH: "Outdoor DOOH",
  AI_APP_CONTENT: "AI app content",
  OTHER_VERTICAL: "Other vertical"
};

const strategicTracks: MediaEcosystemTrack[] = [
  "SOCIAL_COMMUNITY",
  "CTV_OTT_OEM",
  "WELLNESS_FEMALE_HEALTH",
  "ECOMMERCE_RETAIL_MEDIA",
  "SHORT_VIDEO_LIVE"
];

function allowed(message: string, reasonCode: string): GuardResult {
  return {
    allowed: true,
    severity: "info",
    reason_code: reasonCode,
    message,
    audit_required: true
  };
}

function warning(message: string, reasonCode: string): GuardResult {
  return {
    allowed: true,
    severity: "warning",
    reason_code: reasonCode,
    message,
    audit_required: true
  };
}

function blocked(message: string, reasonCode: string, requiredApprovalRole?: string): GuardResult {
  return {
    allowed: false,
    severity: "blocked",
    reason_code: reasonCode,
    message,
    required_approval_role: requiredApprovalRole,
    audit_required: true
  };
}

function clampScore(value: number, max: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(max, Math.round(value)));
}

function canManageEcosystem(user: BusinessUser) {
  return (
    rbacService.hasCapability(user, "publisher.manage") &&
    rbacService.hasAnyRole(user, ["media_manager", "media_director", "operations_director"])
  );
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
  state: MediaWorkflowState,
  user: BusinessUser,
  action: string,
  objectType: ObjectType,
  objectId: EntityId | undefined,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent
): MediaWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, objectType, guard, objectId);

  return {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };
}

function createActivity(leadId: EntityId, user: BusinessUser, event: string, notes?: string): MediaOutreachActivity {
  return {
    id: crypto.randomUUID(),
    lead_id: leadId,
    event,
    actor_role: user.activeRole,
    created_at: new Date().toISOString(),
    notes
  };
}

function findLead(state: MediaWorkflowState, leadId: EntityId) {
  return state.mediaEcosystemLeads.find((lead) => lead.id === leadId);
}

function updateLead(
  state: MediaWorkflowState,
  leadId: EntityId,
  patch: Partial<MediaEcosystemLead>,
  activity?: MediaOutreachActivity
): MediaWorkflowState {
  return {
    ...state,
    mediaEcosystemLeads: state.mediaEcosystemLeads.map((lead) =>
      lead.id === leadId
        ? {
            ...lead,
            ...patch,
            score_breakdown: patch.score_breakdown ? { ...patch.score_breakdown } : lead.score_breakdown
          }
        : lead
    ),
    mediaOutreachActivities: activity ? [activity, ...state.mediaOutreachActivities] : state.mediaOutreachActivities
  };
}

export class ChinaMediaEcosystemService {
  calculatePriorityScore(input: MediaEcosystemPriorityScore) {
    return Object.entries(priorityScoreCaps).reduce((total, [key, cap]) => {
      return total + clampScore(input[key as keyof MediaEcosystemPriorityScore], cap);
    }, 0);
  }

  evaluateTrustedSupplyEligibility(lead: MediaEcosystemLead): EligibilityResult {
    const blockers = [
      lead.priority_score >= 70 ? undefined : "priority_score_below_70",
      lead.media_contact_confirmed ? undefined : "media_contact_missing",
      lead.business_interest_confirmed ? undefined : "business_interest_missing",
      lead.ad_inventory_identified ? undefined : "ad_inventory_missing",
      lead.integration_feasibility !== "impossible" ? undefined : "integration_impossible"
    ].filter(Boolean) as string[];

    return {
      eligible: blockers.length === 0,
      blockers
    };
  }

  getSummary(state: MediaWorkflowState) {
    const activeLeads = state.mediaEcosystemLeads.filter((lead) => !["REJECTED", "ON_HOLD"].includes(lead.stage));
    const highPriority = state.mediaEcosystemLeads.filter((lead) => lead.priority_score >= 70);
    const outreachReady = state.mediaEcosystemLeads.filter((lead) =>
      ["OUTREACH_READY", "CONTACTED", "MEETING_SCHEDULED", "BUSINESS_QUALIFIED", "TECH_FEASIBILITY_CHECK"].includes(lead.stage)
    );
    const eligible = state.mediaEcosystemLeads.filter((lead) => this.evaluateTrustedSupplyEligibility(lead).eligible);

    return {
      totalLeads: state.mediaEcosystemLeads.length,
      activeLeads: activeLeads.length,
      highPriority: highPriority.length,
      outreachPipeline: outreachReady.length,
      eligibleForTrustedSupply: eligible.length,
      trustedCandidates: state.trustedSupplyCandidates.length
    };
  }

  getTrackOpportunities(state: MediaWorkflowState): TrackOpportunity[] {
    return strategicTracks.map((track) => {
      const leads = state.mediaEcosystemLeads.filter((lead) => lead.track === track);
      const activeLeads = leads.filter((lead) => !["REJECTED", "ON_HOLD"].includes(lead.stage));
      const trustedCandidates = state.trustedSupplyCandidates.filter((candidate) => candidate.track === track).length;
      const scores = leads.map((lead) => lead.priority_score);
      const highestScore = scores.length > 0 ? Math.max(...scores) : 0;
      const averageScore = scores.length > 0 ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length) : 0;
      const gapLevel = trustedCandidates > 0 ? "covered" : activeLeads.length > 0 && highestScore >= 70 ? "watch" : "gap";
      const nextAction =
        gapLevel === "covered"
          ? "Monitor candidate conversion quality."
          : gapLevel === "watch"
            ? "Push owner to confirm contact, interest, inventory, and feasibility."
            : "Map direct media targets before adding outreach workload.";

      return {
        track,
        leads: leads.length,
        activeLeads: activeLeads.length,
        averageScore,
        highestScore,
        trustedCandidates,
        gapLevel,
        nextAction
      };
    });
  }

  getPipeline(state: MediaWorkflowState) {
    const stages: MediaExpansionStage[] = [
      "ECOSYSTEM_MAPPED",
      "PRIORITY_SCREENED",
      "OUTREACH_READY",
      "CONTACTED",
      "MEETING_SCHEDULED",
      "BUSINESS_QUALIFIED",
      "TECH_FEASIBILITY_CHECK",
      "TRUSTED_SUPPLY_CANDIDATE",
      "ONBOARDING_PROJECT_CREATED",
      "ON_HOLD",
      "REJECTED"
    ];

    return stages.map((stage) => ({
      stage,
      count: state.mediaEcosystemLeads.filter((lead) => lead.stage === stage).length
    }));
  }

  scoreLeadPriority(state: MediaWorkflowState, user: BusinessUser, leadId: EntityId): WorkflowResult {
    const lead = findLead(state, leadId);
    if (!lead) {
      const guard = blocked("Media ecosystem lead was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "china_media_ecosystem.priority_screen", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (!canManageEcosystem(user)) {
      const guard = blocked("Current role cannot score China media ecosystem leads.", "ECOSYSTEM_MANAGE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "china_media_ecosystem.priority_screen", "media_ecosystem_lead", leadId, guard), guard };
    }

    const priorityScore = this.calculatePriorityScore(lead.score_breakdown);
    const nextStage = priorityScore >= 70 ? "OUTREACH_READY" : "PRIORITY_SCREENED";
    const activity = createActivity(
      leadId,
      user,
      `Priority screened with score ${priorityScore}.`,
      priorityScore >= 70 ? "Ready for accountable outreach." : "Needs stronger demand, feasibility, or contact proof."
    );
    const nextState = updateLead(state, leadId, {
      priority_score: priorityScore,
      stage: nextStage,
      next_action:
        priorityScore >= 70
          ? "Confirm media contact, business interest, inventory, and feasibility."
          : "Keep in opportunity pool until stronger direct expansion signal exists.",
      last_touch_at: activity.created_at
    }, activity);
    const guard =
      priorityScore >= 70
        ? allowed("Lead passed priority screening and is ready for outreach.", "ECOSYSTEM_PRIORITY_SCREENED")
        : warning("Lead remains in the opportunity pool until priority conditions improve.", "ECOSYSTEM_PRIORITY_WATCH");
    const businessEvent = createBusinessEvent("china_media_ecosystem.priority_screened", "media_ecosystem_lead", leadId, user.activeRole, {
      priorityScore,
      nextStage
    });
    const eventState = appendEvents(nextState, user, "china_media_ecosystem.priority_screen", "media_ecosystem_lead", leadId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  recordContacted(state: MediaWorkflowState, user: BusinessUser, leadId: EntityId): WorkflowResult {
    const lead = findLead(state, leadId);
    if (!lead) {
      const guard = blocked("Media ecosystem lead was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "china_media_ecosystem.contact", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (!canManageEcosystem(user)) {
      const guard = blocked("Current role cannot record media ecosystem outreach.", "ECOSYSTEM_MANAGE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "china_media_ecosystem.contact", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (lead.stage === "REJECTED" || lead.stage === "ON_HOLD") {
      const guard = blocked("Lead is not active for outreach.", "ECOSYSTEM_LEAD_NOT_ACTIVE");
      return { state: appendEvents(state, user, "china_media_ecosystem.contact", "media_ecosystem_lead", leadId, guard), guard };
    }

    const activity = createActivity(leadId, user, "Media contact confirmed and outreach recorded.");
    const nextState = updateLead(state, leadId, {
      stage: "CONTACTED",
      media_contact_confirmed: true,
      next_action: "Confirm business interest and inventory pack.",
      last_touch_at: activity.created_at
    }, activity);
    const guard = allowed("Media contact is confirmed and outreach is now traceable.", "ECOSYSTEM_CONTACTED");
    const businessEvent = createBusinessEvent("china_media_ecosystem.contacted", "media_ecosystem_lead", leadId, user.activeRole);
    const eventState = appendEvents(nextState, user, "china_media_ecosystem.contact", "media_ecosystem_lead", leadId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  qualifyBusinessReadiness(state: MediaWorkflowState, user: BusinessUser, leadId: EntityId): WorkflowResult {
    const lead = findLead(state, leadId);
    if (!lead) {
      const guard = blocked("Media ecosystem lead was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "china_media_ecosystem.business_qualify", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (!canManageEcosystem(user)) {
      const guard = blocked("Current role cannot qualify media ecosystem leads.", "ECOSYSTEM_MANAGE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "china_media_ecosystem.business_qualify", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (!lead.media_contact_confirmed) {
      const guard = blocked("Business qualification requires a confirmed media contact.", "MEDIA_CONTACT_REQUIRED");
      return { state: appendEvents(state, user, "china_media_ecosystem.business_qualify", "media_ecosystem_lead", leadId, guard), guard };
    }

    const nextFeasibility = lead.integration_feasibility === "unknown" ? "needs_work" : lead.integration_feasibility;
    const activity = createActivity(leadId, user, "Business interest and inventory identified.");
    const nextState = updateLead(state, leadId, {
      stage: "BUSINESS_QUALIFIED",
      business_interest_confirmed: true,
      ad_inventory_identified: true,
      integration_feasibility: nextFeasibility,
      next_action: "Create trusted supply candidate if score and feasibility gates pass.",
      last_touch_at: activity.created_at
    }, activity);
    const guard = allowed("Business interest and inventory are confirmed.", "ECOSYSTEM_BUSINESS_QUALIFIED");
    const businessEvent = createBusinessEvent("china_media_ecosystem.business_qualified", "media_ecosystem_lead", leadId, user.activeRole, {
      integrationFeasibility: nextFeasibility
    });
    const eventState = appendEvents(nextState, user, "china_media_ecosystem.business_qualify", "media_ecosystem_lead", leadId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  createTrustedSupplyCandidate(state: MediaWorkflowState, user: BusinessUser, leadId: EntityId): WorkflowResult {
    const lead = findLead(state, leadId);
    if (!lead) {
      const guard = blocked("Media ecosystem lead was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "china_media_ecosystem.trusted_candidate.create", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (!canManageEcosystem(user)) {
      const guard = blocked("Current role cannot create trusted supply candidates.", "ECOSYSTEM_MANAGE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "china_media_ecosystem.trusted_candidate.create", "media_ecosystem_lead", leadId, guard), guard };
    }

    const existing = state.trustedSupplyCandidates.find((candidate) => candidate.lead_id === leadId);
    if (existing) {
      const guard = warning("Trusted supply candidate already exists for this lead.", "TRUSTED_CANDIDATE_EXISTS");
      return { state: appendEvents(state, user, "china_media_ecosystem.trusted_candidate.create", "trusted_supply_candidate", existing.id, guard), guard };
    }

    const eligibility = this.evaluateTrustedSupplyEligibility(lead);
    if (!eligibility.eligible) {
      const guard = blocked(`Lead cannot enter trusted supply evaluation: ${eligibility.blockers.join(", ")}.`, "TRUSTED_SUPPLY_GATE_BLOCKED");
      return { state: appendEvents(state, user, "china_media_ecosystem.trusted_candidate.create", "media_ecosystem_lead", leadId, guard), guard };
    }

    const candidate: TrustedSupplyCandidate = {
      id: crypto.randomUUID(),
      lead_id: lead.id,
      media_name: lead.media_name,
      track: lead.track,
      priority_score: lead.priority_score,
      status: "candidate",
      owner_role: user.activeRole,
      created_at: new Date().toISOString(),
      evaluation_notes: "Entered trusted supply network evaluation. Candidate status is not a trusted approval."
    };
    const activity = createActivity(leadId, user, "Trusted supply candidate created.", candidate.evaluation_notes);
    const nextState = updateLead(
      {
        ...state,
        trustedSupplyCandidates: [candidate, ...state.trustedSupplyCandidates]
      },
      leadId,
      {
        stage: "TRUSTED_SUPPLY_CANDIDATE",
        next_action: "Run technical feasibility and onboarding readiness checks.",
        last_touch_at: activity.created_at
      },
      activity
    );
    const guard = allowed("Trusted supply candidate created for evaluation.", "TRUSTED_SUPPLY_CANDIDATE_CREATED");
    const businessEvent = createBusinessEvent("china_media_ecosystem.trusted_candidate_created", "trusted_supply_candidate", candidate.id, user.activeRole, {
      leadId,
      priorityScore: lead.priority_score,
      track: lead.track
    });
    const eventState = appendEvents(nextState, user, "china_media_ecosystem.trusted_candidate.create", "trusted_supply_candidate", candidate.id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  createOnboardingProject(state: MediaWorkflowState, user: BusinessUser, candidateId: EntityId): WorkflowResult {
    const candidate = state.trustedSupplyCandidates.find((item) => item.id === candidateId);
    if (!candidate) {
      const guard = blocked("Trusted supply candidate was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "china_media_ecosystem.onboarding_project.create", "trusted_supply_candidate", candidateId, guard), guard };
    }

    if (!canManageEcosystem(user)) {
      const guard = blocked("Current role cannot create ecosystem onboarding projects.", "ECOSYSTEM_MANAGE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "china_media_ecosystem.onboarding_project.create", "trusted_supply_candidate", candidateId, guard), guard };
    }

    if (candidate.publisher_id) {
      const guard = warning("Onboarding project already exists for this trusted supply candidate.", "ONBOARDING_PROJECT_EXISTS");
      return { state: appendEvents(state, user, "china_media_ecosystem.onboarding_project.create", "trusted_supply_candidate", candidateId, guard), guard };
    }

    const lead = findLead(state, candidate.lead_id);
    const publisherId = crypto.randomUUID();
    const publisher: Publisher = {
      id: publisherId,
      name: candidate.media_name,
      region: lead?.region ?? "CN",
      media_type: mediaEcosystemTrackLabels[candidate.track],
      integration_type: lead?.integration_feasibility === "feasible" ? "API" : "TBD",
      technical_live_status: "draft",
      commercial_test_status: "not_started",
      sales_scale_status: "not_allowed",
      risk_level: lead?.risk_level ?? "medium"
    };
    const integrationProject: IntegrationProject = {
      id: crypto.randomUUID(),
      publisher_id: publisherId,
      integration_type: publisher.integration_type ?? "TBD",
      status: "pending_integration",
      checklist: {
        contact_confirmed: Boolean(lead?.media_contact_confirmed),
        inventory_identified: Boolean(lead?.ad_inventory_identified),
        feasibility_review_required: lead?.integration_feasibility !== "feasible"
      },
      notes: "Created from China media ecosystem trusted supply candidate."
    };
    const activity = createActivity(candidate.lead_id, user, "Onboarding project created from trusted supply candidate.");
    const nextState = updateLead(
      {
        ...state,
        publishers: [publisher, ...state.publishers],
        integrationProjects: [integrationProject, ...state.integrationProjects],
        trustedSupplyCandidates: state.trustedSupplyCandidates.map((item) =>
          item.id === candidateId
            ? {
                ...item,
                status: "onboarding_project_created",
                publisher_id: publisherId
              }
            : item
        )
      },
      candidate.lead_id,
      {
        stage: "ONBOARDING_PROJECT_CREATED",
        linked_publisher_id: publisherId,
        next_action: "Continue Publisher 360 readiness, technical integration, commercial test, and sales readiness gates.",
        last_touch_at: activity.created_at
      },
      activity
    );
    const guard = allowed("Publisher onboarding project created from trusted supply candidate.", "ONBOARDING_PROJECT_CREATED");
    const businessEvent = createBusinessEvent("china_media_ecosystem.onboarding_project_created", "trusted_supply_candidate", candidateId, user.activeRole, {
      leadId: candidate.lead_id,
      publisherId
    });
    const eventState = appendEvents(nextState, user, "china_media_ecosystem.onboarding_project.create", "trusted_supply_candidate", candidateId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }
}

export const chinaMediaEcosystemService = new ChinaMediaEcosystemService();
