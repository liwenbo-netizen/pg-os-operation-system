import { useMemo, useState, type ReactNode } from "react";
import { BookOpen, FilePlus2, Search, ShieldAlert } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { SummaryCard } from "../../components/SummaryCard";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { sopService } from "../../services/sopService";
import type { BusinessUser, EntityId, GuideWorkflowState, SopCard } from "../../types/domain";
import type { GuardResult } from "../../types/guards";
import { getRoleDisplayName, getRouteDisplayTitle, getRoutePageType, useLocale } from "../../lib/i18n";

type GuideCenterPageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  state: GuideWorkflowState;
  onStateChange: (state: GuideWorkflowState) => void;
};

type ActionMessage = {
  title: string;
  guard: GuardResult;
};

const statusTone = {
  draft: "warning",
  published: "success",
  deprecated: "neutral"
} as const;

const priorityTone = {
  P0: "danger",
  P1: "warning",
  Reference: "neutral"
} as const;

export function GuideCenterPage({ route, role, user, state, onStateChange }: GuideCenterPageProps) {
  const { locale } = useLocale();
  const [query, setQuery] = useState("settlement");
  const [moduleFilter, setModuleFilter] = useState<SopCard["module"] | "All">("All");
  const [selectedSopId, setSelectedSopId] = useState<EntityId>("sop-finance-settlement-confirm");
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const summary = sopService.getSummary(state);
  const filteredCards = useMemo(
    () =>
      sopService.searchSopCards(state, {
        query,
        role: user.activeRole,
        module: moduleFilter === "All" ? undefined : moduleFilter
      }),
    [moduleFilter, query, state, user.activeRole]
  );
  const recommendations = sopService.getRoleRecommendations(state, user).slice(0, 4);
  const selectedSop = state.sopCards.find((sopCard) => sopCard.id === selectedSopId) ?? filteredCards[0] ?? state.sopCards[0];
  const snapshot = useMemo(() => sopService.getSopSnapshot(state, selectedSop?.id ?? ""), [selectedSop?.id, state]);

  function runAction(title: string, action: () => ReturnType<typeof sopService.openSopCard>) {
    const result = action();
    onStateChange(result.state);
    setMessage({ title, guard: result.guard });
  }

  if (!selectedSop) {
    return (
      <section className="space-y-4">
        <StatusBadge tone="info">{getRoutePageType(route, locale)}</StatusBadge>
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">{getRouteDisplayTitle(route, locale)}</h1>
        <p className="text-sm text-slate-500">No SOP cards are available.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone="info">{getRoutePageType(route, locale)}</StatusBadge>
            <StatusBadge tone="neutral">{getRoleDisplayName(role.code, locale)}</StatusBadge>
            <StatusBadge tone={statusTone[selectedSop.status]}>{selectedSop.status}</StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">{getRouteDisplayTitle(route, locale)}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Search role-based SOP cards, open operating steps, and publish workflow guidance for PG OS business operations.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          type="button"
          onClick={() => runAction("Open SOP", () => sopService.openSopCard(state, user, selectedSop.id))}
        >
          <BookOpen className="size-4" aria-hidden="true" />
          Open SOP
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Total SOP" value={String(summary.total)} />
        <SummaryCard label="Published" value={String(summary.published)} tone="success" />
        <SummaryCard label="P0 SOP" value={String(summary.p0)} tone="danger" />
        <SummaryCard label="Modules" value={String(summary.modules)} />
        <SummaryCard label="Draft" value={String(summary.draft)} tone={summary.draft ? "warning" : "neutral"} />
      </div>

      {message ? <GuardNotice message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr_320px]">
        <aside className="space-y-4">
          <Panel title="Search">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm">
              <Search className="size-4 text-slate-400" aria-hidden="true" />
              <input
                className="w-full bg-transparent outline-none"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search SOP"
              />
            </label>
            <select
              className="mt-3 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
              value={moduleFilter}
              onChange={(event) => setModuleFilter(event.target.value as SopCard["module"] | "All")}
            >
              {["All", "Common", "Media", "Sales", "Campaigns", "Diagnostics", "Finance", "Contracts", "Admin"].map((module) => (
                <option key={module} value={module}>
                  {module}
                </option>
              ))}
            </select>
          </Panel>

          <Panel title="SOP cards">
            <div className="space-y-2">
              {filteredCards.map((sopCard) => (
                <button
                  key={sopCard.id}
                  className={`w-full rounded-lg border p-3 text-left text-sm ${
                    selectedSop.id === sopCard.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                  type="button"
                  onClick={() => setSelectedSopId(sopCard.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{sopCard.title}</p>
                    <StatusBadge tone={priorityTone[sopCard.priority]}>{sopCard.priority}</StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{sopCard.module} / {sopCard.scenario}</p>
                </button>
              ))}
              {filteredCards.length === 0 ? <p className="text-sm text-slate-500">No matching SOP cards.</p> : null}
            </div>
          </Panel>
        </aside>

        <main className="space-y-4">
          <Panel title={selectedSop.title} icon={<BookOpen className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="mb-4 flex flex-wrap gap-2">
              <StatusBadge tone={statusTone[selectedSop.status]}>{selectedSop.status}</StatusBadge>
              <StatusBadge tone={priorityTone[selectedSop.priority]}>{selectedSop.priority}</StatusBadge>
              <StatusBadge tone="neutral">{`v${selectedSop.version}`}</StatusBadge>
            </div>
            <p className="text-sm leading-6 text-slate-600">{selectedSop.summary}</p>
            <div className="mt-5 space-y-3">
              {selectedSop.steps.map((step, index) => (
                <div key={`${selectedSop.id}-${step}`} className="flex gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                    {index + 1}
                  </span>
                  <p className="leading-6 text-slate-700">{step}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Publish and update">
            <div className="grid gap-3 md:grid-cols-2">
              <Metric label="Owner" value={selectedSop.owner_role} />
              <Metric label="Related service" value={selectedSop.related_service ?? "-"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Create SOP draft", () =>
                    sopService.createDraftSop(state, user, {
                      title: "Campaign launch guard escalation",
                      module: "Campaigns",
                      scenario: "Launch guard escalation",
                      ownerRole: "operations_director",
                      visibleRoles: ["adops_manager", "operations_director", "customer_success_manager", "audit_viewer"],
                      priority: "P1",
                      summary: "Escalate repeated launch guard blockers into diagnostic action.",
                      steps: ["Run launch guard", "Create diagnostic case when blocker repeats", "Request approval after blocker is resolved"],
                      relatedRoute: "/campaigns/:id/wizard",
                      relatedService: "CampaignService"
                    })
                  )
                }
              >
                <FilePlus2 className="size-4" aria-hidden="true" />
                Create draft
              </button>
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() => runAction("Publish SOP", () => sopService.publishSop(state, user, selectedSop.id))}
              >
                Publish
              </button>
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Update SOP steps", () =>
                    sopService.updateSopSteps(
                      state,
                      user,
                      selectedSop.id,
                      [...selectedSop.steps, "Record the SOP activity and notify accountable owner."],
                      `${selectedSop.summary} Updated with owner notification.`
                    )
                  )
                }
              >
                Update steps
              </button>
            </div>
          </Panel>
        </main>

        <RightRail snapshot={snapshot} recommendations={recommendations} />
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
            <p className="mt-1 text-sm text-slate-500">Owner to unblock: {message.guard.required_approval_role}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function RightRail({
  snapshot,
  recommendations
}: {
  snapshot: ReturnType<typeof sopService.getSopSnapshot>;
  recommendations: SopCard[];
}) {
  return (
    <aside className="space-y-4">
      <Panel title="Role recommendations">
        <div className="space-y-2">
          {recommendations.map((sopCard) => (
            <div key={sopCard.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="font-semibold text-slate-900">{sopCard.title}</p>
              <p className="mt-1 text-xs text-slate-500">{sopCard.module} / {sopCard.priority}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Recent activity">
        <div className="space-y-3">
          {snapshot.activities.slice(0, 4).map((activity) => (
            <div key={activity.id} className="border-l-2 border-blue-200 pl-3">
              <p className="text-sm font-medium text-slate-800">{activity.event}</p>
              <p className="mt-1 text-xs text-slate-500">{activity.actor_role}</p>
            </div>
          ))}
        </div>
      </Panel>
      <Panel title="Linked target">
        <Metric label="Route" value={snapshot.sopCard?.related_route ?? "-"} />
      </Panel>
    </aside>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <p className="text-base font-semibold text-slate-950">{title}</p>
      </div>
      {children}
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
