# Finalia: Production-Ready Paid SaaS Launch Plan

> **Status:** planning only. No production services, live Stripe settings, domains, DNS, secrets, or irreversible changes have been made.
>
> **Approval rule:** stop at every checkpoint below. A phase begins only after the operator approves its scope, environment, cost, and rollback plan. **Phase 1 must not begin until this document is approved.**

## 1. Product boundary and launch outcome

Finalia is a **client-operations platform, not a CRM**. The product promise and the production acceptance path are:

`invite → communicate → deliver → review → approve → pay → close out`

Production-ready means that a workspace owner can subscribe to Finalia, invite and authenticate a client, move one engagement through that entire path, receive reliable reminders without duplicate or unsafe messages, take payment with clearly assigned Stripe liability, handle refunds/disputes, and close the project with an auditable record. It also means operators can detect, diagnose, and recover from failures without editing production data by hand.

This plan preserves two separate money paths:

1. **Finalia subscription:** the workspace owner pays Finalia for SaaS access.
2. **Client invoice payment:** the client pays the workspace owner through Stripe Connect, with any Finalia fee and financial responsibility explicitly disclosed.

Pricing is **not considered final merely because the repo currently says $25/month, 14 days, and approximately 1%**. Those values require a business, margin, tax, refund, and Connect-liability approval in Phase 4.

## 2. Audit scope and evidence

Audit performed against the repository on 2026-07-22. It covered application routes and components, `schema.sql`, the single incremental migration, RLS/grants, auth and invite flows, Stripe Checkout/Connect/webhooks, environment handling, monitoring, CI, unit tests, and Playwright coverage.

Verification baseline:

- `npm run verify`: TypeScript passed; 29 unit tests passed.
- Production build: **not verified in this restricted environment** because `next/font` attempted to download DM Sans and Geist Mono from `fonts.googleapis.com` and DNS was unavailable. This is also a build-reproducibility dependency to remove or explicitly support.
- The verify script does not run lint or Playwright; CI does run Playwright, but authenticated owner/client suites skip unless storage-state files are supplied.
- The worktree was clean before this plan was created. `.env.local`, `.vercel`, and `vercel-env-paste.txt` are ignored. A filename-only scan found no tracked file matching common real Stripe/webhook/service-role secret patterns. This is not a substitute for secret scanning across git history.

## 3. What already exists

| Area | Existing foundation | Readiness assessment |
| --- | --- | --- |
| Core workflow | Projects, phases, file vault, deliverable review/change requests, final project approval, invoices, PDFs, dashboard activity/actions | Strong launch-stage foundation; communication and close-out are not yet first-class workflows |
| Authentication | Supabase SSR sessions, Google OAuth/PKCE, email/password compatibility, invite-linked client provisioning | Google exists; phone identity, phone OTP, verified phone storage, account linking, and recovery policy do not |
| Invites/email | Resend project email with Supabase Auth invite fallback; branded HTML; sender-domain instructions | Best-effort and non-durable; no delivery ledger, retry queue, bounce/complaint handling, preferences, or SMS |
| Notifications | Dashboard activity and open client actions | No notification domain model, inbox, browser push, service worker, subscriptions, reminder scheduler, or channel preferences |
| Autopilot | Scheduled invoice series and derived action lists | No durable event/rule engine, job scheduler, escalation policy, quiet hours, deduplication, or operator replay controls |
| Supabase | Auth, Postgres, Storage, RLS policies, service-role webhook writes, atomic review RPC migration | Security intent is good, but schema lifecycle and privileged-column controls are not production-safe yet |
| SaaS billing | Stripe subscription Checkout, trial, promotion codes, Customer Portal route, webhook sync and gating | Useful foundation; product/price lifecycle, dunning/access policy, tax decision, webhook coverage, and entitlement tests need completion |
| Client payments | Hosted Checkout, destination charge, application fee, Connect onboarding, invoice paid sync | Major business-model mismatch and legacy Connect fields/API; refund/dispute and asynchronous-payment lifecycles absent |
| Webhooks | Signature verification, event claims, retries on failure, content idempotency | Good base; event set is incomplete, retention/replay/alerting are absent, and ignored-event behavior needs an operating policy |
| Monitoring | Structured JSON logs, health endpoint, Vercel Analytics and Speed Insights | No exception/APM product, alert routing, synthetic checks, queue/webhook dashboards, release tracking, or privacy-reviewed product analytics |
| Security headers/rate limits | Baseline headers; Upstash/Vercel KV option with in-memory fallback | No CSP/HSTS; production rate limiting silently falls back to per-instance memory; abuse and OTP controls need design |
| Testing/CI | 29 unit tests, public Playwright checks, optional authenticated suites, CI typecheck/test/e2e/build | Critical RLS, migration, webhook, refund/dispute, notification, auth-linking, and full paid journey coverage is missing |
| Branding/domain | Finalia name throughout metadata/UI, icons, custom workspace branding, domain/email setup notes | Product name and canonical URL are selected; external domain, auth, sender, and payment dashboards still require coordinated cutover |

