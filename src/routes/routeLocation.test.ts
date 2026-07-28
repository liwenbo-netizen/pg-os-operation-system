import { describe, expect, it } from "vitest";
import { buildRouteLocation, resolveRouteLocation } from "./routes";

describe("route location mapping", () => {
  it("resolves static business routes", () => {
    expect(resolveRouteLocation("/media/onboarding-lifecycle")).toEqual({
      path: "/media/onboarding-lifecycle",
      objectId: undefined
    });
  });

  it("resolves object routes with and without an object id", () => {
    expect(resolveRouteLocation("/media/publishers/publisher-233")).toEqual({
      path: "/media/publishers/:id",
      objectId: "publisher-233"
    });
    expect(resolveRouteLocation("/media/publishers")).toEqual({
      path: "/media/publishers/:id",
      objectId: undefined
    });
  });

  it("builds browser-safe object URLs", () => {
    expect(buildRouteLocation("/media/publishers/:id", "publisher 233")).toBe("/media/publishers/publisher%20233");
    expect(buildRouteLocation("/media/publishers/:id")).toBe("/media/publishers");
    expect(buildRouteLocation("/media/onboarding-lifecycle")).toBe("/media/onboarding-lifecycle");
  });

  it("round-trips a focused integration checklist item", () => {
    const location = buildRouteLocation(
      "/media/integration-wizard/:id",
      "publisher-new-ctv",
      "TQ-007"
    );

    expect(location).toBe(
      "/media/integration-wizard/publisher-new-ctv?check=TQ-007"
    );
    expect(resolveRouteLocation(location)).toEqual({
      path: "/media/integration-wizard/:id",
      objectId: "publisher-new-ctv",
      focusItemCode: "TQ-007"
    });
  });

  it("ignores unsupported checklist focus values", () => {
    expect(
      resolveRouteLocation(
        "/media/integration-wizard/publisher-new-ctv?check=DROP-TABLE"
      )
    ).toEqual({
      path: "/media/integration-wizard/:id",
      objectId: "publisher-new-ctv"
    });
  });
});
