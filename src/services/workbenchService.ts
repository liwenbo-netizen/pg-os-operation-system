import type { RoleCode } from "../constants/roles";
import type {
  AuditEvent,
  BusinessUser,
  ContractWorkflowState,
  EntityId,
  FinanceWorkflowState,
  GuideWorkflowState,
  MediaWorkflowState,
  ModuleBusinessEvent,
  OkrObjective,
  SalesWorkflowState,
  WorkbenchTask,
  WorkbenchWorkflowState
} from "../types/domain";
import type { GuardResult } from "../types/guards";
import { auditService } from "./auditService";
import { fixtureRepository } from "./fixtures";
import { rbacService } from "./rbacService";

type WorkbenchResult = {
  state: WorkbenchWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

type OperationsContext = {
  mediaState: MediaWorkflowState;
  salesState: SalesWorkflowState;
  financeState: FinanceWorkflowState;
  contractState: ContractWorkflowState;
  guideState: GuideWorkflowState;
};

type SnapshotContext = OperationsContext & {
  workbenchState: WorkbenchWorkflowState;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function createDerivedTaskId(prefix: string, sourceObjectId: EntityId) {
  return isUuid(sourceObjectId) ? sourceObjectId : `derived-${prefix}-${sourceObjectId}`;
}

function createAllowed(message: string, reasonCode: string): GuardResult {
  return {
    allowed: true,
    severity: "info",
    reason_code: reasonCode,
    message,
    audit_required: true
  };
}

function createBlocked(message: string, reasonCode: string, requiredApprovalRole?: string): GuardResult {
  return {
    allowed: false,
    severity: "blocked",
    reason_code: reasonCode,
    message,
    required_approval_role: requiredApprovalRole,
    audit_required: true
  };
}

function createBusinessEvent(
  eventCode: string,
  objectId: EntityId,
  ownerRole: BusinessUser["activeRole"],
  payload?: Record<string, unknown>
): ModuleBusinessEvent {
  return {
    id: crypto.randomUUID(),
    eventCode,
    objectType: "workbench_task",
    objectId,
    ownerRole,
    createdAt: new Date().toISOString(),
    payload
  };
}

function appendEvents(
  state: WorkbenchWorkflowState,
  user: BusinessUser,
  action: string,
  objectId: EntityId | undefined,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent
): WorkbenchWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "workbench_task", guard, objectId);

  return {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };
}

function appendTaskActivity(
  state: WorkbenchWorkflowState,
  taskId: EntityId,
  user: BusinessUser,
  event: string
): WorkbenchWorkflowState {
  return {
    ...state,
    taskActivities: [
      {
        id: `task-activity-${taskId}-${state.taskActivities.length + 1}`,
        task_id: taskId,
        event,
        actor_role: user.activeRole,
        created_at: new Date().toISOString()
      },
      ...state.taskActivities
    ]
  };
}

function updateTask(
  state: WorkbenchWorkflowState,
  taskId: EntityId,
  patch: Partial<WorkbenchTask>
): WorkbenchWorkflowState {
  return {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            ...patch
          }
        : task
    )
  };
}

function resolveTaskForAction(
  state: WorkbenchWorkflowState,
  taskId: EntityId,
  availableTasks: WorkbenchTask[] = state.tasks
): { state: WorkbenchWorkflowState; task?: WorkbenchTask } {
  const persistedTask = state.tasks.find((candidate) => candidate.id === taskId);

  if (persistedTask) {
    return { state, task: persistedTask };
  }

  const derivedTask = availableTasks.find((candidate) => candidate.id === taskId);

  if (!derivedTask) {
    return { state };
  }

  return {
    state: {
      ...state,
      tasks: [derivedTask, ...state.tasks]
    },
    task: derivedTask
  };
}

function updateOkr(
  state: WorkbenchWorkflowState,
  okrId: EntityId,
  patch: Partial<OkrObjective>
): WorkbenchWorkflowState {
  return {
    ...state,
    okrObjectives: state.okrObjectives.map((objective) =>
      objective.id === okrId
        ? {
            ...objective,
            ...patch
          }
        : objective
    )
  };
}

