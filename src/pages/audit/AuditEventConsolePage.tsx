import { ChevronLeft, ChevronRight, Database, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { roleDefinitions } from "../../constants/roles";
import {
  createAuditEventRepository,
  createSnapshotAuditEventPage,
  type AuditEventPage,
  type AuditEventSource
} from "../../repositories/auditEventRepository";
import type { AppRoute } from "../../routes/routes";
import type { BusinessUser } from "../../types/domain";
import type { WorkflowSnapshot } from "../../repositories/workflowRepository";
import { formatUtcPlus8DateTime } from "../../lib/time";

type AuditEventConsolePageProps = {
  route: AppRoute;
  snapshot: WorkflowSnapshot;
  user: BusinessUser;
};

const PAGE_SIZE = 20;

function sourceLabel(source: AuditEventSource) {
  if (source === "supabase") {
    return "Supabase live";
  }

  if (source === "supabase_partial") {
    return "Supabase partial";
  }

  return "Snapshot fallback";
}

function sourceClassName(source: AuditEventSource) {
  if (source === "supabase") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (source === "supabase_partial") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-slate-200 bg-slate-50 text-slate-600";
}

export function AuditEventConsolePage({ route, snapshot, user }: AuditEventConsolePageProps) {
  const repository = useMemo(() => createAuditEventRepository(), []);
  const [page, setPage] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [eventPage, setEventPage] = useState<AuditEventPage>(() =>
    createSnapshotAuditEventPage(snapshot, { page: 0, pageSize: PAGE_SIZE })
  );

  useEffect(() => {
    let active = true;
    setIsLoading(true);

    repository
      .loadPage({ snapshot, page, pageSize: PAGE_SIZE })
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
            page,
            pageSize: PAGE_SIZE,
            warnings: [
              `Audit event source: ${error instanceof Error ? error.message : "load failed"}`,
              "Showing the current frontend snapshot."
            ]
          })
        );
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [page, reloadKey, repository, snapshot]);

  const events = eventPage.events;
  const sourceClass = sourceClassName(eventPage.source);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-blue-700">{route.module}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{route.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Read-only audit and business event stream for production support and UAT trace review.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{roleDefinitions[user.activeRole].name}</p>
          <p className="mt-1 flex items-center gap-2">
            <Database className="size-4" aria-hidden="true" />
            <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${sourceClass}`}>
              {sourceLabel(eventPage.source)}
            </span>
          </p>
        </div>
      </div>

      {eventPage.warnings.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {eventPage.warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Event stream</p>
            <p className="mt-1 text-xs text-slate-500">
              Page {eventPage.page + 1} / {eventPage.pageSize} rows per page / loaded{" "}
              {formatUtcPlus8DateTime(eventPage.loadedAt)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setReloadKey((current) => current + 1)}
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isLoading}
            >
              <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} aria-hidden="true" />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(0, current - 1))}
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || eventPage.page === 0}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              className="inline-flex h-9 items-center gap-2 rounded border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading || !eventPage.hasNextPage}
            >
              Next
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[1fr_120px_160px_120px_190px] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-slate-500">
              <span>Event</span>
              <span>Module</span>
              <span>Object</span>
              <span>Status</span>
              <span>Created</span>
            </div>
            <div className="divide-y divide-slate-100">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="grid grid-cols-[1fr_120px_160px_120px_190px] gap-3 px-4 py-3 text-sm text-slate-700"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{event.code}</p>
                    <p className="mt-1 text-xs text-slate-500">{event.actorOrOwner ?? "system"}</p>
                  </div>
                  <p>{event.module}</p>
                  <p>
                    {event.objectType}
                    {event.objectId ? <span className="block truncate text-xs text-slate-500">{event.objectId}</span> : null}
                  </p>
                  <p>
                    {event.type === "audit" ? (
                      <span
                        className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-semibold ${
                          event.allowed === true
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : event.allowed === false
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        <ShieldCheck className="size-3" aria-hidden="true" />
                        {event.allowed === true ? "allowed" : event.allowed === false ? "blocked" : "audit"}
                      </span>
                    ) : (
                      <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                        business
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{formatUtcPlus8DateTime(event.createdAt)}</p>
                </div>
              ))}
              {events.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">No audit or business events yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
