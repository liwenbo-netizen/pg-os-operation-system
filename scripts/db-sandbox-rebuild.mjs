import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { formatFailures, normalizeRef, splitTopLevelStatements } from "./baselineSafety.mjs";
import { validateBaselineEnvironment } from "./validate-baseline-environment.mjs";

export function sandboxRebuildGate(environment, options = {}) {
  const failures = validateBaselineEnvironment(environment, {
    now: options.now,
    requireSandboxWrite: options.requireWrite ?? false,
    acceptAnySandboxWriteFlag: options.acceptAnySandboxWriteFlag ?? false
  });

  const sandboxRef = normalizeRef(environment.SUPABASE_SANDBOX_PROJECT_REF);
  const project = options.project ?? null;
  if (project) {
    if (project.id !== sandboxRef) {
      failures.push("Verified project identity does not match SUPABASE_SANDBOX_PROJECT_REF.");
    }
    if (!project.database?.host?.includes(sandboxRef)) {
      failures.push("Verified project host does not match the sandbox Project Ref.");
    }
    if (project.status !== "ACTIVE_HEALTHY" && project.status !== "ACTIVE") {
      failures.push(`Sandbox project is not active (status=${project.status ?? "unknown"}); rebuild is impossible.`);
    }
  }

  return [...new Set(failures)];
}

export function planBatches(files, maxStatementsPerBatch = 25) {
  const batches = [];
  for (const [file, sql] of Object.entries(files)) {
    const statements = splitTopLevelStatements(sql);
    for (let i = 0; i < statements.length; i += maxStatementsPerBatch) {
      batches.push({
        file,
        index: batches.length,
        statements: statements.slice(i, i + maxStatementsPerBatch)
      });
    }
  }
  return batches;
}

export function computeBaselineHash(files) {
  const hash = createHash("sha256");
  for (const name of Object.keys(files).sort()) {
    hash.update(name);
    hash.update("\0");
    hash.update(files[name]);
    hash.update("\0");
  }
  return hash.digest("hex");
}

export async function executeSandboxRebuild({
  environment,
  files,
  project,
  options = {},
  executeBatchImpl
}) {
  const requireWrite = options.apply === true;
  if (options.apply !== true) {
    return {
      overall: "BLOCKED",
      gate: ["Explicit --apply approval is required before any sandbox SQL batch may execute."],
      batches: [],
      reset: false,
      staging_source_write: false,
      finished_at: new Date().toISOString()
    };
  }
  const gateFailures = sandboxRebuildGate(environment, { requireWrite, project, now: options.now });
  if (gateFailures.length > 0) {
    return {
      overall: "BLOCKED",
      gate: gateFailures,
      batches: [],
      reset: options.reset === true,
      staging_source_write: false,
      finished_at: new Date().toISOString()
    };
  }

  const batches = planBatches(files, options.maxStatementsPerBatch);
  const baselineHash = computeBaselineHash(files);
  const results = [];
  const historyVersions = [];
  const lastBatchIndexByFile = new Map();
  for (const batch of batches) lastBatchIndexByFile.set(batch.file, batch.index);
  let overall = "SUCCESS";
  let reset = options.reset === true;
  const token = environment.SUPABASE_ACCESS_TOKEN;
  const sandboxRef = normalizeRef(environment.SUPABASE_SANDBOX_PROJECT_REF);
  const baseUrl = options.baseUrl ?? "https://api.supabase.com/v1/projects";
  const executor = executeBatchImpl ?? defaultExecuteBatch;

  if (reset) {
    const resetSql = "drop schema if exists public cascade; create schema public;";
    const resetResult = await executor(token, sandboxRef, baseUrl, resetSql);
    if (resetResult.status !== "ok") {
      return {
        overall: "FAILED",
        gate: [],
        batches: [{ file: "reset", index: 0, status: "failed", error: resetResult.error, statement_count: 1, duration_ms: resetResult.duration_ms }],
        reset: true,
        staging_source_write: false,
        finished_at: new Date().toISOString()
      };
    }
  }

  for (const batch of batches) {
    const started = Date.now();
    const sql = batch.statements.join(";\n");
    const result = await executor(token, sandboxRef, baseUrl, sql);
    const durationMs = Date.now() - started;
    const status = result.status === "ok" ? "success" : "failed";
    if (status === "failed") overall = "FAILED";
    results.push({
      file: batch.file,
      index: batch.index,
      status,
      error: result.error ?? null,
      statement_count: batch.statements.length,
      duration_ms: durationMs
    });
    if (status === "failed") break;
    if (options.recordHistory === true && lastBatchIndexByFile.get(batch.file) === batch.index) {
      const version = batch.file.split("_", 1)[0];
      const historySql = `insert into supabase_migrations.schema_migrations (version) values ('${version}') on conflict (version) do nothing;`;
      const historyResult = await executor(token, sandboxRef, baseUrl, historySql);
      if (historyResult.status !== "ok") {
        overall = "FAILED";
        results.push({
          file: `${batch.file} (history)`,
          index: batch.index,
          status: "failed",
          error: historyResult.error ?? "migration history write failed",
          statement_count: 1,
          duration_ms: 0
        });
        break;
      }
      historyVersions.push(version);
    }
  }

  return {
    overall,
    gate: [],
    baseline_hash: baselineHash,
    baseline_files: Object.keys(files).sort(),
    history_versions: historyVersions,
    migrations_applied: historyVersions.length,
    batches: results,
    reset,
    staging_source_write: false,
    started_at: options.startedAt ?? new Date().toISOString(),
    finished_at: new Date().toISOString()
  };
}

