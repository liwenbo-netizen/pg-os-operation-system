import { describe, expect, it } from "vitest";
import { routeDefinitions } from "../routes/routes";
import { getNavigationGroup, groupRoutesForNavigation } from "./AppShell";

describe("AppShell business navigation", () => {
  it("groups routes by the operating domain instead of implementation phase", () => {
    const paths = [
      "/workbench",
      "/media/china-ecosystem",
      "/finance/settlements/:id",
      "/audit/events"
    ];
    const routes = routeDefinitions.filter((route) => paths.includes(route.path));

    expect(groupRoutesForNavigation(routes).map((group) => group.id)).toEqual([
      "workspace",
      "supply",
      "revenue",
      "governance"
    ]);
    expect(getNavigationGroup(routes.find((route) => route.path === "/finance/settlements/:id")!)).toBe("revenue");
  });

  it("searches localized route titles and only returns routes already available to the role", () => {
    const mediaRoutes = routeDefinitions.filter((route) => route.module === "Media");
    const results = groupRoutesForNavigation(mediaRoutes, "中国媒体", "zh-CN");

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("supply");
    expect(results[0].routes.map((route) => route.path)).toEqual(["/media/china-ecosystem"]);
    expect(groupRoutesForNavigation(mediaRoutes, "系统管理", "zh-CN")).toEqual([]);
  });
});
