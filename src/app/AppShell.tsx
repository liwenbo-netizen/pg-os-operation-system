import { useState, type ReactNode } from "react";
import { AlertTriangle, Clock3, Database, Languages, LogOut, ShieldCheck, Table2, UserCheck, Wrench, X } from "lucide-react";
import type { RoleCode } from "../constants/roles";
import type { AppRoute } from "../routes/routes";
import { cn } from "../lib/cn";
import { getRoleDisplayName, getRouteDisplayTitle, useLocale } from "../lib/i18n";
import type { WarningDiagnostic } from "../services/warningDiagnosticsService";

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
    diagnostics: WarningDiagnostic[];
  };
  authSessionStatus?: {
    label: string;
    detail: string;
    warningCount: number;
  };
};

type RepositoryDiagnosticsPanelProps = {
  detail: string;
  diagnostics: WarningDiagnostic[];
  onClose: () => void;
};

function RepositoryDiagnosticsPanel({ detail, diagnostics, onClose }: RepositoryDiagnosticsPanelProps) {
  const { t } = useLocale();

  return (
    <section
      className="absolute right-0 top-12 z-30 w-[680px] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-xl"
      role="dialog"
      aria-label={t("diagnostics.title")}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{t("diagnostics.title")}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <button
          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          type="button"
          onClick={onClose}
          aria-label={t("diagnostics.close")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {diagnostics.length > 0 ? (
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          {diagnostics.map((diagnostic) => (
            <article key={diagnostic.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 shrink-0 text-amber-600" aria-hidden="true" />
                    <h2 className="truncate text-sm font-semibold text-slate-950">{diagnostic.table}</h2>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{diagnostic.scope}</p>
                </div>
                <span className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  {diagnostic.action}
                </span>
              </div>

              <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="flex items-center gap-1 font-semibold text-slate-900">
                    <Table2 className="size-3.5 text-blue-600" aria-hidden="true" />
                    {t("diagnostics.table")}
                  </div>
                  <p className="mt-1 break-words">{diagnostic.table}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="font-semibold text-slate-900">{t("diagnostics.role")}</div>
                  <p className="mt-1 break-words">{diagnostic.role}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="flex items-center gap-1 font-semibold text-slate-900">
                    <Clock3 className="size-3.5 text-blue-600" aria-hidden="true" />
                    {t("diagnostics.time")}
                  </div>
                  <p className="mt-1 break-words">{diagnostic.time}</p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3">
                <p className="text-xs font-semibold text-red-800">{t("diagnostics.error")}</p>
                <p className="mt-1 break-words text-xs leading-5 text-red-700">{diagnostic.error}</p>
              </div>

              <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-blue-900">
                  <Wrench className="size-3.5" aria-hidden="true" />
                  {t("diagnostics.suggestedFix")}
                </div>
                <p className="mt-1 break-words text-xs leading-5 text-blue-800">{diagnostic.suggestion}</p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-4">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">{t("diagnostics.noWarnings")}</p>
            <p className="mt-1 text-xs text-emerald-700">{t("diagnostics.noWarningsDetail")}</p>
          </div>
        </div>
      )}
    </section>
  );
}

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
  const [isRepositoryPanelOpen, setIsRepositoryPanelOpen] = useState(false);
  const { locale, setLocale, t } = useLocale();
  const repositoryDiagnostics = repositoryStatus?.diagnostics ?? [];

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
              <p className="text-xs text-slate-500">{t("shell.operationSystem")}</p>
            </div>
          </div>

          <nav className="mt-8 space-y-1" aria-label={t("shell.guardedRoutes")}>
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
                <span>{getRouteDisplayTitle(route, locale)}</span>
                <span className="text-xs text-slate-400">{route.priority}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <header className="flex h-[72px] items-center justify-between border-b border-slate-200 bg-white px-6">
            <div>
              <p className="text-xs font-semibold tracking-normal text-slate-500">{t("shell.activeRole")}</p>
              <p className="text-sm font-semibold text-slate-900">{getRoleDisplayName(activeRole, locale)}</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor="role-select">
                {t("shell.switchRole")}
              </label>
              <label className="sr-only" htmlFor="language-select">
                {t("shell.language")}
              </label>
              <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
                <Languages className="size-4 text-blue-600" aria-hidden="true" />
                <select
                  id="language-select"
                  className="min-w-0 bg-transparent outline-none"
                  value={locale}
                  onChange={(event) => setLocale(event.target.value as typeof locale)}
                >
                  <option value="zh-CN">中文</option>
                  <option value="en-US">English</option>
                </select>
              </div>
              <select
                id="role-select"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
                value={activeRole}
                onChange={(event) => onRoleChange(event.target.value as RoleCode)}
              >
                {availableRoles.map((roleCode) => (
                  <option key={roleCode} value={roleCode}>
                    {getRoleDisplayName(roleCode, locale)}
                  </option>
                ))}
              </select>
              <div
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                title={authSessionStatus?.detail}
              >
                <UserCheck className="size-4 text-blue-600" aria-hidden="true" />
                <span>{authSessionStatus?.label ?? t("shell.mockAuth")}</span>
                {authSessionStatus && authSessionStatus.warningCount > 0 ? (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                    {authSessionStatus.warningCount}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <ShieldCheck className="size-4 text-blue-600" aria-hidden="true" />
                {t("shell.guardedRoutes")}
              </div>
              <div className="relative">
                <button
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-lg border px-3 text-sm transition",
                    repositoryStatus && repositoryStatus.warningCount > 0
                      ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                  type="button"
                  title={repositoryStatus?.detail}
                  aria-expanded={isRepositoryPanelOpen}
                  aria-haspopup="dialog"
                  onClick={() => setIsRepositoryPanelOpen((isOpen) => !isOpen)}
                >
                  <Database className="size-4 text-blue-600" aria-hidden="true" />
                  <span>{repositoryStatus?.label ?? t("shell.fixtureData")}</span>
                  {repositoryStatus && repositoryStatus.warningCount > 0 ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                      {repositoryStatus.warningCount}
                    </span>
                  ) : null}
                </button>
                {isRepositoryPanelOpen ? (
                  <RepositoryDiagnosticsPanel
                    detail={repositoryStatus?.detail ?? t("shell.fixtureData")}
                    diagnostics={repositoryDiagnostics}
                    onClose={() => setIsRepositoryPanelOpen(false)}
                  />
                ) : null}
              </div>
              <button
                className="inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                type="button"
                onClick={onSignOut}
                aria-label={t("shell.signOut")}
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
