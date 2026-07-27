import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BadgeCheck,
  Ban,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardList,
  Link2,
  Save,
  Search,
  Send,
  ShieldAlert,
  X
} from "lucide-react";
import { MetricStrip, OperatingPageHeader } from "../../components/OperatingPage";
import { StatusBadge } from "../../components/StatusBadge";
import type { RoleDefinition } from "../../constants/roles";
import { getRoleDisplayName, getRouteDisplayTitle, getRoutePageType, useLocale } from "../../lib/i18n";
import type { AppRoute } from "../../routes/routes";
import {
  mediaOnboardingLifecycleService,
  mediaOnboardingLifecycleStages,
  type MediaOnboardingLifecycleItem,
  type MediaOnboardingLifecycleStage
} from "../../services/mediaOnboardingLifecycleService";
import {
  mediaOnboardingStageGateDefinitions,
  mediaOnboardingStageGateService,
  type MediaOnboardingStageGateResult,
  type MediaOnboardingStageGateUpdate
} from "../../services/mediaOnboardingStageGateService";
import type {
  AuditEvent,
  BusinessContract,
  BusinessUser,
  EntityId,
  MediaOnboardingStageGateStatus,
  MediaWorkflowState
} from "../../types/domain";

type MediaOnboardingLifecyclePageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  mediaState: MediaWorkflowState;
  contracts: BusinessContract[];
  onStateChange: (state: MediaWorkflowState) => void;
  onAuditEvent: (event: AuditEvent) => void;
  onRouteChange: (path: string, objectId?: EntityId) => void;
};

const stageLabels: Record<MediaOnboardingLifecycleStage, { en: string; zh: string }> = {
  MEDIA_DISCOVERY: { en: "Media discovery", zh: "媒体发现" },
  BUSINESS_QUALIFICATION: { en: "Business qualification", zh: "商务资格评估" },
  COMMERCIAL_AGREEMENT: { en: "Commercial agreement", zh: "商务合同" },
  TECHNICAL_QUALIFICATION: { en: "Technical qualification", zh: "技术资格评估" },
  SDK_INTEGRATION: { en: "SDK integration", zh: "SDK 集成" },
  QA_CERTIFICATION: { en: "QA / certification", zh: "QA 与认证" },
  PILOT: { en: "Pilot", zh: "小规模商用测试" },
  PRODUCTION_LAUNCH: { en: "Production launch", zh: "正式上线" },
  SCALE_OPERATION: { en: "Scale operation", zh: "规模化运营" }
};

const gateStatusLabels: Record<MediaOnboardingStageGateStatus, { en: string; zh: string }> = {
  not_started: { en: "Not started", zh: "未开始" },
  in_progress: { en: "In progress", zh: "执行中" },
  blocked: { en: "Blocked", zh: "阻塞" },
  ready_for_approval: { en: "Ready for approval", zh: "待审批" },
  approved: { en: "Approved", zh: "已批准" },
  rejected: { en: "Rejected", zh: "已拒绝" },
};

const lifecyclePageSize = 25;

const chineseLifecycleText: Record<string, string> = {
  "Confirm an owner, source, and next outreach action.": "确认负责人、线索来源和下一次外联动作。",
  "Confirm contact, business interest, inventory, and commercial fit.": "确认联系人、合作意向、广告库存和商务匹配度。",
  "Open the commercial agreement and assign Legal and business owners.": "发起商务合同流程，并分配法务与商务负责人。",
  "Complete technical feasibility, privacy, and IVT qualification.": "完成技术可行性、隐私合规与 IVT 资格评估。",
  "Complete SDK or endpoint integration evidence.": "补齐 SDK 或接口集成证据。",
  "Review technical evidence and record the certification decision before Pilot.": "审核技术证据并记录认证结论，再进入小规模商用测试。",
  "Run controlled traffic and record delivery, IVT, and commercial KPI evidence.": "运行受控流量并记录交付、IVT 与商业 KPI 证据。",
  "Activate a controlled supply package and schedule production launch.": "启用受控供给包并安排正式上线。",
  "Complete launch approval, commercial release, and supply package activation.": "完成上线审批、商业放量和供给包激活。",
  "Monitor scale KPI, IVT quality, revenue growth, and optimization actions.": "持续监控规模化 KPI、IVT 质量、收入增长和优化动作。",
  "Apply priority score and decide whether this opportunity is outreach-ready.": "完成优先级评分，并判断该媒体是否可以进入外联准备。",
  "Complete manual review before priority scoring.": "先完成人工复核，再进行优先级评分。",
  "Integration feasibility is marked impossible.": "技术接入可行性被标记为不可实现。",
  "The latest pilot did not pass its success criteria.": "最近一次 Pilot 未达到成功标准。",
  "The current pilot is paused.": "当前 Pilot 已暂停。",
  "No signed publisher agreement is linked.": "尚未关联已签署的媒体合同。",
  "No active controlled supply package is available for launch.": "当前没有可用于上线的受控供给包。",
  "No active controlled supply package is available for scale operation.": "当前没有可用于规模化运营的受控供给包。"
};