## 4. Launch blockers and material risks

### P0: must be resolved before any paid production launch

1. **Authenticated profiles can write billing and Connect state.** `schema.sql` grants authenticated users update access to `stripe_account_id`, `stripe_charges_enabled`, `stripe_details_submitted`, `stripe_customer_id`, `stripe_subscription_id`, `subscription_status`, and `subscription_current_period_end`; the self-update RLS policy then permits the row update. A user could potentially grant themselves paid access or falsify payout readiness. These columns must be service-role/webhook-only, with separate safe profile-update paths and database tests proving denial.

2. **Connect economics and merchant-of-record claims conflict.** Code creates legacy v1 Express accounts and uses destination charges (`transfer_data.destination` plus `application_fee_amount`), which normally puts the platform in the marketplace-style charge flow. Product copy/terms also say the workspace owner remains merchant of record and funds go “directly” to them. Before more payment code is written, counsel/accounting and the operator must approve one model:
   - **SaaS/direct charges:** workspace owner owns the client relationship and payment; connected account is merchant of record; Finalia takes an application fee.
   - **Marketplace/destination charges:** Finalia controls the charge and accepts the associated fee, negative-balance, refund, and dispute responsibilities.
   The chosen model determines Connect v2 account configuration, dashboard access, onboarding, pricing, terms, support, reserves, and webhook behavior.

3. **Refunds, disputes, reversals, and payment failures are not modeled.** Invoice status only supports `pending` and `paid`. There is no ledger/status history for refunded, partially refunded, disputed, failed, canceled, or chargeback states, and the webhook does not handle them. Launching real payments without this creates financial and customer-support risk.

4. **Database changes are not reproducible migrations.** Most database state lives in a non-idempotent monolithic `schema.sql`; only the atomic review functions have an incremental migration. There is no checked-in Supabase project/config, remote/local migration parity proof, drift check, seed strategy, rollback/runbook, or automated RLS test suite.

5. **Production identity and messaging policy is undecided.** Phone OTP and SMS introduce provider cost, abuse, consent, opt-out, regional, and account-linking risks. A user must not accidentally receive separate Google/email/phone identities. Phone numbers need normalized verified storage and strict visibility; SMS invitations must not imply the number is authenticated.

6. **No durable notification delivery system exists.** Autopilot cannot safely launch on best-effort request-time email. It needs an event/outbox model, idempotent workers, retry/dead-letter behavior, preferences/consent, audit history, and a kill switch before email/SMS/push automation.

7. **The full production journey is not continuously tested.** Current authenticated E2E tests are optional and shallow. There is no automated test of invite through close-out, cross-tenant RLS attacks, subscription entitlement changes, delayed payment methods, duplicate/out-of-order webhooks, or refunds/disputes.

### P1: high priority before general availability

- Build currently depends on fetching Google fonts; self-host fonts or make the network dependency explicit and verified.
- The in-memory rate-limit fallback is unsafe as a silent production fallback. Production should fail health/readiness or alert when the distributed store is missing.
- Invites are best-effort and can succeed as a project mutation while message delivery fails; users need resend/status UI and operators need bounce/complaint visibility.
- No content-security policy or production HSTS policy is defined.
- Public business logos are intentionally readable; the privacy/branding implications and cache/delete behavior need approval.
- `SECURITY DEFINER` functions are constrained with grants and checks in several places, but every function, trigger, storage policy, and exposed table still needs an advisor-driven review. The email-based pending-invite policy also needs adversarial tests.
- Existing production documents contain stale assumptions (`charges_enabled`, Express/v1 terminology, current pricing treated as locked). They must be reconciled after decisions, not used as launch authority today.
- Account deletion does not yet define financial-record retention, active dispute/refund handling, notification cleanup, or Stripe/Supabase deletion sequencing.

