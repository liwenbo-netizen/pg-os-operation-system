import { describe, expect, it } from "vitest";
import {
  createPublisherOnboardingDraft,
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
});
