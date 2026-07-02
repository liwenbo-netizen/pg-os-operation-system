import type { RoleCode } from "../constants/roles";

export type AppRoute = {
  path: string;
  title: string;
  module: string;
  pageType: string;
  priority: "P0" | "P1" | "Shell";
  allowedRoles: RoleCode[];
  service: string;
  guard: string;
  uat: string;
  primaryAction: string;
  summarySignals: string[];
  sections: string[];
};

const allRoles: RoleCode[] = [
  "ceo",
  "operations_director",
  "sales_director",
  "sales_manager",
  "media_director",
  "media_manager",
  "adops_manager",
  "integration_manager",
  "data_analyst",
  "finance_manager",
  "legal_manager",
  "customer_success_manager",
  "product_owner",
  "system_admin",
  "audit_viewer"
];

const businessRoles = allRoles.filter((role) => role !== "system_admin");

export const routeDefinitions: AppRoute[] = [
  {
    path: "/ceo/dashboard",
    title: "CEO Dashboard",
    module: "Workbench",
    pageType: "Dashboard",
    priority: "P0",
    allowedRoles: ["ceo"],
    service: "WorkbenchService",
    guard: "canViewRoute",
    uat: "UAT-001",
    primaryAction: "Review major approvals",
    summarySignals: ["Monthly revenue $128.4k", "Gross margin 31.6%", "P0 risks 2", "Scale-ready publishers 18"],
    sections: ["Operating summary", "Critical risks", "Approval queue", "Media launch progress", "Sales pipeline"]
  },
  {
    path: "/workbench",
    title: "Role Workbench",
    module: "Workbench",
    pageType: "Workbench",
    priority: "P0",
    allowedRoles: allRoles,
    service: "WorkbenchService",
    guard: "canViewRoute",
    uat: "UAT-001",
    primaryAction: "Process next task",
    summarySignals: ["My tasks 9", "Overdue 2", "Pending approvals 3", "Risks 4"],
    sections: ["Today summary", "Priority tasks", "Approvals and handoffs", "Risk reminders", "Weekly OKR"]
  },
  {
    path: "/media/director-command-center",
    title: "Media Director Command Center",
    module: "Media",
    pageType: "Command Center",
    priority: "P0",
    allowedRoles: ["media_director", "operations_director", "ceo"],
    service: "PublisherReadinessService",
    guard: "canApproveScaleReadiness",
    uat: "UAT-005",
    primaryAction: "Approve scale readiness",
    summarySignals: ["Sellable publishers 26", "Scale-ready 13", "Testing 7", "High risk 4"],
    sections: ["Supply readiness funnel", "Scale approval queue", "Quality risk ranking", "Ramp plans", "Blocked publishers"]
  },
  {
    path: "/media/manager-workbench",
    title: "Media Manager Workbench",
    module: "Media",
    pageType: "Workbench",
    priority: "P0",
    allowedRoles: ["media_manager", "media_director", "operations_director"],
    service: "PublisherService",
    guard: "canAccessRecord",
    uat: "UAT-002",
    primaryAction: "Add publisher",
    summarySignals: ["Missing profiles 6", "Pending integration 4", "Waiting releases 3", "Scale requests 2"],
    sections: ["Publisher queue", "Blocked items", "Missing material checklist", "Technical handoffs", "Recent publisher updates"]
  },
  {
    path: "/media/publishers/:id",
    title: "Publisher 360",
    module: "Media",
    pageType: "Object 360",
    priority: "P0",
    allowedRoles: businessRoles,
    service: "PublisherService",
    guard: "canAccessRecord",
    uat: "UAT-002",
    primaryAction: "Continue readiness flow",
    summarySignals: ["Technical live passed", "Commercial test passed", "Proposal selectable", "Risk high"],
    sections: ["Publisher profile", "Ad slots", "Commercial terms", "Integration record", "Quality and settlement status"]
  },
  {
    path: "/media/integration-wizard/:id",
    title: "Technical Integration Wizard",
    module: "Media",
    pageType: "Wizard",
    priority: "P0",
    allowedRoles: ["integration_manager", "media_director", "operations_director"],
    service: "IntegrationService",
    guard: "canUpdatePublisherReadiness",
    uat: "UAT-003",
    primaryAction: "Submit production validation",
    summarySignals: ["Step 4 of 5", "Callbacks verified", "Logs pending", "Owner Integration"],
    sections: ["Connection checklist", "Test request evidence", "Callback logs", "Production validation", "Next owner"]
  },
  {
    path: "/media/commercial-tests/:id",
    title: "Commercial Test",
    module: "Media",
    pageType: "Test Workspace",
    priority: "P0",
    allowedRoles: ["adops_manager", "data_analyst", "media_director", "operations_director"],
    service: "CommercialTestService",
    guard: "canCreateCommercialTest",
    uat: "UAT-004",
    primaryAction: "Submit test conclusion",
    summarySignals: ["Budget $500", "Spend $186", "Fill 42%", "Clear 51%"],
    sections: ["Test objective", "Test setup", "Live metrics", "Exceptions", "Scale recommendation"]
  },
  {
    path: "/diagnostics/:id",
    title: "Diagnostic Case",
    module: "Diagnostics",
    pageType: "Diagnostic",
    priority: "P0",
    allowedRoles: ["operations_director", "media_director", "media_manager", "adops_manager", "integration_manager", "data_analyst", "finance_manager"],
    service: "DiagnosticCaseService",
    guard: "canCloseDiagnosticCase",
    uat: "UAT-009",
    primaryAction: "Submit conclusion",
    summarySignals: ["Case DC-001", "Severity high", "Status evidence_collection", "Blocks scale"],
    sections: ["Case summary", "Funnel snapshot", "Evidence", "Root cause", "Downstream action"]
  },
  {
    path: "/sales/manager-workbench",
    title: "Sales Manager Workbench",
    module: "Sales",
    pageType: "Workbench",
    priority: "P1",
    allowedRoles: ["sales_manager", "sales_director", "operations_director"],
    service: "OpportunityService",
    guard: "canViewRoute",
    uat: "UAT-001",
    primaryAction: "Create proposal",
    summarySignals: ["Open opportunities 12", "Proposal drafts 5", "Blocked media 2", "Review due 3"],
    sections: ["Opportunity queue", "Recommended publishers", "Proposal drafts", "Client feedback", "Next actions"]
  },
  {
    path: "/proposals/:id/wizard",
    title: "Proposal Wizard",
    module: "Proposals",
    pageType: "Wizard",
    priority: "P1",
    allowedRoles: ["sales_manager", "sales_director", "operations_director"],
    service: "ProposalService",
    guard: "canSelectPublisherForProposal",
    uat: "UAT-006 / UAT-007",
    primaryAction: "Submit for approval",
    summarySignals: ["Step 3 of 5", "Budget $20k", "Ready publishers 2", "Blocked 1"],
    sections: ["Client need", "Media recommendation", "Readiness validation", "Budget allocation", "Approval summary"]
  },
  {
    path: "/campaigns/:id/wizard",
    title: "Campaign Wizard",
    module: "Campaigns",
    pageType: "Wizard",
    priority: "P1",
    allowedRoles: ["adops_manager", "operations_director", "customer_success_manager"],
    service: "CampaignService",
    guard: "canLaunchCampaignWithPublisher",
    uat: "UAT-008",
    primaryAction: "Request launch approval",
    summarySignals: ["Launch checklist 80%", "Ready publishers 1", "Blocked 1", "Approval pending"],
    sections: ["Campaign setup", "Publisher allocations", "Launch guard", "Checklist", "Approval request"]
  },
  {
    path: "/finance/settlements/:id",
    title: "Finance Settlement",
    module: "Finance",
    pageType: "Settlement Workspace",
    priority: "P1",
    allowedRoles: ["finance_manager", "operations_director", "ceo"],
    service: "FinanceSettlementService",
    guard: "canConfirmSettlement",
    uat: "UAT-010",
    primaryAction: "Confirm settlement",
    summarySignals: ["Pending review 1", "Exception review 1", "Unreconciled 1", "Dispute 1"],
    sections: ["Settlement summary", "Reconciliation", "Diagnostic blockers", "Invoice and payment", "Activity"]
  },
  {
    path: "/contracts/:id",
    title: "Contract Workspace",
    module: "Contracts",
    pageType: "Legal Workspace",
    priority: "P1",
    allowedRoles: ["legal_manager", "finance_manager", "operations_director", "ceo"],
    service: "ContractService",
    guard: "canAccessRecord",
    uat: "UAT-012",
    primaryAction: "Approve legal review",
    summarySignals: ["Legal review 1", "Finance review 1", "Signing 1", "High risk 1"],
    sections: ["Contract summary", "Review queue", "Risk and blockers", "Finance terms", "Activity"]
  },
  {
    path: "/guide",
    title: "Guide Center",
    module: "Guide",
    pageType: "Guide Center",
    priority: "P1",
    allowedRoles: allRoles,
    service: "SopService",
    guard: "canViewRoute",
    uat: "UAT-014",
    primaryAction: "Open SOP",
    summarySignals: ["SOP cards 48", "Common 12", "Media 16", "Diagnostics 8"],
    sections: ["Search", "Role filters", "Scenario cards", "Common SOP", "Glossary"]
  },
  {
    path: "/system/health",
    title: "System Health",
    module: "Observability",
    pageType: "Health",
    priority: "P0",
    allowedRoles: allRoles,
    service: "ObservabilityService",
    guard: "canViewRoute",
    uat: "UAT-015",
    primaryAction: "Review system health",
    summarySignals: ["Auth mode", "Repository source", "Runtime warnings", "Event coverage"],
    sections: ["Auth status", "Repository status", "Runtime warnings", "Event counts", "Active route"]
  },
  {
    path: "/audit/events",
    title: "Audit Events",
    module: "Observability",
    pageType: "Audit Console",
    priority: "P0",
    allowedRoles: ["ceo", "system_admin", "audit_viewer"],
    service: "ObservabilityService",
    guard: "canViewRoute",
    uat: "UAT-015",
    primaryAction: "Review audit stream",
    summarySignals: ["Audit events", "Business events", "Blocked actions", "Actor trace"],
    sections: ["Event stream", "Module filter", "Object trace", "Allowed and blocked actions"]
  },
  {
    path: "/uat/scripts",
    title: "UAT Script Center",
    module: "Observability",
    pageType: "UAT Checklist",
    priority: "P0",
    allowedRoles: ["ceo", "operations_director", "system_admin", "audit_viewer"],
    service: "UatScriptService",
    guard: "canViewRoute",
    uat: "UAT-016",
    primaryAction: "Record UAT result",
    summarySignals: ["Role scripts", "Passed steps", "Failed steps", "Blocked steps"],
    sections: ["Role checklist", "Expected results", "Actual results", "Pass fail record", "Evidence notes"]
  },
  {
    path: "/admin",
    title: "Admin Shell",
    module: "Admin",
    pageType: "Shell",
    priority: "Shell",
    allowedRoles: ["system_admin"],
    service: "RbacService",
    guard: "canViewRoute",
    uat: "UAT-011",
    primaryAction: "Manage users",
    summarySignals: ["Users pending 0", "Roles 15", "Business approvals disabled", "Audit read only"],
    sections: ["User accounts", "Role assignment", "Route permissions", "Capability tags", "System settings"]
  }
];

export function getDefaultRouteForRole(roleCode: RoleCode) {
  return roleCode === "system_admin"
    ? "/admin"
    : routeDefinitions.find((route) => route.allowedRoles.includes(roleCode))?.path ?? "/workbench";
}
