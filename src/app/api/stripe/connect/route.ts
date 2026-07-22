import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/utils/supabase/server";

function getStripe() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return null;
  }
  return new Stripe(stripeSecret);
}

/**
 * Start Stripe Connect Express onboarding for the authenticated freelancer.
 */
export async function POST() {
  const stripe = getStripe();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  if (!stripe) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
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
      "id, email, role, stripe_account_id, stripe_charges_enabled, stripe_details_submitted",
    )
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer") {
    return NextResponse.json(
      { error: "Only freelancers can connect a Stripe payout account." },
      { status: 403 },
    );
  }

  let accountId = profile.stripe_account_id;

  try {
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: profile.email ?? user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        metadata: {
          freelancer_id: user.id,
        },
      });
      accountId = account.id;

      const { error } = await supabase
        .from("users")
        .update({
          stripe_account_id: accountId,
          stripe_charges_enabled: account.charges_enabled ?? false,
          stripe_details_submitted: account.details_submitted ?? false,
        })
        .eq("id", user.id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/api/stripe/connect/refresh`,
      return_url: `${appUrl}/api/stripe/connect/return`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to start Stripe Connect.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
