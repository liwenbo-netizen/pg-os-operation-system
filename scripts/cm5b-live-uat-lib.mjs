export const cm5bTransitions = [
  {
    fromStatus: "candidate",
    toStatus: "readiness_started",
    method: "startCandidateReadiness",
    action: "china_media_ecosystem.readiness.start",
    eventCode: "china_media_ecosystem.readiness_started",
    reasonCode: "TRUSTED_SUPPLY_READINESS_STARTED",
    label: "Start onboarding readiness"
  },
  {
    fromStatus: "readiness_started",
    toStatus: "technical_review_passed",
    method: "completeCandidateTechnicalReview",
    action: "china_media_ecosystem.technical_review.complete",
    eventCode: "china_media_ecosystem.technical_review_passed",
    reasonCode: "TECHNICAL_REVIEW_PASSED",
    label: "Complete technical review"
  },
  {
    fromStatus: "technical_review_passed",
    toStatus: "onboarding_ready",
    method: "completeCandidateCommercialReview",
    action: "china_media_ecosystem.commercial_review.complete",
    eventCode: "china_media_ecosystem.onboarding_ready",
    reasonCode: "TRUSTED_SUPPLY_ONBOARDING_READY",
    label: "Complete commercial review"
  },
  {
    fromStatus: "onboarding_ready",
    toStatus: "onboarding_project_created",
    method: "createOnboardingProject",
    action: "china_media_ecosystem.onboarding_project.create",
    eventCode: "china_media_ecosystem.onboarding_project_created",
    reasonCode: "ONBOARDING_PROJECT_CREATED",
    label: "Create Publisher 360 onboarding project"
  }
];

const statusOrder = new Map([
  ["candidate", 0],
  ["readiness_started", 1],
  ["technical_review_passed", 2],
  ["onboarding_ready", 3],
  ["onboarding_project_created", 4]
]);

export function validateCm5bGate(candidate, lead) {
  const failures = [];

  if (!candidate) {
    failures.push("Trusted supply candidate is missing.");
  }
  if (!lead) {
    failures.push("Linked media ecosystem opportunity is missing.");
    return failures;
  }
  if (lead.data_quality_level === "SEED_ONLY") {
    failures.push("Seed-only opportunities cannot enter onboarding readiness.");
  }
  if (Number(lead.priority_score) < 70) {
    failures.push("Priority score must be at least 70.");
  }
  if (!lead.media_contact_confirmed) {
    failures.push("Media contact is not confirmed.");
  }
  if (!lead.business_interest_confirmed) {
    failures.push("Business interest is not confirmed.");
  }
  if (!lead.ad_inventory_identified) {
    failures.push("Ad inventory is not identified.");
  }
  if (lead.integration_feasibility === "impossible") {
    failures.push("Integration feasibility is impossible.");
  }
  if (!lead.media_director_approved_at) {
    failures.push("Media Director approval is missing.");
  }

  return failures;
}

export function buildCm5bExecutionPlan(candidate) {
  if (!candidate) {
    throw new Error("No trusted supply candidate is available.");
  }
  if (candidate.status === "rejected") {
    throw new Error("Rejected candidates cannot run CM-5B readiness.");
  }

  const statusIndex = statusOrder.get(candidate.status);
  if (statusIndex === undefined) {
    throw new Error(`Unsupported trusted supply candidate status: ${candidate.status}`);
  }

  return cm5bTransitions.slice(statusIndex);
}

export function selectCm5bCandidate(candidates, leads) {
  const leadIds = new Set(leads.map((lead) => lead.id));
  const eligible = candidates
    .filter((candidate) => candidate.status !== "rejected" && leadIds.has(candidate.lead_id))
    .sort((left, right) => {
      const leftRank = statusOrder.get(left.status) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = statusOrder.get(right.status) ?? Number.MAX_SAFE_INTEGER;
      return leftRank - rightRank || String(left.created_at).localeCompare(String(right.created_at));
    });

  return eligible[0];
}

export function summarizeCm5bPlan(candidate, plan) {
  return {
    candidateId: candidate.id,
    mediaName: candidate.media_name,
    currentStatus: candidate.status,
    finalStatus: "onboarding_project_created",
    alreadyComplete: plan.length === 0,
    steps: plan.map((step) => ({
      label: step.label,
      action: step.action,
      fromStatus: step.fromStatus,
      toStatus: step.toStatus
    }))
  };
}

export function buildCm5bAuditRecoveryPlan(auditRows, businessRows) {
  const existingActions = new Set(auditRows.map((row) => row.action));
  const businessByCode = new Map(businessRows.map((row) => [row.event_code, row]));

  return cm5bTransitions
    .filter((step) => !existingActions.has(step.action))
    .map((step) => ({
      ...step,
      businessEvent: businessByCode.get(step.eventCode)
    }));
}
