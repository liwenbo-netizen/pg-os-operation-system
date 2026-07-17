import { useMemo, useState, type ReactNode } from "react";
import { BadgeDollarSign, CheckCircle2, Plus, Send, ShieldAlert } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { SummaryCard } from "../../components/SummaryCard";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { salesWorkflowService } from "../../services/salesWorkflowService";
import { trustedSupplyNetworkService } from "../../services/trustedSupplyNetworkService";
import type { AuditEvent, BusinessUser, EntityId, MediaWorkflowState, SalesWorkflowState } from "../../types/domain";
import type { GuardResult } from "../../types/guards";
import { resolveCreateOpportunityAdvertiserId } from "./salesExperiencePageModel";
import { getRoleDisplayName, getRouteDisplayTitle, getRoutePageType, useLocale } from "../../lib/i18n";

type SalesExperiencePageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  state: SalesWorkflowState;
  mediaState: MediaWorkflowState;
  onStateChange: (state: SalesWorkflowState) => void;
  onAuditEvent: (event: AuditEvent) => void;
  onRouteChange: (path: string) => void;
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

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <StatusBadge tone="info">{getRoutePageType(route, locale)}</StatusBadge>
            <StatusBadge tone="neutral">{getRoleDisplayName(role.code, locale)}</StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">{getRouteDisplayTitle(route, locale)}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Phase 5 mainline: advertiser, opportunity, Proposal media validation, Campaign launch guard, and approval handoff.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          type="button"
          onClick={() =>
            runAction("Create advertiser", () =>
              salesWorkflowService.createAdvertiser(state, user, {
                name: "Demo Fitness Brand",
                industry: "Wellness",
                region: "CN"
              })
            )
          }
        >
          <Plus className="size-4" aria-hidden="true" />
          New advertiser
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Advertisers" value={String(summary.advertisers)} />
        <SummaryCard label="Opportunities" value={String(summary.opportunities)} />
        <SummaryCard label="Proposals" value={String(summary.proposalDrafts)} tone="warning" />
        <SummaryCard label="Campaigns" value={String(summary.campaigns)} />
        <SummaryCard label="Blocked media" value={String(summary.blockedMedia)} tone="danger" />
      </div>

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
          onOpenProposal={() => onRouteChange("/proposals/:id/wizard")}
          onOpenCampaign={() => onRouteChange("/campaigns/:id/wizard")}
        />

        {page === "sales" && selectedOpportunity ? (
          <SalesManagerWorkbench
            state={state}
            mediaState={mediaState}
            selectedOpportunityId={selectedOpportunity.id}
            onCreateOpportunity={() =>
              runAction("Create opportunity", () => {
                const result = salesWorkflowService.createOpportunity(state, user, {
                  advertiserId: resolveCreateOpportunityAdvertiserId(state) ?? "",
                  name: "Daily Yoga Retention Push",
                  expectedBudget: 16000,
                  painPoints: ["Need quality App supply", "Avoid blocked readiness"]
                });
                const opportunityId = result.guard.allowed ? result.state.opportunities[0]?.id : undefined;
                if (opportunityId) {
                  setSelectedOpportunityId(opportunityId);
                }
                return result;
              })
            }
            onCreateProposal={() =>
              runAction("Create proposal", () => {
                const result = salesWorkflowService.createProposalFromOpportunity(state, user, selectedOpportunity.id);
                const proposalId = result.state.proposals[0]?.id;
                if (proposalId) {
                  setSelectedProposalId(proposalId);
                }
                return result;
              })
            }
            onOpenProposal={() => onRouteChange("/proposals/:id/wizard")}
            supplyMatchLabels={{
              title: t("sales.supplyMatches"),
              empty: t("sales.noSupplyMatches"),
              suggestedBudget: t("sales.suggestedBudget")
            }}
          />
        ) : null}

        {page === "proposal" && selectedProposal ? (
          <ProposalWizard
            state={state}
            mediaState={mediaState}
            proposalId={selectedProposal.id}
            onSelectPublisher={(publisherId, budget) =>
              runAction("Select publisher for proposal", () =>
                salesWorkflowService.selectPublisherForProposal(state, mediaState, user, selectedProposal.id, publisherId, budget)
              )
            }
            onApprove={() =>
              runAction("Approve proposal", () =>
                salesWorkflowService.approveProposal(state, mediaState, user, selectedProposal.id)
              )
            }
            onCreateCampaign={() =>
              runAction("Create campaign", () => {
                const result = salesWorkflowService.createCampaignFromProposal(state, user, selectedProposal.id);
                const campaignId = result.state.campaigns[0]?.id;
                if (campaignId) {
                  setSelectedCampaignId(campaignId);
                }
                return result;
              })
            }
            onOpenCampaign={() => onRouteChange("/campaigns/:id/wizard")}
          />
        ) : null}

        {page === "campaign" && selectedCampaign ? (
          <CampaignWizard
            state={state}
            mediaState={mediaState}
            campaignId={selectedCampaign.id}
            onAllocate={(publisherId, budget) =>
              runAction("Allocate publisher to campaign", () =>
                salesWorkflowService.addPublisherToCampaign(state, mediaState, user, selectedCampaign.id, publisherId, budget)
              )
            }
            onChecklist={() =>
              runAction("Complete launch checklist", () =>
                salesWorkflowService.markLaunchChecklistPassed(state, user, selectedCampaign.id)
              )
            }
            onApprove={() =>
              runAction("Approve campaign launch", () =>
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
          <p className="mt-2 text-sm leading-6 text-slate-600">{message.guard.message}</p>
          {message.guard.required_approval_role ? (
            <p className="mt-1 text-sm text-slate-500">Required owner: {message.guard.required_approval_role}</p>
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
  return (
    <aside className="space-y-3">
      <SelectorPanel title="Opportunities">
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
            <p className="mt-1 text-xs text-slate-500">${opportunity.expected_budget.toLocaleString()} / {opportunity.stage}</p>
          </button>
        ))}
      </SelectorPanel>
      <SelectorPanel title="Proposals">
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
            <p className="mt-1 text-xs text-slate-500">{proposal.status}</p>
          </button>
        ))}
        <button className="mt-2 h-9 w-full rounded-lg border border-slate-200 text-sm font-semibold text-slate-700" type="button" onClick={onOpenProposal}>
          Open proposal wizard
        </button>
      </SelectorPanel>
      <SelectorPanel title="Campaigns">
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
            <p className="mt-1 text-xs text-slate-500">{campaign.status}</p>
          </button>
        ))}
        <button className="mt-2 h-9 w-full rounded-lg border border-slate-200 text-sm font-semibold text-slate-700" type="button" onClick={onOpenCampaign}>
          Open campaign wizard
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
  const opportunity = state.opportunities.find((candidate) => candidate.id === selectedOpportunityId);
  const advertiser = state.advertisers.find((candidate) => candidate.id === opportunity?.advertiser_id);
  const recommendations = trustedSupplyNetworkService
    .getMatchRecommendations(mediaState, state, advertiser?.id)
    .slice(0, 3);

  return (
    <div className="space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xl font-semibold text-slate-950">{opportunity?.name ?? "No opportunity selected"}</p>
            <p className="mt-1 text-sm text-slate-500">{advertiser?.name ?? "Unknown advertiser"}</p>
          </div>
          <BadgeDollarSign className="size-6 text-blue-600" aria-hidden="true" />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="Expected budget" value={`$${(opportunity?.expected_budget ?? 0).toLocaleString()}`} />
          <Metric label="Stage" value={opportunity?.stage ?? "-"} />
          <Metric label="Pain points" value={String(opportunity?.pain_points.length ?? 0)} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700" type="button" onClick={onCreateOpportunity}>
            Create opportunity
          </button>
          <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white" type="button" onClick={onCreateProposal}>
            Create Proposal
          </button>
          <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700" type="button" onClick={onOpenProposal}>
            Continue wizard
          </button>
        </div>
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
  const proposal = state.proposals.find((candidate) => candidate.id === proposalId);
  const selections = state.proposalMediaSelections.filter((selection) => selection.proposal_id === proposalId);

  return (
    <div className="space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-semibold text-slate-950">{proposal?.name ?? "Proposal"}</p>
            <p className="mt-1 text-sm text-slate-500">Budget ${(proposal?.budget ?? 0).toLocaleString()}</p>
          </div>
          <StatusBadge tone={statusTone[proposal?.status ?? "draft"]}>{proposal?.status ?? "draft"}</StatusBadge>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {mediaState.publishers.map((publisher) => (
            <div key={publisher.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{publisher.name}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {publisher.technical_live_status} / {publisher.commercial_test_status} / {publisher.sales_scale_status}
              </p>
              <button className="mt-3 h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white" type="button" onClick={() => onSelectPublisher(publisher.id, 6000)}>
                Validate media
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-base font-semibold text-slate-950">Media validation summary</p>
        <div className="mt-4 space-y-2">
          {selections.map((selection) => {
            const publisher = mediaState.publishers.find((candidate) => candidate.id === selection.publisher_id);
            return (
              <div key={selection.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{publisher?.name ?? selection.publisher_id}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={guardTone[selection.guard_status]}>{selection.guard_reason ?? selection.guard_status}</StatusBadge>
                  <span className="text-slate-500">${selection.planned_budget.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
          {selections.length === 0 ? <p className="text-sm text-slate-500">No media has been validated yet.</p> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white" type="button" onClick={onApprove}>
            Approve Proposal
          </button>
          <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700" type="button" onClick={onCreateCampaign}>
            Create Campaign
          </button>
          <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700" type="button" onClick={onOpenCampaign}>
            Open Campaign
          </button>
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
  const campaign = state.campaigns.find((candidate) => candidate.id === campaignId);
  const allocations = state.campaignMediaAllocations.filter((allocation) => allocation.campaign_id === campaignId);

  return (
    <div className="space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-semibold text-slate-950">{campaign?.name ?? "Campaign"}</p>
            <p className="mt-1 text-sm text-slate-500">Launch checklist: {campaign?.launchChecklistPassed ? "passed" : "open"}</p>
          </div>
          <StatusBadge tone={statusTone[campaign?.status ?? "draft"]}>{campaign?.status ?? "draft"}</StatusBadge>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {mediaState.publishers.map((publisher) => (
            <div key={publisher.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{publisher.name}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {publisher.commercial_test_status} / {publisher.sales_scale_status}
              </p>
              <button className="mt-3 h-9 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white" type="button" onClick={() => onAllocate(publisher.id, 8000)}>
                Run launch guard
              </button>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <p className="text-base font-semibold text-slate-950">Launch allocations</p>
        <div className="mt-4 space-y-2">
          {allocations.map((allocation) => {
            const publisher = mediaState.publishers.find((candidate) => candidate.id === allocation.publisher_id);
            return (
              <div key={allocation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{publisher?.name ?? allocation.publisher_id}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge tone={guardTone[allocation.guard_status]}>{allocation.guard_reason ?? allocation.guard_status}</StatusBadge>
                  <span className="text-slate-500">${allocation.allocation_budget.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
          {allocations.length === 0 ? <p className="text-sm text-slate-500">No launch guard result yet.</p> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700" type="button" onClick={onChecklist}>
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Complete checklist
          </button>
          <button className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white" type="button" onClick={onApprove}>
            <Send className="size-4" aria-hidden="true" />
            Approve launch
          </button>
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
