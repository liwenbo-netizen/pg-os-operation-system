import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import {
  createInitialMediaWorkflowState,
  mediaWorkflowService,
  type PublisherOnboardingInput
} from "./mediaWorkflowService";

const user = authService.createMockUser.bind(authService);

function completeOnboardingInput(suffix: string): PublisherOnboardingInput {
  return {
    publisher: {
      name: `Publisher ${suffix}`,
      legalEntity: `Publisher ${suffix} Technology Co., Ltd.`,
      region: "CN",
      mediaType: "App",
      propertyName: `Property ${suffix}`,
      propertyIdentifierType: "android_package",
      propertyIdentifier: `com.example.${suffix.toLowerCase()}`,
      integrationType: "SDK",
      dailyActiveUsers: 120000,
      monthlyActiveUsers: 800000,
      dailyRequests: 900000,
      trafficDataAsOf: "2026-07-20",
      trafficSource: "first_party_analytics"
    },
    contact: {
      name: "Li Ming",
      roleTitle: "Business Development",
      email: "li.ming@example.com"
    },
    adSlot: {
      slotName: "Home Feed Native",
      adFormat: "Native",
      placementType: "Feed",
      dailyRequests: 300000,
      floorPrice: 12.5,
      currency: "CNY"
    },
    contractTerm: {
      contractType: "Framework",
      billingModel: "CPM",
      settlementCycle: "Monthly",
      paymentTerms: "Net 30",
      revenueShare: 0.65,
      currency: "CNY"
    }
  };
}

