import type { RoleCode } from "../constants/roles";
import type {
  AuditEvent,
  BusinessUser,
  DiagnosticCase,
  DiagnosticEvidence,
  EntityId,
  MediaWorkflowState,
  ModuleBusinessEvent
} from "../types/domain";
import type { GuardResult } from "../types/guards";
import { auditService } from "./auditService";
import { fixtureRepository } from "./fixtures";
import { GuardService } from "./guardService";
import { rbacService } from "./rbacService";
import { rlsService } from "./rlsService";

type DiagnosticWorkflowResult = {
  state: MediaWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

type CreateDiagnosticCaseInput = {
  caseType: string;
  publisherId?: EntityId;
  campaignId?: EntityId;
  settlementId?: EntityId;
  severity: DiagnosticCase["severity"];
  ownerRole: RoleCode;
  currentBlocker: string;
  nextAction: string;
  affectedCampaignCount?: number;
  isBlockingSalesScale: boolean;
  isBlockingSettlement: boolean;
};

type EvidenceInput = {
  title: string;
  evidenceType: DiagnosticEvidence["evidence_type"];
  source: string;
  metricName?: string;
  baselineValue?: number;
  currentValue?: number;
};

type ConclusionInput = {
  rootCause: string;
  responsibilityOwner: string;
  conclusion: string;
  followUpAction: string;
};

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
    objectType: "diagnostic_case",
    objectId,
    ownerRole,
    createdAt: new Date().toISOString(),
    payload
  };
}

function appendEvents(
  state: MediaWorkflowState,
  user: BusinessUser,
  action: string,
  objectId: EntityId | undefined,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent
): MediaWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "diagnostic_case", guard, objectId);

  return {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };
}

function appendActivity(
  state: MediaWorkflowState,
  diagnosticCaseId: EntityId,
  user: BusinessUser,
  event: string
): MediaWorkflowState {
  return {
    ...state,
    diagnosticActivities: [
      {
        id: `activity-${diagnosticCaseId}-${state.diagnosticActivities.length + 1}`,
        diagnostic_case_id: diagnosticCaseId,
        event,
        actor_role: user.activeRole,
        created_at: new Date().toISOString()
      },
      ...state.diagnosticActivities
    ]
  };
}

function getGuardService(state: MediaWorkflowState) {
  return new GuardService({
    ...fixtureRepository,
    diagnosticCases: state.diagnosticCases
  });
}

function canManageDiagnostics(user: BusinessUser) {
  return rlsService.canWriteTable(user, "quality_diagnostic_cases") && rbacService.hasCapability(user, "diagnostic.manage");
}

function updateDiagnosticCase(
  state: MediaWorkflowState,
  diagnosticCaseId: EntityId,
  patch: Partial<DiagnosticCase>
): MediaWorkflowState {
  return {
    ...state,
    diagnosticCases: state.diagnosticCases.map((diagnosticCase) =>
      diagnosticCase.id === diagnosticCaseId
        ? {
            ...diagnosticCase,
            ...patch
          }
        : diagnosticCase
    )
  };
}

export class DiagnosticWorkflowService {
  getSummary(state: MediaWorkflowState) {
    const openCases = state.diagnosticCases.filter((diagnosticCase) => !["closed", "rejected"].includes(diagnosticCase.status));
    const highPriority = openCases.filter((diagnosticCase) => ["high", "critical"].includes(diagnosticCase.severity)).length;

    return {
      openCases: openCases.length,
      highPriority,
      blockingSalesScale: openCases.filter((diagnosticCase) => diagnosticCase.is_blocking_sales_scale).length,
      blockingSettlement: openCases.filter((diagnosticCase) => diagnosticCase.is_blocking_settlement).length,
      conclusionReady: openCases.filter((diagnosticCase) => diagnosticCase.status === "conclusion_ready").length
    };
  }

  getCaseSnapshot(state: MediaWorkflowState, diagnosticCaseId: EntityId) {
    const diagnosticCase = state.diagnosticCases.find((candidate) => candidate.id === diagnosticCaseId);

    return {
      diagnosticCase,
      publisher: state.publishers.find((publisher) => publisher.id === diagnosticCase?.publisher_id),
      evidence: state.diagnosticEvidence.filter((evidence) => evidence.diagnostic_case_id === diagnosticCaseId),
      activities: state.diagnosticActivities
        .filter((activity) => activity.diagnostic_case_id === diagnosticCaseId)
        .sort((left, right) => right.created_at.localeCompare(left.created_at))
    };
  }

