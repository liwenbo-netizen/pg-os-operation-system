import type { RoleCode } from "../constants/roles";
import type { GuardResult } from "../types/guards";
import type {
  AuditEvent,
  BusinessUser,
  EntityId,
  IntegrationAdFormat,
  IntegrationCheckResult,
  IntegrationCheckStatus,
  IntegrationPlatform,
  IntegrationPlaybookCode,
  IntegrationPrivacyProfile,
  IntegrationProjectProfile,
  MediaOnboardingStage,
  MediaWorkflowState,
  ModuleBusinessEvent
} from "../types/domain";
import { auditService } from "./auditService";
import { rbacService } from "./rbacService";
import { rlsService } from "./rlsService";

export type IntegrationPlaybookDefinition = {
  code: IntegrationPlaybookCode;
  name: string;
  nameZh: string;
  vendor: string;
  version: string;
  platform: IntegrationPlatform;
  kind: "origin_ads" | "origin_ivt" | "direct_ads" | "mediation";
  source: string;
};

export type IntegrationChecklistTemplate = {
  code: string;
  stage: Extract<MediaOnboardingStage, "TECHNICAL_QUALIFICATION" | "SDK_INTEGRATION">;
  category: string;
  title: string;
  titleZh: string;
  ownerRole: RoleCode;
  responsibleParty: "MEDIA_ENGINEERING" | "PG_OS";
  required: boolean;
  blocking: boolean;
  appliesTo: "COMMON" | "ADS" | "DIRECT_ADS" | "MEDIATION" | "BIDDING" | "ORIGIN_ADS" | "ORIGIN_IVT";
};

export type IntegrationProjectProfileInput = {
  platform: IntegrationPlatform;
  propertyIdentifier: string;
  playbookCodes: IntegrationPlaybookCode[];
  minSdk?: number;
  targetSdk?: number;
  compileSdk?: number;
  agpVersion?: string;
  gradleVersion?: string;
  language?: IntegrationProjectProfile["language"];
  processModel?: IntegrationProjectProfile["process_model"];
  mediaEngineeringContact: string;
  plannedFormats: IntegrationAdFormat[];
  privacyProfile: IntegrationPrivacyProfile;
  targetPilotDate?: string;
  secretReference?: string;
};

export type IntegrationCheckUpdateInput = {
  itemCode: string;
  status: IntegrationCheckStatus;
  evidenceReference?: string;
  blocker?: string;
  waiverReason?: string;
  dueDate?: string;
};

