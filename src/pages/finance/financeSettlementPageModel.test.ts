import { describe, expect, it } from "vitest";
import { createInitialFinanceWorkflowState } from "../../services/financeSettlementService";
import { getFinancePrimaryAction, getFinanceStatusLabel, getFinanceSteps } from "./financeSettlementPageModel";

describe("financeSettlementPageModel", () => {
  const settlement = createInitialFinanceWorkflowState().settlements[0];

  it("orders reconciliation, confirmation, invoice, and payment actions", () => {
    expect(getFinancePrimaryAction({ ...settlement, status: "draft", reconciliationCompleted: false })).toBe("reconcile");
    expect(getFinancePrimaryAction({ ...settlement, status: "pending_review", reconciliationCompleted: true })).toBe("confirm");
    expect(getFinancePrimaryAction({ ...settlement, status: "confirmed", reconciliationCompleted: true })).toBe("issueInvoice");
    expect(getFinancePrimaryAction({ ...settlement, status: "invoiced", reconciliationCompleted: true })).toBe("markPaid");
    expect(getFinancePrimaryAction({ ...settlement, status: "paid", reconciliationCompleted: true })).toBeUndefined();
  });

  it("marks confirmation blocked when an active diagnostic exists", () => {
    const steps = getFinanceSteps({ ...settlement, status: "pending_review", reconciliationCompleted: true }, true);
    expect(steps.find((step) => step.key === "reconciliation")?.state).toBe("complete");
    expect(steps.find((step) => step.key === "confirmation")?.state).toBe("blocked");
  });

  it("localizes settlement status without changing the stored value", () => {
    expect(getFinanceStatusLabel("exception_review", "zh-CN")).toBe("异常复核");
    expect(getFinanceStatusLabel("exception_review", "en-US")).toBe("Exception review");
  });
});
