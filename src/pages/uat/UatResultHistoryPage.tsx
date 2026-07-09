import { ClipboardCheck, Download, RefreshCw, ScrollText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SummaryCard } from "../../components/SummaryCard";
import { StatusBadge } from "../../components/StatusBadge";
import { roleDefinitions } from "../../constants/roles";
import {
  createUatScriptResultRepository,
  type UatRunHistoryItem,
  type UatRunStatus,
  type UatScriptResultSource,
  type UatStepHistoryItem
} from "../../repositories/uatScriptResultRepository";
import type { AppRoute } from "../../routes/routes";
import {
  createUatAcceptanceLedgerCsv,
  createUatAcceptanceLedgerFileName,
  createUatAcceptanceLedgerJson,
  createUatHistoryCsv,
  createUatHistoryFileName,
  createUatHistoryJson
} from "../../services/uatHistoryExportService";
import {
  productionUatAcceptanceLedger,
  summarizeAcceptanceLedger,
  type UatAcceptanceStatus
} from "../../services/uatAcceptanceLedgerService";
import type { UatStepStatus } from "../../services/uatScriptService";
import type { BusinessUser } from "../../types/domain";
import { cn } from "../../lib/cn";
import { formatUtcPlus8DateTime } from "../../lib/time";

type UatResultHistoryPageProps = {
  route: AppRoute;
  user: BusinessUser;
};

type HistoryState = {
  runs: UatRunHistoryItem[];
  selectedRun?: UatRunHistoryItem;
  steps: UatStepHistoryItem[];
  source: UatScriptResultSource | "loading";
  loadedAt?: string;
  warnings: string[];
};

const runTone: Record<UatRunStatus, "neutral" | "success" | "warning" | "danger"> = {
  in_progress: "warning",
  completed: "success",
  failed: "danger",
  blocked: "warning",
  archived: "neutral"
};

const stepTone: Record<UatStepStatus, "neutral" | "success" | "warning" | "danger"> = {
  pending: "neutral",
  passed: "success",
  failed: "danger",
  blocked: "warning"
};

const acceptanceTone: Record<UatAcceptanceStatus, "success" | "warning" | "danger"> = {
  passed: "success",
  failed: "danger",
  blocked: "warning"
};

const sourceTone: Record<HistoryState["source"], "neutral" | "success" | "warning" | "info"> = {
  loading: "info",
  local: "neutral",
  supabase: "success",
  "supabase-warning": "warning"
};

const sourceLabel: Record<HistoryState["source"], string> = {
  loading: "Loading",
  local: "Local only",
  supabase: "Supabase live",
  "supabase-warning": "Supabase warning"
};

const stepStatuses: Array<UatStepStatus | "all"> = ["all", "passed", "failed", "blocked", "pending"];

function downloadTextFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function uniqueRoles(steps: UatStepHistoryItem[]) {
  return Array.from(new Set(steps.map((step) => step.roleCode).filter(Boolean))).sort();
}

