import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ClipboardCheck, FileSignature, History, Landmark, PenLine, ShieldAlert, type LucideIcon } from "lucide-react";
import { BusinessStagePath } from "../../components/BusinessStagePath";
import { MetricStrip, NextActionBar, OperatingPageHeader } from "../../components/OperatingPage";
import { StatusBadge } from "../../components/StatusBadge";
import type { RoleDefinition } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { contractService } from "../../services/contractService";
import type {
  AuditEvent,
  BusinessUser,
  ContractWorkflowState,
  EntityId,
  FinanceWorkflowState,
  MediaWorkflowState,
  SalesWorkflowState
} from "../../types/domain";
import type { GuardResult } from "../../types/guards";
import { getRoleDisplayName, getRouteDisplayTitle, getRoutePageType, useLocale } from "../../lib/i18n";
import {
  getContractOwner,
  getContractPrimaryAction,
  getContractStatusLabel,
  getContractSteps,
  type ContractPrimaryAction
} from "./contractWorkspacePageModel";
import { getPublisherRiskLabel } from "../media/publisherReadinessPageModel";
import { getBusinessGuardMessage } from "../businessGuardMessage";

type ContractWorkspacePageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  state: ContractWorkflowState;
  mediaState: MediaWorkflowState;
  salesState: SalesWorkflowState;
  financeState: FinanceWorkflowState;
  selectedContractId?: EntityId;
  onStateChange: (state: ContractWorkflowState) => void;
  onAuditEvent: (event: AuditEvent) => void;
};

type ActionMessage = {
  title: string;
  guard: GuardResult;
};

const statusTone = {
  draft: "neutral",
  requested: "warning",
  legal_review: "warning",
  finance_review: "info",
  redline: "danger",
  approved: "success",
  signing: "warning",
  signed: "success",
  archived: "success",
  rejected: "danger",
  cancelled: "neutral"
} as const;

const riskTone = {
  low: "success",
  medium: "warning",
  high: "danger",
  critical: "danger"
} as const;

