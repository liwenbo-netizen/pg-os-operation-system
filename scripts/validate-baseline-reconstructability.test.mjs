import { describe, expect, it } from "vitest";
import { evaluateReconstructability } from "./validate-baseline-reconstructability.mjs";

const successfulLog = (index) => ({
  overall: "SUCCESS",
  batches: [{ file: "10_public_schema.sql", index, status: "success", error: null }],
  staging_source_write: false
});

const cleanDiff = {
  matched_tables: 178,
  missing_tables: [],
  extra_tables: [],
  column_differences: [],
  constraint_differences: [],
  index_differences: [],
  rls_differences: [],
  policy_differences: [],
  trigger_differences: [],
  function_differences: [],
  view_differences: [],
  excluded_differences: [],
  unexplained_differences: []
};

describe("evaluateReconstructability", () => {
  it("marks PROVEN only with two successful rebuilds and a clean diff", () => {
    const result = evaluateReconstructability({
      rebuildLogs: [successfulLog(0), successfulLog(1)],
      diff: cleanDiff
    });
    expect(result.status).toBe("PROVEN");
    expect(result.reasons).toEqual([]);
  });

  it("marks NOT_PROVEN with a single rebuild", () => {
    const result = evaluateReconstructability({
      rebuildLogs: [successfulLog(0)],
      diff: cleanDiff
    });
    expect(result.status).toBe("NOT_PROVEN");
    expect(result.reasons.some((reason) => reason.includes("At least two rebuilds"))).toBe(true);
  });

  it("marks FAILED when a rebuild batch failed", () => {
    const failedLog = {
      overall: "FAILED",
      batches: [{ file: "10_public_schema.sql", index: 0, status: "failed", error: "syntax error" }]
    };
    const result = evaluateReconstructability({
      rebuildLogs: [failedLog, successfulLog(1)],
      diff: cleanDiff
    });
    expect(result.status).toBe("FAILED");
  });

  it("marks NOT_PROVEN when the diff has unexplained differences", () => {
    const result = evaluateReconstructability({
      rebuildLogs: [successfulLog(0), successfulLog(1)],
      diff: { ...cleanDiff, unexplained_differences: ["missing table public.unknown"] }
    });
    expect(result.status).toBe("NOT_PROVEN");
  });

  it("rejects a SUCCESS log that contains failed batches", () => {
    const badLog = {
      overall: "SUCCESS",
      batches: [{ file: "x.sql", index: 0, status: "failed", error: "boom" }]
    };
    const result = evaluateReconstructability({
      rebuildLogs: [badLog, successfulLog(1)],
      diff: cleanDiff
    });
    expect(result.status).toBe("FAILED");
  });
});
