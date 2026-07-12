# CM-5B Report - Trusted Supply Candidate Onboarding Readiness

Status: Code complete, pending Supabase migration execution and production live-write UAT.

## Objective

Move Trusted Supply Candidate from a single conversion state into an operational readiness workflow before creating Publisher 360 onboarding projects.

This keeps the business rule intact:

- Trusted Supply Candidate is an evaluation state.
- Onboarding readiness means technical and commercial checks are ready for controlled onboarding.
- It is still not final trusted supply approval.

## Scope

CM-5B adds a guarded state flow under China Media Ecosystem Expansion:

1. `candidate`
2. `readiness_started`
3. `technical_review_passed`
4. `onboarding_ready`
5. `onboarding_project_created`

The existing onboarding project creation action is now blocked until the candidate reaches `onboarding_ready`.

## Database Change

New migration:

- `supabase/migrations/202607120001_trusted_supply_candidate_readiness.sql`

It adds:

- `readiness_started_at`
- `technical_reviewed_at`
- `commercial_reviewed_at`
- `onboarding_ready_at`
- `readiness_notes`

It also expands `chk_trusted_supply_candidate_status` to include readiness statuses.

## Application Changes

Updated files:

- `src/types/domain.ts`
- `src/services/chinaMediaEcosystemService.ts`
- `src/pages/media/MediaExperiencePage.tsx`
- `src/repositories/supabaseWorkflowRepository.ts`
- `src/services/businessAuditCoverage.ts`

New controlled actions:

- `china_media_ecosystem.readiness.start`
- `china_media_ecosystem.technical_review.complete`
- `china_media_ecosystem.commercial_review.complete`

New business events:

- `china_media_ecosystem.readiness_started`
- `china_media_ecosystem.technical_review_passed`
- `china_media_ecosystem.onboarding_ready`

## Validation

Local validation passed:

- `npm.cmd run validate:china-media`
- `npm.cmd run validate:phase11`
- `npm.cmd run build`

## Production UAT Needed

Before production UAT, execute the migration SQL in Supabase.

Suggested live-write test:

1. Login as Media Director or Media Manager.
2. Open `/media/china-ecosystem`.
3. Select a Trusted Supply Candidate.
4. Run `Start readiness`.
5. Run `Tech review`.
6. Run `Commercial review`.
7. Confirm `Onboarding project` becomes enabled only after commercial readiness.
8. Create onboarding project.
9. Login as CEO.
10. Open `/audit/events`.
11. Confirm readiness, technical review, commercial review, and onboarding project audit/business events are visible.

## Follow-Up

After production UAT passes, record CM-5B in UAT Result History / acceptance ledger.
