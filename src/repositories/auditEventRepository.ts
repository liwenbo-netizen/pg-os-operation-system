import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { collectObservabilityEvents, type ObservabilityEvent } from "../services/observabilityService";
import type { WorkflowSnapshot } from "./workflowRepository";

type Row = Record<string, unknown>;

type SupabaseEventResult<T extends Row> = {
  data: T[] | null;
  error: { message?: string } | null;
};

type SupabaseEventQuery = {
  select: (columns: string) => SupabaseEventQuery;
  order: (column: string, options: { ascending: boolean }) => SupabaseEventQuery;
  range: (from: number, to: number) => Promise<SupabaseEventResult<Row>>;
};

export type SupabaseAuditEventClient = {
  from: (table: string) => SupabaseEventQuery;
};

export type AuditEventSource = "supabase" | "supabase_partial" | "snapshot";

export type AuditEventPage = {
  events: ObservabilityEvent[];
  source: AuditEventSource;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  loadedAt: string;
  warnings: string[];
};

export type AuditEventPageRequest = {
  snapshot: WorkflowSnapshot;
  page?: number;
  pageSize?: number;
};

export type AuditEventRepository = {
  loadPage: (request: AuditEventPageRequest) => Promise<AuditEventPage>;
};

type TableEventResult = {
  events: ObservabilityEvent[];
  warning?: string;
};

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const AUDIT_COLUMNS = "id,actor_user_id,action,object_type,object_id,after_data,created_at";
const BUSINESS_COLUMNS = "id,event_code,object_type,object_id,owner_role,payload,created_at";

function normalizePage(page: number | undefined) {
  return Math.max(0, Math.floor(page ?? 0));
}

