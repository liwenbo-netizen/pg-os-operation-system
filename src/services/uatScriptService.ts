import type { RoleCode } from "../constants/roles";

export type UatStepStatus = "pending" | "passed" | "failed" | "blocked";

export type UatScriptStep = {
  id: string;
  action: string;
  expectedResult: string;
};

export type UatScript = {
  id: string;
  roleCode: RoleCode;
  title: string;
  scope: string;
  loginAccount: string;
  targetRoute: string;
  objective: string;
  evidence: string[];
  steps: UatScriptStep[];
};

export type UatStepResult = {
  status: UatStepStatus;
  actualResult: string;
  updatedAt?: string;
};

export type UatScriptResults = Record<string, UatStepResult>;

export type UatSummary = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  pending: number;
  completionRate: number;
};

export const productionUatScripts: UatScript[] = [
  {
    id: "ceo-observability-signoff",
    roleCode: "ceo",
    title: "CEO production observability sign-off",
    scope: "Production login, System Health, Audit Events, and warning diagnostics.",
    loginAccount: "ceo@poly-gamma.com",
    targetRoute: "/system/health",
    objective: "Confirm CEO can see production readiness, live audit coverage, and the Supabase diagnostics panel.",
    evidence: ["System Health all key cards OK", "Audit Events shows Supabase live", "Supabase diagnostics opens from the header"],
    steps: [
      {
        id: "ceo-login",
        action: "Sign in with Supabase as CEO and request active role CEO.",
        expectedResult: "Workspace opens with CEO active role and Supabase auth badge."
      },
      {
        id: "ceo-health",
        action: "Open System Health.",
        expectedResult: "Auth session, workflow repository, runtime warnings, event source, and active route are visible."
      },
      {
        id: "ceo-diagnostics",
        action: "Click the top-right Supabase repository status chip.",
        expectedResult: "Supabase diagnostics panel opens and shows either healthy state or structured table/action/error diagnostics."
      },
      {
        id: "ceo-audit",
        action: "Open Audit Events and refresh the event stream.",
        expectedResult: "Audit/business events load from Supabase live or Supabase partial with warnings clearly shown."
      }
    ]
  },
  {
    id: "media-publisher-onboarding",
    roleCode: "media_manager",
    title: "Media Manager publisher onboarding smoke",
    scope: "Publisher 360 create flow, repository save, business audit coverage.",
    loginAccount: "media_manager@poly-gamma.com",
    targetRoute: "/media/publishers/:id",
    objective: "Confirm Media Manager can create a publisher without unrelated snapshot RLS noise.",
    evidence: ["Publisher count increases", "Supabase warning count remains zero or actionable", "publisher.create appears in audit events"],
    steps: [
      {
        id: "media-login",
        action: "Sign in with Supabase as Media Manager.",
        expectedResult: "Workspace opens with Media Manager active role and Publisher 360 visible."
      },
      {
        id: "media-new-publisher",
        action: "Open Publisher 360 and click New publisher.",
        expectedResult: "A new publisher row is created and onboarding action feedback appears."
      },
      {
        id: "media-warning-check",
        action: "Click Supabase repository status.",
        expectedResult: "No broad snapshot warnings. Any warning lists table, action, role, time, and suggested fix."
      },
      {
        id: "media-audit-check",
        action: "Switch to CEO or audit-capable role and open Audit Events.",
        expectedResult: "The latest publisher onboarding event is visible in the audit/business stream."
      }
    ]
  },
  {
    id: "sales-proposal-guard",
    roleCode: "sales_manager",
    title: "Sales Manager proposal guard smoke",
    scope: "Sales workbench and publisher readiness guard behavior.",
    loginAccount: "sales_manager@poly-gamma.com",
    targetRoute: "/sales/manager-workbench",
    objective: "Confirm Sales can evaluate publisher selection through readiness guardrails.",
    evidence: ["Sales workbench loads", "Guard result is visible", "Audit event is written for guarded selection"],
    steps: [
      {
        id: "sales-login",
        action: "Sign in with Supabase as Sales Manager.",
        expectedResult: "Sales Manager Workbench is available and active."
      },
      {
        id: "sales-open-workbench",
        action: "Open Sales Manager Workbench.",
        expectedResult: "Proposal queue, recommended publishers, and readiness status are visible."
      },
      {
        id: "sales-guard-action",
        action: "Run the proposal publisher guard action.",
        expectedResult: "The UI shows allowed, warning, or blocked state with a business reason."
      },
      {
        id: "sales-audit",
        action: "Review Audit Events with CEO/audit role.",
        expectedResult: "proposal publisher guard event is traceable."
      }
    ]
  },
  {
    id: "finance-settlement-signoff",
    roleCode: "finance_manager",
    title: "Finance settlement sign-off smoke",
    scope: "Settlement workspace, reconciliation blocker, audit coverage.",
    loginAccount: "finance_manager@poly-gamma.com",
    targetRoute: "/finance/settlements/:id",
    objective: "Confirm Finance can review and confirm settlement readiness through guarded workflow.",
    evidence: ["Settlement workspace loads", "Reconciliation status visible", "Confirm action is guarded"],
    steps: [
      {
        id: "finance-login",
        action: "Sign in with Supabase as Finance Manager.",
        expectedResult: "Finance Settlement route is available."
      },
      {
        id: "finance-open",
        action: "Open Finance Settlement.",
        expectedResult: "Settlement summary, reconciliation, blockers, invoice/payment, and activity sections are visible."
      },
      {
        id: "finance-confirm",
        action: "Run settlement confirm action when data is ready.",
        expectedResult: "Guard allows only valid settlement confirmation and records an audit event."
      }
    ]
  },
  {
    id: "contract-legal-review",
    roleCode: "legal_manager",
    title: "Legal contract review smoke",
    scope: "Contract workspace, legal review, finance handoff, audit coverage.",
    loginAccount: "legal_manager@poly-gamma.com",
    targetRoute: "/contracts/:id",
    objective: "Confirm Legal can process contract review without gaining unrelated business authority.",
    evidence: ["Contract workspace loads", "Legal review action is guarded", "Contract audit event is visible"],
    steps: [
      {
        id: "legal-login",
        action: "Sign in with Supabase as Legal Manager.",
        expectedResult: "Contract Workspace is available."
      },
      {
        id: "legal-open",
        action: "Open Contract Workspace.",
        expectedResult: "Contract summary, review queue, risks, finance terms, and activity sections are visible."
      },
      {
        id: "legal-review",
        action: "Run legal review or signing action.",
        expectedResult: "Action is guarded by contract workflow and creates an audit event."
      }
    ]
  },
  {
    id: "audit-viewer-readonly",
    roleCode: "audit_viewer",
    title: "Audit Viewer read-only validation",
    scope: "Read-only audit access and blocked business write access.",
    loginAccount: "audit_viewer@poly-gamma.com",
    targetRoute: "/audit/events",
    objective: "Confirm audit_viewer can review traces but cannot perform business writes.",
    evidence: ["Audit Events opens", "Business routes are hidden or blocked", "No write action is available"],
    steps: [
      {
        id: "audit-login",
        action: "Sign in with Supabase as Audit Viewer.",
        expectedResult: "Audit Events route is available."
      },
      {
        id: "audit-read",
        action: "Open Audit Events and refresh.",
        expectedResult: "Audit/business stream is readable."
      },
      {
        id: "audit-business-block",
        action: "Attempt to navigate to a business write route from available navigation.",
        expectedResult: "Write routes are absent or route guard blocks access."
      }
    ]
  },
  {
    id: "system-admin-boundary",
    roleCode: "system_admin",
    title: "System Admin authority boundary",
    scope: "System administration shell and business approval isolation.",
    loginAccount: "system_admin@poly-gamma.com",
    targetRoute: "/admin",
    objective: "Confirm system_admin does not inherit business approval authority.",
    evidence: ["Admin Shell opens", "Business approval routes are blocked", "System Health remains visible"],
    steps: [
      {
        id: "admin-login",
        action: "Sign in with Supabase as System Admin.",
        expectedResult: "Admin Shell is the default route."
      },
      {
        id: "admin-business-block",
        action: "Try to open Media Director Command Center.",
        expectedResult: "Route guard blocks business approval route."
      },
      {
        id: "admin-health",
        action: "Open System Health.",
        expectedResult: "System observability remains visible for support work."
      }
    ]
  }
];

