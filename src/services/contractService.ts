import type {
  AuditEvent,
  BusinessContract,
  BusinessUser,
  ContractWorkflowState,
  EntityId,
  FinanceWorkflowState,
  MediaWorkflowState,
  ModuleBusinessEvent,
  SalesWorkflowState
} from "../types/domain";
import type { GuardResult } from "../types/guards";
import { auditService } from "./auditService";
import { fixtureRepository } from "./fixtures";
import { rbacService } from "./rbacService";
import { rlsService } from "./rlsService";

type ContractWorkflowResult = {
  state: ContractWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

type RequestContractInput = {
  contractType: BusinessContract["contract_type"];
  counterpartyName: string;
  publisherId?: EntityId;
  advertiserId?: EntityId;
  settlementId?: EntityId;
  riskLevel: BusinessContract["risk_level"];
  valueAmount?: number;
  currency?: string;
  blocker?: string;
  nextAction?: string;
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
    required_approval_role: requiredApprovalRole,
    message,
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
    objectType: "contract",
    objectId,
    ownerRole,
    createdAt: new Date().toISOString(),
    payload
  };
}

function appendEvents(
  state: ContractWorkflowState,
  user: BusinessUser,
  action: string,
  objectId: EntityId | undefined,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent
): ContractWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "contract", guard, objectId);

  return {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };
}

function appendActivity(
  state: ContractWorkflowState,
  contractId: EntityId,
  user: BusinessUser,
  event: string
): ContractWorkflowState {
  return {
    ...state,
    contractActivities: [
      {
        id: `contract-activity-${contractId}-${state.contractActivities.length + 1}`,
        contract_id: contractId,
        event,
        actor_role: user.activeRole,
        created_at: new Date().toISOString()
      },
      ...state.contractActivities
    ]
  };
}

function updateContract(
  state: ContractWorkflowState,
  contractId: EntityId,
  patch: Partial<BusinessContract>
): ContractWorkflowState {
  return {
    ...state,
    contracts: state.contracts.map((contract) =>
      contract.id === contractId
        ? {
            ...contract,
            ...patch
          }
        : contract
    )
  };
}

function canWriteContracts(user: BusinessUser) {
  return rlsService.canWriteTable(user, "contracts");
}

function canManageLegalReview(user: BusinessUser) {
  return canWriteContracts(user) && rbacService.hasCapability(user, "contract.manage");
}

function canReviewFinanceTerms(user: BusinessUser) {
  return canWriteContracts(user) && rbacService.hasCapability(user, "settlement.manage");
}

function hasOpenSettlementDispute(contract: BusinessContract, mediaState: MediaWorkflowState) {
  return mediaState.diagnosticCases.some(
    (diagnosticCase) =>
      contract.settlement_id &&
      diagnosticCase.settlement_id === contract.settlement_id &&
      diagnosticCase.is_blocking_settlement &&
      !["closed", "rejected"].includes(diagnosticCase.status)
  );
}

export function createInitialContractWorkflowState(): ContractWorkflowState {
  return {
    contracts: fixtureRepository.contracts.map((contract) => ({ ...contract })),
    contractActivities: fixtureRepository.contractActivities.map((activity) => ({ ...activity })),
    auditEvents: [],
    businessEvents: []
  };
}

export class ContractService {
  getSummary(state: ContractWorkflowState) {
    return {
      legalReview: state.contracts.filter((contract) => contract.status === "legal_review").length,
      financeReview: state.contracts.filter((contract) => contract.status === "finance_review").length,
      redline: state.contracts.filter((contract) => contract.status === "redline").length,
      signing: state.contracts.filter((contract) => ["approved", "signing"].includes(contract.status)).length,
      highRisk: state.contracts.filter((contract) => ["high", "critical"].includes(contract.risk_level)).length,
      archived: state.contracts.filter((contract) => contract.status === "archived").length
    };
  }

