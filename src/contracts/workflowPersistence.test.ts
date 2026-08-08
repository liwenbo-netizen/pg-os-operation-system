import { describe, expect, it } from "vitest";
import {
  initialWorkflowState,
  workflowNodeStageRegistry,
  workflowStageNodeIsValid,
  type WorkflowNode
} from "./workflowPersistence";

describe("workflow persistence contract", () => {
  it("uses the V2.5 initial five-dimensional state", () => {
    expect(initialWorkflowState()).toEqual({
      lifecycleStage: "S0_MEDIA_LEAD",
      workflowNode: "S0_SCREENING",
      nodeStatus: "IN_PROGRESS",
      controlStatus: "ACTIVE",
      workflowVersion: 1
    });
  });

  it("enforces every registered node-stage invariant", () => {
    for (const node of Object.keys(workflowNodeStageRegistry) as WorkflowNode[]) {
      expect(workflowStageNodeIsValid(workflowNodeStageRegistry[node], node)).toBe(true);
    }
    expect(workflowStageNodeIsValid("S3_TECHNICAL_INTEGRATION", "S0_SCREENING")).toBe(false);
  });
});
