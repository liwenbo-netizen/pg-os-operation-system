import type { ReactNode } from "react";
import { Database, LogOut, ShieldCheck, UserCheck } from "lucide-react";
import { roleDefinitions, type RoleCode } from "../constants/roles";
import type { AppRoute } from "../routes/routes";
import { cn } from "../lib/cn";

type AppShellProps = {
  activePath: string;
  activeRole: RoleCode;
  routes: AppRoute[];
  children: ReactNode;
  onRouteChange: (path: string) => void;
  onRoleChange: (role: RoleCode) => void;
  onSignOut: () => void;
  availableRoles: readonly RoleCode[];
  repositoryStatus?: {
    label: string;
    detail: string;
    warningCount: number;
  };
  authSessionStatus?: {
    label: string;
    detail: string;
    warningCount: number;
  };
};

export function AppShell({
  activePath,
  activeRole,
  routes,
  children,
  onRouteChange,
  onRoleChange,
  onSignOut,
  availableRoles,
  repositoryStatus,
  authSessionStatus
}: AppShellProps) {
  return (
    <div className="min-h-screen bg-pgos-bg text-pgos-text">
      <div className="grid min-h-screen grid-cols-[248px_1fr]">
        <aside className="border-r border-slate-200 bg-white px-4 py-5">
          <div className="flex items-center gap-3 px-2">
            <div className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
              PG
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">PG OS</p>
              <p className="text-xs text-slate-500">Operation System</p>
            </div>
          </div>

          <nav className="mt-8 space-y-1" aria-label="Primary navigation">
            {routes.map((route) => (
              <button
                key={route.path}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                  activePath === route.path
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                )}
                type="button"
                onClick={() => onRouteChange(route.path)}
              >
                <span>{route.title}</span>
                <span className="text-xs text-slate-400">{route.priority}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-normal text-slate-500">Active role</p>
              <p className="text-sm font-semibold text-slate-900">{roleDefinitions[activeRole].name}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor="role-select">
                Switch role
              </label>
              <select
                id="role-select"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={activeRole}
                onChange={(event) => onRoleChange(event.target.value as RoleCode)}
              >
                {availableRoles.map((roleCode) => (
                  <option key={roleCode} value={roleCode}>
                    {roleDefinitions[roleCode].name}
                  </option>
                ))}
              </select>
              <div
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                title={authSessionStatus?.detail}
              >
                <UserCheck className="size-4 text-blue-600" aria-hidden="true" />
                <span>{authSessionStatus?.label ?? "Mock auth"}</span>
                {authSessionStatus && authSessionStatus.warningCount > 0 ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                    {authSessionStatus.warningCount}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <ShieldCheck className="size-4 text-blue-600" aria-hidden="true" />
                Guarded routes
              </div>
              <div
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                title={repositoryStatus?.detail}
              >
                <Database className="size-4 text-blue-600" aria-hidden="true" />
                <span>{repositoryStatus?.label ?? "Fixture data"}</span>
                {repositoryStatus && repositoryStatus.warningCount > 0 ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                    {repositoryStatus.warningCount}
                  </span>
                ) : null}
              </div>
              <button
                className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                type="button"
                onClick={onSignOut}
                aria-label="Sign out"
              >
                <LogOut className="size-4" aria-hidden="true" />
              </button>
            </div>
          </header>

          <main className="p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
