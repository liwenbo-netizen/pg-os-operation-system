import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const allowedSegments = [
  "VIDEO_LONG_FORM",
  "SHORT_VIDEO_LIVE",
  "NEWS_SEARCH_BROWSER",
  "SOCIAL_COMMUNITY",
  "ECOMMERCE_RETAIL_MEDIA",
  "LOCAL_LIFE_TRAVEL",
  "GAME_H5_IAA",
  "WELLNESS_FEMALE_HEALTH",
  "UTILITY_TOOLS",
  "CTV_OTT_OEM",
  "SMART_HARDWARE",
  "AUDIO_PODCAST",
  "CAMPUS_YOUTH",
  "OUTDOOR_DOOH",
  "AI_APP_CONTENT",
  "OTHER_VERTICAL"
];

export const requiredSeedFields = [
  "seed_id",
  "media_name",
  "source_primary_segment_cn",
  "source_secondary_category_cn",
  "pg_ecosystem_segment_code",
  "pg_ecosystem_segment_cn",
  "media_type_initial",
  "primary_scene_initial",
  "potential_integration_methods",
  "ecosystem_status",
  "verification_status",
  "data_quality_level",
  "trust_status",
  "trusted_supply_candidate",
  "deal_ready_status",
  "recommended_trading_mode",
  "priority_level_seed",
  "owner_role_initial",
  "next_action",
  "forbidden_commitments",
  "trusted_supply_link_rule",
  "pmp_trading_link_rule",
  "source_name",
  "source_version",
  "source_file",
  "source_page",
  "seed_confidence",
  "import_batch_id",
  "review_required"
];

const expectedDefaults = {
  ecosystem_status: "ECOSYSTEM_MAPPED",
  verification_status: "UNVERIFIED",
  data_quality_level: "SEED_ONLY",
  trust_status: "NOT_VERIFIED",
  trusted_supply_candidate: "NO",
  deal_ready_status: "NOT_READY",
  recommended_trading_mode: "NEEDS_REVIEW",
  owner_role_initial: "media_manager"
};

const requiredForbiddenCommitmentPhrases = [
  "不可保底",
  "不可预付",
  "不可低消",
  "不可直接标记Sales Ready",
  "不可直接创建Programmatic Guaranteed"
];

const requiredTrustedSupplyRulePhrases = ["联系人确认", "广告位识别", "Impossible"];
const allowedSeedConfidence = new Set(["PARSED_TEXT", "APPENDIX_IMAGE_MANUAL"]);
const allowedSeedPriority = new Set(["A", "B", "C", "D"]);

function normalizeBooleanLike(value) {
  return String(value).trim().toUpperCase();
}

