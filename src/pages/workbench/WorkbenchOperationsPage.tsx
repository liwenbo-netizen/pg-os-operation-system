import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, BarChart3, CheckCircle2, ClipboardList, GitBranch, ShieldAlert, Target } from "lucide-react";
import {
  GuidedEmptyState,
  MetricStrip,
  NextActionBar,
  OperatingPageHeader,
  WorkspaceLayout
} from "../../components/OperatingPage";
import { StatusBadge } from "../../components/StatusBadge";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { canViewRoute } from "../../routes/routeGuards";
import { workbenchService } from "../../services/workbenchService";
import type {
  AuditEvent,
  BusinessUser,
  ContractWorkflowState,
  FinanceWorkflowState,
  GuideWorkflowState,
  MediaWorkflowState,
  SalesWorkflowState,
  WorkbenchTask,
  WorkbenchWorkflowState
} from "../../types/domain";
import type { GuardResult } from "../../types/guards";
import { getRoleDisplayName, getRouteDisplayTitle, getRoutePageType, useLocale } from "../../lib/i18n";
import { getWorkbenchMetricValues, getWorkbenchTaskAction } from "./workbenchPageModel";
import {
  getWorkbenchHandoffContext,
  getWorkbenchModuleSummaries,
  type WorkbenchHandoffContext,
  type WorkbenchHandoffKind,
  type WorkbenchHandoffNode
} from "./workbenchHandoffModel";

type WorkbenchOperationsPageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  state: WorkbenchWorkflowState;
  mediaState: MediaWorkflowState;
  salesState: SalesWorkflowState;
  financeState: FinanceWorkflowState;
  contractState: ContractWorkflowState;
  guideState: GuideWorkflowState;
  onStateChange: (state: WorkbenchWorkflowState) => void;
  onOpenTask: (task: WorkbenchTask) => void;
  onOpenContext: (path: string, objectId?: string) => void;
  onAuditEvent: (event: AuditEvent) => void;
};

type ActionMessage = {
  title: string;
  guard: GuardResult;
};

const taskTone = {
  open: "warning",
  in_progress: "info",
  done: "success",
  blocked: "danger"
} as const;

const priorityTone = {
  P0: "danger",
  P1: "warning",
  P2: "neutral"
} as const;

const okrTone = {
  on_track: "success",
  at_risk: "warning",
  behind: "danger",
  completed: "success"
} as const;

