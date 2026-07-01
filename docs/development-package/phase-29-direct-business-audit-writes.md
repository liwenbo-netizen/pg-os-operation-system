# Phase 29 Report - Direct Business Audit Writes

Status: PASS. Core business button actions now write directly to Supabase `audit_logs` in addition to the existing debounced workflow snapshot save.

## Objective

Close the production UAT gap found after Phase 28.

This phase adds direct business audit writes for workflow button actions.

The operator triggered `publisher.create` through the Media Manager `New publisher` button, but `/audit/events` still showed only `route.visit` and `auth.*` rows on the visible event stream. The app also showed `Supabase warning`, which means the bulk workflow snapshot save can be noisy and should not be the only path for business audit evidence.

## Scope

Phase 29 adds a direct audit write callback for core workflow pages:

- Media
- Sales
- Finance
- Contracts

When a service action returns an `auditEvent`, the page now calls `onAuditEvent(result.auditEvent)`. `App.tsx` receives that event and writes it through the existing `AuditLogRepository`.

The direct write includes:

```text
id: event.id
action
objectType
objectId
allowed
reasonCode
createdAt
afterData: buildBusinessAuditAfterData(event, activeUser.activeRole)
```

Using the same `event.id` keeps the later workflow snapshot upsert aligned with the direct audit row.

## Validation

Config and wiring validation:

```text
npm run validate:phase29
```

Expected result:

```text
PASS
Direct business audit write validation passed.
```

Regression validation:

```text
npm run validate:phase28
npm run validate:uat:local
npm run smoke:production -- --url https://pg-os-operation-system.vercel.app/
```

## Production UAT

After deployment:

1. Sign in through Supabase as `media_manager`.
2. Open `Publisher 360`.
3. Click `New publisher`.
4. Sign in as `CEO`.
5. Open `/audit/events`.
6. Confirm a visible audit row:

```text
publisher.create -> Media / publisher / allowed
```

The right-side status may still show `Supabase warning` for skipped fixture rows, but the direct `audit_logs` row should be visible independently of bulk workflow save warnings.

## Acceptance Criteria

Phase 29 is accepted when:

- Media, Sales, Finance, and Contract pages emit direct audit callbacks. PASS.
- App writes workflow audit events through `AuditLogRepository`. PASS.
- Business audit metadata still uses `buildBusinessAuditAfterData`. PASS.
- `npm run validate:phase29` passes. PASS.
- Production UAT can observe `publisher.create` in `/audit/events`. Pending operator redeploy and retest.
