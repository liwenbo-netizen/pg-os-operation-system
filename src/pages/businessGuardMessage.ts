import type { AppLocale } from "../lib/i18n";

const chineseGuardMessages: Record<string, string> = {
  NOT_FOUND: "未找到对应的业务记录。",
  FORBIDDEN: "当前角色无权执行该操作。",
  ADVERTISER_CREATED: "广告主已创建。",
  OPPORTUNITY_CREATED: "商机已创建。",
  PROPOSAL_CREATED: "已根据商机创建提案。",
  PROPOSAL_PUBLISHER_ALLOWED: "该媒体可用于当前提案。",
  PROPOSAL_APPROVAL_ALLOWED: "提案已通过审批校验。",
  CAMPAIGN_CREATED: "已根据提案创建 Campaign。",
  CAMPAIGN_LAUNCH_ALLOWED: "该媒体已通过 Campaign 上线检查。",
  LAUNCH_CHECKLIST_PASSED: "Campaign 上线检查清单已完成。",
  CAMPAIGN_APPROVAL_ALLOWED: "Campaign 上线已通过审批校验。",
  SETTLEMENT_RECONCILED: "结算对账已完成。",
  SETTLEMENT_CONFIRM_ALLOWED: "结算已通过确认校验。",
  SETTLEMENT_INVOICED: "结算发票已开具。",
  SETTLEMENT_PAID: "结算已标记为付款完成。",
  SETTLEMENT_DISPUTE_UNRESOLVED: "仍有关联诊断争议未解决，暂不能确认结算。",
  RECONCILIATION_INCOMPLETE: "对账尚未完成，暂不能确认结算。",
  CONTRACT_LEGAL_REVIEW_STARTED: "法务审核已开始。",
  CONTRACT_FINANCE_REVIEW_REQUESTED: "已发起合同财务审核。",
  CONTRACT_FINANCE_TERMS_APPROVED: "合同财务条款已批准。",
  CONTRACT_LEGAL_REVIEW_APPROVED: "合同法务审核已批准。",
  CONTRACT_REDLINE_SENT: "合同条款修订已发送。",
  CONTRACT_SIGNED: "合同已标记为签署完成。",
  CONTRACT_ARCHIVED: "已签署合同已归档。",
  CONTRACT_SETTLEMENT_DISPUTE_OPEN: "合同关联的结算争议尚未解决，暂不能签署。"
};

export function getBusinessGuardMessage(reasonCode: string, fallback: string, locale: AppLocale) {
  return locale === "zh-CN" ? chineseGuardMessages[reasonCode] ?? fallback : fallback;
}
