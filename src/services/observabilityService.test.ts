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

  it("uses live event coverage for the system health event signal", () => {
    const snapshot = createFixtureWorkflowSnapshot();
    const checks = buildSystemHealthChecks({
      activePath: "/system/health",
      activeRole: "ceo",
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
      user: authService.createMockUser("ceo"),
      snapshot,
      eventCoverage: {
        source: "supabase",
        auditCount: 1,
        businessCount: 2,
        sampleSize: 3,
        loadedAt: "2026-07-01T03:00:00.000Z",
        warningCount: 0
      }
    });

    const eventCheck = checks.find((check) => check.id === "events");
    expect(eventCheck).toMatchObject({
      status: "ok",
      detail: "Supabase live: 1 audit event(s), 2 business event(s) in latest 3 event(s). Loaded at 2026-07-01T03:00:00.000Z."
    });
  });

  it("marks partial live event coverage as warning", () => {
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
      snapshot: createFixtureWorkflowSnapshot(),
      eventCoverage: {
        source: "supabase_partial",
        auditCount: 0,
        businessCount: 1,
        sampleSize: 1,
        loadedAt: "2026-07-01T03:00:00.000Z",
        warningCount: 1
      }
    });

    expect(checks.find((check) => check.id === "events")?.status).toBe("warning");
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
