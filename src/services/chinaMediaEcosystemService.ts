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

export type MediaEcosystemOperationalQueueKey =
  | "ALL"
  | "NEEDS_REVIEW"
  | "NEEDS_OWNER"
  | "READY_TO_SCORE"
  | "OUTREACH_PIPELINE"
  | "TRUSTED_GATE"
  | "WATCHLIST";

type MediaEcosystemOperationalQueue = {
  key: MediaEcosystemOperationalQueueKey;
  label: string;
  count: number;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
  nextAction: string;
};

export const mediaEcosystemBatchOperationLimit = 50;

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

const activeOutreachStages: MediaExpansionStage[] = [
  "OUTREACH_READY",
  "CONTACTED",
  "MEETING_SCHEDULED",
  "BUSINESS_QUALIFIED",
  "TECH_FEASIBILITY_CHECK"
];

const closedEcosystemStages: MediaExpansionStage[] = ["REJECTED"];

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

function normalizeScoreBreakdown(input: MediaEcosystemPriorityScore): MediaEcosystemPriorityScore {
  return {
    strategic_value: clampScore(input.strategic_value, priorityScoreCaps.strategic_value),
    user_scale_growth: clampScore(input.user_scale_growth, priorityScoreCaps.user_scale_growth),
    ad_scenario_value: clampScore(input.ad_scenario_value, priorityScoreCaps.ad_scenario_value),
    programmatic_feasibility: clampScore(input.programmatic_feasibility, priorityScoreCaps.programmatic_feasibility),
    advertiser_demand_match: clampScore(input.advertiser_demand_match, priorityScoreCaps.advertiser_demand_match),
    commercial_negotiability: clampScore(input.commercial_negotiability, priorityScoreCaps.commercial_negotiability),
    risk_compliance_control: clampScore(input.risk_compliance_control, priorityScoreCaps.risk_compliance_control)
  };
}

function canManageEcosystem(user: BusinessUser) {
  return (
    rbacService.hasCapability(user, "publisher.manage") &&
    rbacService.hasAnyRole(user, ["media_manager", "media_director", "operations_director"])
  );
}

