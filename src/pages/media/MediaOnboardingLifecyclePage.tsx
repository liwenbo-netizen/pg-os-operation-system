import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Link2,
  Search,
  ShieldAlert
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
  type MediaOnboardingLifecycleStage,
  type MediaOnboardingLifecycleStatus
} from "../../services/mediaOnboardingLifecycleService";
import type { BusinessContract, EntityId, MediaWorkflowState } from "../../types/domain";

type MediaOnboardingLifecyclePageProps = {
  route: AppRoute;
  role: RoleDefinition;
  mediaState: MediaWorkflowState;
  contracts: BusinessContract[];
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

const statusLabels: Record<MediaOnboardingLifecycleStatus, { en: string; zh: string }> = {
  ready: { en: "Ready", zh: "可推进" },
  in_progress: { en: "In progress", zh: "进行中" },
  blocked: { en: "Blocked", zh: "阻塞" },
  on_hold: { en: "On hold", zh: "暂缓" },
  rejected: { en: "Rejected", zh: "已拒绝" },
  operating: { en: "Operating", zh: "运营中" }
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

function statusTone(status: MediaOnboardingLifecycleStatus) {
  if (status === "ready" || status === "operating") return "success" as const;
  if (status === "blocked" || status === "rejected") return "danger" as const;
  if (status === "on_hold") return "warning" as const;
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
  mediaState,
  contracts,
  onRouteChange
}: MediaOnboardingLifecyclePageProps) {
  const { locale } = useLocale();
  const chinese = locale === "zh-CN";
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<"ALL" | MediaOnboardingLifecycleStage>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | MediaOnboardingLifecycleStatus>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
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
      if (statusFilter !== "ALL" && item.status !== statusFilter) return false;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [search, stageFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

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
              onChange={(event) => setStatusFilter(event.target.value as "ALL" | MediaOnboardingLifecycleStatus)}
            >
              <option value="ALL">{chinese ? "全部状态" : "All statuses"}</option>
              {Object.entries(statusLabels).map(([status, labels]) => (
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
          <div className="overflow-x-auto">
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
                        <StatusBadge tone={statusTone(item.status)}>
                          {chinese ? statusLabels[item.status].zh : statusLabels[item.status].en}
                        </StatusBadge>
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
                        <button
                          className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                          type="button"
                          onClick={() => onRouteChange(target.path, target.objectId)}
                        >
                          {chinese ? "处理" : "Open"}
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
    </section>
  );
}
