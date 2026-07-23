# Production checklist (operator)

Use with [PRODUCTION_PLAN.md](../PRODUCTION_PLAN.md).

Legend: **DONE in repo** = no action for this item. **USER-MUST-DO** = requires your accounts/dashboards.

---

## DONE in repo (code)

- [x] Deploy config, health endpoint, env validation
- [x] Stripe webhook verify + event idempotency (`stripe_webhook_events`)
- [x] Invoice + subscription sync idempotency
- [x] Legal pages + public footer (Privacy/Terms)
- [x] Friendly billing/checkout errors
- [x] Workspace getting-started checklist
- [x] Customize workspace onboarding (legacy `portal_setup_completed_at`) with Skip
- [x] Retainer/recurring labeled as scheduled invoices
- [x] Dashboard loading + error boundaries
- [x] OG / Twitter metadata basics
- [x] CI: typecheck + vitest + build; `npm run verify`
- [x] Structured runtime error logs + Vercel Web Analytics / Speed Insights
- [x] API/auth rate limiter with Vercel KV/Upstash support
- [x] Playwright public, security, owner, and client journeys
- [x] Deliverable decisions + recorded final project approval
- [x] Branded invoice PDF downloads for owners and clients
- [x] `.gitignore` covers `.env*`

---

## USER-MUST-DO: Pre-deploy

- [ ] `finalia.app` DNS ready for Vercel
- [ ] Production Supabase project created; `schema.sql` applied (includes `portal_setup_completed_at` + `stripe_webhook_events`)
- [ ] Supabase Auth Site URL + Redirect URLs set to production domain
- [ ] (Recommended) Enable Auth leaked-password protection in Supabase Dashboard
- [ ] Stripe **Live** mode: Product/Price $25/mo → `STRIPE_SAAS_PRICE_ID`
- [ ] Stripe Connect Express enabled (live)
- [ ] Stripe Customer Portal enabled (live)
- [ ] Google OAuth provider, consent screen, and production redirect URI configured (see docs/GOOGLE_AUTH.md)
- [ ] Resend domain verified (required to email arbitrary clients; without it invites/confirms only reach your Resend account email)
- [ ] All env vars from `.env.example` set in Vercel (live keys only in prod project)
- [ ] Vercel KV or Upstash Redis connected for distributed production rate limiting
- [ ] `NEXT_PUBLIC_APP_URL` = `https://finalia.app` (no trailing slash)
- [ ] Rotated `SUPABASE_SERVICE_ROLE_KEY` if it was ever exposed

## USER-MUST-DO: Deploy day

- [ ] Vercel deploy succeeded
- [ ] `GET https://finalia.app/api/health` returns `"ok": true`
- [ ] Stripe live webhook → `https://finalia.app/api/webhooks/stripe` (events listed in PRODUCTION_PLAN)
- [ ] Webhook signing secret matches Vercel `STRIPE_WEBHOOK_SECRET`
- [ ] Continue with Google → start trial → guided onboarding → dashboard
- [ ] Billing shows trialing; workspace unlocks
- [ ] Connect Stripe Express completes (`charges_enabled`)
- [ ] Create project, invite client, upload deliverable
- [ ] Client pays invoice; status becomes `paid` (webhook or return sync)
- [ ] Client reviews a deliverable, submits final project approval, and downloads an invoice PDF
- [ ] `/privacy` and `/terms` reachable; linked from landing

## First 48 hours

- [ ] No failed Stripe webhook deliveries (or all retried successfully)
- [ ] Vercel function logs clean for `/api/webhooks/stripe`
- [ ] Support email monitored for access / billing questions
