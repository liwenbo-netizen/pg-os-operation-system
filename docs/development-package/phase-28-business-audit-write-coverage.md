# Phase 28 Report - Business Audit Write Coverage

Status: PASS. Core Media, Sales, Campaigns, Finance, and Contract workflow actions now carry explicit Phase 28 audit coverage metadata when saved to Supabase `audit_logs`.

## Objective

Extend real audit coverage beyond system events into business workflow writes.

Phase 26 added direct `audit_logs` writes for auth, role, and route events. Earlier workflow phases already created in-memory domain audit events. Phase 28 makes those business audit rows easier to verify and support in production by adding a first-class coverage manifest and persisted `after_data` metadata for core actions.

## Scope

The Phase 28 coverage manifest is defined in `src/services/businessAuditCoverage.ts`.

Covered core modules:

- Media
- Sales
- Campaigns
- Finance
- Contracts

Representative covered actions:

```text
publisher.create
publisher.technical_live.submit
commercial_test.conclude
publisher.sales_readiness.approve
opportunity.create
proposal.create
proposal.publisher.select
proposal.approve
campaign.create
campaign.launch_check.complete
campaign.launch.approve
settlement.reconcile
settlement.confirm
settlement.invoice.issue
settlement.payment.mark_paid
contract.review.request
contract.legal_review.approve
contract.finance_terms.approve
contract.sign
contract.archive
```

## Persistence Behavior

Supabase workflow saves continue writing workflow audit events into `audit_logs`.

For covered business actions, `audit_logs.after_data` now includes:

```text
businessAuditCoverage: phase28_core_business_action
businessModule
workflowAction
workflowSurface
criticality
actorRole
allowed
reasonCode
```

This does not change table schema, RLS policy, or business workflow status transitions.

## Validation

Config and repository validation:

```text
npm run validate:phase28
```

Expected result:

```text
PASS
Business audit write coverage config validation passed.
```

Regression validation:

```text
npm run validate:phase27
npm run test
npm run build
npm run validate:secret-hygiene
```

`npm run validate:uat:local` also includes `validate:phase28`.

## Production UAT Target

After deployment, sign in through Supabase and trigger at least one core business action, then open `/audit/events` as CEO or another audit-capable role.

Expected examples:

```text
publisher.create -> Media / audit / allowed
proposal.approve -> Sales / audit / allowed
settlement.confirm -> Finance / audit / allowed
contract.sign -> Contracts / audit / allowed
```

The visible event row confirms the audit stream. The row `after_data` in Supabase confirms the Phase 28 marker `phase28_core_business_action`.

## Acceptance Criteria

Phase 28 is accepted when:

- Core business action manifest exists for Media, Sales, Campaigns, Finance, and Contracts. PASS.
- Supabase workflow audit rows include Phase 28 coverage metadata. PASS.
- Workflow repository tests assert persisted business audit metadata. PASS.
- `npm run validate:phase28` is wired and passes. PASS.
- Local UAT gate includes the Phase 28 coverage check. PASS.
