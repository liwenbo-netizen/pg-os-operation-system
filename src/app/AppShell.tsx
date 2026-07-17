import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Database,
  FileSignature,
  Gauge,
  Languages,
  LayoutDashboard,
  LogOut,
  Menu,
  RadioTower,
  Search,
  Settings2,
  ShieldCheck,
  Table2,
  UserCheck,
  Wrench,
  X,
  type LucideIcon
} from "lucide-react";
import type { RoleCode } from "../constants/roles";
import type { AppRoute } from "../routes/routes";
import { cn } from "../lib/cn";
import {
  type AppLocale,
  getRoleDisplayName,
  getRouteDisplayTitle,
  getRoutePrimaryAction,
  useLocale
} from "../lib/i18n";
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
  diagnostics: WarningDiagnostic[];
  repositoryStatus?: AppShellProps["repositoryStatus"];
  authSessionStatus?: AppShellProps["authSessionStatus"];
  locale: AppLocale;
  onLocaleChange: (locale: AppLocale) => void;
  onSignOut: () => void;
  onClose: () => void;
};

export type NavigationGroupId = "workspace" | "supply" | "revenue" | "governance";

const navigationGroupOrder: NavigationGroupId[] = ["workspace", "supply", "revenue", "governance"];

export function getNavigationGroup(route: AppRoute): NavigationGroupId {
  if (route.module === "Workbench") return "workspace";
  if (["Media", "Diagnostics"].includes(route.module)) return "supply";
  if (["Sales", "Proposals", "Campaigns", "Finance", "Contracts"].includes(route.module)) return "revenue";
  return "governance";
}

export function groupRoutesForNavigation(routes: AppRoute[], query = "", locale: AppLocale = "en-US") {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const matchingRoutes = normalizedQuery
    ? routes.filter((route) =>
        [
          route.title,
          getRouteDisplayTitle(route, locale),
          route.module,
          route.pageType,
          route.primaryAction,
          getRoutePrimaryAction(route, locale)
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(normalizedQuery)
      )
    : routes;

  return navigationGroupOrder
    .map((id) => ({ id, routes: matchingRoutes.filter((route) => getNavigationGroup(route) === id) }))
    .filter((group) => group.routes.length > 0);
}

function getRouteIcon(route: AppRoute): LucideIcon {
  if (route.module === "Workbench") return LayoutDashboard;
  if (route.module === "Media") return RadioTower;
  if (route.module === "Diagnostics") return Activity;
  if (["Sales", "Proposals", "Campaigns"].includes(route.module)) return BriefcaseBusiness;
  if (route.module === "Finance") return CircleDollarSign;
  if (route.module === "Contracts") return FileSignature;
  if (route.module === "Guide") return BookOpen;
  if (route.module === "Observability") return Gauge;
  return Settings2;
}

function RepositoryDiagnosticsPanel({
  diagnostics,
  repositoryStatus,
  authSessionStatus,
  locale,
  onLocaleChange,
  onSignOut,
  onClose
}: RepositoryDiagnosticsPanelProps) {
  const { t } = useLocale();
  const warningCount = (repositoryStatus?.warningCount ?? 0) + (authSessionStatus?.warningCount ?? 0);

  return (
    <section
      className="fixed inset-x-4 top-[68px] z-50 max-h-[calc(100vh-5.5rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[520px] sm:max-w-[calc(100vw-2rem)]"
      role="dialog"
      aria-label={t("shell.systemStatus")}
    >
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">{t("shell.systemStatus")}</p>
          <p className="mt-1 text-xs text-slate-500">
            {warningCount > 0 ? t("shell.statusAttention") : t("shell.statusHealthy")}
          </p>
        </div>
        <button
          className="inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          type="button"
          onClick={onClose}
          aria-label={t("shell.closeSystemStatus")}
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="grid gap-3 border-b border-slate-200 p-4 sm:grid-cols-2">
        <SystemStatusItem
          icon={ShieldCheck}
          label={t("shell.authSession")}
          value={authSessionStatus?.label ?? t("shell.mockAuth")}
          detail={authSessionStatus?.detail}
          warningCount={authSessionStatus?.warningCount ?? 0}
        />
        <SystemStatusItem
          icon={Database}
          label={t("shell.repository")}
          value={repositoryStatus?.label ?? t("shell.fixtureData")}
          detail={repositoryStatus?.detail}
          warningCount={repositoryStatus?.warningCount ?? 0}
        />
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

      <div className="border-t border-slate-200 p-4">
        <p className="text-xs font-semibold text-slate-700">{t("shell.accountControls")}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <label className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm text-slate-700">
            <Languages className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span className="sr-only">{t("shell.language")}</span>
            <select
              className="min-w-0 flex-1 bg-transparent outline-none"
              value={locale}
              onChange={(event) => onLocaleChange(event.target.value as AppLocale)}
            >
              <option value="zh-CN">中文</option>
              <option value="en-US">English</option>
            </select>
          </label>
          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={onSignOut}
          >
            <LogOut className="size-4" aria-hidden="true" />
            {t("shell.signOut")}
          </button>
        </div>
      </div>
    </section>
  );
}

function SystemStatusItem({
  icon: Icon,
  label,
  value,
  detail,
  warningCount
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: string;
  warningCount: number;
}) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-blue-600" aria-hidden="true" />
          <p className="truncate text-xs font-semibold text-slate-700">{label}</p>
        </div>
        <StatusDot warningCount={warningCount} />
      </div>
      <p className="mt-2 truncate text-sm font-semibold text-slate-950">{value}</p>
      {detail ? <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </div>
  );
}

