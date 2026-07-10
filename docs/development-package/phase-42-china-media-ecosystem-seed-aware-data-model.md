# Phase 42: China Media Ecosystem Seed-Aware Data Model

## Objective

Create a seed-safe data model for China Media Ecosystem Expansion.

The seed package contains 468 ecosystem opportunities from the 2024 China digital media ecosystem map. These rows are not trusted media, not publisher records, not sales-ready inventory, and not deal-ready supply. The schema must keep them isolated until PG OS users verify the opportunity and explicitly convert it into the trusted supply workflow.

## Source Inputs

- `PGOS_Codex_China_Media_Ecosystem_Expansion_Guidance_V1.0/03_PRODUCT_SPEC_AND_PHASES.md`
- `PGOS_Codex_China_Media_Ecosystem_Expansion_Guidance_V1.0/04_DATA_MODEL_SPEC.md`
- `PGOS_Codex_China_Media_Ecosystem_Expansion_Guidance_V1.0/05_ACCEPTANCE_TEST_CHECKLIST.md`
- `PGOS_China_Media_Ecosystem_Seed_V0.1_Package.zip`

## Seed Package Summary

- Total seed rows: 468
- Priority seed split: 238 B-level rows, 230 C-level rows
- Confidence split: 333 parsed-text rows, 135 appendix-image-manual rows
- Review-required rows: 137
- Default import batch: `CN_MEDIA_MAP_2024_MAMS_V0_1`
- Dry-run duplicate warnings: `芒果TV` and `哔哩哔哩` appear twice under source version `2024-7`; this does not block import because `seed_id` remains unique.

## Tables Added

The migration `supabase/migrations/202607100001_china_media_ecosystem_schema.sql` adds:

- `media_ecosystem_segments`
- `media_ecosystem_opportunities`
- `media_ecosystem_outreach_activities`
- `trusted_supply_candidates`
- `media_ecosystem_conversion_logs`

## Design Decisions

`media_ecosystem_opportunities` is the landing table for seed rows. It intentionally does not write into `publishers`.

`seed_id` is unique and should be used for repeat-safe import. The fallback duplicate guard is `media_name + source_name + source_version` when `seed_id` is not present.

`priority_score` is generated from the seven score fields so the database remains the source of truth for the total score.

Seed rows default to:

```text
ecosystem_status = ECOSYSTEM_MAPPED
verification_status = UNVERIFIED
data_quality_level = SEED_ONLY
trust_status = NOT_VERIFIED
trusted_supply_candidate = false
deal_ready_status = NOT_READY
recommended_trading_mode = NEEDS_REVIEW
```

## Safety Guards

The migration blocks seed rows from becoming trusted supply or deal-ready inventory while `data_quality_level = SEED_ONLY`.

Trusted Supply Candidate conversion requires:

```text
data_quality_level != SEED_ONLY
priority_score >= 70
media_contact_confirmed = true
business_interest_confirmed = true
ad_inventory_identified = true
integration_feasibility != impossible
media_director_approved_at is not null
```

The `trusted_supply_candidates` table also has a trigger that re-checks the gate before insert or update.

## RLS Policy

Authenticated business users can read the ecosystem tables.

Media Manager, Media Director, Operations Director, and System Admin can operate on opportunities and outreach activities. Trusted candidate writes are allowed for the same roles but still blocked by the database gate unless media director approval and all conversion conditions are present.

Conversion logs are append-only for media and operations roles.

## Why This Does Not Break Existing Media Flow

Existing Publisher 360, integration projects, commercial tests, sales readiness, contracts, and finance settlement flows are untouched.

The new opportunity pool only links into `publishers` after Trusted Supply Candidate conversion and future onboarding work. This preserves the rule:

```text
media_name != trusted supply
seed opportunity != publisher
trusted candidate != deal-ready inventory
```

## Manual Validation Required Later

This phase only adds local migration artifacts. It does not update the live Supabase project.

Before the application can use these tables in production, the migration must be manually executed in Supabase SQL Editor or applied through the team's migration process.

## Next Phase

Phase 43 implements a dry-run seed validator:

- Read the seed JSON/CSV package.
- Validate all 468 rows.
- Confirm status defaults and forbidden commitments.
- Confirm segment enum compatibility.
- Report duplicate and review-required rows.
- Do not insert data yet.

Local command:

```text
npm.cmd run validate:china-media:seed
```

The validator auto-detects `PGOS_China_Media_Ecosystem_Seed_V0.1_Package.zip` from the workspace root, `PGOS_CHINA_MEDIA_SEED_PACKAGE`, or the user Documents folder. It can also be pointed at a package manually:

```text
node scripts/validate-china-media-seed.mjs --package <zip-path>
```

## Phase 43 Controlled Import Artifact

Generated seed SQL:

```text
supabase/seed/202607100002_china_media_ecosystem_seed.sql
```

Local command:

```text
npm.cmd run generate:china-media:seed-sql
```

The generated SQL:

- Upserts rows into `media_ecosystem_opportunities` by `seed_id`.
- Inserts a single `seed_import` conversion log per opportunity.
- Does not write `publishers`, `trusted_supply_candidates`, `integration_projects`, proposal, campaign, contract, settlement, or deal records.
- Preserves all safe seed defaults from the source package.
- Leaves operational scoring as `UNSCORED`; `priority_level_seed` is stored separately from formal priority.
