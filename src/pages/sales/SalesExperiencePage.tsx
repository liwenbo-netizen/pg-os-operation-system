import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BadgeDollarSign, Plus, ShieldAlert } from "lucide-react";
import { GuidedEmptyState, MetricStrip, NextActionBar, OperatingPageHeader } from "../../components/OperatingPage";
import { StatusBadge } from "../../components/StatusBadge";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { salesWorkflowService } from "../../services/salesWorkflowService";
import { trustedSupplyNetworkService } from "../../services/trustedSupplyNetworkService";
import type { AuditEvent, BusinessUser, EntityId, MediaWorkflowState, SalesWorkflowState } from "../../types/domain";
import type { GuardResult } from "../../types/guards";
import {
  getCampaignPrimaryAction,
  getOpportunityPrimaryAction,
  getProposalPrimaryAction,
  getSalesStatusLabel,
  resolveCreateOpportunityAdvertiserId
} from "./salesExperiencePageModel";
import { getRoleDisplayName, getRouteDisplayTitle, getRoutePageType, useLocale } from "../../lib/i18n";
import { getPublisherStatusLabel } from "../media/publisherReadinessPageModel";
import { getBusinessGuardMessage } from "../businessGuardMessage";

type SalesExperiencePageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  state: SalesWorkflowState;
  mediaState: MediaWorkflowState;
  selectedObjectId?: EntityId;
  onStateChange: (state: SalesWorkflowState) => void;
  onAuditEvent: (event: AuditEvent) => void;
  onRouteChange: (path: string, objectId?: EntityId) => void;
};

type ActionMessage = {
  title: string;
  guard: GuardResult;
};

const guardTone = {
  pending: "neutral",
  allowed: "success",
  warning: "warning",
  blocked: "danger"
} as const;

const statusTone = {
  draft: "neutral",
  media_validation: "warning",
  internal_review: "warning",
  approved_to_send: "success",
  sent_to_client: "info",
  client_feedback: "warning",
  won: "success",
  lost: "danger",
  cancelled: "neutral",
  launch_check: "warning",
  pending_approval: "warning",
  approved: "success",
  live: "success",
  paused: "neutral",
  completed: "success",
  blocked: "danger"
} as const;

