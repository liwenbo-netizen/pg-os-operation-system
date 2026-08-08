-- CX-0201 rollback. This intentionally fails once any transition has been executed.
do $$
begin
  if to_regclass('public.workflow_transition_executions') is not null
    and exists (select 1 from public.workflow_transition_executions)
  then
    raise exception 'CX-0201 rollback refused: workflow transition history exists';
  end if;
end;
$$;

drop view if exists public.workflow_instance_compatibility_v;
drop table if exists public.workflow_transition_executions;
drop table if exists public.workflow_instances;
drop function if exists public.workflow_stage_node_is_valid(text, text);
drop function if exists public.workflow_stage_for_node(text);
