import { describe, expect, it } from "vitest";
import { createInitialContractWorkflowState } from "./contractService";
import { createInitialMediaWorkflowState } from "./mediaWorkflowService";
import { mediaOnboardingLifecycleService } from "./mediaOnboardingLifecycleService";

describe("mediaOnboardingLifecycleService", () => {
  it("derives the lifecycle from existing lead, publisher, integration, commercial, and contract facts", () => {
    const mediaState = createInitialMediaWorkflowState();
    const contracts = createInitialContractWorkflowState().contracts;
    const cases = mediaOnboardingLifecycleService.getCases({ mediaState, contracts });

    expect(cases).toHaveLength(mediaState.mediaEcosystemLeads.length + mediaState.publishers.length);
    expect(cases.find((item) => item.mediaName === "RedBook Lifestyle Community")).toMatchObject({
      stage: "COMMERCIAL_AGREEMENT",
      status: "ready"
    });
    expect(cases.find((item) => item.mediaName === "New CTV Partner")).toMatchObject({
      stage: "SDK_INTEGRATION",
      status: "blocked"
    });
    expect(cases.find((item) => item.mediaName === "QuZhi Campus")).toMatchObject({
      stage: "PILOT",
      status: "blocked"
    });
    expect(cases.find((item) => item.mediaName === "LOFTER")).toMatchObject({
      stage: "PRODUCTION_LAUNCH",
      status: "blocked",
      blockers: ["1 blocking quality case(s) remain open."]
    });
  });

  it("uses explicit links to merge ecosystem, candidate, and Publisher 360 into one lifecycle case", () => {
    let mediaState = createInitialMediaWorkflowState();
    const lead = mediaState.mediaEcosystemLeads[0];
    const publisher = mediaState.publishers.find((item) => item.id === "publisher-new-ctv");
    if (!publisher) throw new Error("Fixture publisher missing");

    mediaState = {
      ...mediaState,
      mediaEcosystemLeads: mediaState.mediaEcosystemLeads.map((item) =>
        item.id === lead.id ? { ...item, linked_publisher_id: publisher.id } : item
      ),
      trustedSupplyCandidates: [
        {
          id: "candidate-linked-ctv",
          lead_id: lead.id,
          media_name: lead.media_name,
          track: lead.track,
          priority_score: lead.priority_score,
          status: "onboarding_project_created",
          owner_role: "media_manager",
          created_at: "2026-07-23T00:00:00.000Z",
          evaluation_notes: "Linked lifecycle proof.",
          publisher_id: publisher.id
        }
      ]
    };

    const cases = mediaOnboardingLifecycleService.getCases({
      mediaState,
      contracts: createInitialContractWorkflowState().contracts
    });
    const linked = cases.filter((item) => item.publisher?.id === publisher.id);

    expect(linked).toHaveLength(1);
    expect(linked[0]).toMatchObject({
      lead: { id: lead.id },
      candidate: { id: "candidate-linked-ctv" },
      stage: "SDK_INTEGRATION"
    });
  });

  it("only marks scale operation after signed agreement, scale readiness, and an active supply package", () => {
    const mediaState = createInitialMediaWorkflowState();
    const contracts = createInitialContractWorkflowState().contracts.map((contract) =>
      contract.publisher_id === "publisher-233" ? { ...contract, status: "signed" as const, signed_at: "2026-07-23T00:00:00.000Z" } : contract
    );
    const scaleState = {
      ...mediaState,
      mediaSupplyPackages: [
        {
          id: "package-233-active",
          publisher_id: "publisher-233",
          package_name: "Core native video",
          status: "active" as const,
          pool: "core" as const,
          ad_formats: ["Video"],
          placement_types: ["Feed"],
          geo: "CN",
          inventory_scale: 12000000,
          advertiser_fit_tags: ["wellness"],
          risk_notes: [],
          owner_role: "media_director" as const,
          created_at: "2026-07-23T00:00:00.000Z",
          updated_at: "2026-07-23T00:00:00.000Z",
          activated_at: "2026-07-23T00:00:00.000Z"
        }
      ]
    };

    const item = mediaOnboardingLifecycleService
      .getCases({ mediaState: scaleState, contracts })
      .find((entry) => entry.publisher?.id === "publisher-233");

    expect(item).toMatchObject({ stage: "SCALE_OPERATION", status: "operating" });
  });
});
