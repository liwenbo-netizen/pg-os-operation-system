import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { createInitialContractWorkflowState } from "./contractService";
import { createInitialFinanceWorkflowState } from "./financeSettlementService";
import { createInitialMediaWorkflowState } from "./mediaWorkflowService";
import { chinaMediaEcosystemService } from "./chinaMediaEcosystemService";
import { createInitialSalesWorkflowState } from "./salesWorkflowService";
import { createInitialGuideWorkflowState } from "./sopService";
import { trustedSupplyNetworkService } from "./trustedSupplyNetworkService";
import { createInitialWorkbenchWorkflowState, workbenchService } from "./workbenchService";
import {
  integrationChecklistForProfile,
  integrationWorkflowPhaseForCheck,
  sdkIntegrationService,
  type IntegrationProjectProfileInput
} from "./sdkIntegrationService";

function context() {
  return {
    workbenchState: createInitialWorkbenchWorkflowState(),
    mediaState: createInitialMediaWorkflowState(),
    salesState: createInitialSalesWorkflowState(),
    financeState: createInitialFinanceWorkflowState(),
    contractState: createInitialContractWorkflowState(),
    guideState: createInitialGuideWorkflowState()
  };
}

function validIntegrationProfile(): IntegrationProjectProfileInput {
  return {
    platform: "android_tv",
    trafficChannel: "ctv",
    integrationMode: "ivt_sdk_api",
    protocolCodes: ["vast", "api"],
    capabilityProfile: {
      has_ad_server: true,
      has_ad_player: true,
      has_ad_sdk: true,
      supports_api: true,
      supports_openrtb: false,
      supports_vast: true,
      supports_lifecycle_events: true,
      accepts_ivt_sdk: true,
      requires_pg_full_sdk: false
    },
    propertyIdentifier: "com.example.ctv",
    playbookCodes: ["origin_ads_android_1_2", "origin_ivt_android_v11"],
    minSdk: 23,
    targetSdk: 35,
    compileSdk: 35,
    agpVersion: "8.7.3",
    gradleVersion: "8.9",
    language: "kotlin",
    processModel: "multi_process",
    mediaEngineeringContact: "engineering@example.com",
    plannedFormats: ["interstitial", "rewarded"],
    privacyProfile: {
      consent_before_init: true,
      personalized_ads: false,
      gaid: true,
      oaid: true,
      android_id: false,
      telephony_id: false,
      location: false,
      installed_apps: false
    },
    targetPilotDate: "2026-08-15",
    secretReference: "vault://pgos/media/new-ctv"
  };
}

