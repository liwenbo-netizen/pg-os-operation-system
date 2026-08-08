import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const compatibilityManifestPath = "supabase/migration-history-compatibility/manifest.json";

export function legacyLedgerVersions(first = 0, last = 65) {
  return Array.from({ length: last - first + 1 }, (_, index) => String(first + index).padStart(3, "0"));
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function validateCompatibilityManifest(manifest) {
  const failures = [];
  const expected = legacyLedgerVersions();
  if (manifest?.version !== 1) failures.push("compatibility manifest version must equal 1.");
  if (manifest?.strategy !== "runtime_ledger_marker_adapter") {
    failures.push("compatibility strategy must be runtime_ledger_marker_adapter.");
  }
  if (manifest?.remote_legacy_history?.first !== expected[0]) {
    failures.push("remote legacy history must begin at 000.");
  }
  if (manifest?.remote_legacy_history?.last !== expected.at(-1)) {
    failures.push("remote legacy history must end at 065.");
  }
  if (manifest?.remote_legacy_history?.count !== expected.length) {
    failures.push("remote legacy history count must equal 66.");
  }
  if (manifest?.remote_legacy_history?.original_sql_available !== false) {
    failures.push("the manifest must not claim that original legacy SQL is available.");
  }
  if (!/^\d{12,14}$/.test(manifest?.canonical_baseline?.version ?? "")) {
    failures.push("canonical baseline version must be a 12-14 digit value.");
  }
  if (manifest?.canonical_baseline?.file !== `${manifest?.canonical_baseline?.version}_pg_os_canonical_baseline.sql`) {
    failures.push("canonical baseline file must match its declared version.");
  }
  if (!/^[a-f0-9]{64}$/.test(manifest?.canonical_baseline?.sha256 ?? "")) {
    failures.push("canonical baseline sha256 must be a lowercase SHA-256 value.");
  }
  const policy = manifest?.execution_policy ?? {};
  if (policy.repository_active_chain !== "canonical_only") {
    failures.push("repository active chain must remain canonical_only.");
  }
  if (policy.compatibility_markers !== "runtime_temp_only") {
    failures.push("compatibility markers must remain runtime_temp_only.");
  }
  if (policy.marker_sql !== "select 1;") failures.push("marker SQL must remain the no-op select 1; statement.");
  for (const key of ["remote_schema_writes_allowed", "remote_data_writes_allowed", "remote_history_writes_allowed"]) {
    if (policy[key] !== false) failures.push(`${key} must equal false.`);
  }
  return failures;
}

export function loadCompatibilityManifest(root = process.cwd()) {
  return JSON.parse(readFileSync(join(root, compatibilityManifestPath), "utf8"));
}

export function validateRepositoryCompatibilityContract(root, manifest) {
  const failures = validateCompatibilityManifest(manifest);
  const migrationsDirectory = join(root, "supabase", "migrations");
  const sqlFiles = readdirSync(migrationsDirectory).filter((name) => name.endsWith(".sql")).sort();
  if (sqlFiles.length !== 1 || sqlFiles[0] !== manifest.canonical_baseline.file) {
    failures.push("repository active migration chain must contain only the canonical baseline.");
  }
  if (sqlFiles.some((name) => /^\d{3}_remote_legacy_history_marker\.sql$/.test(name))) {
    failures.push("runtime compatibility markers must not enter supabase/migrations.");
  }
  const canonicalPath = join(migrationsDirectory, manifest.canonical_baseline.file);
  const canonical = readFileSync(canonicalPath, "utf8");
  if (sha256(canonical) !== manifest.canonical_baseline.sha256) {
    failures.push("canonical baseline hash does not match the compatibility manifest.");
  }
  return failures;
}

export function materializeCompatibilityMigrations({ destinationDirectory, repositoryRoot, manifest }) {
  mkdirSync(destinationDirectory, { recursive: true });
  const markerFiles = legacyLedgerVersions().map((version) => {
    const file = `${version}_remote_legacy_history_marker.sql`;
    writeFileSync(
      join(destinationDirectory, file),
      "-- Remote legacy ledger compatibility marker; intentionally no schema or data mutation.\nselect 1;\n",
      "utf8"
    );
    return file;
  });
  copyFileSync(
    join(repositoryRoot, "supabase", "migrations", manifest.canonical_baseline.file),
    join(destinationDirectory, manifest.canonical_baseline.file)
  );
  return [...markerFiles, manifest.canonical_baseline.file];
}

export function parseMigrationList(output) {
  const rows = [];
  for (const line of String(output).split(/\r?\n/)) {
    const match = /^\s*(\d*)\s*\|\s*(\d*)\s*\|/.exec(line);
    if (!match || (!match[1] && !match[2])) continue;
    rows.push({ local: match[1], remote: match[2] });
  }
  return rows;
}

export function parseDryRunPlan(output) {
  return String(output)
    .split(/\r?\n/)
    .map((line) => /[•*]\s+([^\s]+\.sql)\s*$/.exec(line)?.[1] ?? null)
    .filter(Boolean);
}

export function validateRemoteProbe({ migrationRows, defaultPlan, includeAllPlan, manifest }) {
  const failures = [];
  const expectedLegacy = legacyLedgerVersions();
  const rowByLocal = new Map(migrationRows.map((row) => [row.local, row]));
  for (const version of expectedLegacy) {
    const row = rowByLocal.get(version);
    if (!row || row.remote !== version) failures.push(`legacy ledger version ${version} is not aligned.`);
  }
  const canonical = rowByLocal.get(manifest.canonical_baseline.version);
  if (!canonical || canonical.remote) failures.push("canonical baseline must be local-only before Gate B.");
  const expectedPlan = [manifest.canonical_baseline.file];
  if (JSON.stringify(defaultPlan) !== JSON.stringify(expectedPlan)) {
    failures.push(`default dry-run must plan only ${manifest.canonical_baseline.file}.`);
  }
  if (JSON.stringify(includeAllPlan) !== JSON.stringify(expectedPlan)) {
    failures.push(`include-all dry-run must plan only ${manifest.canonical_baseline.file}.`);
  }
  const expectedRows = expectedLegacy.length + 1;
  if (migrationRows.length !== expectedRows) {
    failures.push(`migration list must contain exactly ${expectedRows} compatibility rows.`);
  }
  return failures;
}

export function redactCliOutput(output, secrets) {
  return secrets.filter(Boolean).reduce(
    (redacted, secret) => redacted.replaceAll(secret, "<redacted>"),
    String(output ?? "")
  );
}