## 5. Target architecture decisions (approval required)

These decisions are prerequisites, not implementation details.

| Decision | Recommended starting position | Approver / dependency |
| --- | --- | --- |
| Connect model | Treat Finalia as SaaS and use **direct charges on connected accounts** because workspace owners own their client relationships | Operator + payments counsel/accounting + Stripe eligibility review |
| Finalia subscription | Stripe Billing + hosted Checkout + Customer Portal; explicit entitlement state machine separate from raw webhook payloads | Operator; final plans/prices/tax policy |
| Autopilot | Database event/outbox + scheduled worker + channel adapters; rules limited to the core workflow, not CRM sequences | Product approval; hosting/queue choice and cost |
| In-app notifications | Supabase-backed notification inbox with per-workspace/user scoping and read state | Product + RLS design |
| Browser push | Standards-based service worker/Push API, VAPID keys in secret storage, opt-in after user value is clear | Product/privacy approval; browser support matrix |
| Email | Resend with verified branded subdomain, separate transactional streams, webhook events for delivery/bounce/complaint | Final domain + sender identity + paid-service approval |
| SMS/phone OTP | Prefer Supabase phone auth with one approved SMS provider; store E.164 verified numbers; invitation SMS and authentication OTP are separate consent/use cases | Provider/country/cost approval; legal/privacy review |
| Google auth | Keep Supabase Google OAuth; define deterministic verified-identity linking and recovery | Google production consent configuration |
| Environments | Separate local, staging, and production Supabase/Stripe/Vercel/messaging resources and keys | Account access and recurring-cost approval |
| Analytics | Privacy-reviewed first-party event taxonomy; no file names, message bodies, phone/email, invoice descriptions, or payment secrets | Privacy/legal approval and vendor choice |

## 6. Safe phased plan

### Phase 0 — Approve product, money, identity, and operating boundaries

**Goal:** settle decisions that would otherwise force rewrites or create legal/financial exposure.

Deliverables:

- Confirm the canonical core workflow and v1 definition of **communicate** and **close out**. Recommended v1: project-scoped messages/activity, explicit outstanding-action summary, final approval, payment settlement, archive/export; no contacts pipeline, lead scoring, or sales automation.
- Choose final product name and run trademark/name screening before purchasing a domain. Record primary name, legal entity display name, support address, sender name, and fallback name.
- Decide initial customer/geographic scope, supported currencies, minimum/maximum invoice amounts, prohibited businesses/content, and support hours.
- Approve Finalia plans, trial/card requirement, monthly/annual options, cancellation/refund policy, grace/dunning policy, promotions, taxes, and Connect fee formula. Build a unit-economics sheet including Stripe fees, refunds, disputes, SMS, email, storage, bandwidth, support, taxes, and negative-balance exposure.
- Approve Connect direct-vs-destination charge model and document merchant of record, Stripe fee payer, losses collector, refund source, dispute owner, transfer/payout timing, statement descriptor, and platform fee disclosure.
- Approve authentication methods and account-linking rules: Google, email, phone OTP, recovery, reauthentication for sensitive actions, duplicate identities, phone recycling, and deletion.
- Select messaging/queue/monitoring/analytics vendors only after price, data processing, retention, and regional availability review.
- Produce a data classification/retention matrix and incident/support/refund/dispute ownership list.

**Exit criteria:** signed decision record with no unresolved merchant-of-record, pricing, tax, identity-linking, sender/domain, or data-retention question.

**Manual checkpoint A:** operator explicitly approves Phase 1. No vendor purchase or production toggle occurs here.

### Phase 1 — Secure and make the data layer reproducible

**Goal:** establish a trustworthy local/staging database foundation before feature work.

Planned work:

