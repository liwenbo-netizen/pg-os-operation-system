import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "./app/AppShell";
import { ContractWorkspacePage } from "./pages/contracts/ContractWorkspacePage";
import { DiagnosticCasePage } from "./pages/diagnostics/DiagnosticCasePage";
import { FinanceSettlementPage } from "./pages/finance/FinanceSettlementPage";
import { GuideCenterPage } from "./pages/guide/GuideCenterPage";
import { LoginPage } from "./pages/LoginPage";
import { MediaExperiencePage } from "./pages/media/MediaExperiencePage";
import { RoutePlaceholderPage } from "./pages/RoutePlaceholderPage";
import { SalesExperiencePage } from "./pages/sales/SalesExperiencePage";
import { AuditEventConsolePage } from "./pages/audit/AuditEventConsolePage";
import { SystemHealthPage } from "./pages/system/SystemHealthPage";
import { UatResultHistoryPage } from "./pages/uat/UatResultHistoryPage";
import { UatScriptCenterPage } from "./pages/uat/UatScriptCenterPage";
import { WorkbenchOperationsPage } from "./pages/workbench/WorkbenchOperationsPage";
import { roleCodes, roleDefinitions, type RoleCode } from "./constants/roles";
import { getDefaultRouteForRole, routeDefinitions } from "./routes/routes";
import { canViewRoute } from "./routes/routeGuards";
import { createInitialContractWorkflowState } from "./services/contractService";
import { createInitialFinanceWorkflowState } from "./services/financeSettlementService";
import { createInitialMediaWorkflowState } from "./services/mediaWorkflowService";
import { createInitialSalesWorkflowState } from "./services/salesWorkflowService";
import { createInitialGuideWorkflowState } from "./services/sopService";
import { createInitialWorkbenchWorkflowState } from "./services/workbenchService";
import { buildBusinessAuditAfterData } from "./services/businessAuditCoverage";
import { buildWarningDiagnostics } from "./services/warningDiagnosticsService";
import { createWorkflowRepository } from "./repositories/workflowRepositoryFactory";
import type { WorkflowRepositoryHealth, WorkflowSnapshot } from "./repositories/workflowRepository";
import {
  createAuthSessionRepository,
  type AuthSessionMode,
  type AuthSessionResult,
  type SupabasePasswordSignInInput
} from "./repositories/authSessionRepository";
import { createAuditLogRepository, type AuditLogWriteInput } from "./repositories/auditLogRepository";
import type { AuditEvent, BusinessUser, EntityId, WorkbenchTask } from "./types/domain";
import { formatUtcPlus8DateTime } from "./lib/time";

