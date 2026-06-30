import type {
  AuditEvent,
  BusinessUser,
  EntityId,
  FinanceWorkflowState,
  MediaWorkflowState,
  ModuleBusinessEvent,
  SalesWorkflowState,
  Settlement
} from "../types/domain";
import type { GuardResult } from "../types/guards";
import { auditService } from "./auditService";
import { fixtureRepository } from "./fixtures";
import { GuardService } from "./guardService";
import { rbacService } from "./rbacService";
import { rlsService } from "./rlsService";

type FinanceSettlementResult = {
  state: FinanceWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
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
    objectType: "settlement",
    objectId,
    ownerRole,
    createdAt: new Date().toISOString(),
    payload
  };
}

function appendEvents(
  state: FinanceWorkflowState,
  user: BusinessUser,
  action: string,
  objectId: EntityId | undefined,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent
): FinanceWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "settlement", guard, objectId);

  return {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };
}

function appendActivity(
  state: FinanceWorkflowState,
  settlementId: EntityId,
  user: BusinessUser,
  event: string
): FinanceWorkflowState {
  return {
    ...state,
    settlementActivities: [
      {
        id: `settlement-activity-${settlementId}-${state.settlementActivities.length + 1}`,
        settlement_id: settlementId,
        event,
        actor_role: user.activeRole,
        created_at: new Date().toISOString()
      },
      ...state.settlementActivities
    ]
  };
}

function updateSettlement(
  state: FinanceWorkflowState,
  settlementId: EntityId,
  patch: Partial<Settlement>
): FinanceWorkflowState {
  return {
    ...state,
    settlements: state.settlements.map((settlement) =>
      settlement.id === settlementId
        ? {
            ...settlement,
            ...patch
          }
        : settlement
    )
  };
}

function canManageSettlements(user: BusinessUser) {
  return rlsService.canWriteTable(user, "settlements") && rbacService.hasCapability(user, "settlement.manage");
}

function getGuardService(financeState: FinanceWorkflowState, mediaState: MediaWorkflowState) {
  return new GuardService({
    ...fixtureRepository,
    settlements: financeState.settlements,
    diagnosticCases: mediaState.diagnosticCases
  });
}

export function createInitialFinanceWorkflowState(): FinanceWorkflowState {
  return {
    settlements: fixtureRepository.settlements.map((settlement) => ({ ...settlement })),
    settlementActivities: fixtureRepository.settlementActivities.map((activity) => ({ ...activity })),
    auditEvents: [],
    businessEvents: []
  };
}

export class FinanceSettlementService {
  getSummary(state: FinanceWorkflowState, mediaState: MediaWorkflowState) {
    const openDisputeSettlementIds = new Set(
      mediaState.diagnosticCases
        .filter((diagnosticCase) => diagnosticCase.is_blocking_settlement && !["closed", "rejected"].includes(diagnosticCase.status))
        .map((diagnosticCase) => diagnosticCase.settlement_id)
        .filter(Boolean)
    );

    return {
      pendingReview: state.settlements.filter((settlement) => settlement.status === "pending_review").length,
      exceptionReview: state.settlements.filter((settlement) => settlement.status === "exception_review").length,
      unreconciled: state.settlements.filter((settlement) => !settlement.reconciliationCompleted).length,
      confirmed: state.settlements.filter((settlement) => settlement.status === "confirmed").length,
      invoiced: state.settlements.filter((settlement) => settlement.status === "invoiced").length,
      paid: state.settlements.filter((settlement) => settlement.status === "paid").length,
      openDisputes: openDisputeSettlementIds.size
    };
  }

  getSettlementSnapshot(
    state: FinanceWorkflowState,
    mediaState: MediaWorkflowState,
    salesState: SalesWorkflowState,
    settlementId: EntityId
  ) {
    const settlement = state.settlements.find((candidate) => candidate.id === settlementId);
    const campaign = salesState.campaigns.find((candidate) => candidate.id === settlement?.campaign_id);
    const publisher = mediaState.publishers.find((candidate) => candidate.id === settlement?.publisher_id);
    const diagnosticCases = mediaState.diagnosticCases.filter((candidate) => candidate.settlement_id === settlementId);
    const activities = state.settlementActivities
      .filter((activity) => activity.settlement_id === settlementId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));

