-- Associate each Web Push subscription with the browser origin that owns its
-- service worker. This prevents production notifications from being delivered
-- by an obsolete Vercel preview-domain worker after the canonical-domain move.

alter table public.push_subscriptions
  add column origin text;

create index push_subscriptions_user_origin_idx
  on public.push_subscriptions (user_id, origin);

comment on column public.push_subscriptions.origin is
  'Normalized browser origin that registered the service worker, such as https://finalia.app.';
