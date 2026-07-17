import type { RoleCode } from "../constants/roles";
import type { GuardResult } from "../types/guards";
import type {
  AuditEvent,
  BusinessUser,
  EntityId,
  MediaSupplyPackage,
  MediaTrustLevel,
  MediaTrustProfile,
  MediaTrustScoreBreakdown,
  MediaWorkflowState,
  ModuleBusinessEvent,
  SalesWorkflowState,
  SupplyMatchRecommendation,
  TrustedSupplyPool
} from "../types/domain";
import { auditService } from "./auditService";
import { rbacService } from "./rbacService";
import { rlsService } from "./rlsService";

type TrustedSupplyResult = {
  state: MediaWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

export type SupplyQualityStatus = "healthy" | "watch" | "at_risk" | "suspended" | "not_evaluated";

export type SupplyQualitySnapshot = {
  status: SupplyQualityStatus;
  score: number;
  scoreDelta: number;
  openBlockingCases: number;
  latestIvtRate?: number;
  signals: string[];
  nextAction: string;
};

function allowed(message: string, reasonCode: string): GuardResult {
  return { allowed: true, severity: "info", reason_code: reasonCode, message, audit_required: true };
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

function businessEvent(
  eventCode: string,
  publisherId: EntityId,
  ownerRole: RoleCode,
  payload?: Record<string, unknown>
): ModuleBusinessEvent {
  return {
    id: crypto.randomUUID(),
    eventCode,
    objectType: "publisher",
    objectId: publisherId,
    ownerRole,
    createdAt: new Date().toISOString(),
    payload
  };
}

function appendEvents(
  state: MediaWorkflowState,
  user: BusinessUser,
  action: string,
  publisherId: EntityId | undefined,
  guard: GuardResult,
  event?: ModuleBusinessEvent
): MediaWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "publisher", guard, publisherId);
  return {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: event ? [event, ...state.businessEvents] : state.businessEvents
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function trustLevel(score: number): MediaTrustLevel {
  if (score >= 85) return "S";
  if (score >= 75) return "A";
  if (score >= 60) return "B";
  if (score >= 45) return "C";
  return "D";
}

function suggestedPool(
  score: number,
  riskLevel: string,
  salesStatus: string,
  hasBlockingCase: boolean
): TrustedSupplyPool {
  if (["paused", "scale_blocked"].includes(salesStatus) || riskLevel === "critical") return "suspended";
  if (hasBlockingCase || riskLevel === "high") return "risk";
  if (score >= 75) return "core";
  if (score >= 60) return "test";
  if (score >= 45) return "opportunity";
  return "risk";
}

function fitTags(mediaType: string | undefined, adFormats: string[]) {
  const normalized = `${mediaType ?? ""} ${adFormats.join(" ")}`.toLowerCase();
  const tags = new Set<string>();
  if (normalized.includes("ctv") || normalized.includes("video")) {
    tags.add("premium-brand");
    tags.add("automotive");
    tags.add("travel");
  }
  if (normalized.includes("app") || normalized.includes("native") || normalized.includes("feed")) {
    tags.add("wellness");
    tags.add("retail");
    tags.add("gaming");
  }
  if (normalized.includes("audio")) {
    tags.add("audio");
    tags.add("youth");
  }
  if (tags.size === 0) tags.add("general-brand");
  return Array.from(tags);
}

function scorePublisher(state: MediaWorkflowState, publisherId: EntityId) {
  const publisher = state.publishers.find((item) => item.id === publisherId);
  if (!publisher) return undefined;

  const contacts = state.publisherContacts.filter((item) => item.publisher_id === publisherId);
  const slots = state.publisherAdSlots.filter((item) => item.publisher_id === publisherId && item.status === "active");
  const terms = state.publisherContractTerms.filter((item) => item.publisher_id === publisherId);
  const integration = state.integrationProjects.find((item) => item.publisher_id === publisherId);
  const test = state.commercialTests.find((item) => item.publisher_id === publisherId);
  const blockingCases = state.diagnosticCases.filter(
    (item) => item.publisher_id === publisherId && item.is_blocking_sales_scale && !["closed", "rejected"].includes(item.status)
  );
  const evidenceCount = integration?.evidence?.length ?? 0;

  const completenessSignals = [publisher.region, publisher.media_type, publisher.integration_type, contacts.length, slots.length, terms.length];
  const profileCompleteness = Math.round((completenessSignals.filter(Boolean).length / completenessSignals.length) * 10);
  const authorization = contacts.some((item) => item.is_primary) && terms.length > 0 ? 15 : contacts.length || terms.length ? 8 : 0;
  const technical = publisher.technical_live_status === "technical_live_passed"
    ? 15
    : ["in_integration", "technical_review"].includes(publisher.technical_live_status)
      ? 9
      : 3;
  const contextSignals = clamp(slots.length * 3 + (publisher.daily_requests ? 2 : 0) + (publisher.daily_active_users ? 2 : 0), 0, 10);
  const qualityIvt = test?.status === "test_passed"
    ? test.ivt_rate <= 0.02
      ? 20
      : test.ivt_rate <= 0.05
        ? 14
        : 7
    : test?.status === "testing"
      ? 8
      : 3;
  const transparency = clamp(evidenceCount * 2.5, 0, 10);
  const commercial = terms.length > 0 ? (test?.status === "test_passed" ? 10 : 6) : 0;
  const advertiserFit = fitTags(publisher.media_type, slots.map((item) => item.ad_format)).length >= 2 ? 5 : 3;
  const delivery = test?.status === "test_passed" && (publisher.daily_requests ?? 0) > 0 ? 5 : publisher.daily_requests ? 3 : 1;
  const riskBase = publisher.risk_level === "critical" ? 20 : publisher.risk_level === "high" ? 12 : publisher.risk_level === "medium" ? 4 : 0;
  const riskDeduction = clamp(riskBase + blockingCases.length * 5, 0, 30);

  const score_breakdown: MediaTrustScoreBreakdown = {
    profile_completeness: profileCompleteness,
    authorization,
    technical,
    context_signals: contextSignals,
    quality_ivt: qualityIvt,
    transparency,
    commercial,
    advertiser_fit: advertiserFit,
    delivery,
    risk_deduction: riskDeduction
  };
  const totalScore = clamp(
    profileCompleteness + authorization + technical + contextSignals + qualityIvt + transparency + commercial + advertiserFit + delivery - riskDeduction,
    0,
    100
  );
  const recommendations = [
    technical === 15 ? "Technical readiness is production verified." : "Technical readiness still needs stronger production proof.",
    qualityIvt >= 14 ? "Commercial quality signals are within the controlled-test range." : "Commercial quality evidence is incomplete or below target.",
    authorization === 15 ? "Primary contact and commercial terms are recorded." : "Authorization or commercial ownership needs confirmation."
  ];
  const riskWarnings = [
    ...(publisher.risk_level === "low" ? [] : [`Publisher risk level is ${publisher.risk_level}.`]),
    ...(blockingCases.length ? [`${blockingCases.length} blocking diagnostic case(s) remain open.`] : []),
    ...(test && test.ivt_rate > 0.03 ? [`IVT ${(test.ivt_rate * 100).toFixed(1)}% exceeds the preferred threshold.`] : [])
  ];

  return {
    publisher,
    score_breakdown,
    totalScore,
    level: trustLevel(totalScore),
    pool: suggestedPool(totalScore, publisher.risk_level, publisher.sales_scale_status, blockingCases.length > 0),
    advertiserFitTags: fitTags(publisher.media_type, slots.map((item) => item.ad_format)),
    recommendations,
    riskWarnings,
    blockingCases,
    slots,
    terms,
    test
  };
}

function salesStatusForPool(pool: TrustedSupplyPool) {
  if (pool === "core") return "proposal_selectable" as const;
  if (pool === "test") return "limited_sellable" as const;
  if (pool === "risk" || pool === "suspended") return "scale_blocked" as const;
  return "not_allowed" as const;
}

export class TrustedSupplyNetworkService {
  getSnapshot(state: MediaWorkflowState, publisherId: EntityId) {
    return {
      profile: state.mediaTrustProfiles.find((item) => item.publisher_id === publisherId),
      scoreHistory: state.mediaTrustScoreHistory.filter((item) => item.publisher_id === publisherId),
      packages: state.mediaSupplyPackages.filter((item) => item.publisher_id === publisherId),
      quality: this.getQualitySnapshot(state, publisherId)
    };
  }

  evaluatePublisher(state: MediaWorkflowState, user: BusinessUser, publisherId: EntityId): TrustedSupplyResult {
    const scored = scorePublisher(state, publisherId);
    if (!scored) {
      const guard = blocked("Publisher was not found.", "TRUST_PROFILE_NOT_FOUND");
      return { state: appendEvents(state, user, "trusted_supply.evaluate", publisherId, guard), guard };
    }
    if (!rlsService.canWriteTable(user, "media_trust_profiles")) {
      const guard = blocked("Current role cannot evaluate trusted supply.", "TRUST_EVALUATION_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "trusted_supply.evaluate", publisherId, guard), guard };
    }

    const now = new Date().toISOString();
    const existing = state.mediaTrustProfiles.find((item) => item.publisher_id === publisherId);
    const profile: MediaTrustProfile = {
      id: existing?.id ?? crypto.randomUUID(),
      publisher_id: publisherId,
      status: existing?.confirmed_pool ? "monitoring" : "evaluated",
      total_score: scored.totalScore,
      trust_level: scored.level,
      score_breakdown: scored.score_breakdown,
      suggested_pool: scored.pool,
      confirmed_pool: existing?.confirmed_pool,
      advertiser_fit_tags: scored.advertiserFitTags,
      recommendation_reasons: scored.recommendations,
      risk_warnings: scored.riskWarnings,
      owner_role: existing?.owner_role ?? user.activeRole,
      next_action: existing?.confirmed_pool
        ? "Review quality trend and keep the confirmed pool under active monitoring."
        : "Media Director must review the score and confirm the operating pool.",
      evaluated_at: now,
      confirmed_at: existing?.confirmed_at
    };
    const historyRecord = {
      id: crypto.randomUUID(),
      publisher_id: publisherId,
      total_score: scored.totalScore,
      trust_level: scored.level,
      score_breakdown: scored.score_breakdown,
      suggested_pool: scored.pool,
      reasons: scored.recommendations,
      risk_warnings: scored.riskWarnings,
      calculated_at: now,
      calculated_by_role: user.activeRole
    };
    const nextState: MediaWorkflowState = {
      ...state,
      mediaTrustProfiles: [profile, ...state.mediaTrustProfiles.filter((item) => item.publisher_id !== publisherId)],
      mediaTrustScoreHistory: [historyRecord, ...state.mediaTrustScoreHistory]
    };
    const guard = allowed("Trusted supply score calculated. Human pool confirmation is still required.", "TRUST_SCORE_EVALUATED");
    const event = businessEvent("trusted_supply.score_evaluated", publisherId, user.activeRole, {
      score: profile.total_score,
      level: profile.trust_level,
      suggestedPool: profile.suggested_pool
    });
    const eventState = appendEvents(nextState, user, "trusted_supply.evaluate", publisherId, guard, event);
    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent: event };
  }

  confirmPool(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    targetPool?: TrustedSupplyPool
  ): TrustedSupplyResult {
    const profile = state.mediaTrustProfiles.find((item) => item.publisher_id === publisherId);
    const pool = targetPool ?? profile?.suggested_pool;
    if (!profile || !pool) {
      const guard = blocked("Evaluate the publisher before confirming a supply pool.", "TRUST_PROFILE_REQUIRED");
      return { state: appendEvents(state, user, "trusted_supply.pool.confirm", publisherId, guard), guard };
    }
    if (!rbacService.hasCapability(user, "publisher.readiness.approve")) {
      const guard = blocked("Only a media approval role can confirm the operating pool.", "TRUST_POOL_CONFIRM_FORBIDDEN", "media_director");
      return { state: appendEvents(state, user, "trusted_supply.pool.confirm", publisherId, guard), guard };
    }
    if ((pool === "core" && profile.total_score < 75) || (pool === "test" && profile.total_score < 60)) {
      const guard = blocked("The score does not meet the selected pool threshold.", "TRUST_POOL_THRESHOLD_NOT_MET");
      return { state: appendEvents(state, user, "trusted_supply.pool.confirm", publisherId, guard), guard };
    }

    const now = new Date().toISOString();
    const currentPublisher = state.publishers.find((item) => item.id === publisherId);
    const confirmedSalesStatus =
      pool === "core" && currentPublisher?.sales_scale_status === "scale_ready"
        ? "scale_ready"
        : salesStatusForPool(pool);
    const nextState: MediaWorkflowState = {
      ...state,
      mediaTrustProfiles: state.mediaTrustProfiles.map((item) =>
        item.publisher_id === publisherId
          ? {
              ...item,
              status: "confirmed",
              confirmed_pool: pool,
              confirmed_at: now,
              next_action: pool === "core" || pool === "test" ? "Create a controlled supply package." : "Resolve risk before supply packaging."
            }
          : item
      ),
      publishers: state.publishers.map((item) =>
        item.id === publisherId ? { ...item, sales_scale_status: confirmedSalesStatus } : item
      )
    };
    const guard = allowed("Trusted supply operating pool confirmed. This does not auto-approve scale readiness.", "TRUST_POOL_CONFIRMED");
    const event = businessEvent("trusted_supply.pool_confirmed", publisherId, user.activeRole, { pool, score: profile.total_score });
    const eventState = appendEvents(nextState, user, "trusted_supply.pool.confirm", publisherId, guard, event);
    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent: event };
  }

  createSupplyPackage(state: MediaWorkflowState, user: BusinessUser, publisherId: EntityId): TrustedSupplyResult {
    const scored = scorePublisher(state, publisherId);
    const profile = state.mediaTrustProfiles.find((item) => item.publisher_id === publisherId);
    if (!scored || !profile) {
      const guard = blocked("A trusted supply profile is required before packaging.", "SUPPLY_PACKAGE_PROFILE_REQUIRED");
      return { state: appendEvents(state, user, "trusted_supply.package.create", publisherId, guard), guard };
    }
    if (!rlsService.canWriteTable(user, "media_supply_packages")) {
      const guard = blocked("Current role cannot create supply packages.", "SUPPLY_PACKAGE_CREATE_FORBIDDEN", "media_manager");
      return { state: appendEvents(state, user, "trusted_supply.package.create", publisherId, guard), guard };
    }
    if (!profile.confirmed_pool || !["core", "test"].includes(profile.confirmed_pool)) {
      const guard = blocked("Only confirmed Core or Test pool media can be packaged.", "SUPPLY_PACKAGE_POOL_REQUIRED", "media_director");
      return { state: appendEvents(state, user, "trusted_supply.package.create", publisherId, guard), guard };
    }
    if (!scored.slots.length || !scored.terms.length) {
      const guard = blocked("At least one active ad slot and commercial term are required.", "SUPPLY_PACKAGE_INPUT_INCOMPLETE");
      return { state: appendEvents(state, user, "trusted_supply.package.create", publisherId, guard), guard };
    }

    const now = new Date().toISOString();
    const packageRecord: MediaSupplyPackage = {
      id: crypto.randomUUID(),
      publisher_id: publisherId,
      package_name: `${scored.publisher.name} controlled supply`,
      status: "draft",
      pool: profile.confirmed_pool,
      ad_formats: Array.from(new Set(scored.slots.map((item) => item.ad_format))),
      placement_types: Array.from(new Set(scored.slots.map((item) => item.placement_type))),
      geo: scored.publisher.region ?? "CN",
      inventory_scale: scored.slots.reduce((sum, item) => sum + (item.daily_requests ?? 0), 0),
      floor_price: scored.slots.reduce((sum, item) => sum + (item.floor_price ?? 0), 0) / scored.slots.length,
      billing_model: scored.terms[0]?.billing_model,
      advertiser_fit_tags: profile.advertiser_fit_tags,
      risk_notes: profile.risk_warnings,
      owner_role: user.activeRole,
      created_at: now,
      updated_at: now
    };
    const nextState = { ...state, mediaSupplyPackages: [packageRecord, ...state.mediaSupplyPackages] };
    const guard = allowed("Controlled supply package created in draft status.", "SUPPLY_PACKAGE_CREATED");
    const event = businessEvent("trusted_supply.package_created", publisherId, user.activeRole, { packageId: packageRecord.id });
    const eventState = appendEvents(nextState, user, "trusted_supply.package.create", publisherId, guard, event);
    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent: event };
  }

  activateSupplyPackage(
    state: MediaWorkflowState,
    user: BusinessUser,
    packageId: EntityId
  ): TrustedSupplyResult {
    const packageRecord = state.mediaSupplyPackages.find((item) => item.id === packageId);
    if (!packageRecord) {
      const guard = blocked("Supply package was not found.", "SUPPLY_PACKAGE_NOT_FOUND");
      return { state: appendEvents(state, user, "trusted_supply.package.activate", undefined, guard), guard };
    }
    if (!rbacService.hasCapability(user, "publisher.readiness.approve")) {
      const guard = blocked("Only a media approval role can activate supply.", "SUPPLY_PACKAGE_ACTIVATE_FORBIDDEN", "media_director");
      return { state: appendEvents(state, user, "trusted_supply.package.activate", packageRecord.publisher_id, guard), guard };
    }
    const quality = this.getQualitySnapshot(state, packageRecord.publisher_id);
    if (["at_risk", "suspended"].includes(quality.status)) {
      const guard = blocked("Resolve active quality risks before package activation.", "SUPPLY_PACKAGE_QUALITY_BLOCKED");
      return { state: appendEvents(state, user, "trusted_supply.package.activate", packageRecord.publisher_id, guard), guard };
    }

    const now = new Date().toISOString();
    const nextState = {
      ...state,
      mediaSupplyPackages: state.mediaSupplyPackages.map((item) =>
        item.id === packageId ? { ...item, status: "active" as const, activated_at: now, updated_at: now } : item
      )
    };
    const guard = allowed("Supply package activated for controlled sales recommendation.", "SUPPLY_PACKAGE_ACTIVATED");
    const event = businessEvent("trusted_supply.package_activated", packageRecord.publisher_id, user.activeRole, { packageId });
    const eventState = appendEvents(nextState, user, "trusted_supply.package.activate", packageRecord.publisher_id, guard, event);
    return { state: eventState, guard, auditEvent: eventState.auditEvents[0], businessEvent: event };
  }

  getMatchRecommendations(
    mediaState: MediaWorkflowState,
    salesState: SalesWorkflowState,
    advertiserId?: EntityId
  ): SupplyMatchRecommendation[] {
    const advertisers = advertiserId
      ? salesState.advertisers.filter((item) => item.id === advertiserId)
      : salesState.advertisers.filter((item) => item.status === "active");

    return advertisers.flatMap((advertiser) =>
      mediaState.mediaSupplyPackages
        .filter((item) => item.status === "active")
        .map((packageRecord) => {
          const publisher = mediaState.publishers.find((item) => item.id === packageRecord.publisher_id);
          const profile = mediaState.mediaTrustProfiles.find((item) => item.publisher_id === packageRecord.publisher_id);
          const industry = advertiser.industry.toLowerCase();
          const industryMatch = packageRecord.advertiser_fit_tags.some((tag) => industry.includes(tag) || tag.includes(industry));
          const geoMatch = !advertiser.region || advertiser.region === packageRecord.geo || packageRecord.geo === "Global";
          const matchScore = clamp(
            (packageRecord.pool === "core" ? 40 : 30) +
              (industryMatch ? 20 : 8) +
              (geoMatch ? 20 : 5) +
              (packageRecord.ad_formats.length ? 10 : 0) +
              (packageRecord.inventory_scale > 0 ? 10 : 3) -
              (profile?.risk_warnings.length ?? 0) * 4,
            0,
            100
          );
          return {
            advertiser_id: advertiser.id,
            publisher_id: packageRecord.publisher_id,
            package_id: packageRecord.id,
            match_score: matchScore,
            recommendation_reasons: [
              `${packageRecord.pool} pool confirmed by Media leadership.`,
              industryMatch ? `Supply tags align with ${advertiser.industry}.` : "Use as a controlled broader-fit option.",
              geoMatch ? `Geo coverage matches ${advertiser.region}.` : "Geo coverage requires sales confirmation.",
              `${packageRecord.ad_formats.length} verified ad format(s) are packaged.`
            ],
            risk_warnings: packageRecord.risk_notes,
            suggested_budget_ratio: packageRecord.pool === "core" ? 0.35 : 0.15
          };
        })
    ).sort((left, right) => right.match_score - left.match_score);
  }

  getQualitySnapshot(state: MediaWorkflowState, publisherId: EntityId): SupplyQualitySnapshot {
    const profile = state.mediaTrustProfiles.find((item) => item.publisher_id === publisherId);
    if (!profile) {
      return {
        status: "not_evaluated",
        score: 0,
        scoreDelta: 0,
        openBlockingCases: 0,
        signals: ["Trusted supply score has not been calculated."],
        nextAction: "Run trusted supply evaluation."
      };
    }
    const history = state.mediaTrustScoreHistory
      .filter((item) => item.publisher_id === publisherId)
      .sort((left, right) => right.calculated_at.localeCompare(left.calculated_at));
    const previous = history.find((item) => item.id !== history[0]?.id);
    const scoreDelta = previous ? profile.total_score - previous.total_score : 0;
    const test = state.commercialTests.find((item) => item.publisher_id === publisherId);
    const blockers = state.diagnosticCases.filter(
      (item) => item.publisher_id === publisherId && item.is_blocking_sales_scale && !["closed", "rejected"].includes(item.status)
    );
    const publisher = state.publishers.find((item) => item.id === publisherId);
    const status: SupplyQualityStatus =
      profile.confirmed_pool === "suspended" || publisher?.risk_level === "critical"
        ? "suspended"
        : blockers.length > 0 || publisher?.risk_level === "high" || (test?.ivt_rate ?? 0) > 0.05 || scoreDelta <= -10
          ? "at_risk"
          : publisher?.risk_level === "medium" || (test?.ivt_rate ?? 0) > 0.03 || scoreDelta <= -5
            ? "watch"
            : "healthy";
    return {
      status,
      score: profile.total_score,
      scoreDelta,
      openBlockingCases: blockers.length,
      latestIvtRate: test?.ivt_rate,
      signals: [
        `Trust score ${profile.total_score} (${scoreDelta >= 0 ? "+" : ""}${scoreDelta} vs previous).`,
        test ? `Latest commercial IVT ${(test.ivt_rate * 100).toFixed(1)}%.` : "No commercial test metric is available.",
        blockers.length ? `${blockers.length} blocking diagnostic case(s) are open.` : "No blocking diagnostic case is open."
      ],
      nextAction:
        status === "healthy"
          ? "Continue scheduled monitoring."
          : status === "watch"
            ? "Review the latest score and commercial metrics."
            : "Resolve quality blockers before expanding supply usage."
    };
  }
}

export const trustedSupplyNetworkService = new TrustedSupplyNetworkService();
