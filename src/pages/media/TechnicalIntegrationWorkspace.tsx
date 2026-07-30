import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  FileCheck2,
  Handshake,
  KeyRound,
  ListChecks,
  LockKeyhole,
  Play,
  Save,
  ShieldCheck,
  Users,
  Wrench
} from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { getRoleDisplayName, useLocale } from "../../lib/i18n";
import {
  integrationEvidenceDefinitions,
  mediaWorkflowService
} from "../../services/mediaWorkflowService";
import {
  integrationChannels,
  integrationModes,
  integrationProtocols,
  integrationProfileIssues,
  integrationRouteIssues,
  getIntegrationCheckGuidance,
  getIntegrationGateExecutionContract,
  recommendedIntegrationMode,
  sdkIntegrationService,
  type IntegrationCheckUpdateInput,
  type IntegrationProjectProfileInput,
  type IntegrationWorkflowPhaseIndex
} from "../../services/sdkIntegrationService";
import type {
  BusinessUser,
  IntegrationAdFormat,
  IntegrationCapabilityProfile,
  IntegrationEvidenceType,
  IntegrationPlaybookCode,
  IntegrationProtocol,
  MediaWorkflowState,
  Publisher
} from "../../types/domain";

type TechnicalIntegrationWorkspaceProps = {
  publisher: Publisher;
  state: MediaWorkflowState;
  user: BusinessUser;
  initialCheckCode?: string;
  onSaveProfile: (input: IntegrationProjectProfileInput) => void;
  onUpdateCheck: (input: IntegrationCheckUpdateInput) => void;
  onStart: () => void;
  onRecordEvidence: (input: {
    evidenceType: IntegrationEvidenceType;
    title: string;
    reference: string;
  }) => void;
  onSetBlocker: (blocker: string) => void;
  onResolveBlocker: () => void;
  onSubmit: () => void;
  onAcceptHandoff: () => void;
  onRequestHandoffChanges: (feedback: string) => void;
};

const adFormats: IntegrationAdFormat[] = [
  "splash",
  "interstitial",
  "rewarded",
  "native",
  "banner",
  "display"
];

function createProfileDraft(
  publisher: Publisher,
  state: MediaWorkflowState
): IntegrationProjectProfileInput {
  const project = state.integrationProjects.find((item) => item.publisher_id === publisher.id);
  const profile = project
    ? state.integrationProjectProfiles.find((item) => item.integration_project_id === project.id)
    : undefined;
  const primaryContact = state.publisherContacts.find(
    (contact) => contact.publisher_id === publisher.id && contact.is_primary
  );

  if (profile) {
    return {
      platform: profile.platform,
      trafficChannel: profile.traffic_channel,
      integrationMode: profile.integration_mode,
      protocolCodes: profile.protocol_codes,
      capabilityProfile: { ...profile.capability_profile },
      propertyIdentifier: profile.property_identifier,
      playbookCodes: profile.playbook_codes,
      minSdk: profile.min_sdk,
      targetSdk: profile.target_sdk,
      compileSdk: profile.compile_sdk,
      agpVersion: profile.agp_version,
      gradleVersion: profile.gradle_version,
      language: profile.language,
      processModel: profile.process_model,
      mediaEngineeringContact:
        profile.media_engineering_contact ||
        project?.handoff_package?.media_engineering_contact ||
        primaryContact?.email ||
        "",
      plannedFormats: profile.planned_formats,
      privacyProfile: { ...profile.privacy_profile },
      targetPilotDate:
        profile.target_pilot_date ||
        project?.handoff_package?.target_pilot_date,
      secretReference: profile.secret_reference
    };
  }

  const ctv = publisher.media_type?.toLowerCase().includes("ctv") || publisher.id.toLowerCase().includes("ctv");

  return {
    platform: ctv ? "android_tv" : "android",
    trafficChannel: ctv ? "ctv" : "mobile",
    integrationMode: ctv ? "ivt_sdk_api" : "full_sdk",
    protocolCodes: ctv ? ["vast", "api"] : ["native_sdk"],
    capabilityProfile: {
      has_ad_server: false,
      has_ad_player: false,
      has_ad_sdk: false,
      supports_api: false,
      supports_openrtb: false,
      supports_vast: false,
      supports_lifecycle_events: false,
      accepts_ivt_sdk: false,
      requires_pg_full_sdk: !ctv
    },
    propertyIdentifier: publisher.metadata?.property_identifier ?? "",
    playbookCodes: ["origin_ads_android_1_2", "origin_ivt_android_v11"],
    minSdk: 23,
    targetSdk: 35,
    compileSdk: 35,
    language: "mixed",
    processModel: "single_process",
    mediaEngineeringContact:
      project?.handoff_package?.media_engineering_contact ??
      primaryContact?.email ??
      "",
    plannedFormats: [],
    privacyProfile: {
      consent_before_init: false,
      personalized_ads: false,
      gaid: false,
      oaid: false,
      android_id: false,
      telephony_id: false,
      location: false,
      installed_apps: false
    },
    targetPilotDate: project?.handoff_package?.target_pilot_date,
    secretReference: ""
  };
}

function statusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  if (status === "passed") return "success";
  if (status === "blocked" || status === "failed") return "danger";
  if (status === "in_progress") return "info";
  if (status === "waived") return "warning";
  return "neutral";
}

function localizedCheckStatus(status: string, zh: boolean) {
  if (!zh) return status.replace(/_/g, " ");
  const labels: Record<string, string> = {
    not_started: "未开始",
    in_progress: "进行中",
    blocked: "阻塞",
    passed: "已通过",
    failed: "未通过",
    waived: "已豁免"
  };
  return labels[status] ?? status;
}

function localizedIntegrationIssue(issue: string, zh: boolean) {
  if (!zh) return issue;
  const labels: Record<string, string> = {
    "Technical profile is not configured.": "尚未配置技术画像。",
    "Select at least one delivery protocol.": "请至少选择一种交付协议。",
    "IVT SDK + API requires media approval to integrate the IVT SDK.": "IVT SDK + API 要求媒体确认允许接入 IVT SDK。",
    "IVT SDK + API requires complete advertising lifecycle events.": "IVT SDK + API 要求媒体支持完整广告生命周期事件。",
    "IVT SDK + API requires an existing media ad server or equivalent decisioning system.": "IVT SDK + API 要求媒体已有 Ad Server 或等效广告决策系统。",
    "IVT SDK + API requires API, OpenRTB, VAST, or an approved private protocol.": "IVT SDK + API 要求选择 API、OpenRTB、VAST 或已批准的私有协议。",
    "Poly-Gamma full SDK requires the Native SDK protocol.": "Poly-Gamma 全套 SDK 要求选择原生 SDK 协议。",
    "The player-component route is restricted to CTV projects.": "播放器组件路径仅适用于 CTV 项目。",
    "The lightweight SDK + API route is reserved for DOOH, PC, or connected devices.": "轻量 SDK + API 仅适用于 DOOH、PC 或联网智能设备。",
    "CTV IVT + API requires an existing advertising-capable media player.": "CTV IVT + API 要求媒体已有支持广告播放的播放器。",
    "CTV IVT + API requires VAST or API delivery capability.": "CTV IVT + API 要求媒体支持 VAST 或 API 交付。",
    "Mobile IVT + API requires advertising API capability.": "Mobile IVT + API 要求媒体支持广告 API。",
    "Media property package or platform identifier is required.": "必须填写媒体包名或平台标识。",
    "Select at least one SDK playbook.": "请至少选择一个技术 Playbook。",
    "IVT SDK + API requires the Origin IVT playbook.": "IVT SDK + API 要求选择 Origin IVT Playbook。",
    "The selected full SDK route requires the Origin Ads playbook.": "所选全套 SDK 路径要求选择 Origin Ads Playbook。",
    "Media engineering contact is required.": "必须填写媒体研发联系人。",
    "Android minSdk, targetSdk, and compileSdk are required.": "Android 项目必须填写 minSdk、targetSdk 和 compileSdk。",
    "Consent-before-initialization must be confirmed.": "必须确认在用户授权后再初始化。",
    "Select at least one planned ad format for an advertising playbook.": "广告 Playbook 至少需要选择一种计划广告形式。",
    "Secret values are forbidden. Use a vault://, secret://, env://, vercel://, or supabase:// reference.": "禁止填写明文密钥，请使用 vault://、secret://、env://、vercel:// 或 supabase:// 引用。"
  };
  return labels[issue] ?? issue;
}

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs font-semibold text-slate-600">{children}</span>;
}

function formatScheduleDate(value: string | undefined, locale: string) {
  if (!value) return locale === "zh-CN" ? "待排期" : "Not scheduled";
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(date);
}

