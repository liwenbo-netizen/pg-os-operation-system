import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  FileCheck2,
  KeyRound,
  Play,
  Save,
  ShieldCheck,
  Wrench
} from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { getRoleDisplayName, useLocale } from "../../lib/i18n";
import {
  integrationEvidenceDefinitions,
  mediaWorkflowService
} from "../../services/mediaWorkflowService";
import {
  sdkIntegrationService,
  type IntegrationCheckUpdateInput,
  type IntegrationProjectProfileInput
} from "../../services/sdkIntegrationService";
import type {
  BusinessUser,
  IntegrationAdFormat,
  IntegrationEvidenceType,
  IntegrationPlaybookCode,
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
      privacyProfile: { ...profile.privacy_profile },
      targetPilotDate: profile.target_pilot_date,
      secretReference: profile.secret_reference
    };
  }

  return {
    platform: "android",
    propertyIdentifier: publisher.metadata?.property_identifier ?? "",
    playbookCodes: ["origin_ads_android_1_2", "origin_ivt_android_v11"],
    minSdk: 23,
    targetSdk: 35,
    compileSdk: 35,
    language: "mixed",
    processModel: "single_process",
    mediaEngineeringContact: primaryContact?.email ?? "",
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

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs font-semibold text-slate-600">{children}</span>;
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
  onSubmit
}: TechnicalIntegrationWorkspaceProps) {
  const { locale, t } = useLocale();
  const zh = locale === "zh-CN";
  const workspace = sdkIntegrationService.getWorkspaceSnapshot(state, publisher.id);
  const legacy = mediaWorkflowService.getIntegrationExecutionSnapshot(state, publisher.id);
  const project = workspace.project;
  const [profileDraft, setProfileDraft] = useState(() => createProfileDraft(publisher, state));
  const [activeStage, setActiveStage] = useState<"TECHNICAL_QUALIFICATION" | "SDK_INTEGRATION">(
    "TECHNICAL_QUALIFICATION"
  );
  const [selectedCheckCode, setSelectedCheckCode] = useState("");
  const [checkEvidence, setCheckEvidence] = useState("");
  const [checkBlocker, setCheckBlocker] = useState("");
  const [checkWaiver, setCheckWaiver] = useState("");
  const [checkDueDate, setCheckDueDate] = useState("");
  const [evidenceType, setEvidenceType] = useState<IntegrationEvidenceType>("connection_config");
  const [evidenceReference, setEvidenceReference] = useState("");
  const [projectBlocker, setProjectBlocker] = useState("");

  const stageItems = useMemo(
    () => workspace.items.filter((item) => item.template.stage === activeStage),
    [activeStage, workspace.items]
  );
  const selectedCheck =
    stageItems.find((item) => item.template.code === selectedCheckCode) ?? stageItems[0];
  const passedBlocking = workspace.items.filter(
    (item) => item.template.blocking && ["passed", "waived"].includes(item.status)
  ).length;
  const totalBlocking = workspace.items.filter((item) => item.template.blocking).length;
  const executionActive = Boolean(project && ["in_integration", "technical_review"].includes(project.status));
  const executionStartable = Boolean(project && ["draft", "pending_integration"].includes(project.status));
  const readinessPassed = project?.status === "technical_live_passed";
  const profileEditable = sdkIntegrationService.canManageProfile(user);
  const executionManager = sdkIntegrationService.canManageExecution(user);
  const readinessSubmitter = sdkIntegrationService.canSubmitReadiness(user);
  const manageableCheckCount = workspace.items.filter((item) =>
    sdkIntegrationService.canManageCheck(user, item.template.ownerRole)
  ).length;
  const canEditSelectedCheck = Boolean(
    selectedCheck &&
    sdkIntegrationService.canManageCheck(user, selectedCheck.template.ownerRole)
  );

  useEffect(() => {
    setProfileDraft(createProfileDraft(publisher, state));
  }, [publisher.id, workspace.profile?.updated_at]);

  useEffect(() => {
    const requested = workspace.items.find(
      (item) => item.template.code === initialCheckCode
    );
    const assigned = workspace.items.find(
      (item) =>
        sdkIntegrationService.canManageCheck(user, item.template.ownerRole) &&
        !["passed", "waived"].includes(item.status)
    );
    const preferred = requested ?? assigned ?? workspace.items[0];

    if (preferred) {
      setActiveStage(preferred.template.stage);
      setSelectedCheckCode(preferred.template.code);
    }
  }, [initialCheckCode, publisher.id, user.activeRole, workspace.profile?.updated_at]);

  useEffect(() => {
    if (!selectedCheck || selectedCheck.template.code === selectedCheckCode) return;
    setSelectedCheckCode(selectedCheck.template.code);
  }, [selectedCheck, selectedCheckCode]);

  useEffect(() => {
    setCheckEvidence(selectedCheck?.result?.evidence_reference ?? "");
    setCheckBlocker(selectedCheck?.result?.blocker ?? "");
    setCheckWaiver(selectedCheck?.result?.waiver_reason ?? "");
    setCheckDueDate(selectedCheck?.result?.due_date ?? "");
  }, [selectedCheck?.template.code, selectedCheck?.result?.updated_at]);

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

  function evidenceLabel(type: IntegrationEvidenceType) {
    if (type === "connection_config") return t("integration.connectionConfig");
    if (type === "test_request") return t("integration.testRequest");
    if (type === "callback_log") return t("integration.callbackLog");
    return t("integration.productionLog");
  }

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

      <div className="grid border-b border-slate-200 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-b border-slate-200 p-4 sm:border-r xl:border-b-0">
          <p className="text-xs font-semibold text-slate-500">{zh ? "技术画像" : "Technical profile"}</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">
            {workspace.profileComplete ? (zh ? "已配置" : "Configured") : (zh ? "待完善" : "Incomplete")}
          </p>
        </div>
        <div className="border-b border-slate-200 p-4 xl:border-b-0 xl:border-r">
          <p className="text-xs font-semibold text-slate-500">{zh ? "阻塞清单完成" : "Blocking checks passed"}</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{passedBlocking} / {totalBlocking}</p>
        </div>
        <div className="border-b border-slate-200 p-4 sm:border-r xl:border-b-0">
          <p className="text-xs font-semibold text-slate-500">{zh ? "当前阻塞" : "Active blockers"}</p>
          <p className={`mt-2 text-lg font-semibold ${workspace.blockedCount ? "text-rose-700" : "text-emerald-700"}`}>
            {workspace.blockedCount}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-semibold text-slate-500">{zh ? "下一项" : "Next check"}</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {workspace.nextBlockingItem?.template.code ?? (zh ? "详细清单已完成" : "Detailed checklist complete")}
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

      <section className="border-b border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{zh ? "1. 技术画像与 Playbook" : "1. Technical profile and playbooks"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {zh ? "只保存非敏感配置；App Secret 必须使用密钥管理器引用。" : "Store non-secret configuration only. App secrets must use a secret-manager reference."}
            </p>
          </div>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            type="button"
            onClick={() => onSaveProfile(profileDraft)}
            disabled={!sdkIntegrationService.canManageProfile(user)}
          >
            <Save className="size-4" aria-hidden="true" />
            {zh ? "保存技术画像" : "Save profile"}
          </button>
        </div>

        {!profileEditable ? (
          <p className="border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs text-slate-600">
            {zh
              ? "技术画像由 Integration Manager、Media Director 或 Operations 维护。"
              : "The technical profile is maintained by Integration Manager, Media Director, or Operations."}
          </p>
        ) : null}

        <fieldset className="contents" disabled={!profileEditable}>
          <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
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

          <div className="space-y-5 border-slate-200 xl:border-l xl:pl-5">
            <div>
              <h3 className="text-sm font-semibold text-slate-950">{zh ? "SDK Playbook" : "SDK playbooks"}</h3>
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

            <div>
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

            <div>
              <h3 className="text-sm font-semibold text-slate-950">{zh ? "隐私与标识符" : "Privacy and identifiers"}</h3>
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

        {!workspace.profileComplete ? (
          <div className="border-t border-amber-200 bg-amber-50 px-5 py-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
              <AlertTriangle className="size-4" aria-hidden="true" />
              {zh ? "技术画像尚未满足阶段门：" : "Technical profile gate is incomplete:"}
            </p>
            <p className="mt-1 text-sm text-amber-800">{workspace.profileValidationIssues.join(" ")}</p>
          </div>
        ) : null}
      </section>

      <section className="border-b border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-950">{zh ? "2. 可执行技术清单" : "2. Executable technical checklist"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {zh ? "阻塞项必须附证据才能通过；失败或阻塞必须写明原因。" : "Blocking checks require evidence to pass; blocked and failed states require a reason."}
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["TECHNICAL_QUALIFICATION", "SDK_INTEGRATION"] as const).map((stage) => (
              <button
                key={stage}
                className={`h-8 rounded-md px-3 text-xs font-semibold ${
                  activeStage === stage ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"
                }`}
                type="button"
                onClick={() => setActiveStage(stage)}
              >
                {stage === "TECHNICAL_QUALIFICATION" ? (zh ? "技术资格" : "Qualification") : (zh ? "SDK 集成" : "SDK integration")}
              </button>
            ))}
          </div>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.6fr)]">
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
                {stageItems.map((item) => (
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
            {stageItems.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">
                {zh ? "请先保存技术画像，系统将按 Playbook 生成清单。" : "Save the technical profile to generate the scoped checklist."}
              </p>
            ) : null}
          </div>

          <aside className="border-t border-slate-200 bg-slate-50/60 p-5 xl:border-l xl:border-t-0">
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

      <section className="border-b border-slate-200">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-950">{zh ? "3. 联调摘要证据" : "3. Integration summary evidence"}</h2>
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
                disabled={!executionManager}
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
                disabled={!executionManager}
              />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-white text-sm font-semibold text-blue-700 disabled:text-slate-300"
                type="button"
                onClick={onStart}
                disabled={!executionManager || !executionStartable}
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
                disabled={!executionManager || !executionActive || Boolean(project?.blocker) || !evidenceReference.trim()}
              >
                <FileCheck2 className="size-4" aria-hidden="true" />
                {t("integration.recordEvidence")}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="p-5">
          <h2 className="text-base font-semibold text-slate-950">{zh ? "4. 项目阻塞与阶段门" : "4. Project blocker and readiness gate"}</h2>
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
