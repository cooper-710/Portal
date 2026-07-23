# Auth email setup (Finalia)

Finalia uses **Supabase Auth** for users. Email delivery is separate:

| What | How it sends |
| --- | --- |
| Signup confirmation / magic link / password reset | Supabase Auth → default mail **or** custom **SMTP** (Resend) |
| Project invite emails (app) | App → **Resend API** (`RESEND_API_KEY` on Vercel / `.env.local`) |

These are two different pipes. Setting `RESEND_API_KEY` alone does **not** fix Supabase confirmation emails.

---

## Reality check: the sender domain must be verified

**Without a verified domain in Resend:**

- Resend only delivers to the **email address on your Resend account** (account owner).
- You **cannot** send signup confirms or invites to arbitrary client emails.
- `beth.t@example.com` / `onboarding@resend.dev` are fine as *From* for testing, but delivery is still limited to your own inbox.

**Until `finalia.app` is verified in Resend:**

1. **Preferred:** use **Continue with Google** (no confirmation email / auth mail rate limits). See [GOOGLE_AUTH.md](./GOOGLE_AUTH.md).
2. Or turn **Confirm email OFF** in Supabase (see Immediate unblock below) and use password signup.
3. Verify `finalia.app` in Resend → configure Supabase SMTP → turn Confirm email back **ON**.

---

## A. Immediate unblock (do this now)

You are hitting Supabase’s built-in email rate limits / branded mail. Unblock signup without waiting on quota:

### Option 1: Disable “Confirm email” (recommended for testing)

1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your project.
2. Go to **Authentication** → **Providers** → **Email**.
3. Find **Confirm email** (sometimes labeled “Confirm email” / email confirmations).
4. **Turn it OFF** → Save.

Effect:

- `signUp` with password creates a session immediately (no magic link).
- Finalia’s signup form (name + email + password) can send new workspace owners straight into onboarding / trial.
- **Warn:** leave this off only until custom SMTP works. Re-enable for production once Resend SMTP is live so you verify ownership of addresses.

### Option 2: Manually confirm users

1. Supabase → **Authentication** → **Users**.
2. Open the stuck user → confirm / mark email confirmed (or delete and re-signup after Option 1).

---

## B. Proper path: Resend SMTP for Auth (requires domain verification)

Goal: Supabase Auth emails go through **Resend SMTP** (branded, higher limits), not Supabase’s default mailer.

### 1. Resend account + API key

1. Create an account at [resend.com](https://resend.com).
2. **API Keys** → create a key → store it as `RESEND_API_KEY` in `.env.local` and Vercel (never commit it).
3. If a key was ever pasted into chat or a shared doc, **rotate it** in Resend and update env vars.

### 2. Use the Finalia production domain

Use the production domain you control: `finalia.app`.

- Without it: testing only to your own email.
- With it: send to any recipient (`notifications@finalia.app`).

### 3. Verify the domain in Resend

1. Resend → **Domains** → **Add domain** → enter `finalia.app`.
2. Add the DNS records Resend shows (SPF, DKIM, etc.) at your registrar/DNS host.
3. Wait until Resend shows the domain as **Verified**.

### 4. Configure Supabase custom SMTP

1. Supabase → **Project Settings** → **Authentication** → **SMTP Settings** (or Auth → SMTP).
2. Enable custom SMTP:

| Field | Value |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (STARTTLS) |
| Username | `resend` |
| Password | your Resend **API key** |
| Sender email | `notifications@finalia.app` (must be on the verified domain) |
| Sender name | `Finalia` |

3. Save. Send a test signup to a non-team address to confirm delivery.

Official refs:

- [Supabase: custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Resend + Supabase SMTP](https://resend.com/docs/send-with-supabase-smtp)

### 5. Brand email templates (optional)

Supabase → **Authentication** → **Email Templates**.

Replace default “Supabase” wording with Finalia. Prefer the prefetch-safe confirm pattern (see README) so scanners don’t burn one-time links.

### 6. Re-enable Confirm email

After SMTP works:

1. Authentication → Providers → Email → **Confirm email ON**.
2. Signup still uses password; Supabase emails a confirm link via Resend.
3. User opens the link → session → continues into Finalia.

---

## C. Two Resend uses (don’t mix them up)

| Use | Where configured | Env / secret |
| --- | --- | --- |
| **Auth emails** (confirm, reset, magic link) | Supabase Dashboard → SMTP | SMTP password = Resend API key (dashboard only) |
| **App invite emails** | Vercel / `.env.local` | `RESEND_API_KEY` + optional `RESEND_FROM_EMAIL` |

### Invite emails without a domain

With no verified domain, set:

```bash
RESEND_FROM_EMAIL=Finalia <beth.t@example.com>
```

Resend will only deliver those invites to **your Resend account email**. Client invites to real client addresses will fail until `finalia.app` is verified and `RESEND_FROM_EMAIL` uses `notifications@finalia.app`.

---

## D. App behavior (password signup)

- **Google (preferred):** Continue with Google → no confirmation email → post-auth routing with `password_set` already true. See [GOOGLE_AUTH.md](./GOOGLE_AUTH.md).
- **Sign up (email):** name + email + password (fallback).
- **Confirm email OFF:** session created immediately → post-auth routing (password already set → skip password onboarding).
- **Confirm email ON** (after SMTP): account created → “check your email” → confirm link → then continue.
- **Sign in:** Google or email + password.

You do **not** need to remove Supabase Auth, only replace the mail transport via SMTP when you want email confirmation.

---

## E. Checklist

**Before sender-domain verification**

- [ ] Supabase → Confirm email **OFF**
- [ ] `RESEND_API_KEY` in `.env.local` / Vercel (invites to yourself only)
- [ ] Sign up with password on the deployed / local app

**Later (production mail)**

- [ ] Verify `finalia.app` in Resend
- [ ] Supabase SMTP → Resend (`smtp.resend.com`, user `resend`, sender on your domain)
- [ ] Update `RESEND_FROM_EMAIL` to `Finalia <notifications@finalia.app>`
- [ ] Confirm email **ON**
- [ ] Customize Auth email templates to say Finalia
- [ ] Rotate any API key that was exposed in chat
