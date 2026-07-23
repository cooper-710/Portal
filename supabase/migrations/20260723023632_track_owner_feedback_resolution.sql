alter table public.assets
  add column feedback_reviewed_at timestamptz,
  add column feedback_resolved_at timestamptz,
  add constraint assets_feedback_resolution_order_check check (
    feedback_resolved_at is null or feedback_reviewed_at is not null
  );

comment on column public.assets.feedback_reviewed_at is
  'When the workspace owner acknowledged the client change request.';
comment on column public.assets.feedback_resolved_at is
  'When a revised deliverable was shared or the project was completed.';

create or replace function private.protect_asset_feedback_resolution()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.feedback_reviewed_at is distinct from old.feedback_reviewed_at
     or new.feedback_resolved_at is distinct from old.feedback_resolved_at then
    if current_user not in ('postgres', 'service_role', 'supabase_admin')
       and not exists (
         select 1
         from public.projects p
         where p.id = new.project_id
           and p.freelancer_id = (select auth.uid())
       ) then
      raise exception 'Only the project owner can manage feedback resolution'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.protect_asset_feedback_resolution()
  from public, anon, authenticated;

create trigger assets_protect_feedback_resolution
  before update of feedback_reviewed_at, feedback_resolved_at on public.assets
  for each row execute function private.protect_asset_feedback_resolution();

create or replace function public.submit_deliverable_review(
  p_action_id uuid,
  p_decision public.asset_review_status,
  p_note text default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action public.client_actions%rowtype;
begin
  if p_decision = 'changes_requested'
     and nullif(trim(p_note), '') is null then
    raise exception 'Change request feedback is required';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'Review note is too long';
  end if;

  select * into v_action
  from public.client_actions
  where id = p_action_id
    and client_id = (select auth.uid())
    and action_type = 'review_deliverable'
    and status = 'open'
  for update;

  if not found or v_action.asset_id is null then
    raise exception 'Review action not found';
  end if;

  update public.assets
  set review_status = p_decision,
      review_note = case
        when p_decision = 'changes_requested' then nullif(trim(p_note), '')
        else null
      end,
      reviewed_at = now(),
      feedback_reviewed_at = null,
      feedback_resolved_at = null
  where id = v_action.asset_id
    and visibility = 'deliverable';

  update public.client_actions
  set status = 'completed',
      completed_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'decision', p_decision::text,
        'review_note', nullif(trim(p_note), '')
      )
  where id = v_action.id;

  return v_action.project_id;
end;
$$;