  getContractSnapshot(
    state: ContractWorkflowState,
    mediaState: MediaWorkflowState,
    salesState: SalesWorkflowState,
    financeState: FinanceWorkflowState,
    contractId: EntityId
  ) {
    const contract = state.contracts.find((candidate) => candidate.id === contractId);
    const publisher = mediaState.publishers.find((candidate) => candidate.id === contract?.publisher_id);
    const advertiser = salesState.advertisers.find((candidate) => candidate.id === contract?.advertiser_id);
    const settlement = financeState.settlements.find((candidate) => candidate.id === contract?.settlement_id);
    const activities = state.contractActivities
      .filter((activity) => activity.contract_id === contractId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    const settlementDisputes = mediaState.diagnosticCases.filter(
      (diagnosticCase) => diagnosticCase.settlement_id === contract?.settlement_id
    );

    return {
      contract,
      publisher,
      advertiser,
      settlement,
      settlementDisputes,
      activities
    };
  }

  requestContractReview(
    state: ContractWorkflowState,
    user: BusinessUser,
    input: RequestContractInput
  ): ContractWorkflowResult {
    if (!canWriteContracts(user)) {
      const guard = createBlocked("Current role cannot request contract review.", "CONTRACT_REQUEST_FORBIDDEN", "legal_manager");
      return { state: appendEvents(state, user, "contract.review.request", undefined, guard), guard };
    }

    const id = crypto.randomUUID();
    const contract: BusinessContract = {
      id,
      contract_no: `CON-${String(state.contracts.length + 1).padStart(3, "0")}`,
      contract_type: input.contractType,
      counterparty_name: input.counterpartyName,
      publisher_id: input.publisherId,
      advertiser_id: input.advertiserId,
      settlement_id: input.settlementId,
      status: "requested",
      owner_role: "legal_manager",
      requested_by_role: user.activeRole,
      risk_level: input.riskLevel,
      currency: input.currency ?? "USD",
      value_amount: input.valueAmount,
      blocker: input.blocker,
      next_action: input.nextAction ?? "Legal intake and review."
    };
    const nextState = appendActivity(
      {
        ...state,
        contracts: [contract, ...state.contracts]
      },
      id,
      user,
      "Contract review requested."
    );
    const guard = createAllowed("Contract review requested.", "CONTRACT_REVIEW_REQUESTED");
    const businessEvent = createBusinessEvent("contract.review_requested", id, user.activeRole, {
      contractType: input.contractType
    });
    const eventState = appendEvents(nextState, user, "contract.review.request", id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  startLegalReview(state: ContractWorkflowState, user: BusinessUser, contractId: EntityId): ContractWorkflowResult {
    const contract = state.contracts.find((candidate) => candidate.id === contractId);

    if (!contract) {
      const guard = createBlocked("Contract record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "contract.legal_review.start", contractId, guard), guard };
    }

    if (!canManageLegalReview(user)) {
      const guard = createBlocked("Only Legal can start contract legal review.", "CONTRACT_LEGAL_REVIEW_FORBIDDEN", "legal_manager");
      return { state: appendEvents(state, user, "contract.legal_review.start", contractId, guard), guard };
    }

    const nextState = appendActivity(
      updateContract(state, contractId, {
        status: "legal_review",
        next_action: "Approve legal review, request finance review, or send redline."
      }),
      contractId,
      user,
      "Legal review started."
    );
    const guard = createAllowed("Legal review started.", "CONTRACT_LEGAL_REVIEW_STARTED");
    const businessEvent = createBusinessEvent("contract.legal_review_started", contractId, user.activeRole);
    const eventState = appendEvents(nextState, user, "contract.legal_review.start", contractId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  requestFinanceReview(state: ContractWorkflowState, user: BusinessUser, contractId: EntityId): ContractWorkflowResult {
    const contract = state.contracts.find((candidate) => candidate.id === contractId);

    if (!contract) {
      const guard = createBlocked("Contract record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "contract.finance_review.request", contractId, guard), guard };
    }

    if (!canManageLegalReview(user)) {
      const guard = createBlocked("Only Legal can request finance review for a contract.", "CONTRACT_FINANCE_REVIEW_REQUEST_FORBIDDEN", "legal_manager");
      return { state: appendEvents(state, user, "contract.finance_review.request", contractId, guard), guard };
    }

    if (!["legal_review", "requested", "redline"].includes(contract.status)) {
      const guard = createBlocked("Finance review can only be requested before legal approval.", "CONTRACT_STATUS_FORBIDDEN");
      return { state: appendEvents(state, user, "contract.finance_review.request", contractId, guard), guard };
    }

    const nextState = appendActivity(
      updateContract(state, contractId, {
        status: "finance_review",
        next_action: "Finance to verify payment and settlement terms."
      }),
      contractId,
      user,
      "Finance review requested."
    );
    const guard = createAllowed("Finance review requested.", "CONTRACT_FINANCE_REVIEW_REQUESTED");
    const businessEvent = createBusinessEvent("contract.finance_review_requested", contractId, user.activeRole);
    const eventState = appendEvents(nextState, user, "contract.finance_review.request", contractId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  approveFinanceTerms(
    state: ContractWorkflowState,
    user: BusinessUser,
    contractId: EntityId,
    financeNotes: string
  ): ContractWorkflowResult {
    const contract = state.contracts.find((candidate) => candidate.id === contractId);

    if (!contract) {
      const guard = createBlocked("Contract record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "contract.finance_terms.approve", contractId, guard), guard };
    }

    if (!canReviewFinanceTerms(user)) {
      const guard = createBlocked("Only Finance can approve contract finance terms.", "CONTRACT_FINANCE_REVIEW_FORBIDDEN", "finance_manager");
      return { state: appendEvents(state, user, "contract.finance_terms.approve", contractId, guard), guard };
    }

    if (contract.status !== "finance_review") {
      const guard = createBlocked("Finance terms can only be approved during finance_review.", "CONTRACT_NOT_IN_FINANCE_REVIEW", "legal_manager");
      return { state: appendEvents(state, user, "contract.finance_terms.approve", contractId, guard), guard };
    }

    const nextState = appendActivity(
      updateContract(state, contractId, {
        status: "legal_review",
        finance_notes: financeNotes,
        next_action: "Legal to complete final review."
      }),
      contractId,
      user,
      "Finance terms approved."
    );
    const guard = createAllowed("Finance terms approved.", "CONTRACT_FINANCE_TERMS_APPROVED");
    const businessEvent = createBusinessEvent("contract.finance_terms_approved", contractId, user.activeRole);
    const eventState = appendEvents(nextState, user, "contract.finance_terms.approve", contractId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  approveLegalReview(
    state: ContractWorkflowState,
    user: BusinessUser,
    contractId: EntityId,
    legalNotes: string
  ): ContractWorkflowResult {
    const contract = state.contracts.find((candidate) => candidate.id === contractId);

    if (!contract) {
      const guard = createBlocked("Contract record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "contract.legal_review.approve", contractId, guard), guard };
    }

    if (!canManageLegalReview(user)) {
      const guard = createBlocked("Only Legal can approve contract review.", "CONTRACT_LEGAL_APPROVAL_FORBIDDEN", "legal_manager");
      return { state: appendEvents(state, user, "contract.legal_review.approve", contractId, guard), guard };
    }

    if (!["legal_review", "requested"].includes(contract.status)) {
      const guard = createBlocked("Legal review can only be approved from requested or legal_review status.", "CONTRACT_NOT_IN_LEGAL_REVIEW");
      return { state: appendEvents(state, user, "contract.legal_review.approve", contractId, guard), guard };
    }

    const nextState = appendActivity(
      updateContract(state, contractId, {
        status: "approved",
        legal_notes: legalNotes,
        blocker: undefined,
        next_action: "Move contract to signing."
      }),
      contractId,
      user,
      "Legal review approved."
    );
    const guard = createAllowed("Legal review approved.", "CONTRACT_LEGAL_REVIEW_APPROVED");
    const businessEvent = createBusinessEvent("contract.legal_review_approved", contractId, user.activeRole);
    const eventState = appendEvents(nextState, user, "contract.legal_review.approve", contractId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  sendRedline(
    state: ContractWorkflowState,
    user: BusinessUser,
    contractId: EntityId,
    redlineNote: string
  ): ContractWorkflowResult {
    const contract = state.contracts.find((candidate) => candidate.id === contractId);

    if (!contract) {
      const guard = createBlocked("Contract record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "contract.redline.send", contractId, guard), guard };
    }

    if (!canManageLegalReview(user)) {
      const guard = createBlocked("Only Legal can send contract redlines.", "CONTRACT_REDLINE_FORBIDDEN", "legal_manager");
      return { state: appendEvents(state, user, "contract.redline.send", contractId, guard), guard };
    }

    const nextState = appendActivity(
      updateContract(state, contractId, {
        status: "redline",
        blocker: redlineNote,
        next_action: "Resolve counterparty redline before signing."
      }),
      contractId,
      user,
      "Contract redline sent."
    );
    const guard = createAllowed("Contract redline sent.", "CONTRACT_REDLINE_SENT");
    const businessEvent = createBusinessEvent("contract.redline_sent", contractId, user.activeRole);
    const eventState = appendEvents(nextState, user, "contract.redline.send", contractId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  markSigned(
    state: ContractWorkflowState,
    mediaState: MediaWorkflowState,
    user: BusinessUser,
    contractId: EntityId
  ): ContractWorkflowResult {
    const contract = state.contracts.find((candidate) => candidate.id === contractId);

    if (!contract) {
      const guard = createBlocked("Contract record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "contract.sign", contractId, guard), guard };
    }

    if (!canManageLegalReview(user)) {
      const guard = createBlocked("Only Legal can mark a contract signed.", "CONTRACT_SIGN_FORBIDDEN", "legal_manager");
      return { state: appendEvents(state, user, "contract.sign", contractId, guard), guard };
    }

    if (!["approved", "signing"].includes(contract.status)) {
      const guard = createBlocked("Contract can be signed only after legal approval.", "CONTRACT_NOT_APPROVED", "legal_manager");
      return { state: appendEvents(state, user, "contract.sign", contractId, guard), guard };
    }

    if (hasOpenSettlementDispute(contract, mediaState)) {
      const guard = createBlocked("Settlement-linked contract cannot be signed while a settlement dispute is open.", "CONTRACT_SETTLEMENT_DISPUTE_OPEN", "finance_manager");
      return { state: appendEvents(state, user, "contract.sign", contractId, guard), guard };
    }

    const nextState = appendActivity(
      updateContract(state, contractId, {
        status: "signed",
        signed_at: new Date().toISOString(),
        next_action: "Archive signed contract."
      }),
      contractId,
      user,
      "Contract signed."
    );
    const guard = createAllowed("Contract marked signed.", "CONTRACT_SIGNED");
    const businessEvent = createBusinessEvent("contract.signed", contractId, user.activeRole);
    const eventState = appendEvents(nextState, user, "contract.sign", contractId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  archiveSignedContract(state: ContractWorkflowState, user: BusinessUser, contractId: EntityId): ContractWorkflowResult {
    const contract = state.contracts.find((candidate) => candidate.id === contractId);

    if (!contract) {
      const guard = createBlocked("Contract record was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "contract.archive", contractId, guard), guard };
    }

    if (!canManageLegalReview(user)) {
      const guard = createBlocked("Only Legal can archive signed contracts.", "CONTRACT_ARCHIVE_FORBIDDEN", "legal_manager");
      return { state: appendEvents(state, user, "contract.archive", contractId, guard), guard };
    }

    if (contract.status !== "signed") {
      const guard = createBlocked("Only signed contracts can be archived.", "CONTRACT_NOT_SIGNED", "legal_manager");
      return { state: appendEvents(state, user, "contract.archive", contractId, guard), guard };
    }

    const nextState = appendActivity(
      updateContract(state, contractId, {
        status: "archived",
        archived_at: new Date().toISOString(),
        next_action: "Contract is archived."
      }),
      contractId,
      user,
      "Signed contract archived."
    );
    const guard = createAllowed("Signed contract archived.", "CONTRACT_ARCHIVED");
    const businessEvent = createBusinessEvent("contract.archived", contractId, user.activeRole);
    const eventState = appendEvents(nextState, user, "contract.archive", contractId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }
}

export const contractService = new ContractService();
