-- Users may dismiss only their own user-facing notifications. Internal events
-- and delivery history remain service-role-only and are not deleted.
grant delete on table public.notifications to authenticated;

create policy notifications_delete_own
  on public.notifications for delete to authenticated
  using ((select auth.uid()) = user_id);
