import { describe, expect, it } from "vitest";
import { createFixtureWorkflowSnapshot } from "../repositories/workflowRepository";
import { authService } from "./authService";
import { buildSystemHealthChecks, collectObservabilityEvents } from "./observabilityService";

describe("observabilityService", () => {
  it("builds system health checks from auth, repository, and event state", () => {
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

    const checks = buildSystemHealthChecks({
      activePath: "/system/health",
      activeRole: "media_manager",
      authMode: "supabase",
      authWarningCount: 0,
      repositoryHealth: {
        mode: "supabase",
        source: "supabase",
        loadedAt: "2026-07-01T01:00:00.000Z",
        warnings: []
      },
      repositoryWarningCount: 0,
      supportsSupabase: true,
      user: authService.createMockUser("media_manager"),
      snapshot
    });

    expect(checks.map((check) => check.status)).toEqual(["ok", "ok", "ok", "ok", "ok"]);
  });

  it("collects audit and business events ordered newest first", () => {
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

    expect(collectObservabilityEvents(snapshot).map((event) => event.id)).toEqual([
      "business-business-1",
      "audit-audit-1"
    ]);
  });
});
