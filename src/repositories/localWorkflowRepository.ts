import {
  createFixtureWorkflowSnapshot,
  type WorkflowRepository,
  type WorkflowSnapshot
} from "./workflowRepository";

export class LocalWorkflowRepository implements WorkflowRepository {
  readonly mode = "fixture" as const;

  async loadSnapshot() {
    return {
      snapshot: createFixtureWorkflowSnapshot(),
      health: {
        mode: this.mode,
        source: "fixtureRepository",
        loadedAt: new Date().toISOString(),
        warnings: []
      }
    };
  }

  async saveSnapshot(_snapshot: WorkflowSnapshot) {
    return {
      ok: true,
      mode: this.mode,
      savedTables: [],
      warnings: ["Fixture repository is read-only; no database write was attempted."],
      skippedWrites: []
    };
  }
}