function canApproveTrustedSupplyGate(user: BusinessUser) {
  return (
    rbacService.hasCapability(user, "publisher.manage") &&
    rbacService.hasAnyRole(user, ["media_director", "operations_director"])
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

function appendBatchEvents(
  state: MediaWorkflowState,
  user: BusinessUser,
  action: string,
  guard: GuardResult,
  businessEvents: ModuleBusinessEvent[]
): MediaWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "media_ecosystem_lead", guard);

  return {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: [...businessEvents, ...state.businessEvents]
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

function uniqueLeadIds(leadIds: EntityId[]) {
  return Array.from(new Set(leadIds.filter(Boolean)));
}

function isClosedLead(lead: MediaEcosystemLead) {
  return closedEcosystemStages.includes(lead.stage);
}

function isLeadEligibleForTrustedSupply(lead: MediaEcosystemLead) {
  return trustedSupplyGateBlockers(lead).length === 0;
}

function trustedSupplyGateBlockers(lead: MediaEcosystemLead, options?: { includeDirectorApproval?: boolean }) {
  const includeDirectorApproval = options?.includeDirectorApproval ?? true;

  return [
    lead.data_quality_level !== "SEED_ONLY" ? undefined : "seed_only_requires_manual_review",
    lead.priority_score >= 70 ? undefined : "priority_score_below_70",
    lead.media_contact_confirmed ? undefined : "media_contact_missing",
    lead.business_interest_confirmed ? undefined : "business_interest_missing",
    lead.ad_inventory_identified ? undefined : "ad_inventory_missing",
    lead.integration_feasibility !== "impossible" ? undefined : "integration_impossible",
    !includeDirectorApproval || lead.media_director_approved_at ? undefined : "media_director_approval_missing"
  ].filter(Boolean) as string[];
}

function matchesOperationalQueue(lead: MediaEcosystemLead, queue: MediaEcosystemOperationalQueueKey) {
  if (queue === "ALL") {
    return true;
  }

  if (queue === "NEEDS_REVIEW") {
    return (
      !isClosedLead(lead) &&
      (lead.review_required || lead.data_quality_level === "SEED_ONLY" || lead.verification_status === "UNVERIFIED")
    );
  }

  if (queue === "NEEDS_OWNER") {
    return !isClosedLead(lead) && !lead.owner_user_id;
  }

  if (queue === "READY_TO_SCORE") {
    return !isClosedLead(lead) && lead.data_quality_level !== "SEED_ONLY" && !lead.review_required && lead.priority_score === 0;
  }

  if (queue === "OUTREACH_PIPELINE") {
    return activeOutreachStages.includes(lead.stage);
  }

  if (queue === "TRUSTED_GATE") {
    return isLeadEligibleForTrustedSupply(lead);
  }

  if (queue === "WATCHLIST") {
    return (
      !isClosedLead(lead) &&
      (lead.stage === "ON_HOLD" ||
        (lead.priority_score > 0 && lead.priority_score < 70) ||
        lead.risk_level === "high" ||
        lead.risk_level === "critical")
    );
  }

  return true;
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

  matchesOperationalQueue(lead: MediaEcosystemLead, queue: MediaEcosystemOperationalQueueKey) {
    return matchesOperationalQueue(lead, queue);
  }

  evaluateTrustedSupplyEligibility(lead: MediaEcosystemLead): EligibilityResult {
    const blockers = trustedSupplyGateBlockers(lead);

    return {
      eligible: blockers.length === 0,
      blockers
    };
  }

  approveTrustedSupplyGate(state: MediaWorkflowState, user: BusinessUser, leadId: EntityId): WorkflowResult {
    const lead = findLead(state, leadId);
    if (!lead) {
      const guard = blocked("Media ecosystem lead was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "china_media_ecosystem.trusted_gate.approve", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (!canApproveTrustedSupplyGate(user)) {
      const guard = blocked(
        "Current role cannot approve trusted supply conversion gates.",
        "TRUSTED_GATE_APPROVAL_FORBIDDEN",
        "media_director"
      );
      return { state: appendEvents(state, user, "china_media_ecosystem.trusted_gate.approve", "media_ecosystem_lead", leadId, guard), guard };
    }

    const blockers = trustedSupplyGateBlockers(lead, { includeDirectorApproval: false });
    if (blockers.length > 0) {
      const guard = blocked(
        `Lead cannot be approved for trusted supply conversion: ${blockers.join(", ")}.`,
        "TRUSTED_GATE_APPROVAL_BLOCKED"
      );
      return { state: appendEvents(state, user, "china_media_ecosystem.trusted_gate.approve", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (lead.media_director_approved_at) {
      const guard = warning("Trusted supply conversion gate was already approved.", "TRUSTED_GATE_ALREADY_APPROVED");
      return { state: appendEvents(state, user, "china_media_ecosystem.trusted_gate.approve", "media_ecosystem_lead", leadId, guard), guard };
    }

    const activity = createActivity(
      leadId,
      user,
      "Trusted supply conversion gate approved.",
      "Media director approval is recorded before candidate conversion."
    );
    const nextState = updateLead(
      state,
      leadId,
      {
        media_director_approved_by: user.id,
        media_director_approved_at: activity.created_at,
        next_action: "Create trusted supply candidate for controlled network evaluation.",
        last_touch_at: activity.created_at
      },
      activity
    );
    const guard = allowed("Trusted supply conversion gate approved.", "TRUSTED_GATE_APPROVED");
    const businessEvent = createBusinessEvent("china_media_ecosystem.trusted_gate_approved", "media_ecosystem_lead", leadId, user.activeRole, {
      approvedBy: user.id,
      priorityScore: lead.priority_score
    });
    const eventState = appendEvents(nextState, user, "china_media_ecosystem.trusted_gate.approve", "media_ecosystem_lead", leadId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  claimLeadOwner(state: MediaWorkflowState, user: BusinessUser, leadId: EntityId): WorkflowResult {
    const lead = findLead(state, leadId);
    if (!lead) {
      const guard = blocked("Media ecosystem lead was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "china_media_ecosystem.owner.assign", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (!canManageEcosystem(user)) {
      const guard = blocked("Current role cannot claim China media ecosystem leads.", "ECOSYSTEM_MANAGE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "china_media_ecosystem.owner.assign", "media_ecosystem_lead", leadId, guard), guard };
    }

    const activity = createActivity(leadId, user, `Owner assigned to ${user.activeRole}.`, "Lead now has an accountable operator.");
    const nextState = updateLead(
      state,
      leadId,
      {
        owner_role: user.activeRole,
        owner_user_id: user.id,
        next_action:
          lead.data_quality_level === "SEED_ONLY"
            ? "Complete manual review before priority scoring."
            : "Apply priority score and decide outreach readiness.",
        last_touch_at: activity.created_at
      },
      activity
    );
    const guard = allowed("Media ecosystem lead owner assigned.", "ECOSYSTEM_OWNER_ASSIGNED");
    const businessEvent = createBusinessEvent("china_media_ecosystem.owner_assigned", "media_ecosystem_lead", leadId, user.activeRole, {
      ownerRole: user.activeRole
    });
    const eventState = appendEvents(nextState, user, "china_media_ecosystem.owner.assign", "media_ecosystem_lead", leadId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  markManualReviewed(state: MediaWorkflowState, user: BusinessUser, leadId: EntityId): WorkflowResult {
    const lead = findLead(state, leadId);
    if (!lead) {
      const guard = blocked("Media ecosystem lead was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "china_media_ecosystem.manual_review", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (!canManageEcosystem(user)) {
      const guard = blocked("Current role cannot manually review China media ecosystem leads.", "ECOSYSTEM_MANAGE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "china_media_ecosystem.manual_review", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (lead.stage === "REJECTED") {
      const guard = blocked("Rejected ecosystem leads cannot be manually reviewed without reopening.", "ECOSYSTEM_LEAD_REJECTED");
      return { state: appendEvents(state, user, "china_media_ecosystem.manual_review", "media_ecosystem_lead", leadId, guard), guard };
    }

    const activity = createActivity(leadId, user, "Seed opportunity manually reviewed.", "Seed-only row is now ready for accountable priority scoring.");
    const nextState = updateLead(
      state,
      leadId,
      {
        owner_role: user.activeRole,
        owner_user_id: user.id,
        verification_status: "IN_REVIEW",
        data_quality_level: "MANUAL_REVIEWED",
        review_required: false,
        next_action: "Apply priority score and decide whether this opportunity is outreach-ready.",
        last_touch_at: activity.created_at
      },
      activity
    );
    const guard =
      lead.data_quality_level === "SEED_ONLY"
        ? allowed("Seed-only opportunity was manually reviewed.", "ECOSYSTEM_MANUAL_REVIEWED")
        : warning("Opportunity was already reviewed; review state was refreshed.", "ECOSYSTEM_REVIEW_REFRESHED");
    const businessEvent = createBusinessEvent("china_media_ecosystem.manual_reviewed", "media_ecosystem_lead", leadId, user.activeRole, {
      fromDataQuality: lead.data_quality_level,
      toDataQuality: "MANUAL_REVIEWED"
    });
    const eventState = appendEvents(nextState, user, "china_media_ecosystem.manual_review", "media_ecosystem_lead", leadId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  batchClaimLeadOwners(state: MediaWorkflowState, user: BusinessUser, leadIds: EntityId[]): WorkflowResult {
    const selectedIds = uniqueLeadIds(leadIds);
    if (selectedIds.length === 0) {
      const guard = blocked("Select at least one ecosystem opportunity before assigning owners.", "ECOSYSTEM_BATCH_EMPTY");
      const eventState = appendBatchEvents(state, user, "china_media_ecosystem.owner.assign_batch", guard, []);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    if (selectedIds.length > mediaEcosystemBatchOperationLimit) {
      const guard = blocked(
        `Batch owner assignment is limited to ${mediaEcosystemBatchOperationLimit} opportunities.`,
        "ECOSYSTEM_BATCH_LIMIT_EXCEEDED"
      );
      const eventState = appendBatchEvents(state, user, "china_media_ecosystem.owner.assign_batch", guard, []);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    if (!canManageEcosystem(user)) {
      const guard = blocked("Current role cannot batch assign China media ecosystem leads.", "ECOSYSTEM_MANAGE_FORBIDDEN", "media_manager");
      const eventState = appendBatchEvents(state, user, "china_media_ecosystem.owner.assign_batch", guard, []);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    const eligibleIds = selectedIds.filter((leadId) => {
      const lead = findLead(state, leadId);
      return Boolean(lead && !isClosedLead(lead));
    });

    if (eligibleIds.length === 0) {
      const guard = blocked("No selected ecosystem opportunities can be assigned.", "ECOSYSTEM_BATCH_NO_ELIGIBLE_LEADS");
      const eventState = appendBatchEvents(state, user, "china_media_ecosystem.owner.assign_batch", guard, []);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    const eligibleIdSet = new Set(eligibleIds);
    const activities = eligibleIds.map((leadId) =>
      createActivity(leadId, user, `Owner batch assigned to ${user.activeRole}.`, "Lead now has an accountable operator.")
    );
    const activityByLeadId = new Map(activities.map((activity) => [activity.lead_id, activity]));
    const nextState: MediaWorkflowState = {
      ...state,
      mediaEcosystemLeads: state.mediaEcosystemLeads.map((lead) => {
        if (!eligibleIdSet.has(lead.id)) {
          return lead;
        }

        const activity = activityByLeadId.get(lead.id);
        return {
          ...lead,
          owner_role: user.activeRole,
          owner_user_id: user.id,
          next_action:
            lead.data_quality_level === "SEED_ONLY"
              ? "Complete manual review before priority scoring."
              : "Apply priority score and decide outreach readiness.",
          last_touch_at: activity?.created_at ?? lead.last_touch_at
        };
      }),
      mediaOutreachActivities: [...activities, ...state.mediaOutreachActivities]
    };
    const skippedCount = selectedIds.length - eligibleIds.length;
    const guard =
      skippedCount > 0
        ? warning(
            `Batch assigned ${eligibleIds.length} owner(s); skipped ${skippedCount} closed or missing opportunity(ies).`,
            "ECOSYSTEM_BATCH_OWNER_PARTIAL"
          )
        : allowed(`Batch assigned ${eligibleIds.length} ecosystem owner(s).`, "ECOSYSTEM_BATCH_OWNER_ASSIGNED");
    const businessEvents = eligibleIds.map((leadId) =>
      createBusinessEvent("china_media_ecosystem.owner_assigned", "media_ecosystem_lead", leadId, user.activeRole, {
        ownerRole: user.activeRole,
        batch: true
      })
    );
    const eventState = appendBatchEvents(nextState, user, "china_media_ecosystem.owner.assign_batch", guard, businessEvents);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent: businessEvents[0]
    };
  }

  batchMarkManualReviewed(state: MediaWorkflowState, user: BusinessUser, leadIds: EntityId[]): WorkflowResult {
    const selectedIds = uniqueLeadIds(leadIds);
    if (selectedIds.length === 0) {
      const guard = blocked("Select at least one ecosystem opportunity before marking review.", "ECOSYSTEM_BATCH_EMPTY");
      const eventState = appendBatchEvents(state, user, "china_media_ecosystem.manual_review_batch", guard, []);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    if (selectedIds.length > mediaEcosystemBatchOperationLimit) {
      const guard = blocked(
        `Batch manual review is limited to ${mediaEcosystemBatchOperationLimit} opportunities.`,
        "ECOSYSTEM_BATCH_LIMIT_EXCEEDED"
      );
      const eventState = appendBatchEvents(state, user, "china_media_ecosystem.manual_review_batch", guard, []);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    if (!canManageEcosystem(user)) {
      const guard = blocked("Current role cannot batch review China media ecosystem leads.", "ECOSYSTEM_MANAGE_FORBIDDEN", "media_manager");
      const eventState = appendBatchEvents(state, user, "china_media_ecosystem.manual_review_batch", guard, []);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    const eligibleLeads = selectedIds
      .map((leadId) => findLead(state, leadId))
      .filter(
        (lead): lead is MediaEcosystemLead =>
          Boolean(
            lead &&
              !isClosedLead(lead) &&
              (lead.review_required || lead.data_quality_level === "SEED_ONLY" || lead.verification_status === "UNVERIFIED")
          )
      );

    if (eligibleLeads.length === 0) {
      const guard = blocked("No selected ecosystem opportunities require manual review.", "ECOSYSTEM_BATCH_NO_ELIGIBLE_LEADS");
      const eventState = appendBatchEvents(state, user, "china_media_ecosystem.manual_review_batch", guard, []);
      return { state: eventState, guard, auditEvent: eventState.auditEvents[0] };
    }

    const eligibleIdSet = new Set(eligibleLeads.map((lead) => lead.id));
    const activities = eligibleLeads.map((lead) =>
      createActivity(lead.id, user, "Seed opportunity batch reviewed.", "Selected ecosystem opportunity is ready for scoring.")
    );
    const activityByLeadId = new Map(activities.map((activity) => [activity.lead_id, activity]));
    const nextState: MediaWorkflowState = {
      ...state,
      mediaEcosystemLeads: state.mediaEcosystemLeads.map((lead) => {
        if (!eligibleIdSet.has(lead.id)) {
          return lead;
        }

        const activity = activityByLeadId.get(lead.id);
        return {
          ...lead,
          owner_role: user.activeRole,
          owner_user_id: user.id,
          verification_status: "IN_REVIEW",
          data_quality_level: "MANUAL_REVIEWED",
          review_required: false,
          next_action: "Apply priority score and decide whether this opportunity is outreach-ready.",
          last_touch_at: activity?.created_at ?? lead.last_touch_at
        };
      }),
      mediaOutreachActivities: [...activities, ...state.mediaOutreachActivities]
    };
    const skippedCount = selectedIds.length - eligibleLeads.length;
    const guard =
      skippedCount > 0
        ? warning(
            `Batch reviewed ${eligibleLeads.length} opportunity(ies); skipped ${skippedCount} already-reviewed, closed, or missing row(s).`,
            "ECOSYSTEM_BATCH_REVIEW_PARTIAL"
          )
        : allowed(`Batch reviewed ${eligibleLeads.length} ecosystem opportunity(ies).`, "ECOSYSTEM_BATCH_REVIEWED");
    const leadById = new Map(state.mediaEcosystemLeads.map((lead) => [lead.id, lead]));
    const businessEvents = eligibleLeads.map((lead) =>
      createBusinessEvent("china_media_ecosystem.manual_reviewed", "media_ecosystem_lead", lead.id, user.activeRole, {
        fromDataQuality: leadById.get(lead.id)?.data_quality_level,
        toDataQuality: "MANUAL_REVIEWED",
        batch: true
      })
    );
    const eventState = appendBatchEvents(nextState, user, "china_media_ecosystem.manual_review_batch", guard, businessEvents);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent: businessEvents[0]
    };
  }

  applyManualScore(
    state: MediaWorkflowState,
    user: BusinessUser,
    leadId: EntityId,
    scoreBreakdown: MediaEcosystemPriorityScore
  ): WorkflowResult {
    const lead = findLead(state, leadId);
    if (!lead) {
      const guard = blocked("Media ecosystem lead was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "china_media_ecosystem.score.apply", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (!canManageEcosystem(user)) {
      const guard = blocked("Current role cannot score China media ecosystem leads.", "ECOSYSTEM_MANAGE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "china_media_ecosystem.score.apply", "media_ecosystem_lead", leadId, guard), guard };
    }

    if (lead.data_quality_level === "SEED_ONLY") {
      const guard = blocked("Manual review is required before scoring a seed-only ecosystem opportunity.", "SEED_REVIEW_REQUIRED");
      return { state: appendEvents(state, user, "china_media_ecosystem.score.apply", "media_ecosystem_lead", leadId, guard), guard };
    }

    const normalizedScore = normalizeScoreBreakdown(scoreBreakdown);
    const priorityScore = this.calculatePriorityScore(normalizedScore);
    const nextStage: MediaExpansionStage =
      priorityScore >= 70 ? "OUTREACH_READY" : priorityScore > 0 ? "PRIORITY_SCREENED" : "ECOSYSTEM_MAPPED";
    const activity = createActivity(
      leadId,
      user,
      `Manual priority score applied: ${priorityScore}.`,
      priorityScore >= 70 ? "Lead can move into accountable outreach." : "Lead remains below outreach threshold."
    );
    const nextState = updateLead(
      state,
      leadId,
      {
        owner_role: user.activeRole,
        owner_user_id: user.id,
        score_breakdown: normalizedScore,
        priority_score: priorityScore,
        stage: nextStage,
        next_action:
          priorityScore >= 70
            ? "Confirm media contact, business interest, inventory, and feasibility."
            : "Keep in opportunity pool until strategic value, demand, or feasibility improves.",
        last_touch_at: activity.created_at
      },
      activity
    );
    const guard =
      priorityScore >= 70
        ? allowed("Manual score moved the lead into outreach readiness.", "ECOSYSTEM_SCORE_OUTREACH_READY")
        : warning("Manual score keeps the lead in the opportunity pool.", "ECOSYSTEM_SCORE_WATCH");
    const businessEvent = createBusinessEvent("china_media_ecosystem.score_applied", "media_ecosystem_lead", leadId, user.activeRole, {
      priorityScore,
      nextStage
    });
    const eventState = appendEvents(nextState, user, "china_media_ecosystem.score.apply", "media_ecosystem_lead", leadId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  getOperationalQueues(state: MediaWorkflowState): MediaEcosystemOperationalQueue[] {
    const queueDefinitions: Omit<MediaEcosystemOperationalQueue, "count">[] = [
      {
        key: "ALL",
        label: "All opportunities",
        tone: "info",
        nextAction: "Review the full China media ecosystem backlog."
      },
      {
        key: "NEEDS_REVIEW",
        label: "Needs review",
        tone: "warning",
        nextAction: "Confirm source quality before scoring or outreach."
      },
      {
        key: "NEEDS_OWNER",
        label: "Needs owner",
        tone: "warning",
        nextAction: "Assign an accountable operator before moving the opportunity."
      },
      {
        key: "READY_TO_SCORE",
        label: "Ready to score",
        tone: "info",
        nextAction: "Apply the 100-point priority model."
      },
      {
        key: "OUTREACH_PIPELINE",
        label: "Outreach pipeline",
        tone: "success",
        nextAction: "Drive contact, meeting, business qualification, and feasibility proof."
      },
      {
        key: "TRUSTED_GATE",
        label: "Trusted gate",
        tone: "success",
        nextAction: "Convert qualified opportunities into trusted supply candidates."
      },
      {
        key: "WATCHLIST",
        label: "Watchlist",
        tone: "danger",
        nextAction: "Resolve low score, on-hold, or elevated-risk blockers."
      }
    ];

    return queueDefinitions.map((queue) => ({
      ...queue,
      count: state.mediaEcosystemLeads.filter((lead) => matchesOperationalQueue(lead, queue.key)).length
    }));
  }

  getSummary(state: MediaWorkflowState) {
    const activeLeads = state.mediaEcosystemLeads.filter((lead) => !["REJECTED", "ON_HOLD"].includes(lead.stage));
    const highPriority = state.mediaEcosystemLeads.filter((lead) => lead.priority_score >= 70);
    const outreachReady = state.mediaEcosystemLeads.filter((lead) =>
      activeOutreachStages.includes(lead.stage)
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

    if (lead.data_quality_level === "SEED_ONLY") {
      const guard = blocked("Manual review is required before priority screening a seed-only ecosystem opportunity.", "SEED_REVIEW_REQUIRED");
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
      owner_user_id: user.id,
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