export function TechnicalIntegrationWorkspace({
  publisher,
  state,
  user,
  initialCheckCode,
  onSaveProfile,
  onUpdateCheck,
  onStart,
  onRecordEvidence,
  onSetBlocker,
  onResolveBlocker,
  onSubmit,
  onAcceptHandoff,
  onRequestHandoffChanges
}: TechnicalIntegrationWorkspaceProps) {
  const { locale, t } = useLocale();
  const zh = locale === "zh-CN";
  const workspace = sdkIntegrationService.getWorkspaceSnapshot(state, publisher.id);
  const businessHandoff = mediaWorkflowService.getPublisherTechnicalHandoff(state, publisher.id);
  const legacy = mediaWorkflowService.getIntegrationExecutionSnapshot(state, publisher.id);
  const project = workspace.project;
  const [profileDraft, setProfileDraft] = useState(() => createProfileDraft(publisher, state));
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<
    "handoff" | "guided" | "profile" | "overview" | "gates" | "evidence"
  >("handoff");
  const [activeProfileStep, setActiveProfileStep] = useState(0);
  const [activeWorkflowPhase, setActiveWorkflowPhase] = useState<IntegrationWorkflowPhaseIndex>(0);
  const [selectedCheckCode, setSelectedCheckCode] = useState("");
  const [checkEvidence, setCheckEvidence] = useState("");
  const [checkBlocker, setCheckBlocker] = useState("");
  const [checkWaiver, setCheckWaiver] = useState("");
  const [checkDueDate, setCheckDueDate] = useState("");
  const [evidenceType, setEvidenceType] = useState<IntegrationEvidenceType>("connection_config");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [projectBlocker, setProjectBlocker] = useState("");
  const [handoffFeedback, setHandoffFeedback] = useState("");

  const phaseItems = useMemo(
    () => workspace.items.filter((item) => item.workflowPhase === activeWorkflowPhase),
    [activeWorkflowPhase, workspace.items]
  );
  const selectedCheck =
    phaseItems.find((item) => item.template.code === selectedCheckCode) ?? phaseItems[0];
  const passedBlocking = workspace.items.filter(
    (item) => item.template.blocking && ["passed", "waived"].includes(item.status)
  ).length;
  const totalBlocking = workspace.items.filter((item) => item.template.blocking).length;
  const executionActive = Boolean(project && ["in_integration", "technical_review"].includes(project.status));
  const executionStartable = Boolean(project && ["draft", "pending_integration"].includes(project.status));
  const readinessPassed = project?.status === "technical_live_passed";
  const profileEditable = sdkIntegrationService.canManageProfile(user);
  const executionManager = sdkIntegrationService.canManageExecution(user);
  const canReviewHandoff = ["integration_manager", "media_director", "operations_director"].includes(user.activeRole);
  const currentWorkflowPhaseKey = workspace.currentPhases
    .map((phase) => phase.index)
    .join(",");
  const readinessSubmitter = sdkIntegrationService.canSubmitReadiness(user);
  const manageableCheckCount = workspace.items.filter((item) =>
    sdkIntegrationService.canManageCheck(user, item.template.ownerRole)
  ).length;
  const engineeringExecutionLocked = Boolean(
    selectedCheck &&
    selectedCheck.workflowPhase >= 8 &&
    !workspace.engineeringHandoff.readyForExecution
  );
  const canEditSelectedCheck = Boolean(
    selectedCheck &&
    sdkIntegrationService.canManageCheck(user, selectedCheck.template.ownerRole) &&
    !engineeringExecutionLocked
  );
  const activeCoordinationPhases = workspace.currentPhases.length > 0
    ? workspace.currentPhases
    : [workspace.currentPhase];
  const primaryCoordinationPhase = activeCoordinationPhases[0];
  const coordinationOwners = Array.from(
    new Set(activeCoordinationPhases.map((phase) => phase.activeOwnerRole))
  );
  const accountableCoordinationOwners = Array.from(
    new Set(activeCoordinationPhases.map((phase) => phase.ownerRole))
  );
  const coordinationCollaborators = Array.from(
    new Set(activeCoordinationPhases.flatMap((phase) => phase.collaboratorRoles))
  ).filter(
    (role) =>
      !coordinationOwners.includes(role) &&
      !accountableCoordinationOwners.includes(role)
  );
  const currentBlocker =
    project?.blocker ??
    activeCoordinationPhases.map((phase) => phase.blocker).find(Boolean);
  const nextMilestoneDate = activeCoordinationPhases
    .map((phase) => phase.plannedDate)
    .filter((date): date is string => Boolean(date))
    .sort()[0];
  const scheduleCoverage = workspace.phases.filter(
    (phase) => phase.scheduleSource !== "missing"
  ).length;
  const riskPhaseCount = workspace.phases.filter(
    (phase) => phase.overdue || Boolean(phase.blocker)
  ).length;
  const activePhaseDefinition =
    workspace.phases.find((phase) => phase.index === activeWorkflowPhase) ??
    primaryCoordinationPhase;
  const activeGateContract = getIntegrationGateExecutionContract(activePhaseDefinition.index);
  const guidedPhaseItems = [...phaseItems].sort((left, right) => {
    const completed = (status: string) => ["passed", "waived"].includes(status);
    if (completed(left.status) !== completed(right.status)) {
      return completed(left.status) ? 1 : -1;
    }
    return left.template.code.localeCompare(right.template.code);
  });
  const selectedGuidance = selectedCheck
    ? getIntegrationCheckGuidance(selectedCheck.template)
    : undefined;
  const selectedCollaboratorRoles = activePhaseDefinition.collaboratorRoles.filter(
    (role) =>
      role !== selectedCheck?.template.ownerRole &&
      role !== activePhaseDefinition.ownerRole &&
      role !== activePhaseDefinition.activeOwnerRole
  );
  const activeCheckPosition = selectedCheck
    ? guidedPhaseItems.findIndex((item) => item.template.code === selectedCheck.template.code) + 1
    : 0;
  const channelDefinition = integrationChannels.find(
    (channel) => channel.code === workspace.profile?.traffic_channel
  );
  const modeDefinition = integrationModes.find(
    (mode) => mode.code === workspace.profile?.integration_mode
  );
  const handoff = workspace.engineeringHandoff;
  const handoffStatusLabel =
    handoff.status === "ready"
      ? (zh ? "工程接入已就绪" : "Ready for engineering")
      : handoff.status === "conditional"
        ? (zh ? "条件就绪，仍需补齐" : "Conditionally ready")
        : (zh ? "工程接入未就绪" : "Engineering entry blocked");
  const firstMissingPrerequisite = handoff.missingPrerequisites[0];
  const firstBlockingPacketIssue = handoff.blockingPacketIssues[0];
  const nextEngineeringAction = firstMissingPrerequisite?.nextAction
    ? (zh ? firstMissingPrerequisite.nextAction.titleZh : firstMissingPrerequisite.nextAction.title)
    : firstBlockingPacketIssue
      ? (zh ? firstBlockingPacketIssue.labelZh : firstBlockingPacketIssue.label)
      : (zh ? "进入 Gate 08，准备技术环境与交付输入。" : "Enter Gate 08 and prepare the technical environment.");

  useEffect(() => {
    setProfileDraft(createProfileDraft(publisher, state));
  }, [publisher.id, workspace.profile?.updated_at]);

  useEffect(() => {
    const requested = workspace.items.find((item) => {
      const phase = workspace.phases.find((candidate) => candidate.index === item.workflowPhase);
      return item.template.code === initialCheckCode && phase?.status !== "locked";
    });
    const assigned = workspace.items.find(
      (item) =>
        workspace.currentPhases.some((phase) => phase.index === item.workflowPhase) &&
        sdkIntegrationService.canManageCheck(user, item.template.ownerRole) &&
        !["passed", "waived"].includes(item.status)
    );
    const currentPhaseItem = workspace.items.find(
      (item) => workspace.currentPhases.some((phase) => phase.index === item.workflowPhase)
    );
    const preferred = requested ?? assigned ?? currentPhaseItem ?? workspace.items[0];

    if (preferred) {
      setActiveWorkflowPhase(preferred.workflowPhase);
      setSelectedCheckCode(preferred.template.code);
      if (requested) setActiveWorkspaceView("guided");
    }
  }, [
    initialCheckCode,
    publisher.id,
    user.activeRole,
    currentWorkflowPhaseKey,
    workspace.profile?.updated_at,
    workspace.nextBlockingItem?.template.code
  ]);

  useEffect(() => {
    if (!selectedCheck || selectedCheck.template.code === selectedCheckCode) return;
    setSelectedCheckCode(selectedCheck.template.code);
  }, [selectedCheck, selectedCheckCode]);

  useEffect(() => {
    setCheckEvidence(selectedCheck?.result?.evidence_reference ?? "");
    setCheckBlocker(selectedCheck?.result?.blocker ?? "");
    setCheckWaiver(selectedCheck?.result?.waiver_reason ?? "");
    setCheckDueDate(
      selectedCheck?.result?.due_date ??
        workspace.phases.find((phase) => phase.index === selectedCheck?.workflowPhase)?.plannedDate ??
        ""
    );
  }, [
    selectedCheck?.template.code,
    selectedCheck?.result?.updated_at,
    workspace.profile?.target_pilot_date
  ]);

  function togglePlaybook(code: IntegrationPlaybookCode) {
    setProfileDraft((current) => ({
      ...current,
      playbookCodes: current.playbookCodes.includes(code)
        ? current.playbookCodes.filter((item) => item !== code)
        : [...current.playbookCodes, code]
    }));
  }

  function toggleFormat(format: IntegrationAdFormat) {
    setProfileDraft((current) => ({
      ...current,
      plannedFormats: current.plannedFormats.includes(format)
        ? current.plannedFormats.filter((item) => item !== format)
        : [...current.plannedFormats, format]
    }));
  }

  function toggleProtocol(protocol: IntegrationProtocol) {
    setProfileDraft((current) => ({
      ...current,
      protocolCodes: current.protocolCodes.includes(protocol)
        ? current.protocolCodes.filter((item) => item !== protocol)
        : [...current.protocolCodes, protocol]
    }));
  }

  function toggleCapability(capability: keyof IntegrationCapabilityProfile) {
    setProfileDraft((current) => ({
      ...current,
      capabilityProfile: {
        ...current.capabilityProfile,
        [capability]: !current.capabilityProfile[capability]
      }
    }));
  }

  function updateSelectedCheck(status: IntegrationCheckUpdateInput["status"]) {
    if (!selectedCheck) return;
    onUpdateCheck({
      itemCode: selectedCheck.template.code,
      status,
      evidenceReference: checkEvidence,
      blocker: checkBlocker,
      waiverReason: checkWaiver,
      dueDate: checkDueDate
    });
  }

  function openWorkflowPhase(
    phaseIndex: IntegrationWorkflowPhaseIndex,
    checkCode?: string,
    view: "guided" | "gates" = "guided"
  ) {
    setActiveWorkflowPhase(phaseIndex);
    const firstItem = workspace.items.find((item) => item.workflowPhase === phaseIndex);
    setSelectedCheckCode(checkCode ?? firstItem?.template.code ?? "");
    setActiveWorkspaceView(view);
  }

  function evidenceLabel(type: IntegrationEvidenceType) {
    if (type === "connection_config") return t("integration.connectionConfig");
    if (type === "test_request") return t("integration.testRequest");
    if (type === "callback_log") return t("integration.callbackLog");
    return t("integration.productionLog");
  }

  const recommendedMode = recommendedIntegrationMode(
    profileDraft.trafficChannel,
    profileDraft.capabilityProfile
  );
  const routeIssues = integrationRouteIssues(profileDraft);
  const selectedModeDefinition = integrationModes.find((mode) => mode.code === profileDraft.integrationMode);
  const recommendedModeDefinition = integrationModes.find((mode) => mode.code === recommendedMode);
  const capabilityLabels: Record<keyof IntegrationCapabilityProfile, [string, string]> = {
    has_ad_server: ["已有 Ad Server / 决策系统", "Existing ad server / decisioning"],
    has_ad_player: ["已有广告播放器", "Existing ad player"],
    has_ad_sdk: ["已有自有广告 SDK", "Existing media ad SDK"],
    supports_api: ["支持广告 API", "Advertising API supported"],
    supports_openrtb: ["支持 OpenRTB", "OpenRTB supported"],
    supports_vast: ["支持 VAST", "VAST supported"],
    supports_lifecycle_events: ["支持完整生命周期事件", "Complete lifecycle events"],
    accepts_ivt_sdk: ["允许接入 IVT SDK", "IVT SDK accepted"],
    requires_pg_full_sdk: ["需要 PG 全套 SDK", "PG full SDK required"]
  };
  const draftProfileIssues = integrationProfileIssues(profileDraft);
  const routeStepIssues = integrationRouteIssues(profileDraft);
  const privacyStepIssues = draftProfileIssues.filter((issue) =>
    issue.includes("Consent-before-initialization")
  );
  const deliveryStepIssues = draftProfileIssues.filter(
    (issue) => issue.includes("playbook") || issue.includes("ad format")
  );
  const environmentStepIssues = draftProfileIssues.filter(
    (issue) =>
      !routeStepIssues.includes(issue) &&
      !privacyStepIssues.includes(issue) &&
      !deliveryStepIssues.includes(issue)
  );
  const capabilityConfirmed = Object.values(profileDraft.capabilityProfile).some(Boolean);
  const profileSteps = [
    {
      key: "capabilities",
      gate: "Gate 03",
      title: zh ? "盘点媒体现有能力" : "Assess media capabilities",
      summary: zh
        ? "先确认媒体已经具备哪些广告能力，避免直接套用错误的 SDK 方案。"
        : "Confirm the media's existing advertising capabilities before choosing an SDK route.",
      requiredInput: zh
        ? "媒体现有 Ad Server、播放器、SDK、API、VAST、生命周期事件及 IVT 接受情况。"
        : "Existing ad server, player, SDK, API, VAST, lifecycle events, and IVT acceptance.",
      output: zh
        ? "系统生成建议接入模式。"
        : "A system-recommended integration mode.",
      completion: zh
        ? "至少确认一项现有能力或明确需要 PG 全套 SDK。"
        : "Confirm at least one capability or explicitly require the PG full SDK.",
      complete: capabilityConfirmed,
      issues: capabilityConfirmed
        ? []
        : [zh ? "尚未确认任何媒体技术能力。" : "No media technical capability has been confirmed."]
    },
    {
      key: "route",
      gate: "Gate 03",
      title: zh ? "确定接入路线与协议" : "Approve route and protocols",
      summary: zh
        ? "根据能力盘点选择流量渠道、接入模式和交付协议，并处理系统提示的路线冲突。"
        : "Choose the channel, integration mode, and delivery protocols, then resolve route conflicts.",
      requiredInput: zh
        ? "流量渠道、接入模式、Native SDK/API/OpenRTB/VAST 等交付协议。"
        : "Traffic channel, integration mode, and Native SDK/API/OpenRTB/VAST protocols.",
      output: zh
        ? "形成可执行的技术接入路线。"
        : "An executable technical integration route.",
      completion: zh
        ? "至少选择一种协议，且路线评估无冲突。"
        : "Select at least one protocol and clear all route conflicts.",
      complete: routeStepIssues.length === 0,
      issues: routeStepIssues.map((issue) => localizedIntegrationIssue(issue, zh))
    },
    {
      key: "privacy",
      gate: "Gate 06",
      title: zh ? "确认隐私与数据边界" : "Confirm privacy and data boundaries",
      summary: zh
        ? "明确 SDK 初始化时机、个性化广告和设备标识符边界，作为开发前硬门禁。"
        : "Define SDK initialization, personalization, and identifier boundaries before development.",
      requiredInput: zh
        ? "授权后初始化、个性化广告及 GAID/OAID/Android ID 等标识符使用范围。"
        : "Consent-before-init, personalized ads, and GAID/OAID/Android ID boundaries.",
      output: zh
        ? "形成隐私与数据使用结论。"
        : "An approved privacy and data-use boundary.",
      completion: zh
        ? "确认必须在用户授权后初始化 SDK。"
        : "Confirm that SDK initialization occurs only after user consent.",
      complete: privacyStepIssues.length === 0,
      issues: privacyStepIssues.map((issue) => localizedIntegrationIssue(issue, zh))
    },
    {
      key: "delivery",
      gate: "Gate 08",
      title: zh ? "选择交付 Playbook 与广告形式" : "Select delivery playbooks and formats",
      summary: zh
        ? "把已批准路线转换成具体 SDK 文档、版本和广告形式范围。"
        : "Translate the approved route into concrete SDK documents, versions, and ad formats.",
      requiredInput: zh
        ? "Origin Ads / IVT Playbook 及 Splash、Native、Rewarded 等计划广告形式。"
        : "Origin Ads / IVT playbooks and planned Splash, Native, Rewarded, or other formats.",
      output: zh
        ? "系统按 Playbook 生成定向技术清单。"
        : "A scoped technical checklist generated from the selected playbooks.",
      completion: zh
        ? "Playbook 与接入路线匹配；广告型 Playbook 已选择广告形式。"
        : "Playbooks match the route and advertising playbooks include at least one format.",
      complete: deliveryStepIssues.length === 0,
      issues: deliveryStepIssues.map((issue) => localizedIntegrationIssue(issue, zh))
    },
    {
      key: "environment",
      gate: "Gate 08",
      title: zh ? "补齐工程环境并保存" : "Complete engineering environment",
      summary: zh
        ? "填写技术经理真正开工所需的包名、SDK 版本、构建环境、联系人、排期和密钥引用。"
        : "Record the package, SDK levels, build environment, contact, schedule, and secret reference.",
      requiredInput: zh
        ? "平台标识、min/target/compileSdk、AGP/Gradle、语言、进程模型、研发联系人及 Pilot 日期。"
        : "Property ID, SDK levels, AGP/Gradle, language, process model, engineering contact, and pilot date.",
      output: zh
        ? "保存技术画像并生成可执行检查清单。"
        : "A saved technical profile with an executable checklist.",
      completion: zh
        ? "所有方案资料校验通过后保存。"
        : "Save after all solution data validations pass.",
      complete: environmentStepIssues.length === 0 && draftProfileIssues.length === 0,
      issues: draftProfileIssues.map((issue) => localizedIntegrationIssue(issue, zh))
    }
  ];
  const currentProfileStep = profileSteps[activeProfileStep] ?? profileSteps[0];
  const completedProfileSteps = profileSteps.filter((step) => step.complete).length;
  const canAdvanceProfileStep =
    activeProfileStep < profileSteps.length - 1 && currentProfileStep.complete;

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-card">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700">
            <Wrench className="size-4" aria-hidden="true" />
            {zh ? "技术接入工作台" : "TECHNICAL INTEGRATION WORKSPACE"}
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">{publisher.name}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {zh
              ? "从技术资格评估、SDK 集成到交付证据和阶段门，统一管理媒体研发与 PG 团队协作。"
              : "Manage technical qualification, SDK execution, delivery evidence, and stage gates in one workflow."}
          </p>
        </div>
        <StatusBadge tone={readinessPassed ? "success" : project?.status === "technical_blocked" ? "danger" : "info"}>
          {project?.status?.replace(/_/g, " ") ?? "project missing"}
        </StatusBadge>
      </header>

      <div className="grid grid-cols-2 border-b border-slate-200 xl:grid-cols-4">
        <div className="border-b border-r border-slate-200 p-4 xl:border-b-0">
          <p className="text-xs font-semibold text-slate-500">{zh ? "技术画像" : "Technical profile"}</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {workspace.profileComplete ? (zh ? "已配置" : "Configured") : (zh ? "待完善" : "Incomplete")}
          </p>
        </div>
        <div className="border-b border-slate-200 p-4 xl:border-b-0 xl:border-r">
          <p className="text-xs font-semibold text-slate-500">{zh ? "阻塞清单完成" : "Blocking checks passed"}</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{passedBlocking} / {totalBlocking}</p>
        </div>
        <div className="border-r border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500">{zh ? "当前阻塞" : "Active blockers"}</p>
          <p className={`mt-2 text-lg font-semibold ${workspace.blockedCount ? "text-rose-700" : "text-emerald-700"}`}>
            {workspace.blockedCount}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500">{zh ? "当前阶段" : "Current phase"}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {workspace.currentPhases.length > 1
              ? `${workspace.currentPhases
                  .map((phase) => String(phase.index).padStart(2, "0"))
                  .join(" / ")} · ${zh ? "并行门禁" : "Parallel gates"}`
              : `${String(workspace.currentPhase.index).padStart(2, "0")} · ${
                  zh ? workspace.currentPhase.nameZh : workspace.currentPhase.name
                }`}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 border-b border-blue-100 bg-blue-50/60 px-5 py-3">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-700" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-blue-950">
            {getRoleDisplayName(user.activeRole, locale)}
          </p>
          <p className="mt-0.5 text-xs leading-5 text-blue-800">
            {readinessSubmitter
              ? zh
                ? `可监督全部检查项，并在阶段门完成后提交技术就绪；当前可处理 ${manageableCheckCount} 项。`
                : `Can oversee all checks and submit technical readiness after the gate is complete; ${manageableCheckCount} checks are actionable.`
              : executionManager
                ? zh
                  ? `可维护技术画像、联调证据、阻塞项和负责的检查项；当前可处理 ${manageableCheckCount} 项。`
                  : `Can maintain the profile, execution evidence, blockers, and assigned checks; ${manageableCheckCount} checks are actionable.`
                : manageableCheckCount > 0
                  ? zh
                    ? `仅可更新分配给当前角色的 ${manageableCheckCount} 项检查，其余技术配置保持只读。`
                    : `Can update only ${manageableCheckCount} checks assigned to this role; all other technical configuration is read-only.`
                  : zh
                    ? "当前角色可查看技术进度，但不能修改技术配置或检查结果。"
                    : "This role can review technical progress but cannot change configuration or check results."}
          </p>
        </div>
      </div>

      <div
        className="flex overflow-x-auto border-b border-slate-200 px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label={zh ? "技术接入工作台视图" : "Technical integration workspace views"}
      >
        {([
          ["handoff", zh ? "工程交接" : "Engineering handoff"],
          ["guided", zh ? "阶段执行" : "Gate execution"],
          ["profile", zh ? "方案与技术资料" : "Solution & technical data"],
          ["overview", zh ? "项目全貌" : "Project overview"],
          ["gates", zh ? "全量清单" : "Full checklist"],
          ["evidence", zh ? "证据与上线审批" : "Evidence & approval"]
        ] as const).map(([view, label]) => (
          <button
            key={view}
            className={`h-12 shrink-0 border-b-2 px-4 text-sm font-semibold ${
              activeWorkspaceView === view
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
            type="button"
            role="tab"
            aria-selected={activeWorkspaceView === view}
            onClick={() => setActiveWorkspaceView(view)}
          >
            {label}
          </button>
        ))}
      </div>

      <section className={activeWorkspaceView === "handoff" ? "border-b border-slate-200" : "hidden"}>
        <div className="border-b border-slate-200 bg-white px-5 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <Handshake className="size-5 text-blue-600" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-950">
                  {zh ? "媒体接入需求包接单" : "Publisher intake acceptance"}
                </h2>
                <StatusBadge
                  tone={
                    businessHandoff.status === "accepted"
                      ? "success"
                      : businessHandoff.status === "changes_requested"
                        ? "danger"
                        : businessHandoff.status === "submitted"
                          ? "info"
                          : "warning"
                  }
                >
                  {zh
                    ? {
                        draft: "媒体经理准备中",
                        submitted: "等待技术接单",
                        accepted: "技术已接单",
                        changes_requested: "已退回补充"
                      }[businessHandoff.status]
                    : businessHandoff.status.replace("_", " ")}
                </StatusBadge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {zh ? businessHandoff.nextActionZh : businessHandoff.nextAction}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-600">
                <span>
                  {zh ? "媒体研发：" : "Media engineering: "}
                  <strong className="text-slate-900">
                    {businessHandoff.package.media_engineering_contact || (zh ? "待补充" : "Missing")}
                  </strong>
                </span>
                <span>
                  {zh ? "目标 Pilot：" : "Target pilot: "}
                  <strong className="text-slate-900">
                    {businessHandoff.package.target_pilot_date || "—"}
                  </strong>
                </span>
                <span>
                  {zh ? "目标上线：" : "Target launch: "}
                  <strong className="text-slate-900">
                    {businessHandoff.package.target_go_live_date || "—"}
                  </strong>
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500">
                {zh ? "业务资料完整度" : "Business intake completeness"}
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-950">
                {businessHandoff.completed}/{businessHandoff.total}
              </p>
            </div>
          </div>

          {businessHandoff.package.launch_requirements || businessHandoff.package.integration_expectations ? (
            <div className="mt-4 grid gap-3 border-y border-slate-200 py-4 lg:grid-cols-2">
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  {zh ? "媒体上线要求" : "Publisher launch requirements"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {businessHandoff.package.launch_requirements || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">
                  {zh ? "接入方式与技术期望" : "Integration expectations"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {businessHandoff.package.integration_expectations || "—"}
                </p>
              </div>
            </div>
          ) : null}

          {businessHandoff.status === "submitted" && canReviewHandoff ? (
            <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <input
                className="h-10 min-w-0 rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                value={handoffFeedback}
                placeholder={zh ? "退回时填写具体缺失资料或修改要求" : "Required only when returning the package"}
                onChange={(event) => setHandoffFeedback(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  type="button"
                  disabled={!handoffFeedback.trim()}
                  onClick={() => onRequestHandoffChanges(handoffFeedback)}
                >
                  <AlertTriangle className="size-4" aria-hidden="true" />
                  {zh ? "退回补充" : "Request changes"}
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
                  type="button"
                  onClick={onAcceptHandoff}
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {zh ? "接单并承担技术责任" : "Accept handoff"}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className={`flex flex-wrap items-start justify-between gap-5 border-b px-5 py-5 ${
            handoff.status === "ready"
              ? "border-emerald-200 bg-emerald-50/70"
              : handoff.status === "conditional"
                ? "border-amber-200 bg-amber-50/70"
                : "border-rose-200 bg-rose-50/70"
          }`}
        >
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                tone={
                  handoff.status === "ready"
                    ? "success"
                    : handoff.status === "conditional"
                      ? "warning"
                      : "danger"
                }
              >
                {handoffStatusLabel}
              </StatusBadge>
              <span className="text-xs font-semibold text-slate-600">
                Gate 0–7 · {handoff.completedPrerequisiteGates}/{handoff.totalPrerequisiteGates}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold text-slate-950">
              {zh ? "工程接入门禁与交接包" : "Engineering entry gate and handoff packet"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {handoff.readyForExecution
                ? zh
                  ? "业务、商业、供应链、隐私与架构前置条件已完成，工程团队可以正式进入 Gate 08。"
                  : "Business, commercial, supply-chain, privacy, and architecture prerequisites are complete. Engineering can enter Gate 08."
                : zh
                  ? "技术团队可查看资料并参与方案评审，但在 Gate 0–7 和交接资料完成前不能正式开始开发、联调或认证。"
                  : "Engineering may review the material and advise on the solution, but development, integration, and certification remain locked until Gate 0–7 and the handoff packet are complete."}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-900">
              {zh ? "下一步：" : "Next action: "}{nextEngineeringAction}
            </p>
          </div>
          <button
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold ${
              handoff.readyForExecution
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border border-slate-300 bg-white text-slate-800 hover:border-blue-300"
            }`}
            type="button"
            onClick={() =>
              handoff.readyForExecution
                ? openWorkflowPhase(8)
                : openWorkflowPhase(firstMissingPrerequisite?.index ?? 0)
            }
          >
            {handoff.readyForExecution
              ? (zh ? "进入 Gate 08 技术执行" : "Enter Gate 08 execution")
              : (zh ? "打开首个缺口" : "Open first gap")}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-slate-200">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-950">
              {zh ? "工程交接资料包" : "Engineering handoff packet"}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {zh
                ? "工程师开工前应一次性拿到媒体主体、库存、接入路线、联系人和目标时间。"
                : "The engineer should receive publisher identity, inventory, route, contacts, and target timing before work begins."}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            <div className="border-b border-slate-200 px-5 py-4 sm:border-r xl:border-b-0">
              <p className="text-xs font-semibold text-slate-500">{zh ? "媒体基本信息" : "Publisher basics"}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{publisher.name}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {publisher.legal_entity || (zh ? "签约主体待补充" : "Legal entity missing")}
              </p>
              <p className="text-xs leading-5 text-slate-600">
                {[publisher.region, publisher.media_type].filter(Boolean).join(" · ") || "—"}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {zh ? "媒体资产标识：" : "Property ID: "}
                {workspace.profile?.property_identifier || (zh ? "待补充" : "Missing")}
              </p>
            </div>
            <div className="border-b border-slate-200 px-5 py-4 xl:border-b-0 xl:border-r">
              <p className="text-xs font-semibold text-slate-500">{zh ? "已批准接入路线" : "Approved integration route"}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {channelDefinition
                  ? (zh ? channelDefinition.nameZh : channelDefinition.name)
                  : (zh ? "渠道待确认" : "Channel pending")}
                {" · "}
                {modeDefinition
                  ? (zh ? modeDefinition.nameZh : modeDefinition.name)
                  : (zh ? "模式待确认" : "Mode pending")}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {(workspace.profile?.protocol_codes ?? []).join(" / ") || (zh ? "协议待确认" : "Protocols pending")}
              </p>
              <p className="text-xs leading-5 text-slate-600">
                {(workspace.profile?.planned_formats ?? []).join(" / ") || (zh ? "广告形式待确认" : "Formats pending")}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {zh ? "有效广告位：" : "Active placements: "}{handoff.activeAdSlots.length}
              </p>
            </div>
            <div className="border-b border-slate-200 px-5 py-4 sm:border-r sm:border-b-0">
              <p className="text-xs font-semibold text-slate-500">{zh ? "联系人与责任边界" : "Contacts and ownership"}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {handoff.primaryContact?.name || (zh ? "商务联系人待补充" : "Business contact missing")}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {handoff.primaryContact?.role_title || "—"}
                {handoff.primaryContact?.email ? ` · ${handoff.primaryContact.email}` : ""}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {zh ? "媒体研发：" : "Media engineering: "}
                {workspace.profile?.media_engineering_contact || (zh ? "待补充" : "Missing")}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-slate-500">{zh ? "目标时间与商业输入" : "Timing and commercial input"}</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {zh ? "目标 Pilot：" : "Target pilot: "}
                {formatScheduleDate(workspace.profile?.target_pilot_date, locale)}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {zh ? "Gate 08 计划：" : "Gate 08 target: "}
                {formatScheduleDate(handoff.executionMilestones[0]?.plannedDate, locale)}
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {zh ? "商业/结算条款：" : "Commercial terms: "}{handoff.contractTerms.length}
              </p>
            </div>
          </div>
        </div>

        {handoff.packetIssues.length > 0 ? (
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-950">
              {zh ? "交接资料缺口" : "Handoff packet gaps"}
            </h3>
            <div className="mt-3 grid gap-2 lg:grid-cols-2">
              {handoff.packetIssues.map((issue) => (
                <div
                  key={issue.code}
                  className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 ${
                    issue.blocking
                      ? "border-rose-200 bg-rose-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <AlertTriangle
                      className={`mt-0.5 size-4 shrink-0 ${
                        issue.blocking ? "text-rose-600" : "text-amber-600"
                      }`}
                      aria-hidden="true"
                    />
                    <p className="text-xs leading-5 text-slate-800">
                      {zh ? issue.labelZh : issue.label}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-slate-600">
                    {getRoleDisplayName(issue.ownerRole, locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border-b border-slate-200">
          <div className="px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-950">
              {zh ? "Gate 0–7 前置条件" : "Gate 0–7 prerequisites"}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {zh
                ? "未完成项由业务责任人推进；工程师只需查看结论、证据和预计交接日期。"
                : "Business owners close these prerequisites; engineers review conclusions, evidence, and expected handoff dates."}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">{zh ? "阶段" : "Gate"}</th>
                  <th className="px-4 py-3">{zh ? "状态" : "Status"}</th>
                  <th className="px-4 py-3">{zh ? "责任人" : "Owner"}</th>
                  <th className="px-4 py-3">{zh ? "交付结论 / 当前缺口" : "Deliverable / current gap"}</th>
                  <th className="px-4 py-3">{zh ? "预计完成" : "Expected"}</th>
                  <th className="px-5 py-3 text-right">{zh ? "操作" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {handoff.prerequisiteGates.map((phase) => (
                  <tr key={phase.code} className="align-top">
                    <td className="px-5 py-4">
                      <p className="text-xs font-semibold text-blue-700">
                        Gate {String(phase.index).padStart(2, "0")}
                      </p>
                      <p className="mt-1 max-w-48 text-sm font-semibold leading-5 text-slate-900">
                        {zh ? phase.nameZh : phase.name}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={phase.complete ? "success" : phase.blocker ? "danger" : "warning"}>
                        {phase.complete
                          ? (zh ? "已完成" : "Complete")
                          : phase.blocker
                            ? (zh ? "阻塞" : "Blocked")
                            : (zh ? "待完成" : "Pending")}
                      </StatusBadge>
                      <p className="mt-2 text-xs text-slate-500">
                        {phase.completedCount}/{phase.total}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {getRoleDisplayName(phase.activeOwnerRole, locale)}
                    </td>
                    <td className="max-w-md px-4 py-4">
                      <p className="text-sm leading-6 text-slate-700">
                        {phase.complete
                          ? (zh ? phase.outputZh : phase.output)
                          : phase.blocker ??
                            (phase.nextAction
                              ? (zh ? phase.nextAction.titleZh : phase.nextAction.title)
                              : (zh ? "等待责任人完成本阶段结论。" : "Waiting for the gate owner to close the deliverable."))}
                      </p>
                    </td>
                    <td className={`px-4 py-4 text-sm ${phase.overdue ? "font-semibold text-rose-700" : "text-slate-700"}`}>
                      {formatScheduleDate(phase.plannedDate, locale)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:text-blue-700"
                        type="button"
                        onClick={() => openWorkflowPhase(phase.index, phase.nextAction?.code)}
                      >
                        {zh ? "查看" : "Open"}
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="px-5 py-4">
            <h3 className="text-sm font-semibold text-slate-950">
              {zh ? "工程执行里程碑 Gate 8–12" : "Engineering execution milestones Gate 8–12"}
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {zh
                ? "交接门禁通过后，按环境准备、开发联调、生产认证、Pilot 和规模化运营推进。"
                : "After handoff, proceed through environment preparation, implementation, production certification, pilot, and scale operations."}
            </p>
          </div>
          <div className="grid border-t border-slate-200 sm:grid-cols-2 xl:grid-cols-5">
            {handoff.executionMilestones.map((phase, index) => (
              <button
                key={phase.code}
                className={`min-w-0 border-b border-slate-200 px-4 py-4 text-left hover:bg-slate-50 sm:border-r ${
                  index === handoff.executionMilestones.length - 1 ? "xl:border-r-0" : ""
                }`}
                type="button"
                onClick={() => openWorkflowPhase(phase.index)}
              >
                <p className="text-xs font-semibold text-blue-700">
                  Gate {String(phase.index).padStart(2, "0")}
                </p>
                <p className="mt-2 text-sm font-semibold leading-5 text-slate-900">
                  {zh ? phase.nameZh : phase.name}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {getRoleDisplayName(phase.ownerRole, locale)}
                </p>
                <p className={`mt-1 text-xs ${phase.overdue ? "font-semibold text-rose-700" : "text-slate-500"}`}>
                  {formatScheduleDate(phase.plannedDate, locale)}
                </p>
                <div className="mt-3">
                  <StatusBadge
                    tone={
                      phase.complete
                        ? "success"
                        : phase.status === "locked"
                          ? "neutral"
                          : phase.blocker
                            ? "danger"
                            : "info"
                    }
                  >
                    {phase.complete
                      ? (zh ? "已完成" : "Complete")
                      : phase.status === "locked"
                        ? (zh ? "待解锁" : "Locked")
                        : (zh ? "可执行" : "Actionable")}
                  </StatusBadge>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={activeWorkspaceView === "guided" ? "border-b border-slate-200" : "hidden"}>
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold text-blue-700">
              {zh
                ? `Gate ${String(activePhaseDefinition.index).padStart(2, "0")} · 当前执行`
                : `Gate ${String(activePhaseDefinition.index).padStart(2, "0")} · Current execution`}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              {zh ? activePhaseDefinition.nameZh : activePhaseDefinition.name}
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              {zh ? activePhaseDefinition.outputZh : activePhaseDefinition.output}
            </p>
          </div>
          <div className="min-w-40 text-right">
            <StatusBadge
              tone={
                activePhaseDefinition.blocker || activePhaseDefinition.overdue
                  ? "danger"
                  : activePhaseDefinition.status === "complete"
                    ? "success"
                    : "info"
              }
            >
              {activePhaseDefinition.blocker
                ? (zh ? "当前阻塞" : "Blocked")
                : activePhaseDefinition.overdue
                  ? (zh ? "已经逾期" : "Overdue")
                  : activePhaseDefinition.status === "complete"
                    ? (zh ? "阶段完成" : "Gate complete")
                    : (zh ? "正在推进" : "In progress")}
            </StatusBadge>
            <p className="mt-2 text-xs text-slate-500">
              {activePhaseDefinition.completedCount}/{activePhaseDefinition.total}{" "}
              {zh ? "项已完成" : "checks complete"}
            </p>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/50 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">
                {zh ? "阶段执行契约" : "Gate execution contract"}
              </h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {zh
                  ? "本 Gate 只检查下列输入、交付物和门禁条件；技术方案字段在对应 Gate 处理。"
                  : "This gate checks only the inputs, deliverables, and gate conditions below; solution fields are handled in their assigned gates."}
              </p>
            </div>
            <StatusBadge tone={activePhaseDefinition.complete ? "success" : "info"}>
              {`${activePhaseDefinition.completedCount}/${activePhaseDefinition.total} ${
                zh ? "项 Checklist 完成" : "checklist items complete"
              }`}
            </StatusBadge>
          </div>
        </div>

        <div className="grid border-b border-slate-200 lg:grid-cols-2">
          <div className="border-b border-slate-200 px-5 py-4 lg:border-r">
            <div className="flex items-center gap-2">
              <CircleDot className="size-4 text-blue-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-950">
                {zh ? "本阶段必须输入" : "Required inputs"}
              </h3>
            </div>
            <ul className="mt-3 space-y-2">
              {(zh ? activeGateContract.requiredInputsZh : activeGateContract.requiredInputs).map(
                (item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{item}</span>
                  </li>
                )
              )}
            </ul>
          </div>
          <div className="border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-blue-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-950">
                {zh ? "本阶段必须交付" : "Required deliverables"}
              </h3>
            </div>
            <ul className="mt-3 space-y-2">
              {(zh ? activeGateContract.deliverablesZh : activeGateContract.deliverables).map(
                (item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-blue-500" />
                    <span>{item}</span>
                  </li>
                )
              )}
            </ul>
          </div>
          <div className="border-b border-slate-200 px-5 py-4 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-950">
                {zh ? "通过条件" : "Pass conditions"}
              </h3>
            </div>
            <ul className="mt-3 space-y-2">
              {(zh ? activeGateContract.passConditionsZh : activeGateContract.passConditions).map(
                (item) => (
                  <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                )
              )}
            </ul>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center gap-2">
              <LockKeyhole className="size-4 text-rose-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-950">
                {zh ? "阻断条件" : "Blocking conditions"}
              </h3>
            </div>
            <ul className="mt-3 space-y-2">
              {(zh
                ? activeGateContract.blockingConditionsZh
                : activeGateContract.blockingConditions
              ).map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-6 text-slate-700">
                  <AlertTriangle className="mt-1 size-4 shrink-0 text-rose-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="grid border-b border-slate-200 sm:grid-cols-2 xl:grid-cols-3">
          <div className="border-b border-slate-200 px-5 py-4 sm:border-r xl:border-b-0">
            <p className="text-xs font-semibold text-slate-500">{zh ? "媒体与接入路径" : "Media and route"}</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">{publisher.name}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {channelDefinition
                ? zh
                  ? channelDefinition.nameZh
                  : channelDefinition.name
                : zh
                  ? "渠道待确认"
                  : "Channel pending"}
              {" · "}
              {modeDefinition
                ? zh
                  ? modeDefinition.nameZh
                  : modeDefinition.name
                : zh
                  ? "方案待确认"
                  : "Route pending"}
            </p>
          </div>
          <div className="border-b border-slate-200 px-5 py-4 xl:border-b-0 xl:border-r">
            <p className="text-xs font-semibold text-slate-500">{zh ? "责任关系" : "Ownership"}</p>
            <p className="mt-2 text-sm font-semibold text-slate-950">
              {getRoleDisplayName(activePhaseDefinition.ownerRole, locale)}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {zh ? "当前处理：" : "Current handler: "}
              {getRoleDisplayName(activePhaseDefinition.activeOwnerRole, locale)}
            </p>
          </div>
          <div className="px-5 py-4 sm:col-span-2 xl:col-span-1">
            <p className="text-xs font-semibold text-slate-500">{zh ? "阶段计划" : "Gate schedule"}</p>
            <p className={`mt-2 text-sm font-semibold ${activePhaseDefinition.overdue ? "text-rose-700" : "text-slate-950"}`}>
              {formatScheduleDate(activePhaseDefinition.plannedDate, locale)}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              {workspace.profile?.target_pilot_date
                ? `${zh ? "目标 Pilot：" : "Target pilot: "}${formatScheduleDate(
                    workspace.profile.target_pilot_date,
                    locale
                  )}`
                : zh
                  ? "尚未设置目标 Pilot 日期"
                  : "Target pilot date is missing"}
            </p>
          </div>
        </div>

        {workspace.currentPhases.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3">
            <span className="mr-1 text-xs font-semibold text-slate-500">
              {zh ? "当前并行阶段" : "Active parallel gates"}
            </span>
            {workspace.currentPhases.map((phase) => (
              <button
                key={phase.code}
                className={`h-8 rounded-md border px-3 text-xs font-semibold ${
                  phase.index === activeWorkflowPhase
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-blue-200"
                }`}
                type="button"
                onClick={() => openWorkflowPhase(phase.index, phase.nextItem?.template.code)}
              >
                {String(phase.index).padStart(2, "0")} · {zh ? phase.nameZh : phase.name}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid 2xl:grid-cols-[minmax(320px,0.72fr)_minmax(0,1.28fr)]">
          <div className="min-w-0 border-b border-slate-200 2xl:border-b-0 2xl:border-r">
            <div className="border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4 text-blue-600" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-slate-950">
                  {zh ? "本阶段任务" : "Current gate tasks"}
                </h3>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                {zh
                  ? "按未完成优先排列。每次聚焦一项，完成后继续下一项。"
                  : "Incomplete work is shown first. Focus on one item before moving to the next."}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {guidedPhaseItems.map((item, index) => {
                const selected = selectedCheck?.template.code === item.template.code;
                return (
                  <button
                    key={item.template.code}
                    className={`flex w-full items-start gap-3 px-5 py-4 text-left ${
                      selected ? "bg-blue-50" : "hover:bg-slate-50"
                    }`}
                    type="button"
                    onClick={() => setSelectedCheckCode(item.template.code)}
                  >
                    <span
                      className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                        ["passed", "waived"].includes(item.status)
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : selected
                            ? "border-blue-300 bg-blue-600 text-white"
                            : "border-slate-200 bg-white text-slate-500"
                      }`}
                    >
                      {["passed", "waived"].includes(item.status) ? "✓" : index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold text-blue-700">
                        {item.template.code}
                      </span>
                      <span className="mt-1 block text-sm font-semibold leading-6 text-slate-900">
                        {zh ? item.template.titleZh : item.template.title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {getRoleDisplayName(item.template.ownerRole, locale)}
                        {" · "}
                        {item.result?.due_date
                          ? formatScheduleDate(item.result.due_date, locale)
                          : zh
                            ? "待确认截止日"
                            : "Due date pending"}
                      </span>
                    </span>
                    <StatusBadge tone={statusTone(item.status)}>
                      {localizedCheckStatus(item.status, zh)}
                    </StatusBadge>
                  </button>
                );
              })}
                  {guidedPhaseItems.length === 0 ? (
                <p className="px-5 py-6 text-sm text-slate-500">
                  {zh
                    ? "当前 Gate 尚未生成适用检查项，请确认媒体渠道与项目状态。"
                    : "No applicable checklist item exists for this gate. Confirm the channel and project status."}
                </p>
              ) : null}
            </div>
          </div>

          <div className="min-w-0">
            {selectedCheck && selectedGuidance ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold text-blue-700">
                      {zh
                        ? `当前任务 ${activeCheckPosition}/${guidedPhaseItems.length}`
                        : `Current task ${activeCheckPosition}/${guidedPhaseItems.length}`}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold leading-7 text-slate-950">
                      {zh ? selectedCheck.template.titleZh : selectedCheck.template.title}
                    </h3>
                  </div>
                  <StatusBadge tone={statusTone(selectedCheck.status)}>
                    {localizedCheckStatus(selectedCheck.status, zh)}
                  </StatusBadge>
                </div>

                <div className="grid border-b border-slate-200 lg:grid-cols-2">
                  <div className="border-b border-slate-200 px-5 py-4 lg:border-b-0 lg:border-r">
                    <p className="text-xs font-semibold text-slate-500">
                      {zh ? "1. 现在需要补充什么" : "1. What to provide now"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-800">
                      {zh ? selectedGuidance.requiredInputZh : selectedGuidance.requiredInput}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-slate-500">
                      {zh ? "2. 需要找谁配合" : "2. Who must collaborate"}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {getRoleDisplayName(selectedCheck.template.ownerRole, locale)}
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {selectedCheck.template.responsibleParty === "MEDIA_ENGINEERING"
                        ? zh
                          ? `输入提供：媒体研发 · 联系人：${
                              workspace.profile?.media_engineering_contact || "待补充"
                            }`
                          : `Input provider: Media engineering · Contact: ${
                              workspace.profile?.media_engineering_contact || "Missing"
                            }`
                        : zh
                          ? selectedCollaboratorRoles.length > 0
                            ? `内部协作：${selectedCollaboratorRoles
                                .map((role) => getRoleDisplayName(role, locale))
                                .join(" / ")}`
                            : "当前无需额外内部协作"
                          : selectedCollaboratorRoles.length > 0
                            ? `Internal collaborators: ${selectedCollaboratorRoles
                                .map((role) => getRoleDisplayName(role, locale))
                                .join(" / ")}`
                            : "No additional internal coordination is required."}
                    </p>
                  </div>
                </div>

                <div className="grid border-b border-slate-200 lg:grid-cols-2">
                  <div className="border-b border-slate-200 px-5 py-4 lg:border-b-0 lg:border-r">
                    <p className="text-xs font-semibold text-slate-500">
                      {zh ? "3. 需要提交什么证据" : "3. Required evidence"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-800">
                      {zh
                        ? selectedGuidance.evidenceExpectationZh
                        : selectedGuidance.evidenceExpectation}
                    </p>
                  </div>
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-slate-500">
                      {zh ? "4. 什么情况下算完成" : "4. Definition of done"}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-800">
                      {zh ? selectedGuidance.passCriteriaZh : selectedGuidance.passCriteria}
                    </p>
                  </div>
                </div>

                {engineeringExecutionLocked ? (
                  <div className="border-b border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-800">
                    {zh
                      ? "正式技术执行尚未解锁。请先完成工程交接页中的 Gate 0–7 和阻塞资料缺口。"
                      : "Formal engineering execution is locked. Complete Gate 0–7 and all blocking handoff packet gaps first."}
                  </div>
                ) : !canEditSelectedCheck ? (
                  <div className="border-b border-blue-200 bg-blue-50 px-5 py-3 text-sm text-blue-800">
                    {zh
                      ? `当前任务由${getRoleDisplayName(
                          selectedCheck.template.ownerRole,
                          locale
                        )}处理；你可以查看进度与证据。`
                      : `This task is owned by ${getRoleDisplayName(
                          selectedCheck.template.ownerRole,
                          locale
                        )}; you can review its progress and evidence.`}
                  </div>
                ) : null}

                <div className="grid gap-4 px-5 py-5 lg:grid-cols-2">
                  <label className="block">
                    <FieldLabel>{zh ? "证据引用（必填后方可通过）" : "Evidence reference (required to pass)"}</FieldLabel>
                    <input
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      value={checkEvidence}
                      onChange={(event) => setCheckEvidence(event.target.value)}
                      placeholder="DOC / LOG / TICKET / URL"
                      disabled={!canEditSelectedCheck}
                    />
                  </label>
                  <label className="block">
                    <FieldLabel>{zh ? "预计完成日期（开始前确认）" : "Expected completion date"}</FieldLabel>
                    <input
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      type="date"
                      value={checkDueDate}
                      onChange={(event) => setCheckDueDate(event.target.value)}
                      disabled={!canEditSelectedCheck}
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <FieldLabel>{zh ? "当前阻塞或需要协调的问题" : "Current blocker or coordination need"}</FieldLabel>
                    <textarea
                      className="mt-2 min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                      value={checkBlocker}
                      onChange={(event) => setCheckBlocker(event.target.value)}
                      placeholder={zh ? "没有阻塞可留空；标记阻塞时必须填写。" : "Leave empty when clear; required when blocking the task."}
                      disabled={!canEditSelectedCheck}
                    />
                  </label>
                  <label className="block lg:col-span-2">
                    <FieldLabel>{zh ? "豁免理由（仅豁免时填写）" : "Waiver reason"}</FieldLabel>
                    <input
                      className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                      value={checkWaiver}
                      onChange={(event) => setCheckWaiver(event.target.value)}
                      disabled={!canEditSelectedCheck}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white px-4 text-sm font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300"
                    type="button"
                    onClick={() => updateSelectedCheck("in_progress")}
                    disabled={!canEditSelectedCheck || !checkDueDate}
                    title={!checkDueDate ? (zh ? "请先确认预计完成日期" : "Set the due date first") : undefined}
                  >
                    <CircleDot className="size-4" aria-hidden="true" />
                    {zh ? "开始处理" : "Start work"}
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    type="button"
                    onClick={() => updateSelectedCheck("passed")}
                    disabled={
                      !canEditSelectedCheck ||
                      (selectedCheck.template.blocking && !checkEvidence.trim())
                    }
                    title={
                      selectedCheck.template.blocking && !checkEvidence.trim()
                        ? (zh ? "阶段门阻塞项必须先提交证据" : "Blocking checks require evidence")
                        : undefined
                    }
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    {zh ? "证据确认并通过" : "Confirm and pass"}
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-700 disabled:cursor-not-allowed disabled:text-slate-300"
                    type="button"
                    onClick={() => updateSelectedCheck("blocked")}
                    disabled={!canEditSelectedCheck || !checkBlocker.trim()}
                    title={!checkBlocker.trim() ? (zh ? "请先填写阻塞原因" : "Add a blocker reason first") : undefined}
                  >
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    {zh ? "请求协调 / 标记阻塞" : "Request help / block"}
                  </button>
                  <button
                    className="h-10 rounded-lg border border-amber-200 bg-white px-4 text-sm font-semibold text-amber-700 disabled:cursor-not-allowed disabled:text-slate-300"
                    type="button"
                    onClick={() => updateSelectedCheck("waived")}
                    disabled={!canEditSelectedCheck || !checkWaiver.trim()}
                  >
                    {zh ? "记录豁免" : "Waive"}
                  </button>
                </div>
              </>
            ) : (
              <p className="px-5 py-8 text-sm text-slate-500">
                {zh
                  ? "当前 Gate 没有可执行检查项，请确认媒体渠道与项目状态。"
                  : "No executable task is available for the current gate."}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={activeWorkspaceView === "overview" ? "border-b border-slate-200" : "hidden"}>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">
            {zh ? "项目协同驾驶舱" : "Project coordination cockpit"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {zh
              ? "统一查看当前阶段、责任人、协作方、阻塞、下一动作与预计完成时间。"
              : "See the current gate, accountable owner, collaborators, blockers, next action, and expected completion in one view."}
          </p>
        </div>

        <div className="grid border-b border-slate-200 sm:grid-cols-2 xl:grid-cols-4">
          <div className="border-b border-slate-200 p-4 sm:border-r xl:border-b-0">
            <p className="text-xs font-semibold text-slate-500">{zh ? "当前工作阶段" : "Current work gate"}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
              {activeCoordinationPhases
                .map((phase) => `${String(phase.index).padStart(2, "0")} ${zh ? phase.nameZh : phase.name}`)
                .join(" / ")}
            </p>
          </div>
          <div className="border-b border-slate-200 p-4 xl:border-b-0 xl:border-r">
            <p className="text-xs font-semibold text-slate-500">{zh ? "当前处理人" : "Current handler"}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-950">
              {coordinationOwners.map((role) => getRoleDisplayName(role, locale)).join(" / ")}
            </p>
          </div>
          <div className="border-b border-slate-200 p-4 sm:border-r xl:border-b-0">
            <p className="text-xs font-semibold text-slate-500">{zh ? "下一里程碑" : "Next milestone"}</p>
            <p className={`mt-2 text-sm font-semibold ${nextMilestoneDate ? "text-slate-950" : "text-amber-700"}`}>
              {formatScheduleDate(nextMilestoneDate, locale)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {scheduleCoverage}/{workspace.phases.length} {zh ? "个阶段已排期" : "gates scheduled"}
            </p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold text-slate-500">{zh ? "计划风险" : "Plan risk"}</p>
            <p className={`mt-2 text-sm font-semibold ${riskPhaseCount ? "text-rose-700" : "text-emerald-700"}`}>
              {riskPhaseCount
                ? `${riskPhaseCount} ${zh ? "个风险阶段" : "gate(s) at risk"}`
                : zh
                  ? "当前计划无风险"
                  : "Plan currently healthy"}
            </p>
          </div>
        </div>

        {!workspace.profile?.target_pilot_date ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-5 py-3">
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden="true" />
              <p className="text-sm text-amber-900">
                {zh
                  ? "尚未设置目标 Pilot 日期，无法自动回排各阶段预计完成时间。"
                  : "A target pilot date is required before the system can project expected completion dates."}
              </p>
            </div>
            <button
              className="h-9 border-b border-amber-700 text-sm font-semibold text-amber-800"
              type="button"
              onClick={() => setActiveWorkspaceView("profile")}
            >
              {zh ? "设置 Pilot 日期" : "Set pilot date"}
            </button>
          </div>
        ) : null}

        <div className="grid border-b border-slate-200 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
          <div className="p-5 lg:border-r lg:border-slate-200">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 text-blue-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-950">{zh ? "当前工作焦点" : "Current work focus"}</h3>
            </div>
            <p className="mt-4 text-lg font-semibold leading-7 text-slate-950">
              {primaryCoordinationPhase.nextItem
                ? zh
                  ? primaryCoordinationPhase.nextItem.template.titleZh
                  : primaryCoordinationPhase.nextItem.template.title
                : project?.next_action ?? (zh ? "当前阶段已完成" : "Current gate is complete")}
            </p>
            <dl className="mt-4 grid gap-4 border-y border-slate-200 py-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-semibold text-slate-500">{zh ? "当前阻塞" : "Current blocker"}</dt>
                <dd className={`mt-2 text-sm leading-6 ${currentBlocker ? "font-semibold text-rose-700" : "text-emerald-700"}`}>
                  {currentBlocker ?? (zh ? "当前无活动阻塞" : "No active blocker")}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-slate-500">{zh ? "阶段输出" : "Gate deliverable"}</dt>
                <dd className="mt-2 text-sm leading-6 text-slate-700">
                  {zh ? primaryCoordinationPhase.outputZh : primaryCoordinationPhase.output}
                </dd>
              </div>
            </dl>
            <button
              className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white"
              type="button"
              onClick={() =>
                openWorkflowPhase(
                  primaryCoordinationPhase.index,
                  primaryCoordinationPhase.nextItem?.template.code
                )
              }
            >
              {zh ? "打开当前阶段任务" : "Open current gate"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </button>
          </div>

          <div className="p-5">
            <div className="flex items-center gap-2">
              <Users className="size-4 text-blue-600" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-slate-950">{zh ? "协作关系" : "Coordination team"}</h3>
            </div>
            <p className="mt-4 text-xs font-semibold text-slate-500">{zh ? "阶段主责" : "Gate accountable"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {accountableCoordinationOwners.map((role) => (
                <StatusBadge key={role} tone="info">{getRoleDisplayName(role, locale)}</StatusBadge>
              ))}
            </div>
            <p className="mt-5 text-xs font-semibold text-slate-500">{zh ? "当前处理" : "Current handler"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {coordinationOwners.map((role) => (
                <StatusBadge key={role} tone="warning">{getRoleDisplayName(role, locale)}</StatusBadge>
              ))}
            </div>
            <p className="mt-5 text-xs font-semibold text-slate-500">{zh ? "需要配合" : "Collaborators"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {coordinationCollaborators.map((role) => (
                <StatusBadge key={role} tone="neutral">{getRoleDisplayName(role, locale)}</StatusBadge>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              {zh
                ? `媒体研发联系人：${workspace.profile?.media_engineering_contact || "待补充"}`
                : `Media engineering contact: ${workspace.profile?.media_engineering_contact || "Missing"}`}
            </p>
          </div>
        </div>

        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-sm font-semibold text-slate-950">{zh ? "全流程协同排期" : "End-to-end coordination plan"}</h3>
          <p className="mt-1 text-xs text-slate-500">
            {zh
              ? "检查项截止日优先；未单独排期时，按目标 Pilot 日期自动回排。"
              : "Check due dates take precedence; otherwise dates are projected backward from the target pilot."}
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {workspace.phases.map((phase) => {
            const phaseStatus = phase.blocker || phase.overdue
              ? "risk"
              : phase.status;
            const statusLabel = phase.blocker
              ? (zh ? "阻塞" : "Blocked")
              : phase.overdue
                ? (zh ? "逾期" : "Overdue")
                : phase.status === "complete"
                  ? (zh ? "已完成" : "Complete")
                  : phase.status === "current"
                    ? (zh ? "进行中" : "Active")
                    : (zh ? "未解锁" : "Locked");
            const collaborators = phase.collaboratorRoles
              .filter(
                (role) =>
                  role !== phase.ownerRole &&
                  role !== phase.activeOwnerRole
              )
              .map((role) => getRoleDisplayName(role, locale))
              .join(" / ");
            const nextAction =
              phase.blocker ??
              (phase.nextItem
                ? zh
                  ? phase.nextItem.template.titleZh
                  : phase.nextItem.template.title
                : phase.status === "complete"
                  ? (zh ? "阶段已关闭" : "Gate closed")
                  : phase.lockedReason);

            return (
              <div
                key={phase.code}
                className={`grid gap-x-6 gap-y-4 px-5 py-5 md:grid-cols-2 ${
                  phaseStatus === "risk"
                    ? "bg-rose-50/40"
                    : phase.status === "current"
                      ? "bg-blue-50/40"
                      : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-950">
                        {String(phase.index).padStart(2, "0")} · {zh ? phase.nameZh : phase.name}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {phase.completedCount}/{phase.total} {zh ? "项完成" : "checks complete"}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        phaseStatus === "risk"
                          ? "danger"
                          : phaseStatus === "complete"
                            ? "success"
                            : phaseStatus === "current"
                              ? "info"
                              : "neutral"
                      }
                    >
                      {statusLabel}
                    </StatusBadge>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${
                        phaseStatus === "risk"
                          ? "bg-rose-500"
                          : phase.status === "complete"
                            ? "bg-emerald-500"
                            : "bg-blue-600"
                      }`}
                      style={{
                        width: `${phase.total > 0 ? Math.round((phase.completedCount / phase.total) * 100) : 100}%`
                      }}
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">
                    {zh ? "预计完成" : "Expected completion"}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <CalendarDays className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <p className={phase.overdue ? "font-semibold text-rose-700" : "font-semibold text-slate-800"}>
                      {formatScheduleDate(phase.plannedDate, locale)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {phase.scheduleSource === "check_due_date"
                      ? (zh ? "来自检查项截止日" : "From check due date")
                      : phase.scheduleSource === "pilot_projection"
                        ? (zh ? "按目标 Pilot 日期回排" : "Projected from target pilot")
                        : (zh ? "需要负责人补充排期" : "Owner must add a schedule")}
                  </p>
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-500">
                    {zh ? "责任与协作" : "Ownership and coordination"}
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {zh ? "阶段主责：" : "Accountable: "}
                    {getRoleDisplayName(phase.ownerRole, locale)}
                  </p>
                  {phase.activeOwnerRole !== phase.ownerRole ? (
                    <p className="mt-1 text-sm font-semibold text-blue-700">
                      {zh ? "当前处理：" : "Current handler: "}
                      {getRoleDisplayName(phase.activeOwnerRole, locale)}
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {zh ? "需要协作：" : "Collaborators: "}
                    {collaborators || (zh ? "当前无需额外协作" : "No additional coordination")}
                  </p>
                </div>

                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">
                        {phase.blocker
                          ? (zh ? "当前阻塞" : "Current blocker")
                          : (zh ? "下一动作" : "Next action")}
                      </p>
                      <p className={`mt-2 text-sm leading-6 ${phase.blocker ? "font-semibold text-rose-700" : "text-slate-700"}`}>
                        {nextAction}
                      </p>
                    </div>
                    <button
                      className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-slate-300"
                      type="button"
                      title={zh ? "打开阶段" : "Open gate"}
                      disabled={phase.status === "locked"}
                      onClick={() => openWorkflowPhase(phase.index, phase.nextItem?.template.code)}
                    >
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className={activeWorkspaceView === "profile" ? "border-b border-slate-200" : "hidden"}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              {zh ? "技术方案配置向导" : "Technical solution setup"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {zh
                ? "按业务顺序完成能力盘点、路线决策、隐私边界、交付方案和工程环境。"
                : "Complete capability assessment, route approval, privacy, delivery, and engineering setup in sequence."}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-slate-500">{zh ? "配置进度" : "Configuration progress"}</p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              {completedProfileSteps} / {profileSteps.length}
            </p>
          </div>
        </div>

        {!profileEditable ? (
          <p className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600">
            {zh
              ? "技术画像由技术集成经理、媒体总监或运营总监维护。"
              : "The technical profile is maintained by Integration Manager, Media Director, or Operations."}
          </p>
        ) : null}

        <div className="grid md:grid-cols-[230px_minmax(0,1fr)]">
          <nav className="border-b border-slate-200 bg-slate-50/70 p-4 md:border-b-0 md:border-r" aria-label={zh ? "方案配置步骤" : "Solution setup steps"}>
            <ol className="space-y-1">
              {profileSteps.map((step, index) => {
                const selected = index === activeProfileStep;
                const available = !profileEditable || index <= activeProfileStep || step.complete;
                return (
                  <li key={step.key}>
                    <button
                      className={`flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left ${
                        selected
                          ? "bg-blue-50 text-blue-900"
                          : available
                            ? "text-slate-700 hover:bg-white"
                            : "cursor-not-allowed text-slate-400"
                      }`}
                      type="button"
                      disabled={!available}
                      onClick={() => setActiveProfileStep(index)}
                    >
                      <span className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold ${
                        step.complete
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : selected
                            ? "border-blue-300 bg-white text-blue-700"
                            : "border-slate-200 bg-white text-slate-400"
                      }`}>
                        {step.complete ? <CheckCircle2 className="size-4" aria-hidden="true" /> : index + 1}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[11px] font-semibold">{step.gate}</span>
                        <span className="mt-0.5 block text-sm font-semibold leading-5">{step.title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div className="min-w-0">
            <div className="grid border-b border-slate-200 bg-white xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="px-5 py-4">
                <div className="flex items-center gap-2">
                  <StatusBadge tone={currentProfileStep.complete ? "success" : "warning"}>
                    {currentProfileStep.complete
                      ? (zh ? "本步已完成" : "Step complete")
                      : (zh ? "需要处理" : "Action required")}
                  </StatusBadge>
                  <span className="text-xs font-semibold text-blue-700">{currentProfileStep.gate}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-slate-950">{currentProfileStep.title}</h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">{currentProfileStep.summary}</p>
              </div>
              <aside className="border-t border-slate-200 bg-slate-50/70 px-5 py-4 text-xs leading-5 xl:border-l xl:border-t-0">
                <p><strong className="text-slate-900">{zh ? "需要输入：" : "Input: "}</strong>{currentProfileStep.requiredInput}</p>
                <p className="mt-2"><strong className="text-slate-900">{zh ? "系统输出：" : "Output: "}</strong>{currentProfileStep.output}</p>
                <p className="mt-2"><strong className="text-slate-900">{zh ? "完成条件：" : "Done when: "}</strong>{currentProfileStep.completion}</p>
              </aside>
            </div>

            <fieldset disabled={!profileEditable}>
          <div className={activeProfileStep <= 1 ? "border-b border-slate-200 bg-white p-5" : "hidden"}>
            <div>
              <div className={activeProfileStep === 1 ? "grid content-start gap-4 sm:grid-cols-2" : "hidden"}>
                <label>
                  <FieldLabel>{zh ? "流量渠道" : "Traffic channel"}</FieldLabel>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    value={profileDraft.trafficChannel}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        trafficChannel: event.target.value as IntegrationProjectProfileInput["trafficChannel"]
                      }))
                    }
                  >
                    {integrationChannels.map((channel) => (
                      <option key={channel.code} value={channel.code}>
                        {zh ? channel.nameZh : channel.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <FieldLabel>{zh ? "接入模式" : "Integration mode"}</FieldLabel>
                  <select
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    value={profileDraft.integrationMode}
                    onChange={(event) =>
                      setProfileDraft((current) => ({
                        ...current,
                        integrationMode: event.target.value as IntegrationProjectProfileInput["integrationMode"]
                      }))
                    }
                  >
                    {integrationModes.map((mode) => (
                      <option key={mode.code} value={mode.code}>
                        {zh ? mode.nameZh : mode.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="sm:col-span-2">
                  <FieldLabel>{zh ? "交付协议" : "Delivery protocols"}</FieldLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {integrationProtocols.map((protocol) => (
                      <label
                        key={protocol.code}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${
                          profileDraft.protocolCodes.includes(protocol.code)
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        <input
                          className="sr-only"
                          type="checkbox"
                          checked={profileDraft.protocolCodes.includes(protocol.code)}
                          onChange={() => toggleProtocol(protocol.code)}
                        />
                        {zh ? protocol.nameZh : protocol.name}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="sm:col-span-2 border-t border-slate-200 pt-4">
                  <p className="text-xs font-semibold text-slate-500">{zh ? "路径判断" : "Route assessment"}</p>
                  <p className="mt-2 text-sm font-semibold text-slate-950">
                    {zh ? selectedModeDefinition?.nameZh : selectedModeDefinition?.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {zh ? selectedModeDefinition?.descriptionZh : selectedModeDefinition?.description}
                  </p>
                  {recommendedMode !== profileDraft.integrationMode ? (
                    <p className="mt-3 border-l-2 border-amber-400 pl-3 text-xs leading-5 text-amber-800">
                      {zh ? "按当前能力更适合：" : "Current capabilities recommend: "}
                      <span className="font-semibold">
                        {zh ? recommendedModeDefinition?.nameZh : recommendedModeDefinition?.name}
                      </span>
                    </p>
                  ) : (
                    <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="size-4" aria-hidden="true" />
                      {zh ? "当前能力与所选路径一致" : "Selected route matches the assessed capabilities"}
                    </p>
                  )}
                </div>
              </div>

              <div className={activeProfileStep === 0 ? "" : "hidden"}>
                <p className="text-xs font-semibold text-slate-600">{zh ? "媒体现有技术能力" : "Existing media capabilities"}</p>
                <div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  {(Object.keys(capabilityLabels) as (keyof IntegrationCapabilityProfile)[]).map((capability) => (
                    <label key={capability} className="flex min-h-10 items-center gap-3 border-b border-slate-200 py-2 text-sm text-slate-700">
                      <input
                        className="size-4 rounded border-slate-300 text-blue-600"
                        type="checkbox"
                        checked={profileDraft.capabilityProfile[capability]}
                        onChange={() => toggleCapability(capability)}
                      />
                      <span>{capabilityLabels[capability][zh ? 0 : 1]}</span>
                    </label>
                  ))}
                </div>
                <div className="mt-4 border-l-4 border-blue-400 bg-blue-50 px-4 py-3">
                  <p className="text-xs font-semibold text-blue-700">
                    {zh ? "系统建议接入模式" : "Recommended integration mode"}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-blue-950">
                    {zh ? recommendedModeDefinition?.nameZh : recommendedModeDefinition?.name}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-blue-800">
                    {zh ? recommendedModeDefinition?.descriptionZh : recommendedModeDefinition?.description}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className={activeProfileStep >= 2 ? "border-b border-slate-200 bg-white p-5" : "hidden"}>
          <div className={activeProfileStep === 4 ? "" : "hidden"}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label>
              <FieldLabel>{zh ? "平台" : "Platform"}</FieldLabel>
              <select
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={profileDraft.platform}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    platform: event.target.value as IntegrationProjectProfileInput["platform"]
                  }))
                }
              >
                <option value="android">Android</option>
                <option value="android_tv">Android TV</option>
                <option value="other">{zh ? "其他" : "Other"}</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <FieldLabel>{zh ? "媒体包名 / 平台标识" : "Package / property identifier"}</FieldLabel>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                value={profileDraft.propertyIdentifier}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, propertyIdentifier: event.target.value }))
                }
                placeholder="com.publisher.app"
              />
            </label>
            <label>
              <FieldLabel>minSdk</FieldLabel>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                type="number"
                value={profileDraft.minSdk ?? ""}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, minSdk: Number(event.target.value) || undefined }))
                }
              />
            </label>
            <label>
              <FieldLabel>targetSdk</FieldLabel>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                type="number"
                value={profileDraft.targetSdk ?? ""}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, targetSdk: Number(event.target.value) || undefined }))
                }
              />
            </label>
            <label>
              <FieldLabel>compileSdk</FieldLabel>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                type="number"
                value={profileDraft.compileSdk ?? ""}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, compileSdk: Number(event.target.value) || undefined }))
                }
              />
            </label>
            <label>
              <FieldLabel>AGP</FieldLabel>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                value={profileDraft.agpVersion ?? ""}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, agpVersion: event.target.value }))
                }
                placeholder="8.7.3"
              />
            </label>
            <label>
              <FieldLabel>Gradle</FieldLabel>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                value={profileDraft.gradleVersion ?? ""}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, gradleVersion: event.target.value }))
                }
                placeholder="8.9"
              />
            </label>
            <label>
              <FieldLabel>{zh ? "语言" : "Language"}</FieldLabel>
              <select
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={profileDraft.language ?? ""}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    language: event.target.value as IntegrationProjectProfileInput["language"]
                  }))
                }
              >
                <option value="">{zh ? "请选择" : "Select"}</option>
                <option value="java">Java</option>
                <option value="kotlin">Kotlin</option>
                <option value="mixed">Java + Kotlin</option>
              </select>
            </label>
            <label>
              <FieldLabel>{zh ? "进程模型" : "Process model"}</FieldLabel>
              <select
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={profileDraft.processModel ?? ""}
                onChange={(event) =>
                  setProfileDraft((current) => ({
                    ...current,
                    processModel: event.target.value as IntegrationProjectProfileInput["processModel"]
                  }))
                }
              >
                <option value="single_process">{zh ? "单进程" : "Single process"}</option>
                <option value="multi_process">{zh ? "多进程" : "Multi process"}</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              <FieldLabel>{zh ? "媒体研发联系人" : "Media engineering contact"}</FieldLabel>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                value={profileDraft.mediaEngineeringContact}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, mediaEngineeringContact: event.target.value }))
                }
                placeholder="name / email / team channel"
              />
            </label>
            <label>
              <FieldLabel>{zh ? "目标 Pilot 日期" : "Target pilot date"}</FieldLabel>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                type="date"
                value={profileDraft.targetPilotDate ?? ""}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, targetPilotDate: event.target.value }))
                }
              />
            </label>
            <label className="sm:col-span-2 lg:col-span-3">
              <span className="flex items-center gap-2">
                <KeyRound className="size-4 text-amber-600" aria-hidden="true" />
                <FieldLabel>{zh ? "密钥引用（禁止填写明文）" : "Secret reference (never enter the raw value)"}</FieldLabel>
              </span>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-amber-200 bg-amber-50/40 px-3 font-mono text-sm"
                value={profileDraft.secretReference ?? ""}
                onChange={(event) =>
                  setProfileDraft((current) => ({ ...current, secretReference: event.target.value }))
                }
                placeholder="vault://pgos/media/app-key"
              />
            </label>
          </div>
          </div>

          <div className="space-y-5">
            <div className={activeProfileStep === 3 ? "" : "hidden"}>
              <h3 className="text-sm font-semibold text-slate-950">{zh ? "技术 Playbook" : "Technical playbooks"}</h3>
              <div className="mt-3 divide-y divide-slate-100 border-y border-slate-200">
                {workspace.availablePlaybooks.map((playbook) => (
                  <label key={playbook.code} className="flex cursor-pointer items-start gap-3 py-3">
                    <input
                      className="mt-1 size-4 rounded border-slate-300 text-blue-600"
                      type="checkbox"
                      checked={profileDraft.playbookCodes.includes(playbook.code)}
                      onChange={() => togglePlaybook(playbook.code)}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-slate-900">
                        {zh ? playbook.nameZh : playbook.name}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {playbook.vendor} / {playbook.version}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className={activeProfileStep === 3 ? "" : "hidden"}>
              <h3 className="text-sm font-semibold text-slate-950">{zh ? "计划广告形式" : "Planned ad formats"}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {adFormats.map((format) => (
                  <label
                    key={format}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold ${
                      profileDraft.plannedFormats.includes(format)
                        ? "border-blue-300 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="checkbox"
                      checked={profileDraft.plannedFormats.includes(format)}
                      onChange={() => toggleFormat(format)}
                    />
                    {format}
                  </label>
                ))}
              </div>
            </div>

            <div className={activeProfileStep === 2 ? "" : "hidden"}>
              <p className="text-xs font-semibold text-blue-700">
                Gate 06 · {zh ? "隐私、数据及监管边界" : "Privacy, data, and regulatory boundary"}
              </p>
              <h3 className="mt-2 text-sm font-semibold text-slate-950">
                {zh ? "隐私与标识符" : "Privacy and identifiers"}
              </h3>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {Object.entries(profileDraft.privacyProfile).map(([key, value]) => (
                  <label key={key} className="flex items-start gap-2 text-slate-700">
                    <input
                      className="mt-0.5 size-4 rounded border-slate-300 text-blue-600"
                      type="checkbox"
                      checked={value}
                      onChange={(event) =>
                        setProfileDraft((current) => ({
                          ...current,
                          privacyProfile: {
                            ...current.privacyProfile,
                            [key]: event.target.checked
                          }
                        }))
                      }
                    />
                    <span>{key.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          </div>
        </fieldset>

            <div className={`px-5 py-4 ${currentProfileStep.issues.length ? "bg-amber-50" : "bg-emerald-50/60"}`}>
              {currentProfileStep.issues.length ? (
                <div>
                  <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    {zh ? "完成本步前还需要：" : "Before continuing:"}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm leading-5 text-amber-800">
                    {currentProfileStep.issues.map((issue) => <li key={issue}>· {issue}</li>)}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  {activeProfileStep === profileSteps.length - 1
                    ? (zh ? "技术方案资料已通过校验，可以保存并生成清单。" : "The solution data is valid and ready to save.")
                    : (zh ? "本步条件已满足，可以继续下一步。" : "This step is complete. Continue to the next step.")}
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4">
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                type="button"
                disabled={activeProfileStep === 0}
                onClick={() => setActiveProfileStep((current) => Math.max(0, current - 1))}
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {zh ? "上一步" : "Previous"}
              </button>

              {activeProfileStep < profileSteps.length - 1 ? (
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  disabled={profileEditable && !canAdvanceProfileStep}
                  onClick={() => setActiveProfileStep((current) => Math.min(profileSteps.length - 1, current + 1))}
                >
                  {zh ? "继续下一步" : "Continue"}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </button>
              ) : (
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  onClick={() => onSaveProfile(profileDraft)}
                  disabled={!profileEditable || draftProfileIssues.length > 0}
                >
                  <Save className="size-4" aria-hidden="true" />
                  {zh ? "保存并生成技术清单" : "Save and generate checklist"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className={activeWorkspaceView === "gates" ? "border-b border-slate-200" : "hidden"}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{zh ? "接入阶段门与可执行清单" : "Integration stage gates and checklist"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {zh
                ? "Gate 0–3 串行完成；Gate 4–7 由商务、供应链、法务与技术并行关闭；四项全部通过后才解锁 Gate 8。Gate 8–12 依次完成技术实施、生产认证、灰度验证与规模治理。"
                : "Complete Gates 0-3 in sequence. Commercial, supply, privacy, and architecture teams close Gates 4-7 in parallel; all four must pass before Gate 8 unlocks. Gates 8-12 then cover implementation, certification, pilot, and scale governance."}
            </p>
          </div>
          <StatusBadge tone={workspace.currentPhase.status === "current" ? "info" : "success"}>
            {`${workspace.currentPhases.length > 1 ? (zh ? "并行阶段" : "Parallel") : (zh ? "当前阶段" : "Current")} ${
              workspace.currentPhases.length > 1
                ? workspace.currentPhases.map((phase) => String(phase.index).padStart(2, "0")).join("/")
                : String(workspace.currentPhase.index).padStart(2, "0")
            }`}
          </StatusBadge>
        </div>

        <div className="border-b border-slate-200 bg-slate-50/60 p-4">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2">
            {workspace.phases.map((phase) => {
              const selected = phase.index === activeWorkflowPhase;
              const locked = phase.status === "locked";
              const phaseTone = phase.status === "complete"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : phase.status === "current"
                  ? "border-blue-300 bg-blue-50 text-blue-950"
                  : "border-slate-200 bg-white text-slate-400";

              return (
                <button
                  key={phase.code}
                  className={`min-h-28 rounded-lg border p-3 text-left transition-colors ${phaseTone} ${
                    selected ? "ring-2 ring-blue-500 ring-offset-1" : ""
                  } ${locked ? "cursor-not-allowed" : "hover:border-blue-300"}`}
                  type="button"
                  title={phase.lockedReason}
                  disabled={locked}
                  onClick={() => {
                    openWorkflowPhase(phase.index, phase.nextItem?.template.code, "gates");
                  }}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">
                      {String(phase.index).padStart(2, "0")}
                    </span>
                    {phase.status === "complete" ? (
                      <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
                    ) : locked ? (
                      <LockKeyhole className="size-4 text-slate-400" aria-hidden="true" />
                    ) : (
                      <CircleDot className="size-4 text-blue-600" aria-hidden="true" />
                    )}
                  </span>
                  <span className="mt-2 block text-xs font-semibold leading-5">
                    {zh ? phase.nameZh : phase.name}
                  </span>
                  <span className="mt-2 block text-[11px] leading-4 opacity-75">
                    {phase.dependsOn.length > 0
                      ? `${zh ? "前置" : "Requires"} ${phase.dependsOn
                          .map((dependency) => String(dependency).padStart(2, "0"))
                          .join(" / ")}`
                      : zh
                        ? "流程起点"
                        : "Entry gate"}
                  </span>
                  <span className="mt-1 block text-xs opacity-75">
                    {phase.completedCount}/{phase.total}
                  </span>
                </button>
              );
            })}
          </div>
          {workspace.phases.find((phase) => phase.index === activeWorkflowPhase) ? (
            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
              <FileCheck2 className="mt-0.5 size-4 shrink-0 text-blue-600" aria-hidden="true" />
              <span>
                <strong className="text-slate-800">{zh ? "阶段输出：" : "Phase output: "}</strong>
                {zh
                  ? workspace.phases.find((phase) => phase.index === activeWorkflowPhase)?.outputZh
                  : workspace.phases.find((phase) => phase.index === activeWorkflowPhase)?.output}
              </span>
            </div>
          ) : null}
        </div>

        <div className="grid 2xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
          <div className="min-w-0 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">{zh ? "检查项" : "Check"}</th>
                  <th className="px-4 py-3 font-semibold">{zh ? "负责人" : "Owner"}</th>
                  <th className="px-4 py-3 font-semibold">{zh ? "责任方" : "Party"}</th>
                  <th className="px-4 py-3 font-semibold">{zh ? "状态" : "Status"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {phaseItems.map((item) => (
                  <tr
                    key={item.template.code}
                    className={`cursor-pointer align-top hover:bg-slate-50 ${
                      selectedCheck?.template.code === item.template.code ? "bg-blue-50/60" : ""
                    }`}
                    onClick={() => setSelectedCheckCode(item.template.code)}
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">
                        {item.template.code} · {zh ? item.template.titleZh : item.template.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.template.category} · {item.template.blocking ? (zh ? "阶段门阻塞项" : "stage-gate blocker") : (zh ? "非阻塞项" : "non-blocking")}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-slate-700">{getRoleDisplayName(item.template.ownerRole, locale)}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {item.template.responsibleParty === "MEDIA_ENGINEERING"
                        ? (zh ? "媒体研发" : "Media engineering")
                        : "PG OS"}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge tone={statusTone(item.status)}>{localizedCheckStatus(item.status, zh)}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {phaseItems.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                {zh ? "请先保存技术画像，系统将按 Playbook 生成清单。" : "Save the technical profile to generate the scoped checklist."}
              </p>
            ) : null}
          </div>

          <aside className="border-t border-slate-200 bg-slate-50/60 p-5 2xl:border-l 2xl:border-t-0">
            {selectedCheck ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-blue-700">{selectedCheck.template.code}</p>
                    <h3 className="mt-2 text-base font-semibold text-slate-950">
                      {zh ? selectedCheck.template.titleZh : selectedCheck.template.title}
                    </h3>
                  </div>
                  <StatusBadge tone={statusTone(selectedCheck.status)}>
                    {localizedCheckStatus(selectedCheck.status, zh)}
                  </StatusBadge>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 border-y border-slate-200 py-4 text-xs">
                  <div>
                    <dt className="text-slate-500">{zh ? "内部负责人" : "Internal owner"}</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {getRoleDisplayName(selectedCheck.template.ownerRole, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">{zh ? "执行责任方" : "Responsible party"}</dt>
                    <dd className="mt-1 font-semibold text-slate-800">
                      {selectedCheck.template.responsibleParty === "MEDIA_ENGINEERING"
                        ? (zh ? "媒体研发" : "Media engineering")
                        : "PG OS"}
                    </dd>
                  </div>
                </dl>
                <label className="mt-4 block">
                  <FieldLabel>{zh ? "证据引用" : "Evidence reference"}</FieldLabel>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    value={checkEvidence}
                    onChange={(event) => setCheckEvidence(event.target.value)}
                    placeholder="DOC / LOG / TICKET / URL"
                    disabled={!canEditSelectedCheck}
                  />
                </label>
                <label className="mt-3 block">
                  <FieldLabel>{zh ? "计划完成日期" : "Due date"}</FieldLabel>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    type="date"
                    value={checkDueDate}
                    onChange={(event) => setCheckDueDate(event.target.value)}
                    disabled={!canEditSelectedCheck}
                  />
                </label>
                <label className="mt-3 block">
                  <FieldLabel>{zh ? "阻塞 / 失败原因" : "Blocker / failure reason"}</FieldLabel>
                  <textarea
                    className="mt-2 min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    value={checkBlocker}
                    onChange={(event) => setCheckBlocker(event.target.value)}
                    disabled={!canEditSelectedCheck}
                  />
                </label>
                <label className="mt-3 block">
                  <FieldLabel>{zh ? "豁免理由" : "Waiver reason"}</FieldLabel>
                  <input
                    className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                    value={checkWaiver}
                    onChange={(event) => setCheckWaiver(event.target.value)}
                    disabled={!canEditSelectedCheck}
                  />
                </label>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white text-sm font-semibold text-blue-700 disabled:text-slate-300"
                    type="button"
                    onClick={() => updateSelectedCheck("in_progress")}
                    disabled={!canEditSelectedCheck}
                  >
                    <CircleDot className="size-4" aria-hidden="true" />
                    {zh ? "开始" : "Start"}
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white disabled:bg-slate-300"
                    type="button"
                    onClick={() => updateSelectedCheck("passed")}
                    disabled={!canEditSelectedCheck}
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    {zh ? "通过" : "Pass"}
                  </button>
                  <button
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-rose-200 bg-white text-sm font-semibold text-rose-700 disabled:text-slate-300"
                    type="button"
                    onClick={() => updateSelectedCheck("blocked")}
                    disabled={!canEditSelectedCheck}
                  >
                    <AlertTriangle className="size-4" aria-hidden="true" />
                    {zh ? "标记阻塞" : "Block"}
                  </button>
                  <button
                    className="h-10 rounded-lg border border-amber-200 bg-white text-sm font-semibold text-amber-700 disabled:text-slate-300"
                    type="button"
                    onClick={() => updateSelectedCheck("waived")}
                    disabled={!canEditSelectedCheck}
                  >
                    {zh ? "记录豁免" : "Waive"}
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {zh ? "选择一项检查，补充证据并更新执行状态。" : "Select a check to attach evidence and update execution status."}
              </p>
            )}
          </aside>
        </div>
      </section>

      <section className={activeWorkspaceView === "evidence" ? "border-b border-slate-200" : "hidden"}>
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">{zh ? "联调摘要证据" : "Integration summary evidence"}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {zh ? "用于管理层审核的四类摘要证据；详细执行依据以上 Checklist 为准。" : "Four executive evidence types remain for readiness review; the detailed checklist is authoritative."}
          </p>
        </div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="divide-y divide-slate-100">
            {legacy.items.map((item) => (
              <div key={item.type} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{evidenceLabel(item.type)}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.evidence?.reference ?? item.checklistKey}</p>
                </div>
                <StatusBadge tone={item.done && item.evidence ? "success" : "warning"}>
                  {item.done && item.evidence ? t("integration.recorded") : t("integration.required")}
                </StatusBadge>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-200 bg-slate-50/60 p-5 lg:border-l lg:border-t-0">
            <label>
              <FieldLabel>{t("integration.evidenceType")}</FieldLabel>
              <select
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={evidenceType}
                onChange={(event) => setEvidenceType(event.target.value as IntegrationEvidenceType)}
                disabled={!executionManager || !handoff.readyForExecution}
              >
                {integrationEvidenceDefinitions.map((item) => (
                  <option key={item.type} value={item.type}>{evidenceLabel(item.type)}</option>
                ))}
              </select>
            </label>
            <label className="mt-3 block">
              <FieldLabel>{t("integration.evidenceReference")}</FieldLabel>
              <input
                className="mt-2 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                value={evidenceReference}
                onChange={(event) => setEvidenceReference(event.target.value)}
                placeholder="LOG / URL / TICKET"
                disabled={!executionManager || !handoff.readyForExecution}
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white text-sm font-semibold text-blue-700 disabled:text-slate-300"
                type="button"
                onClick={onStart}
                disabled={!executionManager || !executionStartable || !handoff.readyForExecution}
              >
                <Play className="size-4" aria-hidden="true" />
                {t("integration.startExecution")}
              </button>
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 text-sm font-semibold text-white disabled:bg-slate-300"
                type="button"
                onClick={() => {
                  onRecordEvidence({
                    evidenceType,
                    title: evidenceLabel(evidenceType),
                    reference: evidenceReference
                  });
                  setEvidenceReference("");
                }}
                disabled={
                  !executionManager ||
                  !executionActive ||
                  !handoff.readyForExecution ||
                  Boolean(project?.blocker) ||
                  !evidenceReference.trim()
                }
              >
                <FileCheck2 className="size-4" aria-hidden="true" />
                {t("integration.recordEvidence")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className={activeWorkspaceView === "evidence" ? "grid lg:grid-cols-[minmax(0,1fr)_360px]" : "hidden"}>
        <div className="p-5">
          <h2 className="text-base font-semibold text-slate-950">{zh ? "项目阻塞与上线门禁" : "Project blocker and readiness gate"}</h2>
          {project?.blocker ? (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-l-4 border-rose-500 bg-rose-50 px-4 py-3">
              <p className="text-sm text-rose-800">{project.blocker}</p>
              <button
                className="h-9 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700"
                type="button"
                onClick={onResolveBlocker}
                disabled={!executionManager}
              >
                {t("integration.resolveBlocker")}
              </button>
            </div>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
              <ShieldCheck className="size-4" aria-hidden="true" />
              {t("integration.noBlocker")}
            </p>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-sm"
              value={projectBlocker}
              onChange={(event) => setProjectBlocker(event.target.value)}
              placeholder={t("integration.blockerPlaceholder")}
              disabled={!executionManager}
            />
            <button
              className="h-10 rounded-lg border border-rose-200 px-4 text-sm font-semibold text-rose-700 disabled:text-slate-300"
              type="button"
              onClick={() => {
                onSetBlocker(projectBlocker);
                setProjectBlocker("");
              }}
              disabled={!executionManager || readinessPassed || !projectBlocker.trim()}
            >
              {t("integration.setBlocker")}
            </button>
          </div>
          {workspace.stageGates.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {workspace.stageGates.map((gate) => (
                <StatusBadge key={gate.id} tone={gate.status === "approved" ? "success" : gate.status === "blocked" ? "danger" : "info"}>
                  {`${gate.stage.replace(/_/g, " ")} · ${gate.status.replace(/_/g, " ")}`}
                </StatusBadge>
              ))}
            </div>
          ) : null}
        </div>
        <div className="border-t border-slate-200 bg-slate-50/60 p-5 lg:border-l lg:border-t-0">
          <p className="text-xs font-semibold text-slate-500">{zh ? "提交前必须满足" : "Required before submission"}</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li>· {zh ? "技术画像完整" : "Technical profile complete"}</li>
            <li>· {zh ? "所有阻塞 Checklist 已通过或获批豁免" : "All blocking checks passed or formally waived"}</li>
            <li>· {zh ? "四类摘要证据完整" : "All four summary evidence types recorded"}</li>
            <li>· {zh ? "没有活动阻塞" : "No active blocker"}</li>
          </ul>
          <button
            className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            onClick={onSubmit}
            disabled={
              !readinessSubmitter ||
              !legacy.ready ||
              !workspace.profileComplete ||
              Boolean(workspace.nextBlockingItem) ||
              readinessPassed
            }
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {t("integration.submitReadiness")}
          </button>
        </div>
      </section>
    </article>
  );
}