export function WorkbenchOperationsPage({
  route,
  role,
  user,
  state,
  mediaState,
  salesState,
  financeState,
  contractState,
  guideState,
  onStateChange,
  onOpenTask,
  onOpenContext,
  onAuditEvent
}: WorkbenchOperationsPageProps) {
  const { locale, t } = useLocale();
  const [selectedTaskId, setSelectedTaskId] = useState<string>("task-proposal-approval");
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const snapshot = useMemo(
    () =>
      workbenchService.getSnapshot(
        {
          workbenchState: state,
          mediaState,
          salesState,
          financeState,
          contractState,
          guideState
        },
        user
      ),
    [contractState, financeState, guideState, mediaState, salesState, state, user]
  );
  const selectedTask = snapshot.tasks.find((task) => task.id === selectedTaskId) ?? snapshot.tasks[0];
  const selectedContext = selectedTask
    ? getWorkbenchHandoffContext(selectedTask, { mediaState, salesState, financeState, contractState })
    : undefined;
  const moduleSummaries = getWorkbenchModuleSummaries(snapshot.tasks);
  const primaryOkr = snapshot.okrs[0];
  const taskAction = getWorkbenchTaskAction(selectedTask);
  const metricValues = getWorkbenchMetricValues(snapshot.summary);
  const taskStatusLabels = {
    open: t("workbench.statusOpen"),
    in_progress: t("workbench.statusInProgress"),
    done: t("workbench.statusDone"),
    blocked: t("workbench.statusBlocked")
  };
  const okrStatusLabels = {
    on_track: t("workbench.okrOnTrack"),
    at_risk: t("workbench.okrAtRisk"),
    behind: t("workbench.okrBehind"),
    completed: t("workbench.okrCompleted")
  };
  const primaryActionLabel =
    taskAction.kind === "continue"
      ? t("workbench.continueTask")
      : taskAction.kind === "none"
        ? undefined
        : t("workbench.startTask");

  function runAction(title: string, action: () => ReturnType<typeof workbenchService.startTask>) {
    const result = action();
    onStateChange(result.state);
    if (result.auditEvent) {
      onAuditEvent(result.auditEvent);
    }
    setMessage({ title, guard: result.guard });
  }

  function startTask(task: WorkbenchTask) {
    const result = workbenchService.startTask(state, user, task.id, snapshot.tasks);
    onStateChange(result.state);
    if (result.auditEvent) {
      onAuditEvent(result.auditEvent);
    }
    setMessage({ title: t("workbench.startTask"), guard: result.guard });

    if (result.guard.allowed) {
      onOpenTask(task);
    }
  }

  return (
    <section className="space-y-6">
      <OperatingPageHeader
        title={getRouteDisplayTitle(route, locale)}
        description={t("workbench.description")}
        pageType={getRoutePageType(route, locale)}
        role={getRoleDisplayName(role.code, locale)}
      />

      <NextActionBar
        heading={t("workbench.currentTask")}
        status={selectedTask ? taskStatusLabels[selectedTask.status] : t("workbench.statusClear")}
        statusTone={selectedTask ? taskTone[selectedTask.status] : "success"}
        nextActionLabel={t("workbench.nextAction")}
        nextAction={selectedTask?.next_action ?? t("workbench.noTasksQueue")}
        ownerLabel={t("workbench.owner")}
        owner={getRoleDisplayName(selectedTask?.owner_role ?? role.code, locale)}
        blockerLabel={t("workbench.blocker")}
        blocker={selectedTask?.blocker}
        dueDateLabel={t("workbench.dueDate")}
        dueDate={selectedTask?.due_date ?? t("workbench.noDueDate")}
        actionLabel={primaryActionLabel}
        actionDisabled={taskAction.disabled}
        onAction={selectedTask ? () => startTask(selectedTask) : undefined}
      />

      <MetricStrip
        label={t("workbench.metrics")}
        items={[
          { label: t("workbench.myTasks"), value: String(metricValues[0]) },
          { label: t("workbench.p0"), value: String(metricValues[1]), tone: metricValues[1] ? "danger" : "neutral" },
          { label: t("workbench.blocked"), value: String(metricValues[2]), tone: metricValues[2] ? "warning" : "success" },
          { label: t("workbench.okrRisk"), value: String(metricValues[3]), tone: metricValues[3] ? "warning" : "success" }
        ]}
      />

      {message ? <GuardNotice message={message} /> : null}

      {route.path === "/ceo/dashboard" ? (
        <ExecutiveHandoffOverview
          summaries={moduleSummaries}
          selectedTaskId={selectedTask?.id}
          onSelectTask={setSelectedTaskId}
        />
      ) : null}

      <WorkspaceLayout
        queue={
          <TaskQueue
            tasks={snapshot.tasks}
            selectedTaskId={selectedTask?.id}
            onSelect={setSelectedTaskId}
            title={t("workbench.taskQueue")}
            description={t("workbench.taskQueueDescription")}
            emptyText={t("workbench.noTasksQueue")}
          />
        }
        detail={
          <>
          <Panel title={t("workbench.selectedTask")} icon={<ClipboardList className="size-5 text-blue-600" aria-hidden="true" />}>
            {selectedTask ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={priorityTone[selectedTask.priority]}>{selectedTask.priority}</StatusBadge>
                  <StatusBadge tone={taskTone[selectedTask.status]}>{taskStatusLabels[selectedTask.status]}</StatusBadge>
                  <StatusBadge tone="neutral">{selectedTask.module}</StatusBadge>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">{selectedTask.title}</h2>
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
                    type="button"
                    disabled={selectedTask.status === "blocked"}
                    onClick={() =>
                      runAction(t("workbench.completeTask"), () => workbenchService.completeTask(state, user, selectedTask.id, snapshot.tasks))
                    }
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    {t("workbench.completeTask")}
                  </button>
                </div>
              </>
            ) : (
              <GuidedEmptyState
                title={t("workbench.noTasksTitle")}
                description={t("workbench.noTasksDescription")}
                ownerLabel={t("workbench.owner")}
                owner={getRoleDisplayName(role.code, locale)}
                success
              />
            )}
          </Panel>

          {selectedContext ? (
            <HandoffContextPanel
              context={selectedContext}
              role={role.code}
              onOpen={onOpenContext}
            />
          ) : null}

          <Panel title={t("workbench.okrProgress")} icon={<Target className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 lg:grid-cols-2">
              {snapshot.okrs.map((okr) => {
                const pct = okr.target_value === 0 ? 100 : Math.round((okr.current_value / okr.target_value) * 100);
                return (
                  <div key={okr.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{okr.title}</p>
                      <StatusBadge tone={okrTone[okr.status]}>{okrStatusLabels[okr.status]}</StatusBadge>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {okr.current_value} / {okr.target_value} {okr.unit}
                    </p>
                    <div className="mt-3 h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-blue-600" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
              {snapshot.okrs.length === 0 ? (
                <GuidedEmptyState
                  title={t("workbench.noOkrsTitle")}
                  description={t("workbench.noOkrsDescription")}
                  ownerLabel={t("workbench.owner")}
                  owner={getRoleDisplayName(role.code, locale)}
                />
              ) : null}
            </div>
            {primaryOkr ? (
              <button
                className="mt-4 h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction(t("workbench.updateFirstOkr"), () =>
                    workbenchService.updateOkrProgress(
                      state,
                      user,
                      primaryOkr.id,
                      Math.min(primaryOkr.target_value, primaryOkr.current_value + 1)
                    )
                  )
                }
              >
                {t("workbench.updateFirstOkr")}
              </button>
            ) : null}
          </Panel>
          </>
        }
        context={<RightRail tasks={snapshot.tasks} recentEvents={snapshot.recentEvents} />}
      />
    </section>
  );
}

function GuardNotice({ message }: { message: ActionMessage }) {
  const { locale, t } = useLocale();
  const tone = message.guard.allowed ? (message.guard.severity === "warning" ? "warning" : "success") : "danger";
  const localizedMessages: Record<string, string> = {
    WORKBENCH_TASK_STARTED: t("workbench.guardStarted"),
    WORKBENCH_TASK_COMPLETED: t("workbench.guardCompleted"),
    OKR_PROGRESS_UPDATED: t("workbench.guardOkrUpdated"),
    NOT_FOUND: t("workbench.guardNotFound"),
    WORKBENCH_TASK_FORBIDDEN: t("workbench.guardForbidden"),
    OKR_UPDATE_FORBIDDEN: t("workbench.guardForbidden"),
    OKR_OWNER_FORBIDDEN: t("workbench.guardForbidden"),
    WORKBENCH_TASK_DONE: t("workbench.guardTaskDone"),
    WORKBENCH_TASK_BLOCKED: t("workbench.guardTaskBlocked")
  };
  const displayMessage =
    locale === "en-US"
      ? message.guard.message
      : localizedMessages[message.guard.reason_code] ??
        (message.guard.allowed ? t("workbench.guardAllowed") : t("workbench.guardDenied"));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4" role="status">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 text-blue-600" aria-hidden="true" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{message.title}</p>
            <StatusBadge tone={tone}>{message.guard.reason_code}</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{displayMessage}</p>
          {message.guard.required_approval_role ? (
            <p className="mt-1 text-sm text-slate-500">
              {t("workbench.ownerToUnblock")}: {getRoleDisplayName(message.guard.required_approval_role as RoleDefinition["code"], locale)}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TaskQueue({
  tasks,
  selectedTaskId,
  onSelect,
  title,
  description,
  emptyText
}: {
  tasks: WorkbenchTask[];
  selectedTaskId?: string;
  onSelect: (id: string) => void;
  title: string;
  description: string;
  emptyText: string;
}) {
  const { locale, t } = useLocale();
  const taskStatusLabels = {
    open: t("workbench.statusOpen"),
    in_progress: t("workbench.statusInProgress"),
    done: t("workbench.statusDone"),
    blocked: t("workbench.statusBlocked")
  };
  const moduleLabels: Record<WorkbenchTask["module"], string> = {
    Media: t("workbench.moduleMedia"),
    Sales: t("workbench.moduleSales"),
    Campaigns: t("workbench.moduleCampaigns"),
    Diagnostics: t("workbench.moduleDiagnostics"),
    Finance: t("workbench.moduleFinance"),
    Contracts: t("workbench.moduleContracts"),
    Guide: t("workbench.moduleGuide"),
    Admin: t("workbench.moduleAdmin"),
    Workbench: t("workbench.moduleWorkbench")
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto p-3 xl:block xl:space-y-2 xl:overflow-visible">
        {tasks.map((task) => (
          <button
            key={task.id}
            className={`min-w-[240px] rounded-lg border p-3 text-left text-sm transition xl:min-w-0 xl:w-full ${
              selectedTaskId === task.id
                ? "border-blue-300 bg-blue-50"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
            }`}
            type="button"
            onClick={() => onSelect(task.id)}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold leading-5 text-slate-900">{task.title}</p>
              <StatusBadge tone={priorityTone[task.priority]}>{task.priority}</StatusBadge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{getRoleDisplayName(task.owner_role, locale)}</span>
              <span aria-hidden="true">/</span>
              <span>{moduleLabels[task.module]}</span>
              <StatusBadge tone={taskTone[task.status]}>{taskStatusLabels[task.status]}</StatusBadge>
            </div>
          </button>
        ))}
        {tasks.length === 0 ? <p className="p-2 text-sm leading-6 text-slate-500">{emptyText}</p> : null}
      </div>
    </section>
  );
}

function ExecutiveHandoffOverview({
  summaries,
  selectedTaskId,
  onSelectTask
}: {
  summaries: ReturnType<typeof getWorkbenchModuleSummaries>;
  selectedTaskId?: string;
  onSelectTask: (taskId: string) => void;
}) {
  const { t } = useLocale();
  const moduleLabels: Record<WorkbenchTask["module"], string> = {
    Media: t("workbench.moduleMedia"),
    Sales: t("workbench.moduleSales"),
    Campaigns: t("workbench.moduleCampaigns"),
    Diagnostics: t("workbench.moduleDiagnostics"),
    Finance: t("workbench.moduleFinance"),
    Contracts: t("workbench.moduleContracts"),
    Guide: t("workbench.moduleGuide"),
    Admin: t("workbench.moduleAdmin"),
    Workbench: t("workbench.moduleWorkbench")
  };

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="executive-handoff-heading">
      <div className="border-b border-slate-200 px-4 py-3 sm:px-5">
        <h2 id="executive-handoff-heading" className="text-sm font-semibold text-slate-950">{t("workbench.executiveHandoffs")}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{t("workbench.executiveHandoffsDescription")}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              <th className="px-4 py-3">{t("workbench.module")}</th>
              <th className="px-4 py-3">{t("workbench.activeTasks")}</th>
              <th className="px-4 py-3">{t("workbench.p0")}</th>
              <th className="px-4 py-3">{t("workbench.blocked")}</th>
              <th className="px-4 py-3">{t("workbench.nextQueueItem")}</th>
              <th className="px-4 py-3 text-right">{t("workbench.review")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {summaries.map((summary) => (
              <tr key={summary.module} className={selectedTaskId === summary.nextTask?.id ? "bg-blue-50" : undefined}>
                <td className="px-4 py-3 font-semibold text-slate-900">{moduleLabels[summary.module]}</td>
                <td className="px-4 py-3 text-slate-700">{summary.total}</td>
                <td className="px-4 py-3 text-rose-700">{summary.p0}</td>
                <td className="px-4 py-3 text-amber-700">{summary.blocked}</td>
                <td className="max-w-sm px-4 py-3 text-slate-700">{summary.nextTask?.title ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  {summary.nextTask ? (
                    <button
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 font-semibold text-slate-700 hover:bg-slate-50"
                      type="button"
                      onClick={() => onSelectTask(summary.nextTask!.id)}
                    >
                      {t("workbench.review")}
                      <ArrowUpRight className="size-4" aria-hidden="true" />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {summaries.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-sm text-slate-500" colSpan={6}>{t("workbench.noTasksQueue")}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HandoffContextPanel({
  context,
  role,
  onOpen
}: {
  context: WorkbenchHandoffContext;
  role: RoleDefinition["code"];
  onOpen: (path: string, objectId?: string) => void;
}) {
  const { t } = useLocale();
  const columns = [
    { key: "upstream", title: t("workbench.upstream"), nodes: context.upstream },
    { key: "current", title: t("workbench.currentRecord"), nodes: [context.current] },
    { key: "downstream", title: t("workbench.downstream"), nodes: context.downstream }
  ] as const;

  return (
    <Panel title={t("workbench.handoffContext")} icon={<GitBranch className="size-5 text-blue-600" aria-hidden="true" />}>
      <p className="mb-4 text-sm leading-6 text-slate-600">{t("workbench.handoffContextDescription")}</p>
      <div className="grid border-y border-slate-200 md:grid-cols-3 md:divide-x md:divide-slate-200">
        {columns.map((column) => (
          <div key={column.key} className="min-w-0 border-t border-slate-200 px-3 py-4 first:border-t-0 md:border-t-0">
            <p className="text-xs font-semibold uppercase text-slate-500">{column.title}</p>
            <div className="mt-3 space-y-3">
              {column.nodes.map((item) => (
                <HandoffNode key={item.key} item={item} role={role} onOpen={onOpen} />
              ))}
              {column.nodes.length === 0 ? <p className="text-sm leading-6 text-slate-400">{t("workbench.noLinkedRecords")}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function HandoffNode({
  item,
  role,
  onOpen
}: {
  item: WorkbenchHandoffNode;
  role: RoleDefinition["code"];
  onOpen: (path: string, objectId?: string) => void;
}) {
  const { t } = useLocale();
  const kindLabels: Record<WorkbenchHandoffKind, string> = {
    advertiser: t("workbench.objectAdvertiser"),
    opportunity: t("workbench.objectOpportunity"),
    proposal: t("workbench.objectProposal"),
    campaign: t("workbench.objectCampaign"),
    publisher: t("workbench.objectPublisher"),
    ecosystemLead: t("workbench.objectEcosystemLead"),
    trustedCandidate: t("workbench.objectTrustedCandidate"),
    integration: t("workbench.objectIntegration"),
    diagnostic: t("workbench.objectDiagnostic"),
    settlement: t("workbench.objectSettlement"),
    contract: t("workbench.objectContract"),
    task: t("workbench.objectTask")
  };
  const canOpen = Boolean(item.route && canViewRoute(role, item.route).allowed);

  return (
    <div className="min-w-0">
      <p className="text-xs text-slate-500">{kindLabels[item.kind]}</p>
      <p className="mt-1 break-words text-sm font-semibold text-slate-900">{item.label}</p>
      {item.route ? (
        <button
          className="mt-2 inline-flex h-8 items-center gap-1 text-xs font-semibold text-blue-700 disabled:cursor-not-allowed disabled:text-slate-400"
          type="button"
          disabled={!canOpen}
          onClick={() => onOpen(item.route!, item.objectId)}
        >
          {canOpen ? t("workbench.openRecord") : t("workbench.routeRestricted")}
          {canOpen ? <ArrowUpRight className="size-3.5" aria-hidden="true" /> : null}
        </button>
      ) : null}
    </div>
  );
}

function RightRail({
  tasks,
  recentEvents
}: {
  tasks: WorkbenchTask[];
  recentEvents: ReturnType<typeof workbenchService.getSnapshot>["recentEvents"];
}) {
  const { t } = useLocale();
  const blocked = tasks.filter((task) => task.status === "blocked").slice(0, 3);

  return (
    <div className="space-y-4">
      <Panel title={t("workbench.riskQueue")} icon={<BarChart3 className="size-5 text-blue-600" aria-hidden="true" />}>
        <div className="space-y-2">
          {blocked.map((task) => (
            <div key={task.id} className="rounded-lg bg-rose-50 p-3 text-sm">
              <p className="font-semibold text-rose-900">{task.title}</p>
              <p className="mt-1 text-xs leading-5 text-rose-700">{task.blocker ?? task.next_action}</p>
            </div>
          ))}
          {blocked.length === 0 ? (
            <EmptyNotice title={t("workbench.noBlockedTitle")} description={t("workbench.noBlockedDescription")} />
          ) : null}
        </div>
      </Panel>
      <Panel title={t("workbench.recentEvents")}>
        <p className="mb-3 text-xs text-slate-500">{t("workbench.eventCount", { count: recentEvents.length })}</p>
        <div className="space-y-3">
          {recentEvents.map((event) => (
            <div key={event.id} className="border-l-2 border-blue-200 pl-3">
              <p className="text-sm font-medium text-slate-800">{event.eventCode}</p>
              <p className="mt-1 text-xs text-slate-500">{event.objectType}</p>
            </div>
          ))}
          {recentEvents.length === 0 ? (
            <EmptyNotice title={t("workbench.noEventsTitle")} description={t("workbench.noEventsDescription")} />
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

function EmptyNotice({ title, description }: { title: string; description: string }) {
  return (
    <div className="border-l-2 border-emerald-400 pl-3">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
        {icon}
        <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </article>
  );
}
