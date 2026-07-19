import type { AppLocale } from "../../lib/i18n";
import type {
  MediaEcosystemLead,
  MediaEcosystemTrack,
  MediaExpansionStage,
  TrustedSupplyCandidate
} from "../../types/domain";
import type { MediaEcosystemOperationalQueueKey } from "../../services/chinaMediaEcosystemService";

export type EcosystemWorkspaceView = "operations" | "insights";

export type EcosystemPrimaryAction =
  | "claimOwner"
  | "markReviewed"
  | "priorityScreen"
  | "recordContact"
  | "qualify"
  | "approveGate"
  | "trustedCandidate"
  | "startReadiness"
  | "techReview"
  | "commercialReview"
  | "onboardingProject"
  | "confirmHandoff";

const trackLabels: Record<MediaEcosystemTrack, Record<AppLocale, string>> = {
  VIDEO_LONG_FORM: { "en-US": "Long-form video", "zh-CN": "长视频" },
  SHORT_VIDEO_LIVE: { "en-US": "Short video and live", "zh-CN": "短视频与直播" },
  NEWS_SEARCH_BROWSER: { "en-US": "News, search and browser", "zh-CN": "新闻、搜索与浏览器" },
  SOCIAL_COMMUNITY: { "en-US": "Social and community", "zh-CN": "社交与社区" },
  ECOMMERCE_RETAIL_MEDIA: { "en-US": "Ecommerce and retail media", "zh-CN": "电商与零售媒体" },
  LOCAL_LIFE_TRAVEL: { "en-US": "Local life and travel", "zh-CN": "本地生活与旅行" },
  GAME_H5_IAA: { "en-US": "Game, H5 and IAA", "zh-CN": "游戏、H5 与 IAA" },
  WELLNESS_FEMALE_HEALTH: { "en-US": "Wellness and female health", "zh-CN": "健康与女性健康" },
  UTILITY_TOOLS: { "en-US": "Utility tools", "zh-CN": "实用工具" },
  CTV_OTT_OEM: { "en-US": "CTV, OTT and OEM", "zh-CN": "CTV、OTT 与 OEM" },
  SMART_HARDWARE: { "en-US": "Smart hardware", "zh-CN": "智能硬件" },
  AUDIO_PODCAST: { "en-US": "Audio and podcast", "zh-CN": "音频与播客" },
  CAMPUS_YOUTH: { "en-US": "Campus and youth", "zh-CN": "校园与青年" },
  OUTDOOR_DOOH: { "en-US": "Outdoor and DOOH", "zh-CN": "户外与 DOOH" },
  AI_APP_CONTENT: { "en-US": "AI apps and content", "zh-CN": "AI 应用与内容" },
  OTHER_VERTICAL: { "en-US": "Other vertical", "zh-CN": "其他垂直赛道" }
};

const stageLabels: Record<MediaExpansionStage, Record<AppLocale, string>> = {
  ECOSYSTEM_MAPPED: { "en-US": "Mapped", "zh-CN": "已映射" },
  PRIORITY_SCREENED: { "en-US": "Priority screened", "zh-CN": "已完成优先级筛选" },
  OUTREACH_READY: { "en-US": "Ready for outreach", "zh-CN": "待外联" },
  CONTACTED: { "en-US": "Contacted", "zh-CN": "已联系" },
  MEETING_SCHEDULED: { "en-US": "Meeting scheduled", "zh-CN": "已安排会议" },
  BUSINESS_QUALIFIED: { "en-US": "Business qualified", "zh-CN": "商务已验证" },
  TECH_FEASIBILITY_CHECK: { "en-US": "Technical feasibility", "zh-CN": "技术可行性评估" },
  TRUSTED_SUPPLY_CANDIDATE: { "en-US": "Trusted supply candidate", "zh-CN": "可信供给候选" },
  ONBOARDING_PROJECT_CREATED: { "en-US": "Onboarding project created", "zh-CN": "已创建准入项目" },
  REJECTED: { "en-US": "Rejected", "zh-CN": "已拒绝" },
  ON_HOLD: { "en-US": "On hold", "zh-CN": "已搁置" }
};

