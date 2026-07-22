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
- [x] Freelancer getting-started checklist
- [x] Customize portal onboarding (`portal_setup_completed_at`) with Skip
- [x] Retainer/recurring labeled as scheduled invoices
- [x] Dashboard loading + error boundaries
- [x] OG / Twitter metadata basics
- [x] CI: typecheck + vitest + build; `npm run verify`
- [x] `.gitignore` covers `.env*`

---

## USER-MUST-DO — Pre-deploy

- [ ] Domain purchased and DNS ready for Vercel
- [ ] Production Supabase project created; `schema.sql` applied (includes `portal_setup_completed_at` + `stripe_webhook_events`)
- [ ] Supabase Auth Site URL + Redirect URLs set to production domain
- [ ] (Recommended) Enable Auth leaked-password protection in Supabase Dashboard
- [ ] Stripe **Live** mode: Product/Price $25/mo → `STRIPE_SAAS_PRICE_ID`
- [ ] Stripe Connect Express enabled (live)
- [ ] Stripe Customer Portal enabled (live)
- [ ] Resend domain verified (or accept invite email limitations)
- [ ] All env vars from `.env.example` set in Vercel (live keys only in prod project)
- [ ] `NEXT_PUBLIC_APP_URL` = `https://YOUR_DOMAIN` (no trailing slash)
- [ ] Rotated `SUPABASE_SERVICE_ROLE_KEY` if it was ever exposed

## USER-MUST-DO — Deploy day

- [ ] Vercel deploy succeeded
- [ ] `GET https://YOUR_DOMAIN/api/health` returns `"ok": true`
- [ ] Stripe live webhook → `https://YOUR_DOMAIN/api/webhooks/stripe` (events listed in PRODUCTION_PLAN)
- [ ] Webhook signing secret matches Vercel `STRIPE_WEBHOOK_SECRET`
- [ ] Freelancer signup → email confirm → set password → start trial → customize or skip → dashboard
- [ ] Billing shows trialing; workspace unlocks
- [ ] Connect Stripe Express completes (`charges_enabled`)
- [ ] Create project, invite client, upload deliverable
- [ ] Client pays invoice; status becomes `paid` (webhook or return sync)
- [ ] `/privacy` and `/terms` reachable; linked from landing

## First 48 hours

- [ ] No failed Stripe webhook deliveries (or all retried successfully)
- [ ] Vercel function logs clean for `/api/webhooks/stripe`
- [ ] Support email monitored for access / billing questions
