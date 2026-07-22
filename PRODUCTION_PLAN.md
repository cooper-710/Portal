# Portal — Production Plan

Turn this freelance client portal into a live product that charges freelancers (SaaS) and takes a cut of client invoice payments (Connect application fees).

**Pricing (locked):** Portal Pro **$25/mo** after a **14-day free trial**, plus an ~**1% platform fee** on client invoice payments (configurable via `STRIPE_PLATFORM_FEE_PERCENT`).

---

## 1. Product positioning

### What you sell
**Portal** is a branded client workspace for digital freelancers: invite clients, share deliverables in a private vault, track project phases, and collect invoice payments via Stripe Connect.

### Who buys
Solo freelancers and small studios (design, web, video, marketing) who currently juggle email + Drive + Stripe invoices and want one client-facing place.

### How you make money
| Stream | Mechanism | Amount |
| --- | --- | --- |
| **SaaS** | Freelancer subscribes via Stripe Checkout (`STRIPE_SAAS_PRICE_ID`) | $25/mo after 14-day trial |
| **Application fee** | Destination charges on client invoice Checkout; platform keeps `application_fee_amount` | Default ~1% of invoice (`STRIPE_PLATFORM_FEE_PERCENT`) |

Freelancers receive net invoice funds on their connected Express account. Platform SaaS billing is separate (platform Stripe Customer + Subscription on the freelancer).

### What “done” means for v1 launch
A freelancer can sign up → set password → start trial → customize portal (or skip) → connect Stripe → invite a client → upload deliverables → send an invoice → client pays → webhook marks paid → platform keeps SaaS + fee. Legal pages exist. Deploy is reproducible on Vercel + Supabase + Stripe live mode.

---

## 2. Current state

### Already working in this codebase
- **Auth:** Magic-link signup + password set; email+password sign-in; prefetch-safe `/auth/confirm`; PKCE `/auth/callback`.
- **Roles:** `freelancer` / `client` in `public.users` (not JWT `user_metadata` for authz).
- **Onboarding path:** password → Portal Pro trial (if needed) → customize portal (save or skip) → dashboard with getting-started checklist.
- **Projects & invites:** Create project, invite by email (Resend + Supabase invite fallback).
- **File vault:** Storage + RLS; freelancer-only uploads; clients see deliverables only.
- **Invoices:** Create/pay via Stripe Checkout destination charges + application fee (`/api/checkout`).
- **Retainers/recurring:** Labeled in UI as **scheduled invoices** (dated series), not Connect subscriptions.
- **Stripe Connect:** Express onboard (`/api/stripe/connect`), return/refresh routes, `account.updated` webhook sync.
- **Portal Pro gate:** Freelancers need `subscription_status` in `active`/`trialing` (`freelancerHasWorkspaceAccess`); Checkout at `/api/saas-checkout` with `trial_period_days`.
- **Billing portal:** `/api/saas-portal` for manage/cancel.
- **Webhooks:** `/api/webhooks/stripe` — signature verification, service-role required, event-id claim table + content-level invoice/subscription idempotency.
- **Return-path sync:** Checkout success URLs + `/api/saas-sync` reconcile if webhook lags.
- **Branding:** Business name, logo, colors on client-facing views; one-time customize step.
- **Schema:** Full RLS in `schema.sql` (tables + storage policies).
- **CI / verify:** `tsc` + vitest + build (dummy env); `npm run verify` / `scripts/verify-local.sh`.

### Known gaps (not launch-blockers if documented)
- True Connect **recurring** client retainers (product path is dated invoice series; UI labels this clearly).
- No production monitoring/alerting beyond logs (Sentry optional via env later).
- No rate limiting middleware yet (note only; auth is Supabase-hosted).
- Supabase advisors (WARN only as of last audit): enable leaked-password protection in Auth dashboard; SECURITY DEFINER helpers are intentional for RLS.

---

## 3. Production readiness checklist