- Add a Supabase project structure and convert the effective schema into an ordered, reviewed migration baseline; reconcile `schema.sql` and the existing review migration without rewriting applied production history.
- Inventory actual remote schema/migration state in each authorized environment; back up before reconciliation; add drift detection and a documented restore/rollback procedure.
- Revoke authenticated updates to all Stripe/subscription/system-managed columns. Expose narrowly scoped RPC/server actions for safe profile fields. Ensure webhook/admin writes are the only writers for financial entitlement state.
- Audit every exposed table, sequence, view, function, trigger, grant, and storage bucket. Enable RLS on all exposed tables; use `USING` plus `WITH CHECK`; constrain `SECURITY DEFINER` search paths, ownership, execute grants, and in-function authorization.
- Add database tests for owner/client/other-tenant/anonymous/service-role behavior, including pending email invites, file visibility, review RPCs, invoice mutations, profile billing fields, and storage paths.
- Add migration CI: reset from zero, apply migrations, seed synthetic data, run RLS tests, and compare generated types/schema expectations.
- Run Supabase security/performance advisors and resolve findings or document accepted risk. Verify auth settings such as leaked-password protection, session/JWT policy, redirect allowlist, CAPTCHA/rate limits, and Data API exposure.
- Add secrets scanning for commits and history; document rotation. Never print or copy real key values into the plan or CI.

**Exit criteria:** a clean database can be recreated only from migrations; staging parity is documented; all cross-tenant and protected-column tests pass; advisor findings are resolved/accepted; backup and rollback have been rehearsed on non-production data.

**Manual checkpoint B:** approve schema/RLS report and authorize Phase 2 staging work.

### Phase 2 — Identity, invitations, and communication foundations

**Goal:** make invitations and identity reliable before automating reminders.

Planned work:

- Create an invitation record with hashed/random token, project/workspace, channel, intended recipient, expiry, accepted/revoked state, send attempts, and audit timestamps. Do not use a phone/email string alone as proof of project membership.
- Keep Google OAuth and complete production consent/redirect configuration in staging first.
- Add normalized phone records (`E.164`, verified timestamp, verification method, last four for display) with strict RLS and minimal logging. Do not expose phone numbers to unrelated workspace members.
- Implement phone OTP with abuse controls: per-IP/device/number limits, CAPTCHA/risk checks, resend cooldown, maximum attempts, short expiry, generic error messages, replay prevention, and monitoring. Define whether phone can be primary, secondary, or invite-only at launch.
- Implement deterministic account linking only after both identities are verified and the user reauthenticates. Never silently merge accounts by matching unverified email/phone.
- Add SMS and email invites as separate delivery adapters. SMS text must identify sender, purpose, expiry, support, and opt-out behavior where applicable. Record consent/legal basis and honor STOP/suppression; never send marketing content through transactional consent.
- Make send attempts durable and observable. Add resend/revoke controls, safe generic invite landing pages, expired-link recovery, bounces/complaints/suppressions, and delivery status in the UI.
- Add project-scoped communication primitives or explicitly constrain v1 to auditable system messages plus owner/client notes. Apply content length, attachment, retention, reporting, and notification rules.

**Exit criteria:** invite acceptance works through Google/email/approved phone path without account duplication; abuse tests pass; delivery failures are recoverable; privacy/consent copy is approved; staging sender/OTP credentials are isolated.

**Manual checkpoint C:** approve the identity threat model, SMS countries/provider budget, message templates, and any paid messaging enablement.

### Phase 3 — Client Autopilot and notifications

**Goal:** automate the core client-operations path safely and transparently.

Planned work:

- Define domain events for invitation, message, deliverable shared, review requested/completed, changes requested, project approved, invoice created/due/overdue/paid/failed/refunded/disputed, and project ready to close/closed.
- Build a transactional outbox so the business mutation and notification intent commit together. Workers claim jobs idempotently with unique dedupe keys, exponential backoff, maximum attempts, dead-letter state, replay tooling, and structured correlation IDs.
- Create notification tables for recipient, workspace/project, event type, safe payload, channel, state, scheduled/send timestamps, provider IDs, error category, read/dismissed state, and retention. RLS must prevent cross-tenant reads and client/owner confusion.
- Add an in-app inbox, unread count, deep links, notification preferences, per-channel controls, quiet hours/time zone, digest options, and accessibility behavior.
- Add browser push using a service worker, explicit user opt-in, push subscription rotation/removal, VAPID secret handling, safe lock-screen copy, click routing, and unsupported-browser fallback. Do not request permission on first page load.
- Add Autopilot rules narrowly around workflow obligations: invite follow-up, review reminder, approval reminder, invoice upcoming/due/overdue, payment receipt, and close-out prompt. Defaults, cadence, maximum sends, stop conditions, snooze, manual override, and a workspace kill switch must be visible.
- Never include sensitive file, invoice, message, phone, or payment details in push/SMS previews. Re-authorize after deep-link navigation.
- Use a scheduled worker/queue appropriate to the approved hosting plan; protect internal job endpoints with strong service authentication and replay protection. Alert on backlog age, dead letters, and provider suppression spikes.
- Add deterministic clock-based tests, duplicate/out-of-order event tests, channel fallback tests, preference/quiet-hour tests, and a “dry run / show recipients” operator mode.

