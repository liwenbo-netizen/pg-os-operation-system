import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Map, Plus, Search, Send, ShieldAlert, Target, TestTube2, UserCheck, Wrench } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { SummaryCard } from "../../components/SummaryCard";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import {
  chinaMediaEcosystemService,
  mediaEcosystemTrackLabels,
  type MediaEcosystemOperationalQueueKey
} from "../../services/chinaMediaEcosystemService";
import { mediaWorkflowService } from "../../services/mediaWorkflowService";
import type {
  AuditEvent,
  BusinessUser,
  EntityId,
  MediaEcosystemLead,
  MediaEcosystemPriorityScore,
  MediaEcosystemTrack,
  MediaExpansionStage,
  MediaWorkflowState,
  Publisher,
  TrustedSupplyCandidate
} from "../../types/domain";
import type { GuardResult } from "../../types/guards";

type MediaExperiencePageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  state: MediaWorkflowState;
  onStateChange: (state: MediaWorkflowState) => void;
  onAuditEvent: (event: AuditEvent) => void;
  onRouteChange: (path: string) => void;
};

type ActionMessage = {
  title: string;
  guard: GuardResult;
};

type MediaActionResult = {
  state: MediaWorkflowState;
  guard: GuardResult;
  auditEvent?: AuditEvent;
};

const statusTone = {
  draft: "neutral",
  pending_integration: "warning",
  in_integration: "warning",
  technical_review: "warning",
  technical_live_passed: "success",
  technical_blocked: "danger",
  deprecated: "neutral",
  not_started: "neutral",
  ready_for_test: "info",
  testing: "warning",
  test_passed: "success",
  test_failed: "danger",
  not_allowed: "danger",
  limited_sellable: "warning",
  proposal_selectable: "info",
  scale_ready: "success",
  scale_blocked: "danger",
  paused: "neutral"
} as const;

function toneForStatus(status: keyof typeof statusTone) {
  return statusTone[status] ?? "neutral";
}

function toneForExpansionStage(stage: MediaExpansionStage) {
  if (stage === "REJECTED") {
    return "danger" as const;
  }

  if (stage === "ON_HOLD") {
    return "warning" as const;
  }

  if (stage === "TRUSTED_SUPPLY_CANDIDATE" || stage === "ONBOARDING_PROJECT_CREATED") {
    return "success" as const;
  }

  if (["CONTACTED", "MEETING_SCHEDULED", "BUSINESS_QUALIFIED", "TECH_FEASIBILITY_CHECK"].includes(stage)) {
    return "info" as const;
  }

  return "neutral" as const;
}

const ecosystemStageOptions: Array<"ALL" | MediaExpansionStage> = [
  "ALL",
  "ECOSYSTEM_MAPPED",
  "PRIORITY_SCREENED",
  "OUTREACH_READY",
  "CONTACTED",
  "MEETING_SCHEDULED",
  "BUSINESS_QUALIFIED",
  "TECH_FEASIBILITY_CHECK",
  "TRUSTED_SUPPLY_CANDIDATE",
  "ONBOARDING_PROJECT_CREATED",
  "ON_HOLD",
  "REJECTED"
];

const ecosystemPriorityOptions = [
  { value: "ALL", label: "All scores" },
  { value: "HIGH", label: "70+" },
  { value: "WATCH", label: "1-69" },
  { value: "UNSCORED", label: "Unscored" }
] as const;

type EcosystemPriorityFilter = (typeof ecosystemPriorityOptions)[number]["value"];

const ecosystemOwnerOptions = [
  { value: "ALL", label: "All owners" },
  { value: "NO_USER_OWNER", label: "No user owner" },
  { value: "MINE", label: "My leads" },
  { value: "MEDIA_MANAGER_ROLE", label: "Media manager" },
  { value: "MEDIA_DIRECTOR_ROLE", label: "Media director" },
  { value: "OPERATIONS_DIRECTOR_ROLE", label: "Operations director" }
] as const;

type EcosystemOwnerFilter = (typeof ecosystemOwnerOptions)[number]["value"];

const ecosystemReviewOptions = [
  { value: "ALL", label: "All review states" },
  { value: "REVIEW_REQUIRED", label: "Review required" },
  { value: "SEED_ONLY", label: "Seed only" },
  { value: "MANUAL_REVIEWED", label: "Manual reviewed" },
  { value: "UNVERIFIED", label: "Unverified" },
  { value: "VERIFIED", label: "Verified" }
] as const;

type EcosystemReviewFilter = (typeof ecosystemReviewOptions)[number]["value"];

const ecosystemListPageSize = 24;

function matchesEcosystemPriority(lead: MediaEcosystemLead, filter: EcosystemPriorityFilter) {
  if (filter === "HIGH") {
    return lead.priority_score >= 70;
  }

  if (filter === "WATCH") {
    return lead.priority_score > 0 && lead.priority_score < 70;
  }

  if (filter === "UNSCORED") {
    return lead.priority_score === 0;
  }

  return true;
}