function countBy(rows, key) {
  const counts = new Map();

  for (const row of rows) {
    const value = String(row[key] ?? "").trim() || "(blank)";
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Object.fromEntries([...counts.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function findDuplicates(values) {
  const counts = new Map();

  for (const value of values) {
    if (!value) {
      continue;
    }

    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

function rowLabel(row, index) {
  return row.seed_id ? `${row.seed_id} (${row.media_name ?? "unknown"})` : `row ${index + 1}`;
}

export function validateChinaMediaSeedRows(rows, options = {}) {
  const expectedCount = options.expectedCount ?? 468;
  const failures = [];
  const warnings = [];

  if (!Array.isArray(rows)) {
    return {
      ok: false,
      failures: ["Seed JSON must be an array of opportunity rows."],
      warnings,
      summary: null
    };
  }

  if (rows.length !== expectedCount) {
    failures.push(`Expected ${expectedCount} seed rows, found ${rows.length}.`);
  }

  const duplicateSeedIds = findDuplicates(rows.map((row) => String(row.seed_id ?? "").trim()));
  for (const duplicate of duplicateSeedIds) {
    failures.push(`Duplicate seed_id ${duplicate.value} appears ${duplicate.count} times.`);
  }

  const duplicateSourceNames = findDuplicates(
    rows.map((row) => {
      const mediaName = String(row.media_name ?? "").trim().toLowerCase();
      const sourceVersion = String(row.source_version ?? "").trim().toLowerCase();
      return mediaName && sourceVersion ? `${mediaName}::${sourceVersion}` : "";
    })
  );
  for (const duplicate of duplicateSourceNames) {
    warnings.push(`Duplicate media_name/source_version key ${duplicate.value} appears ${duplicate.count} times.`);
  }

  rows.forEach((row, index) => {
    const label = rowLabel(row, index);

    for (const field of requiredSeedFields) {
      if (!(field in row) || row[field] === null || row[field] === undefined || String(row[field]).trim() === "") {
        failures.push(`${label} is missing required field ${field}.`);
      }
    }

    if (!allowedSegments.includes(row.pg_ecosystem_segment_code)) {
      failures.push(`${label} has unsupported pg_ecosystem_segment_code ${row.pg_ecosystem_segment_code}.`);
    }

    for (const [field, expectedValue] of Object.entries(expectedDefaults)) {
      if (String(row[field] ?? "").trim() !== expectedValue) {
        failures.push(`${label} must default ${field}=${expectedValue}; got ${row[field] ?? "(blank)"}.`);
      }
    }

    if (!allowedSeedPriority.has(String(row.priority_level_seed ?? "").trim())) {
      failures.push(`${label} has unsupported priority_level_seed ${row.priority_level_seed}.`);
    }

    if (!allowedSeedConfidence.has(String(row.seed_confidence ?? "").trim())) {
      failures.push(`${label} has unsupported seed_confidence ${row.seed_confidence}.`);
    }

    const reviewRequired = normalizeBooleanLike(row.review_required);
    if (!["TRUE", "FALSE"].includes(reviewRequired)) {
      failures.push(`${label} must use review_required TRUE or FALSE; got ${row.review_required}.`);
    }

    for (const phrase of requiredForbiddenCommitmentPhrases) {
      if (!String(row.forbidden_commitments ?? "").includes(phrase)) {
        failures.push(`${label} forbidden_commitments is missing "${phrase}".`);
      }
    }

    for (const phrase of requiredTrustedSupplyRulePhrases) {
      if (!String(row.trusted_supply_link_rule ?? "").includes(phrase)) {
        failures.push(`${label} trusted_supply_link_rule is missing "${phrase}".`);
      }
    }

    if (!String(row.pmp_trading_link_rule ?? "").includes("初始不可PMP")) {
      failures.push(`${label} pmp_trading_link_rule must explicitly keep seed rows out of PMP.`);
    }
  });

  const summary = {
    totalRows: rows.length,
    segments: countBy(rows, "pg_ecosystem_segment_code"),
    priority: countBy(rows, "priority_level_seed"),
    confidence: countBy(rows, "seed_confidence"),
    reviewRequired: countBy(rows, "review_required"),
    importBatches: countBy(rows, "import_batch_id"),
    duplicateMediaSourceKeys: duplicateSourceNames.length
  };

  return {
    ok: failures.length === 0,
    failures,
    warnings,
    summary
  };
}

function parseArgs(argv) {
  const args = {
    packagePath: process.env.PGOS_CHINA_MEDIA_SEED_PACKAGE,
    jsonPath: null,
    expectedCount: 468
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--package") {
      args.packagePath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--json") {
      args.jsonPath = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--expected-count") {
      args.expectedCount = Number(argv[index + 1]);
      index += 1;
    }
  }

  return args;
}

function resolveDefaultPackagePath(root) {
  const candidates = [
    process.env.PGOS_CHINA_MEDIA_SEED_PACKAGE,
    resolve(root, "PGOS_China_Media_Ecosystem_Seed_V0.1_Package.zip"),
    resolve(homedir(), "Documents", "PGOS_China_Media_Ecosystem_Seed_V0.1_Package.zip")
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate));
}

function readSeedJsonFromPackage(packagePath) {
  const result = spawnSync("tar", ["-xOf", packagePath, "PGOS_China_Media_Ecosystem_Seed_V0.1.json"], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `Failed to read seed JSON from ${packagePath}.`);
  }

  return result.stdout;
}

function loadRows(root, args) {
  if (args.jsonPath) {
    const jsonPath = resolve(root, args.jsonPath);
    return {
      source: jsonPath,
      rows: JSON.parse(readFileSync(jsonPath, "utf8"))
    };
  }

  const packagePath = args.packagePath ?? resolveDefaultPackagePath(root);
  if (!packagePath || !existsSync(packagePath)) {
    throw new Error(
      "China media seed package was not found. Pass --package <zip-path> or set PGOS_CHINA_MEDIA_SEED_PACKAGE."
    );
  }

  return {
    source: packagePath,
    rows: JSON.parse(readSeedJsonFromPackage(packagePath))
  };
}

function printCounts(title, counts) {
  console.log(`${title}:`);
  for (const [key, value] of Object.entries(counts)) {
    console.log(`- ${key}: ${value}`);
  }
}

function main() {
  const root = process.cwd();
  const args = parseArgs(process.argv.slice(2));
  const loaded = loadRows(root, args);
  const result = validateChinaMediaSeedRows(loaded.rows, { expectedCount: args.expectedCount });

  if (!result.ok) {
    console.error("China media ecosystem seed validation failed:");
    for (const failure of result.failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("China media ecosystem seed validation passed.");
  console.log(`Source: ${loaded.source}`);
  console.log(`Rows: ${result.summary.totalRows}`);
  printCounts("Segments", result.summary.segments);
  printCounts("Priority", result.summary.priority);
  printCounts("Confidence", result.summary.confidence);
  printCounts("Review required", result.summary.reviewRequired);
  printCounts("Import batches", result.summary.importBatches);
  console.log("Dry run only: no database writes were performed.");

  for (const warning of result.warnings) {
    console.warn(`Warning: ${warning}`);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}