const queueCopy: Record<
  MediaEcosystemOperationalQueueKey,
  Record<AppLocale, { label: string; nextAction: string }>
> = {
  ALL: {
    "en-US": { label: "All opportunities", nextAction: "Review the complete ecosystem opportunity backlog." },
    "zh-CN": { label: "全部机会", nextAction: "查看并处理完整的媒体生态机会池。" }
  },
  NEEDS_REVIEW: {
    "en-US": { label: "Needs review", nextAction: "Confirm source quality before scoring or outreach." },
    "zh-CN": { label: "待复核", nextAction: "评分或外联前，先确认来源质量。" }
  },
  NEEDS_OWNER: {
    "en-US": { label: "Needs owner", nextAction: "Assign an accountable operator before moving the opportunity." },
    "zh-CN": { label: "待分配负责人", nextAction: "推进机会前，先分配明确的业务负责人。" }
  },
  READY_TO_SCORE: {
    "en-US": { label: "Ready to score", nextAction: "Apply the 100-point priority model." },
    "zh-CN": { label: "待评分", nextAction: "应用 100 分优先级评分模型。" }
  },
  OUTREACH_PIPELINE: {
    "en-US": { label: "Outreach pipeline", nextAction: "Drive contact, meeting, qualification and feasibility proof." },
    "zh-CN": { label: "外联推进中", nextAction: "推进联系、会议、商务验证和技术可行性证明。" }
  },
  TRUSTED_GATE: {
    "en-US": { label: "Trusted gate", nextAction: "Convert qualified opportunities into trusted supply candidates." },
    "zh-CN": { label: "可信供给准入", nextAction: "将满足条件的机会转为可信供给候选。" }
  },
  WATCHLIST: {
    "en-US": { label: "Watchlist", nextAction: "Resolve low score, on-hold or elevated-risk blockers." },
    "zh-CN": { label: "关注清单", nextAction: "处理低分、搁置或高风险阻塞项。" }
  }
};

export function getEcosystemTrackLabel(track: MediaEcosystemTrack, locale: AppLocale) {
  return trackLabels[track][locale];
}

export function getEcosystemStageLabel(stage: MediaExpansionStage, locale: AppLocale) {
  return stageLabels[stage][locale];
}

export function getEcosystemDataQualityLabel(
  quality: MediaEcosystemLead["data_quality_level"],
  locale: AppLocale
) {
  const labels: Record<MediaEcosystemLead["data_quality_level"], Record<AppLocale, string>> = {
    SEED_ONLY: { "en-US": "Seed only", "zh-CN": "仅种子数据" },
    MANUAL_REVIEWED: { "en-US": "Manual reviewed", "zh-CN": "已人工复核" },
    OPERATOR_CONFIRMED: { "en-US": "Operator confirmed", "zh-CN": "运营已确认" },
    SOURCE_VERIFIED: { "en-US": "Source verified", "zh-CN": "来源已验证" }
  };
  return labels[quality][locale];
}

export function getEcosystemVerificationLabel(
  status: MediaEcosystemLead["verification_status"],
  locale: AppLocale
) {
  const labels: Record<MediaEcosystemLead["verification_status"], Record<AppLocale, string>> = {
    UNVERIFIED: { "en-US": "Unverified", "zh-CN": "未验证" },
    IN_REVIEW: { "en-US": "In review", "zh-CN": "复核中" },
    VERIFIED: { "en-US": "Verified", "zh-CN": "已验证" },
    REJECTED: { "en-US": "Rejected", "zh-CN": "已拒绝" }
  };
  return labels[status][locale];
}

