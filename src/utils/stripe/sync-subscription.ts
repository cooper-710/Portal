import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, PlatformSubscriptionStatus } from "@/types/database";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

type UsersClient = SupabaseClient<Database>;

function mapStripeStatus(
  status: Stripe.Subscription.Status | null | undefined,
): PlatformSubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "canceled":
    case "incomplete":
    case "incomplete_expired":
    case "unpaid":
    case "paused":
      return status;
    default:
      return "none";
  }
}

function periodEnd(subscription: Stripe.Subscription) {
  const root = (
    subscription as Stripe.Subscription & {
      current_period_end?: number;
    }
  ).current_period_end;
  if (typeof root === "number") {
    return new Date(root * 1000).toISOString();
  }

  const itemEnd = subscription.items?.data?.[0]?.current_period_end;
  if (typeof itemEnd === "number") {
    return new Date(itemEnd * 1000).toISOString();
  }

  if (typeof subscription.trial_end === "number") {
    return new Date(subscription.trial_end * 1000).toISOString();
  }

  return null;
}

function subscriptionPayload(
  subscription: Stripe.Subscription,
  customerId: string | null,
) {
  return {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    subscription_status: mapStripeStatus(subscription.status),
    subscription_current_period_end: periodEnd(subscription),
  };
}

/**
 * Prefer service role (webhooks). Fall back to the caller's authenticated
 * client so Checkout return-path sync works without SUPABASE_SERVICE_ROLE_KEY
 * (users may update their own subscription columns via RLS).
 * When requireAdmin is true (webhook path), never fall back, fail loudly.
 */
async function resolveUsersClient(
  preferred?: UsersClient | null,
  requireAdmin = false,
): Promise<
  | { ok: true; client: UsersClient; via: "admin" | "user" }
  | { ok: false; error: string }
> {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: true, client: createAdminClient(), via: "admin" };
  }
  if (requireAdmin) {
    return {
      ok: false,
      error:
        "Missing SUPABASE_SERVICE_ROLE_KEY. Webhook subscription sync cannot proceed.",
    };
  }
  if (preferred) {
    return { ok: true, client: preferred, via: "user" };
  }
  try {
    const userClient = await createClient();
    return { ok: true, client: userClient, via: "user" };
  } catch {
    return {
      ok: false,
      error:
        "Missing SUPABASE_SERVICE_ROLE_KEY and no authenticated Supabase client available.",
    };
  }
}

export async function syncPlatformSubscription(
  subscription: Stripe.Subscription,
  options?: {
    customerId?: string | null;
    freelancerId?: string | null;
    /** Authenticated server client for return-path sync without service role. */
    supabase?: UsersClient | null;
    /** Webhooks must require service-role writes (no silent user-client fallback). */
    requireAdmin?: boolean;
  },
) {
  const resolved = await resolveUsersClient(
    options?.supabase,
    options?.requireAdmin === true,
  );
  if (!resolved.ok) {
    return { ok: false as const, error: resolved.error };
  }

  const { client, via } = resolved;
  const customerId =
    options?.customerId ??
    (typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id ?? null);
  const freelancerId =
    options?.freelancerId ??
    subscription.metadata?.freelancer_id ??
    null;

  const payload = subscriptionPayload(subscription, customerId);

  async function alreadySynced(
    match: { column: "id" | "stripe_customer_id"; value: string },
  ) {
    const { data: existing } = await client
      .from("users")
      .select(
        "id, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_current_period_end",
      )
      .eq(match.column, match.value)
      .maybeSingle();

    if (!existing) return false;
    return (
      existing.stripe_subscription_id === payload.stripe_subscription_id &&
      existing.subscription_status === payload.subscription_status &&
      (existing.stripe_customer_id ?? null) ===
        (payload.stripe_customer_id ?? null) &&
      (existing.subscription_current_period_end ?? null) ===
        (payload.subscription_current_period_end ?? null)
    );
  }

  if (freelancerId) {
    // User-scoped client can only update the signed-in row (RLS).
    if (via === "user") {
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user || user.id !== freelancerId) {
        return {
          ok: false as const,
          error:
            "Authenticated session does not match freelancer_id for subscription sync.",
        };
      }
    }

    if (await alreadySynced({ column: "id", value: freelancerId })) {
      return { ok: true as const, alreadySynced: true as const };
    }

    const { data, error } = await client
      .from("users")
      .update(payload)
      .eq("id", freelancerId)
      .select("id")
      .maybeSingle();

    if (error) {
      return { ok: false as const, error: error.message };
    }
    if (!data) {
      return {
        ok: false as const,
        error: "Subscription sync updated 0 rows (check RLS / freelancer id).",
      };
    }
    return { ok: true as const };
  }

  if (customerId) {
    if (via === "user") {
      // Without freelancer id, only safe to update the signed-in user's row
      // when their stripe_customer_id already matches.
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) {
        return { ok: false as const, error: "Not authenticated for subscription sync." };
      }
      if (await alreadySynced({ column: "id", value: user.id })) {
        return { ok: true as const, alreadySynced: true as const };
      }
      const { data, error } = await client
        .from("users")
        .update(payload)
        .eq("id", user.id)
        .eq("stripe_customer_id", customerId)
        .select("id")
        .maybeSingle();
      if (error) {
        return { ok: false as const, error: error.message };
      }
      if (!data) {
        return {
          ok: false as const,
          error: "No matching user row for Stripe customer (user sync).",
        };
      }
      return { ok: true as const };
    }

    if (await alreadySynced({ column: "stripe_customer_id", value: customerId })) {
      return { ok: true as const, alreadySynced: true as const };
    }

    const { data, error } = await client
      .from("users")
      .update(payload)
      .eq("stripe_customer_id", customerId)
      .select("id")
      .maybeSingle();
    if (error) {
      return { ok: false as const, error: error.message };
    }
    if (!data) {
      return {
        ok: false as const,
        error: "No matching user row for Stripe customer id.",
      };
    }
    return { ok: true as const };
  }

  return { ok: false as const, error: "No freelancer or customer id to sync." };
}

