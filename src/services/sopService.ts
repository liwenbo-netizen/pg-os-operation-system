import type {
  AuditEvent,
  BusinessUser,
  EntityId,
  GuideWorkflowState,
  ModuleBusinessEvent,
  SopCard
} from "../types/domain";
import type { GuardResult } from "../types/guards";
import { auditService } from "./auditService";
import { fixtureRepository } from "./fixtures";
import { rbacService } from "./rbacService";
import { rlsService } from "./rlsService";

type SopWorkflowResult = {
  state: GuideWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
  businessEvent?: ModuleBusinessEvent;
};

type CreateSopInput = {
  title: string;
  module: SopCard["module"];
  scenario: string;
  ownerRole: SopCard["owner_role"];
  visibleRoles: SopCard["visible_roles"];
  priority: SopCard["priority"];
  summary: string;
  steps: string[];
  relatedRoute?: string;
  relatedService?: string;
};

type SopSearchInput = {
  query?: string;
  role?: BusinessUser["activeRole"];
  module?: SopCard["module"];
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
    objectType: "route",
    objectId,
    ownerRole,
    createdAt: new Date().toISOString(),
    payload
  };
}

function appendEvents(
  state: GuideWorkflowState,
  user: BusinessUser,
  action: string,
  objectId: EntityId | undefined,
  guard: GuardResult,
  businessEvent?: ModuleBusinessEvent
): GuideWorkflowState {
  const auditEvent = auditService.createGuardAuditEvent(user, action, "route", guard, objectId);

  return {
    ...state,
    auditEvents: [auditEvent, ...state.auditEvents],
    businessEvents: businessEvent ? [businessEvent, ...state.businessEvents] : state.businessEvents
  };
}

function appendActivity(
  state: GuideWorkflowState,
  sopCardId: EntityId,
  user: BusinessUser,
  event: string
): GuideWorkflowState {
  return {
    ...state,
    sopActivities: [
      {
        id: `sop-activity-${sopCardId}-${state.sopActivities.length + 1}`,
        sop_card_id: sopCardId,
        event,
        actor_role: user.activeRole,
        created_at: new Date().toISOString()
      },
      ...state.sopActivities
    ]
  };
}

function updateSopCard(state: GuideWorkflowState, sopCardId: EntityId, patch: Partial<SopCard>): GuideWorkflowState {
  return {
    ...state,
    sopCards: state.sopCards.map((sopCard) =>
      sopCard.id === sopCardId
        ? {
            ...sopCard,
            ...patch
          }
        : sopCard
    )
  };
}

function canManageSop(user: BusinessUser) {
  return rlsService.canWriteTable(user, "sop_cards") && rbacService.hasCapability(user, "sop.manage");
}

