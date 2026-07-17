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
  buildCm5dPlan,
  cm5dAuditRequirements,
  cm5dEvidenceTypes,
  selectCm5dTarget,
  summarizeCm5dProof
} from "./cm5d-live-uat-lib.mjs";

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const json = argv.includes("--json");
const env = loadEnvFiles();
const supabaseUrl = getSupabaseUrl(env);
const anonKey = getSupabaseAnonKey(env);
const traceId = `cm5d-live-${Date.now()}`;
const productionUrl = "https://pg-os-operation-system.vercel.app/media/integration-wizard/:id";
const integrationRoute = "/media/integration-wizard/:id";
const controlledBlocker = "CM-5D UAT: callback endpoint allowlist confirmation pending.";

function assertConfiguration() {
  const failures = [];
  if (!supabaseUrl) failures.push("VITE_SUPABASE_URL or SUPABASE_URL is required.");
  if (!anonKey) failures.push("VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required.");
  const users = buildUatUsers(env, ["integration_manager", "ceo"]);
  for (const user of users) {
    if (!user.password) failures.push(`A UAT password is required for ${user.primaryRole}.`);
  }
  if (failures.length > 0) throw new Error(failures.join(" "));
  return new Map(users.map((user) => [user.primaryRole, user]));
}

function createAnonClient() {
  return createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function signIn(userPlan) {
  const client = createAnonClient();
  const result = await client.auth.signInWithPassword({ email: userPlan.email, password: userPlan.password });
  if (result.error || !result.data.user) {
    throw new Error(
      `${userPlan.primaryRole} sign-in failed: ${result.error ? formatSupabaseError(result.error) : "no user returned"}`
    );
  }

  const userId = result.data.user.id;
  const [profileResult, rolesResult] = await Promise.all([
    client.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
    client.from("user_roles").select("role_code").eq("user_id", userId)
  ]);
  if (profileResult.error) throw new Error(`Profile read failed: ${formatSupabaseError(profileResult.error)}`);
  if (rolesResult.error) throw new Error(`Role read failed: ${formatSupabaseError(rolesResult.error)}`);
  const roles = (rolesResult.data ?? []).map((row) => row.role_code);
  if (!roles.includes(userPlan.primaryRole)) {
    throw new Error(`${userPlan.primaryRole} is not assigned to the configured UAT user.`);
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
  if (result.error) throw new Error(`${action}: ${formatSupabaseError(result.error)}`);
  return result.data;
}

function assertRepositoryHealth(loaded) {
  if (loaded.health.warnings.length > 0) {
    throw new Error(`Integration Manager snapshot contains fallback warnings: ${loaded.health.warnings.join("; ")}`);
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
      uatPhase: "CM-5D",
      ...metadata
    },
    createdAt: event.createdAt
  });
  if (!result.ok) throw new Error(`${event.action} audit persistence failed: ${result.warning ?? result.source}`);
}

async function persistRouteVisit(auditRepository, buildBusinessAuditAfterData, actor, publisherId, projectId) {
  const event = {
    action: cm5dAuditRequirements.routeAction,
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
      title: "Technical Integration Execution",
      module: "Media",
      selectedPublisherId: publisherId,
      integrationProjectId: projectId,
      traceId,
      uatPhase: "CM-5D"
    }
  });
  if (!result.ok) throw new Error(`route.visit audit persistence failed: ${result.warning ?? result.source}`);
}

async function verifyFinalState(client, publisherId, projectId) {
  const project = assertSupabaseResult(
    await client
      .from("integration_projects")
      .select("id,publisher_id,status,checklist,evidence,blocker,next_action,readiness_reviewed_at")
      .eq("id", projectId)
      .maybeSingle(),
    "verify CM-5D integration project"
  );
  const publisher = assertSupabaseResult(
    await client.from("publishers").select("id,name,technical_live_status").eq("id", publisherId).maybeSingle(),
    "verify CM-5D publisher"
  );
  const evidenceTypes = new Set((project?.evidence ?? []).map((item) => item.evidence_type));
  const checklistComplete = [
    "connection_config_received",
    "test_request_verified",
    "callback_verified",
    "production_logs_checked"
  ].every((key) => project?.checklist?.[key] === true);

  if (
    !project ||
    !publisher ||
    project.status !== "technical_live_passed" ||
    publisher.technical_live_status !== "technical_live_passed" ||
    project.blocker ||
    !project.readiness_reviewed_at ||
    !checklistComplete ||
    cm5dEvidenceTypes.some((type) => !evidenceTypes.has(type))
  ) {
    throw new Error("CM-5D final state is incomplete or inconsistent.");
  }

  return { project, publisher, evidenceCount: evidenceTypes.size, checklistComplete };
}

