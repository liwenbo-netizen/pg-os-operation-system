import type { AppLocale } from "../../lib/i18n";
import type { Settlement } from "../../types/domain";

export type FinancePrimaryAction = "reconcile" | "confirm" | "issueInvoice" | "markPaid";
export type FinanceStepKey = "reconciliation" | "confirmation" | "invoice" | "payment";
export type FinanceStepState = "complete" | "active" | "blocked" | "pending";

export function getFinancePrimaryAction(settlement: Settlement): FinancePrimaryAction | undefined {
  if (["paid", "cancelled", "blocked"].includes(settlement.status)) return undefined;
  if (!settlement.reconciliationCompleted) return "reconcile";
  if (["draft", "reconciling", "pending_review", "exception_review"].includes(settlement.status)) return "confirm";
  if (settlement.status === "confirmed") return "issueInvoice";
  if (settlement.status === "invoiced") return "markPaid";
  return undefined;
}

export function getFinanceSteps(settlement: Settlement, hasBlockingDiagnostic: boolean) {
  const confirmed = ["confirmed", "invoiced", "paid"].includes(settlement.status);
  const invoiced = ["invoiced", "paid"].includes(settlement.status) || Boolean(settlement.invoice_issued_at);
  const paid = settlement.status === "paid" || Boolean(settlement.paid_at);

  return [
    {
      key: "reconciliation" as const,
      state: (settlement.reconciliationCompleted ? "complete" : settlement.status === "blocked" ? "blocked" : "active") as FinanceStepState
    },
    {
      key: "confirmation" as const,
      state: (confirmed
        ? "complete"
        : hasBlockingDiagnostic || settlement.status === "exception_review" || settlement.status === "blocked"
          ? "blocked"
          : settlement.reconciliationCompleted
            ? "active"
            : "pending") as FinanceStepState
    },
    {
      key: "invoice" as const,
      state: (invoiced ? "complete" : confirmed ? "active" : "pending") as FinanceStepState
    },
    {
      key: "payment" as const,
      state: (paid ? "complete" : invoiced ? "active" : "pending") as FinanceStepState
    }
  ];
}

export function getFinanceStatusLabel(status: string, locale: AppLocale) {
  const labels: Record<string, Record<AppLocale, string>> = {
    draft: { "en-US": "Draft", "zh-CN": "草稿" },
    reconciling: { "en-US": "Reconciling", "zh-CN": "对账中" },
    pending_review: { "en-US": "Pending review", "zh-CN": "待复核" },
    exception_review: { "en-US": "Exception review", "zh-CN": "异常复核" },
    confirmed: { "en-US": "Confirmed", "zh-CN": "已确认" },
    invoiced: { "en-US": "Invoiced", "zh-CN": "已开票" },
    paid: { "en-US": "Paid", "zh-CN": "已付款" },
    blocked: { "en-US": "Blocked", "zh-CN": "已阻塞" },
    cancelled: { "en-US": "Cancelled", "zh-CN": "已取消" }
  };
  return labels[status]?.[locale] ?? status;
}
