import type { RoleCode } from "../constants/roles";
import type { WorkflowRepositoryHealth, WorkflowSnapshot } from "../repositories/workflowRepository";
import type { AuditEvent, BusinessUser, ModuleBusinessEvent } from "../types/domain";

export type HealthCheckStatus = "ok" | "warning" | "blocked";

export type SystemHealthCheck = {
  id: string;
  label: string;
  status: HealthCheckStatus;
  detail: string;
};

export type ObservabilityEvent = {
  id: string;
  type: "audit" | "business";
  module: string;
  code: string;
  objectType: string;
  objectId?: string;
  actorOrOwner?: string;
  allowed?: boolean;
  createdAt: string;
};

export type SystemHealthInput = {
  activePath: string;
  activeRole: RoleCode;
  authMode: "mock" | "supabase";
  authWarningCount: number;
  repositoryHealth: WorkflowRepositoryHealth;
  repositoryWarningCount: number;
  supportsSupabase: boolean;
  user: BusinessUser;
  snapshot: WorkflowSnapshot;
};

function countAuditEvents(snapshot: WorkflowSnapshot) {
  return collectAuditEvents(snapshot).length;
}

function countBusinessEvents(snapshot: WorkflowSnapshot) {
  return collectBusinessEvents(snapshot).length;
}

export function buildSystemHealthChecks(input: SystemHealthInput): SystemHealthCheck[] {
  const repositoryStatus: HealthCheckStatus =
    input.repositoryHealth.mode === "supabase"
      ? input.repositoryWarningCount > 0
        ? "warning"
        : "ok"
      : "warning";

  return [
    {
      id: "production-auth",
      label: "Auth session",
      status: input.authMode === "supabase" && input.supportsSupabase ? "ok" : "warning",
      detail:
        input.authMode === "supabase"
          ? `${input.user.email} is bound through Supabase auth.`
          : "Current session is using mock role auth."
    },
    {
      id: "repository",
      label: "Workflow repository",
      status: repositoryStatus,
      detail: `${input.repositoryHealth.source} / ${input.repositoryHealth.loadedAt}`
    },
    {
      id: "warnings",
      label: "Runtime warnings",
      status: input.authWarningCount + input.repositoryWarningCount > 0 ? "warning" : "ok",
      detail: `${input.authWarningCount} auth warning(s), ${input.repositoryWarningCount} repository warning(s).`
    },
    {
      id: "events",
      label: "Audit and business events",
      status: countAuditEvents(input.snapshot) + countBusinessEvents(input.snapshot) > 0 ? "ok" : "warning",
      detail: `${countAuditEvents(input.snapshot)} audit event(s), ${countBusinessEvents(input.snapshot)} business event(s).`
    },
    {
      id: "route",
      label: "Active route",
      status: "ok",
      detail: `${input.activePath} as ${input.activeRole}`
    }
  ];
}

export function collectAuditEvents(snapshot: WorkflowSnapshot): Array<AuditEvent & { module: string }> {
  return [
    ...snapshot.mediaState.auditEvents.map((event) => ({ ...event, module: "Media" })),
    ...snapshot.salesState.auditEvents.map((event) => ({ ...event, module: "Sales" })),
    ...snapshot.financeState.auditEvents.map((event) => ({ ...event, module: "Finance" })),
    ...snapshot.contractState.auditEvents.map((event) => ({ ...event, module: "Contracts" })),
    ...snapshot.guideState.auditEvents.map((event) => ({ ...event, module: "Guide" })),
    ...snapshot.workbenchState.auditEvents.map((event) => ({ ...event, module: "Workbench" }))
  ];
}

export function collectBusinessEvents(snapshot: WorkflowSnapshot): Array<ModuleBusinessEvent & { module: string }> {
  return [
    ...snapshot.mediaState.businessEvents.map((event) => ({ ...event, module: "Media" })),
    ...snapshot.salesState.businessEvents.map((event) => ({ ...event, module: "Sales" })),
    ...snapshot.financeState.businessEvents.map((event) => ({ ...event, module: "Finance" })),
    ...snapshot.contractState.businessEvents.map((event) => ({ ...event, module: "Contracts" })),
    ...snapshot.guideState.businessEvents.map((event) => ({ ...event, module: "Guide" })),
    ...snapshot.workbenchState.businessEvents.map((event) => ({ ...event, module: "Workbench" }))
  ];
}

export function collectObservabilityEvents(snapshot: WorkflowSnapshot, limit = 50): ObservabilityEvent[] {
  const auditEvents: ObservabilityEvent[] = collectAuditEvents(snapshot).map((event) => ({
    id: `audit-${event.id}`,
    type: "audit",
    module: event.module,
    code: event.action,
    objectType: event.objectType,
    objectId: event.objectId,
    actorOrOwner: event.actorUserId,
    allowed: event.allowed,
    createdAt: event.createdAt
  }));
  const businessEvents: ObservabilityEvent[] = collectBusinessEvents(snapshot).map((event) => ({
    id: `business-${event.id}`,
    type: "business",
    module: event.module,
    code: event.eventCode,
    objectType: event.objectType,
    objectId: event.objectId,
    actorOrOwner: event.ownerRole,
    createdAt: event.createdAt
  }));

  return [...auditEvents, ...businessEvents]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))
    .slice(0, limit);
}
