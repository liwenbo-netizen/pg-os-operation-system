import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const baselineVersion = "20260807120000";
export const baselineFileName = `${baselineVersion}_pg_os_canonical_baseline.sql`;

const legacyVersionPrefixes = [
  "202606290001", "202606290002", "202606290004", "202606290005", "202606290006",
  "202607020001", "202607020002", "202607020003", "202607040001", "202607100001",
  "202607120001", "202607160001", "202607170001", "202607170002", "202607170003",
  "202607170004", "202607220001", "202607260001", "202607270001", "202607280001",
  "202607280002", "202607280003", "202607290001", "202607300001"
];

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function candidateSha256(candidateFiles) {
  const hash = createHash("sha256");
  for (const name of Object.keys(candidateFiles).sort()) {
    hash.update(name);
    hash.update("\0");
    hash.update(candidateFiles[name]);
    hash.update("\0");
  }
  return hash.digest("hex");
}

export function readYamlFlat(text) {
  const flat = {};
  const stack = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const indent = line.length - line.trimStart().length;
    while (stack.length > 0 && stack[stack.length - 1].indent >= indent) stack.pop();
    const key = line.trim().split(":", 1)[0];
    const value = line.trim().slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
    const path = [...stack.map((entry) => entry.key), key].join(".");
    if (value) flat[path] = value;
    else stack.push({ key, indent });
  }
  return flat;
}

export function validateMigrationChain({ manifest, migrationFiles, candidateFiles }) {
  const failures = [];
  const requiredManifest = [
    "canonical_baseline.version",
    "canonical_baseline.adopted_from",
    "canonical_baseline.candidate_sha256",
    "canonical_baseline.canonical_file_sha256",
    "canonical_baseline.semantic_hash"
  ];
  for (const key of requiredManifest) {
    if (!manifest[key]) failures.push(`manifest is missing ${key}.`);
  }

  const entries = Object.entries(migrationFiles).filter(([name]) => name.endsWith(".sql"));
  if (entries.length === 0) failures.push("supabase/migrations contains no SQL migration.");

  const versions = entries.map(([name]) => name.split("_", 1)[0]);
  if (new Set(versions).size !== versions.length) failures.push("migration versions must be unique.");
  if (versions.some((version) => !/^\d{12,14}$/.test(version))) {
    failures.push("migration versions must be 12-14 digit numeric prefixes.");
  }
  if (!entries.some(([name]) => name === baselineFileName)) {
    failures.push(`canonical baseline file ${baselineFileName} is missing from supabase/migrations.`);
  }
  const minVersion = versions.length ? [...versions].sort()[0] : null;
  if (minVersion !== baselineVersion) {
    failures.push(`canonical baseline ${baselineVersion} must be the first item in the chain (found first=${minVersion}).`);
  }
  if (versions.some((version) => legacyVersionPrefixes.includes(version))) {
    failures.push("a legacy pre-baseline migration version re-entered the active chain.");
  }
  if (entries.some(([name]) => name !== baselineFileName && name.split("_", 1)[0] <= baselineVersion)) {
    failures.push("migrations after the baseline must have versions newer than the baseline cutoff.");
  }
  const sortedVersions = entries.map(([name]) => name.split("_", 1)[0]).sort();
  if (sortedVersions.join(",") !== versions.join(",")) {
    failures.push("migration files must be ordered by strictly increasing version.");
  }

  const baselineContent = migrationFiles[baselineFileName];
  if (baselineContent !== undefined) {
    if (manifest["canonical_baseline.canonical_file_sha256"] && sha256(baselineContent) !== manifest["canonical_baseline.canonical_file_sha256"]) {
      failures.push("canonical baseline file hash does not match the manifest; the baseline may have been modified.");
    }
  }

  const ext = candidateFiles["00_extensions.sql"];
  const schema = candidateFiles["10_public_schema.sql"];
  if (ext === undefined || schema === undefined) {
    failures.push("candidate baseline files are incomplete for semantic hash verification.");
  } else {
    const candidateHash = candidateSha256(candidateFiles);
    if (manifest["canonical_baseline.candidate_sha256"] && candidateHash !== manifest["canonical_baseline.candidate_sha256"]) {
      failures.push("candidate baseline hash does not match the frozen manifest hash.");
    }
    const concat = ext + "\n" + schema;
    if (baselineContent !== undefined && baselineContent !== concat) {
      failures.push("canonical migration content is not byte-identical to the proven candidate baseline concatenation.");
    }
    if (manifest["canonical_baseline.semantic_hash"] && sha256(concat) !== manifest["canonical_baseline.semantic_hash"]) {
      failures.push("canonical baseline semantic hash does not match the manifest.");
    }
  }

  return [...new Set(failures)];
}

function main() {
  const root = process.cwd();
  const manifestPath = `${root}/supabase/baseline/manifest.yaml`;
  const migrationsDir = `${root}/supabase/migrations`;
  const candidateDir = `${root}/supabase/baseline-candidate`;
  const legacyDir = `${root}/supabase/migrations-legacy/pre-canonical-baseline`;

  const failures = [];
  let migrationFiles = {};
  if (!existsSync(manifestPath)) failures.push("supabase/baseline/manifest.yaml is missing.");
  if (!existsSync(migrationsDir)) failures.push("supabase/migrations is missing.");
  if (!existsSync(candidateDir)) failures.push("supabase/baseline-candidate is missing.");
  if (!existsSync(legacyDir)) failures.push("supabase/migrations-legacy/pre-canonical-baseline is missing.");

  let result = [];
  if (failures.length === 0) {
    const manifest = readYamlFlat(readFileSync(manifestPath, "utf8"));
    migrationFiles = Object.fromEntries(
      readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).map((name) => [name, readFileSync(`${migrationsDir}/${name}`, "utf8")])
    );
    const candidateFiles = Object.fromEntries(
      readdirSync(candidateDir).filter((name) => name.endsWith(".sql")).map((name) => [name, readFileSync(`${candidateDir}/${name}`, "utf8")])
    );
    result = validateMigrationChain({ manifest, migrationFiles, candidateFiles });
  }
  const legacyCount = existsSync(legacyDir) ? readdirSync(legacyDir).filter((name) => name.endsWith(".sql")).length : 0;
  if (legacyCount !== 24) failures.push(`legacy archive must contain 24 migrations (found ${legacyCount}).`);

  const allFailures = [...new Set([...failures, ...result])];
  if (allFailures.length > 0) {
    console.error("Migration chain validation failed:");
    for (const failure of allFailures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log("Migration chain validation passed.");
  console.log(`canonical_baseline: ${baselineVersion}`);
  console.log(`active_chain_files: ${Object.keys(migrationFiles).length}`);
  console.log("legacy_active_chain: false");
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
