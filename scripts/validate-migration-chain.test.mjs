import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  baselineFileName,
  baselineVersion,
  candidateSha256,
  sha256,
  validateMigrationChain
} from "./validate-migration-chain.mjs";

const candidateFiles = {
  "00_extensions.sql": "create extension if not exists \"pgcrypto\" with schema \"extensions\";\n",
  "10_public_schema.sql": "create table public.publishers (id uuid primary key);\n"
};
const concat = candidateFiles["00_extensions.sql"] + "\n" + candidateFiles["10_public_schema.sql"];
const manifest = {
  "canonical_baseline.version": baselineVersion,
  "canonical_baseline.adopted_from": "CX-0193",
  "canonical_baseline.candidate_sha256": candidateSha256(candidateFiles),
  "canonical_baseline.canonical_file_sha256": sha256(concat),
  "canonical_baseline.semantic_hash": sha256(concat)
};
const migrationFiles = { [baselineFileName]: concat };

describe("validateMigrationChain", () => {
  it("keeps the repository canonical SQL in LF form", () => {
    const canonical = readFileSync(`supabase/migrations/${baselineFileName}`, "utf8");
    const candidate = readFileSync("supabase/baseline-candidate/10_public_schema.sql", "utf8");
    expect(canonical).not.toContain("\r");
    expect(candidate).not.toContain("\r");
  });

  it("passes a valid canonical chain with baseline only", () => {
    expect(validateMigrationChain({ manifest, migrationFiles, candidateFiles })).toEqual([]);
  });

  it("fails when the baseline file is missing", () => {
    const failures = validateMigrationChain({ manifest, migrationFiles: {}, candidateFiles });
    expect(failures.some((failure) => failure.includes("missing"))).toBe(true);
  });

  it("fails when a legacy version re-enters the active chain", () => {
    const files = {
      [baselineFileName]: concat,
      "202606290001_reentry.sql": "select 1;"
    };
    const failures = validateMigrationChain({ manifest, migrationFiles: files, candidateFiles });
    expect(failures.some((failure) => failure.includes("re-entered"))).toBe(true);
  });

  it("fails when the baseline content is modified", () => {
    const files = { [baselineFileName]: concat + "select 999;\n" };
    const failures = validateMigrationChain({ manifest, migrationFiles: files, candidateFiles });
    expect(failures.some((failure) => failure.includes("modified"))).toBe(true);
  });

  it("fails when a migration has a version at or before the baseline cutoff", () => {
    const files = {
      [baselineFileName]: concat,
      "20260807120000_dup.sql": "select 1;"
    };
    const failures = validateMigrationChain({ manifest, migrationFiles: files, candidateFiles });
    expect(failures.some((failure) => failure.includes("cutoff"))).toBe(true);
  });

  it("fails when manifest hashes do not match", () => {
    const badManifest = { ...manifest, "canonical_baseline.candidate_sha256": "0".repeat(64) };
    const failures = validateMigrationChain({ manifest: badManifest, migrationFiles, candidateFiles });
    expect(failures.some((failure) => failure.includes("frozen manifest hash"))).toBe(true);
  });
});
