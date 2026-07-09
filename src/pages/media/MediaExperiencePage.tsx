import { useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Map, Plus, Send, ShieldAlert, Target, TestTube2, Wrench } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { SummaryCard } from "../../components/SummaryCard";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { chinaMediaEcosystemService, mediaEcosystemTrackLabels } from "../../services/chinaMediaEcosystemService";
import { mediaWorkflowService } from "../../services/mediaWorkflowService";
import type {
  AuditEvent,
  BusinessUser,
  EntityId,
  MediaEcosystemLead,
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
  const trackOpportunities = chinaMediaEcosystemService.getTrackOpportunities(state);
  const pipeline = chinaMediaEcosystemService.getPipeline(state);
  const selectedLead = state.mediaEcosystemLeads.find((lead) => lead.id === selectedLeadId) ?? state.mediaEcosystemLeads[0];
  const selectedCandidate = selectedLead
    ? state.trustedSupplyCandidates.find((candidate) => candidate.lead_id === selectedLead.id)
    : undefined;
  const eligibility = selectedLead ? chinaMediaEcosystemService.evaluateTrustedSupplyEligibility(selectedLead) : undefined;
  const selectedActivities = selectedLead
    ? state.mediaOutreachActivities.filter((activity) => activity.lead_id === selectedLead.id).slice(0, 5)
    : [];

  return (
    <div className="space-y-6">
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
            <p className="text-sm font-semibold text-slate-900">Opportunity pool</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">Every lead needs an owner, a score, a stage, and a next action.</p>
          </div>
          {state.mediaEcosystemLeads.map((lead) => (
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
                <StatusBadge tone={lead.risk_level === "critical" || lead.risk_level === "high" ? "danger" : "neutral"}>
                  {lead.risk_level}
                </StatusBadge>
              </div>
            </button>
          ))}
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
              <ScoreBreakdownPanel lead={selectedLead} />
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

function ScoreBreakdownPanel({ lead }: { lead: MediaEcosystemLead }) {
  const rows = [
    ["Strategic value", lead.score_breakdown.strategic_value, 20],
    ["User scale growth", lead.score_breakdown.user_scale_growth, 15],
    ["Ad scenario value", lead.score_breakdown.ad_scenario_value, 15],
    ["Programmatic feasibility", lead.score_breakdown.programmatic_feasibility, 15],
    ["Advertiser demand match", lead.score_breakdown.advertiser_demand_match, 15],
    ["Commercial negotiability", lead.score_breakdown.commercial_negotiability, 10],
    ["Risk compliance control", lead.score_breakdown.risk_compliance_control, 10]
  ] as const;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <h2 className="text-base font-semibold text-slate-950">Priority score</h2>
      <div className="mt-4 space-y-2">
        {rows.map(([label, value, max]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-sm text-slate-600">{label}</span>
            <span className="text-sm font-semibold text-slate-950">
              {value}/{max}
            </span>
          </div>
        ))}
      </div>
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
