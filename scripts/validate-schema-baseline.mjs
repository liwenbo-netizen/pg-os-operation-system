import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  findDangerousDdl,
  findHistoryRepair,
  findSecrets,
  findTopLevelDml,
  formatFailures,
  sourceConnectionPatterns
} from "./baselineSafety.mjs";

export function validateSchemaBaseline(files) {
  const failures = [];
  const review = [];
  const entries = Object.entries(files);
  if (entries.length === 0) {
    return { failures: ["No candidate baseline files were provided."], review };
  }

  for (const [name, sql] of entries) {
    if (!sql || !sql.trim()) {
      failures.push(`${name} is empty.`);
      continue;
    }

    const secrets = findSecrets(sql);
    if (secrets.length > 0) {
      failures.push(`${name} contains secret-like content (${secrets.join(", ")}).`);
    }

    const dml = findTopLevelDml(sql);
    if (dml.length > 0) {
      failures.push(`${name} contains top-level data DML: ${dml[0].slice(0, 80)}...`);
    }

    const dangerous = findDangerousDdl(sql);
    if (dangerous.length > 0) {
      failures.push(`${name} contains dangerous DDL: ${dangerous.join(" | ")}.`);
    }

    const history = findHistoryRepair(sql);
    if (history.length > 0) {
      failures.push(`${name} contains migration-history repair references (${history.join(", ")}).`);
    }

    const connection = sourceConnectionPatterns.filter((pattern) => pattern.test(sql));
    if (connection.length > 0) {
      failures.push(`${name} contains source/production connection information (${connection.join(", ")}).`);
    }

    const ownerLines = sql
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^alter\s+(table|function|sequence|view|type|schema)\s+.+owner\s+to\s+/i.test(line));
    if (ownerLines.length > 0) {
      review.push(`${name}: ${ownerLines.length} non-portable OWNER statement(s) require review.`);
    }

    const environmentGrants = sql
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => /^grant\b/i.test(line) && !/(to\s+"?(anon|authenticated|service_role|authenticator)"?\b)/i.test(line));
    if (environmentGrants.length > 0) {
      review.push(`${name}: ${environmentGrants.length} environment-specific GRANT statement(s) require review.`);
    }
  }

  return { failures: [...new Set(failures)], review: [...new Set(review)] };
}

function readCandidateDirectory(root = process.cwd()) {
  const directory = `${root}/supabase/baseline-candidate`;
  if (!existsSync(directory)) {
    throw new Error("supabase/baseline-candidate does not exist.");
  }
  const files = {};
  for (const entry of readdirSync(directory).sort()) {
    if (entry.endsWith(".sql")) {
      files[entry] = readFileSync(`${directory}/${entry}`, "utf8");
    }
  }
  return { directory, files };
}

function main() {
  try {
    const { directory, files } = readCandidateDirectory();
    const result = validateSchemaBaseline(files);
    for (const item of result.review) console.log(`[review] ${item}`);
    if (result.failures.length > 0) {
      console.error(formatFailures("Candidate schema baseline validation failed:", result.failures));
      process.exit(1);
    }
    console.log(`Candidate schema baseline validation passed (${Object.keys(files).length} SQL file(s) in ${directory}).`);
    console.log("Candidate files are NOT part of the formal migration chain.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Candidate schema baseline validation failed.");
    process.exit(1);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
