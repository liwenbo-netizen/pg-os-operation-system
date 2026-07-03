# Phase 36 Report - Business Mainline UAT / Data Quality

Status: PASS. PG OS now pulls the production UAT checklist back toward the core business workflow instead of only platform-level readiness.

## Objective

Make the production UAT script center validate the real Media / Sales / Finance / Contract business chain:

- Media creates and enriches publisher readiness data.
- Sales creates demand and validates publisher selection.
- Finance reconciles, confirms, invoices, and closes payment.
- Contract reviews legal/finance state and enforces signing readiness.

## Scope

Updated service:

```text
src/services/uatScriptService.ts
```

The production UAT script model now includes:

- `businessDomain`
- `businessActions`
- `auditEvents`
- `dataQualityChecks`
- per-step `businessAction`
- per-step `dataQualityCheck`

New coverage service:

```text
src/services/businessUatCoverageService.ts
```

The coverage service verifies that Media, Sales, Finance, and Contract each have:

- production UAT script coverage
- real button/action markers
- audit event markers
- data quality checks
- enough step-level coverage for manual production UAT

Updated UAT page:

```text
src/pages/uat/UatScriptCenterPage.tsx
```

The page now shows:

- Business mainline coverage across Media / Sales / Finance / Contract.
- Business actions and expected audit markers for the selected script.
- Data quality checks for the selected script.
- Step-level business action and data quality notes.

Updated repository metadata:

```text
src/repositories/uatScriptResultRepository.ts
```

Persisted UAT step metadata now includes business domain, business actions, audit event markers, and data quality checks so `/uat/history` can remain useful as release evidence.

New validation:

```text
npm run validate:phase36
```

## Business Coverage

Media:

- New publisher
- Add ad slot
- Add commercial terms
- Audit events: `publisher.create`, `publisher_ad_slot.create`, `publisher_contract_term.create`

Sales:

- Create advertiser
- Create opportunity
- Validate media
- Audit events: `advertiser.create`, `opportunity.create`, `proposal.create`, `proposal.publisher.select`

Finance:

- Complete reconciliation
- Confirm settlement
- Issue invoice and mark paid
- Audit events: `settlement.reconcile`, `settlement.confirm`, `settlement.invoice.issue`, `settlement.payment.mark_paid`

Contract:

- Request finance review
- Approve legal review
- Mark signed
- Audit events: `contract.finance_review.request`, `contract.legal_review.approve`, `contract.redline.send`, `contract.sign`

## Validation

Run:

```text
npm run validate:phase36
npm run validate:phase35
npm run lint
npm run build
```

Expected:

- Business UAT coverage service reports all four business domains covered.
- UAT scripts include business domain, action, audit, and data quality metadata.
- UAT Script Center renders business mainline coverage and selected-script quality checks.
- UAT result persistence keeps business metadata for history/export use.
- TypeScript and production build pass.

## Acceptance Criteria

- Media / Sales / Finance / Contract are all represented in production UAT scripts. PASS.
- Each business domain has real action markers tied to existing UI workflows. PASS.
- Each business domain has audit event markers. PASS.
- Each business domain has data quality checks. PASS.
- UAT Script Center exposes business mainline coverage. PASS.
- UAT result persistence includes business metadata for future evidence exports. PASS.
- `npm run validate:phase36` passes. PASS.