export function getEcosystemCandidateStatusLabel(status: TrustedSupplyCandidate["status"], locale: AppLocale) {
  const labels: Record<TrustedSupplyCandidate["status"], Record<AppLocale, string>> = {
    candidate: { "en-US": "Candidate", "zh-CN": "候选评估" },
    readiness_started: { "en-US": "Readiness started", "zh-CN": "准入准备中" },
    technical_review_passed: { "en-US": "Technical review passed", "zh-CN": "技术评估已通过" },
    onboarding_ready: { "en-US": "Onboarding ready", "zh-CN": "准入就绪" },
    onboarding_project_created: { "en-US": "Onboarding project created", "zh-CN": "已创建准入项目" },
    rejected: { "en-US": "Rejected", "zh-CN": "已拒绝" }
  };
  return labels[status][locale];
}

export function getEcosystemBlockerLabel(blocker: string, locale: AppLocale) {
  const labels: Record<string, Record<AppLocale, string>> = {
    seed_only_requires_manual_review: { "en-US": "Manual source review is required", "zh-CN": "需要完成人工来源复核" },
    priority_score_below_70: { "en-US": "Priority score is below 70", "zh-CN": "优先级评分低于 70" },
    media_contact_missing: { "en-US": "Media contact is not confirmed", "zh-CN": "尚未确认媒体联系人" },
    business_interest_missing: { "en-US": "Business interest is not confirmed", "zh-CN": "尚未确认商务意向" },
    ad_inventory_missing: { "en-US": "Ad inventory is not identified", "zh-CN": "尚未识别广告库存" },
    integration_impossible: { "en-US": "Integration is marked impossible", "zh-CN": "接入可行性被标记为不可行" },
    media_director_approval_missing: { "en-US": "Media director approval is required", "zh-CN": "需要媒体总监批准" }
  };
  return labels[blocker]?.[locale] ?? blocker;
}

export function getEcosystemQueueCopy(queue: MediaEcosystemOperationalQueueKey, locale: AppLocale) {
  return queueCopy[queue][locale];
}

export function getEcosystemGapCopy(gapLevel: "covered" | "watch" | "gap", locale: AppLocale) {
  const copy = {
    covered: {
      "en-US": { label: "Covered", nextAction: "Monitor candidate conversion quality." },
      "zh-CN": { label: "已有覆盖", nextAction: "持续监控候选供给的转化质量。" }
    },
    watch: {
      "en-US": { label: "Watch", nextAction: "Confirm contact, interest, inventory and feasibility." },
      "zh-CN": { label: "重点推进", nextAction: "确认联系人、商务意向、库存和接入可行性。" }
    },
    gap: {
      "en-US": { label: "Gap", nextAction: "Map direct media targets before adding outreach workload." },
      "zh-CN": { label: "赛道缺口", nextAction: "先补充直接媒体目标，再增加外联任务。" }
    }
  } as const;

  return copy[gapLevel][locale];
}

export function getEcosystemPrimaryAction(
  lead: MediaEcosystemLead | undefined,
  candidate: TrustedSupplyCandidate | undefined,
  handoffConfirmed = false
): EcosystemPrimaryAction | undefined {
  if (!lead) {
    return undefined;
  }

  if (!lead.owner_user_id) {
    return "claimOwner";
  }

  if (lead.review_required || lead.data_quality_level === "SEED_ONLY") {
    return "markReviewed";
  }

  if (lead.priority_score === 0) {
    return "priorityScreen";
  }

  if (!lead.media_contact_confirmed) {
    return "recordContact";
  }

  if (
    !lead.business_interest_confirmed ||
    !lead.ad_inventory_identified ||
    lead.integration_feasibility === "unknown" ||
    lead.integration_feasibility === "needs_work"
  ) {
    return "qualify";
  }

  if (!lead.media_director_approved_at) {
    return "approveGate";
  }

  if (!candidate) {
    return "trustedCandidate";
  }

  if (candidate.status === "candidate") {
    return "startReadiness";
  }

  if (candidate.status === "readiness_started") {
    return "techReview";
  }

  if (candidate.status === "technical_review_passed") {
    return "commercialReview";
  }

  if (candidate.status === "onboarding_ready") {
    return "onboardingProject";
  }

  if (candidate.status === "onboarding_project_created" && !handoffConfirmed) {
    return "confirmHandoff";
  }

  return undefined;
}
