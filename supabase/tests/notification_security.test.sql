begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(35);

select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ),
  'the RLS-protected user notification stream is enabled for Realtime'
);

select ok(not has_table_privilege('authenticated', 'public.notification_events', 'select'), 'authenticated users cannot read internal notification events');
select ok(not has_table_privilege('authenticated', 'public.notification_events', 'insert'), 'authenticated users cannot forge notification events');
select ok(not has_table_privilege('authenticated', 'public.notification_deliveries', 'select'), 'authenticated users cannot read delivery attempts');
select ok(not has_table_privilege('authenticated', 'public.notification_deliveries', 'insert'), 'authenticated users cannot forge delivery attempts');
select ok(has_table_privilege('authenticated', 'public.notifications', 'select'), 'authenticated users can read in-app notifications through RLS');
select ok(not has_table_privilege('authenticated', 'public.notifications', 'insert'), 'authenticated users cannot forge in-app notifications');
select ok(has_column_privilege('authenticated', 'public.notifications', 'read_at', 'update'), 'authenticated users can mark a notification read');
select ok(not has_column_privilege('authenticated', 'public.notifications', 'title', 'update'), 'authenticated users cannot rewrite notification content');
select ok(has_table_privilege('authenticated', 'public.notifications', 'delete'), 'authenticated users can delete their own notifications through RLS');
select ok(has_table_privilege('authenticated', 'public.notification_preferences', 'update'), 'authenticated users can manage preferences through RLS');
select ok(has_table_privilege('authenticated', 'public.push_subscriptions', 'delete'), 'authenticated users can remove their browser subscription through RLS');
select ok(has_column('public', 'push_subscriptions', 'origin'), 'push subscriptions record the service-worker origin');

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('41000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notify-a@example.test', crypt('test-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('42000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'notify-b@example.test', crypt('test-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now());

insert into public.notification_events (id, event_key, event_type, recipient_id)
values
  ('43000000-0000-0000-0000-000000000001', 'test:notify-a', 'project_closed', '41000000-0000-0000-0000-000000000001'),
  ('43000000-0000-0000-0000-000000000002', 'test:notify-b', 'project_closed', '42000000-0000-0000-0000-000000000002');

insert into public.notifications (id, event_id, user_id, notification_type, title, body, href)
values
  ('44000000-0000-0000-0000-000000000001', '43000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'project_closed', 'A notification', 'A body', '/dashboard'),
  ('44000000-0000-0000-0000-000000000002', '43000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'project_closed', 'B notification', 'B body', '/dashboard');

insert into public.notification_preferences (user_id, timezone)
values
  ('41000000-0000-0000-0000-000000000001', 'America/Detroit'),
  ('42000000-0000-0000-0000-000000000002', 'UTC');

insert into public.push_subscriptions (id, user_id, endpoint, p256dh, auth, origin)
values
  ('45000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'https://push.example.test/a', 'key-a', 'auth-a', 'https://finalia.app'),
  ('45000000-0000-0000-0000-000000000002', '42000000-0000-0000-0000-000000000002', 'https://push.example.test/b', 'key-b', 'auth-b', 'https://finalia.app');

select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated","email":"notify-a@example.test"}',
  true
);
set local role authenticated;

select is((select count(*)::integer from public.notifications), 1, 'user sees only their own notifications');
select is((select title from public.notifications limit 1), 'A notification', 'visible notification belongs to the signed-in user');

update public.notifications set read_at = now() where id = '44000000-0000-0000-0000-000000000001';
update public.notifications set read_at = now() where id = '44000000-0000-0000-0000-000000000002';
select is((select count(*)::integer from public.notifications where read_at is not null), 1, 'user can mark only their own notification read');

select throws_ok(
  $$update public.notifications set title = 'forged' where id = '44000000-0000-0000-0000-000000000001'$$,
  '42501', null, 'notification content is immutable to authenticated users'
);
select throws_ok(
  $$insert into public.notifications (event_id, user_id, notification_type, title, body) values ('43000000-0000-0000-0000-000000000001', '41000000-0000-0000-0000-000000000001', 'fake', 'fake', 'fake')$$,
  '42501', null, 'user cannot create a forged notification'
);

update public.notification_preferences set email_enabled = false where user_id = '41000000-0000-0000-0000-000000000001';
update public.notification_preferences set email_enabled = false where user_id = '42000000-0000-0000-0000-000000000002';
select is((select email_enabled from public.notification_preferences where user_id = '41000000-0000-0000-0000-000000000001'), false, 'user can update their own notification preferences');

update public.notification_preferences set timezone = 'America/New_York'
where user_id = '42000000-0000-0000-0000-000000000002';
select is((select timezone from public.notification_preferences where user_id = '41000000-0000-0000-0000-000000000001'), 'America/Detroit', 'cross-tenant preference upsert cannot change the current user');

select is((select count(*)::integer from public.push_subscriptions), 1, 'user sees only their own push subscriptions');
delete from public.push_subscriptions where id = '45000000-0000-0000-0000-000000000002';
select is((select count(*)::integer from public.push_subscriptions), 1, 'user cannot delete another user push subscription');
delete from public.push_subscriptions where id = '45000000-0000-0000-0000-000000000001';
select is((select count(*)::integer from public.push_subscriptions), 0, 'user can delete their own push subscription');

reset role;

select is((select read_at is not null from public.notifications where id = '44000000-0000-0000-0000-000000000001'), true, 'own read state persisted');
select is((select read_at is null from public.notifications where id = '44000000-0000-0000-0000-000000000002'), true, 'cross-tenant read state did not change');
select is((select email_enabled from public.notification_preferences where user_id = '42000000-0000-0000-0000-000000000002'), true, 'cross-tenant preference did not change');
select is((select count(*)::integer from public.push_subscriptions where user_id = '42000000-0000-0000-0000-000000000002'), 1, 'cross-tenant push subscription was not deleted');
select is((select count(*)::integer from public.notification_events), 2, 'internal events were not exposed or modified');

select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated","email":"notify-a@example.test"}',
  true
);
set local role authenticated;
delete from public.notifications where id in (
  '44000000-0000-0000-0000-000000000001',
  '44000000-0000-0000-0000-000000000002'
);
reset role;

select is((select count(*)::integer from public.notifications where id = '44000000-0000-0000-0000-000000000001'), 0, 'user can delete their own notification');
select is((select count(*)::integer from public.notifications where id = '44000000-0000-0000-0000-000000000002'), 1, 'user cannot delete another tenant notification');

insert into public.projects (id, freelancer_id, client_id, client_email, title)
values (
  '46000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000002',
  'notify-b@example.test',
  'Feedback notification project'
);

insert into public.assets (
  id, project_id, file_url, file_name, visibility, uploaded_by,
  review_status, review_note, reviewed_at
) values
  (
    '47000000-0000-0000-0000-000000000001',
    '46000000-0000-0000-0000-000000000001',
    'feedback/reviewed.png',
    'Reviewed.png',
    'deliverable',
    '41000000-0000-0000-0000-000000000001',
    'changes_requested',
    'Please revise this',
    now()
  ),
  (
    '47000000-0000-0000-0000-000000000002',
    '46000000-0000-0000-0000-000000000001',
    'feedback/auto-resolved.png',
    'Auto resolved.png',
    'deliverable',
    '41000000-0000-0000-0000-000000000001',
    'changes_requested',
    'Please revise this too',
    now()
  );

select set_config(
  'request.jwt.claims',
  '{"sub":"41000000-0000-0000-0000-000000000001","role":"authenticated","email":"notify-a@example.test"}',
  true
);
set local role authenticated;

update public.assets
set feedback_reviewed_at = '2026-07-22T22:00:00Z'
where id = '47000000-0000-0000-0000-000000000001';

update public.assets
set feedback_reviewed_at = feedback_reviewed_at
where id = '47000000-0000-0000-0000-000000000001';

update public.assets
set feedback_reviewed_at = '2026-07-22T22:01:00Z',
    feedback_resolved_at = '2026-07-22T22:01:00Z'
where id = '47000000-0000-0000-0000-000000000002';

reset role;

select is(
  (
    select count(*)::integer
    from public.notification_events
    where event_type = 'deliverable_feedback_reviewed'
  ),
  1,
  'explicitly marking feedback reviewed creates one durable event'
);
select is(
  (
    select recipient_id
    from public.notification_events
    where event_type = 'deliverable_feedback_reviewed'
  ),
  '42000000-0000-0000-0000-000000000002'::uuid,
  'feedback reviewed event is routed to the project client'
);
select is(
  (
    select actor_id
    from public.notification_events
    where event_type = 'deliverable_feedback_reviewed'
  ),
  '41000000-0000-0000-0000-000000000001'::uuid,
  'feedback reviewed event records the project owner as actor'
);
select is(
  (
    select asset_id
    from public.notification_events
    where event_type = 'deliverable_feedback_reviewed'
  ),
  '47000000-0000-0000-0000-000000000001'::uuid,
  'feedback reviewed event links to the reviewed deliverable'
);
select is(
  (
    select count(*)::integer
    from public.notification_events
    where event_type = 'deliverable_feedback_reviewed'
      and asset_id = '47000000-0000-0000-0000-000000000002'
  ),
  0,
  'automatic feedback resolution does not send a redundant reviewed event'
);

select * from finish();
rollback;