function canOwnTask(user: BusinessUser, ownerRole: RoleCode) {
  return user.activeRole === ownerRole || rbacService.hasAnyRole(user, ["operations_director", "ceo"]);
}

function collectBusinessEvents(context: OperationsContext) {
  return [
    ...context.mediaState.businessEvents,
    ...context.salesState.businessEvents,
    ...context.financeState.businessEvents,
    ...context.contractState.businessEvents,
    ...context.guideState.businessEvents
  ].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function createDerivedTasks(context: OperationsContext): WorkbenchTask[] {
  const diagnosticTasks = context.mediaState.diagnosticCases
    .filter((diagnosticCase) => !["closed", "rejected"].includes(diagnosticCase.status))
    .map<WorkbenchTask>((diagnosticCase) => ({
      id: createDerivedTaskId("diagnostic", diagnosticCase.id),
      title: `Resolve ${diagnosticCase.case_no} ${diagnosticCase.case_type.replace(/_/g, " ")}`,
      module: "Diagnostics",
      owner_role: diagnosticCase.owner_role ?? "data_analyst",
      related_route: "/diagnostics/:id",
      priority: diagnosticCase.severity === "critical" || diagnosticCase.severity === "high" ? "P0" : "P1",
      status: diagnosticCase.status === "action_required" ? "blocked" : "open",
      blocker: diagnosticCase.current_blocker,
      next_action: diagnosticCase.next_action ?? "Continue diagnostic workflow.",
      source_object_type: "diagnostic_case",
      source_object_id: diagnosticCase.id
    }));

  const proposalTasks = context.salesState.proposals
    .filter((proposal) => proposal.status === "internal_review")
    .map<WorkbenchTask>((proposal) => ({
      id: createDerivedTaskId("proposal", proposal.id),
      title: `Approve proposal: ${proposal.name}`,
      module: "Sales",
      owner_role: "sales_director",
      related_route: "/proposals/:id/wizard",
      priority: "P1",
      status: "open",
      next_action: "Review media selection guard and approve proposal.",
      source_object_type: "proposal",
      source_object_id: proposal.id
    }));

  const campaignTasks = context.salesState.campaigns
    .filter((campaign) => ["launch_check", "pending_approval"].includes(campaign.status))
    .map<WorkbenchTask>((campaign) => ({
      id: createDerivedTaskId("campaign", campaign.id),
      title: `Prepare launch: ${campaign.name}`,
      module: "Campaigns",
      owner_role: campaign.status === "pending_approval" ? "operations_director" : "adops_manager",
      related_route: "/campaigns/:id/wizard",
      priority: campaign.launchChecklistPassed ? "P1" : "P0",
      status: campaign.launchChecklistPassed ? "open" : "blocked",
      blocker: campaign.launchChecklistPassed ? undefined : "Launch checklist is still open.",
      next_action: campaign.launchChecklistPassed ? "Request Operations launch approval." : "Complete launch checklist.",
      source_object_type: "campaign",
      source_object_id: campaign.id
    }));

  const settlementTasks = context.financeState.settlements
    .filter((settlement) => ["reconciling", "pending_review", "exception_review"].includes(settlement.status))
    .map<WorkbenchTask>((settlement) => ({
      id: createDerivedTaskId("settlement", settlement.id),
      title: `Process settlement: ${settlement.id}`,
      module: "Finance",
      owner_role: "finance_manager",
      related_route: "/finance/settlements/:id",
      priority: settlement.status === "exception_review" ? "P0" : "P1",
      status: settlement.status === "exception_review" ? "blocked" : "open",
      blocker: settlement.status === "exception_review" ? "Settlement has an exception review." : undefined,
      next_action: settlement.reconciliationCompleted ? "Confirm settlement." : "Complete reconciliation.",
      source_object_type: "settlement",
      source_object_id: settlement.id
    }));

  const contractTasks = context.contractState.contracts
    .filter((contract) => ["requested", "legal_review", "finance_review", "redline", "signed"].includes(contract.status))
    .map<WorkbenchTask>((contract) => ({
      id: createDerivedTaskId("contract", contract.id),
      title: `Handle contract: ${contract.contract_no}`,
      module: "Contracts",
      owner_role: contract.status === "finance_review" ? "finance_manager" : "legal_manager",
      related_route: "/contracts/:id",
      priority: contract.risk_level === "high" || contract.risk_level === "critical" ? "P0" : "P1",
      status: contract.status === "redline" ? "blocked" : "open",
      blocker: contract.blocker,
      next_action: contract.next_action ?? "Continue contract workflow.",
      source_object_type: "contract",
      source_object_id: contract.id
    }));

  const sopTasks = context.guideState.sopCards
    .filter((sopCard) => sopCard.status === "draft")
    .map<WorkbenchTask>((sopCard) => ({
      id: createDerivedTaskId("sop", sopCard.id),
      title: `Publish SOP: ${sopCard.title}`,
      module: "Guide",
      owner_role: "product_owner",
      related_route: "/guide",
      priority: sopCard.priority === "P0" ? "P0" : "P2",
      status: "open",
      next_action: "Review SOP steps and publish.",
      source_object_type: "route",
      source_object_id: sopCard.id
    }));

  return [...diagnosticTasks, ...proposalTasks, ...campaignTasks, ...settlementTasks, ...contractTasks, ...sopTasks];
}

function dedupeTasks(tasks: WorkbenchTask[]) {
  const byId = new Map<EntityId, WorkbenchTask>();
  tasks.forEach((task) => {
    if (!byId.has(task.id)) {
      byId.set(task.id, task);
    }
  });
  return Array.from(byId.values());
}

export function createInitialWorkbenchWorkflowState(): WorkbenchWorkflowState {
  return {
    tasks: fixtureRepository.workbenchTasks.map((task) => ({ ...task })),
    taskActivities: fixtureRepository.workbenchTaskActivities.map((activity) => ({ ...activity })),
    okrObjectives: fixtureRepository.okrObjectives.map((objective) => ({ ...objective })),
    auditEvents: [],
    businessEvents: []
  };
}

export class WorkbenchService {
  getSnapshot(context: SnapshotContext, user: BusinessUser) {
    const tasks = dedupeTasks([...context.workbenchState.tasks, ...createDerivedTasks(context)]);
    const roleTasks =
      user.activeRole === "ceo"
        ? tasks
        : tasks.filter((task) => task.owner_role === user.activeRole || user.activeRole === "operations_director");
    const openTasks = roleTasks.filter((task) => task.status !== "done");
    const okrs =
      user.activeRole === "ceo" || user.activeRole === "operations_director"
        ? context.workbenchState.okrObjectives
        : context.workbenchState.okrObjectives.filter((objective) => objective.owner_role === user.activeRole);

    return {
      summary: {
        myTasks: openTasks.length,
        p0: openTasks.filter((task) => task.priority === "P0").length,
        blocked: openTasks.filter((task) => task.status === "blocked").length,
        okrAtRisk: okrs.filter((objective) => ["at_risk", "behind"].includes(objective.status)).length,
        recentEvents: collectBusinessEvents(context).length
      },
      tasks: openTasks.sort((left, right) => left.priority.localeCompare(right.priority)),
      okrs,
      recentEvents: collectBusinessEvents(context).slice(0, 6)
    };
  }

  startTask(
    state: WorkbenchWorkflowState,
    user: BusinessUser,
    taskId: EntityId,
    availableTasks: WorkbenchTask[] = state.tasks
  ): WorkbenchResult {
    const resolved = resolveTaskForAction(state, taskId, availableTasks);
    const task = resolved.task;

    if (!task) {
      const guard = createBlocked("Workbench task was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "workbench.task.start", taskId, guard), guard };
    }

    if (!canOwnTask(user, task.owner_role)) {
      const guard = createBlocked("Current role cannot start this task.", "WORKBENCH_TASK_FORBIDDEN", task.owner_role);
      return { state: appendEvents(resolved.state, user, "workbench.task.start", taskId, guard), guard };
    }

    if (task.status === "done") {
      const guard = createBlocked("Completed tasks cannot be restarted.", "WORKBENCH_TASK_DONE");
      return { state: appendEvents(resolved.state, user, "workbench.task.start", taskId, guard), guard };
    }

    const nextState = appendTaskActivity(
      updateTask(resolved.state, taskId, {
        status: "in_progress"
      }),
      taskId,
      user,
      "Task started."
    );
    const guard = createAllowed("Workbench task started.", "WORKBENCH_TASK_STARTED");
    const businessEvent = createBusinessEvent("workbench.task_started", taskId, user.activeRole);
    const eventState = appendEvents(nextState, user, "workbench.task.start", taskId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  completeTask(
    state: WorkbenchWorkflowState,
    user: BusinessUser,
    taskId: EntityId,
    availableTasks: WorkbenchTask[] = state.tasks
  ): WorkbenchResult {
    const resolved = resolveTaskForAction(state, taskId, availableTasks);
    const task = resolved.task;

    if (!task) {
      const guard = createBlocked("Workbench task was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "workbench.task.complete", taskId, guard), guard };
    }

    if (!canOwnTask(user, task.owner_role)) {
      const guard = createBlocked("Current role cannot complete this task.", "WORKBENCH_TASK_FORBIDDEN", task.owner_role);
      return { state: appendEvents(resolved.state, user, "workbench.task.complete", taskId, guard), guard };
    }

    if (task.status === "blocked") {
      const guard = createBlocked("Blocked tasks cannot be completed before the blocker is resolved.", "WORKBENCH_TASK_BLOCKED", task.owner_role);
      return { state: appendEvents(resolved.state, user, "workbench.task.complete", taskId, guard), guard };
    }

    const nextState = appendTaskActivity(
      updateTask(resolved.state, taskId, {
        status: "done"
      }),
      taskId,
      user,
      "Task completed."
    );
    const guard = createAllowed("Workbench task completed.", "WORKBENCH_TASK_COMPLETED");
    const businessEvent = createBusinessEvent("workbench.task_completed", taskId, user.activeRole);
    const eventState = appendEvents(nextState, user, "workbench.task.complete", taskId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  updateOkrProgress(
    state: WorkbenchWorkflowState,
    user: BusinessUser,
    okrId: EntityId,
    currentValue: number
  ): WorkbenchResult {
    const objective = state.okrObjectives.find((candidate) => candidate.id === okrId);

    if (!objective) {
      const guard = createBlocked("OKR objective was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "okr.progress.update", okrId, guard), guard };
    }

    if (!rbacService.hasCapability(user, "okr.manage")) {
      const guard = createBlocked("Current role cannot update OKR progress.", "OKR_UPDATE_FORBIDDEN", objective.owner_role);
      return { state: appendEvents(state, user, "okr.progress.update", okrId, guard), guard };
    }

    if (!canOwnTask(user, objective.owner_role) && user.activeRole !== "product_owner") {
      const guard = createBlocked("Current role cannot update this OKR objective.", "OKR_OWNER_FORBIDDEN", objective.owner_role);
      return { state: appendEvents(state, user, "okr.progress.update", okrId, guard), guard };
    }

    const progressRatio = objective.target_value === 0 ? 1 : currentValue / objective.target_value;
    const nextStatus: OkrObjective["status"] =
      progressRatio >= 1 ? "completed" : progressRatio >= 0.75 ? "on_track" : progressRatio >= 0.5 ? "at_risk" : "behind";
    const nextState = updateOkr(state, okrId, {
      current_value: currentValue,
      status: nextStatus,
      confidence: progressRatio >= 0.75 ? "high" : progressRatio >= 0.5 ? "medium" : "low"
    });
    const guard = createAllowed("OKR progress updated.", "OKR_PROGRESS_UPDATED");
    const businessEvent = createBusinessEvent("okr.progress_updated", okrId, user.activeRole, {
      currentValue,
      status: nextStatus
    });
    const eventState = appendEvents(nextState, user, "okr.progress.update", okrId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }
}

export const workbenchService = new WorkbenchService();
