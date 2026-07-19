import type { PublisherOnboardingInput } from "../../services/mediaWorkflowService";

export type PublisherOnboardingStep = "identity" | "traffic" | "inventory" | "commercial";

export type PublisherOnboardingDraft = {
  name: string;
  legalEntity: string;
  region: string;
  mediaType: string;
  propertyName: string;
  propertyIdentifierType: string;
  propertyIdentifier: string;
  integrationType: string;
  dailyActiveUsers: string;
  monthlyActiveUsers: string;
  dailyRequests: string;
  trafficDataAsOf: string;
  trafficSource: string;
  slotName: string;
  adFormat: string;
  placementType: string;
  creativeSpec: string;
  slotDailyRequests: string;
  floorPrice: string;
  currency: string;
  contactName: string;
  contactRoleTitle: string;
  contactEmail: string;
  contactPhone: string;
  contractType: string;
  billingModel: string;
  settlementCycle: string;
  paymentTerms: string;
  revenueSharePercent: string;
};

export type PublisherOnboardingField = keyof PublisherOnboardingDraft;
export type PublisherOnboardingErrors = Partial<Record<PublisherOnboardingField, "required" | "positive" | "email" | "percentage">>;

export const publisherOnboardingSteps: PublisherOnboardingStep[] = ["identity", "traffic", "inventory", "commercial"];

export function createPublisherOnboardingDraft(today = new Date().toISOString().slice(0, 10)): PublisherOnboardingDraft {
  return {
    name: "",
    legalEntity: "",
    region: "CN",
    mediaType: "App",
    propertyName: "",
    propertyIdentifierType: "android_package",
    propertyIdentifier: "",
    integrationType: "SDK",
    dailyActiveUsers: "",
    monthlyActiveUsers: "",
    dailyRequests: "",
    trafficDataAsOf: today,
    trafficSource: "first_party_analytics",
    slotName: "",
    adFormat: "Native",
    placementType: "Feed",
    creativeSpec: "",
    slotDailyRequests: "",
    floorPrice: "",
    currency: "CNY",
    contactName: "",
    contactRoleTitle: "Business Development",
    contactEmail: "",
    contactPhone: "",
    contractType: "Framework",
    billingModel: "CPM",
    settlementCycle: "Monthly",
    paymentTerms: "Net 30",
    revenueSharePercent: ""
  };
}

function isBlank(value: string) {
  return value.trim().length === 0;
}

function isPositive(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

export function validatePublisherOnboardingStep(
  draft: PublisherOnboardingDraft,
  step: PublisherOnboardingStep
): PublisherOnboardingErrors {
  const errors: PublisherOnboardingErrors = {};

  if (step === "identity") {
    for (const field of ["name", "legalEntity", "propertyName", "propertyIdentifier"] as const) {
      if (isBlank(draft[field])) errors[field] = "required";
    }
  }

  if (step === "traffic") {
    for (const field of ["dailyActiveUsers", "dailyRequests"] as const) {
      if (isBlank(draft[field])) errors[field] = "required";
      else if (!isPositive(draft[field])) errors[field] = "positive";
    }
    if (!isBlank(draft.monthlyActiveUsers) && !isPositive(draft.monthlyActiveUsers)) {
      errors.monthlyActiveUsers = "positive";
    }
    if (isBlank(draft.trafficDataAsOf)) errors.trafficDataAsOf = "required";
  }

  if (step === "inventory") {
    for (const field of ["slotName", "slotDailyRequests"] as const) {
      if (isBlank(draft[field])) errors[field] = "required";
      else if (field === "slotDailyRequests" && !isPositive(draft[field])) errors[field] = "positive";
    }
    if (!isBlank(draft.floorPrice) && Number(draft.floorPrice) < 0) errors.floorPrice = "positive";
  }

  if (step === "commercial") {
    for (const field of ["contactName", "contactRoleTitle", "billingModel", "settlementCycle", "paymentTerms"] as const) {
      if (isBlank(draft[field])) errors[field] = "required";
    }
    if (!isBlank(draft.contactEmail) && !/^\S+@\S+\.\S+$/.test(draft.contactEmail)) {
      errors.contactEmail = "email";
    }
    if (!isBlank(draft.revenueSharePercent)) {
      const share = Number(draft.revenueSharePercent);
      if (!Number.isFinite(share) || share < 0 || share > 100) errors.revenueSharePercent = "percentage";
    }
  }

  return errors;
}

export function validatePublisherOnboarding(draft: PublisherOnboardingDraft) {
  return publisherOnboardingSteps.reduce<PublisherOnboardingErrors>(
    (allErrors, step) => ({ ...allErrors, ...validatePublisherOnboardingStep(draft, step) }),
    {}
  );
}

function optionalNumber(value: string) {
  return isBlank(value) ? undefined : Number(value);
}

function optionalText(value: string) {
  return isBlank(value) ? undefined : value.trim();
}

export function toPublisherOnboardingInput(draft: PublisherOnboardingDraft): PublisherOnboardingInput {
  return {
    publisher: {
      name: draft.name.trim(),
      legalEntity: draft.legalEntity.trim(),
      region: draft.region,
      mediaType: draft.mediaType,
      propertyName: draft.propertyName.trim(),
      propertyIdentifierType: draft.propertyIdentifierType,
      propertyIdentifier: draft.propertyIdentifier.trim(),
      integrationType: draft.integrationType,
      dailyActiveUsers: Number(draft.dailyActiveUsers),
      monthlyActiveUsers: optionalNumber(draft.monthlyActiveUsers),
      dailyRequests: Number(draft.dailyRequests),
      trafficDataAsOf: draft.trafficDataAsOf,
      trafficSource: draft.trafficSource
    },
    contact: {
      name: draft.contactName.trim(),
      roleTitle: draft.contactRoleTitle.trim(),
      email: optionalText(draft.contactEmail),
      phone: optionalText(draft.contactPhone)
    },
    adSlot: {
      slotName: draft.slotName.trim(),
      adFormat: draft.adFormat,
      placementType: draft.placementType,
      creativeSpec: optionalText(draft.creativeSpec),
      dailyRequests: Number(draft.slotDailyRequests),
      floorPrice: optionalNumber(draft.floorPrice),
      currency: draft.currency
    },
    contractTerm: {
      contractType: draft.contractType,
      billingModel: draft.billingModel,
      settlementCycle: draft.settlementCycle,
      paymentTerms: draft.paymentTerms,
      revenueShare: optionalNumber(draft.revenueSharePercent) === undefined ? undefined : Number(draft.revenueSharePercent) / 100,
      currency: draft.currency
    }
  };
}
