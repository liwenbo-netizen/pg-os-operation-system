import { roleDefinitions, type RoleCode } from "../constants/roles";
import type { WorkflowRepositoryHealth } from "../repositories/workflowRepository";
import type { BusinessUser } from "../types/domain";
import { formatUtcPlus8DateTime } from "../lib/time";

export type WarningDiagnosticScope = "repository" | "auth";

export type WarningDiagnostic = {
  id: string;
  scope: WarningDiagnosticScope;
  table: string;
  action: string;
  error: string;
  role: string;
  roleCode: RoleCode;
  time: string;
  raw: string;
  suggestion: string;
};

type WarningDiagnosticsInput = {
  activeRole: RoleCode;
  authError?: string;
  authWarnings?: string[];
  includeAuth?: boolean;
  repositoryHealth?: WorkflowRepositoryHealth;
  user?: Pick<BusinessUser, "activeRole" | "email"> | null;
};

type ParsedWarning = {
  table: string;
  error: string;
};

const TABLE_PREFIX_PATTERN = /^([a-z][a-z0-9_]*):\s*(.+)$/i;

function hashText(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(36);
}

function parseWarningMessage(raw: string, fallbackTable: string): ParsedWarning {
  const match = raw.match(TABLE_PREFIX_PATTERN);

  if (!match) {
    return {
      table: fallbackTable,
      error: raw
    };
  }

  return {
    table: match[1],
    error: match[2]
  };
}

function inferRepositoryAction(source: string, raw: string, isSkippedWrite = false) {
  const lowerSource = source.toLowerCase();
  const lowerRaw = raw.toLowerCase();

  if (isSkippedWrite) {
    return "skip";
  }

  if (lowerRaw.includes("insert")) {
    return "insert";
  }

  if (lowerRaw.includes("upsert") || lowerSource.includes("save")) {
    return "upsert";
  }

  if (lowerRaw.includes("select") || lowerRaw.includes("read") || lowerSource.includes("fallback") || lowerSource.includes("load")) {
    return "select";
  }

  return "repository";
}

function suggestionFor(table: string, action: string, error: string, role: string) {
  const lower = error.toLowerCase();

  if (lower.includes("row-level security")) {
    return `Check the ${table} RLS policy for ${role}; allow ${action} and include WITH CHECK for row writes. Mirror the fix in supabase/policies/rls_policies.sql and a timestamped migration.`;
  }

  if (lower.includes("check constraint")) {
    return `Align the frontend domain enum with the ${table} database constraint, then rerun the schema/domain validation gate.`;
  }

  if (lower.includes("foreign key")) {
    return `Verify the parent row exists before ${action} on ${table}, or adjust the workflow save order so dependent rows are written after their parents.`;
  }

  if (lower.includes("non-uuid") || lower.includes("uuid")) {
    return `Confirm ${table} rows use database UUID ids. Fixture slug ids are skipped intentionally and should not be persisted to Supabase.`;
  }

  if (lower.includes("not configured")) {
    return "Check the deployed Supabase environment variables and redeploy before retesting the production session.";
  }

  if (lower.includes("duplicate")) {
    return `Inspect ${table} unique keys and upsert conflict targets, then retry with a stable id or corrected onConflict setting.`;
  }

  return `Inspect the latest ${table} migration, RLS policy, and live write probe for the active role, then retest the same ${action} path.`;
}

function roleLabel(roleCode: RoleCode) {
  return `${roleDefinitions[roleCode].name} (${roleCode})`;
}

function buildDiagnosticId(scope: WarningDiagnosticScope, table: string, action: string, raw: string, index: number) {
  return `${scope}-${table}-${action}-${index}-${hashText(raw)}`;
}

export function buildWarningDiagnostics({
  activeRole,
  authError,
  authWarnings = [],
  includeAuth = false,
  repositoryHealth,
  user
}: WarningDiagnosticsInput): WarningDiagnostic[] {
  const roleCode = user?.activeRole ?? activeRole;
  const role = roleLabel(roleCode);
  const repositoryTime = formatUtcPlus8DateTime(repositoryHealth?.loadedAt ?? new Date());
  const diagnostics: WarningDiagnostic[] = [];

  repositoryHealth?.warnings.forEach((raw, index) => {
    const parsed = parseWarningMessage(raw, "repository");
    const action = inferRepositoryAction(repositoryHealth.source, raw);

    diagnostics.push({
      id: buildDiagnosticId("repository", parsed.table, action, raw, index),
      scope: "repository",
      table: parsed.table,
      action,
      error: parsed.error,
      role,
      roleCode,
      time: repositoryTime,
      raw,
      suggestion: suggestionFor(parsed.table, action, parsed.error, role)
    });
  });

  repositoryHealth?.skippedWrites?.forEach((write, index) => {
    const raw = `${write.table}: ${write.reason}`;
    const action = inferRepositoryAction(repositoryHealth.source, raw, true);

    diagnostics.push({
      id: buildDiagnosticId("repository", write.table, action, raw, index + (repositoryHealth.warnings.length || 0)),
      scope: "repository",
      table: write.table,
      action,
      error: write.id ? `${write.reason} Row id: ${write.id}.` : write.reason,
      role,
      roleCode,
      time: repositoryTime,
      raw,
      suggestion: suggestionFor(write.table, action, write.reason, role)
    });
  });

  if (!includeAuth) {
    return diagnostics;
  }

  const authTime = formatUtcPlus8DateTime(new Date());
  const authMessages = [...authWarnings, authError].filter((message): message is string => Boolean(message));

  authMessages.forEach((raw, index) => {
    diagnostics.push({
      id: buildDiagnosticId("auth", "auth", "session", raw, index),
      scope: "auth",
      table: "auth",
      action: "session",
      error: raw,
      role,
      roleCode,
      time: authTime,
      raw,
      suggestion: "Check the Supabase Auth user, profile row, assigned user_roles, and requested active role before retrying sign-in."
    });
  });

  return diagnostics;
}
