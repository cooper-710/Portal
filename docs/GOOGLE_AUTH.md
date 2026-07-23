# Google sign-in (Finalia)

Finalia supports **Continue with Google** via Supabase Auth (PKCE → `/auth/callback`). Google users get an account email from Google, but **no Supabase confirmation email** is sent.

Email/password remains available as a secondary fallback on the login page.

---

## Checklist (you must do this once)

### 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
3. If prompted, configure the OAuth consent screen (External is fine for testing; add test users while unverified).
4. Application type: **Web application**.
5. **Authorized JavaScript origins**
   - `http://localhost:3001`
   - `https://finalia.app`
6. **Authorized redirect URIs**, use the **Supabase** callback (not your app URL):

   ```text
   https://<PROJECT_REF>.supabase.co/auth/v1/callback
   ```

   Find `<PROJECT_REF>` in Supabase → **Project Settings** → **General** (or from `NEXT_PUBLIC_SUPABASE_URL`).
7. Create → copy **Client ID** and **Client Secret** (do not commit them).

### 2. Supabase Dashboard

1. **Authentication** → **Providers** → **Google** → **Enable**.
2. Paste **Client ID** and **Client Secret** → Save.
3. Confirm redirect allow list (already needed for email auth):
   - **Site URL**: production app origin (and use `http://localhost:3001` for local Site URL when developing)
   - **Redirect URLs** include:
     - `http://localhost:3001/auth/callback`
     - `https://finalia.app/auth/callback`
     - (optional) `.../auth/confirm` if you use email confirm templates

### 3. Database trigger (existing projects)

`schema.sql`’s `handle_new_user` maps Google `full_name` / `name` and sets `password_set = true` for non-email providers.

If the project was created from an older `schema.sql`, re-run the `create or replace function public.handle_new_user() ...` block from `schema.sql` in the Supabase SQL Editor.

App-side `syncOAuthProfile` (called from `resolvePostAuthPath`) also sets `password_set` and fills `full_name` after the OAuth callback, so Google users still skip password onboarding even before you re-apply the trigger.

---

## How it works in the app

1. Login → **Continue with Google** → `signInWithOAuth({ provider: 'google', options: { redirectTo: origin/auth/callback?next=...&role=..., queryParams: { access_type: 'offline', prompt: 'consent' } } })`.
2. Google → Supabase → browser returns to `/auth/callback?code=...`.
3. Callback exchanges the PKCE code, then `resolvePostAuthPath` runs (trial / billing / workspace customization / dashboard).
4. Role: default workspace owner (`freelancer`); `?role=client` on the login page is forwarded on the OAuth `redirectTo` so new client invite signups stay clients.

### Password onboarding skip

| Path | Behavior |
| --- | --- |
| `handle_new_user` | If `raw_app_meta_data.provider` ≠ `email`, insert `password_set = true` |
| `syncOAuthProfile` | After OAuth session: set `password_set = true`, map `full_name` from Google metadata if empty |
| `resolvePostAuthDestination` | Only sends users to `/onboarding/password` when `password_set` is false |

OAuth users are **not** forced through `/onboarding/password`. They can still set a password later in Settings if desired.

---

## Notes

- The account still has an **email** (from Google). Google has already verified it; Finalia does not send a Supabase confirmation email for this path.
- Prefer Google while Confirm-email / SMTP / rate limits are painful; keep email/password for existing users.
- Official guide: [Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
