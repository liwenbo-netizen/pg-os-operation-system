import type { UatBusinessDomain, UatScript } from "./uatScriptService";

export type CoreBusinessDomain = Exclude<UatBusinessDomain, "Platform" | "Audit" | "Admin">;

export type BusinessUatDomainCoverage = {
  domain: CoreBusinessDomain;
  auditEvents: string[];
  dataQualityChecks: string[];
  routes: string[];
  scriptCount: number;
  stepCount: number;
};

export type BusinessUatCoverageSummary = {
  coveredDomains: number;
  totalDomains: number;
  domains: BusinessUatDomainCoverage[];
  missingDomains: CoreBusinessDomain[];
  warnings: string[];
};

export const coreBusinessDomains: CoreBusinessDomain[] = ["Media", "Sales", "Finance", "Contract"];

const minimumBusinessActions: Record<CoreBusinessDomain, string[]> = {
  Media: ["New publisher", "Add ad slot", "Add commercial terms"],
  Sales: ["Create advertiser", "Create opportunity", "Validate media"],
  Finance: ["Complete reconciliation", "Confirm settlement", "Issue invoice"],
  Contract: ["Request finance review", "Approve legal review", "Mark signed"]
};

export function buildBusinessUatCoverage(scripts: UatScript[] = []): BusinessUatCoverageSummary {
  const warnings: string[] = [];
  const domains = coreBusinessDomains.map((domain) => {
    const domainScripts = scripts.filter((script) => script.businessDomain === domain);
    const actions = domainScripts.flatMap((script) => script.businessActions);
    const auditEvents = Array.from(new Set([...domainScripts.flatMap((script) => script.auditEvents), ...actions.map((action) => action.expectedAuditEvent)])).sort();
    const dataQualityChecks = Array.from(
      new Set([
        ...domainScripts.flatMap((script) => script.dataQualityChecks),
        ...actions.flatMap((action) => action.dataQualityChecks),
        ...domainScripts.flatMap((script) =>
          script.steps.map((step) => step.dataQualityCheck).filter((value): value is string => Boolean(value))
        )
      ])
    );
    const routes = Array.from(new Set([domainScripts[0]?.targetRoute, ...actions.map((action) => action.route)].filter(Boolean))).sort();
    const stepCount = domainScripts.reduce((count, script) => count + script.steps.length, 0);
    const requiredActions = minimumBusinessActions[domain];

    for (const requiredAction of requiredActions) {
      if (!actions.some((action) => action.action.includes(requiredAction) || requiredAction.includes(action.action))) {
        warnings.push(`${domain}: missing business action ${requiredAction}.`);
      }
    }

    if (domainScripts.length === 0) {
      warnings.push(`${domain}: missing production UAT script.`);
    }

    if (auditEvents.length < 3) {
      warnings.push(`${domain}: needs at least three audit event markers.`);
    }

    if (dataQualityChecks.length < 3) {
      warnings.push(`${domain}: needs at least three data quality checks.`);
    }

    if (stepCount < 4) {
      warnings.push(`${domain}: needs at least four UAT steps.`);
    }

    return {
      domain,
      auditEvents,
      dataQualityChecks,
      routes,
      scriptCount: domainScripts.length,
      stepCount
    };
  });

  const missingDomains = domains.filter((domain) => domain.scriptCount === 0).map((domain) => domain.domain);

  return {
    coveredDomains: coreBusinessDomains.length - missingDomains.length,
    totalDomains: coreBusinessDomains.length,
    domains,
    missingDomains,
    warnings
  };
}

export function assertBusinessUatCoverage(scripts: UatScript[]) {
  const coverage = buildBusinessUatCoverage(scripts);

  if (coverage.warnings.length > 0) {
    throw new Error(`Business UAT coverage is incomplete:\n${coverage.warnings.map((warning) => `- ${warning}`).join("\n")}`);
  }

  return coverage;
}
