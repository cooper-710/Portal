-- Portal client workspace: Supabase schema
-- Run this in the Supabase SQL Editor (or via supabase db query / MCP apply_migration).

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('freelancer', 'client');
create type public.project_status as enum (
  'draft',
  'active',
  'in_review',
  'completed',
  'archived',
  'discovery',
  'in_progress',
  'review'
);
create type public.invoice_status as enum (
  'pending', 'paid', 'processing', 'canceled',
  'partially_refunded', 'refunded', 'disputed'
);
create type public.asset_visibility as enum ('internal', 'deliverable');
create type public.asset_review_status as enum ('pending', 'approved', 'changes_requested');
create type public.payment_kind as enum (
  'standard',
  'deposit',
  'installment',
  'retainer',
  'recurring',
  'standalone'
);
create type public.recurrence_frequency as enum (
  'weekly',
  'monthly',
  'yearly'
);
create type public.client_action_type as enum (
  'pay_invoice',
  'review_deliverable',
  'review_project'
);
create type public.client_action_status as enum ('open', 'completed', 'dismissed');
create type public.platform_subscription_status as enum (
  'none',
  'incomplete',
  'incomplete_expired',
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'paused'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Application profiles linked 1:1 with auth.users
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.user_role not null default 'freelancer',
  password_set boolean not null default false,
  -- Client portal branding (freelancer business profile)
  business_name text,
  logo_url text,
  brand_primary text check (brand_primary is null or brand_primary ~ '^#[0-9A-Fa-f]{6}$'),
  brand_accent text check (brand_accent is null or brand_accent ~ '^#[0-9A-Fa-f]{6}$'),
  welcome_message text,
  appearance text not null default 'light' check (appearance in ('light', 'default')),
  stripe_account_id text unique,
  stripe_charges_enabled boolean not null default false,
  stripe_details_submitted boolean not null default false,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status public.platform_subscription_status not null default 'none',
  subscription_current_period_end timestamptz,
  -- Freelancer one-time customize-portal step (set on save or skip)
  portal_setup_completed_at timestamptz,
  -- Guided full-screen onboarding wizard (freelancers only)
  onboarding_completed_at timestamptz,
  onboarding_step text check (
    onboarding_step is null
    or onboarding_step in (
      'welcome',
      'trial',
      'stripe',
      'branding',
      'project',
      'invite',
      'done'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  freelancer_id uuid not null references public.users (id) on delete cascade,
  client_id uuid references public.users (id) on delete set null,
  client_email text,
  title text not null,
  status public.project_status not null default 'discovery',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_freelancer_not_client check (
    client_id is null or freelancer_id <> client_id
  )
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  file_url text not null,
  file_name text,
  visibility public.asset_visibility not null default 'internal',
  uploaded_by uuid not null references public.users (id) on delete cascade,
  review_status public.asset_review_status,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  amount integer not null check (amount > 0), -- amount in cents
  currency text not null default 'usd',
  status public.invoice_status not null default 'pending',
  payment_kind public.payment_kind not null default 'standard',
  due_date date,
  installment_number integer,
  parent_invoice_id uuid references public.invoices (id) on delete set null,
  title text,
  series_key text,
  recurrence_frequency public.recurrence_frequency,
  stripe_payment_intent_id text unique,
  stripe_checkout_session_id text unique,
  stripe_connected_account_id text,
  amount_paid integer not null default 0 check (amount_paid >= 0),
  amount_refunded integer not null default 0 check (amount_refunded >= 0),
  stripe_charge_id text,
  stripe_dispute_id text,
  dispute_status text check (dispute_status in ('open', 'won', 'lost')),
  payment_status_updated_at timestamptz,
  last_payment_event_created_at bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.client_actions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid not null references public.users (id) on delete cascade,
  freelancer_id uuid not null references public.users (id) on delete cascade,
  action_type public.client_action_type not null,
  status public.client_action_status not null default 'open',
  title text not null,
  description text,
  invoice_id uuid references public.invoices (id) on delete cascade,
  asset_id uuid references public.assets (id) on delete cascade,
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Stripe webhook event claims (service-role only; event-level idempotency)
create table public.stripe_webhook_events (
  id text primary key,
  type text not null,
  stripe_connected_account_id text,
  processed_at timestamptz not null default now()
);

create table public.invoice_payment_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  stripe_event_id text not null unique,
  event_type text not null,
  stripe_object_id text,
  outcome text not null,
  invoice_status public.invoice_status,
  amount_paid integer check (amount_paid is null or amount_paid >= 0),
  amount_refunded integer check (amount_refunded is null or amount_refunded >= 0),
  stripe_charge_id text,
  stripe_dispute_id text,
  stripe_connected_account_id text,
  failure_code text,
  failure_message text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

-- ---------------------------------------------------------------------------
-- Indexes (columns used in RLS + common filters)
-- ---------------------------------------------------------------------------
create index projects_freelancer_id_idx on public.projects (freelancer_id);
create index projects_client_id_idx on public.projects (client_id);
create index projects_client_email_idx on public.projects (lower(client_email));
create index projects_status_idx on public.projects (status);
create index assets_project_id_idx on public.assets (project_id);
create index assets_uploaded_by_idx on public.assets (uploaded_by);
create index assets_visibility_idx on public.assets (visibility);
create index invoices_project_id_idx on public.invoices (project_id);
create index invoices_status_idx on public.invoices (status);
create index invoices_due_date_idx on public.invoices (due_date);
create index invoices_payment_kind_idx on public.invoices (payment_kind);
create index invoices_parent_invoice_id_idx on public.invoices (parent_invoice_id);
create index invoices_series_key_idx on public.invoices (series_key);
create unique index invoices_stripe_charge_id_uidx on public.invoices (stripe_charge_id)
  where stripe_charge_id is not null;
create index invoices_connected_account_idx on public.invoices (stripe_connected_account_id)
  where stripe_connected_account_id is not null;
create index invoice_payment_events_invoice_occurred_idx
  on public.invoice_payment_events (invoice_id, occurred_at desc);
create index invoice_payment_events_connected_account_idx
  on public.invoice_payment_events (stripe_connected_account_id, occurred_at desc)
  where stripe_connected_account_id is not null;
create index client_actions_client_id_idx on public.client_actions (client_id);
create index client_actions_project_id_idx on public.client_actions (project_id);
create index client_actions_status_idx on public.client_actions (status);
create index client_actions_invoice_id_idx on public.client_actions (invoice_id);
create index client_actions_asset_id_idx on public.client_actions (asset_id);
create unique index client_actions_open_invoice_uidx
  on public.client_actions (invoice_id)
  where status = 'open' and invoice_id is not null;
create unique index client_actions_open_asset_uidx
  on public.client_actions (asset_id)
  where status = 'open' and asset_id is not null;
create unique index client_actions_open_project_review_uidx
  on public.client_actions (project_id, action_type)
  where status = 'open' and action_type = 'review_project';
create index stripe_webhook_events_processed_at_idx
  on public.stripe_webhook_events (processed_at desc);

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create trigger client_actions_set_updated_at
  before update on public.client_actions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create public.users row when a new auth user signs up
-- Default role is freelancer (self-serve workspace). Invites pass role=client.
-- Matching a pending project invite also forces client.
-- Authorization thereafter uses public.users.role : never user_metadata alone.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_role public.user_role;
  selected_full_name text;
  selected_password_set boolean;
  auth_provider text;
begin
  selected_role := case
    when (new.raw_user_meta_data ->> 'role') = 'client' then 'client'::public.user_role
    else 'freelancer'::public.user_role
  end;

  -- Email/password signup sends full_name; Google OAuth sends full_name and/or name.
  selected_full_name := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        ''
      )
    ),
    ''
  );

  -- OAuth users never set a local password : skip /onboarding/password.
  auth_provider := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  selected_password_set := auth_provider is distinct from 'email';

  insert into public.users (id, email, full_name, role, password_set)
  values (
    new.id,
    new.email,
    selected_full_name,
    selected_role,
    selected_password_set
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name),
        password_set = public.users.password_set or excluded.password_set;

  update public.projects
  set client_id = new.id,
      updated_at = now()
  where client_id is null
    and client_email is not null
    and lower(client_email) = lower(new.email);

  if selected_role = 'freelancer'
     and exists (select 1 from public.projects p where p.client_id = new.id)
     and not exists (select 1 from public.projects p where p.freelancer_id = new.id) then
    update public.users
    set role = 'client'
    where id = new.id
      and role = 'freelancer';
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Helper: current user's role (security definer to avoid RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = (select auth.uid());
$$;

