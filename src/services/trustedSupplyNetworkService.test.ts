import { describe, expect, it } from "vitest";
import { authService } from "./authService";
import { createInitialMediaWorkflowState } from "./mediaWorkflowService";
import { createInitialSalesWorkflowState } from "./salesWorkflowService";
import { trustedSupplyNetworkService } from "./trustedSupplyNetworkService";

describe("TrustedSupplyNetworkService CM-5F to CM-5H", () => {
  it("keeps scoring separate from human pool confirmation", () => {
    const state = createInitialMediaWorkflowState();
    const result = trustedSupplyNetworkService.evaluatePublisher(
      state,
      authService.createMockUser("media_manager"),
      "publisher-233"
    );

    expect(result.guard).toMatchObject({ allowed: true, reason_code: "TRUST_SCORE_EVALUATED" });
    expect(result.state.mediaTrustProfiles[0]).toMatchObject({
      publisher_id: "publisher-233",
      status: "evaluated",
      confirmed_pool: undefined
    });
    expect(result.state.publishers.find((item) => item.id === "publisher-233")?.sales_scale_status).toBe("scale_ready");
    expect(result.state.mediaTrustScoreHistory).toHaveLength(1);
  });

  it("requires a media approval role and enforces pool thresholds", () => {
    let state = createInitialMediaWorkflowState();
    state = trustedSupplyNetworkService.evaluatePublisher(
      state,
      authService.createMockUser("media_manager"),
      "publisher-233"
    ).state;

    expect(
      trustedSupplyNetworkService.confirmPool(state, authService.createMockUser("media_manager"), "publisher-233").guard
    ).toMatchObject({ allowed: false, reason_code: "TRUST_POOL_CONFIRM_FORBIDDEN" });

    const confirmed = trustedSupplyNetworkService.confirmPool(
      state,
      authService.createMockUser("media_director"),
      "publisher-233"
    );
    expect(confirmed.guard).toMatchObject({ allowed: true, reason_code: "TRUST_POOL_CONFIRMED" });
    expect(confirmed.state.mediaTrustProfiles[0].confirmed_pool).toBeDefined();
    expect(confirmed.state.publishers.find((item) => item.id === "publisher-233")?.sales_scale_status).toBe("scale_ready");
  });

  it("packages only confirmed supply and exposes active packages to Sales matching", () => {
    let state = createInitialMediaWorkflowState();
    state = trustedSupplyNetworkService.evaluatePublisher(
      state,
      authService.createMockUser("media_manager"),
      "publisher-233"
    ).state;
    state = trustedSupplyNetworkService.confirmPool(
      state,
      authService.createMockUser("media_director"),
      "publisher-233"
    ).state;

    const created = trustedSupplyNetworkService.createSupplyPackage(
      state,
      authService.createMockUser("media_manager"),
      "publisher-233"
    );
    expect(created.guard).toMatchObject({ allowed: true, reason_code: "SUPPLY_PACKAGE_CREATED" });
    state = created.state;

    const activated = trustedSupplyNetworkService.activateSupplyPackage(
      state,
      authService.createMockUser("media_director"),
      state.mediaSupplyPackages[0].id
    );
    expect(activated.guard).toMatchObject({ allowed: true, reason_code: "SUPPLY_PACKAGE_ACTIVATED" });

    const recommendations = trustedSupplyNetworkService.getMatchRecommendations(
      activated.state,
      createInitialSalesWorkflowState()
    );
    expect(recommendations.length).toBeGreaterThan(0);
    expect(recommendations[0]).toMatchObject({ publisher_id: "publisher-233" });
    expect(recommendations[0].recommendation_reasons.length).toBeGreaterThan(2);
  });

  it("blocks activation when quality monitoring finds an active diagnostic blocker", () => {
    let state = createInitialMediaWorkflowState();
    state = trustedSupplyNetworkService.evaluatePublisher(
      state,
      authService.createMockUser("media_manager"),
      "publisher-lofter"
    ).state;
    const profile = state.mediaTrustProfiles.find((item) => item.publisher_id === "publisher-lofter");
    state = {
      ...state,
      mediaTrustProfiles: state.mediaTrustProfiles.map((item) =>
        item.publisher_id === "publisher-lofter" ? { ...item, confirmed_pool: "test", status: "confirmed" } : item
      ),
      mediaSupplyPackages: [
        {
          id: "package-risk",
          publisher_id: "publisher-lofter",
          package_name: "Risk package",
          status: "draft",
          pool: "test",
          ad_formats: ["Display"],
          placement_types: ["Feed"],
          geo: "CN",
          inventory_scale: 1000,
          advertiser_fit_tags: [],
          risk_notes: profile?.risk_warnings ?? [],
          owner_role: "media_manager",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };

    expect(trustedSupplyNetworkService.getQualitySnapshot(state, "publisher-lofter").status).toBe("at_risk");
    expect(
      trustedSupplyNetworkService.activateSupplyPackage(
        state,
        authService.createMockUser("media_director"),
        "package-risk"
      ).guard
    ).toMatchObject({ allowed: false, reason_code: "SUPPLY_PACKAGE_QUALITY_BLOCKED" });
  });
});
