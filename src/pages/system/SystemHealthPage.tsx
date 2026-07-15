import { Activity, AlertTriangle, CheckCircle2, Database, KeyRound, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  createAuditEventRepository,
  createSnapshotAuditEventPage,
  type AuditEventPage,
  type AuditEventSource
} from "../../repositories/auditEventRepository";
import type { AppRoute } from "../../routes/routes";
import type { WorkflowRepositoryHealth, WorkflowSnapshot } from "../../repositories/workflowRepository";
import type { BusinessUser } from "../../types/domain";
import {
  buildSystemHealthChecks,
  type HealthCheckStatus,
  type SystemHealthEventCoverage
} from "../../services/observabilityService";
import { formatUtcPlus8DateTime } from "../../lib/time";
import { getRoleDisplayName, getRouteDisplayTitle, useLocale } from "../../lib/i18n";

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

const EVENT_SAMPLE_SIZE = 25;

function eventSourceLabel(source: AuditEventSource) {
  if (source === "supabase") {
    return "Supabase live";
  }

  if (source === "supabase_partial") {
    return "Supabase partial";
  }

  return "Snapshot fallback";
}

function eventSourceClassName(source: AuditEventSource) {
  if (source === "supabase") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (source === "supabase_partial") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
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
  const { locale } = useLocale();
  const eventRepository = useMemo(() => createAuditEventRepository(), []);
  const [eventPage, setEventPage] = useState<AuditEventPage>(() =>
    createSnapshotAuditEventPage(snapshot, { page: 0, pageSize: EVENT_SAMPLE_SIZE })
  );
  const [isEventLoading, setIsEventLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setIsEventLoading(true);

    eventRepository
      .loadPage({ snapshot, page: 0, pageSize: EVENT_SAMPLE_SIZE })
      .then((result) => {
        if (active) {
          setEventPage(result);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setEventPage(
          createSnapshotAuditEventPage(snapshot, {
            page: 0,
            pageSize: EVENT_SAMPLE_SIZE,
            warnings: [
              `Audit event source: ${error instanceof Error ? error.message : "load failed"}`,
              "Showing the current frontend snapshot."
            ]
          })
        );
      })
      .finally(() => {
        if (active) {
          setIsEventLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [eventRepository, snapshot]);

  const eventCoverage = useMemo<SystemHealthEventCoverage>(() => {
    const auditCount = eventPage.events.filter((event) => event.type === "audit").length;
    const businessCount = eventPage.events.filter((event) => event.type === "business").length;

    return {
      source: eventPage.source,
      auditCount,
      businessCount,
      sampleSize: eventPage.events.length,
      loadedAt: eventPage.loadedAt,
      warningCount: eventPage.warnings.length
    };
  }, [eventPage]);
  const checks = buildSystemHealthChecks({
    activePath,
    activeRole: user.activeRole,
    authMode,
    authWarningCount,
    repositoryHealth,
    repositoryWarningCount,
    supportsSupabase,
    user,
    snapshot,
    eventCoverage
  });
  const eventWarningItems = eventPage.warnings.map((warning) => `events: ${warning}`);
  const warningItems = [
    ...repositoryHealth.warnings,
    ...(repositoryHealth.skippedWrites ?? []).map((write) => `${write.table}: ${write.reason}`),
    ...eventWarningItems
  ];
  const eventSourceClass = eventSourceClassName(eventPage.source);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-blue-700">{route.module}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{getRouteDisplayTitle(route, locale)}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Production readiness signals for auth, repository sync, runtime warnings, and event coverage.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{getRoleDisplayName(user.activeRole, locale)}</p>
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

      <div className="grid gap-4 lg:grid-cols-4">
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
          {isEventLoading ? (
            <RefreshCw className="size-5 animate-spin text-blue-600" aria-hidden="true" />
          ) : (
            <Database className="size-5 text-blue-600" aria-hidden="true" />
          )}
          <h2 className="mt-3 text-sm font-semibold text-slate-900">Event source</h2>
          <p className="mt-2">
            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${eventSourceClass}`}>
              {eventSourceLabel(eventPage.source)}
            </span>
          </p>
          <p className="mt-2 text-xs text-slate-500">
            {eventCoverage.auditCount} audit / {eventCoverage.businessCount} business / {eventCoverage.sampleSize} loaded
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <Activity className="size-5 text-blue-600" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-slate-900">Warnings</h2>
          <p className="mt-2 text-sm text-slate-600">{warningItems.length} active warning(s)</p>
          <p className="mt-1 text-xs text-slate-500">Loaded at {formatUtcPlus8DateTime(repositoryHealth.loadedAt)}</p>
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
