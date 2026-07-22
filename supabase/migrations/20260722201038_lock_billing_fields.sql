-- Launch-critical authorization hardening for an existing Portal database.
-- Safe to apply after the production baseline and legacy atomic-review migration.

-- Remove every previously granted users-column update, then re-grant only
-- user-owned presentation/onboarding fields. Financial, identity, role, and
-- audit fields remain readable where RLS permits, but authenticated users
-- cannot write them through PostgREST.
revoke update (
  email,
  full_name,
  password_set,
  updated_at,
  stripe_account_id,
  stripe_charges_enabled,
  stripe_details_submitted,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  subscription_current_period_end,
  business_name,
  logo_url,
  brand_primary,
  brand_accent,
  welcome_message,
  appearance,
  portal_setup_completed_at,
  onboarding_completed_at,
  onboarding_step
) on table public.users from authenticated;

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

-- Invoice outcome and provider identifiers are payment-system fields.
-- Owners can still edit the three pending-invoice fields exposed by the UI.
revoke update on table public.invoices from authenticated;
grant update (amount, due_date, title) on table public.invoices to authenticated;

drop policy if exists "Freelancers can create invoices" on public.invoices;
create policy "Freelancers can create invoices"
  on public.invoices
  for insert
  to authenticated
  with check (
    status = 'pending'
    and stripe_payment_intent_id is null
    and stripe_checkout_session_id is null
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );

drop policy if exists "Freelancers can update invoices on their projects"
  on public.invoices;
create policy "Freelancers can update invoices on their projects"
  on public.invoices
  for update
  to authenticated
  using (
    status = 'pending'
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  )
  with check (
    status = 'pending'
    and stripe_payment_intent_id is null
    and stripe_checkout_session_id is null
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );

-- Retire the authenticated payment-state RPC. Payment confirmation must come
-- from signature-verified Stripe retrieval/webhooks using the service role.
revoke all on function public.mark_invoice_paid(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.mark_invoice_paid(uuid, text, text)
  to service_role;
