import { Activity, AlertTriangle, CheckCircle2, Database, KeyRound } from "lucide-react";
import { roleDefinitions } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import type { WorkflowRepositoryHealth, WorkflowSnapshot } from "../../repositories/workflowRepository";
import type { BusinessUser } from "../../types/domain";
import { buildSystemHealthChecks, type HealthCheckStatus } from "../../services/observabilityService";

type StatusProps = {
  status: HealthCheckStatus;
};

function StatusPill({ status }: StatusProps) {
  const styles =
    status === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-red-200 bg-red-50 text-red-700";

  return <span className={`rounded border px-2 py-0.5 text-xs font-semibold uppercase tracking-normal ${styles}`}>{status}</span>;
}

type SystemHealthPageProps = {
  activePath: string;
  authMode: "mock" | "supabase";
  authWarningCount: number;
  repositoryHealth: WorkflowRepositoryHealth;
  repositoryWarningCount: number;
  route: AppRoute;
  snapshot: WorkflowSnapshot;
  supportsSupabase: boolean;
  user: BusinessUser;
};

export function SystemHealthPage({
  activePath,
  authMode,
  authWarningCount,
  repositoryHealth,
  repositoryWarningCount,
  route,
  snapshot,
  supportsSupabase,
  user
}: SystemHealthPageProps) {
  const checks = buildSystemHealthChecks({
    activePath,
    activeRole: user.activeRole,
    authMode,
    authWarningCount,
    repositoryHealth,
    repositoryWarningCount,
    supportsSupabase,
    user,
    snapshot
  });
  const warningItems = [...repositoryHealth.warnings, ...(repositoryHealth.skippedWrites ?? []).map((write) => `${write.table}: ${write.reason}`)];

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-blue-700">{route.module}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{route.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Production readiness signals for auth, repository sync, runtime warnings, and event coverage.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{roleDefinitions[user.activeRole].name}</p>
          <p className="mt-1">{user.email}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {checks.map((check) => (
          <div key={check.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-card">
            <div className="flex items-center justify-between gap-3">
              {check.status === "ok" ? (
                <CheckCircle2 className="size-5 text-emerald-600" aria-hidden="true" />
              ) : check.status === "warning" ? (
                <AlertTriangle className="size-5 text-amber-600" aria-hidden="true" />
              ) : (
                <AlertTriangle className="size-5 text-red-600" aria-hidden="true" />
              )}
              <StatusPill status={check.status} />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-900">{check.label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{check.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <KeyRound className="size-5 text-blue-600" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-slate-900">Auth mode</h2>
          <p className="mt-2 text-sm text-slate-600">{authMode === "supabase" ? "Supabase session" : "Mock role session"}</p>
          <p className="mt-1 text-xs text-slate-500">Supabase available: {supportsSupabase ? "yes" : "no"}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Database className="size-5 text-blue-600" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-slate-900">Repository</h2>
          <p className="mt-2 text-sm text-slate-600">{repositoryHealth.mode}</p>
          <p className="mt-1 text-xs text-slate-500">{repositoryHealth.source}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Activity className="size-5 text-blue-600" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-slate-900">Warnings</h2>
          <p className="mt-2 text-sm text-slate-600">{warningItems.length} active warning(s)</p>
          <p className="mt-1 text-xs text-slate-500">Loaded at {repositoryHealth.loadedAt}</p>
        </div>
      </div>

      {warningItems.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Warnings</h2>
          <div className="mt-3 space-y-2">
            {warningItems.map((warning) => (
              <p key={warning} className="text-sm text-amber-800">
                {warning}
              </p>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
