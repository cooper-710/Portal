# Finalia: Client Operations

B2B client-operations workspace for pros, sellers, and studios. Invite clients, share files in a private vault, collect payments with Stripe Connect, and subscribe to **Finalia Pro** ($25/mo after a 14-day trial, plus ~1% on invoice payments).

See **[PRODUCTION_PLAN.md](./PRODUCTION_PLAN.md)** for positioning, money path, and launch checklist. Operator checklist: **[scripts/production-checklist.md](./scripts/production-checklist.md)**.

## Stack

- Next.js 15 (App Router)
- Supabase (Auth, Postgres, Storage) with `@supabase/ssr`
- Tailwind CSS + shadcn/ui
- Stripe Checkout + Connect (test-mode direct charges + application fees)

## How to run (local)

1. Copy env vars:

```bash
cp .env.example .env.local
```

2. Apply `schema.sql` in the Supabase SQL Editor (if not already applied).

3. Supabase Dashboard → **Authentication → URL configuration**:

| Setting | Local value |
| --- | --- |
| Site URL | `http://localhost:3001` |
| Redirect URLs | `http://localhost:3001/auth/callback`, `http://localhost:3001/auth/confirm` |

4. Fill `.env.local` (see table below). Use **test** Stripe keys locally.

5. Install and run on port **3001**:

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001).

### Env vars

| Variable | Required for |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Auth + data |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Auth + data |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks, invites (server-only, never `NEXT_PUBLIC_`) |
| `STRIPE_SECRET_KEY` | Checkout / Connect / SaaS |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client Stripe.js (optional for redirect Checkout) |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Verify test-mode direct-charge events from connected accounts |
| `STRIPE_SAAS_PRICE_ID` | Finalia Pro monthly Price ID |
| `NEXT_PUBLIC_APP_URL` | Redirects / Checkout URLs (`http://localhost:3001` locally) |
| `FINALIA_PRO_TRIAL_DAYS` | Trial length (default 14; legacy `PORTAL_PRO_TRIAL_DAYS` remains accepted) |
| `STRIPE_PLATFORM_FEE_PERCENT` | Application fee % on client invoices (default 1) |
| `RESEND_API_KEY` | Project invite emails (recommended) |
| `RESEND_FROM_EMAIL` | Invite From address (needs verified domain for real clients) |
| `CRON_SECRET` | Authenticate the daily Autopilot reminder job |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Optional browser push |
| `NOTIFICATIONS_ENABLED` | Global notification kill switch (defaults on) |

**Google authentication:** configure Supabase and Google Cloud using **[docs/GOOGLE_AUTH.md](./docs/GOOGLE_AUTH.md)**. Resend is used for project invitations, not primary sign-in.

Production notes are commented in `.env.example` (live keys, webhook endpoint URL, `NEXT_PUBLIC_APP_URL=https://finalia.app`).

### Stripe webhook (local)

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
stripe listen --forward-connect-to localhost:3001/api/webhooks/stripe
```

Copy the platform listener secret into `STRIPE_WEBHOOK_SECRET` and the Connect
listener secret into `STRIPE_CONNECT_WEBHOOK_SECRET`.

Platform events keep Finalia Pro subscriptions in sync. Connected-account events
drive direct client-invoice payments, refunds, disputes, expiration, and async
payment outcomes. Checkout return URLs reconcile through the stored connected
account if a webhook is delayed.

Create a separate **Connected accounts** event destination using snapshot/v1
payloads at the same endpoint. If it uses a selected event list, include:
`checkout.session.completed`, `checkout.session.async_payment_succeeded`,
`checkout.session.async_payment_failed`, `checkout.session.expired`,
`payment_intent.succeeded`, `payment_intent.payment_failed`,
`payment_intent.canceled`, `charge.refunded`, `refund.failed`, and
`charge.dispute.created`, `charge.dispute.updated`, `charge.dispute.closed`, plus
`account.updated` for Connect readiness changes.
Copy that destination's signing secret—not an event ID—into
`STRIPE_CONNECT_WEBHOOK_SECRET`.

### Client Autopilot

The migration-backed notification outbox captures invites, reviews, approvals,
invoice/payment/refund/dispute state, and project closeout without an AI or
workflow-builder dependency. Business actions and Stripe webhooks process fresh
events immediately; the bell updates through Supabase Realtime with polling as
a fallback. `/api/cron/notifications` is reserved for due/overdue reminders,
retries, and stale-lock recovery. Browser push is optional and email uses
Resend's idempotency key support. See `docs/CLIENT_AUTOPILOT.md` for setup and
acceptance tests.

Health check: [http://localhost:3001/api/health](http://localhost:3001/api/health).

## How to deploy (production)

1. **Vercel:** Import this repo. Framework: Next.js. `vercel.json` sets the region; build uses `npm run build`, start via Next defaults on Vercel.
2. **Env:** Set every required var from `.env.example` in Vercel **Production**:
   - `NEXT_PUBLIC_APP_URL=https://finalia.app` (no trailing slash)
   - Live Stripe keys (`sk_live_…`, `pk_live_…`)
   - Live `STRIPE_SAAS_PRICE_ID` ($25/mo Price)
   - Production Supabase URL, anon key, **service role** (server-only)
