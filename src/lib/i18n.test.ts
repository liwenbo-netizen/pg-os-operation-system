import { describe, expect, it } from "vitest";
import {
  getInitialLocale,
  getRoleDisplayName,
  getRouteDisplayTitle,
  getRoutePageType,
  getRoutePrimaryAction,
  translate
} from "./i18n";

describe("PG OS localization", () => {
  it("renders Chinese shared labels and templates without changing the English fallback", () => {
    expect(translate("zh-CN", "media.activeFilters", { count: 2 })).toBe("已启用 2 个筛选条件");
    expect(translate("en-US", "media.activeFilters", { count: 2 })).toBe("2 active filter(s)");
    expect(translate("zh-CN", "shell.supabaseAuth")).toBe("Supabase 登录");
  });

  it("localizes role and route display names while preserving stable codes and paths", () => {
    expect(getRoleDisplayName("media_manager", "zh-CN")).toBe("媒体经理");
    expect(getRoleDisplayName("media_manager", "en-US")).toBe("Media Manager");
    expect(getRouteDisplayTitle({ path: "/media/china-ecosystem", title: "China Media Ecosystem Expansion" }, "zh-CN")).toBe(
      "中国媒体生态拓展"
    );
  });

  it("selects Chinese for Chinese browser locales and English otherwise", () => {
    expect(getInitialLocale("zh-CN")).toBe("zh-CN");
    expect(getInitialLocale("en-US")).toBe("en-US");
  });

  it("localizes route guidance metadata used by the global shell", () => {
    const route = {
      path: "/media/china-ecosystem",
      primaryAction: "Create trusted supply candidate",
      pageType: "Ecosystem Expansion"
    };

    expect(getRoutePrimaryAction(route, "zh-CN")).toBe("转为可信供给候选");
    expect(getRoutePageType(route, "zh-CN")).toBe("生态拓展");
    expect(getRoutePrimaryAction(route, "en-US")).toBe("Create trusted supply candidate");
  });
});
