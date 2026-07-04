import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, FileCheck2, ReceiptText, ShieldAlert, WalletCards } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { SummaryCard } from "../../components/SummaryCard";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { financeSettlementService } from "../../services/financeSettlementService";
import type { AuditEvent, BusinessUser, EntityId, FinanceWorkflowState, MediaWorkflowState, SalesWorkflowState } from "../../types/domain";
import type { GuardResult } from "../../types/guards";

type FinanceSettlementPageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  state: FinanceWorkflowState;
  mediaState: MediaWorkflowState;
  salesState: SalesWorkflowState;
  selectedSettlementId?: EntityId;
  onStateChange: (state: FinanceWorkflowState) => void;
  onAuditEvent: (event: AuditEvent) => void;
};

type ActionMessage = {
  title: string;
  guard: GuardResult;
};

const statusTone = {
  draft: "neutral",
  reconciling: "warning",
  pending_review: "warning",
  exception_review: "danger",
  confirmed: "success",
  invoiced: "info",
  paid: "success",
  blocked: "danger",
  cancelled: "neutral"
} as const;

export function FinanceSettlementPage({
  route,
  role,
  user,
  state,
  mediaState,
  salesState,
  selectedSettlementId,
  onStateChange,
  onAuditEvent
}: FinanceSettlementPageProps) {
  const [activeSettlementId, setActiveSettlementId] = useState<EntityId>(selectedSettlementId ?? "settlement-clean");
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const summary = financeSettlementService.getSummary(state, mediaState);
  const selectedSettlement =
    state.settlements.find((settlement) => settlement.id === activeSettlementId) ?? state.settlements[0];
  const snapshot = useMemo(
    () =>
      financeSettlementService.getSettlementSnapshot(
        state,
        mediaState,
        salesState,
        selectedSettlement?.id ?? ""
      ),
    [mediaState, salesState, selectedSettlement?.id, state]
  );

  useEffect(() => {
    if (selectedSettlementId) {
      setActiveSettlementId(selectedSettlementId);
    }
  }, [selectedSettlementId]);

  function runAction(title: string, action: () => ReturnType<typeof financeSettlementService.confirmSettlement>) {
    const result = action();
    onStateChange(result.state);
    if (result.auditEvent) {
      onAuditEvent(result.auditEvent);
    }
    setMessage({ title, guard: result.guard });
  }

  if (!selectedSettlement) {
    return (
      <section className="space-y-4">
        <StatusBadge tone="info">{route.service}</StatusBadge>
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">{route.title}</h1>
        <p className="text-sm text-slate-500">No settlements are available.</p>
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
            <StatusBadge tone={statusTone[selectedSettlement.status]}>{selectedSettlement.status}</StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">Settlement Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Confirm publisher payable amount, handle diagnostic blockers, issue invoice, and close payment status.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          type="button"
          onClick={() =>
            runAction("Confirm settlement", () =>
              financeSettlementService.confirmSettlement(state, mediaState, user, selectedSettlement.id)
            )
          }
        >
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Confirm settlement
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Pending review" value={String(summary.pendingReview)} tone="warning" />
        <SummaryCard label="Exception review" value={String(summary.exceptionReview)} tone={summary.exceptionReview ? "danger" : "neutral"} />
        <SummaryCard label="Unreconciled" value={String(summary.unreconciled)} tone={summary.unreconciled ? "warning" : "success"} />
        <SummaryCard label="Open disputes" value={String(summary.openDisputes)} tone={summary.openDisputes ? "danger" : "success"} />
        <SummaryCard label="Paid" value={String(summary.paid)} tone="success" />
      </div>

      {message ? <GuardNotice message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr_320px]">
        <SettlementQueue
          settlements={state.settlements}
          selectedSettlementId={selectedSettlement.id}
          onSelect={setActiveSettlementId}
        />

        <main className="space-y-4">
          <Panel title="Settlement summary" icon={<WalletCards className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Publisher" value={snapshot.publisher?.name ?? "-"} />
              <Metric label="Campaign" value={snapshot.campaign?.name ?? "-"} />
              <Metric label="Due date" value={selectedSettlement.due_date ?? "-"} />
              <Metric label="Gross amount" value={formatMoney(selectedSettlement.gross_amount, selectedSettlement.currency)} />
              <Metric label="Payable" value={formatMoney(selectedSettlement.payable_amount, selectedSettlement.currency)} tone="success" />
              <Metric label="Delta" value={formatMoney(selectedSettlement.reconciliation_delta, selectedSettlement.currency)} tone={selectedSettlement.reconciliation_delta ? "warning" : "success"} />
            </div>
          </Panel>

          <Panel title="Reconciliation" icon={<FileCheck2 className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Completed" value={selectedSettlement.reconciliationCompleted ? "yes" : "no"} />
              <Metric label="Adjustment" value={formatMoney(selectedSettlement.adjustment_amount, selectedSettlement.currency)} />
              <Metric label="Review status" value={selectedSettlement.status} tone={selectedSettlement.status === "exception_review" ? "danger" : "neutral"} />
            </div>
            <button
              className="mt-4 h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
              type="button"
              onClick={() =>
                runAction("Complete reconciliation", () =>
                  financeSettlementService.completeReconciliation(state, user, selectedSettlement.id, -120)
                )
              }
            >
              Complete reconciliation
            </button>
          </Panel>

          <Panel title="Invoice and payment" icon={<ReceiptText className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Invoice no" value={selectedSettlement.invoice_no ?? "-"} />
              <Metric label="Invoice issued" value={selectedSettlement.invoice_issued_at ? "yes" : "no"} />
              <Metric label="Paid" value={selectedSettlement.paid_at ? "yes" : "no"} tone={selectedSettlement.status === "paid" ? "success" : "neutral"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Issue invoice", () =>
                    financeSettlementService.issueInvoice(state, user, selectedSettlement.id)
                  )
                }
              >
                Issue invoice
              </button>
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Mark paid", () => financeSettlementService.markPaid(state, user, selectedSettlement.id))
                }
              >
                Mark paid
              </button>
            </div>
          </Panel>
        </main>

        <RightRail snapshot={snapshot} />
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

function SettlementQueue({
  settlements,
  selectedSettlementId,
  onSelect
}: {
  settlements: FinanceWorkflowState["settlements"];
  selectedSettlementId: EntityId;
  onSelect: (id: EntityId) => void;
}) {
  return (
    <aside className="space-y-3">
      {settlements.map((settlement) => (
        <button
          key={settlement.id}
          className={`w-full rounded-lg border p-3 text-left text-sm ${
            selectedSettlementId === settlement.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
          }`}
          type="button"
          onClick={() => onSelect(settlement.id)}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{settlement.id}</p>
            <StatusBadge tone={statusTone[settlement.status]}>{settlement.status}</StatusBadge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{formatMoney(settlement.payable_amount, settlement.currency)}</p>
        </button>
      ))}
    </aside>
  );
}

function RightRail({
  snapshot
}: {
  snapshot: ReturnType<typeof financeSettlementService.getSettlementSnapshot>;
}) {
  return (
    <aside className="space-y-4">
      <Panel title="Diagnostic blockers">
        <div className="space-y-2">
          {snapshot.diagnosticCases.map((diagnosticCase) => (
            <div key={diagnosticCase.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{diagnosticCase.case_no}</p>
                <StatusBadge tone={diagnosticCase.is_blocking_settlement ? "danger" : "neutral"}>{diagnosticCase.status}</StatusBadge>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{diagnosticCase.current_blocker ?? diagnosticCase.case_type}</p>
            </div>
          ))}
          {snapshot.diagnosticCases.length === 0 ? <p className="text-sm text-slate-500">No diagnostic blockers linked.</p> : null}
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

function formatMoney(value?: number, currency = "USD") {
  return `${currency} ${(value ?? 0).toLocaleString()}`;
}
