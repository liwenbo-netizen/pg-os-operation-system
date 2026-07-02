import { describe, expect, it } from "vitest";
import { buildWarningDiagnostics } from "./warningDiagnosticsService";
import type { WorkflowRepositoryHealth } from "../repositories/workflowRepository";

function repositoryHealth(overrides: Partial<WorkflowRepositoryHealth>): WorkflowRepositoryHealth {
  return {
    mode: "supabase",
    source: "supabase-save-warning",
    loadedAt: "2026-07-02T01:29:48.243Z",
    warnings: [],
    ...overrides
  };
}

describe("warning diagnostics service", () => {
  it("parses Supabase RLS repository warnings into actionable diagnostics", () => {
    const diagnostics = buildWarningDiagnostics({
      activeRole: "media_manager",
      repositoryHealth: repositoryHealth({
        warnings: ['integration_projects: new row violates row-level security policy for table "integration_projects"']
      })
    });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      scope: "repository",
      table: "integration_projects",
      action: "upsert",
      role: "Media Manager (media_manager)",
      time: "2026-07-02 09:29:48 UTC+8",
      error: 'new row violates row-level security policy for table "integration_projects"'
    });
    expect(diagnostics[0].suggestion).toContain("WITH CHECK");
  });

  it("maps skipped workflow writes into skip diagnostics", () => {
    const diagnostics = buildWarningDiagnostics({
      activeRole: "ceo",
      repositoryHealth: repositoryHealth({
        skippedWrites: [
          {
            table: "publishers",
            id: "publisher-233",
            reason: "Skipped non-UUID primary key; Supabase locked schema uses uuid ids."
          }
        ]
      })
    });

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      table: "publishers",
      action: "skip",
      role: "CEO (ceo)"
    });
    expect(diagnostics[0].error).toContain("publisher-233");
    expect(diagnostics[0].suggestion).toContain("UUID");
  });

  it("can include auth session warnings when requested", () => {
    const diagnostics = buildWarningDiagnostics({
      activeRole: "finance_manager",
      authError: "No PG OS role is assigned to this Supabase user.",
      includeAuth: true
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        scope: "auth",
        table: "auth",
        action: "session",
        role: "Finance Manager (finance_manager)"
      })
    ]);
  });
});