function normalizePageSize(pageSize: number | undefined) {
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(pageSize ?? DEFAULT_PAGE_SIZE)));
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function objectValue(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

function optionalBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

export function inferObservabilityModule(objectType: string, code = "") {
  const normalizedObjectType = objectType.toLowerCase();
  const normalizedCode = code.toLowerCase();

  if (["publisher"].includes(normalizedObjectType) || normalizedCode.includes("publisher")) {
    return "Media";
  }

  if (["advertiser", "opportunity", "proposal"].includes(normalizedObjectType)) {
    return "Sales";
  }

  if (normalizedObjectType === "campaign") {
    return "Campaigns";
  }

  if (normalizedObjectType === "diagnostic_case") {
    return "Diagnostics";
  }

  if (normalizedObjectType === "settlement") {
    return "Finance";
  }

  if (normalizedObjectType === "contract") {
    return "Contracts";
  }

  if (["okr", "workbench_task", "approval"].includes(normalizedObjectType)) {
    return "Workbench";
  }

  if (normalizedObjectType === "route" || normalizedCode.includes("sop") || normalizedCode.includes("guide")) {
    return "Guide";
  }

  return "System";
}

export function mapAuditLogRow(row: Row): ObservabilityEvent {
  const code = stringValue(row.action, "audit.unknown");
  const objectType = stringValue(row.object_type, "unknown");
  const afterData = objectValue(row.after_data);

  return {
    id: `audit-${stringValue(row.id, `${code}-${stringValue(row.created_at, "unknown")}`)}`,
    type: "audit",
    module: inferObservabilityModule(objectType, code),
    code,
    objectType,
    objectId: optionalString(row.object_id),
    actorOrOwner: optionalString(row.actor_user_id),
    allowed: optionalBoolean(afterData.allowed),
    createdAt: stringValue(row.created_at, new Date(0).toISOString())
  };
}

export function mapBusinessEventRow(row: Row): ObservabilityEvent {
  const code = stringValue(row.event_code, "business.unknown");
  const objectType = stringValue(row.object_type, "unknown");

  return {
    id: `business-${stringValue(row.id, `${code}-${stringValue(row.created_at, "unknown")}`)}`,
    type: "business",
    module: inferObservabilityModule(objectType, code),
    code,
    objectType,
    objectId: optionalString(row.object_id),
    actorOrOwner: optionalString(row.owner_role),
    createdAt: stringValue(row.created_at, new Date(0).toISOString())
  };
}

function sortNewestFirst(events: ObservabilityEvent[]) {
  return [...events].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function createSnapshotAuditEventPage(
  snapshot: WorkflowSnapshot,
  options: {
    page?: number;
    pageSize?: number;
    warnings?: string[];
  } = {}
): AuditEventPage {
  const page = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize);
  const offset = page * pageSize;
  const events = collectObservabilityEvents(snapshot, offset + pageSize + 1);

  return {
    events: events.slice(offset, offset + pageSize),
    source: "snapshot",
    page,
    pageSize,
    hasNextPage: events.length > offset + pageSize,
    loadedAt: new Date().toISOString(),
    warnings: options.warnings ?? []
  };
}

class SupabaseAuditEventRepository implements AuditEventRepository {
  constructor(
    private readonly client: SupabaseAuditEventClient | null,
    private readonly configured: boolean
  ) {}

  async loadPage(request: AuditEventPageRequest): Promise<AuditEventPage> {
    const page = normalizePage(request.page);
    const pageSize = normalizePageSize(request.pageSize);
    const offset = page * pageSize;

    if (!this.configured || !this.client) {
      return createSnapshotAuditEventPage(request.snapshot, {
        page,
        pageSize,
        warnings: ["Supabase audit event source is not configured; showing the current frontend snapshot."]
      });
    }

    const fetchLimit = offset + pageSize + 1;
    const [auditResult, businessResult] = await Promise.all([
      this.loadAuditLogs(fetchLimit),
      this.loadBusinessEvents(fetchLimit)
    ]);
    const warnings = [auditResult.warning, businessResult.warning].filter((warning): warning is string => Boolean(warning));

    if (auditResult.warning && businessResult.warning) {
      return createSnapshotAuditEventPage(request.snapshot, {
        page,
        pageSize,
        warnings: [
          ...warnings,
          "Supabase audit event source failed; showing the current frontend snapshot."
        ]
      });
    }

    const mergedEvents = sortNewestFirst([...auditResult.events, ...businessResult.events]);

    return {
      events: mergedEvents.slice(offset, offset + pageSize),
      source: warnings.length > 0 ? "supabase_partial" : "supabase",
      page,
      pageSize,
      hasNextPage: mergedEvents.length > offset + pageSize,
      loadedAt: new Date().toISOString(),
      warnings
    };
  }

  private async loadAuditLogs(fetchLimit: number): Promise<TableEventResult> {
    try {
      const client = this.client as SupabaseAuditEventClient;
      const { data, error } = await client
        .from("audit_logs")
        .select(AUDIT_COLUMNS)
        .order("created_at", { ascending: false })
        .range(0, fetchLimit - 1);

      if (error) {
        return { events: [], warning: `audit_logs: ${error.message ?? "select failed"}` };
      }

      return { events: (data ?? []).map(mapAuditLogRow) };
    } catch (error) {
      return {
        events: [],
        warning: `audit_logs: ${error instanceof Error ? error.message : "select failed"}`
      };
    }
  }

  private async loadBusinessEvents(fetchLimit: number): Promise<TableEventResult> {
    try {
      const client = this.client as SupabaseAuditEventClient;
      const { data, error } = await client
        .from("module_business_events")
        .select(BUSINESS_COLUMNS)
        .order("created_at", { ascending: false })
        .range(0, fetchLimit - 1);

      if (error) {
        return { events: [], warning: `module_business_events: ${error.message ?? "select failed"}` };
      }

      return { events: (data ?? []).map(mapBusinessEventRow) };
    } catch (error) {
      return {
        events: [],
        warning: `module_business_events: ${error instanceof Error ? error.message : "select failed"}`
      };
    }
  }
}

export function createAuditEventRepository(
  client: SupabaseAuditEventClient | null = supabase as SupabaseAuditEventClient | null,
  configured = isSupabaseConfigured
): AuditEventRepository {
  return new SupabaseAuditEventRepository(client, configured);
}
