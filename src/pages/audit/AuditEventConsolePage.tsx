import { ShieldCheck } from "lucide-react";
import { roleDefinitions } from "../../constants/roles";
import type { AppRoute } from "../../routes/routes";
import { collectObservabilityEvents } from "../../services/observabilityService";
import type { BusinessUser } from "../../types/domain";
import type { WorkflowSnapshot } from "../../repositories/workflowRepository";

type AuditEventConsolePageProps = {
  route: AppRoute;
  snapshot: WorkflowSnapshot;
  user: BusinessUser;
};

export function AuditEventConsolePage({ route, snapshot, user }: AuditEventConsolePageProps) {
  const events = collectObservabilityEvents(snapshot, 60);

  return (
    <section className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-blue-700">{route.module}</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{route.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Read-only audit and business event stream for production support and UAT trace review.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">{roleDefinitions[user.activeRole].name}</p>
          <p className="mt-1">Read-only console</p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="grid grid-cols-[1fr_120px_140px_120px_160px] gap-3 border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-normal text-slate-500">
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
              className="grid grid-cols-[1fr_120px_140px_120px_160px] gap-3 px-4 py-3 text-sm text-slate-700"
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
                      event.allowed
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    <ShieldCheck className="size-3" aria-hidden="true" />
                    {event.allowed ? "allowed" : "blocked"}
                  </span>
                ) : (
                  <span className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                    business
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">{event.createdAt}</p>
            </div>
          ))}
          {events.length === 0 ? <p className="px-4 py-6 text-sm text-slate-500">No audit or business events yet.</p> : null}
        </div>
      </div>
    </section>
  );
}