**Exit criteria:** the full workflow produces at-most-once user-visible notifications per rule occurrence, respects consent/preferences, survives retries, exposes failures, and can be disabled globally or per workspace.

**Manual checkpoint D:** approve Autopilot defaults and authorize production notification channels separately (in-app, email, push, SMS).

### Phase 4 — Finalize Stripe subscriptions, Connect, refunds, and disputes

**Goal:** prove both money paths in isolated test/staging modes before touching live mode.

Planned work:

- Update to the approved Stripe API/SDK version and migrate Connect creation/readiness to Accounts v2. Do not use legacy `type: express`, `charges_enabled`, or `payouts_enabled` as the target design.
- Implement the approved responsibility configuration: dashboard access, fees collector, losses collector, Merchant/Recipient capability, direct/destination/separate charge pattern, and onboarding remediation. Re-check v2 capability status before creating payments/transfers.
- Prefer Stripe-hosted/embedded onboarding and include account health/notification surfaces; do not collect sensitive Connect KYC data in Finalia.
- Finalize Finalia Billing products/prices in a configuration manifest: stable lookup keys, monthly/annual price, currency, trial, promotion rules, grandfathering, cancellation timing, proration, dunning/grace/access behavior, and Customer Portal configuration.
- Decide tax obligations/registrations before enabling Stripe Tax. “Automatic tax enabled” is not evidence that tax is collected without registrations.
- Finalize client Checkout: dynamic payment methods, payment-method eligibility/currency, statement descriptors, application fee calculation/caps, idempotency keys, Checkout integration identifier where supported, success UX, and asynchronous payment events. Webhooks, not return URLs, remain authoritative.
- Expand the financial state model and immutable audit ledger for open, processing, paid, failed, canceled, partially refunded, refunded, disputed, dispute won/lost, transfer reversed, and payout-impact states.
- Implement webhook handlers for the exact chosen model, including payment success/failure/async results, subscription invoice paid/failed and lifecycle changes, account capability changes, refunds, disputes, transfer reversals where applicable, and Connect account requirements. Verify signatures; reject live/test mismatches; tolerate duplicates and out-of-order events.
- Add operator refund tooling with authorization, reason, amount bounds, current-state validation, idempotency, confirmation, audit trail, and correct application-fee/transfer reversal behavior. Define who can initiate and fund each refund.
- Add dispute intake, evidence deadlines, notification/escalation, evidence ownership, document handling, outcome sync, and support runbook. Never promise automatic dispute handling without operational ownership.
- Add reconciliation jobs/reports comparing Finalia invoices/ledger to Stripe sessions, PaymentIntents/charges/refunds/disputes/transfers/subscriptions; alert on mismatches.
- Exercise Stripe test clocks/test cards/CLI fixtures for trials, renewals, failed payments, authentication, delayed methods, duplicates, refunds, partial refunds, disputes, capability loss, and webhook downtime.

**Exit criteria:** signed economics/liability memo; test-mode reconciliation is exact; refund/dispute drills pass; webhook replay is safe; terms/pricing/product copy match the implemented charge model.

**Manual checkpoint E:** approve the test evidence and the exact live-mode change sheet. Live products, keys, Connect settings, Stripe customer-portal configuration, or webhooks are still not changed until Phase 7 authorization.

### Phase 5 — Name, domain, sender identity, branding, and trust

**Goal:** prepare reversible configuration and assets before domain purchase or DNS changes.

Planned work:

- Complete trademark screening for Finalia and confirm the canonical legal entity name. Keep product name, Finalia Pro plan name, `https://finalia.app`, sender names, metadata, icons, PDFs, invite copy, legal pages, and Stripe descriptors aligned.
- Produce a domain shortlist and migration map: apex/marketing/app/auth/API links, canonical URLs, redirects, cookies, Supabase allowlists, Google OAuth origins, Stripe URLs, email links, webhook endpoints, sitemap/robots, analytics, and support docs.
- Define DNS records and TTL-lowering plan, Vercel domain verification, TLS/HSTS rollout, rollback domain, redirect lifetime, and old-link preservation. **Do not purchase or change DNS without approval.**
- Choose a dedicated transactional email subdomain and sender addresses (for example invite, notifications, billing, support). Prepare SPF, DKIM, DMARC rollout/reporting, return-path, branded links, unsubscribe/suppression behavior, and separate Supabase Auth SMTP versus app email credentials.
- Remove the placeholder sender fallback from production behavior; fail clearly if a verified sender is not configured.
- Finalize visual identity, accessible colors, favicon/PWA icons, social cards, email/PDF branding, plain-text emails, and workspace-brand boundaries. Self-host licensed fonts to make builds reproducible and avoid runtime privacy/network surprises.
- Review Terms, Privacy, Acceptable Use, refund/cancellation, Connect/payment disclosures, SMS consent, notification preferences, subprocessors, retention/deletion, and support/contact information with qualified counsel.

**Exit criteria:** approved brand package, domain/sender runbooks, legal copy, redirects, rollback procedure, and zero production DNS/service changes.

**Manual checkpoint F:** authorize specific purchases/paid services and domain/sender setup one item at a time.

### Phase 6 — Observability, analytics, testing, and release readiness

**Goal:** make production behavior measurable and failures actionable.

Planned work:

- Add exception/APM monitoring with source maps, environment/release tags, request/job correlation, PII scrubbing, sampling, retention, and ownership. Keep structured logs; never log secrets, OTPs, invite tokens, message bodies, phone/email, filenames, or Stripe client secrets.
- Configure actionable alerts: elevated 5xx/auth failures, webhook failures/age, notification backlog/dead letters, invite bounce/complaint spikes, OTP abuse/cost spikes, checkout conversion drop, reconciliation mismatch, RLS/advisor regression, database/storage thresholds, and expiring credentials/domains.
- Add external synthetic checks for public pages, auth entry, health/readiness, and a safe staging core journey. Separate liveness from dependency readiness so a missing queue/rate-limit store cannot appear healthy.
- Define a privacy-reviewed analytics funnel for signup → subscription/trial → Connect ready → project → invite delivered/accepted → deliverable → review → approval → invoice → paid → closed. Use stable pseudonymous IDs and explicit event versioning; exclude content and direct identifiers.
- Strengthen CI gates: format/lint, typecheck, unit, migration reset, RLS integration, webhook contract/replay, notification worker, auth/identity, accessibility, Playwright desktop/mobile, production build, dependency/license/security scan, and secret scan.
- Make authenticated E2E mandatory in a disposable non-production environment. Cover owner and client plus malicious other-tenant cases, phone/Google linking, invite expiry/revoke, push preferences, all Autopilot stop conditions, SaaS entitlement/dunning, and client payment/refund/dispute states.
- Add load/abuse tests for public/auth/OTP/invite/checkout endpoints, webhook bursts, large uploads, queue backlog, and concurrent review/payment actions.
- Create runbooks for deploy/rollback, incident severity, auth outage, Supabase outage, Stripe outage, messaging outage, webhook replay, stuck job, refund, dispute, data request/deletion, account compromise, secret rotation, and status communication.
- Define SLOs and a launch dashboard with owners/on-call routing. Run a tabletop incident and restore drill.

**Exit criteria:** all release gates pass from a clean checkout; mandatory staging journey passes; alerts reach a human; rollback/restore and incident drills succeed; no open P0 or unowned P1 risk.

**Manual checkpoint G:** approve launch candidate, residual-risk register, on-call coverage, and go-live window.

### Phase 7 — Controlled production go-live

**Goal:** make only the explicitly approved production changes, in a reversible order.

Preflight change sheet (each line separately approved and recorded):

