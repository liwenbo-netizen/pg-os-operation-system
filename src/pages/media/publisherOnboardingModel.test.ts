import { describe, expect, it } from "vitest";
import {
  createPublisherOnboardingDraft,
  createPublisherOnboardingDraftFromSnapshot,
  toPublisherOnboardingInput,
  validatePublisherOnboarding,
  validatePublisherOnboardingStep
} from "./publisherOnboardingModel";

function completeDraft() {
  return {
    ...createPublisherOnboardingDraft("2026-07-19"),
    name: "Example Media Group",
    legalEntity: "Example Media Technology Co., Ltd.",
    propertyName: "Example Video",
    propertyIdentifier: "com.example.video",
    dailyActiveUsers: "1200000",
    monthlyActiveUsers: "8000000",
    dailyRequests: "9000000",
    slotName: "Home Feed Native",
    slotDailyRequests: "3000000",
    floorPrice: "12.5",
    creativeSpec: "1200x627",
    contactName: "Li Ming",
    contactEmail: "li.ming@example.com",
    revenueSharePercent: "65"
  };
}

describe("publisher onboarding model", () => {
  it("validates required commercial onboarding data by step", () => {
    const draft = createPublisherOnboardingDraft("2026-07-19");

    expect(validatePublisherOnboardingStep(draft, "identity")).toMatchObject({
      name: "required",
      legalEntity: "required",
      propertyName: "required",
      propertyIdentifier: "required"
    });
    expect(validatePublisherOnboarding(draft)).toMatchObject({
      dailyActiveUsers: "required",
      dailyRequests: "required",
      slotName: "required",
      slotDailyRequests: "required",
      contactName: "required"
    });
  });

  it("converts the wizard draft into the existing media workflow contract", () => {
    const input = toPublisherOnboardingInput(completeDraft());

    expect(validatePublisherOnboarding(completeDraft())).toEqual({});
    expect(input).toMatchObject({
      publisher: {
        name: "Example Media Group",
        propertyIdentifier: "com.example.video",
        dailyActiveUsers: 1200000,
        monthlyActiveUsers: 8000000,
        dailyRequests: 9000000
      },
      adSlot: {
        slotName: "Home Feed Native",
        dailyRequests: 3000000,
        floorPrice: 12.5,
        creativeSpec: "1200x627"
      },
      contractTerm: { revenueShare: 0.65 }
    });
  });

  it("hydrates the edit wizard from an existing Publisher 360 snapshot", () => {
    const draft = createPublisherOnboardingDraftFromSnapshot({
      publisher: {
        id: "publisher-1",
        name: "Existing Publisher",
        legal_entity: "Existing Media Co., Ltd.",
        region: "CN",
        media_type: "App",
        integration_type: "SDK",
        technical_live_status: "pending_integration",
        commercial_test_status: "not_started",
        sales_scale_status: "not_allowed",
        risk_level: "medium",
        daily_active_users: 250000,
        daily_requests: 1400000,
        metadata: {
          property_name: "Existing News",
          property_identifier_type: "android_package",
          property_identifier: "com.example.existing",
          monthly_active_users: 1600000,
          traffic_data_as_of: "2026-07-20",
          traffic_source: "mmp_report"
        }
      },
      contacts: [
        {
          id: "contact-1",
          publisher_id: "publisher-1",
          name: "Chen Yu",
          role_title: "Monetization Director",
          email: "chen@example.com",
          is_primary: true
        }
      ],
      adSlots: [
        {
          id: "slot-1",
          publisher_id: "publisher-1",
          slot_name: "Home Feed",
          ad_format: "Native",
          placement_type: "Feed",
          daily_requests: 800000,
          floor_price: 9.5,
          currency: "CNY",
          creative_spec: "1200x627",
          status: "active"
        }
      ],
      contractTerms: [
        {
          id: "term-1",
          publisher_id: "publisher-1",
          contract_type: "Framework",
          billing_model: "CPM",
          settlement_cycle: "Monthly",
          payment_terms: "Net 45",
          revenue_share: 0.68,
          currency: "CNY"
        }
      ],
      integrationProjects: [
        {
          id: "integration-1",
          publisher_id: "publisher-1",
          integration_type: "OpenRTB",
          status: "pending_integration",
          checklist: {},
          notes: "Pending"
        }
      ]
    });

    expect(draft).toMatchObject({
      name: "Existing Publisher",
      propertyIdentifier: "com.example.existing",
      integrationType: "OpenRTB",
      dailyActiveUsers: "250000",
      contactName: "Chen Yu",
      slotName: "Home Feed",
      paymentTerms: "Net 45",
      revenueSharePercent: "68"
    });
    expect(validatePublisherOnboarding(draft)).toEqual({});
  });
});