export function UatResultHistoryPage({ route, user }: UatResultHistoryPageProps) {
  const [repository] = useState(() => createUatScriptResultRepository());
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<UatStepStatus | "all">("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [history, setHistory] = useState<HistoryState>({
    runs: [],
    steps: [],
    source: "loading",
    warnings: []
  });

  function loadHistory(nextRunId = selectedRunId) {
    setHistory((current) => ({
      ...current,
      source: "loading",
      warnings: []
    }));

    repository
      .loadHistory({ limit: 20, runId: nextRunId })
      .then((result) => {
        setHistory({
          runs: result.runs,
          selectedRun: result.selectedRun,
          steps: result.steps,
          source: result.warnings.length > 0 ? "supabase-warning" : result.source,
          loadedAt: result.loadedAt,
          warnings: result.warnings
        });

        if (!nextRunId && result.selectedRun) {
          setSelectedRunId(result.selectedRun.id);
        }
      })
      .catch((error) => {
        setHistory({
          runs: [],
          steps: [],
          source: "supabase-warning",
          loadedAt: new Date().toISOString(),
          warnings: [error instanceof Error ? error.message : "UAT result history load failed."]
        });
      });
  }

  useEffect(() => {
    loadHistory(selectedRunId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRunId, repository]);

  const roles = useMemo(() => uniqueRoles(history.steps), [history.steps]);
  const filteredSteps = useMemo(
    () =>
      history.steps.filter((step) => {
        const matchesStatus = statusFilter === "all" || step.status === statusFilter;
        const matchesRole = roleFilter === "all" || step.roleCode === roleFilter;
        return matchesStatus && matchesRole;
      }),
    [history.steps, roleFilter, statusFilter]
  );
  const selectedRun = history.selectedRun;
  const summary = selectedRun?.summary;
  const canExport = Boolean(selectedRun && history.steps.length > 0);
  const acceptanceSummary = useMemo(() => summarizeAcceptanceLedger(productionUatAcceptanceLedger), []);

  function exportCsv() {
    if (!selectedRun) {
      return;
    }

    downloadTextFile(
      createUatHistoryFileName(selectedRun, "csv"),
      createUatHistoryCsv(selectedRun, filteredSteps),
      "text/csv;charset=utf-8"
    );
  }

  function exportJson() {
    if (!selectedRun) {
      return;
    }

    downloadTextFile(
      createUatHistoryFileName(selectedRun, "json"),
      createUatHistoryJson(selectedRun, filteredSteps),
      "application/json;charset=utf-8"
    );
  }

  function exportLedgerCsv() {
    downloadTextFile(
      createUatAcceptanceLedgerFileName(productionUatAcceptanceLedger, "csv"),
      createUatAcceptanceLedgerCsv(productionUatAcceptanceLedger),
      "text/csv;charset=utf-8"
    );
  }

  function exportLedgerJson() {
    downloadTextFile(
      createUatAcceptanceLedgerFileName(productionUatAcceptanceLedger, "json"),
      createUatAcceptanceLedgerJson(productionUatAcceptanceLedger),
      "application/json;charset=utf-8"
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-blue-700">{route.module}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{route.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Read-only production UAT run history, step evidence, and export records.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <StatusBadge tone={sourceTone[history.source]}>{sourceLabel[history.source]}</StatusBadge>
            {history.loadedAt ? <span className="text-xs text-slate-500">{formatUtcPlus8DateTime(history.loadedAt)}</span> : null}
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{roleDefinitions[user.activeRole].name}</p>
          <p className="mt-1">{user.email}</p>
        </div>
      </div>

      {history.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          {history.warnings.map((warning) => (
            <p key={warning} className="text-sm leading-6 text-amber-800">
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white shadow-card">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <ClipboardCheck className="size-5 text-blue-600" aria-hidden="true" />
              <StatusBadge tone="success">Phase 37-39</StatusBadge>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-normal text-slate-950">Formal sign-off ledger</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Consolidated production UAT acceptance records for deployment readiness, live-write proof, RLS/audit proof, and workbench task
              execution binding.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={exportLedgerCsv}
            >
              <Download className="size-4" aria-hidden="true" />
              Ledger CSV
            </button>
            <button
              className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              type="button"
              onClick={exportLedgerJson}
            >
              <Download className="size-4" aria-hidden="true" />
              Ledger JSON
            </button>
          </div>
        </div>

        <div className="grid gap-0 border-b border-slate-200 md:grid-cols-2 xl:grid-cols-5">
          <div className="border-b border-slate-200 p-4 md:border-r xl:border-b-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Sign-off records</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{acceptanceSummary.total}</p>
          </div>
          <div className="border-b border-slate-200 p-4 md:border-r xl:border-b-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Passed</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-emerald-800">{acceptanceSummary.passed}</p>
          </div>
          <div className="border-b border-slate-200 p-4 md:border-r xl:border-b-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Phases</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{acceptanceSummary.phaseCount}</p>
          </div>
          <div className="border-b border-slate-200 p-4 md:border-r xl:border-b-0">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Domains</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{acceptanceSummary.businessDomainCount}</p>
          </div>
          <div className="p-4">
            <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Audit proof</p>
            <p className="mt-2 text-2xl font-semibold tracking-normal text-blue-800">{acceptanceSummary.auditProofCount}</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Phase</th>
                <th className="px-4 py-3 font-semibold">Scope</th>
                <th className="px-4 py-3 font-semibold">Roles</th>
                <th className="px-4 py-3 font-semibold">Evidence</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Audit markers</th>
                <th className="px-4 py-3 font-semibold">Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {productionUatAcceptanceLedger.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-4 align-top">
                    <p className="font-semibold text-slate-950">{item.phase}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.sourceDocument}</p>
                  </td>
                  <td className="max-w-sm px-4 py-4 align-top">
                    <p className="font-semibold text-slate-950">{item.title}</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{item.proofPoints[0]}</p>
                    <p className="mt-2 text-xs font-semibold text-slate-600">{item.businessDomains.join(" / ")}</p>
                  </td>
                  <td className="px-4 py-4 align-top text-slate-700">
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {item.roles.map((role) => (
                        <span key={role} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs">
                          {roleDefinitions[role].name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top text-slate-700">
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {item.evidenceKinds.map((evidenceKind) => (
                        <span key={evidenceKind} className="rounded border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700">
                          {evidenceKind}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <StatusBadge tone={acceptanceTone[item.status]}>{item.status}</StatusBadge>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{item.followUp}</p>
                  </td>
                  <td className="max-w-xs px-4 py-4 align-top text-slate-700">
                    <p className="text-xs leading-5">{item.auditMarkers.slice(0, 4).join(", ")}</p>
                    {item.auditMarkers.length > 4 ? (
                      <p className="mt-1 text-xs text-slate-500">+{item.auditMarkers.length - 4} more</p>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 align-top text-slate-500">{formatUtcPlus8DateTime(item.recordedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Runs" value={String(history.runs.length)} tone="neutral" />
        <SummaryCard label="Passed" value={String(summary?.passed ?? 0)} tone="success" />
        <SummaryCard label="Failed" value={String(summary?.failed ?? 0)} tone={summary?.failed ? "danger" : "neutral"} />
        <SummaryCard label="Blocked" value={String(summary?.blocked ?? 0)} tone={summary?.blocked ? "warning" : "neutral"} />
        <SummaryCard label="Complete" value={`${summary?.completionRate ?? 0}%`} tone={summary?.pending ? "warning" : "success"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-3">
          {history.runs.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600">
              No UAT run history available.
            </div>
          ) : null}

          {history.runs.map((run) => {
            const isSelected = selectedRun?.id === run.id;

            return (
              <button
                key={run.id}
                className={cn(
                  "w-full rounded-lg border bg-white p-4 text-left transition",
                  isSelected ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                )}
                type="button"
                onClick={() => setSelectedRunId(run.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{run.runKey}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatUtcPlus8DateTime(run.updatedAt)}</p>
                  </div>
                  <StatusBadge tone={runTone[run.status]}>{run.status}</StatusBadge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
                  <div className="h-full rounded bg-blue-600" style={{ width: `${run.summary.completionRate}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {run.summary.passed} passed / {run.summary.failed} failed / {run.summary.blocked} blocked / {run.summary.pending} pending
                </p>
              </button>
            );
          })}
        </aside>

        <div className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <ScrollText className="size-5 text-blue-600" aria-hidden="true" />
                  {selectedRun ? <StatusBadge tone={runTone[selectedRun.status]}>{selectedRun.status}</StatusBadge> : null}
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-normal text-slate-950">
                  {selectedRun?.runKey ?? "No run selected"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {selectedRun?.productionUrl ?? "No production URL recorded"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  type="button"
                  onClick={() => loadHistory(selectedRunId)}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Refresh
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={!canExport}
                  onClick={exportCsv}
                >
                  <Download className="size-4" aria-hidden="true" />
                  CSV
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  type="button"
                  disabled={!canExport}
                  onClick={exportJson}
                >
                  <Download className="size-4" aria-hidden="true" />
                  JSON
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Environment</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedRun?.environment ?? "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Started role</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedRun?.startedByRole ?? "-"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Created</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedRun ? formatUtcPlus8DateTime(selectedRun.createdAt) : "-"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Updated</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedRun ? formatUtcPlus8DateTime(selectedRun.updatedAt) : "-"}
                </p>
              </div>
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white shadow-card">
            <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Step evidence</h2>
                <p className="mt-1 text-xs text-slate-500">
                  {filteredSteps.length} visible / {history.steps.length} total
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  className="h-10 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                >
                  <option value="all">All roles</option>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {roleDefinitions[role as keyof typeof roleDefinitions]?.name ?? role}
                    </option>
                  ))}
                </select>
                <select
                  className="h-10 rounded border border-slate-200 bg-white px-3 text-sm text-slate-700"
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as UatStepStatus | "all")}
                >
                  {stepStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status === "all" ? "All statuses" : status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Step</th>
                    <th className="px-4 py-3 font-semibold">Role</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Actual result</th>
                    <th className="px-4 py-3 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredSteps.map((step) => (
                    <tr key={step.id}>
                      <td className="max-w-md px-4 py-4 align-top">
                        <p className="font-semibold text-slate-950">{step.stepAction}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{step.expectedResult}</p>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-700">
                        {roleDefinitions[step.roleCode as keyof typeof roleDefinitions]?.name ?? step.roleCode}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <StatusBadge tone={stepTone[step.status]}>{step.status}</StatusBadge>
                      </td>
                      <td className="max-w-md px-4 py-4 align-top text-slate-700">
                        {step.actualResult || "-"}
                      </td>
                      <td className="px-4 py-4 align-top text-slate-500">{formatUtcPlus8DateTime(step.updatedAt)}</td>
                    </tr>
                  ))}
                  {filteredSteps.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={5}>
                        No matching UAT step evidence.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