export function summarizeUatResults(scripts: UatScript[], results: UatScriptResults): UatSummary {
  const total = scripts.reduce((count, script) => count + script.steps.length, 0);
  const statuses = scripts.flatMap((script) => script.steps.map((step) => results[step.id]?.status ?? "pending"));
  const passed = statuses.filter((status) => status === "passed").length;
  const failed = statuses.filter((status) => status === "failed").length;
  const blocked = statuses.filter((status) => status === "blocked").length;
  const pending = statuses.filter((status) => status === "pending").length;

  return {
    total,
    passed,
    failed,
    blocked,
    pending,
    completionRate: total === 0 ? 0 : Math.round(((passed + failed + blocked) / total) * 100)
  };
}

export function summarizeScriptResults(script: UatScript, results: UatScriptResults): UatSummary {
  return summarizeUatResults([script], results);
}

function resultTimestamp(result: UatStepResult | undefined) {
  if (!result?.updatedAt) {
    return 0;
  }

  const parsed = Date.parse(result.updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mergeUatScriptResults(localResults: UatScriptResults, remoteResults: UatScriptResults): UatScriptResults {
  const merged: UatScriptResults = { ...localResults };

  for (const [stepId, remoteResult] of Object.entries(remoteResults)) {
    const localResult = merged[stepId];
    if (!localResult || resultTimestamp(remoteResult) >= resultTimestamp(localResult)) {
      merged[stepId] = remoteResult;
    }
  }

  return merged;
}

export function updateUatStepResult(
  results: UatScriptResults,
  stepId: string,
  patch: Partial<UatStepResult>,
  timestamp = new Date().toISOString()
): UatScriptResults {
  const current = results[stepId] ?? { status: "pending", actualResult: "" };

  return {
    ...results,
    [stepId]: {
      ...current,
      ...patch,
      updatedAt: timestamp
    }
  };
}
