import { describe, expect, it } from "vitest";
import { createInitialContractWorkflowState } from "../../services/contractService";
import { createInitialFinanceWorkflowState } from "../../services/financeSettlementService";
import { createInitialMediaWorkflowState } from "../../services/mediaWorkflowService";
import { createInitialSalesWorkflowState } from "../../services/salesWorkflowService";
import type { WorkbenchTask } from "../../types/domain";
import { getWorkbenchHandoffContext, getWorkbenchModuleSummaries } from "./workbenchHandoffModel";

const input = {
  mediaState: createInitialMediaWorkflowState(),
  salesState: createInitialSalesWorkflowState(),
  financeState: createInitialFinanceWorkflowState(),
  contractState: createInitialContractWorkflowState()
};

function task(patch: Partial<WorkbenchTask>): WorkbenchTask {
  return {
    id: "task-test",
    title: "Test task",
    module: "Sales",
    owner_role: "sales_manager",
    related_route: "/workbench",
    priority: "P1",
    status: "open",
    next_action: "Continue.",
    ...patch
  };
}

describe("workbench handoff model", () => {
  it("connects a proposal to advertiser, opportunity, campaign and settlement", () => {
    const context = getWorkbenchHandoffContext(
      task({
        source_object_type: "proposal",
        source_object_id: "proposal-daily-yoga",
        related_route: "/proposals/:id/wizard"
      }),
      input
    );

    expect(context.upstream.map((item) => item.kind)).toEqual(["advertiser", "opportunity"]);
    expect(context.current).toMatchObject({ kind: "proposal", label: "Daily Yoga Q3 Proposal" });
    expect(context.downstream.map((item) => item.kind)).toEqual(["campaign", "settlement"]);
  });

  it("connects a settlement to campaign, publisher and side-letter contract", () => {
    const context = getWorkbenchHandoffContext(
      task({
        module: "Finance",
        source_object_type: "settlement",
        source_object_id: "settlement-disputed",
        related_route: "/finance/settlements/:id"
      }),
      input
    );

    expect(context.upstream.map((item) => item.kind)).toEqual(["proposal", "campaign", "publisher"]);
    expect(context.downstream).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "contract", label: "CON-003" })])
    );
  });

  it("summarizes executive work by active module", () => {
    const summaries = getWorkbenchModuleSummaries([
      task({ id: "sales-p0", module: "Sales", priority: "P0" }),
      task({ id: "sales-blocked", module: "Sales", status: "blocked" }),
      task({ id: "finance", module: "Finance", owner_role: "finance_manager" }),
      task({ id: "done", module: "Contracts", status: "done" })
    ]);

    expect(summaries).toEqual([
      expect.objectContaining({ module: "Sales", total: 2, p0: 1, blocked: 1 }),
      expect.objectContaining({ module: "Finance", total: 1, p0: 0, blocked: 0 })
    ]);
  });

  it("keeps China ecosystem work bound to the lead and onboarding chain", () => {
    const context = getWorkbenchHandoffContext(
      task({
        module: "Media",
        source_object_type: "media_ecosystem_lead",
        source_object_id: "ecosystem-lead-redbook",
        related_route: "/media/china-ecosystem"
      }),
      input
    );

    expect(context.current).toMatchObject({ kind: "ecosystemLead", label: "RedBook Lifestyle Community" });
  });
});
