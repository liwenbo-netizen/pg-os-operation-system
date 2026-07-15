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
  buildCm5bExecutionPlan,
  buildCm5bAuditRecoveryPlan,
  cm5bTransitions,
  selectCm5bCandidate,
  summarizeCm5bPlan,
  validateCm5bGate
} from "./cm5b-live-uat-lib.mjs";

const argv = process.argv.slice(2);
const apply = argv.includes("--apply");
const json = argv.includes("--json");
const requestedRole = argv.find((arg) => arg.startsWith("--role="))?.slice("--role=".length) || "media_manager";
const supportedRoles = new Set(["media_manager", "media_director"]);
const env = loadEnvFiles();
const supabaseUrl = getSupabaseUrl(env);
const anonKey = getSupabaseAnonKey(env);
const traceId = `cm5b-live-${Date.now()}`;

function assertConfiguration() {
  const failures = [];
  if (!supportedRoles.has(requestedRole)) {
    failures.push(`Unsupported CM-5B actor role: ${requestedRole}`);
  }
  if (!supabaseUrl) {
    failures.push("VITE_SUPABASE_URL or SUPABASE_URL is required.");
  }
  if (!anonKey) {
    failures.push("VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY is required.");
  }

  const users = buildUatUsers(env, [requestedRole, "ceo"]);
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
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
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

async function verifyFinalState(client, candidateId) {
  const candidate = assertSupabaseResult(
    await client
      .from("trusted_supply_candidates")
      .select("id,opportunity_id,media_name,status,publisher_id,onboarding_ready_at")
      .eq("id", candidateId)
      .maybeSingle(),
    "verify trusted supply candidate"
  );

  if (!candidate || candidate.status !== "onboarding_project_created" || !candidate.publisher_id) {
    throw new Error("CM-5B final state is incomplete: candidate is not linked to an onboarding publisher.");
  }

  const publisher = assertSupabaseResult(
    await client
      .from("publishers")
      .select("id,name,technical_live_status,commercial_test_status,sales_scale_status")
      .eq("id", candidate.publisher_id)
      .maybeSingle(),
    "verify onboarding publisher"
  );
  const projects = assertSupabaseResult(
    await client.from("integration_projects").select("id,publisher_id,status").eq("publisher_id", candidate.publisher_id),
    "verify integration project"
  );

  if (!publisher || (projects ?? []).length === 0) {
    throw new Error("CM-5B final state is incomplete: Publisher 360 or integration project is missing.");
  }

  return {
    candidate,
    publisher,
    integrationProject: projects[0]
  };
}

async function readAuditProof(client, candidateId) {
  const requiredActions = cm5bTransitions.map((step) => step.action);
  const requiredEvents = cm5bTransitions.map((step) => step.eventCode);
  const auditRows = assertSupabaseResult(
    await client
      .from("audit_logs")
      .select("id,action,actor_user_id,after_data,created_at")
      .eq("object_id", candidateId)
      .in("action", requiredActions)
      .order("created_at", { ascending: true }),
    "verify CM-5B audit logs"
  );
  const businessRows = assertSupabaseResult(
    await client
      .from("module_business_events")
      .select("id,event_code,owner_role,payload,created_at")
      .eq("object_id", candidateId)
      .in("event_code", requiredEvents)
      .order("created_at", { ascending: true }),
    "verify CM-5B business events"
  );

  const auditActions = new Set((auditRows ?? []).map((row) => row.action));
  const businessEvents = new Set((businessRows ?? []).map((row) => row.event_code));
  const missingActions = requiredActions.filter((action) => !auditActions.has(action));
  const missingEvents = requiredEvents.filter((eventCode) => !businessEvents.has(eventCode));

  return {
    auditActions: requiredActions,
    businessEvents: requiredEvents,
    auditRowCount: auditRows.length,
    businessEventRowCount: businessRows.length,
    auditRows,
    businessRows,
    missingActions,
    missingEvents
  };
}

function assertCompleteAuditProof(proof) {
  if (proof.missingActions.length > 0 || proof.missingEvents.length > 0) {
    throw new Error(
      `CM-5B audit proof is incomplete. Missing audit actions: ${proof.missingActions.join(", ") || "none"}; missing business events: ${
        proof.missingEvents.join(", ") || "none"
      }.`
    );
  }

  return {
    auditActions: proof.auditActions,
    businessEvents: proof.businessEvents,
    auditRowCount: proof.auditRowCount,
    businessEventRowCount: proof.businessEventRowCount
  };
}

async function reconcileMissingAuditProof({ auditRepository, buildBusinessAuditAfterData, candidateId, mediaUser, proof }) {
  const recoveryPlan = buildCm5bAuditRecoveryPlan(proof.auditRows, proof.businessRows);
  const missingEvidence = recoveryPlan.filter((item) => !item.businessEvent);
  if (missingEvidence.length > 0) {
    throw new Error(
      `Cannot reconcile audit actions without business event evidence: ${missingEvidence.map((item) => item.action).join(", ")}.`
    );
  }

  const recoveredActions = [];
  for (const item of recoveryPlan) {
    const auditShape = {
      action: item.action,
      objectType: "trusted_supply_candidate",
      allowed: true,
      reasonCode: item.reasonCode
    };
    const result = await auditRepository.recordEvent({
      ...auditShape,
      actorUserId: mediaUser.id,
      objectId: candidateId,
      afterData: {
        ...buildBusinessAuditAfterData(auditShape, mediaUser.activeRole),
        auditRecovery: "cm5b_live_uat_reconciled_from_business_event",
        actionOccurredAt: item.businessEvent.created_at,
        recoveredAt: new Date().toISOString(),
        sourceBusinessEventId: item.businessEvent.id,
        traceId
      }
    });

    if (!result.ok) {
      throw new Error(`Audit reconciliation failed for ${item.action}: ${result.warning ?? result.source}`);
    }
    recoveredActions.push(item.action);
  }

  return recoveredActions;
}

function buildLedgerSteps({ candidate, mediaUser, ceoUser, plan, finalState, auditProof }) {
  const plannedMethods = new Set(plan.map((step) => step.method));
  const now = new Date().toISOString();
  const common = {
    script_id: "cm5b-live-write-uat",
    script_title: "CM-5B Trusted Supply Onboarding Readiness Live UAT",
    status: "passed",
    updated_by: ceoUser.id,
    updated_at: now
  };
  const mediaStep = (stepId, action, expectedResult, actualResult, metadata = {}) => ({
    ...common,
    role_code: mediaUser.activeRole,
    step_id: stepId,
    step_action: action,
    expected_result: expectedResult,
    actual_result: actualResult,
    actor_user_id: mediaUser.id,
    actor_role: mediaUser.activeRole,
    metadata: {
      candidateId: candidate.id,
      mediaName: candidate.media_name,
      traceId,
      ...metadata
    }
  });

  return [
    mediaStep(
      "cm5b-gate",
      "Validate trusted supply candidate and RLS context",
      "The linked opportunity passes all trusted supply gates under a real media session.",
      `Gate passed for ${candidate.media_name} using ${mediaUser.activeRole}.`
    ),
    ...cm5bTransitions.map((step, index) =>
      mediaStep(
        `cm5b-transition-${index + 1}`,
        step.label,
        `Candidate reaches ${step.toStatus} and writes ${step.action}.`,
        plannedMethods.has(step.method)
          ? `Executed successfully; candidate reached ${step.toStatus}.`
          : `Already complete before this run; final state and historical audit proof were verified.`,
        { action: step.action, eventCode: step.eventCode, executedThisRun: plannedMethods.has(step.method) }
      )
    ),
    mediaStep(
      "cm5b-final-state",
      "Verify Publisher 360 onboarding artifacts",
      "Candidate is linked to a Publisher 360 record and integration project.",
      `Publisher ${finalState.publisher.id} and integration project ${finalState.integrationProject.id} are linked.`
    ),
    {
      ...common,
      role_code: "ceo",
      step_id: "cm5b-audit-proof",
      step_action: "Verify audit and business event coverage",
      expected_result: "CEO can trace all four CM-5B audit actions and business events.",
      actual_result: `Verified ${auditProof.auditActions.length} audit actions and ${auditProof.businessEvents.length} business events.`,
      actor_user_id: ceoUser.id,
      actor_role: "ceo",
      metadata: {
        candidateId: candidate.id,
        traceId,
        auditActions: auditProof.auditActions,
        businessEvents: auditProof.businessEvents
      }
    }
  ];
}

async function saveUatLedger(client, ceoUser, candidate, mediaUser, plan, finalState, auditProof) {
  const runKey = `cm5b-live-${candidate.id}`;
  const steps = buildLedgerSteps({ candidate, mediaUser, ceoUser, plan, finalState, auditProof });
  const run = assertSupabaseResult(
    await client
      .from("uat_script_runs")
      .upsert(
        {
          run_key: runKey,
          environment: "production",
          production_url: "https://pg-os-operation-system.vercel.app/media/china-ecosystem",
          started_by: ceoUser.id,
          started_by_role: "ceo",
          status: "completed",
          summary: {
            total: steps.length,
            passed: steps.length,
            failed: 0,
            blocked: 0,
            pending: 0
          },
          metadata: {
            phase: "CM-5B",
            source: "automated_live_write_uat",
            traceId,
            candidateId: candidate.id,
            mediaRole: mediaUser.activeRole
          }
        },
        { onConflict: "run_key" }
      )
      .select("id,run_key")
      .maybeSingle(),
    "save CM-5B UAT run"
  );

  if (!run?.id) {
    throw new Error("CM-5B UAT run did not return an id.");
  }

  assertSupabaseResult(
    await client
      .from("uat_script_step_results")
      .upsert(
        steps.map((step) => ({ ...step, run_id: run.id })),
        { onConflict: "run_id,step_id", ignoreDuplicates: false }
      )
      .select("id"),
    "save CM-5B UAT steps"
  );

  const persistedSteps = assertSupabaseResult(
    await client.from("uat_script_step_results").select("id,status").eq("run_id", run.id),
    "verify CM-5B UAT steps"
  );
  if (persistedSteps.length !== steps.length || persistedSteps.some((step) => step.status !== "passed")) {
    throw new Error(
      `CM-5B UAT ledger verification failed: expected ${steps.length} passed steps, received ${persistedSteps.length}.`
    );
  }

  return {
    runId: run.id,
    runKey: run.run_key,
    stepCount: steps.length
  };
}

async function main() {
  const usersByRole = assertConfiguration();
  const mediaSession = await signIn(usersByRole.get(requestedRole));
  let ceoSession;
  let vite;

  try {
    vite = await createServer({
      appType: "custom",
      logLevel: "error",
      server: { middlewareMode: true }
    });
    const [
      { SupabaseWorkflowRepository },
      { chinaMediaEcosystemService },
      { createAuditLogRepository },
      { buildBusinessAuditAfterData }
    ] = await Promise.all([
      vite.ssrLoadModule("/src/repositories/supabaseWorkflowRepository.ts"),
      vite.ssrLoadModule("/src/services/chinaMediaEcosystemService.ts"),
      vite.ssrLoadModule("/src/repositories/auditLogRepository.ts"),
      vite.ssrLoadModule("/src/services/businessAuditCoverage.ts")
    ]);
    const repository = new SupabaseWorkflowRepository(mediaSession.client);
    const auditRepository = createAuditLogRepository(mediaSession.client, true);
    const loaded = await repository.loadSnapshot();

    if (loaded.health.warnings.length > 0) {
      throw new Error(`Supabase snapshot contains fallback warnings: ${loaded.health.warnings.join("; ")}`);
    }

    const candidate = selectCm5bCandidate(
      loaded.snapshot.mediaState.trustedSupplyCandidates,
      loaded.snapshot.mediaState.mediaEcosystemLeads
    );
    if (!candidate) {
      throw new Error("No non-rejected trusted supply candidate with a linked opportunity is available.");
    }
    const lead = loaded.snapshot.mediaState.mediaEcosystemLeads.find((item) => item.id === candidate.lead_id);
    const gateFailures = validateCm5bGate(candidate, lead);
    if (gateFailures.length > 0) {
      throw new Error(`CM-5B trusted supply gate failed: ${gateFailures.join(" ")}`);
    }

    const plan = buildCm5bExecutionPlan(candidate);
    const planSummary = summarizeCm5bPlan(candidate, plan);
    if (!apply) {
      const output = {
        mode: "dry-run",
        traceId,
        actorRole: mediaSession.user.activeRole,
        actorEmail: mediaSession.user.email,
        snapshotSource: loaded.health.source,
        gate: "passed",
        ...planSummary
      };
      if (json) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log("CM-5B live-write UAT dry-run passed.");
        console.log(`- Candidate: ${output.mediaName} (${output.candidateId})`);
        console.log(`- Current status: ${output.currentStatus}`);
        console.log(`- Actor: ${output.actorRole} (${output.actorEmail})`);
        console.log(`- Planned writes: ${output.steps.length}`);
        for (const step of output.steps) {
          console.log(`  - ${step.label}: ${step.fromStatus} -> ${step.toStatus}`);
        }
        console.log("Run with --apply to execute production writes, audit verification, and UAT ledger persistence.");
      }
      return;
    }

    let snapshot = loaded.snapshot;
    const executed = [];
    for (const step of plan) {
      const result = chinaMediaEcosystemService[step.method](snapshot.mediaState, mediaSession.user, candidate.id);
      if (!result.guard.allowed) {
        throw new Error(`${step.label} was blocked: ${result.guard.reasonCode} ${result.guard.message}`);
      }

      snapshot = { ...snapshot, mediaState: result.state };
      const saveResult = await repository.saveSnapshot(snapshot, { actor: mediaSession.user });
      if (!saveResult.ok) {
        throw new Error(`${step.label} persistence failed: ${saveResult.warnings.join("; ")}`);
      }

      const persistedCandidate = assertSupabaseResult(
        await mediaSession.client.from("trusted_supply_candidates").select("status").eq("id", candidate.id).maybeSingle(),
        `verify ${step.label}`
      );
      if (persistedCandidate?.status !== step.toStatus) {
        throw new Error(`${step.label} status mismatch: expected ${step.toStatus}, received ${persistedCandidate?.status ?? "missing"}.`);
      }
      if (result.auditEvent) {
        const auditResult = await auditRepository.recordEvent({
          id: result.auditEvent.id,
          actorUserId: mediaSession.user.id,
          action: result.auditEvent.action,
          objectType: result.auditEvent.objectType,
          objectId: result.auditEvent.objectId,
          allowed: result.auditEvent.allowed,
          reasonCode: result.auditEvent.reasonCode,
          afterData: buildBusinessAuditAfterData(result.auditEvent, mediaSession.user.activeRole),
          createdAt: result.auditEvent.createdAt
        });
        if (!auditResult.ok) {
          throw new Error(`${step.label} audit persistence failed: ${auditResult.warning ?? auditResult.source}`);
        }
      }
      executed.push({ label: step.label, status: step.toStatus, savedTables: saveResult.savedTables });
    }

    const finalState = await verifyFinalState(mediaSession.client, candidate.id);
    ceoSession = await signIn(usersByRole.get("ceo"));
    let rawAuditProof = await readAuditProof(ceoSession.client, candidate.id);
    const recoveredAuditActions = await reconcileMissingAuditProof({
      auditRepository,
      buildBusinessAuditAfterData,
      candidateId: candidate.id,
      mediaUser: mediaSession.user,
      proof: rawAuditProof
    });
    if (recoveredAuditActions.length > 0) {
      rawAuditProof = await readAuditProof(ceoSession.client, candidate.id);
    }
    const auditProof = assertCompleteAuditProof(rawAuditProof);
    const ledger = await saveUatLedger(
      ceoSession.client,
      ceoSession.user,
      candidate,
      mediaSession.user,
      plan,
      finalState,
      auditProof
    );

    const output = {
      mode: "apply",
      traceId,
      candidateId: candidate.id,
      mediaName: candidate.media_name,
      actorRole: mediaSession.user.activeRole,
      previousStatus: candidate.status,
      finalStatus: finalState.candidate.status,
      publisherId: finalState.publisher.id,
      integrationProjectId: finalState.integrationProject.id,
      executed,
      auditProof,
      recoveredAuditActions,
      ledger
    };
    if (json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log("CM-5B production live-write UAT passed.");
      console.log(`- Candidate: ${output.mediaName} (${output.candidateId})`);
      console.log(`- Status: ${output.previousStatus} -> ${output.finalStatus}`);
      console.log(`- Workflow transitions executed: ${output.executed.length}`);
      console.log(`- Publisher: ${output.publisherId}`);
      console.log(`- Integration project: ${output.integrationProjectId}`);
      console.log(`- Audit proof: ${output.auditProof.auditActions.length} actions / ${output.auditProof.businessEvents.length} events`);
      console.log(`- Reconciled audit actions: ${output.recoveredAuditActions.length}`);
      console.log(`- UAT ledger: ${output.ledger.runKey} (${output.ledger.stepCount} steps)`);
    }
  } finally {
    await mediaSession.client.auth.signOut();
    if (ceoSession) {
      await ceoSession.client.auth.signOut();
    }
    if (vite) {
      await vite.close();
    }
  }
}

main().catch((error) => {
  console.error(`CM-5B live-write UAT failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