function matchesSearch(card: SopCard, input: SopSearchInput) {
  const query = input.query?.trim().toLowerCase();
  const queryMatched = query
    ? [card.title, card.summary, card.scenario, card.module, card.related_service ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    : true;
  const roleMatched = input.role ? card.visible_roles.includes(input.role) : true;
  const moduleMatched = input.module ? card.module === input.module : true;

  return queryMatched && roleMatched && moduleMatched && card.status !== "deprecated";
}

export function createInitialGuideWorkflowState(): GuideWorkflowState {
  return {
    sopCards: fixtureRepository.sopCards.map((sopCard) => ({
      ...sopCard,
      visible_roles: [...sopCard.visible_roles],
      steps: [...sopCard.steps]
    })),
    sopActivities: fixtureRepository.sopActivities.map((activity) => ({ ...activity })),
    auditEvents: [],
    businessEvents: []
  };
}

export class SopService {
  getSummary(state: GuideWorkflowState) {
    return {
      total: state.sopCards.length,
      published: state.sopCards.filter((sopCard) => sopCard.status === "published").length,
      p0: state.sopCards.filter((sopCard) => sopCard.priority === "P0").length,
      modules: new Set(state.sopCards.map((sopCard) => sopCard.module)).size,
      draft: state.sopCards.filter((sopCard) => sopCard.status === "draft").length
    };
  }

  searchSopCards(state: GuideWorkflowState, input: SopSearchInput) {
    return state.sopCards.filter((sopCard) => matchesSearch(sopCard, input));
  }

  getRoleRecommendations(state: GuideWorkflowState, user: BusinessUser) {
    return this.searchSopCards(state, { role: user.activeRole })
      .filter((sopCard) => sopCard.status === "published")
      .sort((left, right) => left.priority.localeCompare(right.priority));
  }

  getSopSnapshot(state: GuideWorkflowState, sopCardId: EntityId) {
    const sopCard = state.sopCards.find((candidate) => candidate.id === sopCardId);
    const activities = state.sopActivities
      .filter((activity) => activity.sop_card_id === sopCardId)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));

    return {
      sopCard,
      activities
    };
  }

  openSopCard(state: GuideWorkflowState, user: BusinessUser, sopCardId: EntityId): SopWorkflowResult {
    const sopCard = state.sopCards.find((candidate) => candidate.id === sopCardId);

    if (!sopCard) {
      const guard = createBlocked("SOP card was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "sop.open", sopCardId, guard), guard };
    }

    if (!sopCard.visible_roles.includes(user.activeRole) && user.activeRole !== "system_admin") {
      const guard = createBlocked("Current role cannot open this SOP card.", "SOP_ROLE_FORBIDDEN");
      return { state: appendEvents(state, user, "sop.open", sopCardId, guard), guard };
    }

    const nextState = appendActivity(state, sopCardId, user, "SOP opened.");
    const guard = createAllowed("SOP card opened.", "SOP_OPENED");
    const eventState = appendEvents(nextState, user, "sop.open", sopCardId, guard);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0]
    };
  }

  createDraftSop(state: GuideWorkflowState, user: BusinessUser, input: CreateSopInput): SopWorkflowResult {
    if (!canManageSop(user)) {
      const guard = createBlocked("Current role cannot create SOP cards.", "SOP_CREATE_FORBIDDEN", "product_owner");
      return { state: appendEvents(state, user, "sop.create", undefined, guard), guard };
    }

    const id = crypto.randomUUID();
    const sopCard: SopCard = {
      id,
      title: input.title,
      module: input.module,
      scenario: input.scenario,
      owner_role: input.ownerRole,
      visible_roles: input.visibleRoles,
      status: "draft",
      priority: input.priority,
      summary: input.summary,
      steps: input.steps,
      related_route: input.relatedRoute,
      related_service: input.relatedService,
      version: 1,
      updated_at: new Date().toISOString()
    };
    const nextState = appendActivity(
      {
        ...state,
        sopCards: [sopCard, ...state.sopCards]
      },
      id,
      user,
      "SOP draft created."
    );
    const guard = createAllowed("SOP draft created.", "SOP_DRAFT_CREATED");
    const businessEvent = createBusinessEvent("sop.draft_created", id, user.activeRole, {
      module: input.module
    });
    const eventState = appendEvents(nextState, user, "sop.create", id, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  publishSop(state: GuideWorkflowState, user: BusinessUser, sopCardId: EntityId): SopWorkflowResult {
    const sopCard = state.sopCards.find((candidate) => candidate.id === sopCardId);

    if (!sopCard) {
      const guard = createBlocked("SOP card was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "sop.publish", sopCardId, guard), guard };
    }

    if (!canManageSop(user)) {
      const guard = createBlocked("Current role cannot publish SOP cards.", "SOP_PUBLISH_FORBIDDEN", "product_owner");
      return { state: appendEvents(state, user, "sop.publish", sopCardId, guard), guard };
    }

    if (sopCard.steps.length === 0) {
      const guard = createBlocked("SOP cannot be published without steps.", "SOP_STEPS_REQUIRED", "product_owner");
      return { state: appendEvents(state, user, "sop.publish", sopCardId, guard), guard };
    }

    const nextState = appendActivity(
      updateSopCard(state, sopCardId, {
        status: "published",
        updated_at: new Date().toISOString()
      }),
      sopCardId,
      user,
      "SOP published."
    );
    const guard = createAllowed("SOP published.", "SOP_PUBLISHED");
    const businessEvent = createBusinessEvent("sop.published", sopCardId, user.activeRole);
    const eventState = appendEvents(nextState, user, "sop.publish", sopCardId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }

  updateSopSteps(
    state: GuideWorkflowState,
    user: BusinessUser,
    sopCardId: EntityId,
    steps: string[],
    summary?: string
  ): SopWorkflowResult {
    const sopCard = state.sopCards.find((candidate) => candidate.id === sopCardId);

    if (!sopCard) {
      const guard = createBlocked("SOP card was not found.", "NOT_FOUND");
      return { state: appendEvents(state, user, "sop.steps.update", sopCardId, guard), guard };
    }

    if (!canManageSop(user)) {
      const guard = createBlocked("Current role cannot update SOP steps.", "SOP_UPDATE_FORBIDDEN", "product_owner");
      return { state: appendEvents(state, user, "sop.steps.update", sopCardId, guard), guard };
    }

    if (steps.length === 0) {
      const guard = createBlocked("SOP steps cannot be empty.", "SOP_STEPS_REQUIRED", "product_owner");
      return { state: appendEvents(state, user, "sop.steps.update", sopCardId, guard), guard };
    }

    const nextState = appendActivity(
      updateSopCard(state, sopCardId, {
        steps,
        summary: summary ?? sopCard.summary,
        version: sopCard.version + 1,
        updated_at: new Date().toISOString()
      }),
      sopCardId,
      user,
      "SOP steps updated."
    );
    const guard = createAllowed("SOP steps updated.", "SOP_UPDATED");
    const businessEvent = createBusinessEvent("sop.updated", sopCardId, user.activeRole, {
      version: sopCard.version + 1
    });
    const eventState = appendEvents(nextState, user, "sop.steps.update", sopCardId, guard, businessEvent);

    return {
      state: eventState,
      guard,
      auditEvent: eventState.auditEvents[0],
      businessEvent
    };
  }
}

export const sopService = new SopService();
