import { useMemo, useState, type ReactNode } from "react";
import { BarChart3, CheckCircle2, ClipboardList, Play, ShieldAlert, Target } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { SummaryCard } from "../../components/SummaryCard";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { workbenchService } from "../../services/workbenchService";
import type {
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
  onStateChange
}: WorkbenchOperationsPageProps) {
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
  const primaryOkr = snapshot.okrs[0];

  function runAction(title: string, action: () => ReturnType<typeof workbenchService.startTask>) {
    const result = action();
    onStateChange(result.state);
    setMessage({ title, guard: result.guard });
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone={route.path === "/ceo/dashboard" ? "danger" : "info"}>{route.service}</StatusBadge>
            <StatusBadge tone="neutral">{role.name}</StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">
            {route.path === "/ceo/dashboard" ? "CEO Operating Dashboard" : "Role Workbench"}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Prioritized tasks, approvals, risks, recent business events, and OKR progress across PG OS workflows.
          </p>
        </div>
        {selectedTask ? (
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            type="button"
            onClick={() => runAction("Start task", () => workbenchService.startTask(state, user, selectedTask.id))}
          >
            <Play className="size-4" aria-hidden="true" />
            Start selected task
          </button>
        ) : null}
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="My tasks" value={String(snapshot.summary.myTasks)} />
        <SummaryCard label="P0" value={String(snapshot.summary.p0)} tone={snapshot.summary.p0 ? "danger" : "neutral"} />
        <SummaryCard label="Blocked" value={String(snapshot.summary.blocked)} tone={snapshot.summary.blocked ? "warning" : "success"} />
        <SummaryCard label="OKR risk" value={String(snapshot.summary.okrAtRisk)} tone={snapshot.summary.okrAtRisk ? "warning" : "success"} />
        <SummaryCard label="Events" value={String(snapshot.summary.recentEvents)} />
      </div>

      {message ? <GuardNotice message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr_320px]">
        <TaskQueue tasks={snapshot.tasks} selectedTaskId={selectedTask?.id} onSelect={setSelectedTaskId} />

        <main className="space-y-4">
          <Panel title="Selected task" icon={<ClipboardList className="size-5 text-blue-600" aria-hidden="true" />}>
            {selectedTask ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={priorityTone[selectedTask.priority]}>{selectedTask.priority}</StatusBadge>
                  <StatusBadge tone={taskTone[selectedTask.status]}>{selectedTask.status}</StatusBadge>
                  <StatusBadge tone="neutral">{selectedTask.module}</StatusBadge>
                </div>
                <h2 className="mt-4 text-xl font-semibold text-slate-950">{selectedTask.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{selectedTask.next_action}</p>
                {selectedTask.blocker ? <p className="mt-2 text-sm leading-6 text-rose-700">{selectedTask.blocker}</p> : null}
                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                    type="button"
                    onClick={() => runAction("Start task", () => workbenchService.startTask(state, user, selectedTask.id))}
                  >
                    <Play className="size-4" aria-hidden="true" />
                    Start
                  </button>
                  <button
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                    type="button"
                    onClick={() =>
                      runAction("Complete task", () => workbenchService.completeTask(state, user, selectedTask.id))
                    }
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    Complete
                  </button>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">No role tasks are available.</p>
            )}
          </Panel>

          <Panel title="OKR progress" icon={<Target className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 lg:grid-cols-2">
              {snapshot.okrs.map((okr) => {
                const pct = okr.target_value === 0 ? 100 : Math.round((okr.current_value / okr.target_value) * 100);
                return (
                  <div key={okr.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-900">{okr.title}</p>
                      <StatusBadge tone={okrTone[okr.status]}>{okr.status}</StatusBadge>
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
              {snapshot.okrs.length === 0 ? <p className="text-sm text-slate-500">No OKR objectives are visible for this role.</p> : null}
            </div>
            {primaryOkr ? (
              <button
                className="mt-4 h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Update OKR", () =>
                    workbenchService.updateOkrProgress(
                      state,
                      user,
                      primaryOkr.id,
                      Math.min(primaryOkr.target_value, primaryOkr.current_value + 1)
                    )
                  )
                }
              >
                Update first OKR
              </button>
            ) : null}
          </Panel>
        </main>

        <RightRail tasks={snapshot.tasks} recentEvents={snapshot.recentEvents} />
      </div>
    </section>
  );
}

function GuardNotice({ message }: { message: ActionMessage }) {
  const tone = message.guard.allowed ? (message.guard.severity === "warning" ? "warning" : "success") : "danger";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 text-blue-600" aria-hidden="true" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{message.title}</p>
            <StatusBadge tone={tone}>{message.guard.reason_code}</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{message.guard.message}</p>
          {message.guard.required_approval_role ? (
            <p className="mt-1 text-sm text-slate-500">Owner to unblock: {message.guard.required_approval_role}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TaskQueue({
  tasks,
  selectedTaskId,
  onSelect
}: {
  tasks: WorkbenchTask[];
  selectedTaskId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <aside className="space-y-3">
      {tasks.map((task) => (
        <button
          key={task.id}
          className={`w-full rounded-lg border p-3 text-left text-sm ${
            selectedTaskId === task.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
          }`}
          type="button"
          onClick={() => onSelect(task.id)}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{task.title}</p>
            <StatusBadge tone={priorityTone[task.priority]}>{task.priority}</StatusBadge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{task.owner_role} / {task.module}</p>
        </button>
      ))}
      {tasks.length === 0 ? <p className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500">No tasks for this role.</p> : null}
    </aside>
  );
}

function RightRail({
  tasks,
  recentEvents
}: {
  tasks: WorkbenchTask[];
  recentEvents: ReturnType<typeof workbenchService.getSnapshot>["recentEvents"];
}) {
  const blocked = tasks.filter((task) => task.status === "blocked").slice(0, 3);

  return (
    <aside className="space-y-4">
      <Panel title="Risk queue" icon={<BarChart3 className="size-5 text-blue-600" aria-hidden="true" />}>
        <div className="space-y-2">
          {blocked.map((task) => (
            <div key={task.id} className="rounded-lg bg-rose-50 p-3 text-sm">
              <p className="font-semibold text-rose-900">{task.title}</p>
              <p className="mt-1 text-xs leading-5 text-rose-700">{task.blocker ?? task.next_action}</p>
            </div>
          ))}
          {blocked.length === 0 ? <p className="text-sm text-slate-500">No blocked tasks in this queue.</p> : null}
        </div>
      </Panel>
      <Panel title="Recent events">
        <div className="space-y-3">
          {recentEvents.map((event) => (
            <div key={event.id} className="border-l-2 border-blue-200 pl-3">
              <p className="text-sm font-medium text-slate-800">{event.eventCode}</p>
              <p className="mt-1 text-xs text-slate-500">{event.objectType}</p>
            </div>
          ))}
          {recentEvents.length === 0 ? <p className="text-sm text-slate-500">No business events yet.</p> : null}
        </div>
      </Panel>
    </aside>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <p className="text-base font-semibold text-slate-950">{title}</p>
      </div>
      {children}
    </article>
  );
}