async function readProof(client, publisherId, integrationUserId) {
  const auditActions = [
    cm5dAuditRequirements.startAction,
    cm5dAuditRequirements.blockerAction,
    cm5dAuditRequirements.resolveAction,
    cm5dAuditRequirements.evidenceAction,
    cm5dAuditRequirements.readinessAction
  ];
  const eventCodes = [
    cm5dAuditRequirements.startEvent,
    cm5dAuditRequirements.blockerEvent,
    cm5dAuditRequirements.resolveEvent,
    cm5dAuditRequirements.evidenceEvent,
    cm5dAuditRequirements.readinessEvent
  ];
  const [auditResult, businessResult, routeResult] = await Promise.all([
    client.from("audit_logs").select("id,action,after_data,created_at").eq("object_id", publisherId).in("action", auditActions),
    client
      .from("module_business_events")
      .select("id,event_code,payload,created_at")
      .eq("object_id", publisherId)
      .in("event_code", eventCodes),
    client
      .from("audit_logs")
      .select("id,action,after_data,created_at")
      .eq("actor_user_id", integrationUserId)
      .eq("action", cm5dAuditRequirements.routeAction)
      .order("created_at", { ascending: false })
      .limit(100)
  ]);
  const routeRows = assertSupabaseResult(routeResult, "verify CM-5D route audit").filter(
    (row) => row.after_data?.traceId === traceId && row.after_data?.path === integrationRoute
  );
  const proof = summarizeCm5dProof({
    auditRows: assertSupabaseResult(auditResult, "verify CM-5D audit logs"),
    businessRows: assertSupabaseResult(businessResult, "verify CM-5D business events"),
    routeRows
  });
  if (!proof.complete) throw new Error(`CM-5D audit proof is incomplete: ${proof.missing.join(", ")}.`);
  return proof;
}

function buildLedgerSteps({ integrationUser, ceoUser, target, finalState, proof }) {
  const now = new Date().toISOString();
  const common = {
    script_id: "cm5d-live-write-uat",
    script_title: "CM-5D Technical Integration Execution Live UAT",
    status: "passed",
    updated_by: ceoUser.id,
    updated_at: now
  };
  const step = (stepId, action, expectedResult, actualResult, roleCode = "integration_manager") => ({
    ...common,
    role_code: roleCode,
    actor_user_id: roleCode === "ceo" ? ceoUser.id : integrationUser.id,
    actor_role: roleCode,
    step_id: stepId,
    step_action: action,
    expected_result: expectedResult,
    actual_result: actualResult,
    metadata: {
      traceId,
      candidateId: target.candidate?.id,
      publisherId: target.publisher.id,
      integrationProjectId: target.project.id
    }
  });

  return [
    step("cm5d-start", "Start technical execution", "Integration project enters active execution.", "Execution state verified."),
    step("cm5d-blocker", "Set and resolve technical blocker", "Blocker pauses and safely resumes execution.", "Blocker lifecycle verified."),
    ...cm5dEvidenceTypes.map((type) =>
      step(`cm5d-evidence-${type}`, `Record ${type} evidence`, "Evidence updates its matching checklist item.", `${type} persisted.`)
    ),
    step(
      "cm5d-readiness",
      "Submit technical readiness",
      "All evidence passes technical readiness and clears the blocker.",
      `${finalState.evidenceCount} evidence types and the full checklist passed.`
    ),
    step("cm5d-route", "Open Technical Integration Wizard", "Route visit is traceable to the selected publisher.", "Route audit recorded."),
    step(
      "cm5d-audit",
      "Verify CEO audit proof",
      "CEO can trace actions and business events in the live audit stream.",
      `Verified ${proof.counts.auditRows} audit and ${proof.counts.businessRows} business rows.`,
      "ceo"
    )
  ];
}

