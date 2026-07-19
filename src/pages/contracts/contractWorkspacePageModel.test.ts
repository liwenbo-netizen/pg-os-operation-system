import { describe, expect, it } from "vitest";
import { createInitialContractWorkflowState } from "../../services/contractService";
import { getContractOwner, getContractPrimaryAction, getContractStatusLabel, getContractSteps } from "./contractWorkspacePageModel";

describe("contractWorkspacePageModel", () => {
  const contract = createInitialContractWorkflowState().contracts[0];

  it("routes the contract through legal, finance, signing, and archive", () => {
    expect(getContractPrimaryAction({ ...contract, status: "requested" })).toBe("startLegalReview");
    expect(getContractPrimaryAction({ ...contract, status: "finance_review" })).toBe("approveFinanceTerms");
    expect(getContractPrimaryAction({ ...contract, status: "legal_review", finance_notes: "approved" })).toBe("approveLegalReview");
    expect(getContractPrimaryAction({ ...contract, status: "approved" })).toBe("markSigned");
    expect(getContractPrimaryAction({ ...contract, status: "signed" })).toBe("archive");
  });

  it("assigns finance review to Finance and blocks signing for a linked dispute", () => {
    const financeContract = { ...contract, status: "finance_review" as const };
    expect(getContractOwner(financeContract)).toBe("finance_manager");
    expect(getContractSteps({ ...contract, status: "approved" }, true).find((step) => step.key === "signing")?.state).toBe("blocked");
  });

  it("localizes contract status without changing the stored value", () => {
    expect(getContractStatusLabel("finance_review", "zh-CN")).toBe("财务审核");
    expect(getContractStatusLabel("finance_review", "en-US")).toBe("Finance review");
  });
});
