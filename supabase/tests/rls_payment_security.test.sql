begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(21);

-- Column grants are the first line of defense for system-managed state.
select ok(not has_column_privilege('authenticated', 'public.users', 'subscription_status', 'update'), 'subscription status is not user-writable');
select ok(not has_column_privilege('authenticated', 'public.users', 'stripe_subscription_id', 'update'), 'subscription id is not user-writable');
select ok(not has_column_privilege('authenticated', 'public.users', 'subscription_current_period_end', 'update'), 'subscription period is not user-writable');
select ok(not has_column_privilege('authenticated', 'public.users', 'stripe_customer_id', 'update'), 'billing customer id is not user-writable');
select ok(not has_column_privilege('authenticated', 'public.users', 'stripe_account_id', 'update'), 'Connect account id is not user-writable');
select ok(not has_column_privilege('authenticated', 'public.users', 'stripe_charges_enabled', 'update'), 'Connect readiness is not user-writable');
select ok(not has_column_privilege('authenticated', 'public.users', 'stripe_details_submitted', 'update'), 'Connect details state is not user-writable');
select ok(has_column_privilege('authenticated', 'public.users', 'full_name', 'update'), 'safe profile fields remain user-writable');
select ok(not has_column_privilege('authenticated', 'public.invoices', 'status', 'update'), 'invoice payment status is not user-writable');
select ok(not has_column_privilege('authenticated', 'public.invoices', 'stripe_payment_intent_id', 'update'), 'payment intent id is not user-writable');
select ok(not has_column_privilege('authenticated', 'public.invoices', 'stripe_checkout_session_id', 'update'), 'Checkout session id is not user-writable');
select ok(has_column_privilege('authenticated', 'public.invoices', 'amount', 'update'), 'pending invoice amount remains owner-editable');
select ok(not has_function_privilege('authenticated', 'public.mark_invoice_paid(uuid,text,text)', 'execute'), 'authenticated users cannot execute payment-state RPC');

-- Synthetic tenants. Inserting auth users exercises the production profile trigger.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-a@example.test', crypt('test-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'owner-b@example.test', crypt('test-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'client-b@example.test', crypt('test-password', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"role":"client"}', now(), now());

insert into public.projects (id, freelancer_id, client_id, client_email, title)
values
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', null, null, 'Tenant A project'),
  ('b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', 'client-b@example.test', 'Tenant B project');

insert into public.assets (id, project_id, file_url, file_name, visibility, uploaded_by)
values ('b1000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'b/secret.pdf', 'secret.pdf', 'deliverable', '20000000-0000-0000-0000-000000000002');

insert into public.invoices (id, project_id, amount, status, title)
values
  ('a2000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 10000, 'paid', 'Tenant A settled invoice'),
  ('b2000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-000000000002', 25000, 'pending', 'Tenant B invoice');

insert into public.client_actions (id, project_id, client_id, freelancer_id, action_type, title)
values ('b3000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'review_project', 'Tenant B approval');

-- Act as owner A through the same JWT context PostgREST uses.
select set_config(
  'request.jwt.claims',
  '{"sub":"10000000-0000-0000-0000-000000000001","role":"authenticated","email":"owner-a@example.test"}',
  true
);
set local role authenticated;

select throws_ok(
  $$update public.users set subscription_status = 'active' where id = '10000000-0000-0000-0000-000000000001'$$,
  '42501', null,
  'owner cannot self-grant an active subscription'
);

select throws_ok(
  $$update public.invoices set status = 'paid' where id = 'b2000000-0000-0000-0000-000000000002'$$,
  '42501', null,
  'authenticated owner cannot write payment outcome'
);

update public.users set full_name = 'Cross-tenant edit' where id = '20000000-0000-0000-0000-000000000002';
update public.projects set title = 'Cross-tenant edit' where id = 'b0000000-0000-0000-0000-000000000002';
update public.invoices set amount = 1 where id = 'b2000000-0000-0000-0000-000000000002';
delete from public.assets where id = 'b1000000-0000-0000-0000-000000000002';
update public.client_actions set status = 'dismissed' where id = 'b3000000-0000-0000-0000-000000000002';
update public.invoices set amount = 1 where id = 'a2000000-0000-0000-0000-000000000001';

reset role;

select is((select full_name from public.users where id = '20000000-0000-0000-0000-000000000002'), null, 'other tenant profile was not modified');
select is((select title from public.projects where id = 'b0000000-0000-0000-0000-000000000002'), 'Tenant B project', 'other tenant project was not modified');
select is((select amount from public.invoices where id = 'b2000000-0000-0000-0000-000000000002'), 25000, 'other tenant invoice was not modified');
select is((select count(*)::integer from public.assets where id = 'b1000000-0000-0000-0000-000000000002'), 1, 'other tenant asset was not deleted');
select is((select status::text from public.client_actions where id = 'b3000000-0000-0000-0000-000000000002'), 'open', 'other tenant action was not modified');
select is((select amount from public.invoices where id = 'a2000000-0000-0000-0000-000000000001'), 10000, 'settled invoice amount was not modified by its owner');

select * from finish();
rollback;