3. **Supabase Auth:** Site URL = `https://finalia.app`. Redirect URLs must include:
   - `https://finalia.app/auth/callback`
   - `https://finalia.app/auth/confirm`
4. **Stripe Live webhook:** Endpoint: `https://finalia.app/api/webhooks/stripe`
   Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `account.updated`.  
   Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. **Connect + Customer Portal:** Enable Express Connect and the Customer Portal in Stripe Live.
6. **Verify:** `GET https://finalia.app/api/health` should return `"ok": true`. Smoke-test signup → trial → Connect → invoice pay.

Do **not** commit `.env.local` or live secrets. Rotate `SUPABASE_SERVICE_ROLE_KEY` if it was ever exposed.

### Finalia Pro promotion codes (optional)

SaaS Checkout already has `allow_promotion_codes: true`. Create coupons in the Stripe Dashboard only (do not hardcode codes in the app). Use **Test mode** for local/`sk_test_…` keys, and **Live mode** for Vercel production/`sk_live_…` keys — codes do not cross modes.

1. Stripe Dashboard → toggle **Test mode** or **Live** to match your keys.
2. **Product catalog → Coupons → Create coupon**
   - Percent off: **100%**
   - Duration: **Forever** (or **Once** if you only want the first invoice free)
3. After the coupon saves, **Add promotion code** (or open the coupon → Promotion codes)
   - Code: e.g. `FINALIAFOUNDER` (customer-facing)
   - Optional: set max redemptions / expiry
4. At Finalia Pro Checkout (`/dashboard/billing` → subscribe), expand **Add promotion code** and enter the code.

A 100% forever code makes Finalia Pro free for that customer while keeping the subscription active for webhooks and feature gates.

## Product roles

- **Workspace owner** (internal role id `freelancer`): Finalia Pro trial/subscription; create projects; upload files; create invoices; Connect Stripe
- **Client:** view phase, download deliverables, pay invoices (no SaaS subscription)

Role is stored in `public.users` (not trusted from JWT `user_metadata` for authorization).

## Client invites

When you create a project with a client email, Finalia emails a workspace link:

1. **Resend** (recommended): `RESEND_API_KEY` + optional `RESEND_FROM_EMAIL`
2. **Supabase Auth invite** (fallback): needs `SUPABASE_SERVICE_ROLE_KEY`

Project creation still succeeds if email is not configured.

## Authentication

Signup and sign-in are Google-only in the current UI. Configure the Google provider and callback URLs using **[docs/GOOGLE_AUTH.md](./docs/GOOGLE_AUTH.md)**. Password-setting and confirmation routes remain for legacy and recovery compatibility, but they are not the primary acquisition path.

### Confirmation links / email prefetching

Email scanners can consume one-time confirmation links (`otp_expired`). Prefer password sign-in after the first confirmation. Optional prefetch-safe template (Supabase → Authentication → Email Templates):

```html
<h2>Confirm your email</h2>
<p>Open Finalia, then click Continue. This avoids email scanners using the link first.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?confirmation_url={{ .ConfirmationURL }}&next=/dashboard">
    Continue to Finalia
  </a>
</p>
```

Auth routes:

- `/auth/confirm`, button-gated confirmation (prefetch-safe)
- `/auth/callback`, PKCE `code` exchange + `token_hash`/`type` `verifyOtp`

## Scripts

```bash
npm run dev        # http://localhost:3001
npm run build      # production build
npm run start      # serve build on 3001
npm run typecheck  # tsc --noEmit
npm run lint
```

CI (GitHub Actions) runs `npm ci`, `tsc --noEmit`, and `npm run build` on push/PR.

### End-to-end tests

Install the browser once, then run the desktop and mobile suite:

```bash
npx playwright install chromium
npm run test:e2e
```

Public marketing, auth-gate, health, and security checks always run. Authenticated
owner/client journeys run when `E2E_OWNER_STORAGE_STATE` and
`E2E_CLIENT_STORAGE_STATE` point to Playwright storage-state files for dedicated
test accounts. Never use production account state in CI.

For an existing Supabase project, apply
`migrations/20260722_atomic_reviews.sql` before deploying the strengthened
approval actions. New projects receive the functions from `schema.sql`.