describe("workbenchService phase 10", () => {
  it("builds a role task queue with derived finance work", () => {
    const user = authService.createMockUser("finance_manager");
    const snapshot = workbenchService.getSnapshot(context(), user);

    expect(snapshot.summary.myTasks).toBeGreaterThan(0);
    expect(snapshot.tasks.some((task) => task.id === "derived-settlement-settlement-disputed")).toBe(true);
    expect(snapshot.tasks.every((task) => task.owner_role === "finance_manager")).toBe(true);
  });

  it("builds an executive snapshot across roles and modules", () => {
    const user = authService.createMockUser("ceo");
    const snapshot = workbenchService.getSnapshot(context(), user);

    expect(snapshot.summary.myTasks).toBeGreaterThan(6);
    expect(snapshot.summary.p0).toBeGreaterThan(0);
    expect(snapshot.okrs.length).toBeGreaterThanOrEqual(4);
  });

  it("keeps system admin away from business tasks", () => {
    const user = authService.createMockUser("system_admin");
    const snapshot = workbenchService.getSnapshot(context(), user);

    expect(snapshot.tasks).toHaveLength(0);
    expect(snapshot.okrs).toHaveLength(0);
  });

  it("starts and completes an owned task", () => {
    const user = authService.createMockUser("sales_director");
    let state = createInitialWorkbenchWorkflowState();

    const startResult = workbenchService.startTask(state, user, "task-proposal-approval");
    state = startResult.state;

    const completeResult = workbenchService.completeTask(state, user, "task-proposal-approval");

    expect(startResult.guard.reason_code).toBe("WORKBENCH_TASK_STARTED");
    expect(completeResult.guard.reason_code).toBe("WORKBENCH_TASK_COMPLETED");
    expect(completeResult.state.tasks.find((task) => task.id === "task-proposal-approval")?.status).toBe("done");
    expect(completeResult.state.businessEvents[0].eventCode).toBe("workbench.task_completed");
  });

  it("starts derived finance tasks from the visible snapshot", () => {
    const user = authService.createMockUser("finance_manager");
    const snapshotContext = context();
    const snapshot = workbenchService.getSnapshot(snapshotContext, user);
    const derivedSettlementTask = snapshot.tasks.find(
      (task) => task.id.startsWith("derived-settlement-") && task.status === "open"
    );
    const derivedContractTask = snapshot.tasks.find(
      (task) => task.id.startsWith("derived-contract-") && task.module === "Contracts"
    );

    expect(derivedSettlementTask).toBeDefined();
    expect(derivedContractTask).toBeDefined();

    const settlementResult = workbenchService.startTask(
      snapshotContext.workbenchState,
      user,
      derivedSettlementTask!.id,
      snapshot.tasks
    );
    const contractResult = workbenchService.startTask(
      snapshotContext.workbenchState,
      user,
      derivedContractTask!.id,
      snapshot.tasks
    );

    expect(settlementResult.guard.reason_code).toBe("WORKBENCH_TASK_STARTED");
    expect(contractResult.guard.reason_code).toBe("WORKBENCH_TASK_STARTED");
    expect(settlementResult.state.tasks.find((task) => task.id === derivedSettlementTask!.id)?.status).toBe("in_progress");
    expect(contractResult.state.tasks.find((task) => task.id === derivedContractTask!.id)?.status).toBe("in_progress");
  });

  it("starts derived legal contract tasks from the visible snapshot", () => {
    const user = authService.createMockUser("legal_manager");
    const snapshotContext = context();
    const snapshot = workbenchService.getSnapshot(snapshotContext, user);
    const derivedContractTask = snapshot.tasks.find(
      (task) => task.id.startsWith("derived-contract-") && task.status === "open"
    );

    expect(derivedContractTask).toBeDefined();

    const result = workbenchService.startTask(
      snapshotContext.workbenchState,
      user,
      derivedContractTask!.id,
      snapshot.tasks
    );

    expect(result.guard.reason_code).toBe("WORKBENCH_TASK_STARTED");
    expect(result.state.tasks.find((task) => task.id === derivedContractTask!.id)?.status).toBe("in_progress");
    expect(result.state.auditEvents[0]).toMatchObject({
      action: "workbench.task.start",
      objectId: derivedContractTask!.id,
      allowed: true
    });
  });

  it("completes derived sales tasks from the visible snapshot", () => {
    const user = authService.createMockUser("sales_director");
    const snapshotContext = context();
    const snapshot = workbenchService.getSnapshot(snapshotContext, user);
    const derivedSalesTask = snapshot.tasks.find((task) => task.id.startsWith("derived-proposal-"));

    expect(derivedSalesTask).toBeDefined();

    const result = workbenchService.completeTask(
      snapshotContext.workbenchState,
      user,
      derivedSalesTask!.id,
      snapshot.tasks
    );

    expect(result.guard.reason_code).toBe("WORKBENCH_TASK_COMPLETED");
    expect(result.state.tasks.find((task) => task.id === derivedSalesTask!.id)?.status).toBe("done");
  });

  it("uses UUID source object ids as derived task ids for Supabase-backed work items", () => {
    const user = authService.createMockUser("legal_manager");
    const snapshotContext = context();
    const contractId = "11111111-1111-4111-8111-111111111001";
    snapshotContext.contractState = {
      ...snapshotContext.contractState,
      contracts: [
        {
          ...snapshotContext.contractState.contracts[0],
          id: contractId,
          contract_no: "CON-UAT",
          status: "legal_review"
        }
      ]
    };
    const snapshot = workbenchService.getSnapshot(snapshotContext, user);
    const derivedContractTask = snapshot.tasks.find((task) => task.source_object_id === contractId);

    expect(derivedContractTask?.id).toBe(contractId);

    const result = workbenchService.startTask(
      snapshotContext.workbenchState,
      user,
      contractId,
      snapshot.tasks
    );

    expect(result.guard.reason_code).toBe("WORKBENCH_TASK_STARTED");
    expect(result.businessEvent).toMatchObject({
      eventCode: "workbench.task_started",
      objectId: contractId
    });
  });

  it("binds CM-5C handoff and integration tasks to their real workflow objects", () => {
    const snapshotContext = context();
    const mediaManager = authService.createMockUser("media_manager");
    const integrationManager = authService.createMockUser("integration_manager");
    let mediaState = snapshotContext.mediaState;

    const candidate = chinaMediaEcosystemService.createTrustedSupplyCandidate(
      mediaState,
      mediaManager,
      "ecosystem-lead-redbook"
    );
    mediaState = candidate.state;
    mediaState = chinaMediaEcosystemService.startCandidateReadiness(
      mediaState,
      mediaManager,
      mediaState.trustedSupplyCandidates[0].id
    ).state;
    mediaState = chinaMediaEcosystemService.completeCandidateTechnicalReview(
      mediaState,
      mediaManager,
      mediaState.trustedSupplyCandidates[0].id
    ).state;
    mediaState = chinaMediaEcosystemService.completeCandidateCommercialReview(
      mediaState,
      mediaManager,
      mediaState.trustedSupplyCandidates[0].id
    ).state;
    mediaState = chinaMediaEcosystemService.createOnboardingProject(
      mediaState,
      mediaManager,
      mediaState.trustedSupplyCandidates[0].id
    ).state;
    snapshotContext.mediaState = mediaState;

    const candidateId = mediaState.trustedSupplyCandidates[0].id;
    const publisherId = mediaState.trustedSupplyCandidates[0].publisher_id;
    const integrationProjectId = mediaState.integrationProjects[0].id;
    const mediaSnapshot = workbenchService.getSnapshot(snapshotContext, mediaManager);
    const integrationSnapshotBeforeHandoff = workbenchService.getSnapshot(snapshotContext, integrationManager);
    const handoffTask = mediaSnapshot.tasks.find((task) => task.id === candidateId);
    const blockedIntegrationTask = integrationSnapshotBeforeHandoff.tasks.find((task) => task.id === integrationProjectId);

    expect(handoffTask).toMatchObject({
      related_route: "/media/china-ecosystem",
      source_object_type: "trusted_supply_candidate",
      source_object_id: candidateId,
      status: "open"
    });
    expect(blockedIntegrationTask).toMatchObject({
      related_route: "/media/integration-wizard/:id",
      source_object_type: "publisher",
      source_object_id: publisherId,
      status: "blocked"
    });
    expect(
      workbenchService.startTask(
        snapshotContext.workbenchState,
        integrationManager,
        integrationProjectId,
        integrationSnapshotBeforeHandoff.tasks
      ).guard.reason_code
    ).toBe("WORKBENCH_TASK_BLOCKED");

    snapshotContext.mediaState = chinaMediaEcosystemService.confirmOnboardingHandoff(
      mediaState,
      mediaManager,
      candidateId
    ).state;
    const integrationSnapshot = workbenchService.getSnapshot(snapshotContext, integrationManager);
    const integrationTask = integrationSnapshot.tasks.find((task) => task.id === integrationProjectId);

    expect(integrationTask).toMatchObject({
      status: "open",
      source_object_id: publisherId
    });
    const startResult = workbenchService.startTask(
      snapshotContext.workbenchState,
      integrationManager,
      integrationProjectId,
      integrationSnapshot.tasks
    );
    expect(startResult.guard.reason_code).toBe("WORKBENCH_TASK_STARTED");
    expect(startResult.state.tasks.find((task) => task.id === integrationProjectId)).toMatchObject({
      status: "in_progress",
      source_object_id: publisherId
    });
  });

  it("derives owner-specific SDK checklist tasks with focused deep links", () => {
    const snapshotContext = context();
    snapshotContext.mediaState = sdkIntegrationService.saveProjectProfile(
      snapshotContext.mediaState,
      authService.createMockUser("integration_manager"),
      "publisher-new-ctv",
      validIntegrationProfile()
    ).state;

    const legalSnapshot = workbenchService.getSnapshot(
      snapshotContext,
      authService.createMockUser("legal_manager")
    );
    const dataSnapshot = workbenchService.getSnapshot(
      snapshotContext,
      authService.createMockUser("data_analyst")
    );

    expect(legalSnapshot.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Complete technical check TQ-007: New CTV Partner",
          owner_role: "legal_manager",
          related_route: "/media/integration-wizard/:id",
          source_object_id: "publisher-new-ctv",
          focus_item_code: "TQ-007"
        }),
        expect.objectContaining({ focus_item_code: "TQ-008" }),
        expect.objectContaining({ focus_item_code: "SDK-007" })
      ])
    );
    expect(dataSnapshot.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Complete technical check SDK-017: New CTV Partner",
          owner_role: "data_analyst",
          source_object_id: "publisher-new-ctv",
          focus_item_code: "SDK-017"
        })
      ])
    );
  });

  it("hands the publisher intake task from Media Manager to Integration Manager", () => {
    const snapshotContext = context();
    const project = snapshotContext.mediaState.integrationProjects.find(
      (item) => item.publisher_id === "publisher-new-ctv"
    )!;
    snapshotContext.mediaState = {
      ...snapshotContext.mediaState,
      integrationProjects: snapshotContext.mediaState.integrationProjects.map((item) =>
        item.id === project.id
          ? {
              ...item,
              handoff_status: "draft" as const,
              handoff_package: {
                media_engineering_contact: "Zhang Wei / Android Lead",
                target_pilot_date: "2026-08-10",
                target_go_live_date: "2026-08-24",
                launch_requirements: "Controlled launch.",
                integration_expectations: "Origin Android SDK."
              }
            }
          : item
      )
    };

    const mediaSnapshot = workbenchService.getSnapshot(
      snapshotContext,
      authService.createMockUser("media_manager")
    );
    expect(mediaSnapshot.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Complete technical handoff: New CTV Partner",
          owner_role: "media_manager",
          related_route: "/media/publishers/:id"
        })
      ])
    );

    snapshotContext.mediaState = {
      ...snapshotContext.mediaState,
      integrationProjects: snapshotContext.mediaState.integrationProjects.map((item) =>
        item.id === project.id ? { ...item, handoff_status: "submitted" as const } : item
      )
    };
    const integrationSnapshot = workbenchService.getSnapshot(
      snapshotContext,
      authService.createMockUser("integration_manager")
    );
    expect(integrationSnapshot.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Accept technical handoff: New CTV Partner",
          owner_role: "integration_manager",
          related_route: "/media/integration-wizard/:id"
        })
      ])
    );
  });

  it("opens an owned blocked SDK task for resolution and records trace events", () => {
    const snapshotContext = context();
    const integrationUser = authService.createMockUser("integration_manager");
    const legalUser = authService.createMockUser("legal_manager");
    snapshotContext.mediaState = sdkIntegrationService.saveProjectProfile(
      snapshotContext.mediaState,
      integrationUser,
      "publisher-new-ctv",
      validIntegrationProfile()
    ).state;
    const project = snapshotContext.mediaState.integrationProjects.find(
      (item) => item.publisher_id === "publisher-new-ctv"
    );
    const profile = snapshotContext.mediaState.integrationProjectProfiles.find(
      (item) => item.integration_project_id === project?.id
    );
    for (const template of integrationChecklistForProfile(profile)) {
      if (integrationWorkflowPhaseForCheck(template.code) >= 4) continue;
      const result = sdkIntegrationService.updateCheckResult(
        snapshotContext.mediaState,
        integrationUser,
        "publisher-new-ctv",
        {
          itemCode: template.code,
          status: "passed",
          evidenceReference: `EVIDENCE-${template.code}`
        }
      );
      expect(result.guard.allowed).toBe(true);
      snapshotContext.mediaState = result.state;
    }
    snapshotContext.mediaState = sdkIntegrationService.updateCheckResult(
      snapshotContext.mediaState,
      legalUser,
      "publisher-new-ctv",
      {
        itemCode: "TQ-007",
        status: "blocked",
        blocker: "Privacy assessment is waiting for the media data inventory."
      }
    ).state;

    const legalSnapshot = workbenchService.getSnapshot(snapshotContext, legalUser);
    const blockedTask = legalSnapshot.tasks.find((task) => task.focus_item_code === "TQ-007");

    expect(blockedTask).toMatchObject({
      status: "blocked",
      allow_open_when_blocked: true,
      blocker: "Privacy assessment is waiting for the media data inventory."
    });

    const result = workbenchService.startTask(
      snapshotContext.workbenchState,
      legalUser,
      blockedTask!.id,
      legalSnapshot.tasks
    );

    expect(result.guard.reason_code).toBe("WORKBENCH_BLOCKED_TASK_OPENED");
    expect(result.businessEvent).toMatchObject({
      eventCode: "workbench.blocked_task_opened",
      payload: { focusItemCode: "TQ-007" }
    });
    expect(result.auditEvent).toMatchObject({
      action: "workbench.task.open_blocked",
      allowed: true
    });
  });

  it("derives CM-5E commercial validation and CM-5F trust qualification tasks", () => {
    const snapshotContext = context();
    const adopsSnapshot = workbenchService.getSnapshot(snapshotContext, authService.createMockUser("adops_manager"));
    const mediaSnapshot = workbenchService.getSnapshot(snapshotContext, authService.createMockUser("media_manager"));

    expect(adopsSnapshot.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.stringContaining("commercial validation"),
          related_route: "/media/commercial-tests/:id",
          source_object_id: "publisher-quzhi"
        })
      ])
    );
    expect(mediaSnapshot.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: expect.stringContaining("Evaluate trusted supply"),
          related_route: "/media/publishers/:id",
          source_object_id: "publisher-233"
        })
      ])
    );
  });

  it("derives the CM-5H quality task from the passed test record while publisher status sync is pending", () => {
    const snapshotContext = context();
    snapshotContext.mediaState = {
      ...snapshotContext.mediaState,
      commercialTests: snapshotContext.mediaState.commercialTests.map((test) =>
        test.publisher_id === "publisher-quzhi"
          ? { ...test, status: "test_passed", fill_rate: 0.62, clear_rate: 0.72, ivt_rate: 0.018 }
          : test
      )
    };
    snapshotContext.mediaState = trustedSupplyNetworkService.evaluatePublisher(
      snapshotContext.mediaState,
      authService.createMockUser("media_manager"),
      "publisher-quzhi"
    ).state;

    expect(
      snapshotContext.mediaState.publishers.find((publisher) => publisher.id === "publisher-quzhi")
        ?.commercial_test_status
    ).toBe("testing");

    const dataAnalystSnapshot = workbenchService.getSnapshot(
      snapshotContext,
      authService.createMockUser("data_analyst")
    );

    expect(dataAnalystSnapshot.tasks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Review trusted supply quality: QuZhi Campus",
          owner_role: "data_analyst",
          related_route: "/media/publishers/:id"
        })
      ])
    );
  });

  it("blocks unrelated roles from completing another role's task", () => {
    const user = authService.createMockUser("sales_manager");
    const state = createInitialWorkbenchWorkflowState();

    const result = workbenchService.completeTask(state, user, "task-contract-review");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("WORKBENCH_TASK_FORBIDDEN");
  });

  it("does not complete blocked tasks before blocker resolution", () => {
    const user = authService.createMockUser("finance_manager");
    const state = createInitialWorkbenchWorkflowState();

    const result = workbenchService.completeTask(state, user, "task-settlement-dispute");

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("WORKBENCH_TASK_BLOCKED");
  });

  it("updates OKR progress for a permitted owner", () => {
    const user = authService.createMockUser("media_director");
    const state = createInitialWorkbenchWorkflowState();

    const result = workbenchService.updateOkrProgress(state, user, "okr-scale-ready-publishers", 18);
    const objective = result.state.okrObjectives.find((candidate) => candidate.id === "okr-scale-ready-publishers");

    expect(result.guard.reason_code).toBe("OKR_PROGRESS_UPDATED");
    expect(objective?.current_value).toBe(18);
    expect(objective?.status).toBe("on_track");
  });

  it("blocks roles without OKR capability from updating OKRs", () => {
    const user = authService.createMockUser("audit_viewer");
    const state = createInitialWorkbenchWorkflowState();

    const result = workbenchService.updateOkrProgress(state, user, "okr-scale-ready-publishers", 20);

    expect(result.guard.allowed).toBe(false);
    expect(result.guard.reason_code).toBe("OKR_UPDATE_FORBIDDEN");
  });
});
