// Shared safety helpers for CX-0193 canonical schema baseline tooling.
// Read-only by default; every write-capable command re-checks the environment gate.

export const projectRefPattern = /^[a-z0-9]{20}$/;

export const secretPatterns = [
  /eyJ[A-Za-z0-9_-]{20,}/,
  /postgres(ql)?:\/\/[^\s"']+/,
  /sk_(live|secret)_[A-Za-z0-9]{10,}/,
  /sbp_[A-Za-z0-9]{10,}/,
  /sb_secret_[A-Za-z0-9]{10,}/,
  /db\.[a-z0-9]{20}\.supabase\.co/
];

export const dangerousDdlPatterns = [
  /^\s*drop\s+database\b/im,
  /^\s*drop\s+schema\s+[^\s;]+\s+cascade\b/im,
  /^\s*truncate\b/im,
  /^\s*drop\s+table\b/im,
  /^\s*drop\s+sequence\b/im
];

export const migrationHistoryRepairPatterns = [
  /\bsupabase_migrations\b/i,
  /^\s*(insert|update|delete|merge)\s+into\s+[a-z0-9_"]*schema_migrations\b/im
];

export const sourceConnectionPatterns = [
  /db\.[a-z0-9]{20}\.supabase\.co/,
  /supabase\.co/,
  /postgres(ql)?:\/\//
];

export function normalizeRef(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeHost(value) {
  return typeof value === "string" ? value.trim().toLowerCase().replace(/\.$/, "") : "";
}

export function parseDate(value) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function formatFailures(title, failures) {
  return [title, ...failures.map((failure) => `- ${failure}`)].join("\n");
}

// Split SQL into top-level statements while ignoring function bodies ($$ ... $$),
// quoted strings, double-quoted identifiers and line/block comments.
export function splitTopLevelStatements(sql) {
  const statements = [];
  let current = "";
  let inFunctionBody = false;
  let i = 0;
  while (i < sql.length) {
    const ch = sql[i];
    const next = sql[i + 1] ?? "";
    if (ch === "-" && next === "-") {
      const end = sql.indexOf("\n", i);
      i = end === -1 ? sql.length : end + 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = sql.indexOf("*/", i + 2);
      i = end === -1 ? sql.length : end + 2;
      continue;
    }
    if (ch === "$" && next === "$") {
      inFunctionBody = !inFunctionBody;
      current += ch;
      i += 1;
      continue;
    }
    if (!inFunctionBody && (ch === "'" || ch === '"')) {
      const quote = ch;
      current += ch;
      i += 1;
      while (i < sql.length) {
        current += sql[i];
        if (sql[i] === quote && sql[i - 1] !== "\\") {
          if (quote === "'" && sql[i + 1] === "'") {
            current += sql[i + 1];
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (!inFunctionBody && ch === ";") {
      const statement = current.trim();
      if (statement) statements.push(statement);
      current = "";
      i += 1;
      continue;
    }
    current += ch;
    i += 1;
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

export function findTopLevelDml(sql) {
  return splitTopLevelStatements(sql).filter((statement) =>
    /^\s*(insert|update|delete|copy|merge|call)\b/i.test(statement)
  );
}

export function findDangerousDdl(sql) {
  const matches = [];
  for (const pattern of dangerousDdlPatterns) {
    const match = pattern.exec(sql);
    if (match) matches.push(match[0].trim());
  }
  return [...new Set(matches)];
}

export function findSecrets(sql) {
  const matches = [];
  for (const pattern of secretPatterns) {
    const match = pattern.exec(sql);
    if (match) matches.push(pattern.source);
  }
  return [...new Set(matches)];
}

export function findHistoryRepair(sql) {
  return migrationHistoryRepairPatterns
    .map((pattern) => (pattern.test(sql) ? pattern.source : null))
    .filter(Boolean);
}

export function stripOwnerStatements(sql) {
  const removed = [];
  const result = sql
    .split("\n")
    .filter((line) => {
      if (/^\s*alter\s+(table|function|sequence|view|materialized\s+view|type|schema)\s+.+owner\s+to\s+/i.test(line)) {
        removed.push(line.trim());
        return false;
      }
      return true;
    })
    .join("\n");
  return { sql: result, removed };
}
