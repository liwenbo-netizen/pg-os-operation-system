import { describe, expect, it } from "vitest";
import { productionUatScripts, type UatScriptResults } from "../services/uatScriptService";
import { createUatScriptResultRepository, type SupabaseUatScriptResultClient } from "./uatScriptResultRepository";

type Row = Record<string, unknown>;

class FakeQuery implements PromiseLike<{ data: Row[] | null; error: { message?: string } | null }> {
  private filters: Array<{ column: string; value: unknown }> = [];
  private orders: Array<{ column: string; ascending: boolean }> = [];
  private rangeBounds: { from: number; to: number } | null = null;
  private selectedColumns = "*";
  private upsertRows: Row[] | null = null;
  private onConflict = "id";

  constructor(
    private readonly fake: FakeSupabase,
    private readonly table: string
  ) {}

  select(columns = "*") {
    this.selectedColumns = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  range(from: number, to: number) {
    this.rangeBounds = { from, to };
    return this;
  }

  upsert(rows: Row | Row[], options?: { onConflict?: string }) {
    this.upsertRows = Array.isArray(rows) ? rows : [rows];
    this.onConflict = options?.onConflict ?? "id";
    return this;
  }

  async maybeSingle() {
    const result = await this.execute();
    return {
      data: result.data?.[0] ?? null,
      error: result.error
    };
  }

  then<TResult1 = { data: Row[] | null; error: { message?: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[] | null; error: { message?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    if (this.fake.failingTables.has(this.table)) {
      return { data: null, error: { message: `${this.table} blocked by RLS` } };
    }

    if (this.upsertRows) {
      const savedRows = this.fake.upsert(this.table, this.upsertRows, this.onConflict);
      return { data: this.projectRows(savedRows), error: null };
    }

    let rows = (this.fake.tables[this.table] ?? []).filter((row) =>
      this.filters.every((filter) => row[filter.column] === filter.value)
    );
    for (const order of [...this.orders].reverse()) {
      rows = [...rows].sort((left, right) => {
        const leftValue = String(left[order.column] ?? "");
        const rightValue = String(right[order.column] ?? "");
        return order.ascending ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue);
      });
    }
    if (this.rangeBounds) {
      rows = rows.slice(this.rangeBounds.from, this.rangeBounds.to + 1);
    }

    return { data: this.projectRows(rows), error: null };
  }

  private projectRows(rows: Row[]) {
    if (this.selectedColumns === "*" || !this.selectedColumns.trim()) {
      return rows;
    }

    const columns = this.selectedColumns.split(",").map((column) => column.trim());
    return rows.map((row) =>
      Object.fromEntries(columns.map((column) => [column, row[column]]))
    );
  }
}

class FakeSupabase implements SupabaseUatScriptResultClient {
  readonly writes: Record<string, Row[]> = {};

  constructor(
    readonly tables: Record<string, Row[]> = {},
    readonly failingTables = new Set<string>()
  ) {}

  from(table: string) {
    return new FakeQuery(this, table);
  }

  upsert(table: string, rows: Row[], onConflict: string) {
    const conflictColumns = onConflict.split(",").map((column) => column.trim());
    const existingRows = this.tables[table] ?? [];
    const savedRows: Row[] = [];

    for (const row of rows) {
      const existingIndex = existingRows.findIndex((existing) =>
        conflictColumns.every((column) => existing[column] === row[column])
      );

      if (existingIndex >= 0) {
        existingRows[existingIndex] = { ...existingRows[existingIndex], ...row };
        savedRows.push(existingRows[existingIndex]);
      } else {
        const savedRow = {
          id: row.id ?? `${table}-${existingRows.length + 1}`,
          ...row
        };
        existingRows.push(savedRow);
        savedRows.push(savedRow);
      }
    }

    this.tables[table] = existingRows;
    this.writes[table] = rows;
    return savedRows;
  }
}

const user = {
  id: "00000001-0000-4000-8000-000000000001",
  email: "ceo@poly-gamma.com",
  fullName: "CEO",
  roles: ["ceo" as const],
  activeRole: "ceo" as const
};

describe("uatScriptResultRepository", () => {
  it("loads Supabase UAT step results into the checklist result map", async () => {
    const fakeSupabase = new FakeSupabase({
      uat_script_runs: [{ id: "run-1", run_key: "production-manual-uat-current" }],
      uat_script_step_results: [
        {
          run_id: "run-1",
          step_id: "ceo-login",
          status: "passed",
          actual_result: "CEO login passed",
          updated_at: "2026-07-02T00:00:00.000Z"
        }
      ]
    });
    const repository = createUatScriptResultRepository(fakeSupabase, true);

    const result = await repository.loadResults();

    expect(result.source).toBe("supabase");
    expect(result.results["ceo-login"]).toEqual({
      status: "passed",
      actualResult: "CEO login passed",
      updatedAt: "2026-07-02T00:00:00.000Z"
    });
  });

  it("saves the run summary and every configured UAT step to Supabase", async () => {
    const fakeSupabase = new FakeSupabase({
      uat_script_runs: [{ id: "run-1", run_key: "production-manual-uat-current" }]
    });
    const repository = createUatScriptResultRepository(fakeSupabase, true);
    const results: UatScriptResults = {
      "ceo-login": {
        status: "passed",
        actualResult: "Production CEO login ok.",
        updatedAt: "2026-07-02T01:00:00.000Z"
      }
    };

    const result = await repository.saveResults({
      productionUrl: "https://pg-os-operation-system.vercel.app",
      results,
      scripts: productionUatScripts,
      user
    });

    expect(result.ok).toBe(true);
    expect(fakeSupabase.writes.uat_script_runs[0]).toMatchObject({
      run_key: "production-manual-uat-current",
      started_by: user.id,
      started_by_role: "ceo",
      status: "in_progress"
    });
    expect(fakeSupabase.writes.uat_script_runs[0].summary).toMatchObject({ passed: 1 });
    expect(fakeSupabase.writes.uat_script_step_results.length).toBe(
      productionUatScripts.reduce((count, script) => count + script.steps.length, 0)
    );
    expect(fakeSupabase.writes.uat_script_step_results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          run_id: "run-1",
          step_id: "ceo-login",
          status: "passed",
          actor_user_id: user.id,
          updated_by: user.id,
          metadata: expect.objectContaining({
            businessDomain: "Platform",
            auditEvents: expect.arrayContaining(["auth.sign_in"])
          })
        }),
        expect.objectContaining({
          step_id: "media-new-publisher",
          metadata: expect.objectContaining({
            businessDomain: "Media",
            stepBusinessAction: "New publisher",
            dataQualityCheck: expect.stringContaining("Publisher row")
          })
        })
      ])
    );
  });

  it("loads Supabase UAT run history with the selected run step details", async () => {
    const fakeSupabase = new FakeSupabase({
      uat_script_runs: [
        {
          id: "run-older",
          run_key: "production-2026-07-01",
          environment: "production",
          status: "completed",
          summary: { total: 2, passed: 2, failed: 0, blocked: 0, pending: 0, completionRate: 100 },
          created_at: "2026-07-01T00:00:00.000Z",
          updated_at: "2026-07-01T00:10:00.000Z"
        },
        {
          id: "run-newer",
          run_key: "production-2026-07-02",
          environment: "production",
          production_url: "https://pg-os-operation-system.vercel.app",
          status: "failed",
          summary: { total: 2, passed: 1, failed: 1, blocked: 0, pending: 0, completionRate: 100 },
          created_at: "2026-07-02T00:00:00.000Z",
          updated_at: "2026-07-02T00:10:00.000Z"
        }
      ],
      uat_script_step_results: [
        {
          id: "step-older",
          run_id: "run-older",
          script_id: "ceo-observability-signoff",
          script_title: "CEO production observability sign-off",
          role_code: "ceo",
          step_id: "ceo-login",
          step_action: "Sign in",
          expected_result: "Workspace opens",
          status: "passed",
          actual_result: "Older run",
          actor_role: "ceo",
          updated_at: "2026-07-01T00:05:00.000Z"
        },
        {
          id: "step-newer",
          run_id: "run-newer",
          script_id: "ceo-observability-signoff",
          script_title: "CEO production observability sign-off",
          role_code: "ceo",
          step_id: "ceo-health",
          step_action: "Open System Health",
          expected_result: "Health loads",
          status: "failed",
          actual_result: "Warning mismatch",
          actor_role: "ceo",
          updated_at: "2026-07-02T00:05:00.000Z"
        }
      ]
    });
    const repository = createUatScriptResultRepository(fakeSupabase, true);

    const result = await repository.loadHistory({ limit: 2 });

    expect(result.source).toBe("supabase");
    expect(result.runs.map((run) => run.id)).toEqual(["run-newer", "run-older"]);
    expect(result.selectedRun).toMatchObject({
      id: "run-newer",
      runKey: "production-2026-07-02",
      status: "failed",
      summary: expect.objectContaining({ passed: 1, failed: 1 })
    });
    expect(result.steps).toEqual([
      expect.objectContaining({
        runId: "run-newer",
        stepId: "ceo-health",
        status: "failed",
        actualResult: "Warning mismatch"
      })
    ]);
  });

  it("returns warnings instead of throwing when persistence is not configured or blocked", async () => {
    const localRepository = createUatScriptResultRepository(null, false);
    await expect(localRepository.loadResults()).resolves.toMatchObject({
      source: "local",
      warnings: expect.arrayContaining([expect.stringContaining("not configured")])
    });

    const blockedRepository = createUatScriptResultRepository(
      new FakeSupabase({}, new Set(["uat_script_runs"])),
      true
    );
    await expect(
      blockedRepository.saveResults({
        results: {},
        user
      })
    ).resolves.toMatchObject({
      ok: false,
      source: "supabase-warning",
      warnings: expect.arrayContaining([expect.stringContaining("uat_script_runs")])
    });
  });
});
