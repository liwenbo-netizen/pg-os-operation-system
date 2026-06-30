# Phase 16B Report - Schema / Domain Enum Alignment

Status: PASS. Live database migration and full UAT acceptance gate completed successfully.

## Objective

Align `public.opportunities.stage` with the frontend `Opportunity.stage` domain model and prevent future drift.

## Decision

The frontend workflow already uses these stages:

- `discovery`
- `need_confirmed`
- `proposal_drafting`
- `proposal_review`
- `won`
- `lost`

The database should accept the frontend workflow stages rather than forcing the frontend back to the legacy remote constraint values.

## Implemented Scope

- Added `supabase/migrations/202606290006_opportunity_stage_domain_alignment.sql`.
- Added `chk_opportunity_stage` to the base schema.
- Updated `supabase/README.md` migration order.
- Added `scripts/validate-domain-schema-alignment.mjs`.
- Added `scripts/validate-domain-schema-alignment.test.mjs`.
- Added npm scripts:
  - `validate:domain-schema`
  - `validate:phase16b`
- Added `validate:domain-schema` to `npm run validate:uat:local` and `npm run validate:uat`.
- Updated Phase 15 and Phase 16A docs to remove the open drift item.
- Updated the live write smoke probe to use `proposal_drafting`.

## Applied Live Migration

Apply:

```sql
alter table public.opportunities
drop constraint if exists chk_opportunity_stage;

update public.opportunities
set stage = case
  when stage = 'negotiation' then 'proposal_review'
  when stage = 'qualified' then 'need_confirmed'
  when stage = 'proposal' then 'proposal_drafting'
  when stage in ('discovery','need_confirmed','proposal_drafting','proposal_review','won','lost') then stage
  else 'discovery'
end
where stage not in ('discovery','need_confirmed','proposal_drafting','proposal_review','won','lost');

alter table public.opportunities
add constraint chk_opportunity_stage
check (stage in ('discovery','need_confirmed','proposal_drafting','proposal_review','won','lost'));
```

Live migration was applied manually in Supabase SQL Editor. Then the full UAT gate passed:

```text
PG OS UAT acceptance gate passed in 77.8s.
RLS trace: pgos-uat-1782740448076
Live writes trace: pgos-live-1782740462074
Live write cleanup rows: 12
```

## Validation

- `npm run validate:phase16b`
- `npm run validate:domain-schema`
- `npm run validate:uat`
