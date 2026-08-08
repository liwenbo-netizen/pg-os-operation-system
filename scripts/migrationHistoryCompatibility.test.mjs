import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  legacyLedgerVersions,
  materializeCompatibilityMigrations,
  parseDryRunPlan,
  parseMigrationList,
  redactCliOutput,
  validateCompatibilityManifest,
  validateRemoteProbe,
  validateRepositoryCompatibilityContract
} from "./migrationHistoryCompatibility.mjs";

const manifest = {
  version: 1,
  strategy: "runtime_ledger_marker_adapter",
  remote_legacy_history: { first: "000", last: "065", count: 66, original_sql_available: false },
  canonical_baseline: {
    version: "20260807120000",
    file: "20260807120000_pg_os_canonical_baseline.sql",
    sha256: "0f78eb8a4da3304c0a9f4b749e16663bd3f895ad01adc5242bf009d64d0d65e0"
  },
  execution_policy: {
    repository_active_chain: "canonical_only",
    compatibility_markers: "runtime_temp_only",
    marker_sql: "select 1;",
    remote_schema_writes_allowed: false,
    remote_data_writes_allowed: false,
    remote_history_writes_allowed: false
  }
};

function alignedRows() {
  return [
    ...legacyLedgerVersions().map((version) => ({ local: version, remote: version })),
    { local: manifest.canonical_baseline.version, remote: "" }
  ];
}

describe("migration history compatibility adapter", () => {
  it("defines exactly the preserved 000-065 remote ledger range", () => {
    const versions = legacyLedgerVersions();
    expect(versions).toHaveLength(66);
    expect(versions[0]).toBe("000");
    expect(versions.at(-1)).toBe("065");
    expect(validateCompatibilityManifest(manifest)).toEqual([]);
  });

  it("rejects a widened or write-capable compatibility contract", () => {
    const invalid = structuredClone(manifest);
    invalid.remote_legacy_history.last = "066";
    invalid.execution_policy.remote_history_writes_allowed = true;
    const failures = validateCompatibilityManifest(invalid);
    expect(failures.some((failure) => failure.includes("065"))).toBe(true);
    expect(failures.some((failure) => failure.includes("remote_history_writes_allowed"))).toBe(true);
  });

  it("materializes markers only in a caller-owned temporary directory", () => {
    const root = process.cwd();
    const temp = mkdtempSync(join(tmpdir(), "pgos-cx0195-test-"));
    try {
      const files = materializeCompatibilityMigrations({ destinationDirectory: temp, repositoryRoot: root, manifest });
      expect(files).toHaveLength(67);
      expect(readdirSync(temp).filter((name) => name.endsWith(".sql"))).toHaveLength(67);
      expect(readFileSync(join(temp, "000_remote_legacy_history_marker.sql"), "utf8")).toContain("select 1;");
      expect(validateRepositoryCompatibilityContract(root, manifest)).toEqual([]);
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });

  it("parses the Supabase migration list and canonical-only dry-run plan", () => {
    const list = " 000 | 000 | 000\n 065 | 065 | 065\n 20260807120000 | | 2026-08-07 12:00:00";
    expect(parseMigrationList(list)).toEqual([
      { local: "000", remote: "000" },
      { local: "065", remote: "065" },
      { local: "20260807120000", remote: "" }
    ]);
    expect(parseDryRunPlan("Would push these migrations:\n • 20260807120000_pg_os_canonical_baseline.sql"))
      .toEqual([manifest.canonical_baseline.file]);
    expect(parseDryRunPlan(`stdout\nstderr plan:\n * ${manifest.canonical_baseline.file}`))
      .toEqual([manifest.canonical_baseline.file]);
  });

  it("accepts only full legacy alignment with canonical as the sole planned migration", () => {
    expect(validateRemoteProbe({
      migrationRows: alignedRows(),
      defaultPlan: [manifest.canonical_baseline.file],
      includeAllPlan: [manifest.canonical_baseline.file],
      manifest
    })).toEqual([]);
  });

  it("fails on missing legacy history or unexpected planned migrations", () => {
    const failures = validateRemoteProbe({
      migrationRows: alignedRows().filter((row) => row.local !== "027"),
      defaultPlan: [manifest.canonical_baseline.file, "20260808120000_unexpected.sql"],
      includeAllPlan: [manifest.canonical_baseline.file],
      manifest
    });
    expect(failures.some((failure) => failure.includes("027"))).toBe(true);
    expect(failures.some((failure) => failure.includes("default dry-run"))).toBe(true);
  });

  it("redacts database URLs and passwords from captured CLI output", () => {
    const url = "postgresql://postgres.example:password@host.example/postgres";
    const output = redactCliOutput(`failed for ${url} password`, [url, "password"]);
    expect(output).not.toContain(url);
    expect(output).not.toContain("password");
  });
});
