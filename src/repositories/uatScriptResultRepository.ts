import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  productionUatScripts,
  summarizeUatResults,
  type UatSummary,
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
  order: (column: string, options?: { ascending?: boolean }) => SupabaseTableQuery;
  range: (from: number, to: number) => SupabaseTableQuery;
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

export type UatRunStatus = "in_progress" | "completed" | "failed" | "blocked" | "archived";

export type UatRunHistoryItem = {
  id: string;
  runKey: string;
  environment: string;
  productionUrl?: string;
  startedBy?: string;
  startedByRole?: string;
  status: UatRunStatus;
  summary: UatSummary;
  createdAt: string;
  updatedAt: string;
};

export type UatStepHistoryItem = {
  id: string;
  runId: string;
  scriptId: string;
  scriptTitle: string;
  roleCode: string;
  stepId: string;
  stepAction: string;
  expectedResult: string;
  status: UatStepStatus;
  actualResult: string;
  actorRole?: string;
  updatedAt: string;
};

export type UatScriptHistoryRequest = {
  limit?: number;
  runId?: string;
};

export type UatScriptHistoryLoadResult = {
  runs: UatRunHistoryItem[];
  selectedRun?: UatRunHistoryItem;
  steps: UatStepHistoryItem[];
  source: UatScriptResultSource;
  loadedAt: string;
  warnings: string[];
};

export type UatScriptResultRepository = {
  supportsSupabase: boolean;
  loadHistory: (request?: UatScriptHistoryRequest) => Promise<UatScriptHistoryLoadResult>;
  loadResults: (runKey?: string) => Promise<UatScriptResultLoadResult>;
  saveResults: (input: UatScriptResultSaveInput) => Promise<UatScriptResultSaveResult>;
};

export const DEFAULT_UAT_RUN_KEY = "production-manual-uat-current";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UAT_STEP_COLUMNS = "step_id,status,actual_result,updated_at,created_at";
const UAT_RUN_HISTORY_COLUMNS = "id,run_key,environment,production_url,started_by,started_by_role,status,summary,created_at,updated_at";
const UAT_STEP_HISTORY_COLUMNS =
  "id,run_id,script_id,script_title,role_code,step_id,step_action,expected_result,status,actual_result,actor_role,updated_at,created_at";

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function optionalUuid(value: unknown) {
  return isUuid(value) ? value : null;
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function objectValue(value: unknown): Row {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : {};
}

function normalizeStatus(value: unknown): UatStepStatus {
  return value === "passed" || value === "failed" || value === "blocked" || value === "pending" ? value : "pending";
}

function normalizeRunStatus(value: unknown): UatRunStatus {
  return value === "completed" || value === "failed" || value === "blocked" || value === "archived" ? value : "in_progress";
}

function normalizeLimit(value: number | undefined) {
  return Math.min(50, Math.max(1, Math.floor(value ?? 10)));
}

function warning(message: string): UatScriptResultLoadResult {
  return {
    results: {},
    source: "local",
    loadedAt: new Date().toISOString(),
    warnings: [message]
  };
}

function historyWarning(message: string): UatScriptHistoryLoadResult {
  return {
    runs: [],
    steps: [],
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

function mapSummary(value: unknown): UatSummary {
  const summary = objectValue(value);

  return {
    total: numberValue(summary.total),
    passed: numberValue(summary.passed),
    failed: numberValue(summary.failed),
    blocked: numberValue(summary.blocked),
    pending: numberValue(summary.pending),
    completionRate: numberValue(summary.completionRate)
  };
}

function mapRunHistoryItem(row: Row): UatRunHistoryItem {
  const createdAt = stringValue(row.created_at, new Date(0).toISOString());

  return {
    id: stringValue(row.id),
    runKey: stringValue(row.run_key),
    environment: stringValue(row.environment, "production"),
    productionUrl: optionalString(row.production_url),
    startedBy: optionalString(row.started_by),
    startedByRole: optionalString(row.started_by_role),
    status: normalizeRunStatus(row.status),
    summary: mapSummary(row.summary),
    createdAt,
    updatedAt: stringValue(row.updated_at, createdAt)
  };
}

function mapStepHistoryItem(row: Row): UatStepHistoryItem {
  const createdAt = stringValue(row.created_at, new Date(0).toISOString());

  return {
    id: stringValue(row.id),
    runId: stringValue(row.run_id),
    scriptId: stringValue(row.script_id),
    scriptTitle: stringValue(row.script_title),
    roleCode: stringValue(row.role_code),
    stepId: stringValue(row.step_id),
    stepAction: stringValue(row.step_action),
    expectedResult: stringValue(row.expected_result),
    status: normalizeStatus(row.status),
    actualResult: stringValue(row.actual_result),
    actorRole: optionalString(row.actor_role),
    updatedAt: stringValue(row.updated_at, createdAt)
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

  async loadHistory(request: UatScriptHistoryRequest = {}): Promise<UatScriptHistoryLoadResult> {
    const loadedAt = new Date().toISOString();

    if (!this.supportsSupabase || !this.client) {
      return historyWarning("Supabase UAT result history is not configured; no remote history can be loaded.");
    }

    try {
      const limit = normalizeLimit(request.limit);
      const runsResult = await this.client
        .from("uat_script_runs")
        .select(UAT_RUN_HISTORY_COLUMNS)
        .order("updated_at", { ascending: false })
        .range(0, limit - 1);

      if (runsResult.error) {
        return {
          runs: [],
          steps: [],
          source: "supabase-warning",
          loadedAt,
          warnings: [`uat_script_runs: ${runsResult.error.message ?? "select failed"}`]
        };
      }

      const runs = (runsResult.data ?? []).map(mapRunHistoryItem);
      const selectedRun = runs.find((run) => run.id === request.runId) ?? runs[0];

      if (!selectedRun) {
        return {
          runs,
          steps: [],
          source: "supabase",
          loadedAt,
          warnings: []
        };
      }

      const stepsResult = await this.client
        .from("uat_script_step_results")
        .select(UAT_STEP_HISTORY_COLUMNS)
        .eq("run_id", selectedRun.id);

      if (stepsResult.error) {
        return {
          runs,
          selectedRun,
          steps: [],
          source: "supabase-warning",
          loadedAt,
          warnings: [`uat_script_step_results: ${stepsResult.error.message ?? "select failed"}`]
        };
      }

      const steps = (stepsResult.data ?? [])
        .map(mapStepHistoryItem)
        .sort((left, right) =>
          left.roleCode.localeCompare(right.roleCode) ||
          left.scriptId.localeCompare(right.scriptId) ||
          left.stepId.localeCompare(right.stepId)
        );

      return {
        runs,
        selectedRun,
        steps,
        source: "supabase",
        loadedAt,
        warnings: []
      };
    } catch (error) {
      return {
        runs: [],
        steps: [],
        source: "supabase-warning",
        loadedAt,
        warnings: [`uat_script_history: ${error instanceof Error ? error.message : "select failed"}`]
      };
    }
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
