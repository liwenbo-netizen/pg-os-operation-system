import { describe, expect, it } from "vitest";
import { canViewRoute } from "./routeGuards";

describe("canViewRoute", () => {
  it("allows media directors into the media command center", () => {
    expect(canViewRoute("media_director", "/media/director-command-center")).toMatchObject({
      allowed: true,
      reason_code: "ROUTE_ALLOWED"
    });
  });

  it("keeps China media ecosystem expansion inside media and executive roles", () => {
    expect(canViewRoute("media_manager", "/media/china-ecosystem")).toMatchObject({
      allowed: true,
      reason_code: "ROUTE_ALLOWED"
    });
    expect(canViewRoute("ceo", "/media/china-ecosystem")).toMatchObject({
      allowed: true,
      reason_code: "ROUTE_ALLOWED"
    });
    expect(canViewRoute("sales_manager", "/media/china-ecosystem")).toMatchObject({
      allowed: false,
      reason_code: "ROLE_ROUTE_FORBIDDEN"
    });
  });

  it("allows media managers to hand a Publisher 360 record into technical integration", () => {
    expect(canViewRoute("media_manager", "/media/integration-wizard/:id")).toMatchObject({
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

  it("keeps UAT scripts limited to production sign-off roles", () => {
    expect(canViewRoute("operations_director", "/uat/scripts")).toMatchObject({
      allowed: true
    });
    expect(canViewRoute("system_admin", "/uat/scripts")).toMatchObject({
      allowed: true
    });
    expect(canViewRoute("media_manager", "/uat/scripts")).toMatchObject({
      allowed: false,
      reason_code: "ROLE_ROUTE_FORBIDDEN"
    });
  });

  it("keeps UAT history limited to production sign-off roles", () => {
    expect(canViewRoute("ceo", "/uat/history")).toMatchObject({
      allowed: true
    });
    expect(canViewRoute("audit_viewer", "/uat/history")).toMatchObject({
      allowed: true
    });
    expect(canViewRoute("sales_manager", "/uat/history")).toMatchObject({
      allowed: false,
      reason_code: "ROLE_ROUTE_FORBIDDEN"
    });
  });
});
