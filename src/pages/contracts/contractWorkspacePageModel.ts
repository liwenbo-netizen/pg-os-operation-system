import type { AppLocale } from "../../lib/i18n";
import type { BusinessContract } from "../../types/domain";

export type ContractPrimaryAction =
  | "startLegalReview"
  | "requestFinanceReview"
  | "approveFinanceTerms"
  | "approveLegalReview"
  | "markSigned"
  | "archive";
export type ContractStepKey = "intake" | "finance" | "legal" | "signing" | "archive";
export type ContractStepState = "complete" | "active" | "blocked" | "pending";

export function getContractPrimaryAction(contract: BusinessContract): ContractPrimaryAction | undefined {
  if (contract.status === "requested") return "startLegalReview";
  if (contract.status === "finance_review") return "approveFinanceTerms";
  if (contract.status === "redline") return "requestFinanceReview";
  if (contract.status === "legal_review") return contract.finance_notes ? "approveLegalReview" : "requestFinanceReview";
  if (["approved", "signing"].includes(contract.status)) return "markSigned";
  if (contract.status === "signed") return "archive";
  return undefined;
}

export function getContractOwner(contract: BusinessContract) {
  return contract.status === "finance_review" ? "finance_manager" : "legal_manager";
}

export function getContractSteps(contract: BusinessContract, hasSettlementDispute: boolean) {
  const intakeComplete = contract.status !== "requested" && contract.status !== "draft";
  const financeComplete = Boolean(contract.finance_notes) || ["approved", "signing", "signed", "archived"].includes(contract.status);
  const legalComplete = ["approved", "signing", "signed", "archived"].includes(contract.status);
  const signingComplete = ["signed", "archived"].includes(contract.status);
  const archived = contract.status === "archived";

  return [
    { key: "intake" as const, state: (intakeComplete ? "complete" : "active") as ContractStepState },
    {
      key: "finance" as const,
      state: (financeComplete ? "complete" : contract.status === "finance_review" ? "active" : "pending") as ContractStepState
    },
    {
      key: "legal" as const,
      state: (legalComplete ? "complete" : contract.status === "redline" || Boolean(contract.blocker) ? "blocked" : intakeComplete ? "active" : "pending") as ContractStepState
    },
    {
      key: "signing" as const,
      state: (signingComplete ? "complete" : hasSettlementDispute ? "blocked" : legalComplete ? "active" : "pending") as ContractStepState
    },
    { key: "archive" as const, state: (archived ? "complete" : signingComplete ? "active" : "pending") as ContractStepState }
  ];
}

export function getContractStatusLabel(status: string, locale: AppLocale) {
  const labels: Record<string, Record<AppLocale, string>> = {
    draft: { "en-US": "Draft", "zh-CN": "草稿" },
    requested: { "en-US": "Requested", "zh-CN": "已发起" },
    legal_review: { "en-US": "Legal review", "zh-CN": "法务审核" },
    finance_review: { "en-US": "Finance review", "zh-CN": "财务审核" },
    redline: { "en-US": "Redline", "zh-CN": "条款修订" },
    approved: { "en-US": "Approved", "zh-CN": "已批准" },
    signing: { "en-US": "Signing", "zh-CN": "签署中" },
    signed: { "en-US": "Signed", "zh-CN": "已签署" },
    archived: { "en-US": "Archived", "zh-CN": "已归档" },
    rejected: { "en-US": "Rejected", "zh-CN": "已拒绝" },
    cancelled: { "en-US": "Cancelled", "zh-CN": "已取消" }
  };
  return labels[status]?.[locale] ?? status;
}