1. Confirm backups, rollback owner, status/support channels, vendor limits, budgets, and no active incident.
2. Purchase/attach the approved domain and configure DNS/TLS according to the runbook; preserve rollback host.
3. Configure verified email sender DNS and production suppression/bounce webhooks; send only internal seed tests first.
4. Create/configure production Supabase from migrations; apply dashboard auth/security settings; verify RLS/advisors and backups.
5. Configure production Google OAuth and approved phone/SMS provider with strict spend/rate limits; test only allowlisted/operator numbers initially.
6. Add production secrets through platform secret storage, with least privilege and environment separation; use restricted Stripe keys where feasible; record rotation owners. Never commit values.
7. Create approved live Stripe products/prices and Connect configuration; configure Customer Portal and exact webhook subscriptions; record resource IDs outside source secrets. Do not copy test IDs into live config.
8. Deploy immutable release; verify liveness/readiness, migrations, release tag, alerts, queues, and webhook signature path.
9. Run a controlled end-to-end production transaction with approved real accounts and a minimal refundable amount: subscribe → invite → authenticate → communicate → deliver → review → approve → pay → refund if the test protocol requires → close out. Verify Stripe, Finalia ledger, emails/SMS/push, and reconciliation.
10. Start with a small allowlisted cohort and channel kill switches. Monitor continuously through the agreed observation period before opening signup broadly.

Go/no-go rules:

- **No-go:** any cross-tenant access, writable entitlement field, migration drift, live/test mismatch, webhook/reconciliation error, unknown merchant-of-record responsibility, missing refund/dispute owner, notification duplication/consent failure, inaccessible legal/support page, or alert that does not reach an operator.
- **Rollback:** stop new signups/checkouts/Autopilot with feature flags, disable affected channel, preserve webhook ingestion, roll back application release, restore only through the approved database procedure, and communicate status. Do not delete financial or audit records during rollback.

**Manual checkpoint H:** operator authorizes cohort expansion after reviewing the first transaction, reconciliation, alerts, support readiness, and residual issues.

## 7. Dependency order

The critical path is intentionally strict:

`business/Connect/identity decisions` → `migrations + RLS` → `durable invites` → `event/outbox` → `notifications/Autopilot` → `Stripe lifecycle + reconciliation` → `brand/domain/senders` → `observability + mandatory E2E` → `controlled live setup`

Work that may proceed in parallel after Phase 0 approval:

- Brand asset inventory and domain migration drafting (no purchase/DNS changes).
- Analytics taxonomy and runbook drafting (no paid vendor enablement).
- Test fixture design for Stripe, identity, notifications, and RLS.

Work that must **not** be parallelized ahead of its dependency:

- Do not build Connect v2 or refund logic before the charge model/liability decision.
- Do not add phone account linking before verified-identity merge rules.
- Do not send Autopilot messages before the outbox, preferences, consent, dedupe, and kill switches.
- Do not configure live webhooks/keys before migrations, financial state tests, reconciliation, and alerts pass.
- Do not migrate the domain before auth/email/Stripe redirect inventories and rollback are approved.

## 8. Launch evidence package

Before go-live, keep one reviewable package containing:

- Approved product/identity/Connect/pricing/tax decision records.
- Data map, retention schedule, subprocessors, legal copy, and support policies.
- Migration list, drift report, advisor output, RLS test report, backup/restore evidence.
- Auth threat model, OTP abuse results, invite delivery/suppression evidence.
- Notification event catalog, preference/consent matrix, retry/dead-letter and kill-switch test results.
- Stripe configuration manifest, test-mode event matrix, refund/dispute drills, and reconciliation report.
- Domain/DNS/sender change sheet with TTLs, redirects, owners, and rollback.
- CI release results, accessibility/security/load summaries, synthetic results, alert screenshots/routes, and incident drill notes.
- Final go/no-go checklist, known-risk register, on-call roster, and launch observation log.

## 9. Immediate next action

Review and approve or amend **Phase 0 and the P0 risk list**. After that approval, authorize **Phase 1 only**. Phase 1 should begin with a read-only inventory of the actual Supabase environment and a proposed migration/RLS change set; database mutations still require the Phase 1 checkpoint procedure.

**STOP: do not begin Phase 1 without explicit operator approval.**
