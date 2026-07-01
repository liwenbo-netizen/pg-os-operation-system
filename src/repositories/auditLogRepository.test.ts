import { describe, expect, it } from "vitest";
import {
  createAuditLogRepository,
  createAuditLogRow,
  type SupabaseAuditLogClient
} from "./auditLogRepository";

type Row = Record<string, unknown>;

class FakeSupabase implements SupabaseAuditLogClient {
  readonly writes: Record<string, Row[]> = {};

  constructor(private readonly errorMessage?: string) {}

  from(table: string) {
    return {
      insert: async (rows: Row[]) => {
        this.writes[table] = rows;

        if (this.errorMessage) {
          return { data: null, error: { message: this.errorMessage } };
        }

        return { data: rows, error: null };
      }
    };
  }
}

describe("auditLogRepository", () => {
  it("builds audit_log rows with guard metadata", () => {
    expect(
      createAuditLogRow({
        id: "00000001-0000-4000-8000-000000000001",
        actorUserId: "00000002-0000-4000-8000-000000000002",
        action: "route.visit",
        objectType: "route",
        objectId: "/system/health",
        allowed: true,
        reasonCode: "ROUTE_VISIT",
        afterData: {
          path: "/system/health",
          role: "ceo"
        },
        createdAt: "2026-07-01T04:00:00.000Z"
      })
    ).toEqual({
      id: "00000001-0000-4000-8000-000000000001",
      actor_user_id: "00000002-0000-4000-8000-000000000002",
      action: "route.visit",
      object_type: "route",
      object_id: null,
      after_data: {
        path: "/system/health",
        role: "ceo",
        allowed: true,
        reasonCode: "ROUTE_VISIT"
      },
      created_at: "2026-07-01T04:00:00.000Z"
    });
  });

  it("inserts real audit events into audit_logs", async () => {
    const fakeSupabase = new FakeSupabase();
    const repository = createAuditLogRepository(fakeSupabase, true);

    const result = await repository.recordEvent({
      id: "00000001-0000-4000-8000-000000000001",
      actorUserId: "00000002-0000-4000-8000-000000000002",
      action: "auth.sign_in",
      objectType: "route",
      allowed: true,
      reasonCode: "AUTH_SIGN_IN",
      createdAt: "2026-07-01T04:00:00.000Z"
    });

    expect(result).toEqual({ ok: true, source: "supabase" });
    expect(fakeSupabase.writes.audit_logs).toHaveLength(1);
    expect(fakeSupabase.writes.audit_logs[0]).toMatchObject({
      action: "auth.sign_in",
      object_type: "route",
      after_data: {
        allowed: true,
        reasonCode: "AUTH_SIGN_IN"
      }
    });
  });

  it("skips audit writes when Supabase is not configured", async () => {
    const repository = createAuditLogRepository(null, false);

    const result = await repository.recordEvent({
      action: "route.visit",
      objectType: "route",
      allowed: true,
      reasonCode: "ROUTE_VISIT"
    });

    expect(result).toEqual({
      ok: false,
      source: "disabled",
      warning: "Supabase audit log writing is not configured."
    });
  });

  it("returns warnings when audit_logs rejects inserts", async () => {
    const repository = createAuditLogRepository(new FakeSupabase("RLS blocked"), true);

    const result = await repository.recordEvent({
      action: "role.switch",
      objectType: "route",
      allowed: false,
      reasonCode: "ROLE_NOT_ASSIGNED"
    });

    expect(result).toEqual({
      ok: false,
      source: "error",
      warning: "audit_logs: RLS blocked"
    });
  });
});
