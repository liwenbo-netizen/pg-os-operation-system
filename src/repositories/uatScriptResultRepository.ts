import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  productionUatScripts,
  summarizeUatResults,
  type UatScript,
  type UatScriptResults,
  type UatStepResult,
  type UatStepStatus
} from "../services/uatScriptService";
import type { BusinessUser } from "../types/domain";

type Row = Record<string, unknown>;

type SupabaseErrorLike = {
  message?: string;
};

type SupabaseListResult<T> = {
  data: T[] | null;
  error: SupabaseErrorLike | null;
};

type SupabaseSingleResult<T> = {
  data: T | null;
  error: SupabaseErrorLike | null;
};

type SupabaseTableQuery = PromiseLike<SupabaseListResult<Row>> & {
  select: (columns?: string) => SupabaseTableQuery;
  eq: (column: string, value: unknown) => SupabaseTableQuery;
  upsert: (rows: Row | Row[], options?: { onConflict?: string }) => SupabaseTableQuery;
  maybeSingle: () => Promise<SupabaseSingleResult<Row>>;
};

export type SupabaseUatScriptResultClient = {
  from: (table: string) => SupabaseTableQuery;
};

export type UatScriptResultSource = "local" | "supabase" | "supabase-warning";

export type UatScriptResultLoadResult = {
  results: UatScriptResults;
  source: UatScriptResultSource;
  loadedAt: string;
  warnings: string[];
};

export type UatScriptResultSaveInput = {
  productionUrl?: string;
  results: UatScriptResults;
  runKey?: string;
  scripts?: UatScript[];
  user: BusinessUser;
};

export type UatScriptResultSaveResult = {
  ok: boolean;
  source: UatScriptResultSource;
  savedAt: string;
  savedStepCount: number;
  warnings: string[];
};

export type UatScriptResultRepository = {
  supportsSupabase: boolean;
  loadResults: (runKey?: string) => Promise<UatScriptResultLoadResult>;
  saveResults: (input: UatScriptResultSaveInput) => Promise<UatScriptResultSaveResult>;
};