export async function clearPlatformSubscription(customerId: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false as const, error: "Missing service role key." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      stripe_subscription_id: null,
      subscription_status: "canceled",
      subscription_current_period_end: null,
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}

/**
 * After Checkout return (before webhook), sync Portal Pro from the session so
 * `trialing` / `active` unlocks the workspace immediately.
 */
export async function syncPlatformCheckoutSessionById(
  sessionId: string,
  options?: { freelancerId?: string | null; supabase?: UsersClient | null },
) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return { ok: false as const, error: "Stripe is not configured." };
  }

  const stripe = new Stripe(stripeSecret);
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.mode !== "subscription") {
    return {
      ok: false as const,
      error: "Checkout session is not a subscription checkout.",
    };
  }

  // Trials often complete with payment_status=no_payment_required (or paid).
  if (session.status !== "complete") {
    return {
      ok: false as const,
      error: `Checkout session is not complete (status=${session.status}).`,
    };
  }

  let subscription: Stripe.Subscription | null = null;
  if (typeof session.subscription === "string") {
    subscription = await stripe.subscriptions.retrieve(session.subscription);
  } else if (session.subscription && !("deleted" in session.subscription)) {
    subscription = session.subscription;
  }

  if (!subscription) {
    return {
      ok: false as const,
      error: "Checkout session has no subscription yet.",
    };
  }

  const freelancerId =
    options?.freelancerId ??
    session.client_reference_id ??
    session.metadata?.freelancer_id ??
    subscription.metadata?.freelancer_id ??
    null;

  return syncPlatformSubscription(subscription, {
    customerId:
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null,
    freelancerId,
    supabase: options?.supabase,
  });
}

/**
 * Reconcile Portal Pro from Stripe when DB status looks stale (e.g. webhook /
 * return sync never wrote because service role was missing).
 */
export async function reconcilePlatformSubscriptionFromStripe(options: {
  freelancerId: string;
  stripeCustomerId: string | null | undefined;
  supabase?: UsersClient | null;
}) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return { ok: false as const, error: "Stripe is not configured." };
  }
  if (!options.stripeCustomerId) {
    return { ok: false as const, error: "No Stripe customer on profile." };
  }

  const stripe = new Stripe(stripeSecret);
  const list = await stripe.subscriptions.list({
    customer: options.stripeCustomerId,
    status: "all",
    limit: 10,
  });

  const preferred =
    list.data.find((sub) => sub.status === "trialing") ??
    list.data.find((sub) => sub.status === "active") ??
    list.data.find((sub) =>
      ["past_due", "paused", "incomplete", "unpaid"].includes(sub.status),
    ) ??
    list.data[0];

  if (!preferred) {
    return { ok: false as const, error: "No Stripe subscriptions for customer." };
  }

  return syncPlatformSubscription(preferred, {
    customerId: options.stripeCustomerId,
    freelancerId: options.freelancerId,
    supabase: options.supabase,
  });
}