function localizeLifecycleText(text: string, chinese: boolean) {
  if (!chinese) return text;
  if (chineseLifecycleText[text]) return chineseLifecycleText[text];

  const agreementMatch = text.match(/^Commercial agreement is (.+)\.$/);
  if (agreementMatch) return `媒体合同当前处于 ${agreementMatch[1].replace(/_/g, " ")} 状态。`;

  const qualityMatch = text.match(/^(\d+) blocking quality case\(s\) remain open\.$/);
  if (qualityMatch) return `仍有 ${qualityMatch[1]} 个质量阻塞案例未关闭。`;

  return text;
}

function deliverableTitle(
  definition: (typeof mediaOnboardingStageGateDefinitions)[MediaOnboardingLifecycleStage],
  code: string,
  fallback: string,
  chinese: boolean
) {
  if (!chinese) return fallback;
  return definition.deliverables.find((item) => item.code === code)?.titleZh ?? fallback;
}

function kpiLabel(
  definition: (typeof mediaOnboardingStageGateDefinitions)[MediaOnboardingLifecycleStage],
  code: string,
  fallback: string,
  chinese: boolean
) {
  if (!chinese) return fallback;
  return definition.kpis.find((item) => item.code === code)?.labelZh ?? fallback;
}

function gateStatusTone(status: MediaOnboardingStageGateStatus) {
  if (status === "approved") return "success" as const;
  if (status === "ready_for_approval") return "warning" as const;
  if (status === "blocked" || status === "rejected") return "danger" as const;
  if (status === "not_started") return "neutral" as const;
  return "info" as const;
}

function connectedRecordLabels(item: MediaOnboardingLifecycleItem, chinese: boolean) {
  return [
    item.lead ? (chinese ? "生态线索" : "Lead") : undefined,
    item.candidate ? (chinese ? "可信候选" : "Candidate") : undefined,
    item.publisher ? "Publisher 360" : undefined,
    item.contract ? (chinese ? "合同" : "Contract") : undefined,
    item.integration ? (chinese ? "技术项目" : "Integration") : undefined,
    item.commercialTest ? "Pilot" : undefined
  ].filter((label): label is string => Boolean(label));
}

function routeForItem(item: MediaOnboardingLifecycleItem): { path: string; objectId?: EntityId } {
  if (item.stage === "COMMERCIAL_AGREEMENT" && item.contract) {
    return { path: "/contracts/:id", objectId: item.contract.id };
  }

  if (
    item.publisher &&
    ["TECHNICAL_QUALIFICATION", "SDK_INTEGRATION", "QA_CERTIFICATION"].includes(item.stage)
  ) {
    return { path: "/media/integration-wizard/:id", objectId: item.publisher.id };
  }

  if (item.publisher && item.stage === "PILOT") {
    return { path: "/media/commercial-tests/:id", objectId: item.publisher.id };
  }

  if (item.publisher) {
    return { path: "/media/publishers/:id", objectId: item.publisher.id };
  }

  return { path: "/media/china-ecosystem", objectId: item.lead?.id ?? item.candidate?.lead_id };
}

