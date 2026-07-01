import { isSupabaseConfigured, supabase } from "../lib/supabase";
import type { ObjectType, UserId } from "../types/domain";

type Row = Record<string, unknown>;

type SupabaseErrorLike = {
  message?: string;
};

type SupabaseAuditLogInsertResult = {
  data: Row[] | null;
  error: SupabaseErrorLike | null;
};

type SupabaseAuditLogQuery = {
  insert: (rows: Row[]) => Promise<SupabaseAuditLogInsertResult>;
};

export type SupabaseAuditLogClient = {
  from: (table: string) => SupabaseAuditLogQuery;
};

export type AuditLogWriteInput = {
  id?: string;
  actorUserId?: UserId;
  action: string;
  objectType: ObjectType;
  objectId?: string;
  allowed: boolean;
  reasonCode: string;
  afterData?: Record<string, unknown>;
  createdAt?: string;
};

export type AuditLogWriteResult = {
  ok: boolean;
  source: "supabase" | "disabled" | "error";
  warning?: string;
};

export type AuditLogRepository = {
  supportsSupabase: boolean;
  recordEvent: (input: AuditLogWriteInput) => Promise<AuditLogWriteResult>;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function optionalUuid(value: unknown) {
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function createAuditLogId() {
  return crypto.randomUUID();
}

export function createAuditLogRow(input: AuditLogWriteInput): Row {
  return {
    id: input.id ?? createAuditLogId(),
    actor_user_id: optionalUuid(input.actorUserId),
    action: input.action,
    object_type: input.objectType,
    object_id: optionalUuid(input.objectId),
    after_data: {
      ...(input.afterData ?? {}),
      allowed: input.allowed,
      reasonCode: input.reasonCode
    },
    created_at: input.createdAt ?? new Date().toISOString()
  };
}

class SupabaseAuditLogRepository implements AuditLogRepository {
  readonly supportsSupabase: boolean;

  constructor(
    private readonly client: SupabaseAuditLogClient | null,
    configured: boolean
  ) {
    this.supportsSupabase = configured && Boolean(client);
  }

  async recordEvent(input: AuditLogWriteInput): Promise<AuditLogWriteResult> {
    if (!this.supportsSupabase || !this.client) {
      return {
        ok: false,
        source: "disabled",
        warning: "Supabase audit log writing is not configured."
      };
    }

    try {
      const { error } = await this.client.from("audit_logs").insert([createAuditLogRow(input)]);

      if (error) {
        return {
          ok: false,
          source: "error",
          warning: `audit_logs: ${error.message ?? "insert failed"}`
        };
      }

      return { ok: true, source: "supabase" };
    } catch (error) {
      return {
        ok: false,
        source: "error",
        warning: `audit_logs: ${error instanceof Error ? error.message : "insert failed"}`
      };
    }
  }
}

export function createAuditLogRepository(
  client: SupabaseAuditLogClient | null = supabase as SupabaseAuditLogClient | null,
  configured = isSupabaseConfigured
): AuditLogRepository {
  return new SupabaseAuditLogRepository(client, configured);
}
