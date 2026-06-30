# Phase 11 Report - Supabase Repository Adapter

Status: PASS

## Objective

Move the Phase 4-10 in-memory workflow state behind a repository adapter so the application can load from and save to the locked Supabase schema when Supabase credentials are configured.

## Implemented Scope

- Added a workflow snapshot abstraction covering Media, Sales, Finance, Contract, Guide, and Workbench states.
- Added `LocalWorkflowRepository` as the fixture fallback for local prototype mode.
- Added `SupabaseWorkflowRepository` for table-level load and upsert operations.
- Added `createWorkflowRepository()` to choose Supabase only when `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist.
- Connected `App` startup to `loadSnapshot()`.
- Connected Supabase mode state changes to debounced `saveSnapshot()`.
- Added an App Shell data-source badge for fixture, loading, synced, and warning states.
- Changed newly created persisted business object ids to `crypto.randomUUID()` so Supabase UUID primary keys can accept new records.

## Supabase Mapping Coverage

Read/write coverage:

- `publishers`
- `publisher_contacts`
- `publisher_ad_slots`
- `publisher_contract_terms`
- `integration_projects`
- `commercial_tests`
- `advertisers`
- `advertiser_contacts`
- `opportunities`
- `proposals`
- `proposal_media_selections`
- `campaigns`
- `campaign_media_allocations`
- `quality_diagnostic_cases`
- `quality_diagnostic_evidence`
- `contracts`
- `settlements`
- `sop_cards`
- `work_items`
- `okr_objectives`
- `audit_logs`
- `module_business_events`

Read composition:

- Proposal selected publishers are composed from `proposal_media_selections`.
- Campaign publisher ids are composed from `campaign_media_allocations`.
- Commercial test metrics are composed from `commercial_tests.metrics`.
- Contract workflow-specific fields are preserved in `contracts.metadata`.
- SOP module, visibility, status, priority, summary, steps, and version are preserved in `sop_cards.metadata`.
- Workbench tasks map to `work_items`.
- OKR progress reads `okr_key_results` into the frontend `OkrObjective` shape.

## Guardrails

- The adapter keeps fixture fallback when a table read fails.
- The adapter skips writes with non-UUID primary keys because the locked schema uses UUID ids.
- The adapter skips rows whose required foreign keys are not UUIDs.
- Fixture slug ids remain supported in prototype mode.
- Newly created persisted records now use UUID ids.
- Pages still do not write directly to Supabase.

## Known Constraints

- The current UI still uses mock role login, not a real Supabase auth session. A live project with RLS enabled may reject reads or writes until real auth/session binding is added.
- Fixture seed records use readable slug ids, so they are intentionally treated as prototype-only rows by the Supabase writer.
- OKR write-back currently persists objective metadata. Full key-result progress write-back needs a frontend `key_result_id` or a deterministic key-result mapping.
- Activity timelines remain in memory for module-specific activity arrays. Audit and business events have table write support when their ids and object ids are UUID-compatible.

## Validation

- `npm run test`
- `npm run build`
- `npm run lint`
- `npm run validate:phase2`
- `npm run validate:phase11`
- Local Vite HTTP probe returned 200 for `http://127.0.0.1:5173/`.

## Next Recommended Phase

Add Supabase auth/session binding for the role simulator and create a UAT seed profile/role bridge so RLS-backed reads and writes can be validated against a live Supabase project.
