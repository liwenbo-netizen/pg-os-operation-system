import { describe, expect, it } from "vitest";
import { canViewRoute } from "./routeGuards";

describe("canViewRoute", () => {
  it("allows media directors into the media command center", () => {
    expect(canViewRoute("media_director", "/media/director-command-center")).toMatchObject({
      allowed: true,
      reason_code: "ROUTE_ALLOWED"
    });
  });

  it("does not give system admin business approval routes by default", () => {
    expect(canViewRoute("system_admin", "/media/director-command-center")).toMatchObject({
      allowed: false,
      reason_code: "ROLE_ROUTE_FORBIDDEN"
    });
  });

  it("allows all roles into the guide center", () => {
    expect(canViewRoute("audit_viewer", "/guide")).toMatchObject({
      allowed: true
    });
  });

  it("allows all signed-in roles into system health", () => {
    expect(canViewRoute("media_manager", "/system/health")).toMatchObject({
      allowed: true
    });
  });

  it("keeps audit events limited to audit-capable roles", () => {
    expect(canViewRoute("audit_viewer", "/audit/events")).toMatchObject({
      allowed: true
    });
    expect(canViewRoute("media_manager", "/audit/events")).toMatchObject({
      allowed: false,
      reason_code: "ROLE_ROUTE_FORBIDDEN"
    });
  });
});