export type SdkIntegrationResult = {
  state: MediaWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

export const integrationPlaybooks: IntegrationPlaybookDefinition[] = [
  {
    code: "origin_ads_android_1_2",
    name: "Origin Ads Android",
    nameZh: "Origin Ads 安卓",
    vendor: "Poly-Gamma",
    version: "1.2.0-development",
    platform: "android",
    kind: "origin_ads",
    source: "Origin Android SDK index.pdf"
  },
  {
    code: "origin_ivt_android_v11",
    name: "Origin IVT Android",
    nameZh: "Origin IVT 安卓",
    vendor: "Poly-Gamma",
    version: "V11",
    platform: "android",
    kind: "origin_ivt",
    source: "Origin IVT SDK Developer Portal V11"
  },
  {
    code: "fangge_android_reference",
    name: "Fangge Android reference",
    nameZh: "方歌安卓参考",
    vendor: "Fangge",
    version: "source-controlled",
    platform: "android",
    kind: "direct_ads",
    source: "Fangge Android SDK guide"
  },
  {
    code: "sigmob_android_reference",
    name: "Sigmob Android reference",
    nameZh: "Sigmob 安卓参考",
    vendor: "Sigmob",
    version: "source-controlled",
    platform: "android",
    kind: "direct_ads",
    source: "Sigmob Android SDK guide"
  },
  {
    code: "tobid_android_reference",
    name: "ToBid Android mediation reference",
    nameZh: "ToBid 安卓聚合参考",
    vendor: "ToBid",
    version: "source-controlled",
    platform: "android",
    kind: "mediation",
    source: "ToBid Android SDK guide"
  },
  {
    code: "beizi_android_reference",
    name: "BeiZi Android reference",
    nameZh: "倍孜安卓参考",
    vendor: "BeiZi",
    version: "source-controlled",
    platform: "android",
    kind: "direct_ads",
    source: "BeiZi Android SDK guide"
  }
];

const checklistTemplates: IntegrationChecklistTemplate[] = [
  {
    code: "TQ-001",
    stage: "TECHNICAL_QUALIFICATION",
    category: "ownership",
    title: "Assign internal integration owner and media engineering contact",
    titleZh: "分配内部集成负责人和媒体研发联系人",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-002",
    stage: "TECHNICAL_QUALIFICATION",
    category: "platform",
    title: "Record Android SDK and build-tool versions",
    titleZh: "记录 Android SDK 与构建工具版本",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-003",
    stage: "TECHNICAL_QUALIFICATION",
    category: "process",
    title: "Confirm main and secondary process architecture",
    titleZh: "确认主进程与辅助进程架构",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-004",
    stage: "TECHNICAL_QUALIFICATION",
    category: "dependencies",
    title: "Review dependency tree, AndroidX, R8, and resource shrinking",
    titleZh: "审核依赖树、AndroidX、R8 与资源压缩",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-005",
    stage: "TECHNICAL_QUALIFICATION",
    category: "playbook",
    title: "Pin SDK playbooks and source versions",
    titleZh: "锁定 SDK Playbook 与来源版本",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-006",
    stage: "TECHNICAL_QUALIFICATION",
    category: "placements",
    title: "Map planned formats to logical placements",
    titleZh: "将计划广告形式映射到逻辑广告位",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "ADS"
  },
  {
    code: "TQ-007",
    stage: "TECHNICAL_QUALIFICATION",
    category: "privacy",
    title: "Complete privacy data-category profile",
    titleZh: "完成隐私数据类别画像",
    ownerRole: "legal_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-008",
    stage: "TECHNICAL_QUALIFICATION",
    category: "consent",
    title: "Confirm consent timing and personalized advertising setting",
    titleZh: "确认授权时序与个性化广告设置",
    ownerRole: "legal_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-009",
    stage: "TECHNICAL_QUALIFICATION",
    category: "testing",
    title: "Define real-device and API-level test matrix",
    titleZh: "定义真机与 API Level 测试矩阵",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "TQ-010",
    stage: "TECHNICAL_QUALIFICATION",
    category: "security",
    title: "Define credential provisioning and secret-manager path",
    titleZh: "定义凭证发放与密钥管理路径",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-001",
    stage: "SDK_INTEGRATION",
    category: "release",
    title: "Record SDK artifact version, source, and SHA-256",
    titleZh: "记录 SDK 产物版本、来源与 SHA-256",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-002",
    stage: "SDK_INTEGRATION",
    category: "dependency",
    title: "Import dependencies and required adapters",
    titleZh: "导入依赖与所需适配器",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-003",
    stage: "SDK_INTEGRATION",
    category: "manifest",
    title: "Configure manifest, providers, network, and permissions",
    titleZh: "配置 Manifest、Provider、网络与权限",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-004",
    stage: "SDK_INTEGRATION",
    category: "obfuscation",
    title: "Apply R8, ProGuard, and resource keep rules",
    titleZh: "应用 R8、ProGuard 与资源保留规则",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-005",
    stage: "SDK_INTEGRATION",
    category: "credentials",
    title: "Bind masked application identity and secret reference",
    titleZh: "绑定脱敏应用标识与密钥引用",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-006",
    stage: "SDK_INTEGRATION",
    category: "initialization",
    title: "Initialize after consent and only in the intended process",
    titleZh: "在授权后且仅在目标进程初始化",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-007",
    stage: "SDK_INTEGRATION",
    category: "privacy",
    title: "Implement selected identifier and privacy controls",
    titleZh: "实施选定的标识符与隐私控制",
    ownerRole: "legal_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-008",
    stage: "SDK_INTEGRATION",
    category: "logging",
    title: "Capture test diagnostics and define production log shutdown",
    titleZh: "采集测试诊断并定义生产日志关闭规则",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  },
  {
    code: "SDK-009",
    stage: "SDK_INTEGRATION",
    category: "formats",
    title: "Implement every planned ad format and lifecycle",
    titleZh: "实现所有计划广告形式与生命周期",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "ADS"
  },
  {
    code: "SDK-010",
    stage: "SDK_INTEGRATION",
    category: "callbacks",
    title: "Implement load, render, show, impression, click, close, and error callbacks",
    titleZh: "实现加载、渲染、展示、曝光、点击、关闭与错误回调",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "ADS"
  },
  {
    code: "SDK-011",
    stage: "SDK_INTEGRATION",
    category: "origin_ads",
    title: "Use one Origin placement ID per logical placement",
    titleZh: "每个逻辑广告位使用唯一 Origin Placement ID",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "ORIGIN_ADS"
  },
  {
    code: "SDK-012",
    stage: "SDK_INTEGRATION",
    category: "direct_ads",
    title: "Verify vendor AppId, key, slot, and callback mapping",
    titleZh: "核验厂商 AppId、密钥、广告位与回调映射",
    ownerRole: "integration_manager",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "DIRECT_ADS"
  },
  {
    code: "SDK-013",
    stage: "SDK_INTEGRATION",
    category: "mediation",
    title: "Configure each network adapter and placement mapping",
    titleZh: "配置每个广告网络适配器与广告位映射",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "MEDIATION"
  },
  {
    code: "SDK-014",
    stage: "SDK_INTEGRATION",
    category: "mediation",
    title: "Verify privacy propagation and channel fallback behavior",
    titleZh: "核验隐私透传与渠道降级行为",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "MEDIATION"
  },
  {
    code: "SDK-015",
    stage: "SDK_INTEGRATION",
    category: "bidding",
    title: "Document eCPM units and implement idempotent win/loss notification",
    titleZh: "明确 eCPM 单位并实现幂等竞胜/竞败回传",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "BIDDING"
  },
  {
    code: "SDK-016",
    stage: "SDK_INTEGRATION",
    category: "ivt",
    title: "Enable Origin antifraud capability and preserve three-state semantics",
    titleZh: "启用 Origin 反作弊能力并保持三态语义",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "ORIGIN_IVT"
  },
  {
    code: "SDK-017",
    stage: "SDK_INTEGRATION",
    category: "ivt",
    title: "Verify offline recovery, multiprocess behavior, and recheck schedule",
    titleZh: "核验离线恢复、多进程行为与复检调度",
    ownerRole: "data_analyst",
    responsibleParty: "PG_OS",
    required: true,
    blocking: true,
    appliesTo: "ORIGIN_IVT"
  },
  {
    code: "SDK-018",
    stage: "SDK_INTEGRATION",
    category: "build",
    title: "Produce a test build with version, hash, and release notes",
    titleZh: "产出包含版本、Hash 与发布说明的测试包",
    ownerRole: "integration_manager",
    responsibleParty: "MEDIA_ENGINEERING",
    required: true,
    blocking: true,
    appliesTo: "COMMON"
  }
];

const oversightRoles = new Set<RoleCode>(["integration_manager", "media_director", "operations_director"]);
const secretReferencePattern = /^(vault|secret|env|vercel|supabase):\/\/[a-z0-9/_-]+$/i;

function allowed(message: string, reasonCode: string): GuardResult {
  return {
    allowed: true,
    severity: "info",
    reason_code: reasonCode,
    message,
    audit_required: true
  };
}

function blocked(message: string, reasonCode: string, requiredRole?: RoleCode): GuardResult {
  return {
    allowed: false,
    severity: "blocked",
    reason_code: reasonCode,
    message,
    required_approval_role: requiredRole,
    audit_required: true
  };
}

function appendEvents(
  state: MediaWorkflowState,
  user: BusinessUser,
  action: string,
  publisherId: EntityId | undefined,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent,
  metadata?: Record<string, unknown>
) {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "publisher", guard, publisherId, metadata);
  const nextState: MediaWorkflowState = {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };

  return { nextState, auditEvent };
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

function selectedPlaybooks(profile?: IntegrationProjectProfile) {
  const selected = new Set(profile?.playbook_codes ?? []);
  return integrationPlaybooks.filter((playbook) => selected.has(playbook.code));
}

function appliesToProfile(template: IntegrationChecklistTemplate, profile?: IntegrationProjectProfile) {
  if (template.appliesTo === "COMMON") return true;

  const selected = selectedPlaybooks(profile);
  const kinds = new Set(selected.map((playbook) => playbook.kind));

  if (template.appliesTo === "ADS") return selected.some((playbook) => playbook.kind !== "origin_ivt");
  if (template.appliesTo === "DIRECT_ADS") return kinds.has("direct_ads");
  if (template.appliesTo === "MEDIATION") return kinds.has("mediation");
  if (template.appliesTo === "ORIGIN_ADS") return kinds.has("origin_ads");
  if (template.appliesTo === "ORIGIN_IVT") return kinds.has("origin_ivt");
  if (template.appliesTo === "BIDDING") {
    return selected.some((playbook) =>
      ["fangge_android_reference", "tobid_android_reference", "beizi_android_reference"].includes(playbook.code)
    );
  }

  return false;
}

function profileIssues(input: IntegrationProjectProfileInput) {
  const issues: string[] = [];
  const hasAdsPlaybook = input.playbookCodes.some(
    (code) => integrationPlaybooks.find((playbook) => playbook.code === code)?.kind !== "origin_ivt"
  );

  if (!input.propertyIdentifier.trim()) issues.push("Media property package or platform identifier is required.");
  if (input.playbookCodes.length === 0) issues.push("Select at least one SDK playbook.");
  if (!input.mediaEngineeringContact.trim()) issues.push("Media engineering contact is required.");
  if (input.platform !== "other" && (!input.minSdk || !input.targetSdk || !input.compileSdk)) {
    issues.push("Android minSdk, targetSdk, and compileSdk are required.");
  }
  if (input.privacyProfile.consent_before_init !== true) {
    issues.push("Consent-before-initialization must be confirmed.");
  }
  if (hasAdsPlaybook && input.plannedFormats.length === 0) {
    issues.push("Select at least one planned ad format for an advertising playbook.");
  }
  if (input.secretReference?.trim() && !secretReferencePattern.test(input.secretReference.trim())) {
    issues.push("Secret values are forbidden. Use a vault://, secret://, env://, vercel://, or supabase:// reference.");
  }

  return issues;
}

function profileFromInput(
  projectId: EntityId,
  user: BusinessUser,
  input: IntegrationProjectProfileInput,
  existing?: IntegrationProjectProfile
): IntegrationProjectProfile {
  const now = new Date().toISOString();
  return {
    id: existing?.id ?? crypto.randomUUID(),
    integration_project_id: projectId,
    platform: input.platform,
    property_identifier: input.propertyIdentifier.trim(),
    playbook_codes: [...new Set(input.playbookCodes)],
    min_sdk: input.minSdk,
    target_sdk: input.targetSdk,
    compile_sdk: input.compileSdk,
    agp_version: input.agpVersion?.trim() || undefined,
    gradle_version: input.gradleVersion?.trim() || undefined,
    language: input.language,
    process_model: input.processModel,
    media_engineering_contact: input.mediaEngineeringContact.trim(),
    planned_formats: [...new Set(input.plannedFormats)],
    privacy_profile: { ...input.privacyProfile },
    target_pilot_date: input.targetPilotDate || undefined,
    secret_reference: input.secretReference?.trim() || undefined,
    created_by: existing?.created_by ?? user.id,
    updated_by: user.id,
    created_at: existing?.created_at ?? now,
    updated_at: now
  };
}

function profileToInput(profile: IntegrationProjectProfile): IntegrationProjectProfileInput {
  return {
    platform: profile.platform,
    propertyIdentifier: profile.property_identifier,
    playbookCodes: profile.playbook_codes,
    minSdk: profile.min_sdk,
    targetSdk: profile.target_sdk,
    compileSdk: profile.compile_sdk,
    agpVersion: profile.agp_version,
    gradleVersion: profile.gradle_version,
    language: profile.language,
    processModel: profile.process_model,
    mediaEngineeringContact: profile.media_engineering_contact,
    plannedFormats: profile.planned_formats,
    privacyProfile: profile.privacy_profile,
    targetPilotDate: profile.target_pilot_date,
    secretReference: profile.secret_reference
  };
}

export function integrationChecklistForProfile(profile?: IntegrationProjectProfile) {
  return checklistTemplates.filter((template) => appliesToProfile(template, profile));
}

export function incompleteIntegrationChecks(
  state: MediaWorkflowState,
  projectId: EntityId,
  profile?: IntegrationProjectProfile
) {
  const resultByCode = new Map(
    state.integrationCheckResults
      .filter((result) => result.integration_project_id === projectId)
      .map((result) => [result.item_code, result])
  );

  return integrationChecklistForProfile(profile).filter((template) => {
    const status = resultByCode.get(template.code)?.status ?? "not_started";
    return template.blocking && !["passed", "waived"].includes(status);
  });
}

export class SdkIntegrationService {
  getWorkspaceSnapshot(state: MediaWorkflowState, publisherId: EntityId) {
    const publisher = state.publishers.find((item) => item.id === publisherId);
    const project = state.integrationProjects.find((item) => item.publisher_id === publisherId);
    const profile = project
      ? state.integrationProjectProfiles.find((item) => item.integration_project_id === project.id)
      : undefined;
    const results = project
      ? state.integrationCheckResults.filter((item) => item.integration_project_id === project.id)
      : [];
    const resultByCode = new Map(results.map((result) => [result.item_code, result]));
    const items = integrationChecklistForProfile(profile).map((template) => ({
      template,
      result: resultByCode.get(template.code),
      status: resultByCode.get(template.code)?.status ?? ("not_started" as const)
    }));
    const passed = items.filter((item) => ["passed", "waived"].includes(item.status)).length;
    const blockedCount = items.filter((item) => item.status === "blocked" || item.status === "failed").length;
    const nextBlockingItem = items.find(
      (item) => item.template.blocking && !["passed", "waived"].includes(item.status)
    );
    const profileValidationIssues = profile ? profileIssues(profileToInput(profile)) : ["Technical profile is not configured."];

    return {
      publisher,
      project,
      profile,
      selectedPlaybooks: selectedPlaybooks(profile),
      availablePlaybooks: integrationPlaybooks,
      items,
      passed,
      total: items.length,
      blockedCount,
      profileComplete: profileValidationIssues.length === 0,
      profileValidationIssues,
      nextBlockingItem,
      stageGates: state.mediaOnboardingStageGates.filter(
        (gate) =>
          gate.lifecycle_object_type === "publisher" &&
          gate.lifecycle_object_id === publisherId &&
          ["TECHNICAL_QUALIFICATION", "SDK_INTEGRATION"].includes(gate.stage)
      )
    };
  }

  saveProjectProfile(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    input: IntegrationProjectProfileInput
  ): SdkIntegrationResult {
    const project = state.integrationProjects.find((item) => item.publisher_id === publisherId);
    if (!project) {
      const guard = blocked("Integration project was not found.", "NOT_FOUND");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.profile.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (!rlsService.canWriteTable(user, "integration_project_profiles")) {
      const guard = blocked(
        "Current role cannot update the integration profile.",
        "INTEGRATION_PROFILE_FORBIDDEN",
        "integration_manager"
      );
      const { nextState, auditEvent } = appendEvents(state, user, "integration.profile.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }

    const issues = profileIssues(input);
    if (issues.length > 0) {
      const guard = blocked(issues.join(" "), "INTEGRATION_PROFILE_INCOMPLETE", "integration_manager");
      const { nextState, auditEvent } = appendEvents(
        state,
        user,
        "integration.profile.update",
        publisherId,
        guard,
        undefined,
        { issueCount: issues.length }
      );
      return { state: nextState, guard, auditEvent };
    }

    const existing = state.integrationProjectProfiles.find((item) => item.integration_project_id === project.id);
    const profile = profileFromInput(project.id, user, input, existing);
    const withProfile: MediaWorkflowState = {
      ...state,
      integrationProjectProfiles: [
        profile,
        ...state.integrationProjectProfiles.filter((item) => item.integration_project_id !== project.id)
      ]
    };
    const nextMissing = incompleteIntegrationChecks(withProfile, project.id, profile)[0];
    const nextState: MediaWorkflowState = {
      ...withProfile,
      integrationProjects: withProfile.integrationProjects.map((item) =>
        item.id === project.id
          ? {
              ...item,
              next_action: nextMissing
                ? `Complete checklist item ${nextMissing.code}: ${nextMissing.title}`
                : "Detailed integration checklist is complete. Record summary evidence."
            }
          : item
      )
    };
    const guard = allowed("Integration profile saved.", "INTEGRATION_PROFILE_UPDATED");
    const event = businessEvent("integration.profile_updated", publisherId, user.activeRole, {
      integrationProjectId: project.id,
      playbookCodes: profile.playbook_codes,
      plannedFormats: profile.planned_formats
    });
    const appended = appendEvents(
      nextState,
      user,
      "integration.profile.update",
      publisherId,
      guard,
      event,
      { integrationProjectId: project.id, playbookCount: profile.playbook_codes.length }
    );

    return { state: appended.nextState, guard, auditEvent: appended.auditEvent, businessEvent: event };
  }

  updateCheckResult(
    state: MediaWorkflowState,
    user: BusinessUser,
    publisherId: EntityId,
    input: IntegrationCheckUpdateInput
  ): SdkIntegrationResult {
    const project = state.integrationProjects.find((item) => item.publisher_id === publisherId);
    const profile = project
      ? state.integrationProjectProfiles.find((item) => item.integration_project_id === project.id)
      : undefined;
    if (!project || !profile) {
      const guard = blocked("Save the integration profile before executing the checklist.", "INTEGRATION_PROFILE_REQUIRED");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }

    const template = integrationChecklistForProfile(profile).find((item) => item.code === input.itemCode);
    if (!template) {
      const guard = blocked("Checklist item is not part of the selected playbooks.", "INTEGRATION_CHECK_NOT_FOUND");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (
      !rlsService.canWriteTable(user, "integration_check_results") ||
      (!oversightRoles.has(user.activeRole) && user.activeRole !== template.ownerRole)
    ) {
      const guard = blocked(
        "Current role cannot update this checklist item.",
        "INTEGRATION_CHECK_FORBIDDEN",
        template.ownerRole
      );
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (input.status === "passed" && template.blocking && !input.evidenceReference?.trim()) {
      const guard = blocked("Blocking checklist items require evidence before passing.", "INTEGRATION_CHECK_EVIDENCE_REQUIRED");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (["blocked", "failed"].includes(input.status) && !input.blocker?.trim()) {
      const guard = blocked("Blocked or failed checklist items require a concrete reason.", "INTEGRATION_CHECK_BLOCKER_REQUIRED");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }
    if (input.status === "waived" && !input.waiverReason?.trim()) {
      const guard = blocked("Waived checklist items require an approved reason.", "INTEGRATION_CHECK_WAIVER_REQUIRED");
      const { nextState, auditEvent } = appendEvents(state, user, "integration.check.update", publisherId, guard);
      return { state: nextState, guard, auditEvent };
    }

    const existing = state.integrationCheckResults.find(
      (item) => item.integration_project_id === project.id && item.item_code === template.code
    );
    const now = new Date().toISOString();
    const result: IntegrationCheckResult = {
      id: existing?.id ?? crypto.randomUUID(),
      integration_project_id: project.id,
      item_code: template.code,
      status: input.status,
      owner_role: template.ownerRole,
      responsible_party: template.responsibleParty,
      due_date: input.dueDate || existing?.due_date,
      evidence_reference: input.evidenceReference?.trim() || existing?.evidence_reference,
      blocker: input.blocker?.trim() || undefined,
      waiver_reason: input.waiverReason?.trim() || undefined,
      updated_by: user.id,
      created_at: existing?.created_at ?? now,
      updated_at: now
    };
    const withResult: MediaWorkflowState = {
      ...state,
      integrationCheckResults: [
        result,
        ...state.integrationCheckResults.filter(
          (item) => !(item.integration_project_id === project.id && item.item_code === template.code)
        )
      ]
    };
    const remaining = incompleteIntegrationChecks(withResult, project.id, profile);
    const blockedResults = withResult.integrationCheckResults.filter(
      (item) => item.integration_project_id === project.id && ["blocked", "failed"].includes(item.status)
    );
    const nextState: MediaWorkflowState = {
      ...withResult,
      integrationProjects: withResult.integrationProjects.map((item) =>
        item.id === project.id
          ? {
              ...item,
              status: blockedResults.length > 0 ? "technical_blocked" : item.status === "technical_blocked" ? "in_integration" : item.status,
              blocker:
                blockedResults.length > 0
                  ? `[${blockedResults[0].item_code}] ${blockedResults[0].blocker ?? "Checklist item blocked"}`
                  : item.blocker?.startsWith("[")
                    ? undefined
                    : item.blocker,
              next_action: remaining[0]
                ? `Complete checklist item ${remaining[0].code}: ${remaining[0].title}`
                : "Detailed integration checklist is complete. Record summary evidence."
            }
          : item
      )
    };
    const guard = allowed("Integration checklist item updated.", "INTEGRATION_CHECK_UPDATED");
    const event = businessEvent("integration.check_updated", publisherId, user.activeRole, {
      integrationProjectId: project.id,
      itemCode: template.code,
      status: result.status
    });
    const appended = appendEvents(
      nextState,
      user,
      "integration.check.update",
      publisherId,
      guard,
      event,
      { integrationProjectId: project.id, itemCode: template.code, status: result.status }
    );

    return { state: appended.nextState, guard, auditEvent: appended.auditEvent, businessEvent: event };
  }

  canManageProfile(user: BusinessUser) {
    return rlsService.canWriteTable(user, "integration_project_profiles");
  }

  canManageCheck(user: BusinessUser, ownerRole: RoleCode) {
    return (
      rlsService.canWriteTable(user, "integration_check_results") &&
      (oversightRoles.has(user.activeRole) || user.activeRole === ownerRole)
    );
  }

  canManageExecution(user: BusinessUser) {
    return (
      rlsService.canWriteTable(user, "integration_projects") &&
      rbacService.hasCapability(user, "integration.manage")
    );
  }

  canSubmitReadiness(user: BusinessUser) {
    return rbacService.hasAnyRole(user, ["media_director", "operations_director"]);
  }

  hasIntegrationCapability(user: BusinessUser) {
    return rbacService.hasCapability(user, "integration.manage");
  }
}

export const sdkIntegrationService = new SdkIntegrationService();