### P0 — Blockers before charging real money
| Item | Status | Notes |
| --- | --- | --- |
| Deploy config (Vercel + build scripts) | **DONE** | `vercel.json`, `npm run build` / `start`, port **3001** local |
| Env validation for critical secrets | **DONE** | `src/utils/env.ts` — fail-fast in production |
| `GET /api/health` | **DONE** | Liveness + config presence (no secrets) |
| Webhook hardening (verify, log, idempotent) | **DONE** | Signature + service role; `stripe_webhook_events`; invoice alreadyPaid + subscription alreadySynced |
| Security pass (no service role public, RLS uploads) | **DONE** | Service role server-only; storage INSERT freelancer-only |
| Legal stubs `/privacy` `/terms` | **DONE** | Linked from landing, login, footer |
| Landing pricing CTA clear | **DONE** | Trial → $25/mo + ~1% fee mention |
| README run/deploy | **DONE** | Local 3001, Vercel, Stripe webhook URL, Auth redirects |
| CI smoke (`tsc` + tests + build) | **DONE** | `.github/workflows/ci.yml` + `npm run verify` |
| Friendly billing/checkout errors | **DONE** | Mapped messages in billing + client pay UX |
| Customize portal onboarding | **DONE** | `/onboarding/portal` with Save & Skip; flag `portal_setup_completed_at` |
| Getting-started checklist | **DONE** | Connect / first project / business name on dashboard |
| Live Stripe keys / domain / prod Supabase | **USER-MUST-DO** | Operator must configure (see Launch sequence) |
| Rotate any leaked service role | **USER-MUST-DO** | If key was ever committed or shared |
| Auth redirect URLs + leaked password protection | **USER-MUST-DO** | Supabase Dashboard |

### P1 — Soon after launch
- [ ] True Connect recurring / retainer subscriptions for clients (schema already has `payment_kind`; UI currently schedules invoices)
- [ ] Stripe Dashboard alerts + dead-letter review for failed webhooks
- [ ] Optional Sentry (`SENTRY_DSN`) or equivalent error tracking
- [ ] Soft rate limiting on auth-adjacent API routes
- [ ] Email deliverability (custom Resend domain, SPF/DKIM)
- [ ] Customer support inbox + refund/cancel playbook
- [ ] Richer OG image asset (basic OG/Twitter metadata done)

### P2 — Growth / hardening
- [ ] Multi-seat studios / team roles
- [ ] Invoice PDF export, tax fields, multi-currency UX
- [ ] Usage analytics (activation → paid conversion)
- [ ] Automated E2E (Playwright) against staging
- [ ] SOC2-lite: audit log of admin/service-role writes

See also: [scripts/production-checklist.md](./scripts/production-checklist.md).

---

## 4. Launch sequence (day-of)

Do these in order on launch day.

1. **Domain** — Point DNS (A/CNAME) at Vercel for `app.yourdomain.com` (or apex).
2. **Supabase production project** — Apply `schema.sql` if not already. Confirm RLS enabled on all `public` tables + storage policies.
3. **Supabase Auth URLs** — Site URL = `https://YOUR_DOMAIN`. Redirect URLs include:
   - `https://YOUR_DOMAIN/auth/callback`
   - `https://YOUR_DOMAIN/auth/confirm`
   - `https://YOUR_DOMAIN/**` (optional catch-all for next paths)
4. **Vercel project** — Import repo; Framework = Next.js; set all env vars from `.env.example` with **live** values. Set `NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN`.
5. **Stripe live mode** — Switch Dashboard to Live. Create Portal Pro Product/Price ($25/mo); copy Price ID → `STRIPE_SAAS_PRICE_ID`. Enable Connect (Express). Enable Customer Portal.
6. **Stripe webhook (live)** — Endpoint: `https://YOUR_DOMAIN/api/webhooks/stripe`. Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `account.updated`. Copy signing secret → `STRIPE_WEBHOOK_SECRET`.
7. **Env keys** — `STRIPE_SECRET_KEY=sk_live_…`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…`, `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `NEXT_PUBLIC_`), anon URL/key, Resend if using invites.
8. **Deploy & smoke** — Hit `https://YOUR_DOMAIN/api/health` → `ok: true`. Sign up test freelancer → password → trial → customize (or skip) → Connect → invoice → client pay.
9. **Post-deploy** — Watch Stripe webhook delivery log and Vercel function logs for 24h.