create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = p_project_id
      and (
        p.freelancer_id = (select auth.uid())
        or p.client_id = (select auth.uid())
      )
  );
$$;

create or replace function public.link_projects_for_client(p_user_id uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  auth_email text;
begin
  if (select auth.uid()) is null or p_user_id is distinct from (select auth.uid()) then
    raise exception 'Not authorized';
  end if;

  select email into auth_email from auth.users where id = (select auth.uid());
  if auth_email is null then
    return;
  end if;

  update public.projects
  set client_id = p_user_id,
      updated_at = now()
  where client_id is null
    and client_email is not null
    and lower(client_email) = lower(auth_email);

  if exists (select 1 from public.projects where client_id = p_user_id)
     and not exists (select 1 from public.projects where freelancer_id = p_user_id) then
    update public.users
    set role = 'client'
    where id = p_user_id
      and role <> 'client';
  end if;
end;
$$;

create or replace function public.mark_invoice_paid(
  p_invoice_id uuid,
  p_checkout_session_id text default null,
  p_payment_intent_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.invoices
  set
    status = 'paid',
    stripe_checkout_session_id = coalesce(p_checkout_session_id, stripe_checkout_session_id),
    stripe_payment_intent_id = coalesce(p_payment_intent_id, stripe_payment_intent_id),
    updated_at = now()
  where id = p_invoice_id
    and status <> 'paid';

  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;

grant select on table public.users to authenticated;
-- Authenticated users may edit only user-owned presentation/onboarding fields.
-- Stripe, subscription, role, identity, and audit fields are server-managed.
grant update (
  full_name,
  password_set,
  business_name,
  logo_url,
  brand_primary,
  brand_accent,
  welcome_message,
  appearance,
  portal_setup_completed_at,
  onboarding_completed_at,
  onboarding_step
) on table public.users to authenticated;

grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.assets to authenticated;
grant select, insert, delete on table public.invoices to authenticated;
-- Payment outcome and Stripe identifiers are webhook/admin managed.
grant update (amount, due_date, title) on table public.invoices to authenticated;
grant select, insert, update on table public.client_actions to authenticated;

grant usage, select on all sequences in schema public to authenticated;

grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;

-- Lock down SECURITY DEFINER helpers (not callable via PostgREST by anon)
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_project_member(uuid) from public, anon;
revoke all on function public.link_projects_for_client(uuid, text) from public, anon;
revoke all on function public.mark_invoice_paid(uuid, text, text) from public, anon, authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
grant execute on function public.link_projects_for_client(uuid, text) to authenticated;
grant execute on function public.mark_invoice_paid(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.assets enable row level security;
alter table public.invoices enable row level security;
alter table public.client_actions enable row level security;
alter table public.stripe_webhook_events enable row level security;
alter table public.invoice_payment_events enable row level security;

-- stripe_webhook_events: service_role only (no anon/authenticated policies)
revoke all on table public.stripe_webhook_events from anon, authenticated;
grant all on table public.stripe_webhook_events to service_role;

revoke all on table public.invoice_payment_events from anon, authenticated;
grant select on table public.invoice_payment_events to authenticated;
grant all on table public.invoice_payment_events to service_role;

create policy "Project members can view invoice payment events"
  on public.invoice_payment_events for select to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_payment_events.invoice_id
        and public.is_project_member(i.project_id)
    )
  );

-- users
create policy "Users can view their own profile"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Freelancers can view their clients"
  on public.users
  for select
  to authenticated
  using (
    (select public.current_user_role()) = 'freelancer'
    and id in (
      select p.client_id
      from public.projects p
      where p.freelancer_id = (select auth.uid())
        and p.client_id is not null
    )
  );

create policy "Clients can view their freelancer"
  on public.users
  for select
  to authenticated
  using (
    (select public.current_user_role()) = 'client'
    and id in (
      select p.freelancer_id
      from public.projects p
      where p.client_id = (select auth.uid())
    )
  );

create policy "Users can update their own profile"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- projects
create policy "Freelancers can view their projects"
  on public.projects
  for select
  to authenticated
  using (freelancer_id = (select auth.uid()));

create policy "Clients can view their projects"
  on public.projects
  for select
  to authenticated
  using (client_id = (select auth.uid()));

create policy "Clients can view projects invited by email"
  on public.projects
  for select
  to authenticated
  using (
    client_email is not null
    and lower(client_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );

create policy "Freelancers can create projects"
  on public.projects
  for insert
  to authenticated
  with check (
    freelancer_id = (select auth.uid())
    and (select public.current_user_role()) = 'freelancer'
  );

create policy "Freelancers can update their projects"
  on public.projects
  for update
  to authenticated
  using (freelancer_id = (select auth.uid()))
  with check (freelancer_id = (select auth.uid()));

create policy "Freelancers can delete their projects"
  on public.projects
  for delete
  to authenticated
  using (freelancer_id = (select auth.uid()));

-- assets (freelancers see all; clients only deliverables)
create policy "Freelancers can view all project assets"
  on public.assets
  for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );

create policy "Clients can view deliverable assets only"
  on public.assets
  for select
  to authenticated
  using (
    visibility = 'deliverable'
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.client_id = (select auth.uid())
    )
  );

