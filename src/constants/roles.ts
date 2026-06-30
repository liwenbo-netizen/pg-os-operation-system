export const roleCodes = [
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
] as const;

export type RoleCode = (typeof roleCodes)[number];

export type RoleDefinition = {
  code: RoleCode;
  name: string;
  defaultRoute: string;
  isBusinessApprovalRole: boolean;
  scope: string;
};

export const roleDefinitions: Record<RoleCode, RoleDefinition> = {
  ceo: {
    code: "ceo",
    name: "CEO",
    defaultRoute: "/ceo/dashboard",
    isBusinessApprovalRole: true,
    scope: "Global operations, risk, approvals, and OKR visibility."
  },
  operations_director: {
    code: "operations_director",
    name: "Operations Director",
    defaultRoute: "/workbench",
    isBusinessApprovalRole: true,
    scope: "Cross-role coordination, campaign health, and operational risk."
  },
  sales_director: {
    code: "sales_director",
    name: "Sales Director",
    defaultRoute: "/workbench",
    isBusinessApprovalRole: true,
    scope: "Sales team, opportunities, and proposal approval."
  },
  sales_manager: {
    code: "sales_manager",
    name: "Sales Manager",
    defaultRoute: "/sales/manager-workbench",
    isBusinessApprovalRole: false,
    scope: "Advertisers, opportunities, and proposal drafts."
  },
  media_director: {
    code: "media_director",
    name: "Media Director",
    defaultRoute: "/media/director-command-center",
    isBusinessApprovalRole: true,
    scope: "Media strategy, readiness approval, and scale decisions."
  },
  media_manager: {
    code: "media_manager",
    name: "Media Manager",
    defaultRoute: "/media/manager-workbench",
    isBusinessApprovalRole: false,
    scope: "Publisher onboarding, contacts, terms, scheduling, and media quality."
  },
  adops_manager: {
    code: "adops_manager",
    name: "AdOps Manager",
    defaultRoute: "/workbench",
    isBusinessApprovalRole: false,
    scope: "Campaign execution and launch checks."
  },
  integration_manager: {
    code: "integration_manager",
    name: "Integration Manager",
    defaultRoute: "/workbench",
    isBusinessApprovalRole: false,
    scope: "SDK, API, VAST, and CTV technical integration."
  },
  data_analyst: {
    code: "data_analyst",
    name: "Data Analyst",
    defaultRoute: "/workbench",
    isBusinessApprovalRole: false,
    scope: "Funnel analysis, evidence, and diagnostic support."
  },
  finance_manager: {
    code: "finance_manager",
    name: "Finance Manager",
    defaultRoute: "/workbench",
    isBusinessApprovalRole: true,
    scope: "Settlement, invoices, and finance exceptions."
  },
  legal_manager: {
    code: "legal_manager",
    name: "Legal Manager",
    defaultRoute: "/workbench",
    isBusinessApprovalRole: true,
    scope: "Contract review and legal coordination."
  },
  customer_success_manager: {
    code: "customer_success_manager",
    name: "Customer Success Manager",
    defaultRoute: "/workbench",
    isBusinessApprovalRole: false,
    scope: "Client delivery, retention, and post-launch follow-up."
  },
  product_owner: {
    code: "product_owner",
    name: "Product Owner",
    defaultRoute: "/workbench",
    isBusinessApprovalRole: false,
    scope: "Product configuration, guide content, and workflow tuning."
  },
  system_admin: {
    code: "system_admin",
    name: "System Admin",
    defaultRoute: "/admin",
    isBusinessApprovalRole: false,
    scope: "User, configuration, and system administration only."
  },
  audit_viewer: {
    code: "audit_viewer",
    name: "Audit Viewer",
    defaultRoute: "/workbench",
    isBusinessApprovalRole: false,
    scope: "Read-only audit access."
  }
};

