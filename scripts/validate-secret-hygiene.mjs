import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const requiredEnvExampleKeys = [
  "VITE_SUPABASE_URL",
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "APP_ENV",
  "APP_BASE_URL",
  "PGOS_UAT_EMAIL_DOMAIN",
  "PGOS_UAT_EMAIL_PREFIX",
  "PGOS_UAT_DEFAULT_PASSWORD"
];

export const requiredGitignorePatterns = [
  "node_modules/",
  "dist/",
  ".vite/",
  ".env",
  ".env.*",
  "!.env.example",
  "*.log"
];

const ignoredDirectories = new Set([
  ".git",
  "node_modules",
  "dist",
  ".vite",
  "coverage",
  "playwright-report",
  "test-results"
]);

const textExtensions = new Set([
  "",
  ".css",
  ".d.ts",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml"
]);

const highRiskEnvKeys = new Set([
  "VITE_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "PGOS_UAT_DEFAULT_PASSWORD"
]);

const allowedLiteralValues = new Set([
  "",
  "development",
  "local",
  "test",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "pgos-uat.local"
]);

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function stripQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

export function isPlaceholderValue(value) {
  const normalized = stripQuotes(value);
  if (allowedLiteralValues.has(normalized)) {
    return true;
  }

  return /^(<[^>]+>|your[-_].+|change[-_]?me|placeholder|example|https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?)$/i.test(
    normalized
  );
}

export function parseEnvExample(contents) {
  const values = new Map();

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1);

    if (key) {
      values.set(key, value);
    }
  }

  return values;
}

export function validateEnvExample(contents) {
  const values = parseEnvExample(contents);
  const failures = [];

  for (const key of requiredEnvExampleKeys) {
    if (!values.has(key)) {
      failures.push(`.env.example is missing ${key}.`);
    }
  }

  for (const [key, value] of values.entries()) {
    const keyLooksSensitive = highRiskEnvKeys.has(key) || /(SECRET|PASSWORD|TOKEN)$/i.test(key);
    if (keyLooksSensitive && !isPlaceholderValue(value)) {
      failures.push(`.env.example contains a non-placeholder value for ${key}.`);
    }
  }

  return failures;
}

export function validateGitignore(contents) {
  const patterns = new Set(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
  );

  return requiredGitignorePatterns
    .filter((pattern) => !patterns.has(pattern))
    .map((pattern) => `.gitignore is missing ${pattern}.`);
}

function shouldSkipPath(root, path) {
  const relativePath = normalizePath(relative(root, path));
  const parts = relativePath.split("/");
  const fileName = basename(path);

  if (parts.some((part) => ignoredDirectories.has(part))) {
    return true;
  }

  if (fileName.startsWith(".env") && fileName !== ".env.example") {
    return true;
  }

  return false;
}

function isTextCandidate(path) {
  if (basename(path) === ".gitignore" || basename(path) === ".env.example") {
    return true;
  }

  return textExtensions.has(extname(path));
}

export function scanTextForSecrets(relativePath, contents) {
  const findings = [];
  const patterns = [
    {
      id: "jwt-like-token",
      regex: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g
    },
    {
      id: "supabase-service-role-assignment",
      regex: /SUPABASE_SERVICE_ROLE_KEY[^\S\r\n]*=[^\S\r\n]*(?!(?:$|["']?[^\S\r\n]*$|["']?(?:<[^>]+>|your[-_].+|change[-_]?me|placeholder)))[^\r\n]+/gim
    },
    {
      id: "uat-password-assignment",
      regex: /PGOS_UAT_DEFAULT_PASSWORD[^\S\r\n]*=[^\S\r\n]*(?!(?:$|["']?[^\S\r\n]*$|["']?(?:<[^>]+>|your[-_].+|change[-_]?me|placeholder)))[^\r\n]+/gim
    },
    {
      id: "private-key-block",
      regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/g
    }
  ];

  const lineStarts = [0];
  for (let index = 0; index < contents.length; index += 1) {
    if (contents[index] === "\n") {
      lineStarts.push(index + 1);
    }
  }

  for (const pattern of patterns) {
    for (const match of contents.matchAll(pattern.regex)) {
      const offset = match.index ?? 0;
      let line = 1;
      for (let index = 0; index < lineStarts.length; index += 1) {
        if (lineStarts[index] > offset) {
          break;
        }
        line = index + 1;
      }

      findings.push({
        file: relativePath,
        line,
        pattern: pattern.id
      });
    }
  }

  return findings;
}

function collectTextFiles(root, currentPath = root, files = []) {
  for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
    const fullPath = join(currentPath, entry.name);

    if (shouldSkipPath(root, fullPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      collectTextFiles(root, fullPath, files);
      continue;
    }

    if (!entry.isFile() || !isTextCandidate(fullPath)) {
      continue;
    }

    const stats = statSync(fullPath);
    if (stats.size > 1024 * 1024) {
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function scanWorkspace(root) {
  const findings = [];
  const files = collectTextFiles(root);

  for (const file of files) {
    const relativePath = normalizePath(relative(root, file));
    const contents = readFileSync(file, "utf8");
    findings.push(...scanTextForSecrets(relativePath, contents));
  }

  return {
    filesScanned: files.length,
    findings
  };
}

function git(root, args) {
  const result = spawnSync("git", args, {
    cwd: root,
    encoding: "utf8"
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim()
  };
}

function trackedEnvFiles(root) {
  const result = git(root, ["ls-files", "--", ".env", ".env.local", ".env.*"]);
  if (!result.ok) {
    return {
      files: [],
      error: result.stderr || "git ls-files failed."
    };
  }

  return {
    files: result.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && line !== ".env.example"),
    error: null
  };
}

function gitStatusSummary(root) {
  const result = git(root, ["status", "--short"]);
  if (!result.ok) {
    return {
      count: 0,
      error: result.stderr || "git status failed."
    };
  }

  return {
    count: result.stdout ? result.stdout.split(/\r?\n/).filter(Boolean).length : 0,
    error: null
  };
}

function main() {
  const root = process.cwd();
  const failures = [];
  const warnings = [];

  const gitignorePath = resolve(root, ".gitignore");
  const envExamplePath = resolve(root, ".env.example");

  if (!existsSync(gitignorePath)) {
    failures.push(".gitignore is missing.");
  } else {
    failures.push(...validateGitignore(readFileSync(gitignorePath, "utf8")));
  }

  if (!existsSync(envExamplePath)) {
    failures.push(".env.example is missing.");
  } else {
    failures.push(...validateEnvExample(readFileSync(envExamplePath, "utf8")));
  }

  const trackedEnv = trackedEnvFiles(root);
  if (trackedEnv.error) {
    warnings.push(trackedEnv.error);
  } else if (trackedEnv.files.length > 0) {
    failures.push(`Local env files are tracked by Git: ${trackedEnv.files.join(", ")}.`);
  }

  const scan = scanWorkspace(root);
  for (const finding of scan.findings) {
    failures.push(`Potential secret pattern ${finding.pattern} in ${finding.file}:${finding.line}.`);
  }

  const status = gitStatusSummary(root);
  if (status.error) {
    warnings.push(status.error);
  } else if (status.count > 0) {
    warnings.push(`Git baseline has ${status.count} pending path(s); create the baseline commit after final review.`);
  }

  if (failures.length > 0) {
    console.error("Secret hygiene validation failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Secret hygiene validation passed.");
  console.log(`Checked .gitignore, .env.example, Git env tracking, and ${scan.filesScanned} text files.`);

  for (const warning of warnings) {
    console.warn(`Warning: ${warning}`);
  }
}

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
