import { describe, expect, it } from "vitest";
import type { MediaSupplyPackage, MediaTrustProfile, Publisher } from "../../types/domain";
import {
  getPublisherPrimaryAction,
  getPublisherReadinessSteps,
  getPublisherStatusLabel
} from "./publisherReadinessPageModel";

const publisher: Publisher = {
  id: "publisher-1",
  name: "Demo Publisher",
  legal_entity: "Demo Media Co., Ltd.",
  daily_active_users: 100000,
  daily_requests: 500000,
  metadata: {
    property_name: "Demo App",
    property_identifier_type: "android_package",
    property_identifier: "com.example.demo"
  },
  technical_live_status: "pending_integration",
  commercial_test_status: "not_started",
  sales_scale_status: "not_allowed",
  risk_level: "medium"
};

const contacts = [
  {
    id: "contact-1",
    publisher_id: publisher.id,
    name: "Li Ming",
    role_title: "BD",
    is_primary: true
  }
];

const profile: MediaTrustProfile = {
  id: "profile-1",
  publisher_id: publisher.id,
  status: "evaluated",
  total_score: 78,
  trust_level: "A",
  score_breakdown: {
    profile_completeness: 10,
    authorization: 15,
    technical: 15,
    context_signals: 8,
    quality_ivt: 14,
    transparency: 8,
    commercial: 6,
    advertiser_fit: 5,
    delivery: 3,
    risk_deduction: 6
  },
  suggested_pool: "core",
  advertiser_fit_tags: [],
  recommendation_reasons: [],
  risk_warnings: [],
  owner_role: "media_director",
  next_action: "Confirm pool",
  evaluated_at: "2026-07-19T00:00:00Z"
};

const activePackage: MediaSupplyPackage = {
  id: "package-1",
  publisher_id: publisher.id,
  package_name: "Core supply",
  status: "active",
  pool: "core",
  ad_formats: ["Video"],
  placement_types: ["In-app"],
  geo: "CN",
  inventory_scale: 100000,
  advertiser_fit_tags: [],
  risk_notes: [],
  owner_role: "media_manager",
  created_at: "2026-07-19T00:00:00Z",
  updated_at: "2026-07-19T00:00:00Z"
};

describe("publisher readiness page model", () => {
  it("recommends readiness actions in business order", () => {
    expect(getPublisherPrimaryAction({ publisher, contacts: [], adSlots: [], contractTerms: [], packages: [] })).toBe("editProfile");
    expect(getPublisherPrimaryAction({ publisher, contacts, adSlots: [], contractTerms: [], packages: [] })).toBe("addSlot");
    expect(
      getPublisherPrimaryAction({
        publisher,
        contacts,
        adSlots: [{ id: "slot-1", publisher_id: publisher.id, slot_name: "Feed", ad_format: "Display", placement_type: "Feed", status: "active" }],
        contractTerms: [],
        packages: []
      })
    ).toBe("addTerm");
  });

  it("continues from technical and commercial readiness into trusted supply", () => {
    const base = {
      publisher: { ...publisher, technical_live_status: "technical_live_passed" as const, commercial_test_status: "test_passed" as const },
      contacts,
      adSlots: [{ id: "slot-1", publisher_id: publisher.id, slot_name: "Feed", ad_format: "Display", placement_type: "Feed", status: "active" as const }],
      contractTerms: [{ id: "term-1", publisher_id: publisher.id, contract_type: "Framework", billing_model: "CPM", settlement_cycle: "Monthly", payment_terms: "Net 30" }],
      packages: [] as MediaSupplyPackage[]
    };

    expect(getPublisherPrimaryAction(base)).toBe("evaluateTrust");
    expect(getPublisherPrimaryAction({ ...base, trustProfile: profile })).toBe("confirmPool");
    expect(getPublisherPrimaryAction({ ...base, trustProfile: { ...profile, confirmed_pool: "core" } })).toBe("createPackage");
    expect(getPublisherPrimaryAction({ ...base, trustProfile: { ...profile, confirmed_pool: "core" }, packages: [activePackage] })).toBeUndefined();
  });

  it("summarizes blocked and complete readiness steps", () => {
    const steps = getPublisherReadinessSteps({
      publisher: { ...publisher, technical_live_status: "technical_blocked", commercial_test_status: "test_failed" },
      contacts: [],
      adSlots: [],
      contractTerms: [],
      trustProfile: profile,
      packages: []
    });

    expect(steps.map((step) => step.state)).toEqual(["active", "blocked", "blocked", "active", "pending"]);
    expect(getPublisherStatusLabel("technical_live_passed", "zh-CN")).toBe("技术上线已通过");
  });

  it("requires governed identity, traffic, contact, inventory, and terms for profile completion", () => {
    const completePublisher: Publisher = { ...publisher };
    const adSlots = [
      {
        id: "slot-1",
        publisher_id: publisher.id,
        slot_name: "Feed",
        ad_format: "Display",
        placement_type: "Feed",
        status: "active" as const
      }
    ];
    const contractTerms = [
      {
        id: "term-1",
        publisher_id: publisher.id,
        contract_type: "Framework",
        billing_model: "CPM",
        settlement_cycle: "Monthly",
        payment_terms: "Net 30"
      }
    ];

    expect(
      getPublisherReadinessSteps({
        publisher: completePublisher,
        contacts: [],
        adSlots,
        contractTerms,
        packages: []
      })[0].state
    ).toBe("active");
    expect(
      getPublisherReadinessSteps({
        publisher: completePublisher,
        contacts,
        adSlots,
        contractTerms,
        packages: []
      })[0].state
    ).toBe("complete");
  });
});
