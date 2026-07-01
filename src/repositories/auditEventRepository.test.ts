import { describe, expect, it } from "vitest";
import {
  createAuditEventRepository,
  createSnapshotAuditEventPage,
  inferObservabilityModule,
  mapAuditLogRow,
  mapBusinessEventRow,
  type SupabaseAuditEventClient
} from "./auditEventRepository";
import { createFixtureWorkflowSnapshot } from "./workflowRepository";

type Row = Record<string, unknown>;

class FakeSupabaseQuery {
  readonly ranges: Array<[number, number]> = [];
  readonly orders: Array<{ column: string; ascending: boolean }> = [];

  constructor(
    private readonly rows: Row[],
    private readonly errorMessage?: string
  ) {}

  select(_columns = "") {
    return this;
  }

  order(column: string, options: { ascending: boolean }) {
    this.orders.push({ column, ascending: options.ascending });
    return this;
  }

  async range(from: number, to: number) {
    this.ranges.push([from, to]);

    if (this.errorMessage) {
      return { data: null, error: { message: this.errorMessage } };
    }

    return { data: this.rows.slice(from, to + 1), error: null };
  }
}

class FakeSupabase implements SupabaseAuditEventClient {
  readonly queries: Record<string, FakeSupabaseQuery> = {};

  constructor(
    private readonly tables: Record<string, Row[]>,
    private readonly failures: Record<string, string> = {}
  ) {}

  from(table: string) {
    const query = new FakeSupabaseQuery(this.tables[table] ?? [], this.failures[table]);
    this.queries[table] = query;
    return query;
  }
}

describe("auditEventRepository", () => {
  it("maps Supabase audit and business rows into observability events", () => {
    expect(
      mapAuditLogRow({
        id: "audit-1",
        actor_user_id: "user-1",
        action: "publisher.approve",
        object_type: "publisher",
        object_id: "publisher-1",
        after_data: { allowed: true },
        created_at: "2026-07-01T02:00:00.000Z"
      })
    ).toMatchObject({
      id: "audit-audit-1",
      type: "audit",
      module: "Media",
      code: "publisher.approve",
      allowed: true
    });

    expect(
      mapBusinessEventRow({
        id: "business-1",
        event_code: "proposal.created",
        object_type: "proposal",
        object_id: "proposal-1",
        owner_role: "sales_manager",
        created_at: "2026-07-01T01:00:00.000Z"
      })
    ).toMatchObject({
      id: "business-business-1",
      type: "business",
      module: "Sales",
      actorOrOwner: "sales_manager"
    });
  });

  it("loads a globally sorted Supabase page from both event tables", async () => {
    const snapshot = createFixtureWorkflowSnapshot();
    const fakeSupabase = new FakeSupabase({
      audit_logs: [
        {
          id: "audit-2",
          action: "contract.review",
          object_type: "contract",
          after_data: { allowed: false },
          created_at: "2026-07-01T03:00:00.000Z"
        },
        {
          id: "audit-1",
          action: "publisher.create",
          object_type: "publisher",
          after_data: { allowed: true },
          created_at: "2026-07-01T01:00:00.000Z"
        }
      ],
      module_business_events: [
        {
          id: "business-1",
          event_code: "settlement.confirmed",
          object_type: "settlement",
          owner_role: "finance_manager",
          created_at: "2026-07-01T02:00:00.000Z"
        }
      ]
    });
    const repository = createAuditEventRepository(fakeSupabase, true);

    const page = await repository.loadPage({ snapshot, page: 0, pageSize: 2 });

    expect(page.source).toBe("supabase");
    expect(page.events.map((event) => event.id)).toEqual(["audit-audit-2", "business-business-1"]);
    expect(page.hasNextPage).toBe(true);
    expect(fakeSupabase.queries.audit_logs.ranges).toEqual([[0, 2]]);
    expect(fakeSupabase.queries.module_business_events.orders).toEqual([{ column: "created_at", ascending: false }]);
  });

  it("falls back to the frontend snapshot when Supabase is not configured", async () => {
    const snapshot = createFixtureWorkflowSnapshot();
    snapshot.mediaState.auditEvents = [
      {
        id: "audit-1",
        actorUserId: "user-1",
        action: "publisher.create",
        objectType: "publisher",
        objectId: "publisher-1",
        allowed: true,
        reasonCode: "ALLOWED",
        createdAt: "2026-07-01T01:00:00.000Z"
      }
    ];
    const repository = createAuditEventRepository(null, false);

    const page = await repository.loadPage({ snapshot, pageSize: 10 });

    expect(page.source).toBe("snapshot");
    expect(page.events.map((event) => event.id)).toEqual(["audit-audit-1"]);
    expect(page.warnings[0]).toContain("not configured");
  });

  it("keeps partial Supabase events when only one table fails", async () => {
    const snapshot = createFixtureWorkflowSnapshot();
    const fakeSupabase = new FakeSupabase(
      {
        module_business_events: [
          {
            id: "business-1",
            event_code: "okr.updated",
            object_type: "okr",
            owner_role: "operations_director",
            created_at: "2026-07-01T02:00:00.000Z"
          }
        ]
      },
      { audit_logs: "RLS blocked" }
    );
    const repository = createAuditEventRepository(fakeSupabase, true);

    const page = await repository.loadPage({ snapshot });

    expect(page.source).toBe("supabase_partial");
    expect(page.events.map((event) => event.id)).toEqual(["business-business-1"]);
    expect(page.warnings).toEqual(["audit_logs: RLS blocked"]);
  });

  it("creates paged snapshot fallback results", () => {
    const snapshot = createFixtureWorkflowSnapshot();
    snapshot.mediaState.auditEvents = [
      {
        id: "audit-1",
        actorUserId: "user-1",
        action: "publisher.create",
        objectType: "publisher",
        objectId: "publisher-1",
        allowed: true,
        reasonCode: "ALLOWED",
        createdAt: "2026-07-01T01:00:00.000Z"
      }
    ];
    snapshot.salesState.businessEvents = [
      {
        id: "business-1",
        eventCode: "proposal.created",
        objectType: "proposal",
        objectId: "proposal-1",
        ownerRole: "sales_manager",
        createdAt: "2026-07-01T02:00:00.000Z"
      }
    ];

    const page = createSnapshotAuditEventPage(snapshot, { page: 1, pageSize: 1 });

    expect(page.events.map((event) => event.id)).toEqual(["audit-audit-1"]);
    expect(page.hasNextPage).toBe(false);
  });

  it("infers the display module for known object types", () => {
    expect(inferObservabilityModule("diagnostic_case")).toBe("Diagnostics");
    expect(inferObservabilityModule("route", "guide.opened")).toBe("Guide");
    expect(inferObservabilityModule("workbench_task")).toBe("Workbench");
  });
});