export const DEFAULT_UAT_RUN_KEY = "production-manual-uat-current";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UAT_STEP_COLUMNS = "step_id,status,actual_result,updated_at,created_at";

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function optionalUuid(value: unknown) {
  return isUuid(value) ? value : null;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function normalizeStatus(value: unknown): UatStepStatus {
  return value === "passed" || value === "failed" || value === "blocked" || value === "pending" ? value : "pending";
}

function warning(message: string): UatScriptResultLoadResult {
  return {
    results: {},
    source: "local",
    loadedAt: new Date().toISOString(),
    warnings: [message]
  };
}

function saveWarning(message: string): UatScriptResultSaveResult {
  return {
    ok: false,
    source: "supabase-warning",
    savedAt: new Date().toISOString(),
    savedStepCount: 0,
    warnings: [message]
  };
}

function summarizeRunStatus(scripts: UatScript[], results: UatScriptResults) {
  const summary = summarizeUatResults(scripts, results);

  if (summary.failed > 0) {
    return "failed";
  }

  if (summary.blocked > 0) {
    return "blocked";
  }

  if (summary.pending === 0) {
    return "completed";
  }

  return "in_progress";
}

function mapStepResult(row: Row): UatStepResult {
  return {
    status: normalizeStatus(row.status),
    actualResult: stringValue(row.actual_result),
    updatedAt: stringValue(row.updated_at, stringValue(row.created_at, new Date(0).toISOString()))
  };
}

function toStepRows(input: {
  actorUserId: string | null;
  runId: string;
  scripts: UatScript[];
  results: UatScriptResults;
  timestamp: string;
  user: BusinessUser;
}) {
  return input.scripts.flatMap((script) =>
    script.steps.map((step) => {
      const result = input.results[step.id] ?? { status: "pending", actualResult: "" };

      return {
        run_id: input.runId,
        script_id: script.id,
        script_title: script.title,
        role_code: script.roleCode,
        step_id: step.id,
        step_action: step.action,
        expected_result: step.expectedResult,
        status: result.status,
        actual_result: result.actualResult,
        actor_user_id: input.actorUserId,
        actor_role: input.user.activeRole,
        updated_by: input.actorUserId,
        metadata: {
          evidence: script.evidence,
          scope: script.scope,
          targetRoute: script.targetRoute
        },
        updated_at: result.updatedAt ?? input.timestamp
      };
    })
  );
}

class SupabaseUatScriptResultRepository implements UatScriptResultRepository {
  readonly supportsSupabase: boolean;

  constructor(
    private readonly client: SupabaseUatScriptResultClient | null,
    configured: boolean
  ) {
    this.supportsSupabase = configured && Boolean(client);
  }

  async loadResults(runKey = DEFAULT_UAT_RUN_KEY): Promise<UatScriptResultLoadResult> {
    const loadedAt = new Date().toISOString();

    if (!this.supportsSupabase || !this.client) {
      return warning("Supabase UAT result persistence is not configured; using local browser storage.");
    }

    try {
      const runResult = await this.client
        .from("uat_script_runs")
        .select("id,run_key,updated_at")
        .eq("run_key", runKey)
        .maybeSingle();

      if (runResult.error) {
        return {
          results: {},
          source: "supabase-warning",
          loadedAt,
          warnings: [`uat_script_runs: ${runResult.error.message ?? "select failed"}`]
        };
      }

      if (!runResult.data?.id) {
        return {
          results: {},
          source: "supabase",
          loadedAt,
          warnings: []
        };
      }

      const stepResult = await this.client
        .from("uat_script_step_results")
        .select(UAT_STEP_COLUMNS)
        .eq("run_id", runResult.data.id);

      if (stepResult.error) {
        return {
          results: {},
          source: "supabase-warning",
          loadedAt,
          warnings: [`uat_script_step_results: ${stepResult.error.message ?? "select failed"}`]
        };
      }

      return {
        results: Object.fromEntries((stepResult.data ?? []).map((row) => [stringValue(row.step_id), mapStepResult(row)])),
        source: "supabase",
        loadedAt,
        warnings: []
      };
    } catch (error) {
      return {
        results: {},
        source: "supabase-warning",
        loadedAt,
        warnings: [`uat_script_results: ${error instanceof Error ? error.message : "select failed"}`]
      };
    }
  }

  async saveResults(input: UatScriptResultSaveInput): Promise<UatScriptResultSaveResult> {
    const savedAt = new Date().toISOString();
    const scripts = input.scripts ?? productionUatScripts;
    const runKey = input.runKey ?? DEFAULT_UAT_RUN_KEY;
    const actorUserId = optionalUuid(input.user.id);

    if (!this.supportsSupabase || !this.client) {
      return {
        ok: false,
        source: "local",
        savedAt,
        savedStepCount: 0,
        warnings: ["Supabase UAT result persistence is not configured; saved locally in this browser."]
      };
    }

    try {
      const summary = summarizeUatResults(scripts, input.results);
      const runResult = await this.client
        .from("uat_script_runs")
        .upsert(
          {
            run_key: runKey,
            environment: "production",
            production_url: input.productionUrl,
            started_by: actorUserId,
            started_by_role: input.user.activeRole,
            status: summarizeRunStatus(scripts, input.results),
            summary,
            metadata: {
              phase: "Phase 34",
              source: "uat_script_center",
              scriptCount: scripts.length
            }
          },
          { onConflict: "run_key" }
        )
        .select("id")
        .maybeSingle();

      if (runResult.error || !runResult.data?.id) {
        return saveWarning(`uat_script_runs: ${runResult.error?.message ?? "upsert failed"}`);
      }

      const rows = toStepRows({
        actorUserId,
        runId: String(runResult.data.id),
        scripts,
        results: input.results,
        timestamp: savedAt,
        user: input.user
      });
      const stepResult = await this.client
        .from("uat_script_step_results")
        .upsert(rows, { onConflict: "run_id,step_id" })
        .select("id");

      if (stepResult.error) {
        return saveWarning(`uat_script_step_results: ${stepResult.error.message ?? "upsert failed"}`);
      }

      return {
        ok: true,
        source: "supabase",
        savedAt,
        savedStepCount: rows.length,
        warnings: []
      };
    } catch (error) {
      return saveWarning(`uat_script_results: ${error instanceof Error ? error.message : "upsert failed"}`);
    }
  }
}

export function createUatScriptResultRepository(
  client: SupabaseUatScriptResultClient | null = supabase as SupabaseUatScriptResultClient | null,
  configured = isSupabaseConfigured
): UatScriptResultRepository {
  return new SupabaseUatScriptResultRepository(client, configured);
}
