import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { directChargeReadiness } from "@/utils/stripe/direct-charge";

/**
 * Refresh the authenticated freelancer's cached Connect readiness.
 *
 * Stripe can activate card payments shortly after the onboarding return route
 * runs. This endpoint lets the dashboard repair that stale cached state without
 * sending an already-active merchant back through onboarding.
 */
export async function GET() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Stripe Connect is temporarily unavailable." },
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
    .select("role, stripe_account_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer") {
    return NextResponse.json(
      { error: "Only workspace owners can refresh Stripe Connect." },
      { status: 403 },
    );
  }

  if (!profile.stripe_account_id) {
    return NextResponse.json({ ready: false, hasAccount: false });
  }

  try {
    const stripe = new Stripe(stripeSecret);
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    const readiness = directChargeReadiness(account);
    const detailsSubmitted = Boolean(account.details_submitted);

    const admin = createAdminClient();
    const { error } = await admin
      .from("users")
      .update({
        stripe_charges_enabled: readiness.ready,
        stripe_details_submitted: detailsSubmitted,
      })
      .eq("id", user.id)
      .eq("stripe_account_id", account.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ready: readiness.ready,
      hasAccount: true,
      detailsSubmitted,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to refresh Stripe Connect status." },
      { status: 502 },
    );
  }
}
