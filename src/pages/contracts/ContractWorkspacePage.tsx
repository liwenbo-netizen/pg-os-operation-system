import { useMemo, useState, type ReactNode } from "react";
import { FileSignature, Gavel, Landmark, PenLine, ShieldAlert } from "lucide-react";
import { StatusBadge } from "../../components/StatusBadge";
import { SummaryCard } from "../../components/SummaryCard";
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

type ContractWorkspacePageProps = {
  route: AppRoute;
  role: RoleDefinition;
  user: BusinessUser;
  state: ContractWorkflowState;
  mediaState: MediaWorkflowState;
  salesState: SalesWorkflowState;
  financeState: FinanceWorkflowState;
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
  onStateChange,
  onAuditEvent
}: ContractWorkspacePageProps) {
  const [selectedContractId, setSelectedContractId] = useState<EntityId>("contract-233-framework");
  const [message, setMessage] = useState<ActionMessage | null>(null);
  const summary = contractService.getSummary(state);
  const selectedContract = state.contracts.find((contract) => contract.id === selectedContractId) ?? state.contracts[0];
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

  function runAction(title: string, action: () => ReturnType<typeof contractService.approveLegalReview>) {
    const result = action();
    onStateChange(result.state);
    if (result.auditEvent) {
      onAuditEvent(result.auditEvent);
    }
    setMessage({ title, guard: result.guard });
  }

  if (!selectedContract) {
    return (
      <section className="space-y-4">
        <StatusBadge tone="info">{route.service}</StatusBadge>
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">{route.title}</h1>
        <p className="text-sm text-slate-500">No contracts are available.</p>
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
            <StatusBadge tone={statusTone[selectedContract.status]}>{selectedContract.status}</StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">Contract Workspace</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Legal and finance collaboration for counterparty contracts, settlement side letters, and signing readiness.
          </p>
        </div>
        <button
          className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700"
          type="button"
          onClick={() =>
            runAction("Approve legal review", () =>
              contractService.approveLegalReview(state, user, selectedContract.id, "Legal review approved from workspace.")
            )
          }
        >
          <Gavel className="size-4" aria-hidden="true" />
          Approve legal review
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Legal review" value={String(summary.legalReview)} tone="warning" />
        <SummaryCard label="Finance review" value={String(summary.financeReview)} />
        <SummaryCard label="Redline" value={String(summary.redline)} tone={summary.redline ? "danger" : "neutral"} />
        <SummaryCard label="Signing" value={String(summary.signing)} tone="success" />
        <SummaryCard label="High risk" value={String(summary.highRisk)} tone={summary.highRisk ? "danger" : "neutral"} />
      </div>

      {message ? <GuardNotice message={message} /> : null}

      <div className="grid gap-6 xl:grid-cols-[280px_1fr_320px]">
        <ContractQueue contracts={state.contracts} selectedContractId={selectedContract.id} onSelect={setSelectedContractId} />

        <main className="space-y-4">
          <Panel title="Contract summary" icon={<FileSignature className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Contract no" value={selectedContract.contract_no} />
              <Metric label="Counterparty" value={selectedContract.counterparty_name} />
              <Metric label="Type" value={selectedContract.contract_type.replace(/_/g, " ")} />
              <Metric label="Risk" value={selectedContract.risk_level} tone={riskTone[selectedContract.risk_level]} />
              <Metric label="Value" value={formatMoney(selectedContract.value_amount, selectedContract.currency)} />
              <Metric label="Owner" value={selectedContract.owner_role} />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{selectedContract.blocker ?? selectedContract.next_action ?? "No blocker recorded."}</p>
          </Panel>

          <Panel title="Review controls" icon={<PenLine className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-2">
              <Metric label="Legal notes" value={selectedContract.legal_notes ?? "pending"} />
              <Metric label="Finance notes" value={selectedContract.finance_notes ?? "pending"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Request finance review", () =>
                    contractService.requestFinanceReview(state, user, selectedContract.id)
                  )
                }
              >
                Request finance review
              </button>
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Approve finance terms", () =>
                    contractService.approveFinanceTerms(
                      state,
                      user,
                      selectedContract.id,
                      "Payment terms verified from workspace."
                    )
                  )
                }
              >
                Approve finance terms
              </button>
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Send redline", () =>
                    contractService.sendRedline(state, user, selectedContract.id, "Counterparty clause requires revision.")
                  )
                }
              >
                Send redline
              </button>
            </div>
          </Panel>

          <Panel title="Signing and archive" icon={<Landmark className="size-5 text-blue-600" aria-hidden="true" />}>
            <div className="grid gap-3 md:grid-cols-3">
              <Metric label="Signed" value={selectedContract.signed_at ? "yes" : "no"} />
              <Metric label="Archived" value={selectedContract.archived_at ? "yes" : "no"} />
              <Metric label="Next action" value={selectedContract.next_action ?? "-"} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Mark signed", () =>
                    contractService.markSigned(state, mediaState, user, selectedContract.id)
                  )
                }
              >
                Mark signed
              </button>
              <button
                className="h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700"
                type="button"
                onClick={() =>
                  runAction("Archive contract", () =>
                    contractService.archiveSignedContract(state, user, selectedContract.id)
                  )
                }
              >
                Archive
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

function ContractQueue({
  contracts,
  selectedContractId,
  onSelect
}: {
  contracts: ContractWorkflowState["contracts"];
  selectedContractId: EntityId;
  onSelect: (id: EntityId) => void;
}) {
  return (
    <aside className="space-y-3">
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
            <StatusBadge tone={statusTone[contract.status]}>{contract.status}</StatusBadge>
          </div>
          <p className="mt-2 text-xs text-slate-500">{contract.counterparty_name}</p>
        </button>
      ))}
    </aside>
  );
}

function RightRail({ snapshot }: { snapshot: ReturnType<typeof contractService.getContractSnapshot> }) {
  return (
    <aside className="space-y-4">
      <Panel title="Linked records">
        <RailItem label="Publisher" value={snapshot.publisher?.name ?? "-"} />
        <RailItem label="Advertiser" value={snapshot.advertiser?.name ?? "-"} />
        <RailItem label="Settlement" value={snapshot.settlement?.id ?? "-"} />
        <RailItem
          label="Settlement disputes"
          value={snapshot.settlementDisputes.length ? `${snapshot.settlementDisputes.length} linked` : "none"}
        />
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
