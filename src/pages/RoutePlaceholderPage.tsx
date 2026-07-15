import type { RoleDefinition } from "../constants/roles";
import type { AppRoute } from "../routes/routes";
import { RightRail } from "../components/RightRail";
import { StatusBadge } from "../components/StatusBadge";
import { SummaryCard } from "../components/SummaryCard";
import { getRoleDisplayName, getRouteDisplayTitle, useLocale } from "../lib/i18n";

type RoutePlaceholderPageProps = {
  route: AppRoute;
  role: RoleDefinition;
};

export function RoutePlaceholderPage({ route, role }: RoutePlaceholderPageProps) {
  const { locale } = useLocale();

  return (
    <section className="space-y-6">
      <header className="flex items-start justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <StatusBadge tone={route.priority === "P0" ? "danger" : route.priority === "P1" ? "warning" : "info"}>
              {route.priority}
            </StatusBadge>
            <StatusBadge tone="info">{route.pageType}</StatusBadge>
          </div>
          <h1 className="mt-4 text-3xl font-semibold tracking-normal text-slate-950">{getRouteDisplayTitle(route, locale)}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {route.service} gated by {route.guard}. Current role: {getRoleDisplayName(role.code, locale)}.
          </p>
        </div>
        <button className="h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700" type="button">
          {route.primaryAction}
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {route.summarySignals.map((signal, index) => {
          const [label, ...rest] = signal.split(" ");
          return <SummaryCard key={signal} label={label} value={rest.join(" ") || signal} tone={index === 2 ? "warning" : "neutral"} />;
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-normal text-slate-950">Primary work area</h2>
                <p className="mt-1 text-sm text-slate-500">Phase 1 route placeholder with locked page sections.</p>
              </div>
              <StatusBadge tone="success">ApiResponse ready</StatusBadge>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {route.sections.map((section) => (
                <div key={section} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-800">{section}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Service-backed content will be implemented in the relevant business phase.
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="text-lg font-semibold tracking-normal text-slate-950">Route binding</h2>
            <dl className="mt-4 grid gap-4 text-sm md:grid-cols-4">
              <div>
                <dt className="text-slate-500">Route</dt>
                <dd className="mt-1 font-semibold text-slate-900">{route.path}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Service</dt>
                <dd className="mt-1 font-semibold text-slate-900">{route.service}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Guard</dt>
                <dd className="mt-1 font-semibold text-slate-900">{route.guard}</dd>
              </div>
              <div>
                <dt className="text-slate-500">UAT</dt>
                <dd className="mt-1 font-semibold text-slate-900">{route.uat}</dd>
              </div>
            </dl>
          </article>
        </div>

        <RightRail
          owner={role.name}
          blocker="Business data and Supabase seed arrive in later phases."
          nextAction={route.primaryAction}
          sop={`${route.module} operating guide`}
        />
      </div>
    </section>
  );
}
