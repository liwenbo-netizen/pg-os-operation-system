import type { RoleCode } from "../constants/roles";

export type UatStepStatus = "pending" | "passed" | "failed" | "blocked";
export type UatBusinessDomain = "Platform" | "Media" | "Sales" | "Finance" | "Contract" | "Audit" | "Admin";

export type UatBusinessAction = {
  domain: Exclude<UatBusinessDomain, "Platform" | "Audit" | "Admin">;
  action: string;
  route: string;
  expectedAuditEvent: string;
  dataQualityChecks: string[];
};

export type UatScriptStep = {
  id: string;
  action: string;
  businessAction?: string;
  dataQualityCheck?: string;
  expectedResult: string;
};

export type UatScript = {
  id: string;
  businessDomain: UatBusinessDomain;
  roleCode: RoleCode;
  title: string;
  scope: string;
  loginAccount: string;
  targetRoute: string;
  objective: string;
  auditEvents: string[];
  businessActions: UatBusinessAction[];
  dataQualityChecks: string[];
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
    businessDomain: "Platform",
    roleCode: "ceo",
    title: "CEO production observability sign-off",
    scope: "Production login, System Health, Audit Events, and warning diagnostics.",
    loginAccount: "ceo@poly-gamma.com",
    targetRoute: "/system/health",
    objective: "Confirm CEO can see production readiness, live audit coverage, and the Supabase diagnostics panel.",
    auditEvents: ["auth.sign_in", "route.visit"],
    businessActions: [],
    dataQualityChecks: [
      "System Health uses live Supabase session and repository source.",
      "Audit Events shows live event counts without relying on front-end-only snapshot data."
    ],
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
    businessDomain: "Media",
    roleCode: "media_manager",
    title: "Media Manager publisher onboarding closed loop",
    scope: "Publisher onboarding wizard, media property identity, traffic evidence, inventory, contact, terms, repository save, and audit coverage.",
    loginAccount: "media_manager@poly-gamma.com",
    targetRoute: "/media/manager-workbench",
    objective: "Confirm Media Manager can create a commercially usable publisher onboarding package and produce traceable Media audit evidence.",
    auditEvents: [
      "publisher.onboarding.create",
      "publisher.create",
      "publisher_contact.create",
      "publisher_ad_slot.create",
      "publisher_contract_term.create",
      "publisher.onboarding.update",
      "publisher.update"
    ],
    businessActions: [
      {
        domain: "Media",
        action: "Create publisher onboarding package",
        route: "/media/manager-workbench",
        expectedAuditEvent: "publisher.onboarding.create",
        dataQualityChecks: [
          "Publisher has legal entity, media property name, package/bundle/domain identifier, integration type, DAU, daily requests, traffic date, and traffic source.",
          "Primary contact, first ad slot, initial commercial terms, and integration project are created in the same onboarding package."
        ]
      },
      {
        domain: "Media",
        action: "Add ad slot",
        route: "/media/publishers/:id",
        expectedAuditEvent: "publisher_ad_slot.create",
        dataQualityChecks: ["Ad slot has format, placement, floor price, daily requests, and active status."]
      },
      {
        domain: "Media",
        action: "Add commercial terms",
        route: "/media/publishers/:id",
        expectedAuditEvent: "publisher_contract_term.create",
        dataQualityChecks: ["Terms include contract type, billing model, settlement cycle, payment terms, and revenue share."]
      },
      {
        domain: "Media",
        action: "Correct publisher onboarding profile",
        route: "/media/publishers/:id",
        expectedAuditEvent: "publisher.onboarding.update",
        dataQualityChecks: [
          "Publisher, contact, primary ad slot, commercial term, and integration project retain their record identities.",
          "A duplicate publisher name or property identifier is rejected before any child record changes."
        ]
      }
    ],
    dataQualityChecks: [
      "Publisher onboarding does not leave integration_projects RLS warnings.",
      "Created publisher opens in Publisher 360 without losing asset identity, traffic, contact, ad slot, or terms context.",
      "Audit Events contains Media owner role and publisher object id for each write."
    ],
    evidence: [
      "Publisher count increases",
      "Asset identifier, traffic evidence, contact, ad slot, and commercial terms are visible on Publisher 360",
      "Profile correction keeps technical handoff intact and emits publisher.onboarding.update",
      "Duplicate media identity is rejected without partial writes",
      "Supabase warning count remains zero or actionable",
      "publisher.onboarding.create and child record writes appear in audit events"
    ],
    steps: [
      {
        id: "media-login",
        action: "Sign in with Supabase as Media Manager.",
        expectedResult: "Workspace opens with Media Manager active role and Publisher 360 visible."
      },
      {
        id: "media-new-publisher",
        action: "Open Media Manager Workbench, click New publisher, and complete all four onboarding steps.",
        businessAction: "Create publisher onboarding package",
        dataQualityCheck: "Required identity, traffic, inventory, contact, commercial, and integration fields contain real operating values.",
        expectedResult: "The onboarding package is created and the new publisher opens in Publisher 360."
      },
      {
        id: "media-add-slot-terms",
        action: "Review the new Publisher 360 identity, traffic, contact, ad slot, commercial terms, and integration sections.",
        businessAction: "Verify publisher onboarding package",
        dataQualityCheck: "Package or domain identifier, DAU, daily requests, ad format, placement, contact, billing model, and payment terms are visible.",
        expectedResult: "Publisher 360 shows the complete onboarding context and advances profile foundation readiness."
      },
      {
        id: "media-edit-profile",
        action: "Click Edit profile, change a governed traffic or contact field, save, and reopen the record.",
        businessAction: "Correct publisher onboarding profile",
        dataQualityCheck: "The publisher record id and technical integration project remain unchanged after correction.",
        expectedResult: "Publisher 360 shows the corrected value and keeps the technical integration handoff available."
      },
      {
        id: "media-warning-check",
        action: "Click Supabase repository status.",
        dataQualityCheck: "Repository warning diagnostics are either empty or list table, action, role, time, and suggested fix.",
        expectedResult: "No broad snapshot warnings. Any warning lists table, action, role, time, and suggested fix."
      },
      {
        id: "media-audit-check",
        action: "Switch to CEO or audit-capable role and open Audit Events.",
        businessAction: "Review Media audit trail",
        dataQualityCheck: "Audit row contains Media module, publisher object type, allowed status, and actor role.",
        expectedResult: "The latest publisher onboarding, ad slot, or terms event is visible in the audit/business stream."
      }
    ]
  },
  {
    id: "sales-proposal-guard",
    businessDomain: "Sales",
    roleCode: "sales_manager",
    title: "Sales Manager proposal guard closed loop",
    scope: "Advertiser, opportunity, proposal media validation, and publisher readiness guard behavior.",
    loginAccount: "sales_manager@poly-gamma.com",
    targetRoute: "/sales/manager-workbench",
    objective: "Confirm Sales can create demand, convert it to a proposal, run publisher readiness guardrails, and leave traceable audit evidence.",
    auditEvents: ["advertiser.create", "opportunity.create", "proposal.create", "proposal.publisher.select"],
    businessActions: [
      {
        domain: "Sales",
        action: "Create advertiser",
        route: "/sales/manager-workbench",
        expectedAuditEvent: "advertiser.create",
        dataQualityChecks: ["Advertiser has name, industry, region, and active status."]
      },
      {
        domain: "Sales",
        action: "Create opportunity",
        route: "/sales/manager-workbench",
        expectedAuditEvent: "opportunity.create",
        dataQualityChecks: ["Opportunity has advertiser link, stage, expected budget, and pain points."]
      },
      {
        domain: "Sales",
        action: "Validate media",
        route: "/proposals/:id/wizard",
        expectedAuditEvent: "proposal.publisher.select",
        dataQualityChecks: ["Proposal media selection stores publisher id, planned budget, guard status, and guard reason."]
      }
    ],
    dataQualityChecks: [
      "Opportunity stage moves into proposal drafting after proposal creation.",
      "Publisher guard result preserves allowed, warning, or blocked reason.",
      "Audit Events can trace proposal id and selected publisher id."
    ],
    evidence: [
      "Sales workbench loads",
      "Opportunity and proposal records are created",
      "Guard result is visible",
      "Audit event is written for guarded selection"
    ],
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
        id: "sales-demand-create",
        action: "Click New advertiser, then create or select an opportunity and create a proposal.",
        businessAction: "Create advertiser, Create opportunity, Create Proposal",
        dataQualityCheck: "Advertiser, opportunity, and proposal records keep their parent-child links.",
        expectedResult: "Opportunity enters proposal drafting and the proposal wizard can be opened."
      },
      {
        id: "sales-guard-action",
        action: "Open Proposal Wizard and click Validate media for a publisher.",
        businessAction: "Validate media",
        dataQualityCheck: "Proposal media selection stores guard status, guard reason, publisher id, and planned budget.",
        expectedResult: "The UI shows allowed, warning, or blocked state with a business reason."
      },
      {
        id: "sales-audit",
        action: "Review Audit Events with CEO/audit role.",
        dataQualityCheck: "Audit row includes Sales module, proposal object id, and actor role.",
        expectedResult: "Proposal publisher guard event is traceable."
      }
    ]
  },
  {
    id: "finance-settlement-signoff",
    businessDomain: "Finance",
    roleCode: "finance_manager",
    title: "Finance settlement sign-off closed loop",
    scope: "Settlement workspace, reconciliation, confirmation, invoice/payment progression, audit coverage.",
    loginAccount: "finance_manager@poly-gamma.com",
    targetRoute: "/finance/settlements/:id",
    objective: "Confirm Finance can reconcile clean settlements, confirm payable readiness, issue invoice, and mark payment without bypassing blockers.",
    auditEvents: ["settlement.reconcile", "settlement.confirm", "settlement.invoice.issue", "settlement.payment.mark_paid"],
    businessActions: [
      {
        domain: "Finance",
        action: "Complete reconciliation",
        route: "/finance/settlements/:id",
        expectedAuditEvent: "settlement.reconcile",
        dataQualityChecks: ["Settlement stores reconciliationCompleted, adjustment amount, payable amount, and pending_review status."]
      },
      {
        domain: "Finance",
        action: "Confirm settlement",
        route: "/finance/settlements/:id",
        expectedAuditEvent: "settlement.confirm",
        dataQualityChecks: ["Confirmation requires completed reconciliation and no unresolved settlement blocker."]
      },
      {
        domain: "Finance",
        action: "Issue invoice and Mark paid",
        route: "/finance/settlements/:id",
        expectedAuditEvent: "settlement.invoice.issue",
        dataQualityChecks: ["Invoice can only be issued after confirmation and payment can only be marked after invoice."]
      }
    ],
    dataQualityChecks: [
      "Settlement summary shows campaign, publisher, gross amount, payable amount, and due date.",
      "Diagnostic blockers are visible before confirmation.",
      "Audit Events can trace each settlement lifecycle action with settlement object id."
    ],
    evidence: ["Settlement workspace loads", "Reconciliation status visible", "Confirm action is guarded", "Invoice and payment status progress in order"],
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
        id: "finance-reconcile",
        action: "Click Complete reconciliation for a clean settlement.",
        businessAction: "Complete reconciliation",
        dataQualityCheck: "Settlement changes to pending review with reconciliation completed and payable amount preserved.",
        expectedResult: "Reconciliation result appears in the workspace and no unrelated Supabase warning is created."
      },
      {
        id: "finance-confirm",
        action: "Run settlement confirm action when data is ready.",
        businessAction: "Confirm settlement",
        dataQualityCheck: "Confirm action is blocked until reconciliation is complete and settlement blockers are resolved.",
        expectedResult: "Guard allows only valid settlement confirmation and records an audit event."
      },
      {
        id: "finance-invoice-payment",
        action: "Click Issue invoice, then Mark paid after confirmation.",
        businessAction: "Issue invoice and Mark paid",
        dataQualityCheck: "Invoice number, invoice timestamp, payment timestamp, and status transitions appear in sequence.",
        expectedResult: "Invoice and paid status progress only after the prior workflow state is valid."
      }
    ]
  },
  {
    id: "contract-legal-review",
    businessDomain: "Contract",
    roleCode: "legal_manager",
    title: "Legal contract review closed loop",
    scope: "Contract workspace, legal review, finance handoff, signing/archive readiness, audit coverage.",
    loginAccount: "legal_manager@poly-gamma.com",
    targetRoute: "/contracts/:id",
    objective: "Confirm Legal can request finance review, approve legal review, handle redlines, and only sign/archive eligible contracts.",
    auditEvents: ["contract.finance_review.request", "contract.legal_review.approve", "contract.redline.send", "contract.sign"],
    businessActions: [
      {
        domain: "Contract",
        action: "Request finance review",
        route: "/contracts/:id",
        expectedAuditEvent: "contract.finance_review.request",
        dataQualityChecks: ["Contract moves to finance_review and keeps counterparty, type, risk, and value data."]
      },
      {
        domain: "Contract",
        action: "Approve legal review",
        route: "/contracts/:id",
        expectedAuditEvent: "contract.legal_review.approve",
        dataQualityChecks: ["Approval stores legal notes, clears blocker, and sets next action to signing."]
      },
      {
        domain: "Contract",
        action: "Mark signed",
        route: "/contracts/:id",
        expectedAuditEvent: "contract.sign",
        dataQualityChecks: ["Signing is blocked until legal approval and no settlement dispute remains."]
      }
    ],
    dataQualityChecks: [
      "Contract summary shows contract number, counterparty, type, risk, value, and owner.",
      "Finance review and legal review states are visible and role-gated.",
      "Audit Events can trace legal action with contract object id and actor role."
    ],
    evidence: ["Contract workspace loads", "Legal and finance review actions are guarded", "Signing eligibility is enforced", "Contract audit event is visible"],
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
        id: "legal-finance-handoff",
        action: "Click Request finance review for a contract in requested/legal review state.",
        businessAction: "Request finance review",
        dataQualityCheck: "Contract enters finance_review and keeps linked publisher, advertiser, or settlement references visible.",
        expectedResult: "Finance review state is shown and the activity rail records the handoff."
      },
      {
        id: "legal-review",
        action: "Click Approve legal review after required review data is present.",
        businessAction: "Approve legal review",
        dataQualityCheck: "Legal notes are preserved, blocker is cleared, and next action becomes signing.",
        expectedResult: "Action is guarded by contract workflow and creates an audit event."
      },
      {
        id: "legal-sign-archive",
        action: "Click Mark signed, then Archive only after contract status allows it.",
        businessAction: "Mark signed and Archive",
        dataQualityCheck: "Signed and archived timestamps appear in order; blocked signing records a clear reason.",
        expectedResult: "Signing and archive actions are allowed only in valid contract states."
      }
    ]
  },
  {
    id: "audit-viewer-readonly",
    businessDomain: "Audit",
    roleCode: "audit_viewer",
    title: "Audit Viewer read-only validation",
    scope: "Read-only audit access and blocked business write access.",
    loginAccount: "audit_viewer@poly-gamma.com",
    targetRoute: "/audit/events",
    objective: "Confirm audit_viewer can review traces but cannot perform business writes.",
    auditEvents: ["route.visit", "route.denied"],
    businessActions: [],
    dataQualityChecks: [
      "Audit Viewer can read audit/business streams.",
      "Audit Viewer cannot perform business writes from visible navigation."
    ],
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
    businessDomain: "Admin",
    roleCode: "system_admin",
    title: "System Admin authority boundary",
    scope: "System administration shell and business approval isolation.",
    loginAccount: "system_admin@poly-gamma.com",
    targetRoute: "/admin",
    objective: "Confirm system_admin does not inherit business approval authority.",
    auditEvents: ["route.denied", "route.visit"],
    businessActions: [],
    dataQualityChecks: [
      "System Admin can access system support shell.",
      "System Admin does not inherit business approval or write authority."
    ],
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
