import type { AppLocale } from "../../lib/i18n";
import type {
  MediaSupplyPackage,
  MediaTrustProfile,
  Publisher,
  PublisherAdSlot,
  PublisherContact,
  PublisherContractTerm
} from "../../types/domain";

export type PublisherWorkspaceView = "readiness" | "trusted" | "evidence";

export type PublisherPrimaryAction =
  | "editProfile"
  | "addSlot"
  | "addTerm"
  | "openIntegration"
  | "openTest"
  | "evaluateTrust"
  | "confirmPool"
  | "createPackage"
  | "activatePackage";

export type PublisherReadinessStepKey = "profile" | "technical" | "commercial" | "trusted" | "supply";
export type PublisherReadinessState = "complete" | "active" | "blocked" | "pending";

export type PublisherReadinessStep = {
  key: PublisherReadinessStepKey;
  state: PublisherReadinessState;
};

type PublisherReadinessInput = {
  publisher: Publisher;
  contacts: PublisherContact[];
  adSlots: PublisherAdSlot[];
  contractTerms: PublisherContractTerm[];
  trustProfile?: MediaTrustProfile;
  packages: MediaSupplyPackage[];
};

function hasPublisherIdentityAndTraffic(input: PublisherReadinessInput) {
  const publisher = input.publisher;
  return Boolean(
    publisher.name.trim() &&
      publisher.legal_entity?.trim() &&
      publisher.metadata?.property_name?.trim() &&
      publisher.metadata?.property_identifier?.trim() &&
      publisher.daily_active_users &&
      publisher.daily_requests &&
      input.contacts.length > 0
  );
}

export function getPublisherReadinessSteps(input: PublisherReadinessInput): PublisherReadinessStep[] {
  const publisher = input.publisher;
  const profileComplete =
    hasPublisherIdentityAndTraffic(input) && input.adSlots.length > 0 && input.contractTerms.length > 0;
  const technicalState: PublisherReadinessState =
    input.publisher.technical_live_status === "technical_live_passed"
      ? "complete"
      : input.publisher.technical_live_status === "technical_blocked"
        ? "blocked"
        : ["in_integration", "technical_review"].includes(input.publisher.technical_live_status)
          ? "active"
          : "pending";
  const commercialState: PublisherReadinessState =
    input.publisher.commercial_test_status === "test_passed"
      ? "complete"
      : input.publisher.commercial_test_status === "test_failed"
        ? "blocked"
        : ["ready_for_test", "testing"].includes(input.publisher.commercial_test_status)
          ? "active"
          : "pending";
  const trustedState: PublisherReadinessState = input.trustProfile?.confirmed_pool
    ? "complete"
    : input.trustProfile
      ? "active"
      : "pending";
  const supplyState: PublisherReadinessState = input.packages.some((item) => item.status === "active")
    ? "complete"
    : input.packages.length > 0
      ? "active"
      : "pending";

  return [
    { key: "profile", state: profileComplete ? "complete" : "active" },
    { key: "technical", state: technicalState },
    { key: "commercial", state: commercialState },
    { key: "trusted", state: trustedState },
    { key: "supply", state: supplyState }
  ];
}

export function getPublisherPrimaryAction(input: PublisherReadinessInput): PublisherPrimaryAction | undefined {
  if (!hasPublisherIdentityAndTraffic(input)) {
    return "editProfile";
  }

  if (input.adSlots.length === 0) {
    return "addSlot";
  }

  if (input.contractTerms.length === 0) {
    return "addTerm";
  }

  if (input.publisher.technical_live_status !== "technical_live_passed") {
    return "openIntegration";
  }

  if (input.publisher.commercial_test_status !== "test_passed") {
    return "openTest";
  }

  if (!input.trustProfile) {
    return "evaluateTrust";
  }

  if (!input.trustProfile.confirmed_pool) {
    return "confirmPool";
  }

  if (input.packages.length === 0) {
    return "createPackage";
  }

  if (input.packages.some((item) => item.status === "draft")) {
    return "activatePackage";
  }

  return undefined;
}

export function getPublisherStatusLabel(status: string, locale: AppLocale) {
  const labels: Record<string, Record<AppLocale, string>> = {
    draft: { "en-US": "Draft", "zh-CN": "草稿" },
    pending_integration: { "en-US": "Pending integration", "zh-CN": "待技术接入" },
    in_integration: { "en-US": "In integration", "zh-CN": "技术接入中" },
    technical_review: { "en-US": "Technical review", "zh-CN": "技术评审中" },
    technical_live_passed: { "en-US": "Technical live passed", "zh-CN": "技术上线已通过" },
    technical_blocked: { "en-US": "Technical blocked", "zh-CN": "技术已阻塞" },
    deprecated: { "en-US": "Deprecated", "zh-CN": "已停用" },
    not_started: { "en-US": "Not started", "zh-CN": "未开始" },
    ready_for_test: { "en-US": "Ready for test", "zh-CN": "待商业测试" },
    testing: { "en-US": "Testing", "zh-CN": "测试中" },
    test_passed: { "en-US": "Test passed", "zh-CN": "测试已通过" },
    test_failed: { "en-US": "Test failed", "zh-CN": "测试未通过" },
    not_allowed: { "en-US": "Not allowed", "zh-CN": "暂不可售" },
    limited_sellable: { "en-US": "Limited sellable", "zh-CN": "限量可售" },
    proposal_selectable: { "en-US": "Proposal selectable", "zh-CN": "提案可选" },
    scale_ready: { "en-US": "Scale ready", "zh-CN": "规模化就绪" },
    scale_blocked: { "en-US": "Scale blocked", "zh-CN": "规模化受阻" },
    paused: { "en-US": "Paused", "zh-CN": "已暂停" },
    active: { "en-US": "Active", "zh-CN": "已激活" },
    not_evaluated: { "en-US": "Not evaluated", "zh-CN": "尚未评估" },
    evaluated: { "en-US": "Evaluated", "zh-CN": "已评估" },
    confirmed: { "en-US": "Confirmed", "zh-CN": "已确认" },
    monitoring: { "en-US": "Monitoring", "zh-CN": "监控中" },
    healthy: { "en-US": "Healthy", "zh-CN": "健康" },
    watch: { "en-US": "Watch", "zh-CN": "关注" },
    at_risk: { "en-US": "At risk", "zh-CN": "存在风险" },
    suspended: { "en-US": "Suspended", "zh-CN": "已暂停" },
    opportunity: { "en-US": "Opportunity pool", "zh-CN": "机会池" },
    test: { "en-US": "Test pool", "zh-CN": "测试池" },
    core: { "en-US": "Core pool", "zh-CN": "核心池" },
    risk: { "en-US": "Risk pool", "zh-CN": "风险池" },
    retired: { "en-US": "Retired", "zh-CN": "已退役" }
  };

  return labels[status]?.[locale] ?? status;
}

export function getPublisherRiskLabel(risk: Publisher["risk_level"], locale: AppLocale) {
  const labels: Record<Publisher["risk_level"], Record<AppLocale, string>> = {
    low: { "en-US": "Low", "zh-CN": "低" },
    medium: { "en-US": "Medium", "zh-CN": "中" },
    high: { "en-US": "High", "zh-CN": "高" },
    critical: { "en-US": "Critical", "zh-CN": "严重" }
  };
  return labels[risk][locale];
}
