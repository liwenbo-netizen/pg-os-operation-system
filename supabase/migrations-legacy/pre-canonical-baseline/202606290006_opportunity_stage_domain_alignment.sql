-- Phase 16B schema/domain enum alignment.
-- Align public.opportunities.stage with the frontend Opportunity domain model.

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
