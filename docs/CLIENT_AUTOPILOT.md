# Client Autopilot operations

## What ships

- A durable, unique event outbox captured by database triggers in the same
  transaction as project, review, and invoice changes.
- Per-user in-app notifications with unread/read state and deep links.
- One prioritized next action on owner and client home screens.
- Retryable, idempotent Resend email and opt-in browser-push deliveries.
- Default-on rules for invitations, deliverable review/change/approval, final
  approval, invoice creation/due/overdue, payment/refund/dispute, and closeout.
- Per-user categories and quiet hours, plus environment kill switches.

## Migration

Apply only after CI is green and after reviewing the remote migration list:

```bash
npx supabase migration list
npx supabase db push --dry-run
npx supabase db push
```

The forward-only migration is:

`20260722223024_client_autopilot_notifications.sql`

It does not rewrite any applied migration.

## Environment

Required for the scheduled route:

- `CRON_SECRET`: a long random secret. Vercel Cron sends it as
  `Authorization: Bearer …`.

Already used for email:

- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_APP_URL`

Optional browser push:

```bash
npx web-push generate-vapid-keys
```

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY` (server-only)
- `VAPID_SUBJECT`, normally `mailto:YOUR_SUPPORT_EMAIL`

Optional emergency controls (all default to enabled):

- `NOTIFICATIONS_ENABLED=false` pauses event processing without discarding the
  outbox backlog.
- `NOTIFICATION_EMAILS_ENABLED=false` prevents new email deliveries from being
  created.
- `NOTIFICATION_PUSH_ENABLED=false` prevents new push deliveries from being
  created.

## Schedule

`vercel.json` runs `GET /api/cron/notifications` at `13:05 UTC` daily. This fits
Vercel Hobby's daily cron limit. It creates reminders due today, overdue day 1,
and then weekly until the invoice is settled, and processes retryable outbox
deliveries. The in-app center and business actions also process fresh events so
normal activity is not delayed until the daily job.

## Manual acceptance

1. Sign in as an owner and confirm exactly one **Next action** card and the bell
   are visible.
2. Open Settings → Notifications; save categories and quiet hours.
3. Invite an existing test client; sign in as that client and confirm an unread
   deep link appears once.
4. Upload a deliverable, request changes, upload again, and approve. Confirm the
   correct party receives one notification at each transition.
5. Move a project to Review, approve it as the client, and confirm final approval
   plus closeout notifications.
6. Create an invoice due today. Call the cron route with the Bearer secret and
   confirm a single due reminder; call it again and confirm no duplicate.
7. Complete a Stripe test payment and a partial/full test refund. Confirm payment,
   refund-initiated, and refund-completed entries on the appropriate accounts.
8. Turn on browser push in Settings, accept browser permission, and repeat one
   review event. Turn it off and confirm the subscription is removed.
9. Temporarily set `NOTIFICATIONS_ENABLED=false`, create an event, and confirm it
   remains pending; re-enable and confirm it is delivered once.
