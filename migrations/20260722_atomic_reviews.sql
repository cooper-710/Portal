-- Apply to existing Supabase projects. New projects receive these from schema.sql.
create or replace function public.submit_deliverable_review(
  p_action_id uuid, p_decision public.asset_review_status, p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_action public.client_actions%rowtype;
begin
  if p_decision = 'changes_requested' and nullif(trim(p_note), '') is null then raise exception 'Change request feedback is required'; end if;
  if length(coalesce(p_note, '')) > 1000 then raise exception 'Review note is too long'; end if;
  select * into v_action from public.client_actions where id = p_action_id and client_id = auth.uid() and action_type = 'review_deliverable' and status = 'open' for update;
  if not found or v_action.asset_id is null then raise exception 'Review action not found'; end if;
  update public.assets set review_status = p_decision, review_note = case when p_decision = 'changes_requested' then nullif(trim(p_note), '') else null end, reviewed_at = now() where id = v_action.asset_id and visibility = 'deliverable';
  update public.client_actions set status = 'completed', completed_at = now(), metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('decision', p_decision::text, 'review_note', nullif(trim(p_note), '')) where id = v_action.id;
  return v_action.project_id;
end; $$;

create or replace function public.submit_project_review(
  p_action_id uuid, p_decision text, p_note text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_action public.client_actions%rowtype;
begin
  if p_decision not in ('approved', 'changes_requested') then raise exception 'Invalid project decision'; end if;
  if p_decision = 'changes_requested' and nullif(trim(p_note), '') is null then raise exception 'Change request feedback is required'; end if;
  if length(coalesce(p_note, '')) > 2000 then raise exception 'Project feedback is too long'; end if;
  select * into v_action from public.client_actions where id = p_action_id and client_id = auth.uid() and action_type = 'review_project' and status = 'open' for update;
  if not found then raise exception 'Project approval request not found'; end if;
  update public.client_actions set status = 'completed', completed_at = now(), metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('decision', p_decision, 'review_note', nullif(trim(p_note), '')) where id = v_action.id;
  update public.projects set status = case when p_decision = 'approved' then 'completed'::public.project_status else 'in_progress'::public.project_status end where id = v_action.project_id and client_id = auth.uid();
  return v_action.project_id;
end; $$;

revoke all on function public.submit_deliverable_review(uuid, public.asset_review_status, text) from public, anon;
grant execute on function public.submit_deliverable_review(uuid, public.asset_review_status, text) to authenticated;
revoke all on function public.submit_project_review(uuid, text, text) from public, anon;
grant execute on function public.submit_project_review(uuid, text, text) to authenticated;
