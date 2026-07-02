import { ClipboardCheck, Clock3, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { SummaryCard } from "../../components/SummaryCard";
import { StatusBadge } from "../../components/StatusBadge";
import { roleDefinitions } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import {
  productionUatScripts,
  summarizeScriptResults,
  summarizeUatResults,
  updateUatStepResult,
  type UatScript,
  type UatScriptResults,
  type UatStepStatus
} from "../../services/uatScriptService";
import type { BusinessUser } from "../../types/domain";
import { formatUtcPlus8DateTime } from "../../lib/time";
import { cn } from "../../lib/cn";

type UatScriptCenterPageProps = {
  route: AppRoute;
  user: BusinessUser;
};

const STORAGE_KEY = "pgos:production-uat-results:v1";

const statusTone: Record<UatStepStatus, "neutral" | "success" | "warning" | "danger"> = {
  pending: "neutral",
  passed: "success",
  failed: "danger",
  blocked: "warning"
};

function loadStoredResults(): UatScriptResults {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UatScriptResults) : {};
  } catch {
    return {};
  }
}

function saveStoredResults(results: UatScriptResults) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(results));
}

function scriptStatusLabel(script: UatScript, results: UatScriptResults) {
  const summary = summarizeScriptResults(script, results);

  if (summary.failed > 0) {
    return "failed";
  }

  if (summary.blocked > 0) {
    return "blocked";
  }

  if (summary.pending === 0) {
    return "passed";
  }

  return "pending";
}