function matchesEcosystemOwner(lead: MediaEcosystemLead, filter: EcosystemOwnerFilter, user: BusinessUser) {
  if (filter === "NO_USER_OWNER") {
    return !lead.owner_user_id;
  }

  if (filter === "MINE") {
    return lead.owner_user_id === user.id;
  }

  if (filter === "MEDIA_MANAGER_ROLE") {
    return lead.owner_role === "media_manager";
  }

  if (filter === "MEDIA_DIRECTOR_ROLE") {
    return lead.owner_role === "media_director";
  }

  if (filter === "OPERATIONS_DIRECTOR_ROLE") {
    return lead.owner_role === "operations_director";
  }

  return true;
}

function matchesEcosystemReview(lead: MediaEcosystemLead, filter: EcosystemReviewFilter) {
  if (filter === "REVIEW_REQUIRED") {
    return lead.review_required;
  }

  if (filter === "SEED_ONLY") {
    return lead.data_quality_level === "SEED_ONLY";
  }

  if (filter === "MANUAL_REVIEWED") {
    return lead.data_quality_level === "MANUAL_REVIEWED";
  }

  if (filter === "UNVERIFIED") {
    return lead.verification_status === "UNVERIFIED";
  }

  if (filter === "VERIFIED") {
    return lead.verification_status === "VERIFIED";
  }

  return true;
}

export function MediaExperiencePage({
  route,
  role,
  user,
  state,
  onStateChange,
  onAuditEvent,
  onRouteChange
}: MediaExperiencePageProps) {
  const [selectedPublisherId, setSelectedPublisherId] = useState<EntityId>("publisher-new-ctv");
  const [message, setMessage] = useState<ActionMessage | null>(null);

  const summary = mediaWorkflowService.getSummary(state);
  const ecosystemSummary = chinaMediaEcosystemService.getSummary(state);
  const queue = mediaWorkflowService.getReadinessQueue(state);
  const selectedPublisher = state.publishers.find((publisher) => publisher.id === selectedPublisherId) ?? state.publishers[0];
  const selectedSnapshot = selectedPublisher
    ? mediaWorkflowService.getPublisherSnapshot(state, selectedPublisher.id)
    : undefined;

  function runAction(title: string, action: () => MediaActionResult) {
    const result = action();
    onStateChange(result.state);
    if (result.auditEvent) {
      onAuditEvent(result.auditEvent);
    }
    setMessage({ title, guard: result.guard });
  }

  const page = useMemo(() => {
    if (route.path === "/media/director-command-center") {
      return "director";
    }

    if (route.path === "/media/manager-workbench") {
      return "manager";
    }

    if (route.path === "/media/china-ecosystem") {
      return "ecosystem";
    }

    if (route.path === "/media/integration-wizard/:id") {
      return "integration";
    }

    if (route.path === "/media/commercial-tests/:id") {
      return "commercial";
    }

    return "publisher";
  }, [route.path]);

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <StatusBadge tone="info">{route.service}</StatusBadge>
            <StatusBadge tone="neutral">{role.name}</StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">{route.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {page === "ecosystem"
              ? "China and APAC media ecosystem expansion: map tracks, screen priority, prove outreach, and convert qualified opportunities into trusted supply candidates."
              : "Media P0 mainline: publisher profile, ad slots, terms, technical live, commercial test, and sales readiness."}
          </p>
        </div>
        {page === "ecosystem" ? null : (
          <button
            className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
            type="button"
            onClick={() =>
              runAction("Create publisher", () =>
                mediaWorkflowService.createPublisher(state, user, {
                  name: "Demo Audio Network",
                  region: "CN",
                  mediaType: "App",
                  integrationType: "SDK"
                })
              )
            }
          >
            <Plus className="size-4" aria-hidden="true" />
            New publisher
          </button>
        )}
      </header>

      {page === "ecosystem" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <SummaryCard label="Mapped leads" value={String(ecosystemSummary.totalLeads)} />
          <SummaryCard label="Active leads" value={String(ecosystemSummary.activeLeads)} tone="success" />
          <SummaryCard label="Priority 70+" value={String(ecosystemSummary.highPriority)} tone="warning" />
          <SummaryCard label="Outreach pipeline" value={String(ecosystemSummary.outreachPipeline)} />
          <SummaryCard label="Gate eligible" value={String(ecosystemSummary.eligibleForTrustedSupply)} tone="success" />
          <SummaryCard label="Trusted candidates" value={String(ecosystemSummary.trustedCandidates)} tone="warning" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <SummaryCard label="Publishers" value={String(summary.total)} />
          <SummaryCard label="Tech live" value={String(summary.technicalLive)} tone="success" />
          <SummaryCard label="Test passed" value={String(summary.testPassed)} tone="success" />
          <SummaryCard label="Sales ready" value={String(summary.proposalSelectable)} tone="warning" />
          <SummaryCard label="High risk" value={String(summary.highRisk)} tone="danger" />
        </div>
      )}

      {message ? <GuardNotice message={message} /> : null}

      {page === "ecosystem" ? (
        <ChinaMediaEcosystemWorkspace state={state} user={user} onRunAction={runAction} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <PublisherSelector
          publishers={state.publishers}
          selectedPublisherId={selectedPublisher?.id}
          onSelect={(publisherId) => setSelectedPublisherId(publisherId)}
          onOpen360={() => onRouteChange("/media/publishers/:id")}
        />

        {page === "manager" ? (
          <MediaManagerWorkbench
            queue={queue}
            onSelect={(publisherId) => setSelectedPublisherId(publisherId)}
            onOpen360={(publisherId) => {
              setSelectedPublisherId(publisherId);
              onRouteChange("/media/publishers/:id");
            }}
            onAddSlot={(publisherId) =>
              runAction("Add ad slot", () =>
                mediaWorkflowService.addAdSlot(state, user, publisherId, {
                  slotName: "Rewarded Video",
                  adFormat: "Video",
                  placementType: "In-app",
                  floorPrice: 16,
                  dailyRequests: 1500000
                })
              )
            }
          />
        ) : null}

        {page === "director" ? (
          <MediaDirectorCommandCenter
            queue={queue}
            onApprove={(publisherId, targetStatus) =>
              runAction("Approve sales readiness", () =>
                mediaWorkflowService.approveSalesReadiness(state, user, publisherId, targetStatus)
              )
            }
          />
        ) : null}

        {page === "publisher" && selectedSnapshot ? (
          <Publisher360
            snapshot={selectedSnapshot}
            onAddSlot={() =>
              runAction("Add ad slot", () =>
                mediaWorkflowService.addAdSlot(state, user, selectedSnapshot.publisher!.id, {
                  slotName: "In-feed Display",
                  adFormat: "Display",
                  placementType: "Feed",
                  floorPrice: 12,
                  dailyRequests: 800000
                })
              )
            }
            onAddTerm={() =>
              runAction("Add commercial terms", () =>
                mediaWorkflowService.addContractTerm(state, user, selectedSnapshot.publisher!.id, {
                  contractType: "Framework",
                  billingModel: "CPM",
                  settlementCycle: "Monthly",
                  paymentTerms: "Net 30",
                  revenueShare: 0.66
                })
              )
            }
            onOpenIntegration={() => onRouteChange("/media/integration-wizard/:id")}
            onOpenTest={() => onRouteChange("/media/commercial-tests/:id")}
          />
        ) : null}

        {page === "integration" && selectedPublisher ? (
          <IntegrationWizard
            publisher={selectedPublisher}
            state={state}
            onSubmit={() =>
              runAction("Submit production validation", () =>
                mediaWorkflowService.submitTechnicalValidation(state, user, selectedPublisher.id)
              )
            }
          />
        ) : null}

        {page === "commercial" && selectedPublisher ? (
          <CommercialTestWorkspace
            publisher={selectedPublisher}
            tests={state.commercialTests.filter((test) => test.publisher_id === selectedPublisher.id)}
            onCreateTest={() =>
              runAction("Create commercial test", () => mediaWorkflowService.createCommercialTest(state, user, selectedPublisher.id))
            }
            onPassLatestTest={() => {
              const latest = state.commercialTests.find((test) => test.publisher_id === selectedPublisher.id);
              runAction("Submit commercial test conclusion", () =>
                mediaWorkflowService.submitCommercialTestConclusion(state, user, latest?.id ?? "missing-test", "test_passed")
              );
            }}
          />
        ) : null}
        </div>
      )}
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