async function saveLedger(client, ceoUser, integrationUser, target, finalState, proof) {
  const steps = buildLedgerSteps({ integrationUser, ceoUser, target, finalState, proof });
  const run = assertSupabaseResult(
    await client
      .from("uat_script_runs")
      .upsert(
        {
          run_key: `cm5d-live-${target.project.id}`,
          environment: "production",
          production_url: productionUrl,
          started_by: ceoUser.id,
          started_by_role: "ceo",
          status: "completed",
          summary: { total: steps.length, passed: steps.length, failed: 0, blocked: 0, pending: 0 },
          metadata: {
            phase: "CM-5D",
            source: "automated_live_write_uat",
            traceId,
            publisherId: target.publisher.id,
            integrationProjectId: target.project.id,
            evidenceCount: finalState.evidenceCount,
            proofCounts: proof.counts
          }
        },
        { onConflict: "run_key" }
      )
      .select("id,run_key")
      .maybeSingle(),
    "save CM-5D UAT run"
  );
  if (!run?.id) throw new Error("CM-5D UAT run did not return an id.");
  assertSupabaseResult(
    await client
      .from("uat_script_step_results")
      .upsert(steps.map((step) => ({ ...step, run_id: run.id })), { onConflict: "run_id,step_id" })
      .select("id"),
    "save CM-5D UAT steps"
  );
  return { runId: run.id, runKey: run.run_key, stepCount: steps.length };
}

