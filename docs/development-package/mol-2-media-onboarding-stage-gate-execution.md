# MOL-2 - Media Onboarding Stage Gate Execution

Status: LOCAL IMPLEMENTATION COMPLETE / PRODUCTION MIGRATION AND UAT PENDING.

## Objective

Turn the MOL-1 read-only lifecycle projection into an operator-owned stage-gate workflow without replacing the existing China Media Ecosystem, Publisher 360, contract, integration, Pilot, or supply-package records.

The domain records remain authoritative. A stage-gate approval confirms that the current stage evidence is acceptable and unlocks the next business action; it does not advance a publisher by changing downstream domain facts.

## Scope

MOL-2 adds one controlled stage-gate record for each lifecycle object and current stage:

- lifecycle object: ecosystem lead, trusted supply candidate, or publisher;
- accountable owner role and target completion date;
- stage-specific required deliverables and evidence references;
- stage-specific KPI evidence;
- blocker and operating notes;
- submit, approve, and reject decisions;
- immutable approved gates;
- audit log and module business events for every decision.

## Lifecycle Gates

The implementation covers all nine stages:

1. Media Discovery
2. Business Qualification
3. Commercial Agreement
4. Technical Qualification
5. SDK Integration
6. QA / Certification
7. Pilot
8. Production Launch
9. Scale Operation

Each stage has an explicit owner-role set, approval-role set, deliverable template, and KPI template in `src/services/mediaOnboardingStageGateService.ts`.

## Permissions

The service enforces stage-level manage and approval roles. The database migration adds:

- authenticated read access;
- write access for the approved media, integration, ad operations, data, legal, and operations roles;
- a database trigger that independently validates approve and reject transitions;
- approval actor and role binding to the authenticated Supabase user;
- immutable approved records.

The UI disables actions that the active role cannot perform, but the database trigger remains the final approval boundary.

## UI

`/media/onboarding-lifecycle` now provides:

- stage-gate status filtering;
- status and target date in the lifecycle queue;
- a stage-gate side panel;
- owner and target date controls;
- localized deliverable and KPI checklists;
- blocker, notes, save, submit, approve, and reject actions;
- direct links back to the authoritative business record.

## Persistence

Migration:

`supabase/migrations/202607260001_media_onboarding_stage_gates.sql`

Repository:

- loads `media_onboarding_stage_gates`;
- maps JSON deliverables and KPI evidence;
- dirty-saves only changed gate rows;
- preserves `created_by`;
- binds `updated_by` to the authenticated actor.

## Audit Events

Guard audit actions:

- `media_onboarding.stage_gate.start`
- `media_onboarding.stage_gate.update`
- `media_onboarding.stage_gate.submit`
- `media_onboarding.stage_gate.approve`
- `media_onboarding.stage_gate.reject`

Business events:

- `media_onboarding.stage_gate_started`
- `media_onboarding.stage_gate_updated`
- `media_onboarding.stage_gate_submitted`
- `media_onboarding.stage_gate_approved`
- `media_onboarding.stage_gate_rejected`

## Local Verification

Required before production handoff:

- stage-gate service tests;
- lifecycle projection tests;
- Supabase repository load and dirty-save tests;
- full TypeScript build;
- full Vitest suite;
- desktop and narrow-viewport UI smoke;
- browser console review.

## Production Activation

1. Execute `supabase/migrations/202607260001_media_onboarding_stage_gates.sql`.
2. Push the validated application commit to `master`.
3. Wait for Vercel production deployment.
4. Sign in as Media Manager or Media Director.
5. Start one low-risk Media Discovery gate, assign an owner and target date, enter deliverable and KPI evidence, save, and submit.
6. Sign in as Media Director and approve the submitted gate.
7. Sign in as CEO or Audit Viewer and verify the five stage-gate audit/business event families in `/audit/events`.
8. Record the result in UAT Result History.

## Acceptance Boundary

MOL-2 is not production accepted until the migration has succeeded and authenticated live-write UAT proves:

- RLS permits the intended operator actions;
- disallowed roles cannot approve;
- approved gates are immutable;
- reload preserves the gate;
- audit and business events are visible to governance roles.
