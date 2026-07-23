-- Notify the client when the owner explicitly acknowledges requested changes.
-- Automatic resolution from a replacement upload or project completion sets
-- reviewed and resolved together, so it intentionally does not emit this event.

create or replace function private.capture_asset_feedback_reviewed_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
begin
  if new.feedback_reviewed_at is null
     or new.feedback_reviewed_at is not distinct from old.feedback_reviewed_at
     or new.feedback_resolved_at is not null then
    return new;
  end if;

  select *
  into v_project
  from public.projects
  where id = new.project_id;

  perform private.enqueue_notification_event(
    'asset:' || new.id || ':feedback-reviewed:' || new.feedback_reviewed_at::text,
    'deliverable_feedback_reviewed',
    v_project.client_id,
    null,
    v_project.freelancer_id,
    v_project.freelancer_id,
    new.project_id,
    null,
    new.id,
    jsonb_build_object(
      'file_name', new.file_name,
      'project_title', v_project.title
    ),
    now()
  );

  return new;
end;
$$;

revoke all on function private.capture_asset_feedback_reviewed_notification()
  from public, anon, authenticated;

create trigger assets_capture_feedback_reviewed_notification
  after update of feedback_reviewed_at, feedback_resolved_at on public.assets
  for each row execute function private.capture_asset_feedback_reviewed_notification();
