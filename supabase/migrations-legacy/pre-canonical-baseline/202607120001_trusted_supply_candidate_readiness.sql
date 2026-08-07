-- Phase CM-5B: Trusted Supply Candidate -> Onboarding Readiness.
-- Keeps the candidate inside evaluation while technical and commercial checks are completed.

alter table public.trusted_supply_candidates
  add column if not exists readiness_started_at timestamptz,
  add column if not exists technical_reviewed_at timestamptz,
  add column if not exists commercial_reviewed_at timestamptz,
  add column if not exists onboarding_ready_at timestamptz,
  add column if not exists readiness_notes text;

alter table public.trusted_supply_candidates
  drop constraint if exists chk_trusted_supply_candidate_status;

alter table public.trusted_supply_candidates
  add constraint chk_trusted_supply_candidate_status check (
    status in (
      'candidate',
      'readiness_started',
      'technical_review_passed',
      'onboarding_ready',
      'onboarding_project_created',
      'rejected'
    )
  );

create index if not exists idx_trusted_supply_candidates_readiness
  on public.trusted_supply_candidates(status, onboarding_ready_at, owner_role);
