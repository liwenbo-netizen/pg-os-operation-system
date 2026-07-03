import type { EntityId, SalesWorkflowState } from "../../types/domain";

export function resolveCreateOpportunityAdvertiserId(state: SalesWorkflowState): EntityId | undefined {
  return state.advertisers[0]?.id;
}