export function App() {
  const [activeRole, setActiveRole] = useState<RoleCode>("ceo");
  const [activePath, setActivePath] = useState(getDefaultRouteForRole("ceo"));
  const [activeObjectId, setActiveObjectId] = useState<EntityId | undefined>();
  const [activeUser, setActiveUser] = useState<BusinessUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthSessionMode>("mock");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | undefined>();
  const [authWarnings, setAuthWarnings] = useState<string[]>([]);
  const [mediaWorkflowState, setMediaWorkflowState] = useState(createInitialMediaWorkflowState);
  const [salesWorkflowState, setSalesWorkflowState] = useState(createInitialSalesWorkflowState);
  const [financeWorkflowState, setFinanceWorkflowState] = useState(createInitialFinanceWorkflowState);
  const [contractWorkflowState, setContractWorkflowState] = useState(createInitialContractWorkflowState);
  const [guideWorkflowState, setGuideWorkflowState] = useState(createInitialGuideWorkflowState);
  const [workbenchWorkflowState, setWorkbenchWorkflowState] = useState(createInitialWorkbenchWorkflowState);
  const [workflowRepository] = useState(() => createWorkflowRepository());
  const [authSessionRepository] = useState(() => createAuthSessionRepository());
  const [auditLogRepository] = useState(() => createAuditLogRepository());
  const [repositoryHealth, setRepositoryHealth] = useState<WorkflowRepositoryHealth>(() => ({
    mode: workflowRepository.mode,
    source: workflowRepository.mode === "supabase" ? "supabase-loading" : "fixtureRepository",
    loadedAt: new Date().toISOString(),
    warnings: []
  }));
  const repositoryLoadedRef = useRef(false);
  const skipNextSaveRef = useRef(true);

  const visibleRoutes = useMemo(
    () => routeDefinitions.filter((route) => canViewRoute(activeRole, route.path).allowed),
    [activeRole]
  );
  const availableRoles = useMemo(
    () => (authMode === "mock" ? roleCodes : activeUser?.roles ?? [activeRole]),
    [activeRole, activeUser?.roles, authMode]
  );
  const authSessionStatus = useMemo(
    () => ({
      label: authMode === "supabase" ? "Supabase auth" : "Mock auth",
      detail: activeUser
        ? `${activeUser.email} / ${activeUser.roles.map((role) => roleDefinitions[role].name).join(", ")}`
        : "Not signed in",
      warningCount: authWarnings.length + (authError ? 1 : 0)
    }),
    [activeUser, authError, authMode, authWarnings.length]
  );
  const repositoryDiagnostics = useMemo(
    () =>
      buildWarningDiagnostics({
        activeRole,
        repositoryHealth,
        user: activeUser
      }),
    [activeRole, activeUser, repositoryHealth]
  );
  const repositoryStatus = useMemo(() => {
    const warningCount = repositoryHealth.warnings.length + (repositoryHealth.skippedWrites?.length ?? 0);
    const label =
      repositoryHealth.mode === "supabase"
        ? repositoryHealth.source === "supabase-loading"
          ? "Supabase loading"
          : warningCount > 0
            ? "Supabase warning"
            : "Supabase synced"
        : "Fixture data";

    return {
      label,
      detail: `${repositoryHealth.source} / ${formatUtcPlus8DateTime(repositoryHealth.loadedAt)}`,
      warningCount,
      diagnostics: repositoryDiagnostics
    };
  }, [repositoryHealth, repositoryDiagnostics]);
  const workflowSnapshot = useMemo<WorkflowSnapshot>(
    () => ({
      mediaState: mediaWorkflowState,
      salesState: salesWorkflowState,
      financeState: financeWorkflowState,
      contractState: contractWorkflowState,
      guideState: guideWorkflowState,
      workbenchState: workbenchWorkflowState
    }),
    [
      contractWorkflowState,
      financeWorkflowState,
      guideWorkflowState,
      mediaWorkflowState,
      salesWorkflowState,
      workbenchWorkflowState
    ]
  );

  const activeRoute =
    visibleRoutes.find((route) => route.path === activePath) ?? visibleRoutes[0] ?? routeDefinitions[0];

  useEffect(() => {
    if (!authSessionRepository.supportsSupabase) {
      return;
    }

    let cancelled = false;
    setAuthLoading(true);

    authSessionRepository
      .getCurrentSessionUser(activeRole)
      .then((result) => {
        if (cancelled) {
          return;
        }

        applyAuthResult(result, { silentSignedOut: true });
      })
      .finally(() => {
        if (!cancelled) {
          setAuthLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [authSessionRepository]);

  useEffect(() => {
    let cancelled = false;

    workflowRepository
      .loadSnapshot()
      .then(({ snapshot, health }) => {
        if (cancelled) {
          return;
        }

        setMediaWorkflowState(snapshot.mediaState);
        setSalesWorkflowState(snapshot.salesState);
        setFinanceWorkflowState(snapshot.financeState);
        setContractWorkflowState(snapshot.contractState);
        setGuideWorkflowState(snapshot.guideState);
        setWorkbenchWorkflowState(snapshot.workbenchState);
        setRepositoryHealth(health);
        repositoryLoadedRef.current = true;
        skipNextSaveRef.current = true;
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        setRepositoryHealth({
          mode: workflowRepository.mode,
          source: "fixtureRepository",
          loadedAt: new Date().toISOString(),
          warnings: [error instanceof Error ? error.message : "Workflow repository load failed."]
        });
        repositoryLoadedRef.current = true;
      });

    return () => {
      cancelled = true;
    };
  }, [workflowRepository]);

  useEffect(() => {
    if (!repositoryLoadedRef.current || workflowRepository.mode !== "supabase") {
      return undefined;
    }

    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return undefined;
    }

    const snapshot: WorkflowSnapshot = {
      mediaState: mediaWorkflowState,
      salesState: salesWorkflowState,
      financeState: financeWorkflowState,
      contractState: contractWorkflowState,
      guideState: guideWorkflowState,
      workbenchState: workbenchWorkflowState
    };
    const saveHandle = window.setTimeout(() => {
      workflowRepository
        .saveSnapshot(snapshot, { actor: activeUser })
        .then((result) => {
          setRepositoryHealth({
            mode: result.mode,
            source: result.warnings.length > 0 ? "supabase-save-warning" : "supabase",
            loadedAt: new Date().toISOString(),
            warnings: result.warnings,
            skippedWrites: result.skippedWrites
          });
        })
        .catch((error) => {
          setRepositoryHealth({
            mode: workflowRepository.mode,
            source: "supabase-save-error",
            loadedAt: new Date().toISOString(),
            warnings: [error instanceof Error ? error.message : "Workflow repository save failed."]
          });
        });
    }, 700);

    return () => window.clearTimeout(saveHandle);
  }, [
    contractWorkflowState,
    financeWorkflowState,
    guideWorkflowState,
    mediaWorkflowState,
    salesWorkflowState,
    workflowRepository,
    workbenchWorkflowState
  ]);

  function applyAuthResult(result: AuthSessionResult, options?: { silentSignedOut?: boolean }) {
    setAuthWarnings(result.warnings);

    if (result.status === "authenticated" && result.user) {
      setActiveUser(result.user);
      setAuthMode(result.mode);
      setAuthError(undefined);
      setActiveRole(result.user.activeRole);
      setActivePath(getDefaultRouteForRole(result.user.activeRole));
      setActiveObjectId(undefined);
      return;
    }

    if (result.status === "signed_out") {
      setActiveUser(null);
      setAuthMode(result.mode);
      setAuthError(options?.silentSignedOut ? undefined : result.error);
      return;
    }

    setAuthError(result.error ?? "Authentication failed.");
  }

  async function handleMockSignIn(nextRole: RoleCode) {
    setAuthLoading(true);
    try {
      applyAuthResult(await authSessionRepository.signInWithRole(nextRole));
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSupabaseSignIn(input: SupabasePasswordSignInInput) {
    setAuthLoading(true);
    try {
      const result = await authSessionRepository.signInWithPassword(input);
      applyAuthResult(result);

      if (result.status === "authenticated" && result.user) {
        void recordAuditLogForUser(
          result.user,
          {
            action: "auth.sign_in",
            objectType: "route",
            allowed: true,
            reasonCode: "AUTH_SIGN_IN",
            afterData: {
              requestedRole: input.requestedRole,
              activeRole: result.user.activeRole,
              source: result.source
            }
          },
          result.mode
        );
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthLoading(true);
    try {
      const signingOutUser = activeUser;
      if (authMode === "supabase" && signingOutUser) {
        await recordAuditLogForUser(
          signingOutUser,
          {
            action: "auth.sign_out",
            objectType: "route",
            allowed: true,
            reasonCode: "AUTH_SIGN_OUT",
            afterData: {
              activeRole: signingOutUser.activeRole
            }
          },
          "supabase"
        );
      }

      if (authMode === "supabase") {
        const result = await authSessionRepository.signOut();
        if (result.status === "error") {
          applyAuthResult(result);
          return;
        }
      }
      setActiveUser(null);
      setAuthMode("mock");
      setAuthError(undefined);
      setAuthWarnings([]);
    } finally {
      setAuthLoading(false);
    }
  }

  function handleRoleChange(nextRole: RoleCode) {
    if (authMode === "supabase" && activeUser && !activeUser.roles.includes(nextRole)) {
      void recordAuditLogForUser(activeUser, {
        action: "role.switch.denied",
        objectType: "route",
        allowed: false,
        reasonCode: "ROLE_NOT_ASSIGNED",
        afterData: {
          fromRole: activeUser.activeRole,
          requestedRole: nextRole
        }
      });
      setAuthWarnings([`${roleDefinitions[nextRole].name} is not assigned to ${activeUser.email}.`]);
      return;
    }

    if (activeUser && activeUser.activeRole !== nextRole) {
      void recordAuditLogForUser(activeUser, {
        action: "role.switch",
        objectType: "route",
        allowed: true,
        reasonCode: "ROLE_SWITCH",
        afterData: {
          fromRole: activeUser.activeRole,
          toRole: nextRole
        }
      });
    }

    setActiveRole(nextRole);
    setActiveObjectId(undefined);
    setActiveUser((currentUser) =>
      currentUser
        ? {
            ...currentUser,
            activeRole: nextRole,
            roles: authMode === "mock" ? [nextRole] : currentUser.roles
          }
        : currentUser
    );
    setActivePath(getDefaultRouteForRole(nextRole));
  }

  function handleRouteChange(nextPath: string, objectId?: EntityId) {
    const guardResult = canViewRoute(activeRole, nextPath);
    const route = routeDefinitions.find((definition) => definition.path === nextPath);

    if (!guardResult.allowed) {
      if (activeUser) {
        void recordAuditLogForUser(activeUser, {
          action: "route.denied",
          objectType: "route",
          allowed: false,
          reasonCode: guardResult.reason_code,
          afterData: {
            path: nextPath,
            role: activeRole,
            message: guardResult.message
          }
        });
      }
      return;
    }

    setActiveObjectId(objectId);

    if (activeUser) {
      void recordAuditLogForUser(activeUser, {
        action: "route.visit",
        objectType: "route",
        allowed: true,
        reasonCode: "ROUTE_VISIT",
        afterData: {
          path: nextPath,
          role: activeRole,
          title: route?.title,
          module: route?.module
        }
      });
    }

    setActivePath(nextPath);
  }

  function handleOpenWorkbenchTask(task: WorkbenchTask) {
    handleRouteChange(task.related_route, task.source_object_id);
  }

  function handleWorkflowAuditEvent(event: AuditEvent) {
    if (!activeUser) {
      return;
    }

    void recordAuditLogForUser(activeUser, {
      id: event.id,
      action: event.action,
      objectType: event.objectType,
      objectId: event.objectId,
      allowed: event.allowed,
      reasonCode: event.reasonCode,
      afterData: buildBusinessAuditAfterData(event, activeUser.activeRole),
      createdAt: event.createdAt
    });
  }

  async function recordAuditLogForUser(
    user: BusinessUser,
    input: Omit<AuditLogWriteInput, "actorUserId">,
    mode: AuthSessionMode = authMode
  ) {
    if (mode !== "supabase" || !auditLogRepository.supportsSupabase) {
      return;
    }

    const result = await auditLogRepository.recordEvent({
      ...input,
      actorUserId: user.id
    });

    if (!result.ok && result.warning) {
      console.warn(result.warning);
    }
  }

  if (!activeUser) {
    return (
      <LoginPage
        selectedRole={activeRole}
        authLoading={authLoading}
        authError={authError}
        authWarnings={authWarnings}
        isSupabaseAvailable={authSessionRepository.supportsSupabase}
        onRoleChange={setActiveRole}
        onMockSignIn={handleMockSignIn}
        onSupabaseSignIn={handleSupabaseSignIn}
      />
    );
  }

  return (
    <AppShell
      activePath={activeRoute.path}
      activeRole={activeRole}
      routes={visibleRoutes}
      onRouteChange={handleRouteChange}
      onRoleChange={handleRoleChange}
      onSignOut={handleSignOut}
      repositoryStatus={repositoryStatus}
      authSessionStatus={authSessionStatus}
      availableRoles={availableRoles}
    >
      {activeRoute.path === "/system/health" ? (
        <SystemHealthPage
          activePath={activeRoute.path}
          authMode={authMode}
          authWarningCount={authWarnings.length + (authError ? 1 : 0)}
          repositoryHealth={repositoryHealth}
          repositoryWarningCount={repositoryHealth.warnings.length + (repositoryHealth.skippedWrites?.length ?? 0)}
          route={activeRoute}
          snapshot={workflowSnapshot}
          supportsSupabase={authSessionRepository.supportsSupabase}
          user={activeUser}
        />
      ) : activeRoute.path === "/audit/events" ? (
        <AuditEventConsolePage route={activeRoute} snapshot={workflowSnapshot} user={activeUser} />
      ) : activeRoute.path === "/uat/scripts" ? (
        <UatScriptCenterPage authMode={authMode} route={activeRoute} user={activeUser} />
      ) : activeRoute.path === "/uat/history" ? (
        <UatResultHistoryPage route={activeRoute} user={activeUser} />
      ) : activeRoute.path === "/workbench" || activeRoute.path === "/ceo/dashboard" ? (
        <WorkbenchOperationsPage
          route={activeRoute}
          role={roleDefinitions[activeRole]}
          user={activeUser}
          state={workbenchWorkflowState}
          mediaState={mediaWorkflowState}
          salesState={salesWorkflowState}
          financeState={financeWorkflowState}
          contractState={contractWorkflowState}
          guideState={guideWorkflowState}
          onStateChange={setWorkbenchWorkflowState}
          onOpenTask={handleOpenWorkbenchTask}
        />
      ) : activeRoute.path.startsWith("/media/") ? (
        <MediaExperiencePage
          route={activeRoute}
          role={roleDefinitions[activeRole]}
          user={activeUser}
          state={mediaWorkflowState}
          onStateChange={setMediaWorkflowState}
          onAuditEvent={handleWorkflowAuditEvent}
          onRouteChange={setActivePath}
        />
      ) : activeRoute.path.startsWith("/sales/") ||
        activeRoute.path.startsWith("/proposals/") ||
        activeRoute.path.startsWith("/campaigns/") ? (
        <SalesExperiencePage
          route={activeRoute}
          role={roleDefinitions[activeRole]}
          user={activeUser}
          state={salesWorkflowState}
          mediaState={mediaWorkflowState}
          onStateChange={setSalesWorkflowState}
          onAuditEvent={handleWorkflowAuditEvent}
          onRouteChange={setActivePath}
        />
      ) : activeRoute.path.startsWith("/diagnostics/") ? (
        <DiagnosticCasePage
          route={activeRoute}
          role={roleDefinitions[activeRole]}
          user={activeUser}
          state={mediaWorkflowState}
          salesState={salesWorkflowState}
          onStateChange={setMediaWorkflowState}
        />
      ) : activeRoute.path.startsWith("/finance/") ? (
        <FinanceSettlementPage
          route={activeRoute}
          role={roleDefinitions[activeRole]}
          user={activeUser}
          state={financeWorkflowState}
          mediaState={mediaWorkflowState}
          salesState={salesWorkflowState}
          selectedSettlementId={activeObjectId}
          onStateChange={setFinanceWorkflowState}
          onAuditEvent={handleWorkflowAuditEvent}
        />
      ) : activeRoute.path.startsWith("/contracts/") ? (
        <ContractWorkspacePage
          route={activeRoute}
          role={roleDefinitions[activeRole]}
          user={activeUser}
          state={contractWorkflowState}
          mediaState={mediaWorkflowState}
          salesState={salesWorkflowState}
          financeState={financeWorkflowState}
          selectedContractId={activeObjectId}
          onStateChange={setContractWorkflowState}
          onAuditEvent={handleWorkflowAuditEvent}
        />
      ) : activeRoute.path === "/guide" ? (
        <GuideCenterPage
          route={activeRoute}
          role={roleDefinitions[activeRole]}
          user={activeUser}
          state={guideWorkflowState}
          onStateChange={setGuideWorkflowState}
        />
      ) : (
        <RoutePlaceholderPage route={activeRoute} role={roleDefinitions[activeRole]} />
      )}
    </AppShell>
  );
}
