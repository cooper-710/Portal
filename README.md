# Portal — Freelance Client Workspace

B2B client portal for digital freelancers. Invite clients, share files in a private vault, collect payments with Stripe Connect, and subscribe to **Portal Pro** ($25/mo after a 14-day trial, plus ~1% on invoice payments).

See **[PRODUCTION_PLAN.md](./PRODUCTION_PLAN.md)** for positioning, money path, and launch checklist. Operator checklist: **[scripts/production-checklist.md](./scripts/production-checklist.md)**.

## Stack

- Next.js 15 (App Router)
- Supabase (Auth, Postgres, Storage) with `@supabase/ssr`
- Tailwind CSS + shadcn/ui
- Stripe Checkout + Connect (destination charges + application fees)

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
| `SUPABASE_SERVICE_ROLE_KEY` | Webhooks, invites (server-only — never `NEXT_PUBLIC_`) |
| `STRIPE_SECRET_KEY` | Checkout / Connect / SaaS |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client Stripe.js (optional for redirect Checkout) |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook signatures |
| `STRIPE_SAAS_PRICE_ID` | Portal Pro monthly Price ID |
| `NEXT_PUBLIC_APP_URL` | Redirects / Checkout URLs (`http://localhost:3001` locally) |
| `PORTAL_PRO_TRIAL_DAYS` | Trial length (default 14) |
| `STRIPE_PLATFORM_FEE_PERCENT` | Application fee % on client invoices (default 1) |
| `RESEND_API_KEY` | Project invite emails (recommended) |

Production notes are commented in `.env.example` (live keys, webhook endpoint URL, `NEXT_PUBLIC_APP_URL` = your domain).

### Stripe webhook (local)

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

On `checkout.session.completed`, `/api/webhooks/stripe` marks invoices paid and syncs Portal Pro subscriptions. Checkout return URLs also reconcile via `session_id` if the webhook is delayed.

Health check: [http://localhost:3001/api/health](http://localhost:3001/api/health).

## How to deploy (production)

1. **Vercel** — Import this repo. Framework: Next.js. `vercel.json` sets the region; build uses `npm run build`, start via Next defaults on Vercel.
2. **Env** — Set every required var from `.env.example` in Vercel **Production**:
   - `NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN` (no trailing slash)
   - Live Stripe keys (`sk_live_…`, `pk_live_…`)
   - Live `STRIPE_SAAS_PRICE_ID` ($25/mo Price)
   - Production Supabase URL, anon key, **service role** (server-only)
3. **Supabase Auth** — Site URL = `https://YOUR_DOMAIN`. Redirect URLs must include:
   - `https://YOUR_DOMAIN/auth/callback`
   - `https://YOUR_DOMAIN/auth/confirm`
4. **Stripe Live webhook** — Endpoint: `https://YOUR_DOMAIN/api/webhooks/stripe`  
   Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `account.updated`.  
   Paste the signing secret into `STRIPE_WEBHOOK_SECRET`.
5. **Connect + Customer Portal** — Enable Express Connect and the Customer Portal in Stripe Live.
6. **Verify** — `GET https://YOUR_DOMAIN/api/health` should return `"ok": true`. Smoke-test signup → trial → Connect → invoice pay.

Do **not** commit `.env.local` or live secrets. Rotate `SUPABASE_SERVICE_ROLE_KEY` if it was ever exposed.

## Product roles

- **Freelancer** — Portal Pro trial/subscription; create projects; upload files; create invoices; Connect Stripe
- **Client** — view phase, download deliverables, pay invoices (no SaaS subscription)

Role is stored in `public.users` (not trusted from JWT `user_metadata` for authorization).

## Client invites

When you create a project with a client email, Portal emails a portal link:

1. **Resend** (recommended): `RESEND_API_KEY` + optional `RESEND_FROM_EMAIL`
2. **Supabase Auth invite** (fallback): needs `SUPABASE_SERVICE_ROLE_KEY`

Project creation still succeeds if email is not configured.

## Magic link / email prefetching

Email scanners can consume one-time links (`otp_expired`). Signup uses a confirmation magic link; returning users use email + password.

Optional prefetch-safe template (Supabase → Authentication → Email Templates):

```html
<h2>Confirm your email</h2>
<p>Open Portal, then click Continue. This avoids email scanners using the link first.</p>
<p>
  <a href="{{ .SiteURL }}/auth/confirm?confirmation_url={{ .ConfirmationURL }}&next=/dashboard">
    Continue to Portal
  </a>
</p>
```

Auth routes:

- `/auth/confirm` — button-gated confirmation (prefetch-safe)
- `/auth/callback` — PKCE `code` exchange + `token_hash`/`type` `verifyOtp`

## Scripts

```bash
npm run dev        # http://localhost:3001
npm run build      # production build
npm run start      # serve build on 3001
npm run typecheck  # tsc --noEmit
npm run lint
```

CI (GitHub Actions) runs `npm ci`, `tsc --noEmit`, and `npm run build` on push/PR.
