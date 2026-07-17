export const cm5dEvidenceTypes = ["connection_config", "test_request", "callback_log", "production_log"];

export const cm5dAuditRequirements = {
  startAction: "integration.execution.start",
  startEvent: "integration.execution_started",
  blockerAction: "integration.blocker.set",
  blockerEvent: "integration.blocked",
  resolveAction: "integration.blocker.resolve",
  resolveEvent: "integration.blocker_resolved",
  evidenceAction: "integration.evidence.record",
  evidenceEvent: "integration.evidence_recorded",
  readinessAction: "publisher.technical_live.submit",
  readinessEvent: "publisher.technical_live_passed",
  routeAction: "route.visit"
};

export function selectCm5dTarget(candidates, projects, publishers) {
  const publishersById = new Map(publishers.map((publisher) => [publisher.id, publisher]));
  const candidatesByPublisher = new Map(
    candidates
      .filter((candidate) => candidate.status === "onboarding_project_created" && candidate.publisher_id)
      .map((candidate) => [candidate.publisher_id, candidate])
  );

  return projects
    .filter(
      (project) =>
        project.status !== "technical_live_passed" &&
        publishersById.has(project.publisher_id) &&
        candidatesByPublisher.has(project.publisher_id)
    )
    .sort((left, right) => {
      const leftEvidence = left.evidence?.length ?? 0;
      const rightEvidence = right.evidence?.length ?? 0;
      return leftEvidence - rightEvidence || String(left.created_at ?? "").localeCompare(String(right.created_at ?? ""));
    })
    .map((project) => ({
      project,
      publisher: publishersById.get(project.publisher_id),
      candidate: candidatesByPublisher.get(project.publisher_id)
    }))[0];
}

export function buildCm5dPlan(target) {
  if (!target?.project || !target.publisher) {
    throw new Error("CM-5D requires an onboarding candidate with Publisher 360 and an integration project.");
  }

  const project = target.project;
  const existingEvidence = new Set((project.evidence ?? []).map((item) => item.evidence_type));
  const missingEvidence = cm5dEvidenceTypes.filter((type) => !existingEvidence.has(type));
  const active = ["in_integration", "technical_review"].includes(project.status);

  return {
    candidateId: target.candidate?.id,
    mediaName: target.candidate?.media_name ?? target.publisher.name,
    publisherId: target.publisher.id,
    integrationProjectId: project.id,
    projectStatus: project.status,
    existingBlocker: project.blocker,
    missingEvidence,
    steps: [
      { id: "resolve-existing-blocker", label: "Resolve existing blocker", execute: Boolean(project.blocker) },
      { id: "start-execution", label: "Start technical integration execution", execute: !active && !project.blocker },
      { id: "set-blocker", label: "Record a controlled UAT blocker", execute: true },
      { id: "resolve-blocker", label: "Resolve the controlled UAT blocker", execute: true },
      ...cm5dEvidenceTypes.map((evidenceType) => ({
        id: `evidence-${evidenceType}`,
        label: `Record ${evidenceType} evidence`,
        evidenceType,
        execute: missingEvidence.includes(evidenceType)
      })),
      { id: "submit-readiness", label: "Submit technical readiness", execute: true },
      { id: "verify-audit", label: "Verify CEO audit proof", execute: true },
      { id: "save-ledger", label: "Save CM-5D UAT ledger", execute: true }
    ]
  };
}

export function summarizeCm5dProof({ auditRows, businessRows, routeRows }) {
  const auditActions = new Set(auditRows.map((row) => row.action));
  const businessEvents = new Set(businessRows.map((row) => row.event_code));
  const evidenceAuditCount = auditRows.filter((row) => row.action === cm5dAuditRequirements.evidenceAction).length;
  const evidenceEventCount = businessRows.filter((row) => row.event_code === cm5dAuditRequirements.evidenceEvent).length;
  const requiredAuditActions = [
    cm5dAuditRequirements.startAction,
    cm5dAuditRequirements.blockerAction,
    cm5dAuditRequirements.resolveAction,
    cm5dAuditRequirements.evidenceAction,
    cm5dAuditRequirements.readinessAction
  ];
  const requiredBusinessEvents = [
    cm5dAuditRequirements.startEvent,
    cm5dAuditRequirements.blockerEvent,
    cm5dAuditRequirements.resolveEvent,
    cm5dAuditRequirements.evidenceEvent,
    cm5dAuditRequirements.readinessEvent
  ];
  const missing = [
    ...requiredAuditActions.filter((action) => !auditActions.has(action)).map((action) => `audit:${action}`),
    ...requiredBusinessEvents.filter((eventCode) => !businessEvents.has(eventCode)).map((eventCode) => `event:${eventCode}`),
    ...(evidenceAuditCount < cm5dEvidenceTypes.length ? [`audit:evidence-count-${evidenceAuditCount}`] : []),
    ...(evidenceEventCount < cm5dEvidenceTypes.length ? [`event:evidence-count-${evidenceEventCount}`] : []),
    ...(routeRows.length === 0 ? ["audit:route.visit"] : [])
  ];

  return {
    complete: missing.length === 0,
    missing,
    counts: {
      auditRows: auditRows.length,
      businessRows: businessRows.length,
      evidenceAudits: evidenceAuditCount,
      evidenceEvents: evidenceEventCount,
      routeVisits: routeRows.length
    }
  };
}
