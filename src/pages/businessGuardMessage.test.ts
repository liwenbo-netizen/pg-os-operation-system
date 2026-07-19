import { describe, expect, it } from "vitest";
import { getBusinessGuardMessage } from "./businessGuardMessage";

describe("getBusinessGuardMessage", () => {
  it("localizes known presentation messages and preserves unknown fallbacks", () => {
    expect(getBusinessGuardMessage("SETTLEMENT_RECONCILED", "Settlement reconciliation completed.", "zh-CN")).toBe("结算对账已完成。");
    expect(getBusinessGuardMessage("UNKNOWN", "Original message", "zh-CN")).toBe("Original message");
    expect(getBusinessGuardMessage("SETTLEMENT_RECONCILED", "Settlement reconciliation completed.", "en-US")).toBe("Settlement reconciliation completed.");
  });
});
