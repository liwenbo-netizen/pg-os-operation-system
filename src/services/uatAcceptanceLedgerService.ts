import type { RoleCode } from "../constants/roles";
import type { UatBusinessDomain } from "./uatScriptService";

export type UatAcceptanceStatus = "passed" | "failed" | "blocked";

export type UatAcceptanceEvidenceKind =
  | "automated"
  | "manual"
  | "user_assisted"
  | "audit_proof"
  | "deployment_smoke"
  | "data_quality";

export type UatAcceptanceLedgerItem = {
  id: string;
  phase: "Phase 37" | "Phase 38" | "Phase 39";
  title: string;
  businessDomains: UatBusinessDomain[];
  roles: RoleCode[];
  status: UatAcceptanceStatus;
  recordedAt: string;
  productionUrl: string;
  evidenceKinds: UatAcceptanceEvidenceKind[];
  proofPoints: string[];
  auditMarkers: string[];
  sourceDocument: string;
  followUp: string;
};

export type UatAcceptanceLedgerSummary = {
  total: number;
  passed: number;
  failed: number;
  blocked: number;
  phaseCount: number;
  businessDomainCount: number;
  auditProofCount: number;
  latestRecordedAt?: string;
};

export const productionUatAcceptanceLedger: UatAcceptanceLedgerItem[] = [
  {
    id: "phase-37-production-business-mainline-readiness",
    phase: "Phase 37",
    title: "Production business mainline UAT readiness sign-off",
    businessDomains: ["Platform", "Media", "Sales", "Finance", "Contract"],
    roles: ["ceo"],
    status: "passed",
    recordedAt: "2026-07-03T01:59:42.000Z",
    productionUrl: "https://pg-os-operation-system.vercel.app/",
    evidenceKinds: ["automated", "deployment_smoke", "manual"],
    proofPoints: [
      "Production route smoke passed for app, workbench, guide, system health, audit events, UAT scripts, UAT history, contract, finance, media, and sales routes.",
      "Production bundle contained business mainline coverage markers for Media, Sales, Finance, and Contract.",
      "Browser-visible UAT Script Center readiness was confirmed without claiming real Supabase writes."
    ],
    auditMarkers: ["route smoke", "bundle markers", "uat script readiness"],
    sourceDocument: "docs/development-package/phase-37-production-business-mainline-uat-signoff.md",
    followUp: "Closed by Phase 38 live-write UAT execution."
  },
  {
    id: "phase-38-media-live-write",
    phase: "Phase 38",
    title: "Media Manager publisher onboarding live-write proof",
    businessDomains: ["Media"],
    roles: ["media_manager", "ceo"],
    status: "passed",
    recordedAt: "2026-07-03T06:34:55.000Z",
    productionUrl: "https://pg-os-operation-system.vercel.app/",
    evidenceKinds: ["user_assisted", "audit_proof", "data_quality"],
    proofPoints: [
      "Media Manager created a publisher, ad slot, and commercial terms in production.",
      "Publisher 360 showed the new operational data with Supabase synced.",
      "CEO Audit Events showed Media audit and business events with UTC+8 timestamps."
    ],
    auditMarkers: [
      "publisher.create",
      "publisher.created",
      "publisher_ad_slot.create",
      "publisher.ad_slot_created",
      "publisher_contract_term.create",
      "publisher.contract_term_created"
    ],
    sourceDocument: "docs/development-package/phase-38-user-assisted-live-write-uat-rls-audit-proof.md",
    followUp: "Closed."
  },
  {
    id: "phase-38-sales-live-write-rerun",
    phase: "Phase 38",
    title: "Sales Manager advertiser-opportunity-proposal rerun proof",
    businessDomains: ["Sales"],
    roles: ["sales_manager", "ceo"],
    status: "passed",
    recordedAt: "2026-07-03T18:04:06.000Z",
    productionUrl: "https://pg-os-operation-system.vercel.app/",
    evidenceKinds: ["user_assisted", "audit_proof", "data_quality"],
    proofPoints: [
      "The original advertiser context binding defect was reproduced, fixed, redeployed, and rerun.",
      "Sales Manager created advertiser, opportunity, and proposal in one production chain.",
      "CEO Audit Events showed the full advertiser -> opportunity -> proposal audit chain."
    ],
    auditMarkers: [
      "advertiser.create",
      "advertiser.created",
      "opportunity.create",
      "opportunity.created",
      "proposal.create",
      "proposal.created"
    ],
    sourceDocument: "docs/development-package/phase-38-user-assisted-live-write-uat-rls-audit-proof.md",
    followUp: "Closed. The previous NOT_FOUND / advertiser context defect did not recur."
  },
  {
    id: "phase-38-finance-live-write",
    phase: "Phase 38",
    title: "Finance Manager settlement lifecycle live-write proof",
    businessDomains: ["Finance"],
    roles: ["finance_manager", "ceo"],
    status: "passed",
    recordedAt: "2026-07-03T18:22:06.000Z",
    productionUrl: "https://pg-os-operation-system.vercel.app/",
    evidenceKinds: ["user_assisted", "audit_proof", "data_quality"],
    proofPoints: [
      "Finance Manager completed reconciliation, confirmed settlement, issued invoice, and marked paid.",
      "Settlement moved through reconciling -> pending_review -> confirmed -> invoiced -> paid.",
      "CEO Audit Events showed allowed and business events for the settlement lifecycle."
    ],
    auditMarkers: [
      "settlement.reconcile",
      "settlement.reconciled",
      "settlement.confirm",
      "settlement.confirmed",
      "settlement.invoice.issue",
      "settlement.invoiced",
      "settlement.payment.mark_paid",
      "settlement.paid"
    ],
    sourceDocument: "docs/development-package/phase-38-user-assisted-live-write-uat-rls-audit-proof.md",
    followUp: "Closed."
  },
  {
    id: "phase-38-contract-live-write",
    phase: "Phase 38",
    title: "Legal and Finance contract lifecycle live-write proof",
    businessDomains: ["Contract", "Finance"],
    roles: ["legal_manager", "finance_manager", "ceo"],
    status: "passed",
    recordedAt: "2026-07-03T23:43:40.000Z",
    productionUrl: "https://pg-os-operation-system.vercel.app/",
    evidenceKinds: ["user_assisted", "audit_proof", "data_quality"],
    proofPoints: [
      "Deterministic contract UAT seed made CON-001 through CON-004 visible in production.",
      "Legal and Finance completed finance review, legal approval, signing, and archive for CON-001.",
      "CEO Audit Events showed the full contract finance-review -> legal-approval -> signing -> archive chain."
    ],
    auditMarkers: [
      "contract.finance_review.request",
      "contract.finance_review_requested",
      "contract.finance_terms.approve",
      "contract.finance_terms_approved",
      "contract.legal_review.approve",
      "contract.legal_review_approved",
      "contract.sign",
      "contract.signed",
      "contract.archive",
      "contract.archived"
    ],
    sourceDocument: "docs/development-package/phase-38-user-assisted-live-write-uat-rls-audit-proof.md",
    followUp: "Closed."
  },
  {
    id: "phase-39-workbench-task-binding",
    phase: "Phase 39",
    title: "Workbench derived task execution binding proof",
    businessDomains: ["Platform", "Contract", "Finance"],
    roles: ["legal_manager", "finance_manager", "ceo"],
    status: "passed",
    recordedAt: "2026-07-04T05:33:03.000Z",
    productionUrl: "https://pg-os-operation-system.vercel.app/",
    evidenceKinds: ["manual", "user_assisted", "audit_proof"],
    proofPoints: [
      "Legal Manager started Handle contract: CON-003 and opened Contract Workspace with CON-003 selected.",
      "Finance Manager started Handle contract: CON-002 and confirmed Contract Workspace opened with CON-002 selected.",
      "CEO Audit Events showed workbench.task_started for legal_manager and finance_manager with no NOT_FOUND regression."
    ],
    auditMarkers: ["workbench.task_started", "route.visit"],
    sourceDocument: "docs/development-package/phase-39-workbench-task-execution-binding-fix.md",
    followUp: "Closed."
  }
];

export function summarizeAcceptanceLedger(items: UatAcceptanceLedgerItem[]): UatAcceptanceLedgerSummary {
  const phases = new Set(items.map((item) => item.phase));
  const businessDomains = new Set(items.flatMap((item) => item.businessDomains));
  const latestRecordedAt = items
    .map((item) => item.recordedAt)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];

  return {
    total: items.length,
    passed: items.filter((item) => item.status === "passed").length,
    failed: items.filter((item) => item.status === "failed").length,
    blocked: items.filter((item) => item.status === "blocked").length,
    phaseCount: phases.size,
    businessDomainCount: businessDomains.size,
    auditProofCount: items.filter((item) => item.evidenceKinds.includes("audit_proof")).length,
    latestRecordedAt
  };
}

export function getAcceptanceLedgerDomains(items: UatAcceptanceLedgerItem[]) {
  return Array.from(new Set(items.flatMap((item) => item.businessDomains))).sort();
}

export function getAcceptanceLedgerPhases(items: UatAcceptanceLedgerItem[]) {
  return Array.from(new Set(items.map((item) => item.phase))).sort();
}
