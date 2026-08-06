import { fileURLToPath } from "node:url";
import { diffResultPasses } from "./db-schema-diff.mjs";

export function evaluateReconstructability({ rebuildLogs, diff }) {
  const reasons = [];

  if (!Array.isArray(rebuildLogs) || rebuildLogs.length === 0) {
    reasons.push("No sandbox rebuild log was provided.");
  } else {
    if (rebuildLogs.length < 2) {
      reasons.push("At least two rebuilds (first + rebuild after cleanup) are required.");
    }
    const failed = rebuildLogs.filter((log) => log.overall !== "SUCCESS");
    if (failed.length > 0) {
      reasons.push(`${failed.length} rebuild log(s) are not SUCCESS.`);
    }
    for (const log of rebuildLogs) {
      if (log.overall === "SUCCESS" && log.batches?.some((batch) => batch.status === "failed")) {
        reasons.push("A SUCCESS log contains failed batches; this is not allowed.");
      }
    }
  }

  if (!diff || typeof diff !== "object") {
    reasons.push("No normalized schema diff result was provided.");
  } else {
    if (!diffResultPasses(diff)) {
      reasons.push(`Normalized schema diff has ${diff.unexplained_differences?.length ?? "unknown"} unexplained difference(s).`);
    }
    if (Array.isArray(diff.missing_tables) && diff.missing_tables.length > 0) {
      reasons.push(`Missing tables: ${diff.missing_tables.join(", ")}`);
    }
    if (Array.isArray(diff.extra_tables) && diff.extra_tables.length > 0) {
      reasons.push(`Extra tables: ${diff.extra_tables.join(", ")}`);
    }
  }

  const hasExecutionFailure = (rebuildLogs ?? []).some((log) =>
    log.overall === "FAILED" || log.batches?.some((batch) => batch.status === "failed")
  );
  return {
    status: reasons.length === 0 ? "PROVEN" : hasExecutionFailure ? "FAILED" : "NOT_PROVEN",
    reasons
  };
}

async function main() {
  const logsArg = process.argv.find((arg) => arg.startsWith("--logs="))?.slice("--logs=".length);
  const diffArg = process.argv.find((arg) => arg.startsWith("--diff="))?.slice("--diff=".length);
  if (!logsArg || !diffArg) {
    console.error("Usage: validate-baseline-reconstructability --logs=<json1,json2> --diff=<json>");
    process.exit(1);
  }
  try {
    const { readFileSync } = await import("node:fs");
    const rebuildLogs = logsArg.split(",").map((path) => JSON.parse(readFileSync(path, "utf8")));
    const diff = JSON.parse(readFileSync(diffArg, "utf8"));
    const result = evaluateReconstructability({ rebuildLogs, diff });
    console.log(`baseline_reconstructability: ${result.status}`);
    for (const reason of result.reasons) console.log(`- ${reason}`);
    if (result.status !== "PROVEN") process.exit(1);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Reconstructability evaluation failed.");
    process.exit(1);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