function latestUpdatedAt(script: UatScript, results: UatScriptResults) {
  const timestamps = script.steps
    .map((step) => results[step.id]?.updatedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .reverse();

  return timestamps[0];
}

export function UatScriptCenterPage({ route, user }: UatScriptCenterPageProps) {
  const [results, setResults] = useState<UatScriptResults>(() => loadStoredResults());
  const [selectedScriptId, setSelectedScriptId] = useState(productionUatScripts[0]?.id ?? "");
  const selectedScript =
    productionUatScripts.find((script) => script.id === selectedScriptId) ?? productionUatScripts[0];
  const overallSummary = useMemo(() => summarizeUatResults(productionUatScripts, results), [results]);
  const selectedSummary = useMemo(() => summarizeScriptResults(selectedScript, results), [results, selectedScript]);
  const lastUpdatedAt = latestUpdatedAt(selectedScript, results);

  function patchStep(stepId: string, patch: Partial<{ status: UatStepStatus; actualResult: string }>) {
    setResults((current) => {
      const next = updateUatStepResult(current, stepId, patch);
      saveStoredResults(next);
      return next;
    });
  }

  function resetResults() {
    setResults({});
    window.localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-blue-700">{route.module}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{route.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Production UAT checklist for role login, click path, expected result, actual result, and pass/fail evidence.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{roleDefinitions[user.activeRole].name}</p>
          <p className="mt-1">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Scripts" value={String(productionUatScripts.length)} tone="neutral" />
        <SummaryCard label="Passed" value={`${overallSummary.passed}/${overallSummary.total}`} tone="success" />
        <SummaryCard label="Failed" value={String(overallSummary.failed)} tone={overallSummary.failed ? "danger" : "neutral"} />
        <SummaryCard label="Blocked" value={String(overallSummary.blocked)} tone={overallSummary.blocked ? "warning" : "neutral"} />
        <SummaryCard label="Complete" value={`${overallSummary.completionRate}%`} tone={overallSummary.pending ? "warning" : "success"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <aside className="space-y-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Role scripts</h2>
                <p className="mt-1 text-xs text-slate-500">Stored locally in this browser.</p>
              </div>
              <button
                className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                type="button"
                onClick={resetResults}
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </button>
            </div>
          </div>

          {productionUatScripts.map((script) => {
            const summary = summarizeScriptResults(script, results);
            const status = scriptStatusLabel(script, results);
            const isSelected = selectedScript.id === script.id;

            return (
              <button
                key={script.id}
                className={cn(
                  "w-full rounded-lg border bg-white p-4 text-left transition",
                  isSelected ? "border-blue-300 bg-blue-50" : "border-slate-200 hover:border-blue-200 hover:bg-slate-50"
                )}
                type="button"
                onClick={() => setSelectedScriptId(script.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{roleDefinitions[script.roleCode].name}</p>
                    <p className="mt-1 text-xs text-slate-500">{script.title}</p>
                  </div>
                  <StatusBadge tone={statusTone[status]}>{status}</StatusBadge>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded bg-slate-100">
                  <div className="h-full rounded bg-blue-600" style={{ width: `${summary.completionRate}%` }} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {summary.passed} passed / {summary.failed} failed / {summary.blocked} blocked / {summary.pending} pending
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
                  <StatusBadge tone="info">{roleDefinitions[selectedScript.roleCode].name}</StatusBadge>
                  <StatusBadge tone={statusTone[scriptStatusLabel(selectedScript, results)]}>
                    {scriptStatusLabel(selectedScript, results)}
                  </StatusBadge>
                </div>
                <h2 className="mt-3 text-xl font-semibold tracking-normal text-slate-950">{selectedScript.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{selectedScript.objective}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Progress</p>
                <p className="mt-1">
                  {selectedSummary.passed}/{selectedSummary.total} passed, {selectedSummary.completionRate}% complete
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Updated {lastUpdatedAt ? formatUtcPlus8DateTime(lastUpdatedAt) : "-"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Login account</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900">{selectedScript.loginAccount}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Target route</p>
                <p className="mt-1 break-words text-sm font-semibold text-slate-900">{selectedScript.targetRoute}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Evidence</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{selectedScript.evidence.length} required signal(s)</p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                <ClipboardCheck className="size-4" aria-hidden="true" />
                Evidence to capture
              </div>
              <div className="mt-3 grid gap-2 lg:grid-cols-3">
                {selectedScript.evidence.map((item) => (
                  <p key={item} className="rounded border border-blue-100 bg-white px-3 py-2 text-xs leading-5 text-blue-800">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </article>

          <div className="space-y-3">
            {selectedScript.steps.map((step, index) => {
              const result = results[step.id] ?? { status: "pending", actualResult: "" };

              return (
                <article key={step.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex size-7 items-center justify-center rounded bg-slate-900 text-xs font-semibold text-white">
                          {index + 1}
                        </span>
                        <StatusBadge tone={statusTone[result.status]}>{result.status}</StatusBadge>
                        {result.updatedAt ? (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Clock3 className="size-3.5" aria-hidden="true" />
                            {formatUtcPlus8DateTime(result.updatedAt)}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-sm font-semibold text-slate-950">{step.action}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{step.expectedResult}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StepStatusButton label="Pass" status="passed" currentStatus={result.status} onClick={() => patchStep(step.id, { status: "passed" })} />
                      <StepStatusButton label="Fail" status="failed" currentStatus={result.status} onClick={() => patchStep(step.id, { status: "failed" })} />
                      <StepStatusButton label="Block" status="blocked" currentStatus={result.status} onClick={() => patchStep(step.id, { status: "blocked" })} />
                    </div>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Actual result</span>
                    <textarea
                      className="mt-2 min-h-20 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      value={result.actualResult}
                      onChange={(event) => patchStep(step.id, { actualResult: event.target.value })}
                      placeholder="Record what happened in production, including warning counts, screenshots, trace ids, or blockers."
                    />
                  </label>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

type StepStatusButtonProps = {
  currentStatus: UatStepStatus;
  label: string;
  onClick: () => void;
  status: UatStepStatus;
};

function StepStatusButton({ currentStatus, label, onClick, status }: StepStatusButtonProps) {
  const isActive = currentStatus === status;
  const styles =
    status === "passed"
      ? "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
      : status === "failed"
        ? "border-red-200 text-red-700 hover:bg-red-50"
        : "border-amber-200 text-amber-700 hover:bg-amber-50";

  return (
    <button
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded border bg-white px-3 text-xs font-semibold transition",
        styles,
        isActive && status === "passed" ? "bg-emerald-50" : "",
        isActive && status === "failed" ? "bg-red-50" : "",
        isActive && status === "blocked" ? "bg-amber-50" : ""
      )}
      type="button"
      onClick={onClick}
    >
      {status === "passed" ? <ShieldCheck className="size-4" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
      {label}
    </button>
  );
}
