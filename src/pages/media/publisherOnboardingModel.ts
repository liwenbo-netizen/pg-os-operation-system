import type { PublisherOnboardingInput } from "../../services/mediaWorkflowService";
import { formatUtcPlus8Date } from "../../lib/time";
import type {
  IntegrationProject,
  Publisher,
  PublisherAdSlot,
  PublisherContact,
  PublisherContractTerm
} from "../../types/domain";

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

export function createPublisherOnboardingDraft(today = formatUtcPlus8Date()): PublisherOnboardingDraft {
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

export function createPublisherOnboardingDraftFromSnapshot(snapshot: {
  publisher?: Publisher;
  contacts: PublisherContact[];
  adSlots: PublisherAdSlot[];
  contractTerms: PublisherContractTerm[];
  integrationProjects: IntegrationProject[];
}): PublisherOnboardingDraft {
  const draft = createPublisherOnboardingDraft();
  const publisher = snapshot.publisher;
  if (!publisher) return draft;

  const contact = snapshot.contacts.find((item) => item.is_primary) ?? snapshot.contacts[0];
  const slot = snapshot.adSlots[0];
  const term = snapshot.contractTerms[0];
  const project = snapshot.integrationProjects[0];

  return {
    ...draft,
    name: publisher.name,
    legalEntity: publisher.legal_entity ?? "",
    region: publisher.region ?? draft.region,
    mediaType: publisher.media_type ?? draft.mediaType,
    propertyName: publisher.metadata?.property_name ?? "",
    propertyIdentifierType: publisher.metadata?.property_identifier_type ?? draft.propertyIdentifierType,
    propertyIdentifier: publisher.metadata?.property_identifier ?? "",
    integrationType: project?.integration_type ?? publisher.integration_type ?? draft.integrationType,
    dailyActiveUsers: publisher.daily_active_users === undefined ? "" : String(publisher.daily_active_users),
    monthlyActiveUsers:
      publisher.metadata?.monthly_active_users === undefined ? "" : String(publisher.metadata.monthly_active_users),
    dailyRequests: publisher.daily_requests === undefined ? "" : String(publisher.daily_requests),
    trafficDataAsOf: publisher.metadata?.traffic_data_as_of ?? draft.trafficDataAsOf,
    trafficSource: publisher.metadata?.traffic_source ?? draft.trafficSource,
    slotName: slot?.slot_name ?? "",
    adFormat: slot?.ad_format ?? draft.adFormat,
    placementType: slot?.placement_type ?? draft.placementType,
    creativeSpec: slot?.creative_spec ?? "",
    slotDailyRequests: slot?.daily_requests === undefined ? "" : String(slot.daily_requests),
    floorPrice: slot?.floor_price === undefined ? "" : String(slot.floor_price),
    currency: slot?.currency ?? term?.currency ?? draft.currency,
    contactName: contact?.name ?? "",
    contactRoleTitle: contact?.role_title ?? draft.contactRoleTitle,
    contactEmail: contact?.email ?? "",
    contactPhone: contact?.phone ?? "",
    contractType: term?.contract_type ?? draft.contractType,
    billingModel: term?.billing_model ?? draft.billingModel,
    settlementCycle: term?.settlement_cycle ?? draft.settlementCycle,
    paymentTerms: term?.payment_terms ?? draft.paymentTerms,
    revenueSharePercent: term?.revenue_share === undefined ? "" : String(term.revenue_share * 100)
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
