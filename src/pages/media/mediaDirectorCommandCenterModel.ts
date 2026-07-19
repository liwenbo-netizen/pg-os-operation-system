import type { Publisher } from "../../types/domain";
import type { BusinessStageState } from "../../components/BusinessStagePath";

export type MediaDirectorApprovalTarget = "limited_sellable" | "proposal_selectable" | "scale_ready";

export type MediaDirectorDecision = {
  target?: MediaDirectorApprovalTarget;
  state: BusinessStageState;
  action: "approveLimited" | "approveProposal" | "approveScale" | "resolveBlocker" | "monitor";
};

export function getMediaDirectorDecision(
  status: Publisher["sales_scale_status"],
  blockerCount: number
): MediaDirectorDecision {
  if (blockerCount > 0 || status === "scale_blocked" || status === "paused") {
    return { state: "blocked", action: "resolveBlocker" };
  }

  if (status === "not_allowed") {
    return { target: "limited_sellable", state: "active", action: "approveLimited" };
  }
  if (status === "limited_sellable") {
    return { target: "proposal_selectable", state: "active", action: "approveProposal" };
  }
  if (status === "proposal_selectable") {
    return { target: "scale_ready", state: "active", action: "approveScale" };
  }

  return { state: "complete", action: "monitor" };
}

export function getMediaDirectorReadinessSteps(
  status: Publisher["sales_scale_status"],
  blockerCount: number
): Array<{ key: "limited" | "proposal" | "scale"; state: BusinessStageState }> {
  const blocked = blockerCount > 0 || status === "scale_blocked" || status === "paused";
  const limitedComplete = ["limited_sellable", "proposal_selectable", "scale_ready"].includes(status);
  const proposalComplete = ["proposal_selectable", "scale_ready"].includes(status);

  return [
    { key: "limited", state: limitedComplete ? "complete" : blocked ? "blocked" : "active" },
    { key: "proposal", state: proposalComplete ? "complete" : limitedComplete ? (blocked ? "blocked" : "active") : "pending" },
    { key: "scale", state: status === "scale_ready" ? "complete" : proposalComplete ? (blocked ? "blocked" : "active") : "pending" }
  ];
}