---

## 5. Money path

```
Freelancer signs up
  → set password
  → /api/saas-checkout (Subscription Checkout, trial_period_days)
  → Stripe charges $25/mo after trial → platform balance
  → webhook syncs subscription_status on public.users
  → /onboarding/portal (customize or skip) → dashboard

Client pays invoice
  → /api/checkout (Payment Checkout + transfer_data.destination + application_fee_amount)
  → Stripe: charge on platform, transfer net to Connect account, keep fee
  → webhook markInvoicePaidFromSession → invoices.status = paid

Freelancer payouts
  → Stripe Connect Express payout schedule (Stripe-managed)
```

**Code anchors**
- SaaS Checkout: `src/app/api/saas-checkout/route.ts`
- Invoice Checkout + fee: `src/app/api/checkout/route.ts`, `src/utils/stripe/application-fee.ts`
- Webhooks: `src/app/api/webhooks/stripe/route.ts`
- Sync: `src/utils/stripe/sync-invoice.ts`, `src/utils/stripe/sync-subscription.ts`
- Portal setup: `src/app/onboarding/portal/`, `users.portal_setup_completed_at`

**Connect note:** v1 uses destination charges with application fees. Recurring client retainers via Connect subscriptions remain **P1**; UI labels scheduled invoices clearly.

---

## 6. Risks & ops

| Risk | Mitigation |
| --- | --- |
| Webhook misconfig → unpaid invoices / stuck gate | Health + webhook 5xx on missing secrets so Stripe retries; return-path sync; event claim + release on failure |
| Leaked `SUPABASE_SERVICE_ROLE_KEY` | Never `NEXT_PUBLIC_`; rotate in Dashboard; env validation |
| RLS bypass via service role bugs | Webhook handlers only update known columns by id/customer; no open SQL |
| Client upload of malware | Freelancer-only storage INSERT; MIME/size limits on buckets in `schema.sql` |
| Stripe live vs test key mix | Checkout rejects invalid key prefix; keep separate Vercel envs for staging/prod |
| Support load | Document cancel via Stripe Customer Portal; Settings delete-account flow |
| Secrets in git | `.env*` gitignored; CI uses dummy build env only |

**Ops habits**
- Review Stripe → Developers → Webhooks failed deliveries weekly.
- After deploy, always hit `/api/health`.
- Prefer rotating keys over debating exposure.

---

## 7. Post-launch roadmap

1. **Week 1:** Stabilize webhooks, email delivery, first paying SaaS customers; gather cancel reasons.
2. **P1:** Monitoring (Sentry), support playbook, true Connect recurring for retainers.
3. **Month 1:** Activation metrics (invite → file → invoice → paid); pricing experiments only if conversion data justifies.
4. **P2:** Team seats, PDFs, E2E suite, audit logging.

---

## Manual items the operator still owns (USER-MUST-DO)

1. Buy/configure production domain on Vercel.
2. Create/use production Supabase project; set Auth redirect URLs (and optionally enable leaked-password protection).
3. Switch Stripe to **live** keys and live webhook endpoint (do **not** put live keys in committed files).
4. Create live `$25/mo` Price and set `STRIPE_SAAS_PRICE_ID`.
5. Enable Connect Express + Customer Portal in live mode.
6. Configure Resend (or accept invite fallback) with a verified sending domain.
7. Rotate `SUPABASE_SERVICE_ROLE_KEY` if it was ever exposed in chat, screenshots, or git history.
8. Optionally add `SENTRY_DSN` later (not required for launch).
