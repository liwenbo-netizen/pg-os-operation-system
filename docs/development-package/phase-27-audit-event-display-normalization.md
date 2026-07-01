# Phase 27 Report - Audit Event Display Normalization

Status: PASS. System audit events now display under the correct observability module labels.

## Objective

Normalize `/audit/events` display labels after Phase 26 introduced real system audit writes.

Phase 26 production UAT confirmed live `audit_logs` writes are working, but `auth.sign_in`, `auth.sign_out`, and `route.visit` rows were displayed as `Guide` because route-based events were inferred too broadly.

## Scope

This phase adjusts display-only module inference:

- `auth.*` events display as `Auth`.
- `route.*` events display as `System`.
- `role.*` events display as `System`.
- Guide/SOP events with `guide` or `sop` codes still display as `Guide`.
- Business/domain events keep their existing labels.

No database schema or audit write behavior changes in this phase.

## Validation

Config and repository validation:

```text
npm run validate:phase27
```

Expected result:

```text
PASS
Audit event display normalization config validation passed.
```

Regression validation:

```text
npm run validate:phase26
npm run test
npm run build
npm run validate:secret-hygiene
```

## Production UAT

After deployment, a CEO or audit-capable role should open `/audit/events` and confirm:

```text
auth.sign_in -> Auth
auth.sign_out -> Auth
route.visit -> System
role.switch -> System, when present
publisher.created -> Media
```

## Acceptance Criteria

Phase 27 is accepted when:

- Auth audit events no longer display as Guide. PASS.
- Route and role audit events display as System. PASS.
- Guide/SOP event inference remains intact. PASS.
- Phase 26 production sign-off remains recorded. PASS.
- `npm run validate:phase27` passes. PASS.