export function MediaOnboardingLifecyclePage({
  route,
  role,
  user,
  mediaState,
  contracts,
  onStateChange,
  onAuditEvent,
  onRouteChange
}: MediaOnboardingLifecyclePageProps) {
  const { locale } = useLocale();
  const chinese = locale === "zh-CN";
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"ALL" | MediaOnboardingLifecycleStage>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | MediaOnboardingStageGateStatus>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLifecycleId, setSelectedLifecycleId] = useState<string | undefined>();
  const [gateDraft, setGateDraft] = useState<MediaOnboardingStageGateUpdate | undefined>();
  const [gateMessage, setGateMessage] = useState<{ allowed: boolean; message: string } | undefined>();
  const input = useMemo(() => ({ mediaState, contracts }), [contracts, mediaState]);
  const cases = useMemo(() => mediaOnboardingLifecycleService.getCases(input), [input]);
  const summary = useMemo(() => mediaOnboardingLifecycleService.getSummary(input), [input]);
  const duplicateMediaNames = useMemo(() => {
    const counts = new Map<string, number>();
    cases.forEach((item) => {
      const key = item.mediaName.trim().toLocaleLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([name]) => name));
  }, [cases]);

  const filteredCases = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return cases.filter((item) => {
      if (stageFilter !== "ALL" && item.stage !== stageFilter) return false;
      const gateStatus = item.stageGate?.status ?? "not_started";
      if (statusFilter !== "ALL" && gateStatus !== statusFilter) return false;
      if (!query) return true;
      return [item.mediaName, item.nextAction, ...item.blockers]
        .join(" ")
        .toLocaleLowerCase()
        .includes(query);
    });
  }, [cases, search, stageFilter, statusFilter]);
  const totalPages = Math.max(1, Math.ceil(filteredCases.length / lifecyclePageSize));
  const pageStart = (currentPage - 1) * lifecyclePageSize;
  const pageCases = filteredCases.slice(pageStart, pageStart + lifecyclePageSize);
  const selectedItem = cases.find((item) => item.id === selectedLifecycleId);
  const selectedGate = selectedItem?.stageGate;
  const selectedDefinition = selectedItem ? mediaOnboardingStageGateDefinitions[selectedItem.stage] : undefined;
  const canManageSelected = selectedItem ? mediaOnboardingStageGateService.canManage(user, selectedItem.stage) : false;
  const canApproveSelected = selectedItem ? mediaOnboardingStageGateService.canApprove(user, selectedItem.stage) : false;

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stageFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    if (!selectedItem || !selectedDefinition) {
      setGateDraft(undefined);
      return;
    }

    setGateDraft({
      ownerRole: selectedGate?.owner_role ?? selectedDefinition.ownerRoles[0],
      targetDate: selectedGate?.target_date,
      deliverables:
        selectedGate?.deliverables.map((item) => ({ ...item })) ??
        selectedDefinition.deliverables.map((item) => ({ ...item, completed: false })),
      kpiEvidence:
        selectedGate?.kpi_evidence.map((item) => ({ ...item })) ??
        selectedDefinition.kpis.map((item) => ({ ...item })),
      blocker: selectedGate?.blocker,
      notes: selectedGate?.notes
    });
    setGateMessage(undefined);
  }, [selectedDefinition, selectedGate, selectedItem]);

  function applyGateResult(result: MediaOnboardingStageGateResult) {
    onStateChange(result.state);
    if (result.auditEvent) onAuditEvent(result.auditEvent);
    setGateMessage({ allowed: result.guard.allowed, message: result.guard.message });
  }

  function startSelectedGate() {
    if (!selectedItem) return;
    applyGateResult(
      mediaOnboardingStageGateService.startGate(mediaState, user, {
        objectType: selectedItem.lifecycleObjectType,
        objectId: selectedItem.lifecycleObjectId,
        stage: selectedItem.stage
      })
    );
  }

  function saveSelectedGate() {
    if (!selectedGate || !gateDraft) return;
    applyGateResult(mediaOnboardingStageGateService.updateGate(mediaState, user, selectedGate.id, gateDraft));
  }

  function submitSelectedGate() {
    if (!selectedGate) return;
    applyGateResult(mediaOnboardingStageGateService.requestApproval(mediaState, user, selectedGate.id));
  }

  function approveSelectedGate() {
    if (!selectedGate) return;
    applyGateResult(mediaOnboardingStageGateService.approveGate(mediaState, user, selectedGate.id));
  }

  function rejectSelectedGate() {
    if (!selectedGate || !gateDraft?.blocker?.trim()) return;
    applyGateResult(mediaOnboardingStageGateService.rejectGate(mediaState, user, selectedGate.id, gateDraft.blocker));
  }

  return (
    <section className="space-y-5">
      <OperatingPageHeader
        title={getRouteDisplayTitle(route, locale)}
        description={
          chinese
            ? "统一查看每家媒体从生态线索、商务与合同，到技术接入、Pilot、正式上线和规模化运营的当前阶段、阻塞项与下一动作。"
            : "Track every media partner from ecosystem discovery and commercial qualification through integration, Pilot, launch, and scale operation."
        }
        pageType={getRoutePageType(route, locale)}
        role={getRoleDisplayName(role.code, locale)}
      />

      <MetricStrip
        label={getRouteDisplayTitle(route, locale)}
        items={[
          { label: chinese ? "生命周期媒体" : "Lifecycle media", value: String(summary.total) },
          {
            label: chinese ? "阻塞" : "Blocked",
            value: String(summary.blocked),
            tone: summary.blocked > 0 ? "danger" : "success"
          },
          { label: chinese ? "Pilot 中" : "In Pilot", value: String(summary.pilotActive), tone: "warning" },
          {
            label: chinese ? "已上线 / 规模化" : "Live / scale",
            value: String(summary.byStage.PRODUCTION_LAUNCH + summary.scaleOperating),
            tone: "success"
          }
        ]}
      />

      {duplicateMediaNames.size > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <Link2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-semibold">
              {chinese
                ? `发现 ${duplicateMediaNames.size} 组同名但尚未明确关联的媒体记录`
                : `${duplicateMediaNames.size} same-name media group(s) require explicit record linkage`}
            </p>
            <p className="mt-1 leading-5 text-amber-800">
              {chinese
                ? "系统不会仅凭媒体名称合并生态线索与可交易供给；请通过明确的 lead、candidate 和 publisher ID 完成人工关联。"
                : "The system will not merge ecosystem leads and tradable supply by name alone. Confirm the lead, candidate, and publisher IDs before linking records."}
            </p>
          </div>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="text-base font-semibold text-slate-950">{chinese ? "生命周期阶段" : "Lifecycle stages"}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {chinese ? "选择阶段聚焦当前队列；数量来自已有业务记录的统一投影。" : "Select a stage to focus the operating queue."}
          </p>
        </div>
        <div className="grid grid-cols-2 border-b border-slate-200 md:grid-cols-3 xl:grid-cols-9">
          {mediaOnboardingLifecycleStages.map((stage, index) => {
            const selected = stageFilter === stage;
            return (
              <button
                key={stage}
                className={`min-h-24 border-b border-r border-slate-200 px-3 py-3 text-left last:border-r-0 xl:border-b-0 ${
                  selected ? "bg-blue-50 text-blue-800" : "bg-white text-slate-700 hover:bg-slate-50"
                }`}
                type="button"
                onClick={() => setStageFilter(selected ? "ALL" : stage)}
              >
                <span className="text-xs font-semibold text-slate-400">{String(index).padStart(2, "0")}</span>
                <span className="mt-2 block text-sm font-semibold leading-5">
                  {chinese ? stageLabels[stage].zh : stageLabels[stage].en}
                </span>
                <span className="mt-1 block text-xl font-semibold">{summary.byStage[stage]}</span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 md:flex-row md:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <span className="sr-only">{chinese ? "搜索媒体" : "Search media"}</span>
            <input
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={chinese ? "搜索媒体、下一动作或阻塞原因" : "Search media, next action, or blocker"}
            />
          </label>
          <label>
            <span className="sr-only">{chinese ? "状态筛选" : "Status filter"}</span>
            <select
              className="h-10 min-w-40 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as "ALL" | MediaOnboardingStageGateStatus)}
            >
              <option value="ALL">{chinese ? "全部阶段门状态" : "All gate statuses"}</option>
              {Object.entries(gateStatusLabels).map(([status, labels]) => (
                <option key={status} value={status}>
                  {chinese ? labels.zh : labels.en}
                </option>
              ))}
            </select>
          </label>
          <span className="text-sm text-slate-500">
            {chinese
              ? `${filteredCases.length} 家媒体 · 第 ${currentPage}/${totalPages} 页`
              : `${filteredCases.length} media partners · Page ${currentPage}/${totalPages}`}
          </span>
        </div>

        {filteredCases.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <CircleDot className="mx-auto size-5 text-slate-400" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-slate-800">{chinese ? "当前筛选没有媒体" : "No media matches these filters"}</p>
            <button
              className="mt-3 text-sm font-semibold text-blue-700 hover:text-blue-800"
              type="button"
              onClick={() => {
                setSearch("");
                setStageFilter("ALL");
                setStatusFilter("ALL");
              }}
            >
              {chinese ? "清除筛选" : "Clear filters"}
            </button>
          </div>
        ) : (
          <>
            <div className="divide-y divide-slate-200 md:hidden">
              {pageCases.map((item) => {
                const linkedRecords = connectedRecordLabels(item, chinese);
                const target = routeForItem(item);
                const gateStatus = item.stageGate?.status ?? "not_started";
                return (
                  <article key={item.id} className="space-y-4 px-4 py-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-950">{item.mediaName}</h3>
                          {duplicateMediaNames.has(item.mediaName.trim().toLocaleLowerCase()) ? (
                            <StatusBadge tone="warning">{chinese ? "需要关联" : "Linkage required"}</StatusBadge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {(item.priorityScore ?? 0) > 0
                            ? `${chinese ? "优先级" : "Priority"} ${item.priorityScore}`
                            : chinese
                              ? "未评分"
                              : "Unscored"}
                        </p>
                      </div>
                      <StatusBadge tone={gateStatusTone(gateStatus)}>
                        {chinese ? gateStatusLabels[gateStatus].zh : gateStatusLabels[gateStatus].en}
                      </StatusBadge>
                    </div>

                    <dl className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <dt className="text-xs font-semibold text-slate-500">{chinese ? "当前阶段" : "Current stage"}</dt>
                        <dd className="mt-1 font-medium text-slate-800">
                          {chinese ? stageLabels[item.stage].zh : stageLabels[item.stage].en}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-semibold text-slate-500">{chinese ? "负责人" : "Owner"}</dt>
                        <dd className="mt-1 text-slate-700">
                          {item.ownerRole ? getRoleDisplayName(item.ownerRole, locale) : chinese ? "待分配" : "Unassigned"}
                        </dd>
                      </div>
                      {item.stageGate?.target_date ? (
                        <div>
                          <dt className="text-xs font-semibold text-slate-500">{chinese ? "目标日期" : "Target date"}</dt>
                          <dd className="mt-1 flex items-center gap-1 text-slate-700">
                            <CalendarDays className="size-3.5" aria-hidden="true" />
                            {item.stageGate.target_date}
                          </dd>
                        </div>
                      ) : null}
                      <div>
                        <dt className="text-xs font-semibold text-slate-500">{chinese ? "关联记录" : "Linked records"}</dt>
                        <dd className="mt-1 flex flex-wrap gap-1">
                          {linkedRecords.map((label) => (
                            <span key={label} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">
                              <Link2 className="size-3" aria-hidden="true" />
                              {label}
                            </span>
                          ))}
                        </dd>
                      </div>
                    </dl>

                    <div>
                      <p className="text-xs font-semibold text-slate-500">{chinese ? "下一动作" : "Next action"}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-800">
                        {localizeLifecycleText(item.nextAction, chinese)}
                      </p>
                      {item.blockers.length > 0 ? (
                        <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-rose-700">
                          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                          <span>{item.blockers.map((blocker) => localizeLifecycleText(blocker, chinese)).join(" ")}</span>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                          <CheckCircle2 className="size-3.5" aria-hidden="true" />
                          <span>{chinese ? "当前阶段门无阻塞" : "No current gate blocker"}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                        type="button"
                        onClick={() => setSelectedLifecycleId(item.id)}
                      >
                        <ClipboardList className="size-4" aria-hidden="true" />
                        {chinese ? "阶段门" : "Gate"}
                      </button>
                      <button
                        className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        type="button"
                        title={chinese ? "打开业务记录" : "Open business record"}
                        onClick={() => onRouteChange(target.path, target.objectId)}
                      >
                        <ArrowUpRight className="size-4" aria-hidden="true" />
                        <span className="sr-only">{chinese ? "打开业务记录" : "Open business record"}</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">{chinese ? "媒体" : "Media"}</th>
                  <th className="px-4 py-3">{chinese ? "当前阶段" : "Current stage"}</th>
                  <th className="px-4 py-3">{chinese ? "阶段门" : "Gate"}</th>
                  <th className="px-4 py-3">{chinese ? "负责人" : "Owner"}</th>
                  <th className="px-4 py-3">{chinese ? "关联记录" : "Linked records"}</th>
                  <th className="w-[30%] px-4 py-3">{chinese ? "下一动作 / 阻塞" : "Next action / blocker"}</th>
                  <th className="px-4 py-3 text-right">{chinese ? "操作" : "Action"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pageCases.map((item) => {
                  const linkedRecords = connectedRecordLabels(item, chinese);
                  const target = routeForItem(item);
                  const gateStatus = item.stageGate?.status ?? "not_started";
                  return (
                    <tr key={item.id} className="align-top hover:bg-slate-50">
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-950">{item.mediaName}</p>
                          {duplicateMediaNames.has(item.mediaName.trim().toLocaleLowerCase()) ? (
                            <StatusBadge tone="warning">{chinese ? "需要关联" : "Linkage required"}</StatusBadge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {(item.priorityScore ?? 0) > 0
                            ? `${chinese ? "优先级" : "Priority"} ${item.priorityScore}`
                            : chinese
                              ? "未评分"
                              : "Unscored"}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-medium text-slate-800">
                        {chinese ? stageLabels[item.stage].zh : stageLabels[item.stage].en}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge tone={gateStatusTone(gateStatus)}>
                          {chinese ? gateStatusLabels[gateStatus].zh : gateStatusLabels[gateStatus].en}
                        </StatusBadge>
                        {item.stageGate?.target_date ? (
                          <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                            <CalendarDays className="size-3" aria-hidden="true" />
                            {item.stageGate.target_date}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {item.ownerRole ? getRoleDisplayName(item.ownerRole, locale) : chinese ? "待分配" : "Unassigned"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex max-w-52 flex-wrap gap-1.5">
                          {linkedRecords.map((label) => (
                            <span key={label} className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs text-slate-600">
                              <Link2 className="size-3" aria-hidden="true" />
                              {label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="leading-5 text-slate-800">{localizeLifecycleText(item.nextAction, chinese)}</p>
                        {item.blockers.length > 0 ? (
                          <div className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-rose-700">
                            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                            <span>{item.blockers.map((blocker) => localizeLifecycleText(blocker, chinese)).join(" ")}</span>
                          </div>
                        ) : (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700">
                            <CheckCircle2 className="size-3.5" aria-hidden="true" />
                            <span>{chinese ? "当前阶段门无阻塞" : "No current gate blocker"}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                            type="button"
                            onClick={() => setSelectedLifecycleId(item.id)}
                          >
                            <ClipboardList className="size-4" aria-hidden="true" />
                            {chinese ? "阶段门" : "Gate"}
                          </button>
                          <button
                            className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                            type="button"
                            title={chinese ? "打开业务记录" : "Open business record"}
                            onClick={() => onRouteChange(target.path, target.objectId)}
                          >
                            <ArrowUpRight className="size-4" aria-hidden="true" />
                            <span className="sr-only">{chinese ? "打开业务记录" : "Open business record"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
        {filteredCases.length > lifecyclePageSize ? (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">
              {chinese
                ? `显示第 ${pageStart + 1}-${Math.min(pageStart + lifecyclePageSize, filteredCases.length)} 条`
                : `Showing ${pageStart + 1}-${Math.min(pageStart + lifecyclePageSize, filteredCases.length)}`}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                {chinese ? "上一页" : "Previous"}
              </button>
              <button
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              >
                {chinese ? "下一页" : "Next"}
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {selectedItem && selectedDefinition && gateDraft ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30">
          <button
            className="absolute inset-0 cursor-default"
            type="button"
            aria-label={chinese ? "关闭阶段门" : "Close stage gate"}
            onClick={() => setSelectedLifecycleId(undefined)}
          />
          <aside
            className="relative flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-stage-gate-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={gateStatusTone(selectedGate?.status ?? "not_started")}>
                    {chinese
                      ? gateStatusLabels[selectedGate?.status ?? "not_started"].zh
                      : gateStatusLabels[selectedGate?.status ?? "not_started"].en}
                  </StatusBadge>
                  <span className="text-xs font-semibold text-slate-500">
                    {chinese ? stageLabels[selectedItem.stage].zh : stageLabels[selectedItem.stage].en}
                  </span>
                </div>
                <h2 id="media-stage-gate-title" className="mt-2 truncate text-xl font-semibold text-slate-950">
                  {selectedItem.mediaName}
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  {chinese
                    ? "阶段门批准只解锁下一业务动作，实际阶段由合同、集成、测试和上线记录推进。"
                    : "Gate approval unlocks the next domain action; contracts, integration, Pilot, and launch records remain authoritative."}
                </p>
              </div>
              <button
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                type="button"
                title={chinese ? "关闭" : "Close"}
                onClick={() => setSelectedLifecycleId(undefined)}
              >
                <X className="size-4" aria-hidden="true" />
                <span className="sr-only">{chinese ? "关闭" : "Close"}</span>
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
              {!selectedGate ? (
                <section>
                  <h3 className="text-sm font-semibold text-slate-950">
                    {chinese ? "启动阶段门前检查" : "Pre-flight requirements"}
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {chinese
                      ? `默认负责人角色：${selectedDefinition.ownerRoles.map((item) => getRoleDisplayName(item, locale)).join(" / ")}`
                      : `Default owner roles: ${selectedDefinition.ownerRoles.map((item) => getRoleDisplayName(item, locale)).join(" / ")}`}
                  </p>
                  <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                    {gateDraft.deliverables.map((item) => (
                      <div key={item.code} className="flex items-start gap-3 py-3">
                        <ClipboardList className="mt-0.5 size-4 text-blue-600" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {deliverableTitle(selectedDefinition, item.code, item.title, chinese)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">{item.required ? (chinese ? "必交付" : "Required") : chinese ? "可选" : "Optional"}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    type="button"
                    disabled={!canManageSelected}
                    onClick={startSelectedGate}
                  >
                    <ClipboardList className="size-4" aria-hidden="true" />
                    {chinese ? "启动阶段门" : "Start stage gate"}
                  </button>
                  {!canManageSelected ? (
                    <p className="mt-3 text-xs leading-5 text-amber-700">
                      {chinese
                        ? `当前角色不能启动本阶段，需要 ${selectedDefinition.ownerRoles.map((item) => getRoleDisplayName(item, locale)).join(" / ")}。`
                        : `This stage requires ${selectedDefinition.ownerRoles.map((item) => getRoleDisplayName(item, locale)).join(" / ")}.`}
                    </p>
                  ) : null}
                </section>
              ) : (
                <>
                  <section className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-slate-700">
                      {chinese ? "负责人角色" : "Owner role"}
                      <select
                        className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100"
                        value={gateDraft.ownerRole}
                        disabled={!canManageSelected || selectedGate.status === "approved"}
                        onChange={(event) =>
                          setGateDraft((current) =>
                            current ? { ...current, ownerRole: event.target.value as MediaOnboardingStageGateUpdate["ownerRole"] } : current
                          )
                        }
                      >
                        {selectedDefinition.ownerRoles.map((ownerRole) => (
                          <option key={ownerRole} value={ownerRole}>
                            {getRoleDisplayName(ownerRole, locale)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      {chinese ? "目标完成日期" : "Target date"}
                      <input
                        className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 disabled:bg-slate-100"
                        type="date"
                        value={gateDraft.targetDate ?? ""}
                        disabled={!canManageSelected || selectedGate.status === "approved"}
                        onChange={(event) => setGateDraft((current) => (current ? { ...current, targetDate: event.target.value } : current))}
                      />
                    </label>
                  </section>

                  <section>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-slate-950">{chinese ? "必交付物" : "Deliverables"}</h3>
                      <span className="text-xs text-slate-500">
                        {gateDraft.deliverables.filter((item) => item.completed).length}/{gateDraft.deliverables.length}
                      </span>
                    </div>
                    <div className="mt-3 divide-y divide-slate-200 border-y border-slate-200">
                      {gateDraft.deliverables.map((deliverable, index) => (
                        <div key={deliverable.code} className="py-3">
                          <label className="flex items-start gap-3">
                            <input
                              className="mt-1 size-4 rounded border-slate-300 text-blue-600"
                              type="checkbox"
                              checked={deliverable.completed}
                              disabled={!canManageSelected || selectedGate.status === "approved"}
                              onChange={(event) =>
                                setGateDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        deliverables: current.deliverables.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, completed: event.target.checked } : item
                                        )
                                      }
                                    : current
                                )
                              }
                            />
                            <span className="text-sm font-medium text-slate-900">
                              {deliverableTitle(
                                selectedDefinition,
                                deliverable.code,
                                deliverable.title,
                                chinese
                              )}
                            </span>
                          </label>
                          <input
                            className="mt-2 h-10 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-900 disabled:bg-slate-100"
                            value={deliverable.evidence ?? ""}
                            disabled={!canManageSelected || selectedGate.status === "approved"}
                            placeholder={chinese ? "证据链接、文档编号或验收结论" : "Evidence link, document ID, or acceptance result"}
                            onChange={(event) =>
                              setGateDraft((current) =>
                                current
                                  ? {
                                      ...current,
                                      deliverables: current.deliverables.map((item, itemIndex) =>
                                        itemIndex === index ? { ...item, evidence: event.target.value } : item
                                      )
                                    }
                                  : current
                              )
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm font-semibold text-slate-950">{chinese ? "KPI 证据" : "KPI evidence"}</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {gateDraft.kpiEvidence.map((kpi, index) => (
                        <label key={kpi.code} className="text-sm font-medium text-slate-700">
                          {kpiLabel(selectedDefinition, kpi.code, kpi.label, chinese)}
                          {kpi.required ? <span className="ml-1 text-rose-600">*</span> : null}
                          <div className="mt-2 flex">
                            <input
                              className="h-10 min-w-0 flex-1 rounded-l-lg border border-slate-300 px-3 text-sm text-slate-900 disabled:bg-slate-100"
                              value={kpi.value ?? ""}
                              disabled={!canManageSelected || selectedGate.status === "approved"}
                              onChange={(event) =>
                                setGateDraft((current) =>
                                  current
                                    ? {
                                        ...current,
                                        kpiEvidence: current.kpiEvidence.map((item, itemIndex) =>
                                          itemIndex === index ? { ...item, value: event.target.value } : item
                                        )
                                      }
                                    : current
                                )
                              }
                            />
                            {kpi.unit ? (
                              <span className="inline-flex h-10 items-center rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 px-3 text-xs text-slate-500">
                                {kpi.unit}
                              </span>
                            ) : null}
                          </div>
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="grid gap-4">
                    <label className="text-sm font-medium text-slate-700">
                      {chinese ? "阻塞 / 驳回原因" : "Blocker / rejection reason"}
                      <textarea
                        className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
                        value={gateDraft.blocker ?? ""}
                        disabled={(!canManageSelected && !canApproveSelected) || selectedGate.status === "approved"}
                        onChange={(event) => setGateDraft((current) => (current ? { ...current, blocker: event.target.value } : current))}
                      />
                    </label>
                    <label className="text-sm font-medium text-slate-700">
                      {chinese ? "阶段说明" : "Stage notes"}
                      <textarea
                        className="mt-2 min-h-24 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100"
                        value={gateDraft.notes ?? ""}
                        disabled={!canManageSelected || selectedGate.status === "approved"}
                        onChange={(event) => setGateDraft((current) => (current ? { ...current, notes: event.target.value } : current))}
                      />
                    </label>
                  </section>
                </>
              )}

              {gateMessage ? (
                <div
                  className={`rounded-lg border px-4 py-3 text-sm ${
                    gateMessage.allowed
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-rose-200 bg-rose-50 text-rose-800"
                  }`}
                >
                  {gateMessage.message}
                </div>
              ) : null}
            </div>

            {selectedGate ? (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                    type="button"
                    disabled={!canManageSelected || selectedGate.status === "approved"}
                    onClick={saveSelectedGate}
                  >
                    <Save className="size-4" aria-hidden="true" />
                    {chinese ? "保存" : "Save"}
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:text-slate-300"
                    type="button"
                    disabled={!canManageSelected || ["approved", "ready_for_approval"].includes(selectedGate.status)}
                    onClick={submitSelectedGate}
                  >
                    <Send className="size-4" aria-hidden="true" />
                    {chinese ? "提交审批" : "Submit"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300"
                    type="button"
                    disabled={!canApproveSelected || selectedGate.status !== "ready_for_approval" || !gateDraft.blocker?.trim()}
                    onClick={rejectSelectedGate}
                  >
                    <Ban className="size-4" aria-hidden="true" />
                    {chinese ? "驳回" : "Reject"}
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                    type="button"
                    disabled={!canApproveSelected || selectedGate.status !== "ready_for_approval"}
                    onClick={approveSelectedGate}
                  >
                    <BadgeCheck className="size-4" aria-hidden="true" />
                    {chinese ? "批准阶段门" : "Approve gate"}
                  </button>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