function StatusDot({ warningCount }: { warningCount: number }) {
  return (
    <span
      className={cn(
        "inline-flex min-w-5 items-center justify-center rounded border px-1.5 py-0.5 text-[11px] font-semibold",
        warningCount > 0
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      )}
    >
      {warningCount > 0 ? warningCount : "OK"}
    </span>
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
  const [isNavigationOpen, setIsNavigationOpen] = useState(false);
  const [navigationQuery, setNavigationQuery] = useState("");
  const { locale, setLocale, t } = useLocale();
  const repositoryDiagnostics = repositoryStatus?.diagnostics ?? [];
  const systemWarningCount = (repositoryStatus?.warningCount ?? 0) + (authSessionStatus?.warningCount ?? 0);
  const activeRoute = routes.find((route) => route.path === activePath) ?? routes[0];
  const navigationGroups = useMemo(
    () => groupRoutesForNavigation(routes, navigationQuery, locale),
    [locale, navigationQuery, routes]
  );
  const workbenchRoute = routes.find((route) => route.module === "Workbench");

  useEffect(() => {
    setIsNavigationOpen(false);
  }, [activePath]);

  const getGroupLabel = (groupId: NavigationGroupId) => {
    const labels: Record<NavigationGroupId, string> = {
      workspace: t("shell.groupWorkspace"),
      supply: t("shell.groupSupply"),
      revenue: t("shell.groupRevenue"),
      governance: t("shell.groupGovernance")
    };
    return labels[groupId];
  };

  const navigate = (path: string) => {
    onRouteChange(path);
    setIsNavigationOpen(false);
  };

  return (
    <div className="min-h-screen max-w-full overflow-x-hidden bg-pgos-bg text-pgos-text">
      {isNavigationOpen ? (
        <button
          className="fixed inset-0 z-30 bg-slate-950/30 lg:hidden"
          type="button"
          aria-label={t("shell.closeMenu")}
          onClick={() => setIsNavigationOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[280px] border-r border-slate-200 bg-white transition-transform duration-200 lg:translate-x-0",
          isNavigationOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-100 px-5">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                PG
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">PG OS</p>
                <p className="text-xs text-slate-500">{t("shell.operationSystem")}</p>
              </div>
            </div>
            <button
              className="inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
              type="button"
              aria-label={t("shell.closeMenu")}
              onClick={() => setIsNavigationOpen(false)}
            >
              <X className="size-5" aria-hidden="true" />
            </button>
          </div>

          <div className="border-b border-slate-100 px-4 py-4">
            <label className="relative block" htmlFor="navigation-search">
              <span className="sr-only">{t("shell.searchNavigation")}</span>
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                id="navigation-search"
                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                type="search"
                value={navigationQuery}
                placeholder={t("shell.searchNavigation")}
                onChange={(event) => setNavigationQuery(event.target.value)}
              />
            </label>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4" aria-label={t("shell.navigation")}>
            {navigationGroups.length > 0 ? (
              <div className="space-y-6">
                {navigationGroups.map((group) => (
                  <section key={group.id} aria-labelledby={`nav-group-${group.id}`}>
                    <h2
                      id={`nav-group-${group.id}`}
                      className="mb-2 px-3 text-[11px] font-semibold uppercase text-slate-400"
                    >
                      {getGroupLabel(group.id)}
                    </h2>
                    <div className="space-y-1">
                      {group.routes.map((route) => {
                        const RouteIcon = getRouteIcon(route);
                        const isActive = activePath === route.path;
                        return (
                          <button
                            key={route.path}
                            className={cn(
                              "group flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition",
                              isActive
                                ? "bg-blue-50 text-blue-700"
                                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                            )}
                            type="button"
                            aria-current={isActive ? "page" : undefined}
                            onClick={() => navigate(route.path)}
                          >
                            <RouteIcon
                              className={cn(
                                "size-4 shrink-0",
                                isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                              )}
                              aria-hidden="true"
                            />
                            <span className="min-w-0 flex-1 leading-5">{getRouteDisplayTitle(route, locale)}</span>
                            {isActive ? <ChevronRight className="size-4 shrink-0" aria-hidden="true" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="px-3 py-8 text-center text-sm text-slate-500">{t("shell.noNavigationResults")}</div>
            )}
          </nav>

          <div className="shrink-0 border-t border-slate-100 p-4">
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                <UserCheck className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase text-slate-400">{t("shell.activeRole")}</p>
                <p className="truncate text-sm font-semibold text-slate-900">
                  {getRoleDisplayName(activeRole, locale)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 lg:pl-[280px]">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-[64px] min-w-0 items-center justify-between gap-2 px-3 sm:h-[72px] sm:gap-3 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 lg:hidden"
                type="button"
                aria-label={t("shell.openMenu")}
                onClick={() => setIsNavigationOpen(true)}
              >
                <Menu className="size-5" aria-hidden="true" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">
                  {activeRoute ? getRouteDisplayTitle(activeRoute, locale) : "PG OS"}
                </p>
                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  {activeRoute ? getGroupLabel(getNavigationGroup(activeRoute)) : t("shell.operationSystem")}
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <label className="sr-only" htmlFor="role-select">
                {t("shell.switchRole")}
              </label>
              <select
                id="role-select"
                className="h-10 w-[112px] max-w-[34vw] truncate rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 sm:w-auto sm:max-w-[210px] sm:px-3"
                value={activeRole}
                onChange={(event) => onRoleChange(event.target.value as RoleCode)}
              >
                {availableRoles.map((roleCode) => (
                  <option key={roleCode} value={roleCode}>
                    {getRoleDisplayName(roleCode, locale)}
                  </option>
                ))}
              </select>

              <div className="relative">
                <button
                  className={cn(
                    "flex size-10 items-center justify-center gap-2 rounded-lg border text-sm transition sm:w-auto sm:px-3",
                    systemWarningCount > 0
                      ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  )}
                  type="button"
                  title={t("shell.systemStatus")}
                  aria-label={t("shell.systemStatus")}
                  aria-expanded={isRepositoryPanelOpen}
                  aria-haspopup="dialog"
                  onClick={() => setIsRepositoryPanelOpen((isOpen) => !isOpen)}
                >
                  <ShieldCheck className="size-4 text-blue-600" aria-hidden="true" />
                  <span className="hidden sm:inline">{t("shell.systemStatus")}</span>
                  {systemWarningCount > 0 ? (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-700">
                      {systemWarningCount}
                    </span>
                  ) : null}
                </button>
                {isRepositoryPanelOpen ? (
                  <RepositoryDiagnosticsPanel
                    diagnostics={repositoryDiagnostics}
                    repositoryStatus={repositoryStatus}
                    authSessionStatus={authSessionStatus}
                    locale={locale}
                    onLocaleChange={setLocale}
                    onSignOut={onSignOut}
                    onClose={() => setIsRepositoryPanelOpen(false)}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {activeRoute ? (
            <div className="flex min-h-11 flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-2 sm:px-6">
              <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
                <span>{getGroupLabel(getNavigationGroup(activeRoute))}</span>
                <ChevronRight className="size-3.5 shrink-0 text-slate-300" aria-hidden="true" />
                <span className="truncate font-medium text-slate-700">{getRouteDisplayTitle(activeRoute, locale)}</span>
              </div>
              <div className="flex items-center gap-3">
                {workbenchRoute && activeRoute.path !== workbenchRoute.path ? (
                  <button
                    className="hidden text-xs font-medium text-slate-600 hover:text-blue-700 sm:inline-flex"
                    type="button"
                    onClick={() => navigate(workbenchRoute.path)}
                  >
                    {t("shell.backWorkbench")}
                  </button>
                ) : null}
                <div className="flex items-center gap-2 text-xs text-blue-700">
                  <span className="hidden font-medium text-slate-500 md:inline">{t("shell.pagePurpose")}</span>
                  <span className="font-semibold">{getRoutePrimaryAction(activeRoute, locale)}</span>
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                </div>
              </div>
            </div>
          ) : null}
        </header>

        <main id="page-content" className="mx-auto min-w-0 max-w-[1680px] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
