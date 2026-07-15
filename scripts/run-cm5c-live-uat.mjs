import { createClient } from "@supabase/supabase-js";
import { createServer } from "vite";
import {
  buildUatUsers,
  formatSupabaseError,
  getSupabaseAnonKey,
  getSupabaseUrl,
  loadEnvFiles
} from "./supabase-uat-auth-lib.mjs";
import {
  buildCm5cPlan,
  cm5cAuditRequirements,
  selectCm5cCandidate,
  summarizeCm5cProof
} from "./cm5c-live-uat-lib.mjs";

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const json = argv.includes("--json");
const requestedRole = argv.find((arg) => arg.startsWith("--role="))?.slice("--role=".length) || "media_manager";
const supportedMediaRoles = new Set(["media_manager", "media_director"]);
const integrationRoute = "/media/integration-wizard/:id";
const productionUrl = "https://pg-os-operation-system.vercel.app/media/china-ecosystem";
const env = loadEnvFiles();
const supabaseUrl = getSupabaseUrl(env);
const anonKey = getSupabaseAnonKey(env);
const traceId = `cm5c-live-${Date.now()}`;

function assertConfiguration() {
  const failures = [];
  if (!supportedMediaRoles.has(requestedRole)) {
    failures.push(`Unsupported CM-5C media actor role: ${requestedRole}.`);
  }
  if (!supabaseUrl) {
    failures.push("VITE_SUPABASE_URL or SUPABASE_URL is required.");
  }
  if (!anonKey) {
    failures.push("VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required.");
  }

  const users = buildUatUsers(env, [requestedRole, "integration_manager", "ceo"]);
  for (const user of users) {
    if (!user.password) {
      failures.push(`A UAT password is required for ${user.primaryRole}.`);
    }
  }

  if (failures.length > 0) {
    throw new Error(failures.join(" "));
  }

  return new Map(users.map((user) => [user.primaryRole, user]));
}