-- INSERT is freelancer-only. Clients have no INSERT policy (RLS denies by default).
create policy "Freelancers can upload project assets"
  on public.assets
  for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and (select public.current_user_role()) = 'freelancer'
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );

create policy "Freelancers can update project assets"
  on public.assets
  for update
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );

create policy "Freelancers can delete project assets"
  on public.assets
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );

-- invoices
create policy "Freelancers can view invoices on their projects"
  on public.invoices
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );

create policy "Clients can view invoices on their projects"
  on public.invoices
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.client_id = (select auth.uid())
    )
  );

create policy "Freelancers can create invoices"
  on public.invoices
  for insert
  to authenticated
  with check (
    status = 'pending'
    and stripe_payment_intent_id is null
    and stripe_checkout_session_id is null
    and stripe_connected_account_id is null
    and amount_paid = 0
    and amount_refunded = 0
    and stripe_charge_id is null
    and stripe_dispute_id is null
    and dispute_status is null
    and payment_status_updated_at is null
    and last_payment_event_created_at is null
    and
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
    and (select public.current_user_role()) = 'freelancer'
  );

create policy "Freelancers can update invoices on their projects"
  on public.invoices
  for update
  to authenticated
  using (
    status = 'pending'
    and
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  )
  with check (
    status = 'pending'
    and stripe_payment_intent_id is null
    and stripe_checkout_session_id is null
    and
    exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );

create policy "Freelancers can delete pending invoices on their projects"
  on public.invoices
  for delete
  to authenticated
  using (
    status = 'pending'
    and exists (
      select 1
      from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );

-- client_actions
create policy "Clients can view their actions"
  on public.client_actions
  for select
  to authenticated
  using (client_id = (select auth.uid()));

create policy "Freelancers can view actions on their projects"
  on public.client_actions
  for select
  to authenticated
  using (freelancer_id = (select auth.uid()));

create policy "Freelancers can create client actions"
  on public.client_actions
  for insert
  to authenticated
  with check (
    freelancer_id = (select auth.uid())
    and (select public.current_user_role()) = 'freelancer'
  );

create policy "Clients can update their actions"
  on public.client_actions
  for update
  to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

create policy "Freelancers can update actions on their projects"
  on public.client_actions
  for update
  to authenticated
  using (freelancer_id = (select auth.uid()))
  with check (freelancer_id = (select auth.uid()));

-- Clients may update review fields on deliverables
create policy "Clients can review deliverable assets"
  on public.assets
  for update
  to authenticated
  using (
    visibility = 'deliverable'
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.client_id = (select auth.uid())
    )
  )
  with check (
    visibility = 'deliverable'
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.client_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: private project-assets bucket
-- Path convention: {project_id}/{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'project-assets',
  'project-assets',
  false,
  52428800, -- 50 MB
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf',
    'application/zip',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]
)
on conflict (id) do nothing;

create policy "Freelancers can read all project storage objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1 from public.projects p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.freelancer_id = (select auth.uid())
    )
  );

create policy "Clients can read deliverable storage objects"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1
      from public.assets a
      join public.projects p on p.id = a.project_id
      where a.file_url = name
        and a.visibility = 'deliverable'
        and p.client_id = (select auth.uid())
    )
  );