function ChinaMediaEcosystemWorkspace({
  state,
  user,
  onRunAction
}: {
  state: MediaWorkflowState;
  user: BusinessUser;
  onRunAction: (title: string, action: () => MediaActionResult) => void;
}) {
  const [selectedLeadId, setSelectedLeadId] = useState<EntityId>(state.mediaEcosystemLeads[0]?.id ?? "");
  const [searchQuery, setSearchQuery] = useState("");
  const [queueFilter, setQueueFilter] = useState<MediaEcosystemOperationalQueueKey>("ALL");
  const [trackFilter, setTrackFilter] = useState<"ALL" | MediaEcosystemTrack>("ALL");
  const [stageFilter, setStageFilter] = useState<"ALL" | MediaExpansionStage>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<EcosystemPriorityFilter>("ALL");
  const [ownerFilter, setOwnerFilter] = useState<EcosystemOwnerFilter>("ALL");
  const [reviewFilter, setReviewFilter] = useState<EcosystemReviewFilter>("ALL");
  const [confidenceFilter, setConfidenceFilter] = useState("ALL");
  const [visibleLeadCount, setVisibleLeadCount] = useState(ecosystemListPageSize);
  const operationalQueues = chinaMediaEcosystemService.getOperationalQueues(state);
  const trackOpportunities = chinaMediaEcosystemService.getTrackOpportunities(state);
  const pipeline = chinaMediaEcosystemService.getPipeline(state);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const seedConfidenceOptions = useMemo(
    () =>
      Array.from(new Set(state.mediaEcosystemLeads.map((lead) => lead.seed_confidence).filter(Boolean) as string[])).sort(
        (left, right) => left.localeCompare(right)
      ),
    [state.mediaEcosystemLeads]
  );
  const filteredLeads = useMemo(
    () =>
      [...state.mediaEcosystemLeads]
        .sort((left, right) => right.priority_score - left.priority_score || left.media_name.localeCompare(right.media_name))
        .filter((lead) => {
          const searchableText = [lead.media_name, lead.company_name, lead.next_action, mediaEcosystemTrackLabels[lead.track]]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return (
            (normalizedSearchQuery.length === 0 || searchableText.includes(normalizedSearchQuery)) &&
            chinaMediaEcosystemService.matchesOperationalQueue(lead, queueFilter) &&
            (trackFilter === "ALL" || lead.track === trackFilter) &&
            (stageFilter === "ALL" || lead.stage === stageFilter) &&
            matchesEcosystemPriority(lead, priorityFilter) &&
            matchesEcosystemOwner(lead, ownerFilter, user) &&
            matchesEcosystemReview(lead, reviewFilter) &&
            (confidenceFilter === "ALL" || lead.seed_confidence === confidenceFilter)
          );
        }),
    [confidenceFilter, normalizedSearchQuery, ownerFilter, priorityFilter, queueFilter, reviewFilter, stageFilter, state.mediaEcosystemLeads, trackFilter, user]
  );
  const visibleLeads = filteredLeads.slice(0, visibleLeadCount);
  const selectedLead =
    visibleLeads.find((lead) => lead.id === selectedLeadId) ??
    visibleLeads[0] ??
    filteredLeads[0] ??
    state.mediaEcosystemLeads.find((lead) => lead.id === selectedLeadId) ??
    state.mediaEcosystemLeads[0];
  const selectedCandidate = selectedLead
    ? state.trustedSupplyCandidates.find((candidate) => candidate.lead_id === selectedLead.id)
    : undefined;
  const eligibility = selectedLead ? chinaMediaEcosystemService.evaluateTrustedSupplyEligibility(selectedLead) : undefined;
  const selectedActivities = selectedLead
    ? state.mediaOutreachActivities.filter((activity) => activity.lead_id === selectedLead.id).slice(0, 5)
    : [];
  const activeQueue = operationalQueues.find((queue) => queue.key === queueFilter) ?? operationalQueues[0];
  const activeFilterCount = [
    queueFilter !== "ALL",
    trackFilter !== "ALL",
    stageFilter !== "ALL",
    priorityFilter !== "ALL",
    ownerFilter !== "ALL",
    reviewFilter !== "ALL",
    confidenceFilter !== "ALL",
    normalizedSearchQuery.length > 0
  ].filter(Boolean).length;

  function resetOpportunityFilters() {
    setSearchQuery("");
    setQueueFilter("ALL");
    setTrackFilter("ALL");
    setStageFilter("ALL");
    setPriorityFilter("ALL");
    setOwnerFilter("ALL");
    setReviewFilter("ALL");
    setConfidenceFilter("ALL");
    setVisibleLeadCount(ecosystemListPageSize);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Operational queues</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">{activeQueue?.nextAction}</p>
          </div>
          <StatusBadge tone={activeFilterCount > 0 ? "info" : "neutral"}>{`${activeFilterCount} active filter(s)`}</StatusBadge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {operationalQueues.map((queue) => (
            <button
              key={queue.key}
              className={`rounded-lg border p-4 text-left transition ${
                queueFilter === queue.key ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
              type="button"
              onClick={() => {
                setQueueFilter(queue.key);
                setVisibleLeadCount(ecosystemListPageSize);
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{queue.label}</p>
                <StatusBadge tone={queue.tone}>{String(queue.count)}</StatusBadge>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">{queue.nextAction}</p>
            </button>
          ))}
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <Map className="size-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">Strategic track map</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {trackOpportunities.map((track) => (
              <article key={track.track} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-900">{mediaEcosystemTrackLabels[track.track]}</p>
                  <StatusBadge tone={track.gapLevel === "covered" ? "success" : track.gapLevel === "watch" ? "warning" : "danger"}>
                    {track.gapLevel}
                  </StatusBadge>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                  <MetricMini label="leads" value={String(track.leads)} />
                  <MetricMini label="top" value={String(track.highestScore)} />
                  <MetricMini label="candidate" value={String(track.trustedCandidates)} />
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-500">{track.nextAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex items-center gap-3">
            <Target className="size-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-lg font-semibold text-slate-950">Expansion pipeline</h2>
          </div>
          <div className="mt-4 space-y-2">
            {pipeline.map((lane) => (
              <div key={lane.stage} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="break-all text-xs font-semibold text-slate-600">{lane.stage}</span>
                <span className="text-sm font-semibold text-slate-950">{lane.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Opportunity pool</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {filteredLeads.length} visible / {state.mediaEcosystemLeads.length} total
                </p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge tone={filteredLeads.length > 0 ? "info" : "warning"}>{String(visibleLeads.length)}</StatusBadge>
                {activeFilterCount > 0 ? (
                  <button
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    type="button"
                    onClick={resetOpportunityFilters}
                  >
                    Reset
                  </button>
                ) : null}
              </div>
            </div>
            <label className="mt-4 flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-600">
              <Search className="size-4 text-slate-400" aria-hidden="true" />
              <input
                className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                value={searchQuery}
                placeholder="Search media"
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              />
            </label>
            <div className="mt-3 grid gap-2">
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={trackFilter}
                onChange={(event) => {
                  setTrackFilter(event.target.value as "ALL" | MediaEcosystemTrack);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                <option value="ALL">All tracks</option>
                {Object.entries(mediaEcosystemTrackLabels).map(([track, label]) => (
                  <option key={track} value={track}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={stageFilter}
                onChange={(event) => {
                  setStageFilter(event.target.value as "ALL" | MediaExpansionStage);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                {ecosystemStageOptions.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage === "ALL" ? "All stages" : stage}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={priorityFilter}
                onChange={(event) => {
                  setPriorityFilter(event.target.value as EcosystemPriorityFilter);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                {ecosystemPriorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={ownerFilter}
                onChange={(event) => {
                  setOwnerFilter(event.target.value as EcosystemOwnerFilter);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                {ecosystemOwnerOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={reviewFilter}
                onChange={(event) => {
                  setReviewFilter(event.target.value as EcosystemReviewFilter);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                {ecosystemReviewOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={confidenceFilter}
                onChange={(event) => {
                  setConfidenceFilter(event.target.value);
                  setVisibleLeadCount(ecosystemListPageSize);
                }}
              >
                <option value="ALL">All seed confidence</option>
                {seedConfidenceOptions.map((confidence) => (
                  <option key={confidence} value={confidence}>
                    {confidence}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge tone={queueFilter === "ALL" ? "neutral" : "info"}>
                {activeQueue?.label ?? "All opportunities"}
              </StatusBadge>
              {reviewFilter !== "ALL" ? <StatusBadge tone="warning">{reviewFilter}</StatusBadge> : null}
              {ownerFilter !== "ALL" ? <StatusBadge tone="info">{ownerFilter}</StatusBadge> : null}
            </div>
          </div>
          {visibleLeads.map((lead) => (
            <button
              key={lead.id}
              className={`w-full rounded-lg border p-4 text-left shadow-card transition ${
                selectedLead?.id === lead.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:border-slate-300"
              }`}
              type="button"
              onClick={() => setSelectedLeadId(lead.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{lead.media_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{mediaEcosystemTrackLabels[lead.track]}</p>
                </div>
                <StatusBadge tone={lead.priority_score >= 70 ? "success" : lead.priority_score >= 50 ? "warning" : "danger"}>
                  {String(lead.priority_score)}
                </StatusBadge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge tone={toneForExpansionStage(lead.stage)}>{lead.stage}</StatusBadge>
                <StatusBadge tone={lead.data_quality_level === "SEED_ONLY" ? "warning" : "success"}>{lead.data_quality_level}</StatusBadge>
                <StatusBadge tone={lead.owner_user_id ? "success" : "warning"}>
                  {lead.owner_user_id ? "user owner" : "no user owner"}
                </StatusBadge>
                <StatusBadge tone={lead.risk_level === "critical" || lead.risk_level === "high" ? "danger" : "neutral"}>
                  {lead.risk_level}
                </StatusBadge>
              </div>
            </button>
          ))}
          {filteredLeads.length > visibleLeads.length ? (
            <button
              className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-card hover:bg-slate-50"
              type="button"
              onClick={() => setVisibleLeadCount((count) => count + ecosystemListPageSize)}
            >
              Show more
            </button>
          ) : null}
          {filteredLeads.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-card">
              No matching ecosystem opportunities.
            </div>
          ) : null}
        </aside>

        {selectedLead ? (
          <section className="space-y-4">
            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-2xl font-semibold tracking-normal text-slate-950">{selectedLead.media_name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedLead.region} / {mediaEcosystemTrackLabels[selectedLead.track]} / owner {selectedLead.owner_role}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge tone={toneForExpansionStage(selectedLead.stage)}>{selectedLead.stage}</StatusBadge>
                  <StatusBadge tone={selectedLead.data_quality_level === "SEED_ONLY" ? "warning" : "success"}>
                    {selectedLead.data_quality_level}
                  </StatusBadge>
                  <StatusBadge tone={selectedLead.verification_status === "VERIFIED" ? "success" : "info"}>
                    {selectedLead.verification_status}
                  </StatusBadge>
                  <StatusBadge tone={selectedLead.priority_score >= 70 ? "success" : "warning"}>
                    {`score ${selectedLead.priority_score}`}
                  </StatusBadge>
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <SignalCheck label="Contact" checked={selectedLead.media_contact_confirmed} />
                <SignalCheck label="Business interest" checked={selectedLead.business_interest_confirmed} />
                <SignalCheck label="Inventory" checked={selectedLead.ad_inventory_identified} />
                <SignalCheck label="Feasibility" checked={selectedLead.integration_feasibility !== "impossible"} />
              </div>

              <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Next action</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{selectedLead.next_action}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() =>
                    onRunAction("Claim ecosystem lead", () =>
                      chinaMediaEcosystemService.claimLeadOwner(state, user, selectedLead.id)
                    )
                  }
                >
                  <UserCheck className="size-4" aria-hidden="true" />
                  Claim owner
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() =>
                    onRunAction("Mark seed reviewed", () =>
                      chinaMediaEcosystemService.markManualReviewed(state, user, selectedLead.id)
                    )
                  }
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Mark reviewed
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() =>
                    onRunAction("Priority screen lead", () =>
                      chinaMediaEcosystemService.scoreLeadPriority(state, user, selectedLead.id)
                    )
                  }
                >
                  <Target className="size-4" aria-hidden="true" />
                  Priority screen
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() =>
                    onRunAction("Record media contact", () =>
                      chinaMediaEcosystemService.recordContacted(state, user, selectedLead.id)
                    )
                  }
                >
                  <Send className="size-4" aria-hidden="true" />
                  Record contact
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() =>
                    onRunAction("Qualify business readiness", () =>
                      chinaMediaEcosystemService.qualifyBusinessReadiness(state, user, selectedLead.id)
                    )
                  }
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Qualify
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
                  type="button"
                  onClick={() =>
                    onRunAction("Create trusted supply candidate", () =>
                      chinaMediaEcosystemService.createTrustedSupplyCandidate(state, user, selectedLead.id)
                    )
                  }
                >
                  <ArrowRight className="size-4" aria-hidden="true" />
                  Trusted candidate
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                  type="button"
                  disabled={!selectedCandidate}
                  onClick={() => {
                    if (!selectedCandidate) {
                      return;
                    }

                    onRunAction("Create onboarding project", () =>
                      chinaMediaEcosystemService.createOnboardingProject(state, user, selectedCandidate.id)
                    );
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Onboarding project
                </button>
              </div>
            </article>

            <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                <SeedReviewPanel lead={selectedLead} />
                <ScoreBreakdownPanel
                  lead={selectedLead}
                  onApplyScore={(scoreBreakdown) =>
                    onRunAction("Apply manual score", () =>
                      chinaMediaEcosystemService.applyManualScore(state, user, selectedLead.id, scoreBreakdown)
                    )
                  }
                />
              </div>
              <EligibilityPanel lead={selectedLead} candidate={selectedCandidate} blockers={eligibility?.blockers ?? []} />
            </div>

            <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
              <h2 className="text-base font-semibold text-slate-950">Outreach trail</h2>
              <div className="mt-4 space-y-2">
                {selectedActivities.length > 0 ? (
                  selectedActivities.map((activity) => (
                    <div key={activity.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="text-sm font-semibold text-slate-800">{activity.event}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {activity.actor_role} / {activity.created_at}
                      </p>
                      {activity.notes ? <p className="mt-2 text-xs leading-5 text-slate-500">{activity.notes}</p> : null}
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No outreach activity yet.</p>
                )}
              </div>
            </article>
          </section>
        ) : (
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">No ecosystem leads are available.</article>
        )}
      </div>
    </div>
  );
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-semibold text-slate-900">{value}</p>
      <p>{label}</p>
    </div>
  );
}

function SignalCheck({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <div className="mt-2">
        <StatusBadge tone={checked ? "success" : "warning"}>{checked ? "confirmed" : "pending"}</StatusBadge>
      </div>
    </div>
  );
}

function SeedReviewPanel({ lead }: { lead: MediaEcosystemLead }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-950">Review operations</h2>
        <StatusBadge tone={lead.data_quality_level === "SEED_ONLY" ? "warning" : "success"}>{lead.data_quality_level}</StatusBadge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="Verification" value={lead.verification_status} />
        <Metric label="Review required" value={lead.review_required ? "yes" : "no"} />
        <Metric label="Owner role" value={lead.owner_role} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="User owner" value={lead.owner_user_id ?? "not assigned"} />
        <Metric label="Seed confidence" value={lead.seed_confidence ?? "-"} />
        <Metric label="Source" value={lead.source_name ?? "-"} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="Version" value={lead.source_version ?? "-"} />
      </div>
    </article>
  );
}

function ScoreBreakdownPanel({
  lead,
  onApplyScore
}: {
  lead: MediaEcosystemLead;
  onApplyScore: (scoreBreakdown: MediaEcosystemPriorityScore) => void;
}) {
  const [draftScore, setDraftScore] = useState<MediaEcosystemPriorityScore>(lead.score_breakdown);
  useEffect(() => {
    setDraftScore(lead.score_breakdown);
  }, [lead.id, lead.score_breakdown]);

  const rows = [
    ["strategic_value", "Strategic value", 20],
    ["user_scale_growth", "User scale growth", 15],
    ["ad_scenario_value", "Ad scenario value", 15],
    ["programmatic_feasibility", "Programmatic feasibility", 15],
    ["advertiser_demand_match", "Advertiser demand match", 15],
    ["commercial_negotiability", "Commercial negotiability", 10],
    ["risk_compliance_control", "Risk compliance control", 10]
  ] as const;
  const draftTotal = chinaMediaEcosystemService.calculatePriorityScore(draftScore);

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-950">Priority score</h2>
        <StatusBadge tone={draftTotal >= 70 ? "success" : draftTotal > 0 ? "warning" : "neutral"}>{`draft ${draftTotal}`}</StatusBadge>
      </div>
      <div className="mt-4 space-y-2">
        {rows.map(([key, label, max]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm text-slate-600">{label}</span>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-950">
              <input
                className="h-8 w-16 rounded-md border border-slate-200 bg-white px-2 text-right text-sm outline-none focus:border-blue-300"
                type="number"
                min={0}
                max={max}
                value={draftScore[key]}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setDraftScore((current) => ({
                    ...current,
                    [key]: Number.isFinite(value) ? Math.max(0, Math.min(max, Math.round(value))) : 0
                  }));
                }}
              />
              <span>/ {max}</span>
            </label>
          </div>
        ))}
      </div>
      <button
        className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white hover:bg-blue-700"
        type="button"
        onClick={() => onApplyScore(draftScore)}
      >
        <Target className="size-4" aria-hidden="true" />
        Apply score
      </button>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Metric label="Scale note" value={lead.user_scale_note} />
        <Metric label="Scenario note" value={lead.ad_scenario_note} />
        <Metric label="Demand note" value={lead.advertiser_demand_note} />
      </div>
    </article>
  );
}

function EligibilityPanel({
  lead,
  candidate,
  blockers
}: {
  lead: MediaEcosystemLead;
  candidate?: TrustedSupplyCandidate;
  blockers: string[];
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-950">Trusted supply gate</h2>
        <StatusBadge tone={blockers.length === 0 ? "success" : "warning"}>{blockers.length === 0 ? "eligible" : "blocked"}</StatusBadge>
      </div>
      <div className="mt-4 space-y-2">
        <GateRow label="Score >= 70" passed={lead.priority_score >= 70} />
        <GateRow label="Contact confirmed" passed={lead.media_contact_confirmed} />
        <GateRow label="Business interest" passed={lead.business_interest_confirmed} />
        <GateRow label="Inventory identified" passed={lead.ad_inventory_identified} />
        <GateRow label="Feasibility not impossible" passed={lead.integration_feasibility !== "impossible"} />
      </div>
      {candidate ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm font-semibold text-emerald-900">{candidate.media_name}</p>
          <p className="mt-1 text-xs leading-5 text-emerald-700">{candidate.evaluation_notes}</p>
          <div className="mt-2">
            <StatusBadge tone={candidate.status === "onboarding_project_created" ? "success" : "info"}>{candidate.status}</StatusBadge>
          </div>
        </div>
      ) : null}
      {blockers.length > 0 ? <p className="mt-3 text-xs leading-5 text-slate-500">Blocking gates: {blockers.join(", ")}</p> : null}
    </article>
  );
}

function GateRow({ label, passed }: { label: string; passed: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
      <span className="text-sm text-slate-600">{label}</span>
      <StatusBadge tone={passed ? "success" : "warning"}>{passed ? "pass" : "pending"}</StatusBadge>
    </div>
  );
}

function PublisherSelector({
  publishers,
  selectedPublisherId,
  onSelect,
  onOpen360
}: {
  publishers: Publisher[];
  selectedPublisherId?: EntityId;
  onSelect: (publisherId: EntityId) => void;
  onOpen360: () => void;
}) {
  return (
    <aside className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
        <p className="text-sm font-semibold text-slate-900">Publisher queue</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">Select a publisher to drive the P0 readiness flow.</p>
      </div>
      {publishers.map((publisher) => (
        <button
          key={publisher.id}
          className={`w-full rounded-lg border p-4 text-left shadow-card transition ${
            selectedPublisherId === publisher.id
              ? "border-blue-300 bg-blue-50"
              : "border-slate-200 bg-white hover:border-slate-300"
          }`}
          type="button"
          onClick={() => onSelect(publisher.id)}
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-900">{publisher.name}</p>
            <StatusBadge tone={toneForStatus(publisher.sales_scale_status)}>{publisher.sales_scale_status}</StatusBadge>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {publisher.media_type ?? "Media"} / {publisher.integration_type ?? "Integration"}
          </p>
        </button>
      ))}
      <button
        className="h-10 w-full rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50"
        type="button"
        onClick={onOpen360}
      >
        Open 360
      </button>
    </aside>
  );
}

function MediaManagerWorkbench({
  queue,
  onSelect,
  onOpen360,
  onAddSlot
}: {
  queue: ReturnType<typeof mediaWorkflowService.getReadinessQueue>;
  onSelect: (publisherId: EntityId) => void;
  onOpen360: (publisherId: EntityId) => void;
  onAddSlot: (publisherId: EntityId) => void;
}) {
  return (
    <div className="space-y-4">
      {queue.map(({ publisher, openBlockingCases, adSlots, terms }) => (
        <article key={publisher.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-950">{publisher.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                Slots {adSlots} / Terms {terms} / Blocking cases {openBlockingCases}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={toneForStatus(publisher.technical_live_status)}>{publisher.technical_live_status}</StatusBadge>
              <StatusBadge tone={toneForStatus(publisher.commercial_test_status)}>{publisher.commercial_test_status}</StatusBadge>
              <StatusBadge tone={toneForStatus(publisher.sales_scale_status)}>{publisher.sales_scale_status}</StatusBadge>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white" type="button" onClick={() => onOpen360(publisher.id)}>
              Continue
            </button>
            <button
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700"
              type="button"
              onClick={() => {
                onSelect(publisher.id);
                onAddSlot(publisher.id);
              }}
            >
              Add ad slot
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function MediaDirectorCommandCenter({
  queue,
  onApprove
}: {
  queue: ReturnType<typeof mediaWorkflowService.getReadinessQueue>;
  onApprove: (publisherId: EntityId, targetStatus: "limited_sellable" | "proposal_selectable" | "scale_ready") => void;
}) {
  return (
    <div className="space-y-4">
      {queue.map(({ publisher, openBlockingCases }) => (
        <article key={publisher.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-lg font-semibold text-slate-950">{publisher.name}</p>
              <p className="mt-1 text-sm text-slate-500">Open blocking diagnostic cases: {openBlockingCases}</p>
            </div>
            <StatusBadge tone={toneForStatus(publisher.sales_scale_status)}>{publisher.sales_scale_status}</StatusBadge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700" type="button" onClick={() => onApprove(publisher.id, "limited_sellable")}>
              Limited sellable
            </button>
            <button className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700" type="button" onClick={() => onApprove(publisher.id, "proposal_selectable")}>
              Proposal selectable
            </button>
            <button className="h-10 rounded-lg bg-blue-600 px-3 text-sm font-semibold text-white" type="button" onClick={() => onApprove(publisher.id, "scale_ready")}>
              Scale ready
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function Publisher360({
  snapshot,
  onAddSlot,
  onAddTerm,
  onOpenIntegration,
  onOpenTest
}: {
  snapshot: ReturnType<typeof mediaWorkflowService.getPublisherSnapshot>;
  onAddSlot: () => void;
  onAddTerm: () => void;
  onOpenIntegration: () => void;
  onOpenTest: () => void;
}) {
  const publisher = snapshot.publisher;

  if (!publisher) {
    return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">Publisher not found.</div>;
  }

  return (
    <div className="space-y-4">
      <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-2xl font-semibold tracking-normal text-slate-950">{publisher.name}</p>
            <p className="mt-1 text-sm text-slate-500">
              {publisher.region} / {publisher.media_type} / {publisher.integration_type}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={toneForStatus(publisher.technical_live_status)}>{publisher.technical_live_status}</StatusBadge>
            <StatusBadge tone={toneForStatus(publisher.commercial_test_status)}>{publisher.commercial_test_status}</StatusBadge>
            <StatusBadge tone={toneForStatus(publisher.sales_scale_status)}>{publisher.sales_scale_status}</StatusBadge>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Metric label="DAU" value={publisher.daily_active_users?.toLocaleString() ?? "-"} />
          <Metric label="Daily requests" value={publisher.daily_requests?.toLocaleString() ?? "-"} />
          <Metric label="Risk" value={publisher.risk_level} />
        </div>
      </article>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailPanel title="Ad slots" items={snapshot.adSlots.map((slot) => `${slot.slot_name} / ${slot.ad_format}`)} action="Add slot" onAction={onAddSlot} />
        <DetailPanel title="Commercial terms" items={snapshot.contractTerms.map((term) => `${term.billing_model} / ${term.payment_terms}`)} action="Add terms" onAction={onAddTerm} />
        <DetailPanel title="Integration" items={snapshot.integrationProjects.map((project) => `${project.integration_type} / ${project.status}`)} action="Open wizard" onAction={onOpenIntegration} />
        <DetailPanel title="Commercial test" items={snapshot.commercialTests.map((test) => `${test.test_name} / ${test.status}`)} action="Open test" onAction={onOpenTest} />
      </div>
    </div>
  );
}

function IntegrationWizard({
  publisher,
  state,
  onSubmit
}: {
  publisher: Publisher;
  state: MediaWorkflowState;
  onSubmit: () => void;
}) {
  const project = state.integrationProjects.find((candidate) => candidate.publisher_id === publisher.id);
  const steps = [
    ["VAST / SDK config", Boolean(project?.checklist.vast_tag_received ?? project?.checklist.sdk_configured)],
    ["Callback verified", Boolean(project?.checklist.callback_verified)],
    ["Production logs checked", Boolean(project?.checklist.production_logs_checked)]
  ] as const;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xl font-semibold text-slate-950">Technical go-live wizard</p>
          <p className="mt-1 text-sm text-slate-500">{publisher.name}</p>
        </div>
        <Wrench className="size-6 text-blue-600" aria-hidden="true" />
      </div>
      <div className="mt-5 space-y-3">
        {steps.map(([label, done]) => (
          <div key={label} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <StatusBadge tone={done ? "success" : "warning"}>{done ? "done" : "pending"}</StatusBadge>
          </div>
        ))}
      </div>
      <button className="mt-5 h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white" type="button" onClick={onSubmit}>
        Submit production validation
      </button>
    </article>
  );
}

function CommercialTestWorkspace({
  publisher,
  tests,
  onCreateTest,
  onPassLatestTest
}: {
  publisher: Publisher;
  tests: MediaWorkflowState["commercialTests"];
  onCreateTest: () => void;
  onPassLatestTest: () => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xl font-semibold text-slate-950">Commercial test workspace</p>
          <p className="mt-1 text-sm text-slate-500">{publisher.name}</p>
        </div>
        <TestTube2 className="size-6 text-blue-600" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {(tests.length ? tests : []).map((test) => (
          <div key={test.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">{test.test_name}</p>
            <div className="mt-3">
              <StatusBadge tone={toneForStatus(test.status)}>{test.status}</StatusBadge>
            </div>
            <p className="mt-3 text-xs leading-5 text-slate-500">
              Fill {(test.fill_rate * 100).toFixed(1)}% / Clear {(test.clear_rate * 100).toFixed(1)}% / IVT {(test.ivt_rate * 100).toFixed(1)}%
            </p>
          </div>
        ))}
        {tests.length === 0 ? <p className="text-sm text-slate-500">No commercial test exists for this publisher.</p> : null}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700" type="button" onClick={onCreateTest}>
          Create test
        </button>
        <button className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white" type="button" onClick={onPassLatestTest}>
          Submit pass conclusion
        </button>
      </div>
    </article>
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

function DetailPanel({
  title,
  items,
  action,
  onAction
}: {
  title: string;
  items: string[];
  action: string;
  onAction: () => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-950">{title}</h2>
        <button className="h-9 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700" type="button" onClick={onAction}>
          {action}
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {items.length ? (
          items.map((item) => (
            <div key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {item}
            </div>
          ))
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">No data yet. Add the next item to continue readiness.</p>
        )}
      </div>
    </article>
  );
}