export async function verifySandboxProjectIdentity({
  environment,
  baseUrl = "https://api.supabase.com/v1/projects",
  fetchImpl = globalThis.fetch
}) {
  const token = environment.SUPABASE_ACCESS_TOKEN;
  const sandboxRef = normalizeRef(environment.SUPABASE_SANDBOX_PROJECT_REF);
  if (!token) throw new Error("SUPABASE_ACCESS_TOKEN is required for sandbox identity verification.");
  if (!sandboxRef) throw new Error("SUPABASE_SANDBOX_PROJECT_REF is required.");
  const response = await fetchImpl(`${baseUrl}/${encodeURIComponent(sandboxRef)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60_000)
  });
  if (!response.ok) {
    throw new Error(`Sandbox identity verification returned HTTP ${response.status}.`);
  }
  return response.json();
}

export async function defaultExecuteBatch(token, projectRef, baseUrl, sql, options = {}) {
  const { fetchImpl = globalThis.fetch, maxRetries = 3, retryDelayMs = 2000 } = options;
  const sleep = (ms) => new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
  let lastResult = { status: "failed", error: "unknown transport failure" };
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetchImpl(`${baseUrl}/${encodeURIComponent(projectRef)}/database/query`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ query: sql }),
        signal: AbortSignal.timeout(120_000)
      });
      if (response.ok) return { status: "ok", error: null };
      let detail = "";
      try {
        const payload = await response.json();
        detail = typeof payload?.message === "string" ? payload.message : JSON.stringify(payload).slice(0, 500);
      } catch {
        detail = "";
      }
      lastResult = { status: "failed", error: `HTTP ${response.status}${detail ? `: ${detail.slice(0, 500)}` : ""}` };
      if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
        await sleep(retryDelayMs);
        continue;
      }
      return lastResult;
    } catch {
      lastResult = { status: "failed", error: "request failed before a response was received" };
      if (attempt < maxRetries) {
        await sleep(retryDelayMs);
        continue;
      }
      return lastResult;
    }
  }
  return lastResult;
}

function readCandidateFiles(root = process.cwd(), source = "baseline-candidate") {
  const directory = `${root}/supabase/${source}`;
  if (!existsSync(directory)) {
    throw new Error(`supabase/${source} does not exist.`);
  }
  const files = {};
  for (const entry of readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()) {
    if (entry.endsWith(".sql")) files[entry] = readFileSync(`${directory}/${entry}`, "utf8");
  }
  return files;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const check = args.includes("--check");
  const reset = args.includes("--reset");
  const outputPath = args.find((arg) => arg.startsWith("--output="))?.slice("--output=".length);
  const maxBatchArg = args.find((arg) => arg.startsWith("--max-batch="))?.slice("--max-batch=".length);
  const maxStatementsPerBatch = maxBatchArg ? Number(maxBatchArg) : undefined;
  const sourceArg = args.find((arg) => arg.startsWith("--source="))?.slice("--source=".length);
  const recordHistory = args.includes("--record-history");

  try {
    if (check && apply) {
      throw new Error("--check and --apply are mutually exclusive.");
    }
    if (check) {
      const gateFailures = sandboxRebuildGate(process.env, {
        requireWrite: false,
        acceptAnySandboxWriteFlag: true,
        now: new Date()
      });
      if (gateFailures.length > 0) {
        console.error(formatFailures("Sandbox rebuild blocked by safety gate:", gateFailures));
        process.exit(1);
      }
      const project = await verifySandboxProjectIdentity({ environment: process.env });
      const identityFailures = sandboxRebuildGate(process.env, {
        requireWrite: false,
        acceptAnySandboxWriteFlag: true,
        now: new Date(),
        project
      });
      if (identityFailures.length > 0) {
        console.error(formatFailures("Sandbox identity verification failed:", identityFailures));
        process.exit(1);
      }
      console.log("Sandbox rebuild check passed (no SQL executed).");
      console.log(`sandbox_status: ${project.status}`);
      console.log("staging_source_writes: false");
      console.log("sandbox_writes: 0");
      return;
    }
    const files = readCandidateFiles(process.cwd(), sourceArg ?? "baseline-candidate");
    const result = await executeSandboxRebuild({
      environment: process.env,
      files,
      project: await verifySandboxProjectIdentity({ environment: process.env }),
      options: {
        apply,
        reset,
        now: new Date(),
        recordHistory,
        ...(maxStatementsPerBatch ? { maxStatementsPerBatch } : {})
      }
    });

    if (result.overall === "BLOCKED") {
      console.error(formatFailures("Sandbox rebuild blocked by safety gate:", result.gate));
      process.exit(1);
    }
    if (result.overall === "FAILED") {
      const failed = result.batches.find((batch) => batch.status === "failed");
      console.error(`Sandbox rebuild FAILED at batch ${failed?.index ?? "?"} (${failed?.file ?? "reset"}): ${failed?.error ?? "unknown error"}`);
      if (outputPath) writeLog(outputPath, result);
      process.exit(1);
    }
    console.log(`Sandbox rebuild SUCCESS (${result.batches.length} batch(es), reset=${result.reset}).`);
    console.log("staging_source_writes: false");
    if (outputPath) writeLog(outputPath, result);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Sandbox rebuild failed.");
    process.exit(1);
  }
}

function writeLog(path, value) {
  const outputPath = resolve(process.cwd(), path);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
