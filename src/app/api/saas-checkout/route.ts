import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  isPlatformSubscriptionActive,
  PORTAL_PRO_TRIAL_DAYS,
  STRIPE_TRIAL_OFFER_ID,
} from "@/utils/stripe/subscription";
import { createClient } from "@/utils/supabase/server";
import { validateCriticalEnv } from "@/utils/env";
import { logEvent, requestContext } from "@/lib/monitoring";
import { createAdminClient } from "@/utils/supabase/admin";

/**
 * Create a Stripe Checkout Session for Portal Pro (14-day trial, then monthly).
 *
 * Stripe Trial Offers (`to_…`) are not supported on Checkout, only on the
 * Subscriptions API. We align duration via subscription_data.trial_period_days
 * and record STRIPE_TRIAL_OFFER_ID in metadata when configured.
 */
function safeAppPath(value: unknown, fallback: string) {
  if (typeof value !== "string" || !value.startsWith("/")) return fallback;
  // Block protocol-relative / external redirects.
  if (value.startsWith("//")) return fallback;
  return value;
}

export async function POST(request: Request) {
  const started = Date.now();
  const { requestId } = requestContext(request);
  logEvent("info", "subscription_checkout_started", { requestId });
  const envCheck = validateCriticalEnv();
  if (!envCheck.ok) {
    logEvent("error", "subscription_checkout_misconfigured", {
      requestId,
      missing: envCheck.missing.join(","),
    });
    return NextResponse.json(
      { error: "Billing is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }

  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_SAAS_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  let successPath = "/dashboard?subscribed=1";
  let cancelPath = "/dashboard/billing?canceled=1";
  try {
    const body = (await request.json()) as {
      successPath?: string;
      cancelPath?: string;
    };
    successPath = safeAppPath(body.successPath, successPath);
    cancelPath = safeAppPath(body.cancelPath, cancelPath);
  } catch {
    // Empty body is fine (dashboard billing CTA).
  }

  if (!stripeSecret) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 },
    );
  }

  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "STRIPE_SAAS_PRICE_ID is not configured. Create a monthly Price in Stripe and add it to .env.local.",
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select(
      "id, email, role, stripe_customer_id, subscription_status, stripe_subscription_id",
    )
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer") {
    return NextResponse.json(
      { error: "Only workspace owners can subscribe to Portal." },
      { status: 403 },
    );
  }

  if (isPlatformSubscriptionActive(profile.subscription_status)) {
    return NextResponse.json(
      { error: "You already have an active subscription. Manage it from Billing." },
      { status: 400 },
    );
  }

  const stripe = new Stripe(stripeSecret);

  try {
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email ?? user.email ?? undefined,
        metadata: {
          freelancer_id: user.id,
        },
      });
      customerId = customer.id;

      const admin = createAdminClient();
      const { error } = await admin
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}${successPath}${successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}${cancelPath}`,
      client_reference_id: user.id,
      metadata: {
        freelancer_id: user.id,
        purpose: "platform_subscription",
        ...(STRIPE_TRIAL_OFFER_ID
          ? { stripe_trial_offer_id: STRIPE_TRIAL_OFFER_ID }
          : {}),
      },
      subscription_data: {
        // Legacy free trial, required for Checkout (Trial Offer API unsupported here).
        trial_period_days: PORTAL_PRO_TRIAL_DAYS,
        metadata: {
          freelancer_id: user.id,
          purpose: "platform_subscription",
          ...(STRIPE_TRIAL_OFFER_ID
            ? { stripe_trial_offer_id: STRIPE_TRIAL_OFFER_ID }
            : {}),
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 },
      );
    }

    logEvent("info", "subscription_checkout_created", {
      requestId,
      userId: user.id,
      sessionId: session.id,
      durationMs: Date.now() - started,
    });
    return NextResponse.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start subscription checkout.";
    logEvent("error", "subscription_checkout_failed", {
      requestId,
      message,
      durationMs: Date.now() - started,
    });
    return NextResponse.json(
      {
        error:
          "Unable to start billing checkout right now. Please try again in a moment.",
      },
      { status: 502 },
    );
  }
}
