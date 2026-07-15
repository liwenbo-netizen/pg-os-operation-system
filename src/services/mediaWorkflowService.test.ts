import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { createInitialMediaWorkflowState, mediaWorkflowService } from "./mediaWorkflowService";

const user = authService.createMockUser.bind(authService);

describe("MediaWorkflowService P0 mainline", () => {
  it("creates publisher only for media roles with publisher.manage", () => {
    const state = createInitialMediaWorkflowState();
    const blocked = mediaWorkflowService.createPublisher(state, user("audit_viewer"), {
      name: "Blocked Publisher",
      region: "CN",
      mediaType: "App",
      integrationType: "SDK"
    });

    expect(blocked.guard).toMatchObject({
      allowed: false,
      reason_code: "PUBLISHER_CREATE_FORBIDDEN"
    });

    const allowed = mediaWorkflowService.createPublisher(state, user("media_manager"), {
      name: "Demo Audio Network",
      region: "CN",
      mediaType: "App",
      integrationType: "SDK"
    });

    expect(allowed.guard).toMatchObject({
      allowed: true,
      reason_code: "PUBLISHER_CREATED"
    });
    expect(allowed.state.publishers[0]).toMatchObject({
      name: "Demo Audio Network",
      technical_live_status: "draft",
      commercial_test_status: "not_started",
      sales_scale_status: "not_allowed"
    });
  });

  it("moves New CTV Partner through technical live, commercial test, and scale readiness", () => {
    let state = createInitialMediaWorkflowState();
    state = {
      ...state,
      publishers: state.publishers.map((publisher) =>
        publisher.id === "publisher-new-ctv" ? { ...publisher, technical_live_status: "draft" } : publisher
      ),
      integrationProjects: state.integrationProjects.map((project) =>
        project.publisher_id === "publisher-new-ctv" ? { ...project, status: "pending_integration" } : project
      )
    };

    const execution = mediaWorkflowService.startTechnicalExecution(state, user("integration_manager"), "publisher-new-ctv");
    expect(execution.guard).toMatchObject({ allowed: true, reason_code: "INTEGRATION_EXECUTION_STARTED" });
    state = execution.state;
    expect(mediaWorkflowService.startTechnicalExecution(state, user("integration_manager"), "publisher-new-ctv").guard).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_EXECUTION_ALREADY_STARTED"
    });

    for (const [evidenceType, reference] of [
      ["connection_config", "VAST-CONFIG-001"],
      ["test_request", "TEST-REQUEST-001"],
      ["callback_log", "CALLBACK-LOG-001"],
      ["production_log", "PRODUCTION-LOG-001"]
    ] as const) {
      const evidence = mediaWorkflowService.recordTechnicalEvidence(state, user("integration_manager"), "publisher-new-ctv", {
        evidenceType,
        title: `${evidenceType} evidence`,
        reference
      });
      expect(evidence.guard).toMatchObject({ allowed: true, reason_code: "INTEGRATION_EVIDENCE_RECORDED" });
      state = evidence.state;
    }

    const technical = mediaWorkflowService.submitTechnicalValidation(state, user("integration_manager"), "publisher-new-ctv");
    expect(technical.guard).toMatchObject({
      allowed: true,
      reason_code: "TECHNICAL_READINESS_ALLOWED"
    });
    state = technical.state;
    expect(state.publishers.find((publisher) => publisher.id === "publisher-new-ctv")).toMatchObject({
      technical_live_status: "technical_live_passed"
    });
    expect(state.integrationProjects.find((project) => project.publisher_id === "publisher-new-ctv")).toMatchObject({
      status: "technical_live_passed",
      next_action: "Technical readiness passed. Continue to commercial validation."
    });
    expect(
      mediaWorkflowService.setTechnicalBlocker(state, user("integration_manager"), "publisher-new-ctv", "Late blocker").guard
    ).toMatchObject({ allowed: false, reason_code: "TECHNICAL_READINESS_ALREADY_PASSED" });

    const commercialTest = mediaWorkflowService.createCommercialTest(state, user("adops_manager"), "publisher-new-ctv");
    expect(commercialTest.guard).toMatchObject({
      allowed: true,
      reason_code: "COMMERCIAL_TEST_CREATE_ALLOWED"
    });
    state = commercialTest.state;

    const latestTest = state.commercialTests.find((test) => test.publisher_id === "publisher-new-ctv");
    expect(latestTest).toBeDefined();

    const conclusion = mediaWorkflowService.submitCommercialTestConclusion(
      state,
      user("adops_manager"),
      latestTest?.id ?? "missing",
      "test_passed"
    );
    expect(conclusion.guard).toMatchObject({
      allowed: true,
      reason_code: "COMMERCIAL_TEST_ALLOWED"
    });
    state = conclusion.state;

    const readiness = mediaWorkflowService.approveSalesReadiness(state, user("media_director"), "publisher-new-ctv", "scale_ready");
    expect(readiness.guard).toMatchObject({
      allowed: true,
      reason_code: "SCALE_READINESS_ALLOWED"
    });
    expect(readiness.state.publishers.find((publisher) => publisher.id === "publisher-new-ctv")).toMatchObject({
      technical_live_status: "technical_live_passed",
      commercial_test_status: "test_passed",
      sales_scale_status: "scale_ready"
    });
    expect(readiness.state.auditEvents.length).toBeGreaterThanOrEqual(4);
    expect(readiness.state.businessEvents.map((event) => event.eventCode)).toContain("publisher.sales_readiness_approved");
  });

  it("prevents media_manager from bypassing technical validation and scale approval", () => {
    const state = createInitialMediaWorkflowState();

    expect(mediaWorkflowService.submitTechnicalValidation(state, user("media_manager"), "publisher-new-ctv").guard).toMatchObject({
      allowed: false,
      reason_code: "INTEGRATION_READINESS_FORBIDDEN",
      required_approval_role: "integration_manager"
    });

    expect(mediaWorkflowService.approveSalesReadiness(state, user("media_manager"), "publisher-233", "scale_ready").guard).toMatchObject({
      allowed: false,
      reason_code: "FORBIDDEN",
      required_approval_role: "media_director"
    });
  });

  it("requires complete evidence, supports blocker resolution, and updates duplicate evidence", () => {
    let state = createInitialMediaWorkflowState();
    const integrationUser = user("integration_manager");

    expect(mediaWorkflowService.submitTechnicalValidation(state, integrationUser, "publisher-new-ctv").guard).toMatchObject({
      allowed: false,
      reason_code: "TECHNICAL_EVIDENCE_INCOMPLETE"
    });

    state = mediaWorkflowService.startTechnicalExecution(state, integrationUser, "publisher-new-ctv").state;
    const firstEvidence = mediaWorkflowService.recordTechnicalEvidence(state, integrationUser, "publisher-new-ctv", {
      evidenceType: "connection_config",
      title: "Initial VAST config",
      reference: "VAST-001"
    });
    state = firstEvidence.state;
    const replacementEvidence = mediaWorkflowService.recordTechnicalEvidence(state, integrationUser, "publisher-new-ctv", {
      evidenceType: "connection_config",
      title: "Updated VAST config",
      reference: "VAST-002"
    });
    state = replacementEvidence.state;

    const projectAfterEvidence = state.integrationProjects.find((project) => project.publisher_id === "publisher-new-ctv");
    expect(projectAfterEvidence?.evidence).toHaveLength(1);
    expect(projectAfterEvidence?.evidence?.[0]).toMatchObject({ reference: "VAST-002" });

    const blocked = mediaWorkflowService.setTechnicalBlocker(
      state,
      integrationUser,
      "publisher-new-ctv",
      "Publisher callback endpoint is unavailable."
    );
    expect(blocked.guard).toMatchObject({ allowed: true, reason_code: "INTEGRATION_BLOCKER_SET" });
    state = blocked.state;
    expect(mediaWorkflowService.submitTechnicalValidation(state, integrationUser, "publisher-new-ctv").guard).toMatchObject({
      allowed: false,
      reason_code: "TECHNICAL_BLOCKER_ACTIVE"
    });

    const resolved = mediaWorkflowService.resolveTechnicalBlocker(state, integrationUser, "publisher-new-ctv");
    expect(resolved.guard).toMatchObject({ allowed: true, reason_code: "INTEGRATION_BLOCKER_RESOLVED" });
    expect(resolved.state.integrationProjects.find((project) => project.publisher_id === "publisher-new-ctv")?.blocker).toBeUndefined();
  });

  it("blocks scale readiness for LOFTER while a diagnostic case blocks sales scale", () => {
    const state = createInitialMediaWorkflowState();

    expect(mediaWorkflowService.approveSalesReadiness(state, user("media_director"), "publisher-lofter", "scale_ready").guard).toMatchObject({
      allowed: false,
      reason_code: "BLOCKING_DIAGNOSTIC_CASE"
    });
  });
});
