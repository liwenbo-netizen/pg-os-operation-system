# Phase 25 Report - System Health Live Observability Alignment

Status: PASS. `/system/health` now uses the same Supabase-backed event source as `/audit/events` for audit/business event coverage.

## Objective

Align System Health with the live observability source introduced in Phase 24 so operators are not misled by snapshot-only event counts.

## Scope

This phase adds:

- Live event coverage loading in `SystemHealthPage`.
- `SystemHealthEventCoverage` support in `ObservabilityService`.
- Health card detail that identifies `Supabase live`, `Supabase partial`, or `Snapshot fallback`.
- Event source warning propagation into the System Health warnings panel.
- A dedicated Event source summary card.
- `npm run validate:phase25`.
- Phase 24 manual production sign-off record.

## Behavior

`/system/health` samples the latest live event page through `AuditEventRepository`.

The health event card now reports:

- Event source.
- Audit event count in the sampled page.
- Business event count in the sampled page.
- Loaded timestamp.
- Warning status when live event reads are partial or falling back.

If Supabase is unavailable or both event tables fail, System Health falls back to snapshot coverage and shows the warning. If one table succeeds and one table fails, System Health reports `Supabase partial` instead of incorrectly showing zero coverage.

## Validation

Config and service validation:

```text
npm run validate:phase25
```

Expected result:

```text
PASS
System health live observability config validation passed.
```

Regression validation:

```text
npm run test
npm run build
npm run validate:phase24
npm run validate:secret-hygiene
```

## Acceptance Criteria

Phase 25 is accepted when:

- `/system/health` calls `AuditEventRepository` for live event coverage. PASS.
- `buildSystemHealthChecks` accepts live event coverage. PASS.
- Event source warning states are visible in System Health. PASS.
- Snapshot fallback remains available. PASS.
- `npm run validate:phase25` passes. PASS.