async function main() {
  const users = assertConfiguration();
  const integrationSession = await signIn(users.get("integration_manager"));
  let ceoSession;
  let vite;

  try {
    vite = await createServer({ appType: "custom", logLevel: "error", server: { middlewareMode: true } });
    const [{ SupabaseWorkflowRepository }, { mediaWorkflowService }, { createAuditLogRepository }, { buildBusinessAuditAfterData }] =
      await Promise.all([
        vite.ssrLoadModule("/src/repositories/supabaseWorkflowRepository.ts"),
        vite.ssrLoadModule("/src/services/mediaWorkflowService.ts"),
        vite.ssrLoadModule("/src/repositories/auditLogRepository.ts"),
        vite.ssrLoadModule("/src/services/businessAuditCoverage.ts")
      ]);

    const repository = new SupabaseWorkflowRepository(integrationSession.client);
    const auditRepository = createAuditLogRepository(integrationSession.client, true);
    const loaded = await repository.loadSnapshot();
    assertRepositoryHealth(loaded);
    const target = selectCm5dTarget(
      loaded.snapshot.mediaState.trustedSupplyCandidates,
      loaded.snapshot.mediaState.integrationProjects,
      loaded.snapshot.mediaState.publishers
    );
    if (!target) throw new Error("No incomplete CM-5D onboarding integration project is available.");
    const plan = buildCm5dPlan(target);

    if (!apply) {
      const output = { mode: "dry-run", traceId, actorRoles: ["integration_manager", "ceo"], ...plan };
      if (json) console.log(JSON.stringify(output, null, 2));
      else {
        console.log("CM-5D live-write UAT dry-run passed.");
        console.log(`- Media: ${output.mediaName}`);
        console.log(`- Publisher: ${output.publisherId}`);
        console.log(`- Integration project: ${output.integrationProjectId} (${output.projectStatus})`);
        console.log(`- Missing evidence: ${output.missingEvidence.join(", ") || "none"}`);
        for (const step of output.steps) console.log(`- ${step.execute ? "EXECUTE" : "VERIFY"}: ${step.label}`);
      }
      return;
    }

    let snapshot = loaded.snapshot;
    const executed = [];
    const currentProject = () => snapshot.mediaState.integrationProjects.find((item) => item.id === target.project.id);
    const execute = async (label, action, metadata = {}) => {
      const result = action(snapshot.mediaState);
      if (!result.guard.allowed || !result.auditEvent) {
        throw new Error(`${label} blocked: ${result.guard.reason_code ?? result.guard.reasonCode} ${result.guard.message}`);
      }
      snapshot = { ...snapshot, mediaState: result.state };
      const saved = await repository.saveSnapshot(snapshot, { actor: integrationSession.user });
      if (!saved.ok) throw new Error(`${label} persistence failed: ${saved.warnings.join("; ")}`);
      await persistAudit(auditRepository, buildBusinessAuditAfterData, result.auditEvent, integrationSession.user, {
        integrationProjectId: target.project.id,
        ...metadata
      });
      executed.push(label);
    };

    if (currentProject()?.blocker) {
      await execute("Resolve existing blocker", (state) =>
        mediaWorkflowService.resolveTechnicalBlocker(state, integrationSession.user, target.publisher.id)
      );
    }
    if (!["in_integration", "technical_review"].includes(currentProject()?.status)) {
      await execute("Start technical execution", (state) =>
        mediaWorkflowService.startTechnicalExecution(state, integrationSession.user, target.publisher.id)
      );
    }
    await execute("Set controlled blocker", (state) =>
      mediaWorkflowService.setTechnicalBlocker(state, integrationSession.user, target.publisher.id, controlledBlocker)
    );
    await execute("Resolve controlled blocker", (state) =>
      mediaWorkflowService.resolveTechnicalBlocker(state, integrationSession.user, target.publisher.id)
    );

    for (const evidenceType of cm5dEvidenceTypes) {
      if ((currentProject()?.evidence ?? []).some((item) => item.evidence_type === evidenceType)) continue;
      await execute(
        `Record ${evidenceType} evidence`,
        (state) =>
          mediaWorkflowService.recordTechnicalEvidence(state, integrationSession.user, target.publisher.id, {
            evidenceType,
            title: `CM-5D UAT ${evidenceType.replaceAll("_", " ")}`,
            reference: `uat://cm5d/${traceId}/${evidenceType}`
          }),
        { evidenceType }
      );
    }
    await execute("Submit technical readiness", (state) =>
      mediaWorkflowService.submitTechnicalReadiness(state, integrationSession.user, target.publisher.id)
    );
    await persistRouteVisit(
      auditRepository,
      buildBusinessAuditAfterData,
      integrationSession.user,
      target.publisher.id,
      target.project.id
    );

    const finalState = await verifyFinalState(integrationSession.client, target.publisher.id, target.project.id);
    ceoSession = await signIn(users.get("ceo"));
    const proof = await readProof(ceoSession.client, target.publisher.id, integrationSession.user.id);
    const ledger = await saveLedger(ceoSession.client, ceoSession.user, integrationSession.user, target, finalState, proof);
    const output = {
      mode: "apply",
      traceId,
      mediaName: target.candidate?.media_name ?? target.publisher.name,
      publisherId: target.publisher.id,
      integrationProjectId: target.project.id,
      executed,
      finalState: {
        projectStatus: finalState.project.status,
        publisherStatus: finalState.publisher.technical_live_status,
        evidenceCount: finalState.evidenceCount,
        checklistComplete: finalState.checklistComplete
      },
      proof,
      ledger
    };
    if (json) console.log(JSON.stringify(output, null, 2));
    else {
      console.log("CM-5D production live-write UAT passed.");
      console.log(`- Media: ${output.mediaName}`);
      console.log(`- Publisher: ${output.publisherId}`);
      console.log(`- Integration project: ${output.integrationProjectId}`);
      console.log(`- Executed: ${output.executed.join("; ")}`);
      console.log(`- Final state: ${JSON.stringify(output.finalState)}`);
      console.log(`- Proof: ${JSON.stringify(output.proof.counts)}`);
      console.log(`- UAT ledger: ${output.ledger.runKey} (${output.ledger.stepCount} steps)`);
    }
  } finally {
    await integrationSession.client.auth.signOut();
    if (ceoSession) await ceoSession.client.auth.signOut();
    if (vite) await vite.close();
  }
}

main().catch((error) => {
  console.error(`CM-5D live-write UAT failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
