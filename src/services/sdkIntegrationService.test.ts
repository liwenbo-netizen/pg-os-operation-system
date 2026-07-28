import { describe, expect, it } from "vitest";
import type { IntegrationProjectProfile } from "../types/domain";
import { authService } from "./authService";
import { createInitialMediaWorkflowState, mediaWorkflowService } from "./mediaWorkflowService";
import {
  integrationChecklistForProfile,
  sdkIntegrationService,
  type IntegrationProjectProfileInput
} from "./sdkIntegrationService";

const publisherId = "publisher-new-ctv";

function validProfile(): IntegrationProjectProfileInput {
  return {
    platform: "android_tv",
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

describe("SdkIntegrationService", () => {
  it("builds a scoped checklist from the selected Origin Ads and IVT playbooks", () => {
    const profile: IntegrationProjectProfile = {
      id: "profile-1",
      integration_project_id: "integration-new-ctv-vast",
      platform: "android_tv",
      property_identifier: "com.example.ctv",
      playbook_codes: ["origin_ads_android_1_2", "origin_ivt_android_v11"],
      media_engineering_contact: "engineering@example.com",
      planned_formats: ["interstitial"],
      privacy_profile: validProfile().privacyProfile
    };

    const codes = integrationChecklistForProfile(profile).map((item) => item.code);

    expect(codes).toContain("TQ-001");
    expect(codes).toContain("SDK-011");
    expect(codes).toContain("SDK-016");
    expect(codes).not.toContain("SDK-013");
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

    const legalResult = sdkIntegrationService.updateCheckResult(profiledState, legalUser, publisherId, {
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
      required_approval_role: "integration_manager"
    });

    const dataResult = sdkIntegrationService.updateCheckResult(profiledState, dataUser, publisherId, {
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