    return {
      settlement,
      campaign,
      publisher,
      diagnosticCases,
      activities
    };
  }

  completeReconciliation(
    state: FinanceWorkflowState,
    user: BusinessUser,
    settlementId: EntityId,
    adjustmentAmount = 0
  ): FinanceSettlementResult {
    const settlement = state.settlements.find((candidate) => candidate.id === settlementId);

    if (!settlement) {
      const guard = createBlocked("Settlement record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "settlement.reconcile", settlementId, guard), guard };
    }

    if (!canManageSettlements(user)) {
      const guard = createBlocked("Current role cannot complete settlement reconciliation.", "SETTLEMENT_RECONCILE_FORBIDDEN", "finance_manager");
      return { state: appendEvents(state, user, "settlement.reconcile", settlementId, guard), guard };
    }

    if (["confirmed", "invoiced", "paid", "cancelled"].includes(settlement.status)) {
      const guard = createBlocked("Reconciliation cannot be changed after settlement leaves review.", "SETTLEMENT_RECONCILE_LOCKED");
      return { state: appendEvents(state, user, "settlement.reconcile", settlementId, guard), guard };
    }

    const nextPayable = Math.max(0, (settlement.payable_amount ?? 0) + adjustmentAmount);
    const nextState = appendActivity(
      updateSettlement(state, settlementId, {
        status: "pending_review",
        reconciliationCompleted: true,
        reconciliation_delta: 0,
        adjustment_amount: adjustmentAmount,
        payable_amount: nextPayable
      }),
      settlementId,
      user,
      "Reconciliation completed and settlement moved to pending review."
    );
    const guard = createAllowed("Settlement reconciliation completed.", "SETTLEMENT_RECONCILED");
    const businessEvent = createBusinessEvent("settlement.reconciled", settlementId, user.activeRole, {
      adjustmentAmount
    });
    const eventState = appendEvents(nextState, user, "settlement.reconcile", settlementId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  confirmSettlement(
    state: FinanceWorkflowState,
    mediaState: MediaWorkflowState,
    user: BusinessUser,
    settlementId: EntityId
  ): FinanceSettlementResult {
    const guard = getGuardService(state, mediaState).canConfirmSettlement(user, settlementId);

    if (!guard.allowed) {
      return { state: appendEvents(state, user, "settlement.confirm", settlementId, guard), guard };
    }

    const nextState = appendActivity(
      updateSettlement(state, settlementId, {
        status: "confirmed",
        confirmed_at: new Date().toISOString()
      }),
      settlementId,
      user,
      "Settlement confirmed by Finance."
    );
    const businessEvent = createBusinessEvent("settlement.confirmed", settlementId, user.activeRole);
    const eventState = appendEvents(nextState, user, "settlement.confirm", settlementId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  issueInvoice(state: FinanceWorkflowState, user: BusinessUser, settlementId: EntityId): FinanceSettlementResult {
    const settlement = state.settlements.find((candidate) => candidate.id === settlementId);

    if (!settlement) {
      const guard = createBlocked("Settlement record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "settlement.invoice.issue", settlementId, guard), guard };
    }

    if (!canManageSettlements(user)) {
      const guard = createBlocked("Current role cannot issue settlement invoices.", "SETTLEMENT_INVOICE_FORBIDDEN", "finance_manager");
      return { state: appendEvents(state, user, "settlement.invoice.issue", settlementId, guard), guard };
    }

    if (settlement.status !== "confirmed") {
      const guard = createBlocked("Invoice can only be issued after settlement is confirmed.", "SETTLEMENT_NOT_CONFIRMED", "finance_manager");
      return { state: appendEvents(state, user, "settlement.invoice.issue", settlementId, guard), guard };
    }

    const nextState = appendActivity(
      updateSettlement(state, settlementId, {
        status: "invoiced",
        invoice_no: settlement.invoice_no ?? `INV-${settlementId.toUpperCase()}`,
        invoice_issued_at: new Date().toISOString()
      }),
      settlementId,
      user,
      "Settlement invoice issued."
    );
    const guard = createAllowed("Settlement invoice issued.", "SETTLEMENT_INVOICED");
    const businessEvent = createBusinessEvent("settlement.invoiced", settlementId, user.activeRole, {
      invoiceNo: nextState.settlements.find((candidate) => candidate.id === settlementId)?.invoice_no
    });
    const eventState = appendEvents(nextState, user, "settlement.invoice.issue", settlementId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  markPaid(state: FinanceWorkflowState, user: BusinessUser, settlementId: EntityId): FinanceSettlementResult {
    const settlement = state.settlements.find((candidate) => candidate.id === settlementId);

    if (!settlement) {
      const guard = createBlocked("Settlement record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "settlement.payment.mark_paid", settlementId, guard), guard };
    }

    if (!canManageSettlements(user)) {
      const guard = createBlocked("Current role cannot mark settlement paid.", "SETTLEMENT_PAYMENT_FORBIDDEN", "finance_manager");
      return { state: appendEvents(state, user, "settlement.payment.mark_paid", settlementId, guard), guard };
    }

    if (settlement.status !== "invoiced") {
      const guard = createBlocked("Settlement can be marked paid only after invoice is issued.", "SETTLEMENT_NOT_INVOICED", "finance_manager");
      return { state: appendEvents(state, user, "settlement.payment.mark_paid", settlementId, guard), guard };
    }

    const nextState = appendActivity(
      updateSettlement(state, settlementId, {
        status: "paid",
        paid_at: new Date().toISOString()
      }),
      settlementId,
      user,
      "Settlement payment marked as paid."
    );
    const guard = createAllowed("Settlement marked paid.", "SETTLEMENT_PAID");
    const businessEvent = createBusinessEvent("settlement.paid", settlementId, user.activeRole);
    const eventState = appendEvents(nextState, user, "settlement.payment.mark_paid", settlementId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }
}

export const financeSettlementService = new FinanceSettlementService();