export function ContractWorkspacePage({
  route,
  role,
  user,
  state,
  mediaState,
  salesState,
  financeState,
  selectedContractId,
  onStateChange,
  onAuditEvent
}: ContractWorkspacePageProps) {
  const { locale, t } = useLocale();
  const [activeContractId, setActiveContractId] = useState<EntityId>(selectedContractId ?? "contract-233-framework");
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const [workspaceView, setWorkspaceView] = useState<"operations" | "evidence">("operations");
  const summary = contractService.getSummary(state);
  const selectedContract = state.contracts.find((contract) => contract.id === activeContractId) ?? state.contracts[0];
  const snapshot = useMemo(
    () =>
      contractService.getContractSnapshot(
        state,
        mediaState,
        salesState,
        financeState,
        selectedContract?.id ?? ""
      ),
    [financeState, mediaState, salesState, selectedContract?.id, state]
  );
  const hasSettlementDispute = snapshot.settlementDisputes.some(
    (diagnosticCase) => !["closed", "rejected"].includes(diagnosticCase.status)
  );
  const primaryAction = selectedContract ? getContractPrimaryAction(selectedContract) : undefined;
  const primaryOwner = selectedContract ? getContractOwner(selectedContract) : "legal_manager";
  const stageSteps = selectedContract ? getContractSteps(selectedContract, hasSettlementDispute) : [];
  const actionLabels: Record<ContractPrimaryAction, string> = {
    startLegalReview: t("contract.startLegalReview"),
    requestFinanceReview: t("contract.requestFinanceReview"),
    approveFinanceTerms: t("contract.approveFinanceTerms"),
    approveLegalReview: t("contract.approveLegalReview"),
    markSigned: t("contract.markSigned"),
    archive: t("contract.archive")
  };

  useEffect(() => {
    if (selectedContractId) {
      setActiveContractId(selectedContractId);
    }
  }, [selectedContractId]);

  function runAction(title: string, action: () => ReturnType<typeof contractService.approveLegalReview>) {
    const result = action();
    onStateChange(result.state);
    if (result.auditEvent) {
      onAuditEvent(result.auditEvent);
    }
    setMessage({ title, guard: result.guard });
  }

  function runPrimaryAction(action: ContractPrimaryAction) {
    if (action === "startLegalReview") {
      runAction(actionLabels[action], () => contractService.startLegalReview(state, user, selectedContract!.id));
    } else if (action === "requestFinanceReview") {
      runAction(actionLabels[action], () => contractService.requestFinanceReview(state, user, selectedContract!.id));
    } else if (action === "approveFinanceTerms") {
      runAction(actionLabels[action], () => contractService.approveFinanceTerms(state, user, selectedContract!.id, "Payment terms verified from workspace."));
    } else if (action === "approveLegalReview") {
      runAction(actionLabels[action], () => contractService.approveLegalReview(state, user, selectedContract!.id, "Legal review approved from workspace."));
    } else if (action === "markSigned") {
      runAction(actionLabels[action], () => contractService.markSigned(state, mediaState, user, selectedContract!.id));
    } else {
      runAction(actionLabels[action], () => contractService.archiveSignedContract(state, user, selectedContract!.id));
    }
  }

  if (!selectedContract) {
    return (
      <section className="space-y-4">
        <StatusBadge tone="info">{getRoutePageType(route, locale)}</StatusBadge>
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">{getRouteDisplayTitle(route, locale)}</h1>
        <p className="text-sm text-slate-500">{t("contract.noContracts")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <OperatingPageHeader
        title={getRouteDisplayTitle(route, locale)}
        description={t("contract.description")}
        pageType={getRoutePageType(route, locale)}
        role={getRoleDisplayName(role.code, locale)}
        status={<StatusBadge tone={statusTone[selectedContract.status]}>{getContractStatusLabel(selectedContract.status, locale)}</StatusBadge>}
      />

      <MetricStrip
        label={getRouteDisplayTitle(route, locale)}
        items={[
          { label: t("contract.legalReview"), value: String(summary.legalReview), tone: "warning" },
          { label: t("contract.financeReview"), value: String(summary.financeReview) },
          { label: t("contract.redline"), value: String(summary.redline), tone: summary.redline ? "danger" : "neutral" },
          { label: t("contract.signing"), value: String(summary.signing), tone: "success" }
        ]}
      />

      {message ? <GuardNotice message={message} /> : null}

      <div className="grid min-w-0 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
        <ContractQueue
          contracts={state.contracts}
          selectedContractId={selectedContract.id}
          onSelect={setActiveContractId}
          locale={locale}
          title={t("contract.queue")}
          description={t("contract.queueDescription")}
        />

        <main className="min-w-0 space-y-4">
          <div className="grid grid-cols-2 rounded-lg border border-slate-200 bg-white p-1" role="tablist">
            <WorkspaceTab active={workspaceView === "operations"} icon={ClipboardCheck} label={t("common.operations")} onClick={() => setWorkspaceView("operations")} />
            <WorkspaceTab active={workspaceView === "evidence"} icon={History} label={t("common.evidenceHistory")} onClick={() => setWorkspaceView("evidence")} />
          </div>

          <NextActionBar
            heading={t("contract.decision")}
            status={hasSettlementDispute || selectedContract.status === "redline" ? t("common.blocked") : selectedContract.status === "archived" ? t("common.complete") : t("common.inProgress")}
            statusTone={hasSettlementDispute || selectedContract.status === "redline" ? "danger" : selectedContract.status === "archived" ? "success" : "info"}
            nextActionLabel={t("workbench.nextAction")}
            nextAction={primaryAction ? actionLabels[primaryAction] : t("contract.noAction")}
            ownerLabel={t("workbench.owner")}
            owner={getRoleDisplayName(primaryOwner, locale)}
            blockerLabel={t("workbench.blocker")}
            blocker={selectedContract.blocker ?? snapshot.settlementDisputes[0]?.current_blocker}
            dueDateLabel={t("finance.dueDate")}
            dueDate={selectedContract.expiration_date ?? t("common.noDueDate")}
            actionLabel={primaryAction ? actionLabels[primaryAction] : undefined}
            onAction={primaryAction ? () => runPrimaryAction(primaryAction) : undefined}
          />

          {workspaceView === "operations" ? (
            <>
              <BusinessStagePath
                title={t("common.stagePath")}
                stages={stageSteps.map((step) => ({
                  ...step,
                  label: t(step.key === "archive" ? "contract.archiveStage" : `contract.${step.key}`)
                }))}
                stateLabels={{ complete: t("common.complete"), active: t("common.inProgress"), blocked: t("common.blocked"), pending: t("common.pending") }}
              />

          <Panel title={t("contract.summary")} icon={<FileSignature className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label={t("contract.contractNo")} value={selectedContract.contract_no} />
              <Metric label={t("contract.counterparty")} value={selectedContract.counterparty_name} />
              <Metric label={t("contract.type")} value={selectedContract.contract_type.replace(/_/g, " ")} />
              <Metric label={t("contract.risk")} value={getPublisherRiskLabel(selectedContract.risk_level, locale)} tone={riskTone[selectedContract.risk_level]} />
              <Metric label={t("contract.value")} value={formatMoney(selectedContract.value_amount, selectedContract.currency)} />
              <Metric label={t("workbench.owner")} value={getRoleDisplayName(primaryOwner, locale)} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{selectedContract.blocker ?? selectedContract.next_action ?? t("contract.noBlocker")}</p>
          </Panel>

          <Panel title={t("contract.reviewEvidence")} icon={<PenLine className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-2">
              <Metric label={t("contract.legalNotes")} value={selectedContract.legal_notes ?? t("contract.pendingEvidence")} />
              <Metric label={t("contract.financeNotes")} value={selectedContract.finance_notes ?? t("contract.pendingEvidence")} />
            </div>
            <details className="mt-4 border-t border-slate-200 pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-700">{t("contract.additionalControls")}</summary>
              <button
                className="mt-3 h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() => runAction(t("contract.sendRedline"), () => contractService.sendRedline(state, user, selectedContract.id, "Counterparty clause requires revision."))}
              >
                {t("contract.sendRedline")}
              </button>
            </details>
          </Panel>

          <Panel title={t("contract.signingArchive")} icon={<Landmark className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label={t("contract.signed")} value={selectedContract.signed_at ? t("common.complete") : t("common.pending")} />
              <Metric label={t("contract.archived")} value={selectedContract.archived_at ? t("common.complete") : t("common.pending")} />
              <Metric label={t("contract.nextAction")} value={selectedContract.next_action ?? "-"} />
            </div>
          </Panel>
            </>
          ) : (
            <RightRail
              snapshot={snapshot}
              locale={locale}
              labels={{ linked: t("contract.linkedRecords"), publisher: t("finance.publisher"), advertiser: t("contract.advertiser"), settlement: t("contract.settlement"), disputes: t("contract.settlementDisputes"), recent: t("finance.recentActivity"), none: t("contract.none") }}
            />
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

function ContractQueue({
  contracts,
  selectedContractId,
  onSelect,
  locale,
  title,
  description
}: {
  contracts: ContractWorkflowState["contracts"];
  selectedContractId: EntityId;
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
      {contracts.map((contract) => (
        <button
          key={contract.id}
          className={`w-full rounded-lg border p-3 text-left text-sm ${
            selectedContractId === contract.id ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"
          }`}
          type="button"
          onClick={() => onSelect(contract.id)}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-slate-900">{contract.contract_no}</p>
            <StatusBadge tone={statusTone[contract.status]}>{getContractStatusLabel(contract.status, locale)}</StatusBadge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{contract.counterparty_name}</p>
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
  snapshot: ReturnType<typeof contractService.getContractSnapshot>;
  locale: "en-US" | "zh-CN";
  labels: { linked: string; publisher: string; advertiser: string; settlement: string; disputes: string; recent: string; none: string };
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title={labels.linked}>
        <RailItem label={labels.publisher} value={snapshot.publisher?.name ?? "-"} />
        <RailItem label={labels.advertiser} value={snapshot.advertiser?.name ?? "-"} />
        <RailItem label={labels.settlement} value={snapshot.settlement?.id ?? "-"} />
        <RailItem
          label={labels.disputes}
          value={snapshot.settlementDisputes.length ? String(snapshot.settlementDisputes.length) : labels.none}
        />
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

function WorkspaceTab({ active, icon: Icon, label, onClick }: { active: boolean; icon: LucideIcon; label: string; onClick: () => void }) {
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

function formatMoney(value?: number, currency = "USD") {
  return `${currency} ${(value ?? 0).toLocaleString()}`;
}
