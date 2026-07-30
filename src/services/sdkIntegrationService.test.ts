import { describe, expect, it } from "vitest";
import type { BusinessUser, IntegrationProjectProfile, MediaWorkflowState } from "../types/domain";
import { authService } from "./authService";
import { createInitialMediaWorkflowState, mediaWorkflowService } from "./mediaWorkflowService";
import {
  getIntegrationCheckGuidance,
  getIntegrationGateExecutionContract,
  integrationRouteIssues,
  integrationChecklistForProfile,
  integrationWorkflowPhases,
  integrationWorkflowPhaseForCheck,
  recommendedIntegrationMode,
  sdkIntegrationService,
  type IntegrationProjectProfileInput,
  type IntegrationWorkflowPhaseIndex
} from "./sdkIntegrationService";

const publisherId = "publisher-new-ctv";

function validProfile(): IntegrationProjectProfileInput {
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

function completeChecksBeforePhase(
  state: MediaWorkflowState,
  user: BusinessUser,
  targetPhase: IntegrationWorkflowPhaseIndex
) {
  const project = state.integrationProjects.find((item) => item.publisher_id === publisherId);
  const profile = project
    ? state.integrationProjectProfiles.find((item) => item.integration_project_id === project.id)
    : undefined;
  let nextState = state;

  for (const template of integrationChecklistForProfile(profile)) {
    if (integrationWorkflowPhaseForCheck(template.code) >= targetPhase) continue;
    const result = sdkIntegrationService.updateCheckResult(nextState, user, publisherId, {
      itemCode: template.code,
      status: "passed",
      evidenceReference: `EVIDENCE-${template.code}`
    });
    expect(result.guard.allowed, `${template.code} should be completable in sequence`).toBe(true);
    nextState = result.state;
  }

  return nextState;
}

describe("SdkIntegrationService", () => {
  it("defines executable inputs, deliverables, pass conditions, and blockers for every gate", () => {
    expect(integrationWorkflowPhases).toHaveLength(13);

    for (const phase of integrationWorkflowPhases) {
      const contract = getIntegrationGateExecutionContract(phase.index);
      expect(contract.requiredInputs.length, `Gate ${phase.index} inputs`).toBeGreaterThan(0);
      expect(contract.requiredInputsZh.length).toBe(contract.requiredInputs.length);
      expect(contract.deliverables.length, `Gate ${phase.index} deliverables`).toBeGreaterThan(0);
      expect(contract.deliverablesZh.length).toBe(contract.deliverables.length);
      expect(contract.passConditions.length, `Gate ${phase.index} pass conditions`).toBeGreaterThan(0);
      expect(contract.passConditionsZh.length).toBe(contract.passConditions.length);
      expect(contract.blockingConditions.length, `Gate ${phase.index} blockers`).toBeGreaterThan(0);
      expect(contract.blockingConditionsZh.length).toBe(contract.blockingConditions.length);
    }
  });

  it("keeps business admission checks separate from route, privacy, and environment inputs", () => {
    const profile: IntegrationProjectProfile = {
      id: "profile-gate-scope",
      integration_project_id: "project-gate-scope",
      platform: validProfile().platform,
      traffic_channel: validProfile().trafficChannel,
      integration_mode: validProfile().integrationMode,
      protocol_codes: validProfile().protocolCodes,
      capability_profile: validProfile().capabilityProfile,
      property_identifier: validProfile().propertyIdentifier,
      playbook_codes: validProfile().playbookCodes,
      media_engineering_contact: validProfile().mediaEngineeringContact,
      planned_formats: validProfile().plannedFormats,
      privacy_profile: validProfile().privacyProfile
    };
    const byPhase = new Map<number, string[]>();

    for (const template of integrationChecklistForProfile(profile)) {
      const phase = integrationWorkflowPhaseForCheck(template.code);
      byPhase.set(phase, [...(byPhase.get(phase) ?? []), template.code]);
    }

    expect(byPhase.get(0)).toEqual(["TQ-001", "TQ-011"]);
    expect(byPhase.get(3)).toEqual(["TQ-012"]);
    expect(byPhase.get(6)).toEqual(expect.arrayContaining(["TQ-007", "TQ-008"]));
    expect(byPhase.get(8)).toEqual(
      expect.arrayContaining(["TQ-002", "TQ-005", "SPEC-001", "SPEC-006"])
    );
    expect(byPhase.get(0)).not.toEqual(
      expect.arrayContaining(["TQ-002", "TQ-007", "TQ-012", "SPEC-001"])
    );
  });

  it("provides guided execution prompts for technical, business, and validation checks", () => {
    const templates = integrationChecklistForProfile({
      id: "profile-guidance",
      integration_project_id: "project-guidance",
      ...{
        platform: validProfile().platform,
        traffic_channel: validProfile().trafficChannel,
        integration_mode: validProfile().integrationMode,
        protocol_codes: validProfile().protocolCodes,
        capability_profile: validProfile().capabilityProfile,
        property_identifier: validProfile().propertyIdentifier,
        playbook_codes: validProfile().playbookCodes,
        min_sdk: validProfile().minSdk,
        target_sdk: validProfile().targetSdk,
        compile_sdk: validProfile().compileSdk,
        media_engineering_contact: validProfile().mediaEngineeringContact,
        planned_formats: validProfile().plannedFormats,
        privacy_profile: validProfile().privacyProfile
      }
    });
    const technical = templates.find((template) => template.code === "TQ-002");
    const commercial = templates.find((template) => template.code === "COM-002");
    const validation = templates.find((template) => template.category === "functional_validation");

    expect(technical && getIntegrationCheckGuidance(technical)).toMatchObject({
      requiredInputZh: expect.stringContaining("媒体研发"),
      evidenceExpectationZh: expect.stringContaining("技术规格")
    });
    expect(commercial && getIntegrationCheckGuidance(commercial)).toMatchObject({
      evidenceExpectationZh: expect.stringContaining("商务条款")
    });
    expect(validation && getIntegrationCheckGuidance(validation)).toMatchObject({
      evidenceExpectationZh: expect.stringContaining("测试报告"),
      passCriteriaZh: expect.stringContaining("不存在未解决阻塞")
    });
  });

  it("builds a scoped checklist from the selected Origin Ads and IVT playbooks", () => {
    const profile: IntegrationProjectProfile = {
      id: "profile-1",
      integration_project_id: "integration-new-ctv-vast",
      platform: "android_tv",
      traffic_channel: "ctv",
      integration_mode: "ivt_sdk_api",
      protocol_codes: ["vast", "api"],
      capability_profile: validProfile().capabilityProfile,
      property_identifier: "com.example.ctv",
      playbook_codes: ["origin_ads_android_1_2", "origin_ivt_android_v11"],
      media_engineering_contact: "engineering@example.com",
      planned_formats: ["interstitial"],
      privacy_profile: validProfile().privacyProfile
    };

    const codes = integrationChecklistForProfile(profile).map((item) => item.code);

    expect(codes).toContain("TQ-001");
    expect(codes).toContain("CTV-003");
    expect(codes).toContain("VAST-002");
    expect(codes).not.toContain("MOB-001");
    expect(codes).toContain("SDK-011");
    expect(codes).toContain("SDK-016");
    expect(codes).not.toContain("SDK-013");
    expect(codes.map(integrationWorkflowPhaseForCheck)).toEqual(
      [...codes.map(integrationWorkflowPhaseForCheck)].sort((left, right) => left - right)
    );
  });

  it("recommends and validates integration routes from channel capabilities", () => {
    const ctvProfile = validProfile();

    expect(recommendedIntegrationMode("ctv", ctvProfile.capabilityProfile)).toBe("ivt_sdk_api");
    expect(integrationRouteIssues(ctvProfile)).toEqual([]);
    expect(
      integrationRouteIssues({
        ...ctvProfile,
        capabilityProfile: {
          ...ctvProfile.capabilityProfile,
          has_ad_player: false,
          supports_lifecycle_events: false
        }
      })
    ).toEqual(
      expect.arrayContaining([
        "IVT SDK + API requires complete advertising lifecycle events.",
        "CTV IVT + API requires an existing advertising-capable media player."
      ])
    );
  });

  it("rejects raw credentials and accepts a secret-manager reference", () => {
    const state = createInitialMediaWorkflowState();
    const user = authService.createMockUser("integration_manager");

    const rejected = sdkIntegrationService.saveProjectProfile(state, user, publisherId, {
      ...validProfile(),
      secretReference: "plain-text-app-secret"
    });
    expect(rejected.guard).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_PROFILE_INCOMPLETE"
    });

    const saved = sdkIntegrationService.saveProjectProfile(state, user, publisherId, validProfile());
    expect(saved.guard).toMatchObject({
      allowed: true,
      reason_code: "INTEGRATION_PROFILE_UPDATED"
    });
    expect(saved.state.integrationProjectProfiles[0]).toMatchObject({
      property_identifier: "com.example.ctv",
      secret_reference: "vault://pgos/media/new-ctv"
    });
    expect(saved.businessEvent?.eventCode).toBe("integration.profile_updated");
  });

  it("keeps the integration profile read-only for media managers", () => {
    const result = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      authService.createMockUser("media_manager"),
      publisherId,
      validProfile()
    );

    expect(result.guard).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_PROFILE_FORBIDDEN",
      required_approval_role: "integration_manager"
    });
  });

  it("requires evidence for blocking checks and propagates checklist blockers to the integration project", () => {
    const user = authService.createMockUser("integration_manager");
    let state = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      user,
      publisherId,
      validProfile()
    ).state;

    const noEvidence = sdkIntegrationService.updateCheckResult(state, user, publisherId, {
      itemCode: "TQ-001",
      status: "passed"
    });
    expect(noEvidence.guard.reason_code).toBe("INTEGRATION_CHECK_EVIDENCE_REQUIRED");

    const blocked = sdkIntegrationService.updateCheckResult(state, user, publisherId, {
      itemCode: "TQ-001",
      status: "blocked",
      blocker: "Media engineering owner has not been nominated."
    });
    expect(blocked.guard.allowed).toBe(true);
    expect(blocked.state.integrationProjects.find((project) => project.publisher_id === publisherId)).toMatchObject({
      status: "technical_blocked",
      blocker: "[TQ-001] Media engineering owner has not been nominated."
    });

    state = sdkIntegrationService.updateCheckResult(blocked.state, user, publisherId, {
      itemCode: "TQ-001",
      status: "passed",
      evidenceReference: "CONTACT-2026-001"
    }).state;
    expect(state.integrationCheckResults.find((item) => item.item_code === "TQ-001")).toMatchObject({
      status: "passed",
      evidence_reference: "CONTACT-2026-001"
    });
    expect(state.integrationProjects.find((project) => project.publisher_id === publisherId)?.blocker).toBeUndefined();
  });

  it("enforces checklist ownership and blocks readiness while detailed blocking checks remain incomplete", () => {
    const integrationUser = authService.createMockUser("integration_manager");
    const state = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      integrationUser,
      publisherId,
      validProfile()
    ).state;

    const unauthorized = sdkIntegrationService.updateCheckResult(
      state,
      authService.createMockUser("sales_manager"),
      publisherId,
      {
        itemCode: "TQ-001",
        status: "passed",
        evidenceReference: "CONTACT-2026-001"
      }
    );
    expect(unauthorized.guard.reason_code).toBe("INTEGRATION_CHECK_FORBIDDEN");

    const withSummaryEvidence = [
      ["connection_config", "CONFIG-001"],
      ["test_request", "REQUEST-001"],
      ["callback_log", "CALLBACK-001"],
      ["production_log", "LOG-001"]
    ].reduce(
      (currentState, [evidenceType, reference]) =>
        mediaWorkflowService.recordTechnicalEvidence(currentState, integrationUser, publisherId, {
          evidenceType: evidenceType as "connection_config" | "test_request" | "callback_log" | "production_log",
          title: reference,
          reference
        }).state,
      state
    );

    expect(
      mediaWorkflowService.submitTechnicalReadiness(
        withSummaryEvidence,
        authService.createMockUser("media_director"),
        publisherId
      ).guard
    ).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_CHECKLIST_INCOMPLETE"
    });
  });

  it("blocks a later workflow gate until its required dependency gate is complete", () => {
    const integrationUser = authService.createMockUser("integration_manager");
    let state = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      integrationUser,
      publisherId,
      validProfile()
    ).state;

    const skipped = sdkIntegrationService.updateCheckResult(state, integrationUser, publisherId, {
      itemCode: "TQ-012",
      status: "passed",
      evidenceReference: "ROUTE-APPROVAL-001"
    });
    expect(skipped.guard).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_STAGE_SEQUENCE_BLOCKED"
    });

    state = completeChecksBeforePhase(state, integrationUser, 1);
    const snapshot = sdkIntegrationService.getWorkspaceSnapshot(state, publisherId);
    expect(snapshot.phases.find((phase) => phase.index === 0)).toMatchObject({
      status: "complete",
      complete: true
    });
    expect(snapshot.currentPhase.index).toBe(1);
    expect(snapshot.phases.find((phase) => phase.index === 2)?.status).toBe("locked");
  });

  it("opens commercial, supply, privacy, and architecture gates in parallel after route approval", () => {
    const integrationUser = authService.createMockUser("integration_manager");
    const profiledState = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      integrationUser,
      publisherId,
      validProfile()
    ).state;
    const parallelReadyState = completeChecksBeforePhase(profiledState, integrationUser, 4);
    const snapshot = sdkIntegrationService.getWorkspaceSnapshot(parallelReadyState, publisherId);

    expect(snapshot.currentPhases.map((phase) => phase.index)).toEqual([4, 5, 6, 7]);
    expect(snapshot.phases[4]).toMatchObject({
      ownerRole: "sales_manager",
      activeOwnerRole: "sales_manager",
      plannedDate: "2026-07-11",
      scheduleSource: "pilot_projection"
    });
    expect(snapshot.phases[11]).toMatchObject({
      ownerRole: "adops_manager",
      plannedDate: "2026-08-15",
      scheduleSource: "pilot_projection"
    });
    expect(
      sdkIntegrationService.updateCheckResult(
        parallelReadyState,
        authService.createMockUser("sales_manager"),
        publisherId,
        {
          itemCode: "COM-001",
          status: "passed",
          evidenceReference: "COMMERCIAL-MODEL-001"
        }
      ).guard
    ).toMatchObject({ allowed: true, reason_code: "INTEGRATION_CHECK_UPDATED" });
    expect(
      sdkIntegrationService.updateCheckResult(
        parallelReadyState,
        authService.createMockUser("finance_manager"),
        publisherId,
        {
          itemCode: "COM-002",
          status: "passed",
          evidenceReference: "SETTLEMENT-TERMS-001"
        }
      ).guard
    ).toMatchObject({ allowed: true, reason_code: "INTEGRATION_CHECK_UPDATED" });
    expect(
      sdkIntegrationService.updateCheckResult(
        parallelReadyState,
        authService.createMockUser("adops_manager"),
        publisherId,
        {
          itemCode: "SUP-001",
          status: "passed",
          evidenceReference: "DSP-ACCEPTANCE-001"
        }
      ).guard
    ).toMatchObject({ allowed: true, reason_code: "INTEGRATION_CHECK_UPDATED" });
    expect(
      sdkIntegrationService.updateCheckResult(parallelReadyState, integrationUser, publisherId, {
        itemCode: "SPEC-001",
        status: "passed",
        evidenceReference: "PROTOCOL-SPEC-001"
      }).guard
    ).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_ENGINEERING_HANDOFF_REQUIRED"
    });
  });

  it("derives a blocked engineering handoff until Gate 0-7 and required packet data are complete", () => {
    const snapshot = sdkIntegrationService.getWorkspaceSnapshot(
      createInitialMediaWorkflowState(),
      publisherId
    );

    expect(snapshot.engineeringHandoff).toMatchObject({
      status: "blocked",
      readyForExecution: false,
      completedPrerequisiteGates: 0,
      totalPrerequisiteGates: 8
    });
    expect(snapshot.engineeringHandoff.missingPrerequisites.map((phase) => phase.index)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7
    ]);
    expect(snapshot.engineeringHandoff.blockingPacketIssues.map((issue) => issue.code)).toContain(
      "technical_profile"
    );
  });

  it("unlocks formal engineering execution after Gate 0-7 and the handoff packet are complete", () => {
    const integrationUser = authService.createMockUser("integration_manager");
    const profiledState = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      integrationUser,
      publisherId,
      validProfile()
    ).state;
    const handoffReadyState = completeChecksBeforePhase(profiledState, integrationUser, 8);
    const snapshot = sdkIntegrationService.getWorkspaceSnapshot(handoffReadyState, publisherId);

    expect(snapshot.engineeringHandoff).toMatchObject({
      status: "ready",
      readyForExecution: true,
      completedPrerequisiteGates: 8,
      totalPrerequisiteGates: 8
    });
    expect(snapshot.engineeringHandoff.missingPrerequisites).toEqual([]);
    expect(snapshot.engineeringHandoff.blockingPacketIssues).toEqual([]);
    expect(snapshot.engineeringHandoff.primaryContact).toMatchObject({
      name: "Chen Yu",
      is_primary: true
    });
    expect(snapshot.engineeringHandoff.activeAdSlots).toHaveLength(1);
    expect(snapshot.engineeringHandoff.contractTerms).toHaveLength(1);
    expect(snapshot.engineeringHandoff.executionMilestones.map((phase) => phase.index)).toEqual([
      8, 9, 10, 11, 12
    ]);
  });

  it("keeps Gate 08 locked when a required engineering handoff input is missing", () => {
    const integrationUser = authService.createMockUser("integration_manager");
    const profiledState = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      integrationUser,
      publisherId,
      validProfile()
    ).state;
    const handoffReadyState = completeChecksBeforePhase(profiledState, integrationUser, 8);
    const missingContactState: MediaWorkflowState = {
      ...handoffReadyState,
      publisherContacts: handoffReadyState.publisherContacts.filter(
        (contact) => contact.publisher_id !== publisherId
      )
    };

    const result = sdkIntegrationService.updateCheckResult(
      missingContactState,
      integrationUser,
      publisherId,
      {
        itemCode: "TQ-002",
        status: "in_progress",
        dueDate: "2026-07-15"
      }
    );

    expect(result.guard).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_ENGINEERING_HANDOFF_REQUIRED",
      required_approval_role: "media_manager"
    });
  });

  it("uses an explicit checklist due date ahead of the projected pilot schedule", () => {
    const integrationUser = authService.createMockUser("integration_manager");
    const profiledState = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      integrationUser,
      publisherId,
      validProfile()
    ).state;
    const scheduledState = sdkIntegrationService.updateCheckResult(
      profiledState,
      integrationUser,
      publisherId,
      {
        itemCode: "TQ-001",
        status: "in_progress",
        dueDate: "2026-06-03"
      }
    ).state;

    expect(sdkIntegrationService.getWorkspaceSnapshot(scheduledState, publisherId).phases[0]).toMatchObject({
      plannedDate: "2026-06-03",
      scheduleSource: "check_due_date",
      activeOwnerRole: "media_manager"
    });
  });

  it("lets legal and data owners update only their assigned checks", () => {
    const integrationUser = authService.createMockUser("integration_manager");
    const profiledState = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      integrationUser,
      publisherId,
      validProfile()
    ).state;
    const legalUser = authService.createMockUser("legal_manager");
    const dataUser = authService.createMockUser("data_analyst");

    const legalReadyState = completeChecksBeforePhase(profiledState, integrationUser, 4);
    const legalResult = sdkIntegrationService.updateCheckResult(legalReadyState, legalUser, publisherId, {
      itemCode: "TQ-007",
      status: "passed",
      evidenceReference: "PRIVACY-ASSESSMENT-001"
    });
    expect(legalResult.guard).toMatchObject({
      allowed: true,
      reason_code: "INTEGRATION_CHECK_UPDATED"
    });
    expect(legalResult.state.integrationCheckResults.find((item) => item.item_code === "TQ-007")).toMatchObject({
      owner_role: "legal_manager",
      status: "passed"
    });

    expect(
      sdkIntegrationService.updateCheckResult(profiledState, legalUser, publisherId, {
        itemCode: "TQ-001",
        status: "passed",
        evidenceReference: "OWNER-CONTACT-001"
      }).guard
    ).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_CHECK_FORBIDDEN",
      required_approval_role: "media_manager"
    });

    const dataReadyState = completeChecksBeforePhase(profiledState, integrationUser, 9);
    const dataResult = sdkIntegrationService.updateCheckResult(dataReadyState, dataUser, publisherId, {
      itemCode: "SDK-017",
      status: "passed",
      evidenceReference: "IVT-VALIDATION-001"
    });
    expect(dataResult.guard).toMatchObject({
      allowed: true,
      reason_code: "INTEGRATION_CHECK_UPDATED"
    });
    expect(dataResult.state.integrationCheckResults.find((item) => item.item_code === "SDK-017")).toMatchObject({
      owner_role: "data_analyst",
      status: "passed"
    });
  });

  it("lets the media manager complete only business and inventory checks", () => {
    const integrationUser = authService.createMockUser("integration_manager");
    const profiledState = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      integrationUser,
      publisherId,
      validProfile()
    ).state;
    const mediaUser = authService.createMockUser("media_manager");
    const inventoryReadyState = completeChecksBeforePhase(profiledState, integrationUser, 2);

    expect(
      sdkIntegrationService.updateCheckResult(inventoryReadyState, mediaUser, publisherId, {
        itemCode: "CTV-001",
        status: "passed",
        evidenceReference: "CTV-INVENTORY-001"
      }).guard
    ).toMatchObject({ allowed: true, reason_code: "INTEGRATION_CHECK_UPDATED" });

    expect(
      sdkIntegrationService.updateCheckResult(profiledState, mediaUser, publisherId, {
        itemCode: "TQ-012",
        status: "passed",
        evidenceReference: "ROUTE-APPROVAL-001"
      }).guard
    ).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_CHECK_FORBIDDEN",
      required_approval_role: "integration_manager"
    });
  });

  it("keeps pilot and scale locked until the launch gate has been formally submitted", () => {
    const integrationUser = authService.createMockUser("integration_manager");
    const adopsUser = authService.createMockUser("adops_manager");
    const profiledState = sdkIntegrationService.saveProjectProfile(
      createInitialMediaWorkflowState(),
      integrationUser,
      publisherId,
      validProfile()
    ).state;
    const launchReadyState = completeChecksBeforePhase(profiledState, integrationUser, 11);

    const locked = sdkIntegrationService.updateCheckResult(launchReadyState, adopsUser, publisherId, {
      itemCode: "PILOT-001",
      status: "passed",
      evidenceReference: "PILOT-KPI-001"
    });
    expect(locked.guard).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_LAUNCH_GATE_REQUIRED",
      required_approval_role: "media_director"
    });

    const launchedState: MediaWorkflowState = {
      ...launchReadyState,
      integrationProjects: launchReadyState.integrationProjects.map((project) =>
        project.publisher_id === publisherId
          ? { ...project, status: "technical_live_passed" }
          : project
      )
    };
    const pilotCompleted = sdkIntegrationService.updateCheckResult(launchedState, adopsUser, publisherId, {
      itemCode: "PILOT-001",
      status: "passed",
      evidenceReference: "PILOT-KPI-001"
    });
    expect(pilotCompleted.guard).toMatchObject({
      allowed: true,
      reason_code: "INTEGRATION_CHECK_UPDATED"
    });
    const scaleCompleted = sdkIntegrationService.updateCheckResult(pilotCompleted.state, adopsUser, publisherId, {
      itemCode: "SCALE-001",
      status: "passed",
      evidenceReference: "SCALE-GOVERNANCE-001"
    });
    expect(scaleCompleted.guard).toMatchObject({
      allowed: true,
      reason_code: "INTEGRATION_CHECK_UPDATED"
    });
    const completedSnapshot = sdkIntegrationService.getWorkspaceSnapshot(scaleCompleted.state, publisherId);
    expect(completedSnapshot.phases[11]).toMatchObject({
      complete: true,
      status: "complete"
    });
    expect(completedSnapshot.phases[12]).toMatchObject({
      complete: true,
      status: "complete"
    });
  });

  it("reserves final technical readiness submission for media or operations directors", () => {
    const result = mediaWorkflowService.submitTechnicalReadiness(
      createInitialMediaWorkflowState(),
      authService.createMockUser("integration_manager"),
      publisherId
    );

    expect(result.guard).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_READINESS_FORBIDDEN",
      required_approval_role: "media_director"
    });
  });
});