describe("MediaWorkflowService P0 mainline", () => {
  it("creates a complete commercial publisher onboarding package", () => {
    const state = createInitialMediaWorkflowState();
    const result = mediaWorkflowService.createPublisherOnboarding(state, user("media_manager"), {
      publisher: {
        name: "Example Media Group",
        legalEntity: "Example Media Technology Co., Ltd.",
        region: "CN",
        mediaType: "App",
        propertyName: "Example Video",
        propertyIdentifierType: "android_package",
        propertyIdentifier: "com.example.video",
        integrationType: "SDK",
        dailyActiveUsers: 1200000,
        monthlyActiveUsers: 8000000,
        dailyRequests: 9000000,
        trafficDataAsOf: "2026-07-19",
        trafficSource: "first_party_analytics"
      },
      contact: {
        name: "Li Ming",
        roleTitle: "Business Development",
        email: "li.ming@example.com",
        phone: "+86 138 0000 0000"
      },
      adSlot: {
        slotName: "Home Feed Native",
        adFormat: "Native",
        placementType: "Feed",
        creativeSpec: "1200x627",
        dailyRequests: 3000000,
        floorPrice: 12.5,
        currency: "CNY"
      },
      contractTerm: {
        contractType: "Framework",
        billingModel: "CPM",
        settlementCycle: "Monthly",
        paymentTerms: "Net 30",
        revenueShare: 0.65,
        currency: "CNY"
      }
    });

    expect(result.guard).toMatchObject({ allowed: true, reason_code: "PUBLISHER_ONBOARDING_CREATED" });
    expect(result.publisherId).toBeDefined();
    expect(result.state.publishers).toHaveLength(state.publishers.length + 1);
    expect(result.state.publisherContacts).toHaveLength(state.publisherContacts.length + 1);
    expect(result.state.publisherAdSlots).toHaveLength(state.publisherAdSlots.length + 1);
    expect(result.state.publisherContractTerms).toHaveLength(state.publisherContractTerms.length + 1);
    expect(result.state.integrationProjects).toHaveLength(state.integrationProjects.length + 1);
    expect(result.state.publishers[0]).toMatchObject({
      name: "Example Media Group",
      legal_entity: "Example Media Technology Co., Ltd.",
      daily_active_users: 1200000,
      daily_requests: 9000000,
      metadata: {
        property_identifier: "com.example.video",
        monthly_active_users: 8000000,
        traffic_data_as_of: "2026-07-19"
      }
    });
    expect(result.state.auditEvents.slice(0, 5).map((event) => event.action)).toEqual([
      "publisher.onboarding.create",
      "publisher_contract_term.create",
      "publisher_ad_slot.create",
      "publisher_contact.create",
      "publisher.create"
    ]);
    expect(result.state.businessEvents.map((event) => event.eventCode)).toContain("publisher.onboarding_created");
  });

  it("rejects incomplete onboarding before creating partial records", () => {
    const state = createInitialMediaWorkflowState();
    const result = mediaWorkflowService.createPublisherOnboarding(state, user("media_manager"), {
      publisher: { name: "", region: "CN", mediaType: "App", integrationType: "SDK" },
      contact: { name: "", roleTitle: "" },
      adSlot: { slotName: "", adFormat: "Native", placementType: "Feed" },
      contractTerm: { contractType: "Framework", billingModel: "CPM", settlementCycle: "Monthly", paymentTerms: "" }
    });

    expect(result.guard).toMatchObject({ allowed: false, reason_code: "PUBLISHER_ONBOARDING_INVALID" });
    expect(result.state.publishers).toHaveLength(state.publishers.length);
    expect(result.state.publisherAdSlots).toHaveLength(state.publisherAdSlots.length);
  });

  it("blocks duplicate publisher names and property identifiers before partial writes", () => {
    const state = createInitialMediaWorkflowState();
    const first = mediaWorkflowService.createPublisherOnboarding(state, user("media_manager"), completeOnboardingInput("Alpha"));
    const duplicateNameInput = completeOnboardingInput("Beta");
    duplicateNameInput.publisher.name = "  PUBLISHER   ALPHA ";
    const duplicateName = mediaWorkflowService.createPublisherOnboarding(
      first.state,
      user("media_manager"),
      duplicateNameInput
    );

    expect(duplicateName.guard).toMatchObject({ allowed: false, reason_code: "PUBLISHER_NAME_DUPLICATE" });
    expect(duplicateName.state.publishers).toHaveLength(first.state.publishers.length);
    expect(duplicateName.state.publisherContacts).toHaveLength(first.state.publisherContacts.length);

    const duplicateIdentifierInput = completeOnboardingInput("Gamma");
    duplicateIdentifierInput.publisher.propertyIdentifier = "COM.EXAMPLE.ALPHA";
    const duplicateIdentifier = mediaWorkflowService.createPublisherOnboarding(
      first.state,
      user("media_manager"),
      duplicateIdentifierInput
    );

    expect(duplicateIdentifier.guard).toMatchObject({
      allowed: false,
      reason_code: "PUBLISHER_IDENTIFIER_DUPLICATE"
    });
    expect(duplicateIdentifier.state.publisherAdSlots).toHaveLength(first.state.publisherAdSlots.length);
    expect(duplicateIdentifier.state.publisherContractTerms).toHaveLength(first.state.publisherContractTerms.length);
  });

  it("updates a governed onboarding package without replacing record identities or technical handoff", () => {
    const state = createInitialMediaWorkflowState();
    const created = mediaWorkflowService.createPublisherOnboarding(
      state,
      user("media_manager"),
      completeOnboardingInput("Editable")
    );
    const publisherId = created.publisherId!;
    const before = mediaWorkflowService.getPublisherSnapshot(created.state, publisherId);
    const updatedInput = completeOnboardingInput("Editable");
    updatedInput.publisher.name = "Publisher Editable Updated";
    updatedInput.publisher.dailyActiveUsers = 240000;
    updatedInput.publisher.trafficDataAsOf = "2026-07-21";
    updatedInput.publisher.integrationType = "OpenRTB";
    updatedInput.contact.name = "Wang Lin";
    updatedInput.adSlot.floorPrice = 18;
    updatedInput.contractTerm.paymentTerms = "Net 45";

    const updated = mediaWorkflowService.updatePublisherOnboarding(
      created.state,
      user("media_manager"),
      publisherId,
      updatedInput
    );
    const after = mediaWorkflowService.getPublisherSnapshot(updated.state, publisherId);

    expect(updated.guard).toMatchObject({ allowed: true, reason_code: "PUBLISHER_ONBOARDING_UPDATED" });
    expect(updated.state.publishers).toHaveLength(created.state.publishers.length);
    expect(updated.state.publisherContacts).toHaveLength(created.state.publisherContacts.length);
    expect(updated.state.publisherAdSlots).toHaveLength(created.state.publisherAdSlots.length);
    expect(updated.state.publisherContractTerms).toHaveLength(created.state.publisherContractTerms.length);
    expect(after.publisher).toMatchObject({
      id: publisherId,
      name: "Publisher Editable Updated",
      daily_active_users: 240000,
      integration_type: "OpenRTB",
      metadata: expect.objectContaining({ traffic_data_as_of: "2026-07-21" })
    });
    expect(after.contacts[0]).toMatchObject({ id: before.contacts[0].id, name: "Wang Lin" });
    expect(after.adSlots[0]).toMatchObject({ id: before.adSlots[0].id, floor_price: 18 });
    expect(after.contractTerms[0]).toMatchObject({ id: before.contractTerms[0].id, payment_terms: "Net 45" });
    expect(after.integrationProjects[0]).toMatchObject({
      id: before.integrationProjects[0].id,
      integration_type: "OpenRTB"
    });
    expect(updated.auditEvents?.map((event) => event.action)).toEqual([
      "publisher.onboarding.update",
      "integration_project.update",
      "publisher_contract_term.update",
      "publisher_ad_slot.update",
      "publisher_contact.update",
      "publisher.update"
    ]);
    expect(updated.changedAreas).toEqual(["publisher", "contact", "ad_slot", "contract_term", "integration"]);
    expect(updated.changedFields).toEqual(
      expect.arrayContaining([
        "publisher.name",
        "publisher.traffic_data_as_of",
        "contact.name",
        "ad_slot.floor_price",
        "contract_term.payment_terms",
        "integration.integration_type"
      ])
    );
  });

  it("writes only publisher data and precise audit metadata for a traffic evidence date change", () => {
    const state = createInitialMediaWorkflowState();
    const created = mediaWorkflowService.createPublisherOnboarding(
      state,
      user("media_manager"),
      completeOnboardingInput("DateOnly")
    );
    const updatedInput = completeOnboardingInput("DateOnly");
    updatedInput.publisher.trafficDataAsOf = "2026-07-22";

    const updated = mediaWorkflowService.updatePublisherOnboarding(
      created.state,
      user("media_manager"),
      created.publisherId!,
      updatedInput
    );

    expect(updated.auditEvents?.map((event) => event.action)).toEqual([
      "publisher.onboarding.update",
      "publisher.update"
    ]);
    expect(updated.changedFields).toEqual(["publisher.traffic_data_as_of"]);
    expect(updated.changedAreas).toEqual(["publisher"]);
    expect(updated.state.publisherContacts).toBe(created.state.publisherContacts);
    expect(updated.state.publisherAdSlots).toBe(created.state.publisherAdSlots);
    expect(updated.state.publisherContractTerms).toBe(created.state.publisherContractTerms);
    expect(updated.state.integrationProjects).toBe(created.state.integrationProjects);
    expect(updated.auditEvent?.metadata).toMatchObject({
      changedFields: ["publisher.traffic_data_as_of"],
      changes: {
        "publisher.traffic_data_as_of": {
          before: "2026-07-20",
          after: "2026-07-22"
        }
      }
    });
  });

  it("writes only the primary contact and masks contact values in audit metadata", () => {
    const state = createInitialMediaWorkflowState();
    const created = mediaWorkflowService.createPublisherOnboarding(
      state,
      user("media_manager"),
      completeOnboardingInput("ContactOnly")
    );
    const updatedInput = completeOnboardingInput("ContactOnly");
    updatedInput.contact.email = "updated.contact@example.com";

    const updated = mediaWorkflowService.updatePublisherOnboarding(
      created.state,
      user("media_manager"),
      created.publisherId!,
      updatedInput
    );

    expect(updated.auditEvents?.map((event) => event.action)).toEqual([
      "publisher.onboarding.update",
      "publisher_contact.update"
    ]);
    expect(updated.changedFields).toEqual(["contact.email"]);
    expect(updated.changedAreas).toEqual(["contact"]);
    expect(updated.state.publishers).toBe(created.state.publishers);
    expect(updated.auditEvent?.metadata).toMatchObject({
      changes: {
        "contact.email": {
          before: "l***@example.com",
          after: "u***@example.com"
        }
      }
    });
  });

  it("does not write or audit when the onboarding package is unchanged", () => {
    const state = createInitialMediaWorkflowState();
    const input = completeOnboardingInput("NoChange");
    const created = mediaWorkflowService.createPublisherOnboarding(state, user("media_manager"), input);

    const updated = mediaWorkflowService.updatePublisherOnboarding(
      created.state,
      user("media_manager"),
      created.publisherId!,
      completeOnboardingInput("NoChange")
    );

    expect(updated.guard).toMatchObject({
      allowed: true,
      reason_code: "PUBLISHER_ONBOARDING_NO_CHANGES",
      audit_required: false
    });
    expect(updated.state).toBe(created.state);
    expect(updated.auditEvents).toEqual([]);
    expect(updated.changedFields).toEqual([]);
    expect(updated.changedAreas).toEqual([]);
  });

  it("blocks profile updates that collide with another publisher identifier", () => {
    const state = createInitialMediaWorkflowState();
    const first = mediaWorkflowService.createPublisherOnboarding(state, user("media_manager"), completeOnboardingInput("First"));
    const second = mediaWorkflowService.createPublisherOnboarding(first.state, user("media_manager"), completeOnboardingInput("Second"));
    const collidingInput = completeOnboardingInput("Second");
    collidingInput.publisher.propertyIdentifier = "com.example.first";

    const result = mediaWorkflowService.updatePublisherOnboarding(
      second.state,
      user("media_manager"),
      second.publisherId!,
      collidingInput
    );

    expect(result.guard).toMatchObject({ allowed: false, reason_code: "PUBLISHER_IDENTIFIER_DUPLICATE" });
    expect(result.state.publishers.find((publisher) => publisher.id === second.publisherId)?.metadata?.property_identifier).toBe(
      "com.example.second"
    );
  });

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
      name: "New Demo Audio Network",
      region: "CN",
      mediaType: "App",
      integrationType: "SDK"
    });

    expect(allowed.guard).toMatchObject({
      allowed: true,
      reason_code: "PUBLISHER_CREATED"
    });
    expect(allowed.state.publishers[0]).toMatchObject({
      name: "New Demo Audio Network",
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
      next_action: "Technical readiness passed. Continue to commercial validation.",
      go_live_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      readiness_reviewed_at: expect.any(String)
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
