import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileText, ListChecks, Plus, Send, ShieldAlert } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { SummaryCard } from "../../components/SummaryCard";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { diagnosticWorkflowService } from "../../services/diagnosticWorkflowService";
import type { BusinessUser, EntityId, MediaWorkflowState, SalesWorkflowState } from "../../types/domain";
import type { GuardResult } from "../../types/guards";

type DiagnosticCasePageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  state: MediaWorkflowState;
  salesState: SalesWorkflowState;
  onStateChange: (state: MediaWorkflowState) => void;
};

type ActionMessage = {
  title: string;
  guard: GuardResult;
};

const statusTone = {
  opened: "warning",
  triage: "warning",
  evidence_collection: "warning",
  root_cause_analysis: "warning",
  action_required: "danger",
  conclusion_ready: "info",
  closed: "success",
  rejected: "neutral"
} as const;

const severityTone = {
  low: "neutral",
  medium: "warning",
  high: "danger",
  critical: "danger"
} as const;

export function DiagnosticCasePage({ route, role, user, state, salesState, onStateChange }: DiagnosticCasePageProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<EntityId>("diagnostic-dc-001");
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const summary = diagnosticWorkflowService.getSummary(state);
  const selectedCase = state.diagnosticCases.find((diagnosticCase) => diagnosticCase.id === selectedCaseId) ?? state.diagnosticCases[0];
  const snapshot = useMemo(
    () => diagnosticWorkflowService.getCaseSnapshot(state, selectedCase?.id ?? ""),
    [selectedCase?.id, state]
  );
  const affectedCampaigns = selectedCase
    ? salesState.campaigns.filter(
        (campaign) =>
          campaign.id === selectedCase.campaign_id ||
          campaign.publisherIds.some((publisherId) => publisherId === selectedCase.publisher_id)
      )
    : [];

  function runAction(title: string, action: () => ReturnType<typeof diagnosticWorkflowService.closeDiagnosticCase>) {
    const result = action();
    onStateChange(result.state);
    setMessage({ title, guard: result.guard });
  }

  if (!selectedCase) {
    return (
      <section className="space-y-4">
        <StatusBadge tone="info">{route.service}</StatusBadge>
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">{route.title}</h1>
        <p className="text-sm text-slate-500">No diagnostic cases are available.</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge tone="info">{route.service}</StatusBadge>
            <StatusBadge tone="neutral">{role.name}</StatusBadge>
            <StatusBadge tone={statusTone[selectedCase.status]}>{selectedCase.status}</StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">{selectedCase.case_no} Diagnostic Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {selectedCase.case_type} investigation for {snapshot.publisher?.name ?? "cross-object"} impact and downstream blockers.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          type="button"
          onClick={() =>
            runAction("Submit conclusion", () =>
              diagnosticWorkflowService.submitConclusion(state, user, selectedCase.id, {
                rootCause: "Traffic quality variance was caused by publisher timeout and floor configuration drift.",
                responsibilityOwner: selectedCase.owner_role ?? "data_analyst",
                conclusion: "Evidence supports a controlled rollback and monitoring plan.",
                followUpAction: "Create owner task to monitor the next two launches and update SOP."
              })
            )
          }
        >
          <Send className="size-4" aria-hidden="true" />
          Submit conclusion
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="High priority" value={String(summary.highPriority)} tone={summary.highPriority ? "danger" : "neutral"} />
        <SummaryCard label="Case type" value={selectedCase.case_type.replace(/_/g, " ")} />
        <SummaryCard label="Affected campaigns" value={String(selectedCase.affected_campaign_count ?? affectedCampaigns.length)} />
        <SummaryCard label="Owner" value={selectedCase.owner_role ?? "unassigned"} tone="warning" />
        <SummaryCard label="Conclusion ready" value={String(summary.conclusionReady)} tone={summary.conclusionReady ? "success" : "warning"} />
      </div>

      {message ? <GuardNotice message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr_320px]">
        <CaseQueue cases={state.diagnosticCases} selectedCaseId={selectedCase.id} onSelect={setSelectedCaseId} />

        <main className="space-y-4">
          <Panel title="Exception summary" icon={<AlertTriangle className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-2">
              <Metric label="Severity" value={selectedCase.severity} tone={severityTone[selectedCase.severity]} />
              <Metric label="Publisher" value={snapshot.publisher?.name ?? "-"} />
              <Metric label="Sales scale blocker" value={selectedCase.is_blocking_sales_scale ? "yes" : "no"} />
              <Metric label="Settlement blocker" value={selectedCase.is_blocking_settlement ? "yes" : "no"} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{selectedCase.current_blocker ?? "No current blocker recorded."}</p>
          </Panel>

          <Panel title="Transaction funnel" icon={<ListChecks className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              {snapshot.evidence.slice(0, 3).map((evidence) => (
                <Metric
                  key={evidence.id}
                  label={evidence.metric_name ?? evidence.evidence_type}
                  value={formatEvidenceMetric(evidence.baseline_value, evidence.current_value)}
                  tone={evidence.status === "accepted" ? "success" : "warning"}
                />
              ))}
              {snapshot.evidence.length === 0 ? <p className="text-sm text-slate-500">No funnel evidence has been attached.</p> : null}
            </div>
          </Panel>

          <Panel title="Evidence list" icon={<FileText className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="space-y-2">
              {snapshot.evidence.map((evidence) => (
                <div key={evidence.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <div>
                    <p className="font-medium text-slate-800">{evidence.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{evidence.source}</p>
                  </div>
                  <StatusBadge tone={evidence.status === "accepted" ? "success" : "warning"}>{evidence.status}</StatusBadge>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Add evidence", () =>
                    diagnosticWorkflowService.addEvidence(state, user, selectedCase.id, {
                      title: "Fresh funnel snapshot attached",
                      evidenceType: "funnel_metric",
                      source: "Diagnostic workspace",
                      metricName: "clear_rate",
                      baselineValue: 0.68,
                      currentValue: 0.47
                    })
                  )
                }
              >
                <Plus className="size-4" aria-hidden="true" />
                Add evidence
              </button>
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Start root cause analysis", () =>
                    diagnosticWorkflowService.moveToRootCauseAnalysis(state, user, selectedCase.id)
                  )
                }
              >
                Start root cause
              </button>
              <button
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Close case", () => diagnosticWorkflowService.closeDiagnosticCase(state, user, selectedCase.id))
                }
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Close case
              </button>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Attribution analysis">
              <p className="text-sm leading-6 text-slate-600">{selectedCase.root_cause ?? "Root cause is pending evidence review."}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-normal text-slate-500">Responsibility owner</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedCase.responsibility_owner ?? selectedCase.owner_role ?? "unassigned"}</p>
            </Panel>
            <Panel title="Conclusion and action">
              <p className="text-sm leading-6 text-slate-600">{selectedCase.conclusion ?? "Conclusion has not been submitted."}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-normal text-slate-500">Follow-up action</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">{selectedCase.follow_up_action ?? selectedCase.next_action ?? "-"}</p>
            </Panel>
          </div>
        </main>

        <RightRail state={state} caseId={selectedCase.id} currentCase={selectedCase} />
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

function CaseQueue({
  cases,
  selectedCaseId,
  onSelect
}: {
  cases: MediaWorkflowState["diagnosticCases"];
  selectedCaseId: EntityId;
  onSelect: (id: EntityId) => void;
}) {
  return (
    <aside className="space-y-3">
      {cases.map((diagnosticCase) => (
        <button
          key={diagnosticCase.id}
          className={`w-full rounded-lg border p-3 text-left text-sm ${
            selectedCaseId === diagnosticCase.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
          }`}
          type="button"
          onClick={() => onSelect(diagnosticCase.id)}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{diagnosticCase.case_no}</p>
            <StatusBadge tone={statusTone[diagnosticCase.status]}>{diagnosticCase.status}</StatusBadge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{diagnosticCase.case_type.replace(/_/g, " ")}</p>
        </button>
      ))}
    </aside>
  );
}

function RightRail({
  state,
  caseId,
  currentCase
}: {
  state: MediaWorkflowState;
  caseId: EntityId;
  currentCase: MediaWorkflowState["diagnosticCases"][number];
}) {
  const activities = state.diagnosticActivities
    .filter((activity) => activity.diagnostic_case_id === caseId)
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 3);

  return (
    <aside className="space-y-4">
      <Panel title="Right rail">
        <RailItem label="Current owner" value={currentCase.owner_role ?? "unassigned"} />
        <RailItem label="Current blocker" value={currentCase.current_blocker ?? "-"} />
        <RailItem label="Next action" value={currentCase.next_action ?? "-"} />
        <RailItem label="Related SOP" value="Quality diagnostic evidence and conclusion SOP" />
      </Panel>
      <Panel title="Recent activity">
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="border-l-2 border-blue-200 pl-3">
              <p className="text-sm font-medium text-slate-800">{activity.event}</p>
              <p className="mt-1 text-xs text-slate-500">{activity.actor_role}</p>
            </div>
          ))}
        </div>
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

function RailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral"
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  const toneClasses = {
    neutral: "bg-slate-50 text-slate-950",
    success: "bg-emerald-50 text-emerald-900",
    warning: "bg-amber-50 text-amber-900",
    danger: "bg-rose-50 text-rose-900"
  };

  return (
    <div className={`rounded-lg border border-slate-200 p-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function formatEvidenceMetric(baseline?: number, current?: number) {
  if (baseline === undefined || current === undefined) {
    return "-";
  }

  return `${Math.round(baseline * 100)}% -> ${Math.round(current * 100)}%`;
}
