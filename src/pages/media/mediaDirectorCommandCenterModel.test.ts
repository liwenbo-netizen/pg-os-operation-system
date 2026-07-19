import { describe, expect, it } from "vitest";
import { getMediaDirectorDecision, getMediaDirectorReadinessSteps } from "./mediaDirectorCommandCenterModel";

describe("media director command center model", () => {
  it("offers one sequential approval action", () => {
    expect(getMediaDirectorDecision("not_allowed", 0)).toMatchObject({ target: "limited_sellable", action: "approveLimited" });
    expect(getMediaDirectorDecision("limited_sellable", 0)).toMatchObject({ target: "proposal_selectable", action: "approveProposal" });
    expect(getMediaDirectorDecision("proposal_selectable", 0)).toMatchObject({ target: "scale_ready", action: "approveScale" });
    expect(getMediaDirectorDecision("scale_ready", 0)).toMatchObject({ state: "complete", action: "monitor" });
  });

  it("blocks approval while readiness risks remain", () => {
    expect(getMediaDirectorDecision("proposal_selectable", 2)).toEqual({ state: "blocked", action: "resolveBlocker" });
    expect(getMediaDirectorReadinessSteps("proposal_selectable", 2)).toEqual([
      { key: "limited", state: "complete" },
      { key: "proposal", state: "complete" },
      { key: "scale", state: "blocked" }
    ]);
  });
});
