import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ClipboardCheck, FileCheck2, History, ReceiptText, ShieldAlert, WalletCards } from "lucide-react";
import { BusinessStagePath } from "../../components/BusinessStagePath";
import { MetricStrip, NextActionBar, OperatingPageHeader } from "../../components/OperatingPage";
import { StatusBadge } from "../../components/StatusBadge";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { financeSettlementService } from "../../services/financeSettlementService";
import type { AuditEvent, BusinessUser, EntityId, FinanceWorkflowState, MediaWorkflowState, SalesWorkflowState } from "../../types/domain";
import type { GuardResult } from "../../types/guards";
import { getRoleDisplayName, getRouteDisplayTitle, getRoutePageType, useLocale } from "../../lib/i18n";
import {
  getFinancePrimaryAction,
  getFinanceStatusLabel,
  getFinanceSteps,
  type FinancePrimaryAction
} from "./financeSettlementPageModel";
import { getBusinessGuardMessage } from "../businessGuardMessage";

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
  const { locale, t } = useLocale();
  const [activeSettlementId, setActiveSettlementId] = useState<EntityId>(selectedSettlementId ?? "settlement-clean");
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [workspaceView, setWorkspaceView] = useState<"operations" | "evidence">("operations");
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
  const blockingDiagnostics = snapshot.diagnosticCases.filter(
    (diagnosticCase) => diagnosticCase.is_blocking_settlement && !["closed", "rejected"].includes(diagnosticCase.status)
  );
  const primaryAction = selectedSettlement ? getFinancePrimaryAction(selectedSettlement) : undefined;
  const stageSteps = selectedSettlement ? getFinanceSteps(selectedSettlement, blockingDiagnostics.length > 0) : [];
  const actionLabels: Record<FinancePrimaryAction, string> = {
    reconcile: t("finance.reconcile"),
    confirm: t("finance.confirm"),
    issueInvoice: t("finance.issueInvoice"),
    markPaid: t("finance.markPaid")
  };

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

  function runPrimaryAction(action: FinancePrimaryAction) {
    if (action === "reconcile") {
      runAction(actionLabels[action], () => financeSettlementService.completeReconciliation(state, user, selectedSettlement!.id, -120));
    } else if (action === "confirm") {
      runAction(actionLabels[action], () => financeSettlementService.confirmSettlement(state, mediaState, user, selectedSettlement!.id));
    } else if (action === "issueInvoice") {
      runAction(actionLabels[action], () => financeSettlementService.issueInvoice(state, user, selectedSettlement!.id));
    } else {
      runAction(actionLabels[action], () => financeSettlementService.markPaid(state, user, selectedSettlement!.id));
    }
  }

  if (!selectedSettlement) {
    return (
      <section className="space-y-4">
        <StatusBadge tone="info">{getRoutePageType(route, locale)}</StatusBadge>
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">{getRouteDisplayTitle(route, locale)}</h1>
        <p className="text-sm text-slate-500">{t("finance.noSettlements")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <OperatingPageHeader
        title={getRouteDisplayTitle(route, locale)}
        description={t("finance.description")}
        pageType={getRoutePageType(route, locale)}
        role={getRoleDisplayName(role.code, locale)}
        status={<StatusBadge tone={statusTone[selectedSettlement.status]}>{getFinanceStatusLabel(selectedSettlement.status, locale)}</StatusBadge>}
      />

      <MetricStrip
        label={getRouteDisplayTitle(route, locale)}
        items={[
          { label: t("finance.pendingReview"), value: String(summary.pendingReview), tone: "warning" },
          { label: t("finance.exceptionReview"), value: String(summary.exceptionReview), tone: summary.exceptionReview ? "danger" : "neutral" },
          { label: t("finance.unreconciled"), value: String(summary.unreconciled), tone: summary.unreconciled ? "warning" : "success" },
          { label: t("finance.openDisputes"), value: String(summary.openDisputes), tone: summary.openDisputes ? "danger" : "success" }
        ]}
      />

      {message ? <GuardNotice message={message} /> : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <SettlementQueue
          settlements={state.settlements}
          selectedSettlementId={selectedSettlement.id}
          onSelect={setActiveSettlementId}
          locale={locale}
          title={t("finance.queue")}
          description={t("finance.queueDescription")}
        />

        <main className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1" role="tablist">
            <WorkspaceTab active={workspaceView === "operations"} icon={ClipboardCheck} label={t("common.operations")} onClick={() => setWorkspaceView("operations")} />
            <WorkspaceTab active={workspaceView === "evidence"} icon={History} label={t("common.evidenceHistory")} onClick={() => setWorkspaceView("evidence")} />
          </div>

          <NextActionBar
            heading={t("finance.settlementDecision")}
            status={blockingDiagnostics.length ? t("common.blocked") : selectedSettlement.status === "paid" ? t("common.complete") : t("common.inProgress")}
            statusTone={blockingDiagnostics.length ? "danger" : selectedSettlement.status === "paid" ? "success" : "info"}
            nextActionLabel={t("workbench.nextAction")}
            nextAction={primaryAction ? actionLabels[primaryAction] : t("finance.noAction")}
            ownerLabel={t("workbench.owner")}
            owner={getRoleDisplayName("finance_manager", locale)}
            blockerLabel={t("workbench.blocker")}
            blocker={blockingDiagnostics[0]?.current_blocker ?? blockingDiagnostics[0]?.case_type}
            dueDateLabel={t("finance.dueDate")}
            dueDate={selectedSettlement.due_date ?? t("common.noDueDate")}
            actionLabel={primaryAction ? actionLabels[primaryAction] : undefined}
            onAction={primaryAction ? () => runPrimaryAction(primaryAction) : undefined}
          />

          {workspaceView === "operations" ? (
            <>
              <BusinessStagePath
                title={t("common.stagePath")}
                stages={stageSteps.map((step) => ({
                  ...step,
                  label: t(`finance.${step.key}`)
                }))}
                stateLabels={{ complete: t("common.complete"), active: t("common.inProgress"), blocked: t("common.blocked"), pending: t("common.pending") }}
              />

          <Panel title={t("finance.summary")} icon={<WalletCards className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label={t("finance.publisher")} value={snapshot.publisher?.name ?? "-"} />
              <Metric label={t("finance.campaign")} value={snapshot.campaign?.name ?? "-"} />
              <Metric label={t("finance.dueDate")} value={selectedSettlement.due_date ?? "-"} />
              <Metric label={t("finance.grossAmount")} value={formatMoney(selectedSettlement.gross_amount, selectedSettlement.currency)} />
              <Metric label={t("finance.payable")} value={formatMoney(selectedSettlement.payable_amount, selectedSettlement.currency)} tone="success" />
              <Metric label={t("finance.delta")} value={formatMoney(selectedSettlement.reconciliation_delta, selectedSettlement.currency)} tone={selectedSettlement.reconciliation_delta ? "warning" : "success"} />
            </div>
          </Panel>

          <Panel title={t("finance.reconciliation")} icon={<FileCheck2 className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label={t("finance.completed")} value={selectedSettlement.reconciliationCompleted ? t("common.complete") : t("common.pending")} />
              <Metric label={t("finance.adjustment")} value={formatMoney(selectedSettlement.adjustment_amount, selectedSettlement.currency)} />
              <Metric label={t("finance.reviewStatus")} value={getFinanceStatusLabel(selectedSettlement.status, locale)} tone={selectedSettlement.status === "exception_review" ? "danger" : "neutral"} />
            </div>
          </Panel>

          <Panel title={t("finance.invoicePayment")} icon={<ReceiptText className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label={t("finance.invoiceNo")} value={selectedSettlement.invoice_no ?? "-"} />
              <Metric label={t("finance.invoiceIssued")} value={selectedSettlement.invoice_issued_at ? t("common.complete") : t("common.pending")} />
              <Metric label={t("finance.paid")} value={selectedSettlement.paid_at ? t("common.complete") : t("common.pending")} tone={selectedSettlement.status === "paid" ? "success" : "neutral"} />
            </div>
          </Panel>
            </>
          ) : (
            <RightRail snapshot={snapshot} locale={locale} labels={{ blockers: t("finance.diagnosticBlockers"), recent: t("finance.recentActivity"), empty: t("finance.noBlockers") }} />
          )}
        </main>
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

function SettlementQueue({
  settlements,
  selectedSettlementId,
  onSelect,
  locale,
  title,
  description
}: {
  settlements: FinanceWorkflowState["settlements"];
  selectedSettlementId: EntityId;
  onSelect: (id: EntityId) => void;
  locale: "en-US" | "zh-CN";
  title: string;
  description: string;
}) {
  return (
    <aside className="space-y-3">
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
        <p className="text-sm font-semibold text-slate-950">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
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
            <StatusBadge tone={statusTone[settlement.status]}>{getFinanceStatusLabel(settlement.status, locale)}</StatusBadge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{formatMoney(settlement.payable_amount, settlement.currency)}</p>
        </button>
      ))}
    </aside>
  );
}

function RightRail({
  snapshot,
  locale,
  labels
}: {
  snapshot: ReturnType<typeof financeSettlementService.getSettlementSnapshot>;
  locale: "en-US" | "zh-CN";
  labels: { blockers: string; recent: string; empty: string };
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title={labels.blockers}>
        <div className="space-y-2">
          {snapshot.diagnosticCases.map((diagnosticCase) => (
            <div key={diagnosticCase.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-slate-900">{diagnosticCase.case_no}</p>
                <StatusBadge tone={diagnosticCase.is_blocking_settlement ? "danger" : "neutral"}>{getFinanceStatusLabel(diagnosticCase.status, locale)}</StatusBadge>
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{diagnosticCase.current_blocker ?? diagnosticCase.case_type}</p>
            </div>
          ))}
          {snapshot.diagnosticCases.length === 0 ? <p className="text-sm text-slate-500">{labels.empty}</p> : null}
        </div>
      </Panel>

      <Panel title={labels.recent}>
        <div className="space-y-3">
          {snapshot.activities.slice(0, 4).map((activity) => (
            <div key={activity.id} className="border-l-2 border-blue-200 pl-3">
              <p className="text-sm font-medium text-slate-800">{activity.event}</p>
              <p className="mt-1 text-xs text-slate-500">{getRoleDisplayName(activity.actor_role, locale)}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function WorkspaceTab({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof ClipboardCheck; label: string; onClick: () => void }) {
  return (
    <button
      className={`inline-flex min-w-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="break-words">{label}</span>
    </button>
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