-- Storage writes are freelancer-only. Clients may SELECT deliverables only.
create policy "Freelancers can upload project storage objects"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'project-assets'
    and exists (
      select 1
      from public.projects p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.freelancer_id = (select auth.uid())
    )
  );

create policy "Freelancers can update project storage objects"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1
      from public.projects p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.freelancer_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'project-assets'
    and exists (
      select 1
      from public.projects p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.freelancer_id = (select auth.uid())
    )
  );

create policy "Freelancers can delete project storage objects"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'project-assets'
    and exists (
      select 1
      from public.projects p
      where p.id = ((storage.foldername(name))[1])::uuid
        and p.freelancer_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: public business-logos bucket (emails + client chrome)
-- Path convention: {user_id}/{filename}
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'business-logos',
  'business-logos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "Freelancers can upload own logos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_user_role()) = 'freelancer'
  );

create policy "Freelancers can update own logos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Freelancers can delete own logos"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Anyone can read business logos"
  on storage.objects
  for select
  to public
  using (bucket_id = 'business-logos');

-- Guard: clients may only update review fields on assets
create or replace function public.guard_asset_client_review_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (select public.current_user_role()) = 'client' then
    if new.project_id is distinct from old.project_id
      or new.file_url is distinct from old.file_url
      or new.file_name is distinct from old.file_name
      or new.visibility is distinct from old.visibility
      or new.uploaded_by is distinct from old.uploaded_by
      or new.created_at is distinct from old.created_at then
      raise exception 'Clients may only update deliverable review fields';
    end if;
  end if;
  return new;
end;
$$;

create trigger assets_guard_client_review
  before update on public.assets
  for each row execute function public.guard_asset_client_review_update();

revoke all on function public.guard_asset_client_review_update() from public, anon, authenticated;

-- Atomic client decisions: update the reviewed record and its action together.
create or replace function public.submit_deliverable_review(
  p_action_id uuid,
  p_decision public.asset_review_status,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action public.client_actions%rowtype;
begin
  if p_decision = 'changes_requested' and nullif(trim(p_note), '') is null then
    raise exception 'Change request feedback is required';
  end if;
  if length(coalesce(p_note, '')) > 1000 then
    raise exception 'Review note is too long';
  end if;

  select * into v_action
  from public.client_actions
  where id = p_action_id
    and client_id = auth.uid()
    and action_type = 'review_deliverable'
    and status = 'open'
  for update;

  if not found or v_action.asset_id is null then
    raise exception 'Review action not found';
  end if;

  update public.assets
  set review_status = p_decision,
      review_note = case when p_decision = 'changes_requested' then nullif(trim(p_note), '') else null end,
      reviewed_at = now()
  where id = v_action.asset_id and visibility = 'deliverable';

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

create or replace function public.submit_project_review(
  p_action_id uuid,
  p_decision text,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action public.client_actions%rowtype;
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'Invalid project decision';
  end if;
  if p_decision = 'changes_requested' and nullif(trim(p_note), '') is null then
    raise exception 'Change request feedback is required';
  end if;
  if length(coalesce(p_note, '')) > 2000 then
    raise exception 'Project feedback is too long';
  end if;

  select * into v_action
  from public.client_actions
  where id = p_action_id
    and client_id = auth.uid()
    and action_type = 'review_project'
    and status = 'open'
  for update;

  if not found then raise exception 'Project approval request not found'; end if;

  update public.client_actions
  set status = 'completed',
      completed_at = now(),
      metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
        'decision', p_decision,
        'review_note', nullif(trim(p_note), '')
      )
  where id = v_action.id;

  update public.projects
  set status = case when p_decision = 'approved' then 'completed'::public.project_status else 'in_progress'::public.project_status end
  where id = v_action.project_id and client_id = auth.uid();

  return v_action.project_id;
end;
$$;

revoke all on function public.submit_deliverable_review(uuid, public.asset_review_status, text) from public, anon;
grant execute on function public.submit_deliverable_review(uuid, public.asset_review_status, text) to authenticated;
revoke all on function public.submit_project_review(uuid, text, text) from public, anon;
grant execute on function public.submit_project_review(uuid, text, text) to authenticated;