  createDiagnosticCase(
    state: MediaWorkflowState,
    user: BusinessUser,
    input: CreateDiagnosticCaseInput
  ): DiagnosticWorkflowResult {
    if (!canManageDiagnostics(user)) {
      const guard = createBlocked("Current role cannot create diagnostic cases.", "DIAGNOSTIC_CREATE_FORBIDDEN", "data_analyst");
      return { state: appendEvents(state, user, "diagnostic_case.create", undefined, guard), guard };
    }

    const index = state.diagnosticCases.length + 1;
    const id = crypto.randomUUID();
    const diagnosticCase: DiagnosticCase = {
      id,
      case_no: `DC-${String(index).padStart(3, "0")}`,
      case_type: input.caseType,
      publisher_id: input.publisherId,
      campaign_id: input.campaignId,
      settlement_id: input.settlementId,
      status: "opened",
      severity: input.severity,
      owner_role: input.ownerRole,
      affected_campaign_count: input.affectedCampaignCount ?? 0,
      current_blocker: input.currentBlocker,
      next_action: input.nextAction,
      is_blocking_sales_scale: input.isBlockingSalesScale,
      is_blocking_settlement: input.isBlockingSettlement
    };
    const nextState = appendActivity(
      {
        ...state,
        diagnosticCases: [diagnosticCase, ...state.diagnosticCases]
      },
      id,
      user,
      "Diagnostic case opened."
    );
    const guard = createAllowed("Diagnostic case created.", "DIAGNOSTIC_CASE_CREATED");
    const businessEvent = createBusinessEvent("diagnostic_case.created", id, user.activeRole, {
      caseType: input.caseType,
      isBlockingSalesScale: input.isBlockingSalesScale,
      isBlockingSettlement: input.isBlockingSettlement
    });
    const eventState = appendEvents(nextState, user, "diagnostic_case.create", id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  addEvidence(
    state: MediaWorkflowState,
    user: BusinessUser,
    diagnosticCaseId: EntityId,
    input: EvidenceInput
  ): DiagnosticWorkflowResult {
    const diagnosticCase = state.diagnosticCases.find((candidate) => candidate.id === diagnosticCaseId);

    if (!diagnosticCase) {
      const guard = createBlocked("Diagnostic case was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "diagnostic_case.evidence.add", diagnosticCaseId, guard), guard };
    }

    if (!canManageDiagnostics(user)) {
      const guard = createBlocked("Current role cannot add diagnostic evidence.", "DIAGNOSTIC_EVIDENCE_FORBIDDEN", "data_analyst");
      return { state: appendEvents(state, user, "diagnostic_case.evidence.add", diagnosticCaseId, guard), guard };
    }

    if (["closed", "rejected"].includes(diagnosticCase.status)) {
      const guard = createBlocked("Evidence cannot be added to a closed diagnostic case.", "DIAGNOSTIC_CASE_CLOSED");
      return { state: appendEvents(state, user, "diagnostic_case.evidence.add", diagnosticCaseId, guard), guard };
    }

    const evidence: DiagnosticEvidence = {
      id: crypto.randomUUID(),
      diagnostic_case_id: diagnosticCaseId,
      title: input.title,
      evidence_type: input.evidenceType,
      source: input.source,
      metric_name: input.metricName,
      baseline_value: input.baselineValue,
      current_value: input.currentValue,
      status: "collected"
    };
    const nextState = appendActivity(
      updateDiagnosticCase(
        {
          ...state,
          diagnosticEvidence: [evidence, ...state.diagnosticEvidence]
        },
        diagnosticCaseId,
        {
          status: "evidence_collection",
          next_action: "Review evidence and move to root cause analysis."
        }
      ),
      diagnosticCaseId,
      user,
      `Evidence added: ${input.title}`
    );
    const guard = createAllowed("Diagnostic evidence added.", "DIAGNOSTIC_EVIDENCE_ADDED");
    const businessEvent = createBusinessEvent("diagnostic_case.evidence_added", diagnosticCaseId, user.activeRole, {
      evidenceType: input.evidenceType
    });
    const eventState = appendEvents(nextState, user, "diagnostic_case.evidence.add", diagnosticCaseId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  moveToRootCauseAnalysis(state: MediaWorkflowState, user: BusinessUser, diagnosticCaseId: EntityId): DiagnosticWorkflowResult {
    const diagnosticCase = state.diagnosticCases.find((candidate) => candidate.id === diagnosticCaseId);

    if (!diagnosticCase) {
      const guard = createBlocked("Diagnostic case was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "diagnostic_case.root_cause.start", diagnosticCaseId, guard), guard };
    }

    if (!canManageDiagnostics(user)) {
      const guard = createBlocked("Current role cannot move diagnostic case to root cause analysis.", "DIAGNOSTIC_UPDATE_FORBIDDEN", "data_analyst");
      return { state: appendEvents(state, user, "diagnostic_case.root_cause.start", diagnosticCaseId, guard), guard };
    }

    const evidenceCount = state.diagnosticEvidence.filter((evidence) => evidence.diagnostic_case_id === diagnosticCaseId).length;
    if (evidenceCount === 0) {
      const guard = createBlocked("Root cause analysis requires at least one evidence item.", "EVIDENCE_REQUIRED", "data_analyst");
      return { state: appendEvents(state, user, "diagnostic_case.root_cause.start", diagnosticCaseId, guard), guard };
    }

    const nextState = appendActivity(
      updateDiagnosticCase(state, diagnosticCaseId, {
        status: "root_cause_analysis",
        next_action: "Submit root cause, responsibility owner, and conclusion."
      }),
      diagnosticCaseId,
      user,
      "Root cause analysis started."
    );
    const guard = createAllowed("Diagnostic case moved to root cause analysis.", "ROOT_CAUSE_ANALYSIS_STARTED");
    const businessEvent = createBusinessEvent("diagnostic_case.root_cause_started", diagnosticCaseId, user.activeRole);
    const eventState = appendEvents(nextState, user, "diagnostic_case.root_cause.start", diagnosticCaseId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  submitConclusion(
    state: MediaWorkflowState,
    user: BusinessUser,
    diagnosticCaseId: EntityId,
    input: ConclusionInput
  ): DiagnosticWorkflowResult {
    const diagnosticCase = state.diagnosticCases.find((candidate) => candidate.id === diagnosticCaseId);

    if (!diagnosticCase) {
      const guard = createBlocked("Diagnostic case was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "diagnostic_case.conclusion.submit", diagnosticCaseId, guard), guard };
    }

    if (!canManageDiagnostics(user)) {
      const guard = createBlocked("Current role cannot submit diagnostic conclusions.", "DIAGNOSTIC_CONCLUSION_FORBIDDEN", "data_analyst");
      return { state: appendEvents(state, user, "diagnostic_case.conclusion.submit", diagnosticCaseId, guard), guard };
    }

    const evidenceCount = state.diagnosticEvidence.filter((evidence) => evidence.diagnostic_case_id === diagnosticCaseId).length;
    if (evidenceCount === 0) {
      const guard = createBlocked("Diagnostic conclusion requires supporting evidence.", "EVIDENCE_REQUIRED", "data_analyst");
      return { state: appendEvents(state, user, "diagnostic_case.conclusion.submit", diagnosticCaseId, guard), guard };
    }

    const nextState = appendActivity(
      updateDiagnosticCase(state, diagnosticCaseId, {
        status: "conclusion_ready",
        root_cause: input.rootCause,
        responsibility_owner: input.responsibilityOwner,
        conclusion: input.conclusion,
        follow_up_action: input.followUpAction,
        current_blocker: "Conclusion is ready for accountable owner review.",
        next_action: "Close the diagnostic case."
      }),
      diagnosticCaseId,
      user,
      "Diagnostic conclusion submitted."
    );
    const guard = createAllowed("Diagnostic conclusion submitted.", "DIAGNOSTIC_CONCLUSION_READY");
    const businessEvent = createBusinessEvent("diagnostic_case.conclusion_ready", diagnosticCaseId, user.activeRole, {
      responsibilityOwner: input.responsibilityOwner
    });
    const eventState = appendEvents(nextState, user, "diagnostic_case.conclusion.submit", diagnosticCaseId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  closeDiagnosticCase(state: MediaWorkflowState, user: BusinessUser, diagnosticCaseId: EntityId): DiagnosticWorkflowResult {
    const guard = getGuardService(state).canCloseDiagnosticCase(user, diagnosticCaseId);

    if (!guard.allowed) {
      return { state: appendEvents(state, user, "diagnostic_case.close", diagnosticCaseId, guard), guard };
    }

    const nextState = appendActivity(
      updateDiagnosticCase(state, diagnosticCaseId, {
        status: "closed",
        current_blocker: "Resolved.",
        next_action: "Track follow-up action through SOP or owner task."
      }),
      diagnosticCaseId,
      user,
      "Diagnostic case closed."
    );
    const businessEvent = createBusinessEvent("diagnostic_case.closed", diagnosticCaseId, user.activeRole);
    const eventState = appendEvents(nextState, user, "diagnostic_case.close", diagnosticCaseId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }
}

export const diagnosticWorkflowService = new DiagnosticWorkflowService();
