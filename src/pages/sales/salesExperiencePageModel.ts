import type { AppLocale } from "../../lib/i18n";
import type { Campaign, EntityId, Opportunity, Proposal, ProposalMediaSelection, SalesWorkflowState } from "../../types/domain";

export type OpportunityPrimaryAction = "createProposal" | "openProposal";
export type ProposalPrimaryAction = "selectMedia" | "approveProposal" | "createCampaign" | "openCampaign";
export type CampaignPrimaryAction = "allocateMedia" | "completeChecklist" | "approveLaunch";

export function resolveCreateOpportunityAdvertiserId(state: SalesWorkflowState): EntityId | undefined {
  return state.advertisers[0]?.id;
}

export function getOpportunityPrimaryAction(opportunity: Opportunity, proposals: Proposal[]): OpportunityPrimaryAction {
  return proposals.some((proposal) => proposal.opportunity_id === opportunity.id) ? "openProposal" : "createProposal";
}

export function getProposalPrimaryAction(
  proposal: Proposal,
  selections: ProposalMediaSelection[],
  campaigns: Campaign[]
): ProposalPrimaryAction | undefined {
  const proposalSelections = selections.filter((selection) => selection.proposal_id === proposal.id);
  const campaignExists = campaigns.some((campaign) => campaign.proposal_id === proposal.id);
  if (proposalSelections.length === 0) return "selectMedia";
  if (!["approved_to_send", "sent_to_client", "client_feedback", "won"].includes(proposal.status)) return "approveProposal";
  if (!campaignExists) return "createCampaign";
  return "openCampaign";
}

export function getCampaignPrimaryAction(campaign: Campaign, allocationCount: number): CampaignPrimaryAction | undefined {
  if (["live", "completed", "cancelled"].includes(campaign.status)) return undefined;
  if (allocationCount === 0) return "allocateMedia";
  if (!campaign.launchChecklistPassed) return "completeChecklist";
  return "approveLaunch";
}

export function getSalesStatusLabel(status: string, locale: AppLocale) {
  const labels: Record<string, Record<AppLocale, string>> = {
    discovery: { "en-US": "Discovery", "zh-CN": "需求发现" },
    need_confirmed: { "en-US": "Need confirmed", "zh-CN": "需求已确认" },
    proposal_drafting: { "en-US": "Proposal drafting", "zh-CN": "提案编制中" },
    proposal_review: { "en-US": "Proposal review", "zh-CN": "提案审核" },
    draft: { "en-US": "Draft", "zh-CN": "草稿" },
    media_validation: { "en-US": "Media validation", "zh-CN": "媒体验证" },
    internal_review: { "en-US": "Internal review", "zh-CN": "内部审核" },
    approved_to_send: { "en-US": "Approved to send", "zh-CN": "已批准发送" },
    sent_to_client: { "en-US": "Sent to client", "zh-CN": "已发送客户" },
    client_feedback: { "en-US": "Client feedback", "zh-CN": "客户反馈" },
    won: { "en-US": "Won", "zh-CN": "已赢单" },
    lost: { "en-US": "Lost", "zh-CN": "已丢单" },
    cancelled: { "en-US": "Cancelled", "zh-CN": "已取消" },
    launch_check: { "en-US": "Launch check", "zh-CN": "上线检查" },
    pending_approval: { "en-US": "Pending approval", "zh-CN": "待批准" },
    approved: { "en-US": "Approved", "zh-CN": "已批准" },
    live: { "en-US": "Live", "zh-CN": "投放中" },
    paused: { "en-US": "Paused", "zh-CN": "已暂停" },
    completed: { "en-US": "Completed", "zh-CN": "已完成" },
    blocked: { "en-US": "Blocked", "zh-CN": "已阻塞" },
    pending: { "en-US": "Pending", "zh-CN": "待验证" },
    allowed: { "en-US": "Allowed", "zh-CN": "允许" },
    warning: { "en-US": "Warning", "zh-CN": "需关注" }
  };
  return labels[status]?.[locale] ?? status;
}
