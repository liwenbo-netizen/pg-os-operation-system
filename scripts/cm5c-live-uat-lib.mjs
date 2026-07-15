export const cm5cHandoffEvent = "Onboarding handoff confirmed.";

export const cm5cAuditRequirements = {
  handoffAction: "china_media_ecosystem.onboarding_handoff.create",
  handoffEvent: "china_media_ecosystem.onboarding_handoff_created",
  taskAction: "workbench.task.start",
  taskEvent: "workbench.task_started",
  routeAction: "route.visit"
};

export function selectCm5cCandidate(candidates, activities, integrationProjects) {
  const projectsByPublisher = new Map(integrationProjects.map((project) => [project.publisher_id, project]));
  const handoffLeadIds = new Set(
    activities.filter((activity) => activity.event === cm5cHandoffEvent).map((activity) => activity.lead_id)
  );

  return candidates
    .filter(
      (candidate) =>
        candidate.status === "onboarding_project_created" &&
        candidate.publisher_id &&
        projectsByPublisher.has(candidate.publisher_id)
    )
    .sort((left, right) => {
      const leftConfirmed = handoffLeadIds.has(left.lead_id) ? 1 : 0;
      const rightConfirmed = handoffLeadIds.has(right.lead_id) ? 1 : 0;
      return leftConfirmed - rightConfirmed || String(left.created_at).localeCompare(String(right.created_at));
    })[0];
}

export function buildCm5cPlan({ candidate, activities, integrationProject, persistedTask }) {
  if (!candidate || !integrationProject) {
    throw new Error("CM-5C requires a project-created candidate with an integration project.");
  }

  const handoffConfirmed = activities.some(
    (activity) => activity.lead_id === candidate.lead_id && activity.event === cm5cHandoffEvent
  );
  const taskAlreadyStarted = persistedTask?.status === "in_progress";

  return {
    candidateId: candidate.id,
    mediaName: candidate.media_name,
    publisherId: candidate.publisher_id,
    integrationProjectId: integrationProject.id,
    handoffConfirmed,
    taskAlreadyStarted,
    steps: [
      { id: "confirm-handoff", label: "Confirm onboarding handoff", execute: !handoffConfirmed },
      { id: "start-integration-task", label: "Start Integration Manager workbench task", execute: !taskAlreadyStarted },
      { id: "visit-integration-route", label: "Visit the bound Technical Integration Wizard route", execute: true },
      { id: "verify-audit-proof", label: "Verify CEO audit and business event proof", execute: true },
      { id: "save-uat-ledger", label: "Save CM-5C UAT Result History ledger", execute: true }
    ]
  };
}

export function summarizeCm5cProof({ handoffAudits, handoffEvents, taskAudits, taskEvents, routeAudits }) {
  const counts = {
    handoffAudits: handoffAudits.length,
    handoffEvents: handoffEvents.length,
    taskAudits: taskAudits.length,
    taskEvents: taskEvents.length,
    routeAudits: routeAudits.length
  };

  return {
    counts,
    complete: Object.values(counts).every((count) => count > 0),
    missing: Object.entries(counts)
      .filter(([, count]) => count === 0)
      .map(([name]) => name)
  };
}
