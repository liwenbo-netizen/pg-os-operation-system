export const workflowLifecycleStages = [
  "S0_MEDIA_LEAD",
  "S1_MEDIA_CANDIDATE",
  "S2_BUSINESS_FOLLOW_UP",
  "S3_TECHNICAL_INTEGRATION",
  "S4_GRAY_TEST",
  "S5_COMMERCIAL_READY"
] as const;

export const workflowNodeStatuses = [
  "READY",
  "IN_PROGRESS",
  "BLOCKED",
  "FAILED",
  "PASSED",
  "CANCELLED"
] as const;

export const workflowControlStatuses = [
  "ACTIVE",
  "ON_HOLD",
  "SUSPENDED",
  "CLOSED",
  "TERMINATED"
] as const;

export const workflowMilestones = [
  "M0_MEDIA_CONFIRMED",
  "M1_BUSINESS_QUALIFIED",
  "M2_TECH_PRE_ASSESSED",
  "M3_ENGINEERING_APPROVED",
  "M4_HANDOVER_ACCEPTED",
  "M5_TECHNICALLY_CERTIFIED",
  "M6_PRODUCTION_RELEASE_CERTIFIED",
  "M7_G3_PASSED",
  "M8_COMMERCIAL_READY",
  "M9_SCALE_READY",
  "M10_STABLE_SCALED"
] as const;

export const workflowNodeStageRegistry = {
  S0_SCREENING: "S0_MEDIA_LEAD",
  S1_FIRST_CONTACT: "S1_MEDIA_CANDIDATE",
  S1_INFORMATION_COLLECTION: "S1_MEDIA_CANDIDATE",
  S1_INTERNAL_EVALUATION: "S1_MEDIA_CANDIDATE",
  S2_TECH_PREASSESSMENT: "S2_BUSINESS_FOLLOW_UP",
  S2_ENGINEERING_RESOURCE_REVIEW: "S2_BUSINESS_FOLLOW_UP",
  S2_HANDOVER_PREPARATION: "S2_BUSINESS_FOLLOW_UP",
  S2_HANDOVER_REVIEW: "S2_BUSINESS_FOLLOW_UP",
  S3_T0_SCOPE_LOCK: "S3_TECHNICAL_INTEGRATION",
  S3_T1_ENVIRONMENT: "S3_TECHNICAL_INTEGRATION",
  S3_T2_PROTOCOL: "S3_TECHNICAL_INTEGRATION",
  S3_T3_AD_CHAIN: "S3_TECHNICAL_INTEGRATION",
  S3_T4_IVT_PRIVACY: "S3_TECHNICAL_INTEGRATION",
  S3_T5_DATA_RECONCILIATION: "S3_TECHNICAL_INTEGRATION",
  S3_G0_SANDBOX: "S3_TECHNICAL_INTEGRATION",
  S3_TECH_CERT_REVIEW: "S3_TECHNICAL_INTEGRATION",
  S3_T6_PRODUCTION_RELEASE: "S3_TECHNICAL_INTEGRATION",
  S3_PRODUCTION_VALIDATION: "S3_TECHNICAL_INTEGRATION",
  S4_G1_PRODUCTION_SHADOW: "S4_GRAY_TEST",
  S4_G2_LIMITED_TRAFFIC: "S4_GRAY_TEST",
  S4_G3_LIMITED_BUDGET: "S4_GRAY_TEST",
  S4_COMMERCIAL_READY_REVIEW: "S4_GRAY_TEST",
  S5_LIMITED_ACTIVATION: "S5_COMMERCIAL_READY",
  S5_LIMITED_SELLABLE: "S5_COMMERCIAL_READY",
  S5_G4_CONTROLLED_RAMP: "S5_COMMERCIAL_READY",
  S5_G5_SCALE_QUALIFICATION: "S5_COMMERCIAL_READY",
  S5_SCALE_REVIEW: "S5_COMMERCIAL_READY",
  S5_SCALE_READY: "S5_COMMERCIAL_READY",
  S5_ACTIVE_SCALED: "S5_COMMERCIAL_READY"
} as const;

export type WorkflowLifecycleStage = typeof workflowLifecycleStages[number];
export type WorkflowNode = keyof typeof workflowNodeStageRegistry;
export type WorkflowNodeStatus = typeof workflowNodeStatuses[number];
export type WorkflowControlStatus = typeof workflowControlStatuses[number];
export type WorkflowMilestone = typeof workflowMilestones[number];

export type WorkflowStateVector = {
  lifecycleStage: WorkflowLifecycleStage;
  workflowNode: WorkflowNode;
  nodeStatus: WorkflowNodeStatus;
  controlStatus: WorkflowControlStatus;
  milestoneCode?: WorkflowMilestone;
  workflowVersion: number;
};

export function workflowStageNodeIsValid(stage: WorkflowLifecycleStage, node: WorkflowNode) {
  return workflowNodeStageRegistry[node] === stage;
}

export function initialWorkflowState(): WorkflowStateVector {
  return {
    lifecycleStage: "S0_MEDIA_LEAD",
    workflowNode: "S0_SCREENING",
    nodeStatus: "IN_PROGRESS",
    controlStatus: "ACTIVE",
    workflowVersion: 1
  };
}
