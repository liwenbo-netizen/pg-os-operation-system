import type {
  BusinessUser,
  ContractWorkflowState,
  FinanceWorkflowState,
  GuideWorkflowState,
  MediaWorkflowState,
  SalesWorkflowState,
  WorkbenchWorkflowState
} from "../types/domain";
import { createInitialContractWorkflowState } from "../services/contractService";
import { createInitialFinanceWorkflowState } from "../services/financeSettlementService";
import { createInitialMediaWorkflowState } from "../services/mediaWorkflowService";
import { createInitialSalesWorkflowState } from "../services/salesWorkflowService";
import { createInitialGuideWorkflowState } from "../services/sopService";
import { createInitialWorkbenchWorkflowState } from "../services/workbenchService";

export type WorkflowRepositoryMode = "fixture" | "supabase";

export type WorkflowSnapshot = {
  mediaState: MediaWorkflowState;
  salesState: SalesWorkflowState;
  financeState: FinanceWorkflowState;
  contractState: ContractWorkflowState;
  guideState: GuideWorkflowState;
  workbenchState: WorkbenchWorkflowState;
};

export type RepositorySkippedWrite = {
  table: string;
  id?: string;
  reason: string;
};

export type WorkflowRepositoryHealth = {
  mode: WorkflowRepositoryMode;
  source: string;
  loadedAt: string;
  warnings: string[];
  skippedWrites?: RepositorySkippedWrite[];
};

export type WorkflowSnapshotLoadResult = {
  snapshot: WorkflowSnapshot;
  health: WorkflowRepositoryHealth;
};

export type WorkflowSnapshotSaveResult = {
  ok: boolean;
  mode: WorkflowRepositoryMode;
  savedTables: string[];
  warnings: string[];
  skippedWrites: RepositorySkippedWrite[];
};

export type WorkflowSaveContext = {
  actor?: Pick<BusinessUser, "id" | "activeRole"> | null;
};

export type WorkflowRepository = {
  mode: WorkflowRepositoryMode;
  loadSnapshot: () => Promise<WorkflowSnapshotLoadResult>;
  saveSnapshot: (snapshot: WorkflowSnapshot, context?: WorkflowSaveContext) => Promise<WorkflowSnapshotSaveResult>;
};

export function createFixtureWorkflowSnapshot(): WorkflowSnapshot {
  return {
    mediaState: createInitialMediaWorkflowState(),
    salesState: createInitialSalesWorkflowState(),
    financeState: createInitialFinanceWorkflowState(),
    contractState: createInitialContractWorkflowState(),
    guideState: createInitialGuideWorkflowState(),
    workbenchState: createInitialWorkbenchWorkflowState()
  };
}