function createAnonClient() {
  return createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

async function signIn(userPlan) {
  const client = createAnonClient();
  const signInResult = await client.auth.signInWithPassword({
    email: userPlan.email,
    password: userPlan.password
  });

  if (signInResult.error || !signInResult.data.user) {
    throw new Error(
      `${userPlan.primaryRole} sign-in failed: ${
        signInResult.error ? formatSupabaseError(signInResult.error) : "no user returned"
      }`
    );
  }

  const userId = signInResult.data.user.id;
  const [profileResult, rolesResult] = await Promise.all([
    client.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    client.from("user_roles").select("role_code").eq("user_id", userId)
  ]);
  if (profileResult.error) {
    throw new Error(`${userPlan.primaryRole} profile read failed: ${formatSupabaseError(profileResult.error)}`);
  }
  if (rolesResult.error) {
    throw new Error(`${userPlan.primaryRole} role read failed: ${formatSupabaseError(rolesResult.error)}`);
  }

  const roles = (rolesResult.data ?? []).map((row) => row.role_code);
  if (!roles.includes(userPlan.primaryRole)) {
    throw new Error(`${userPlan.primaryRole} is not assigned to ${userPlan.email}.`);
  }

  return {
    client,
    user: {
      id: userId,
      email: userPlan.email,
      fullName: profileResult.data?.full_name || userPlan.fullName,
      roles,
      activeRole: userPlan.primaryRole
    }
  };
}

function assertSupabaseResult(result, action) {
  if (result.error) {
    throw new Error(`${action}: ${formatSupabaseError(result.error)}`);
  }
  return result.data;
}

function assertRepositoryHealth(loaded, role) {
  if (loaded.health.warnings.length > 0) {
    throw new Error(`${role} Supabase snapshot contains fallback warnings: ${loaded.health.warnings.join("; ")}`);
  }
}

async function persistAudit(auditRepository, buildBusinessAuditAfterData, event, actor, metadata = {}) {
  const result = await auditRepository.recordEvent({
    id: event.id,
    actorUserId: actor.id,
    action: event.action,
    objectType: event.objectType,
    objectId: event.objectId,
    allowed: event.allowed,
    reasonCode: event.reasonCode,
    afterData: {
      ...buildBusinessAuditAfterData(event, actor.activeRole),
      traceId,
      uatPhase: "CM-5C",
      ...metadata
    },
    createdAt: event.createdAt
  });
  if (!result.ok) {
    throw new Error(`${event.action} audit persistence failed: ${result.warning ?? result.source}`);
  }
}

async function persistRouteVisit(auditRepository, buildBusinessAuditAfterData, actor, publisherId) {
  const event = {
    action: cm5cAuditRequirements.routeAction,
    objectType: "route",
    allowed: true,
    reasonCode: "ROUTE_VISIT"
  };
  const result = await auditRepository.recordEvent({
    actorUserId: actor.id,
    action: event.action,
    objectType: event.objectType,
    allowed: event.allowed,
    reasonCode: event.reasonCode,
    afterData: {
      ...buildBusinessAuditAfterData(event, actor.activeRole),
      path: integrationRoute,
      role: actor.activeRole,
      title: "Technical Integration Wizard",
      module: "Media",
      selectedPublisherId: publisherId,
      traceId,
      uatPhase: "CM-5C"
    }
  });
  if (!result.ok) {
    throw new Error(`route.visit audit persistence failed: ${result.warning ?? result.source}`);
  }
}

async function readProof(client, candidateId, integrationProjectId, integrationUserId) {
  const [handoffAudits, handoffEvents, taskAudits, taskEvents, routeAuditRows] = await Promise.all([
    client
      .from("audit_logs")
      .select("id,action,actor_user_id,after_data,created_at")
      .eq("object_id", candidateId)
      .eq("action", cm5cAuditRequirements.handoffAction),
    client
      .from("module_business_events")
      .select("id,event_code,owner_role,payload,created_at")
      .eq("object_id", candidateId)
      .eq("event_code", cm5cAuditRequirements.handoffEvent),
    client
      .from("audit_logs")
      .select("id,action,actor_user_id,after_data,created_at")
      .eq("object_id", integrationProjectId)
      .eq("action", cm5cAuditRequirements.taskAction),
    client
      .from("module_business_events")
      .select("id,event_code,owner_role,payload,created_at")
      .eq("object_id", integrationProjectId)
      .eq("event_code", cm5cAuditRequirements.taskEvent),
    client
      .from("audit_logs")
      .select("id,action,actor_user_id,after_data,created_at")
      .eq("actor_user_id", integrationUserId)
      .eq("action", cm5cAuditRequirements.routeAction)
      .order("created_at", { ascending: false })
      .limit(100)
  ]);

  const proofRows = {
    handoffAudits: assertSupabaseResult(handoffAudits, "verify CM-5C handoff audit"),
    handoffEvents: assertSupabaseResult(handoffEvents, "verify CM-5C handoff business event"),
    taskAudits: assertSupabaseResult(taskAudits, "verify CM-5C task audit"),
    taskEvents: assertSupabaseResult(taskEvents, "verify CM-5C task business event"),
    routeAudits: assertSupabaseResult(routeAuditRows, "verify CM-5C route audit").filter(
      (row) => row.after_data?.traceId === traceId && row.after_data?.path === integrationRoute
    )
  };
  const summary = summarizeCm5cProof(proofRows);
  if (!summary.complete) {
    throw new Error(`CM-5C audit proof is incomplete: ${summary.missing.join(", ")}.`);
  }

  return summary;
}

function buildLedgerSteps({ candidate, mediaUser, integrationUser, ceoUser, integrationProject, execution, proof }) {
  const now = new Date().toISOString();
  const common = {
    script_id: "cm5c-live-write-uat",
    script_title: "CM-5C Onboarding Handoff and Task Binding Live UAT",
    status: "passed",
    updated_by: ceoUser.id,
    updated_at: now
  };
  const step = (roleCode, actorUserId, stepId, action, expectedResult, actualResult, metadata = {}) => ({
    ...common,
    role_code: roleCode,
    actor_user_id: actorUserId,
    actor_role: roleCode,
    step_id: stepId,
    step_action: action,
    expected_result: expectedResult,
    actual_result: actualResult,
    metadata: {
      candidateId: candidate.id,
      mediaName: candidate.media_name,
      publisherId: candidate.publisher_id,
      integrationProjectId: integrationProject.id,
      traceId,
      ...metadata
    }
  });

  return [
    step(
      mediaUser.activeRole,
      mediaUser.id,
      "cm5c-handoff",
      "Confirm onboarding handoff",
      "A real media session confirms handoff without duplicating the persisted handoff marker.",
      execution.handoffExecuted ? "Handoff confirmed and persisted." : "Existing handoff marker verified; duplicate write skipped."
    ),
    step(
      "integration_manager",
      integrationUser.id,
      "cm5c-task-binding",
      "Resolve Integration Manager workbench task",
      "The derived task binds integration project id to the linked publisher and is startable.",
      `Task ${integrationProject.id} resolved with publisher ${candidate.publisher_id}.`
    ),
    step(
      "integration_manager",
      integrationUser.id,
      "cm5c-task-start",
      "Start selected integration task",
      "Starting the task persists work_items.status=in_progress and workbench.task_started.",
      execution.taskStarted ? "Task started and persisted as in_progress." : "Existing in_progress task and historical proof verified."
    ),
    step(
      "integration_manager",
      integrationUser.id,
      "cm5c-route-visit",
      "Open bound Technical Integration Wizard",
      "The Integration Manager route is allowed and route.visit records the selected Publisher 360 id.",
      `Route ${integrationRoute} recorded for publisher ${candidate.publisher_id}.`
    ),
    step(
      "ceo",
      ceoUser.id,
      "cm5c-audit-proof",
      "Verify audit and business event proof",
      "CEO can trace handoff, task start, and route visit in Supabase live observability.",
      `Verified ${Object.values(proof.counts).reduce((sum, count) => sum + count, 0)} proof row(s).`,
      { proofCounts: proof.counts }
    )
  ];
}

async function saveUatLedger(client, ceoUser, candidate, mediaUser, integrationUser, integrationProject, execution, proof) {
  const runKey = `cm5c-live-${candidate.id}`;
  const steps = buildLedgerSteps({
    candidate,
    mediaUser,
    integrationUser,
    ceoUser,
    integrationProject,
    execution,
    proof
  });
  const run = assertSupabaseResult(
    await client
      .from("uat_script_runs")
      .upsert(
        {
          run_key: runKey,
          environment: "production",
          production_url: productionUrl,
          started_by: ceoUser.id,
          started_by_role: "ceo",
          status: "completed",
          summary: { total: steps.length, passed: steps.length, failed: 0, blocked: 0, pending: 0 },
          metadata: {
            phase: "CM-5C",
            source: "automated_live_write_uat",
            traceId,
            candidateId: candidate.id,
            publisherId: candidate.publisher_id,
            integrationProjectId: integrationProject.id,
            mediaRole: mediaUser.activeRole,
            integrationRole: integrationUser.activeRole
          }
        },
        { onConflict: "run_key" }
      )
      .select("id,run_key")
      .maybeSingle(),
    "save CM-5C UAT run"
  );
  if (!run?.id) {
    throw new Error("CM-5C UAT run did not return an id.");
  }

  assertSupabaseResult(
    await client
      .from("uat_script_step_results")
      .upsert(
        steps.map((item) => ({ ...item, run_id: run.id })),
        { onConflict: "run_id,step_id", ignoreDuplicates: false }
      )
      .select("id"),
    "save CM-5C UAT steps"
  );
  const persistedSteps = assertSupabaseResult(
    await client.from("uat_script_step_results").select("id,status").eq("run_id", run.id),
    "verify CM-5C UAT steps"
  );
  if (persistedSteps.length !== steps.length || persistedSteps.some((item) => item.status !== "passed")) {
    throw new Error(`CM-5C UAT ledger verification failed: expected ${steps.length} passed steps.`);
  }

  return { runId: run.id, runKey: run.run_key, stepCount: steps.length };
}

async function main() {
  const usersByRole = assertConfiguration();
  const mediaSession = await signIn(usersByRole.get(requestedRole));
  const integrationSession = await signIn(usersByRole.get("integration_manager"));
  let ceoSession;
  let vite;

  try {
    vite = await createServer({ appType: "custom", logLevel: "error", server: { middlewareMode: true } });
    const [
      { SupabaseWorkflowRepository },
      { chinaMediaEcosystemService, mediaEcosystemHandoffActivityEvent },
      { workbenchService },
      { createAuditLogRepository },
      { buildBusinessAuditAfterData },
      { guardService }
    ] = await Promise.all([
      vite.ssrLoadModule("/src/repositories/supabaseWorkflowRepository.ts"),
      vite.ssrLoadModule("/src/services/chinaMediaEcosystemService.ts"),
      vite.ssrLoadModule("/src/services/workbenchService.ts"),
      vite.ssrLoadModule("/src/repositories/auditLogRepository.ts"),
      vite.ssrLoadModule("/src/services/businessAuditCoverage.ts"),
      vite.ssrLoadModule("/src/services/guardService.ts")
    ]);

    const mediaRepository = new SupabaseWorkflowRepository(mediaSession.client);
    const mediaAuditRepository = createAuditLogRepository(mediaSession.client, true);
    const mediaLoaded = await mediaRepository.loadSnapshot();
    assertRepositoryHealth(mediaLoaded, mediaSession.user.activeRole);
    if (mediaEcosystemHandoffActivityEvent !== "Onboarding handoff confirmed.") {
      throw new Error("CM-5C handoff event contract does not match the live UAT planner.");
    }

    const candidate = selectCm5cCandidate(
      mediaLoaded.snapshot.mediaState.trustedSupplyCandidates,
      mediaLoaded.snapshot.mediaState.mediaOutreachActivities,
      mediaLoaded.snapshot.mediaState.integrationProjects
    );
    if (!candidate) {
      throw new Error("No onboarding-project-created candidate with Publisher 360 and integration artifacts is available.");
    }
    const integrationProject = mediaLoaded.snapshot.mediaState.integrationProjects.find(
      (item) => item.publisher_id === candidate.publisher_id
    );
    const persistedTask = mediaLoaded.snapshot.workbenchState.tasks.find((item) => item.id === integrationProject?.id);
    const plan = buildCm5cPlan({
      candidate,
      activities: mediaLoaded.snapshot.mediaState.mediaOutreachActivities,
      integrationProject,
      persistedTask
    });

    if (!apply) {
      const output = {
        mode: "dry-run",
        traceId,
        actorRoles: [mediaSession.user.activeRole, integrationSession.user.activeRole, "ceo"],
        snapshotSource: mediaLoaded.health.source,
        ...plan
      };
      if (json) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log("CM-5C live-write UAT dry-run passed.");
        console.log(`- Candidate: ${output.mediaName} (${output.candidateId})`);
        console.log(`- Publisher: ${output.publisherId}`);
        console.log(`- Integration project: ${output.integrationProjectId}`);
        for (const item of output.steps) {
          console.log(`- ${item.execute ? "EXECUTE" : "VERIFY"}: ${item.label}`);
        }
      }
      return;
    }

    const execution = { handoffExecuted: false, taskStarted: false, routeVisited: false };
    let mediaSnapshot = mediaLoaded.snapshot;
    if (!plan.handoffConfirmed) {
      const handoffResult = chinaMediaEcosystemService.confirmOnboardingHandoff(
        mediaSnapshot.mediaState,
        mediaSession.user,
        candidate.id
      );
      if (!handoffResult.guard.allowed || !handoffResult.auditEvent) {
        throw new Error(`Confirm handoff was blocked: ${handoffResult.guard.reasonCode} ${handoffResult.guard.message}`);
      }
      mediaSnapshot = { ...mediaSnapshot, mediaState: handoffResult.state };
      const saveResult = await mediaRepository.saveSnapshot(mediaSnapshot, { actor: mediaSession.user });
      if (!saveResult.ok) {
        throw new Error(`Confirm handoff persistence failed: ${saveResult.warnings.join("; ")}`);
      }
      await persistAudit(
        mediaAuditRepository,
        buildBusinessAuditAfterData,
        handoffResult.auditEvent,
        mediaSession.user,
        { selectedPublisherId: candidate.publisher_id, integrationProjectId: integrationProject.id }
      );
      execution.handoffExecuted = true;
    }

    const handoffRows = assertSupabaseResult(
      await mediaSession.client
        .from("media_ecosystem_outreach_activities")
        .select("id,opportunity_id,event,activity_at")
        .eq("opportunity_id", candidate.lead_id)
        .eq("event", mediaEcosystemHandoffActivityEvent),
      "verify persisted onboarding handoff"
    );
    if (handoffRows.length !== 1) {
      throw new Error(`CM-5C handoff idempotency failed: expected exactly one marker, received ${handoffRows.length}.`);
    }

    const integrationRepository = new SupabaseWorkflowRepository(integrationSession.client);
    const integrationAuditRepository = createAuditLogRepository(integrationSession.client, true);
    const integrationLoaded = await integrationRepository.loadSnapshot();
    assertRepositoryHealth(integrationLoaded, integrationSession.user.activeRole);
    const routeGuard = guardService.canViewRoute(integrationSession.user, integrationRoute);
    if (!routeGuard.allowed) {
      throw new Error(`Integration route guard failed: ${routeGuard.reason_code} ${routeGuard.message}`);
    }

    const workbenchSnapshot = workbenchService.getSnapshot(integrationLoaded.snapshot, integrationSession.user);
    const task = workbenchSnapshot.tasks.find((item) => item.id === integrationProject.id);
    if (!task) {
      throw new Error(`Integration workbench task ${integrationProject.id} was not derived.`);
    }
    if (task.source_object_id !== candidate.publisher_id || task.related_route !== integrationRoute) {
      throw new Error("Integration workbench task binding does not match the linked publisher and route.");
    }
    if (task.status === "blocked") {
      throw new Error(`Integration workbench task is still blocked: ${task.blocker ?? "unknown blocker"}`);
    }

    if (task.status !== "in_progress") {
      const taskResult = workbenchService.startTask(
        integrationLoaded.snapshot.workbenchState,
        integrationSession.user,
        task.id,
        workbenchSnapshot.tasks
      );
      if (!taskResult.guard.allowed || !taskResult.auditEvent) {
        throw new Error(`Start integration task was blocked: ${taskResult.guard.reasonCode} ${taskResult.guard.message}`);
      }
      const nextSnapshot = { ...integrationLoaded.snapshot, workbenchState: taskResult.state };
      const saveResult = await integrationRepository.saveSnapshot(nextSnapshot, { actor: integrationSession.user });
      if (!saveResult.ok) {
        throw new Error(`Integration task persistence failed: ${saveResult.warnings.join("; ")}`);
      }
      await persistAudit(
        integrationAuditRepository,
        buildBusinessAuditAfterData,
        taskResult.auditEvent,
        integrationSession.user,
        { selectedPublisherId: candidate.publisher_id, route: integrationRoute }
      );
      execution.taskStarted = true;
    }

    const persistedWorkItem = assertSupabaseResult(
      await integrationSession.client.from("work_items").select("id,status,object_id,owner_role,metadata").eq("id", task.id).maybeSingle(),
      "verify persisted Integration Manager workbench task"
    );
    if (
      !persistedWorkItem ||
      persistedWorkItem.status !== "in_progress" ||
      persistedWorkItem.object_id !== candidate.publisher_id ||
      persistedWorkItem.owner_role !== "integration_manager"
    ) {
      throw new Error("Persisted Integration Manager workbench task does not match CM-5C binding expectations.");
    }

    await persistRouteVisit(
      integrationAuditRepository,
      buildBusinessAuditAfterData,
      integrationSession.user,
      candidate.publisher_id
    );
    execution.routeVisited = true;

    ceoSession = await signIn(usersByRole.get("ceo"));
    const proof = await readProof(ceoSession.client, candidate.id, integrationProject.id, integrationSession.user.id);
    const ledger = await saveUatLedger(
      ceoSession.client,
      ceoSession.user,
      candidate,
      mediaSession.user,
      integrationSession.user,
      integrationProject,
      execution,
      proof
    );

    const output = {
      mode: "apply",
      traceId,
      candidateId: candidate.id,
      mediaName: candidate.media_name,
      publisherId: candidate.publisher_id,
      integrationProjectId: integrationProject.id,
      mediaRole: mediaSession.user.activeRole,
      integrationRole: integrationSession.user.activeRole,
      execution,
      proof,
      ledger
    };
    if (json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log("CM-5C production live-write UAT passed.");
      console.log(`- Candidate: ${output.mediaName} (${output.candidateId})`);
      console.log(`- Publisher: ${output.publisherId}`);
      console.log(`- Integration project/task: ${output.integrationProjectId}`);
      console.log(`- Handoff executed: ${output.execution.handoffExecuted}`);
      console.log(`- Task started: ${output.execution.taskStarted}`);
      console.log(`- Route visit recorded: ${output.execution.routeVisited}`);
      console.log(`- Proof: ${JSON.stringify(output.proof.counts)}`);
      console.log(`- UAT ledger: ${output.ledger.runKey} (${output.ledger.stepCount} steps)`);
    }
  } finally {
    await mediaSession.client.auth.signOut();
    await integrationSession.client.auth.signOut();
    if (ceoSession) {
      await ceoSession.client.auth.signOut();
    }
    if (vite) {
      await vite.close();
    }
  }
}

main().catch((error) => {
  console.error(`CM-5C live-write UAT failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
