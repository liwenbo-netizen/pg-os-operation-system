import { describe, expect, it } from "vitest";
import {
  mergeUatScriptResults,
  productionUatScripts,
  summarizeScriptResults,
  summarizeUatResults,
  updateUatStepResult,
  type UatScriptResults
} from "./uatScriptService";

describe("uatScriptService", () => {
  it("defines production UAT scripts with role, login, route, and expected steps", () => {
    expect(productionUatScripts.length).toBeGreaterThanOrEqual(6);
    expect(productionUatScripts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "ceo-observability-signoff",
          roleCode: "ceo",
          loginAccount: "ceo@poly-gamma.com"
        }),
        expect.objectContaining({
          id: "media-publisher-onboarding",
          businessDomain: "Media",
          roleCode: "media_manager",
          targetRoute: "/media/manager-workbench"
        })
      ])
    );
    expect(productionUatScripts.every((script) => script.steps.length > 0)).toBe(true);
    expect(productionUatScripts.every((script) => script.auditEvents.length > 0)).toBe(true);
    expect(productionUatScripts.every((script) => script.dataQualityChecks.length > 0)).toBe(true);
    expect(
      productionUatScripts
        .filter((script) => ["Media", "Sales", "Finance", "Contract"].includes(script.businessDomain))
        .every((script) => script.businessActions.length >= 3)
    ).toBe(true);
  });

  it("summarizes cross-role UAT progress", () => {
    const results: UatScriptResults = {
      "ceo-login": { status: "passed", actualResult: "ok" },
      "ceo-health": { status: "failed", actualResult: "warning card mismatch" },
      "media-login": { status: "blocked", actualResult: "account missing" }
    };

    const summary = summarizeUatResults(productionUatScripts, results);

    expect(summary.total).toBeGreaterThan(3);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.blocked).toBe(1);
    expect(summary.pending).toBe(summary.total - 3);
    expect(summary.completionRate).toBe(Math.round((3 / summary.total) * 100));
  });

  it("summarizes a single script and patches step results immutably", () => {
    const script = productionUatScripts.find((candidate) => candidate.id === "ceo-observability-signoff");
    expect(script).toBeDefined();

    const first = updateUatStepResult({}, "ceo-login", { status: "passed" }, "2026-07-02T00:00:00.000Z");
    const second = updateUatStepResult(first, "ceo-login", { actualResult: "Production login passed." }, "2026-07-02T00:01:00.000Z");

    expect(first).not.toBe(second);
    expect(second["ceo-login"]).toEqual({
      status: "passed",
      actualResult: "Production login passed.",
      updatedAt: "2026-07-02T00:01:00.000Z"
    });
    expect(summarizeScriptResults(script!, second)).toMatchObject({
      passed: 1,
      failed: 0,
      blocked: 0
    });
  });

  it("merges local and remote results by the newest updated timestamp", () => {
    const merged = mergeUatScriptResults(
      {
        "ceo-login": {
          status: "passed",
          actualResult: "local newer",
          updatedAt: "2026-07-02T02:00:00.000Z"
        },
        "ceo-health": {
          status: "blocked",
          actualResult: "local only",
          updatedAt: "2026-07-02T01:00:00.000Z"
        }
      },
      {
        "ceo-login": {
          status: "failed",
          actualResult: "remote older",
          updatedAt: "2026-07-02T01:30:00.000Z"
        },
        "ceo-audit": {
          status: "passed",
          actualResult: "remote only",
          updatedAt: "2026-07-02T01:45:00.000Z"
        }
      }
    );

    expect(merged["ceo-login"]).toMatchObject({ status: "passed", actualResult: "local newer" });
    expect(merged["ceo-health"]).toMatchObject({ status: "blocked", actualResult: "local only" });
    expect(merged["ceo-audit"]).toMatchObject({ status: "passed", actualResult: "remote only" });
  });
});