export function SalesExperiencePage({
  route,
  role,
  user,
  state,
  mediaState,
  selectedObjectId,
  onStateChange,
  onAuditEvent,
  onRouteChange
}: SalesExperiencePageProps) {
  const { locale, t } = useLocale();
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<EntityId>("opportunity-daily-yoga-q3");
  const [selectedProposalId, setSelectedProposalId] = useState<EntityId>("proposal-daily-yoga");
  const [selectedCampaignId, setSelectedCampaignId] = useState<EntityId>("campaign-ready");
  const [message, setMessage] = useState<ActionMessage | null>(null);

  const summary = salesWorkflowService.getSummary(state);
  const selectedOpportunity = state.opportunities.find((opportunity) => opportunity.id === selectedOpportunityId) ?? state.opportunities[0];
  const selectedProposal = state.proposals.find((proposal) => proposal.id === selectedProposalId) ?? state.proposals[0];
  const selectedCampaign = state.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? state.campaigns[0];

  useEffect(() => {
    if (!selectedObjectId) {
      return;
    }

    if (state.opportunities.some((item) => item.id === selectedObjectId)) {
      setSelectedOpportunityId(selectedObjectId);
    }
    if (state.proposals.some((item) => item.id === selectedObjectId)) {
      setSelectedProposalId(selectedObjectId);
    }
    if (state.campaigns.some((item) => item.id === selectedObjectId)) {
      setSelectedCampaignId(selectedObjectId);
    }
  }, [selectedObjectId, state.campaigns, state.opportunities, state.proposals]);

  const page = useMemo(() => {
    if (route.path === "/proposals/:id/wizard") {
      return "proposal";
    }

    if (route.path === "/campaigns/:id/wizard") {
      return "campaign";
    }

    return "sales";
  }, [route.path]);

  function runAction(title: string, action: () => ReturnType<typeof salesWorkflowService.createAdvertiser>) {
    const result = action();
    onStateChange(result.state);
    if (result.auditEvent) {
      onAuditEvent(result.auditEvent);
    }
    setMessage({ title, guard: result.guard });
  }

  function createAdvertiser() {
    runAction(t("sales.newAdvertiser"), () =>
      salesWorkflowService.createAdvertiser(state, user, {
        name: "Demo Fitness Brand",
        industry: "Wellness",
        region: "CN"
      })
    );
  }

  function createOpportunity() {
    runAction(t("sales.createOpportunity"), () => {
      const result = salesWorkflowService.createOpportunity(state, user, {
        advertiserId: resolveCreateOpportunityAdvertiserId(state) ?? "",
        name: "Daily Yoga Retention Push",
        expectedBudget: 16000,
        painPoints: ["Need quality App supply", "Avoid blocked readiness"]
      });
      const opportunityId = result.guard.allowed ? result.state.opportunities[0]?.id : undefined;
      if (opportunityId) setSelectedOpportunityId(opportunityId);
      return result;
    });
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <OperatingPageHeader
          title={getRouteDisplayTitle(route, locale)}
          description={t("sales.description")}
          pageType={getRoutePageType(route, locale)}
          role={getRoleDisplayName(role.code, locale)}
        />
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          type="button"
          onClick={createAdvertiser}
        >
          <Plus className="size-4" aria-hidden="true" />
          {t("sales.newAdvertiser")}
        </button>
      </div>

      <MetricStrip
        label={getRouteDisplayTitle(route, locale)}
        items={[
          { label: t("sales.advertisers"), value: String(summary.advertisers) },
          { label: t("sales.opportunities"), value: String(summary.opportunities) },
          { label: t("sales.proposals"), value: String(summary.proposalDrafts), tone: "warning" },
          { label: t("sales.blockedMedia"), value: String(summary.blockedMedia), tone: "danger" }
        ]}
      />

      {message ? <GuardNotice message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <SalesSelector
          opportunities={state.opportunities}
          proposals={state.proposals}
          campaigns={state.campaigns}
          selectedOpportunityId={selectedOpportunity?.id}
          selectedProposalId={selectedProposal?.id}
          selectedCampaignId={selectedCampaign?.id}
          onOpportunitySelect={setSelectedOpportunityId}
          onProposalSelect={setSelectedProposalId}
          onCampaignSelect={setSelectedCampaignId}
          onOpenProposal={() => onRouteChange("/proposals/:id/wizard", selectedProposal?.id)}
          onOpenCampaign={() => onRouteChange("/campaigns/:id/wizard", selectedCampaign?.id)}
        />

        {page === "sales" && selectedOpportunity ? (
          <SalesManagerWorkbench
            state={state}
            mediaState={mediaState}
            selectedOpportunityId={selectedOpportunity.id}
            onCreateOpportunity={createOpportunity}
            onCreateProposal={() =>
              runAction(t("sales.createProposal"), () => {
                const result = salesWorkflowService.createProposalFromOpportunity(state, user, selectedOpportunity.id);
                const proposalId = result.state.proposals[0]?.id;
                if (proposalId) {
                  setSelectedProposalId(proposalId);
                }
                return result;
              })
            }
            onOpenProposal={() => onRouteChange("/proposals/:id/wizard", selectedProposal?.id)}
            supplyMatchLabels={{
              title: t("sales.supplyMatches"),
              empty: t("sales.noSupplyMatches"),
              suggestedBudget: t("sales.suggestedBudget")
            }}
          />
        ) : null}

        {page === "sales" && !selectedOpportunity ? (
          <GuidedEmptyState
            title={state.advertisers.length ? t("sales.noOpportunity") : t("sales.unknownAdvertiser")}
            description={state.advertisers.length ? t("sales.createOpportunity") : t("sales.newAdvertiser")}
            ownerLabel={t("workbench.owner")}
            owner={getRoleDisplayName("sales_manager", locale)}
            actionLabel={state.advertisers.length ? t("sales.createOpportunity") : t("sales.newAdvertiser")}
            onAction={state.advertisers.length ? createOpportunity : createAdvertiser}
          />
        ) : null}

        {page === "proposal" && selectedProposal ? (
          <ProposalWizard
            state={state}
            mediaState={mediaState}
            proposalId={selectedProposal.id}
            onSelectPublisher={(publisherId, budget) =>
              runAction(t("sales.validateMedia"), () =>
                salesWorkflowService.selectPublisherForProposal(state, mediaState, user, selectedProposal.id, publisherId, budget)
              )
            }
            onApprove={() =>
              runAction(t("sales.approveProposal"), () =>
                salesWorkflowService.approveProposal(state, mediaState, user, selectedProposal.id)
              )
            }
            onCreateCampaign={() =>
              runAction(t("sales.createCampaign"), () => {
                const result = salesWorkflowService.createCampaignFromProposal(state, user, selectedProposal.id);
                const campaignId = result.state.campaigns[0]?.id;
                if (campaignId) {
                  setSelectedCampaignId(campaignId);
                }
                return result;
              })
            }
            onOpenCampaign={() => onRouteChange("/campaigns/:id/wizard", selectedCampaign?.id)}
          />
        ) : null}

        {page === "campaign" && selectedCampaign ? (
          <CampaignWizard
            state={state}
            mediaState={mediaState}
            campaignId={selectedCampaign.id}
            onAllocate={(publisherId, budget) =>
              runAction(t("sales.runLaunchGuard"), () =>
                salesWorkflowService.addPublisherToCampaign(state, mediaState, user, selectedCampaign.id, publisherId, budget)
              )
            }
            onChecklist={() =>
              runAction(t("sales.completeChecklist"), () =>
                salesWorkflowService.markLaunchChecklistPassed(state, user, selectedCampaign.id)
              )
            }
            onApprove={() =>
              runAction(t("sales.approveLaunch"), () =>
                salesWorkflowService.approveCampaignLaunch(state, mediaState, user, selectedCampaign.id)
              )
            }
          />
        ) : null}
      </div>
    </section>
  );
}

function GuardNotice({ message }: { message: ActionMessage }) {
  const { locale, t } = useLocale();
  const tone = message.guard.allowed ? (message.guard.severity === "warning" ? "warning" : "success") : "danger";

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-5 text-blue-600" aria-hidden="true" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{message.title}</p>
            <StatusBadge tone={tone}>{message.guard.reason_code}</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600">{getBusinessGuardMessage(message.guard.reason_code, message.guard.message, locale)}</p>
          {message.guard.required_approval_role ? (
            <p className="mt-1 text-sm text-slate-500">{t("workbench.owner")}: {getRoleDisplayName(message.guard.required_approval_role as BusinessUser["activeRole"], locale)}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SalesSelector({
  opportunities,
  proposals,
  campaigns,
  selectedOpportunityId,
  selectedProposalId,
  selectedCampaignId,
  onOpportunitySelect,
  onProposalSelect,
  onCampaignSelect,
  onOpenProposal,
  onOpenCampaign
}: {
  opportunities: SalesWorkflowState["opportunities"];
  proposals: SalesWorkflowState["proposals"];
  campaigns: SalesWorkflowState["campaigns"];
  selectedOpportunityId?: EntityId;
  selectedProposalId?: EntityId;
  selectedCampaignId?: EntityId;
  onOpportunitySelect: (id: EntityId) => void;
  onProposalSelect: (id: EntityId) => void;
  onCampaignSelect: (id: EntityId) => void;
  onOpenProposal: () => void;
  onOpenCampaign: () => void;
}) {
  const { locale, t } = useLocale();
  return (
    <aside className="space-y-3">
      <SelectorPanel title={t("sales.opportunityQueue")}>
        {opportunities.map((opportunity) => (
          <button
            key={opportunity.id}
            className={`w-full rounded-lg border p-3 text-left text-sm ${
              selectedOpportunityId === opportunity.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
            }`}
            type="button"
            onClick={() => onOpportunitySelect(opportunity.id)}
          >
            <p className="font-semibold text-slate-900">{opportunity.name}</p>
            <p className="mt-1 text-xs text-slate-500">${opportunity.expected_budget.toLocaleString()} / {getSalesStatusLabel(opportunity.stage, locale)}</p>
          </button>
        ))}
      </SelectorPanel>
      <SelectorPanel title={t("sales.proposalQueue")}>
        {proposals.map((proposal) => (
          <button
            key={proposal.id}
            className={`w-full rounded-lg border p-3 text-left text-sm ${
              selectedProposalId === proposal.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
            }`}
            type="button"
            onClick={() => onProposalSelect(proposal.id)}
          >
            <p className="font-semibold text-slate-900">{proposal.name}</p>
            <p className="mt-1 text-xs text-slate-500">{getSalesStatusLabel(proposal.status, locale)}</p>
          </button>
        ))}
        <button className="mt-2 h-9 w-full rounded-lg border border-slate-200 text-sm font-semibold text-slate-700" type="button" onClick={onOpenProposal}>
          {t("sales.openProposal")}
        </button>
      </SelectorPanel>
      <SelectorPanel title={t("sales.campaignQueue")}>
        {campaigns.map((campaign) => (
          <button
            key={campaign.id}
            className={`w-full rounded-lg border p-3 text-left text-sm ${
              selectedCampaignId === campaign.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
            }`}
            type="button"
            onClick={() => onCampaignSelect(campaign.id)}
          >
            <p className="font-semibold text-slate-900">{campaign.name}</p>
            <p className="mt-1 text-xs text-slate-500">{getSalesStatusLabel(campaign.status, locale)}</p>
          </button>
        ))}
        <button className="mt-2 h-9 w-full rounded-lg border border-slate-200 text-sm font-semibold text-slate-700" type="button" onClick={onOpenCampaign}>
          {t("sales.openCampaign")}
        </button>
      </SelectorPanel>
    </aside>
  );
}

function SalesManagerWorkbench({
  state,
  mediaState,
  selectedOpportunityId,
  onCreateOpportunity,
  onCreateProposal,
  onOpenProposal,
  supplyMatchLabels
}: {
  state: SalesWorkflowState;
  mediaState: MediaWorkflowState;
  selectedOpportunityId: EntityId;
  onCreateOpportunity: () => void;
  onCreateProposal: () => void;
  onOpenProposal: () => void;
  supplyMatchLabels: { title: string; empty: string; suggestedBudget: string };
}) {
  const { locale, t } = useLocale();
  const opportunity = state.opportunities.find((candidate) => candidate.id === selectedOpportunityId);
  const advertiser = state.advertisers.find((candidate) => candidate.id === opportunity?.advertiser_id);
  const primaryAction = opportunity ? getOpportunityPrimaryAction(opportunity, state.proposals) : undefined;
  const primaryActionLabel = primaryAction === "createProposal" ? t("sales.createProposal") : t("sales.continueProposal");
  const recommendations = trustedSupplyNetworkService
    .getMatchRecommendations(mediaState, state, advertiser?.id)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <NextActionBar
        heading={t("sales.opportunityDecision")}
        status={t("common.inProgress")}
        statusTone="info"
        nextActionLabel={t("workbench.nextAction")}
        nextAction={primaryActionLabel}
        ownerLabel={t("workbench.owner")}
        owner={getRoleDisplayName("sales_manager", locale)}
        blockerLabel={t("workbench.blocker")}
        dueDateLabel={t("finance.dueDate")}
        dueDate={t("common.noDueDate")}
        actionLabel={primaryActionLabel}
        onAction={primaryAction === "createProposal" ? onCreateProposal : onOpenProposal}
      />

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xl font-semibold text-slate-950">{opportunity?.name ?? t("sales.noOpportunity")}</p>
            <p className="mt-1 text-sm text-slate-500">{advertiser?.name ?? t("sales.unknownAdvertiser")}</p>
          </div>
          <BadgeDollarSign className="size-6 text-blue-600" aria-hidden="true" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label={t("sales.expectedBudget")} value={`$${(opportunity?.expected_budget ?? 0).toLocaleString()}`} />
          <Metric label={t("sales.stage")} value={opportunity ? getSalesStatusLabel(opportunity.stage, locale) : "-"} />
          <Metric label={t("sales.painPoints")} value={String(opportunity?.pain_points.length ?? 0)} />
        </div>
        <details className="mt-5 border-t border-slate-200 pt-4">
          <summary className="cursor-pointer text-sm font-semibold text-slate-700">{t("sales.additionalControls")}</summary>
          <button className="mt-3 h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700" type="button" onClick={onCreateOpportunity}>
            {t("sales.createOpportunity")}
          </button>
        </details>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-950">{supplyMatchLabels.title}</h2>
          <StatusBadge tone={recommendations.length ? "success" : "neutral"}>{String(recommendations.length)}</StatusBadge>
        </div>
        <div className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
          {recommendations.map((recommendation) => {
            const publisher = mediaState.publishers.find((item) => item.id === recommendation.publisher_id);
            const packageRecord = mediaState.mediaSupplyPackages.find((item) => item.id === recommendation.package_id);
            return (
              <div key={`${recommendation.advertiser_id}-${recommendation.package_id}`} className="grid gap-3 py-4 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{publisher?.name ?? packageRecord?.package_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{packageRecord?.ad_formats.join(", ")} · {packageRecord?.geo}</p>
                  <p className="mt-2 text-sm leading-5 text-slate-600">{recommendation.recommendation_reasons.slice(0, 2).join(" ")}</p>
                  {recommendation.risk_warnings.length ? <p className="mt-2 text-xs text-amber-700">{recommendation.risk_warnings.join(" ")}</p> : null}
                </div>
                <div className="text-left md:text-right">
                  <p className="text-lg font-semibold text-slate-950">{recommendation.match_score}</p>
                  <p className="mt-1 text-xs text-slate-500">{supplyMatchLabels.suggestedBudget} {(recommendation.suggested_budget_ratio * 100).toFixed(0)}%</p>
                </div>
              </div>
            );
          })}
          {recommendations.length === 0 ? <p className="py-4 text-sm text-slate-500">{supplyMatchLabels.empty}</p> : null}
        </div>
      </article>
    </div>
  );
}

function ProposalWizard({
  state,
  mediaState,
  proposalId,
  onSelectPublisher,
  onApprove,
  onCreateCampaign,
  onOpenCampaign
}: {
  state: SalesWorkflowState;
  mediaState: MediaWorkflowState;
  proposalId: EntityId;
  onSelectPublisher: (publisherId: EntityId, budget: number) => void;
  onApprove: () => void;
  onCreateCampaign: () => void;
  onOpenCampaign: () => void;
}) {
  const { locale, t } = useLocale();
  const proposal = state.proposals.find((candidate) => candidate.id === proposalId);
  const selections = state.proposalMediaSelections.filter((selection) => selection.proposal_id === proposalId);
  const primaryAction = proposal ? getProposalPrimaryAction(proposal, selections, state.campaigns) : undefined;
  const primaryActionLabels = {
    selectMedia: t("sales.selectMedia"),
    approveProposal: t("sales.approveProposal"),
    createCampaign: t("sales.createCampaign"),
    openCampaign: t("sales.continueCampaign")
  };
  const primaryActionLabel = primaryAction ? primaryActionLabels[primaryAction] : t("sales.noAction");
  const primaryActionHandler =
    primaryAction === "approveProposal"
      ? onApprove
      : primaryAction === "createCampaign"
        ? onCreateCampaign
        : primaryAction === "openCampaign"
          ? onOpenCampaign
          : undefined;

  return (
    <div className="space-y-4">
      <NextActionBar
        heading={t("sales.proposalDecision")}
        status={proposal ? getSalesStatusLabel(proposal.status, locale) : t("common.pending")}
        statusTone={proposal?.status === "approved_to_send" || proposal?.status === "won" ? "success" : "info"}
        nextActionLabel={t("workbench.nextAction")}
        nextAction={primaryActionLabel}
        ownerLabel={t("workbench.owner")}
        owner={getRoleDisplayName("sales_manager", locale)}
        blockerLabel={t("workbench.blocker")}
        dueDateLabel={t("finance.dueDate")}
        dueDate={t("common.noDueDate")}
        actionLabel={primaryActionHandler ? primaryActionLabel : undefined}
        onAction={primaryActionHandler}
      />

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-semibold text-slate-950">{proposal?.name ?? "Proposal"}</p>
            <p className="mt-1 text-sm text-slate-500">{t("sales.budget")} ${(proposal?.budget ?? 0).toLocaleString()}</p>
          </div>
          <StatusBadge tone={statusTone[proposal?.status ?? "draft"]}>{getSalesStatusLabel(proposal?.status ?? "draft", locale)}</StatusBadge>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {mediaState.publishers.map((publisher) => (
            <div key={publisher.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{publisher.name}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {getPublisherStatusLabel(publisher.technical_live_status, locale)} / {getPublisherStatusLabel(publisher.commercial_test_status, locale)} / {getPublisherStatusLabel(publisher.sales_scale_status, locale)}
              </p>
              <button className="mt-3 h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white" type="button" onClick={() => onSelectPublisher(publisher.id, 6000)}>
                {t("sales.validateMedia")}
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-base font-semibold text-slate-950">{t("sales.mediaValidationSummary")}</p>
        <div className="mt-4 space-y-2">
          {selections.map((selection) => {
            const publisher = mediaState.publishers.find((candidate) => candidate.id === selection.publisher_id);
            return (
              <div key={selection.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{publisher?.name ?? selection.publisher_id}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={guardTone[selection.guard_status]}>{selection.guard_reason ?? getSalesStatusLabel(selection.guard_status, locale)}</StatusBadge>
                  <span className="text-slate-500">${selection.planned_budget.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
          {selections.length === 0 ? <p className="text-sm text-slate-500">{t("sales.noMediaValidated")}</p> : null}
        </div>
      </article>
    </div>
  );
}

function CampaignWizard({
  state,
  mediaState,
  campaignId,
  onAllocate,
  onChecklist,
  onApprove
}: {
  state: SalesWorkflowState;
  mediaState: MediaWorkflowState;
  campaignId: EntityId;
  onAllocate: (publisherId: EntityId, budget: number) => void;
  onChecklist: () => void;
  onApprove: () => void;
}) {
  const { locale, t } = useLocale();
  const campaign = state.campaigns.find((candidate) => candidate.id === campaignId);
  const allocations = state.campaignMediaAllocations.filter((allocation) => allocation.campaign_id === campaignId);
  const primaryAction = campaign ? getCampaignPrimaryAction(campaign, allocations.length) : undefined;
  const primaryActionLabels = {
    allocateMedia: t("sales.allocateMedia"),
    completeChecklist: t("sales.completeChecklist"),
    approveLaunch: t("sales.approveLaunch")
  };
  const primaryActionLabel = primaryAction ? primaryActionLabels[primaryAction] : t("sales.noAction");
  const primaryActionHandler = primaryAction === "completeChecklist" ? onChecklist : primaryAction === "approveLaunch" ? onApprove : undefined;

  return (
    <div className="space-y-4">
      <NextActionBar
        heading={t("sales.campaignDecision")}
        status={campaign ? getSalesStatusLabel(campaign.status, locale) : t("common.pending")}
        statusTone={campaign?.status === "live" || campaign?.status === "completed" ? "success" : campaign?.status === "blocked" ? "danger" : "info"}
        nextActionLabel={t("workbench.nextAction")}
        nextAction={primaryActionLabel}
        ownerLabel={t("workbench.owner")}
        owner={getRoleDisplayName("sales_manager", locale)}
        blockerLabel={t("workbench.blocker")}
        dueDateLabel={t("finance.dueDate")}
        dueDate={t("common.noDueDate")}
        actionLabel={primaryActionHandler ? primaryActionLabel : undefined}
        onAction={primaryActionHandler}
      />

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-semibold text-slate-950">{campaign?.name ?? "Campaign"}</p>
            <p className="mt-1 text-sm text-slate-500">{t("sales.launchChecklist")}: {campaign?.launchChecklistPassed ? t("sales.passed") : t("sales.open")}</p>
          </div>
          <StatusBadge tone={statusTone[campaign?.status ?? "draft"]}>{getSalesStatusLabel(campaign?.status ?? "draft", locale)}</StatusBadge>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {mediaState.publishers.map((publisher) => (
            <div key={publisher.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{publisher.name}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {getPublisherStatusLabel(publisher.commercial_test_status, locale)} / {getPublisherStatusLabel(publisher.sales_scale_status, locale)}
              </p>
              <button className="mt-3 h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white" type="button" onClick={() => onAllocate(publisher.id, 8000)}>
                {t("sales.runLaunchGuard")}
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-base font-semibold text-slate-950">{t("sales.launchAllocations")}</p>
        <div className="mt-4 space-y-2">
          {allocations.map((allocation) => {
            const publisher = mediaState.publishers.find((candidate) => candidate.id === allocation.publisher_id);
            return (
              <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{publisher?.name ?? allocation.publisher_id}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={guardTone[allocation.guard_status]}>{allocation.guard_reason ?? getSalesStatusLabel(allocation.guard_status, locale)}</StatusBadge>
                  <span className="text-slate-500">${allocation.allocation_budget.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
          {allocations.length === 0 ? <p className="text-sm text-slate-500">{t("sales.noLaunchResult")}</p> : null}
        </div>
      </article>
    </div>
  );
}

function SelectorPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
      <p className="mb-3 text-sm font-semibold text-slate-900">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}
