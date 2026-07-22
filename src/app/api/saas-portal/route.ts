import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/utils/supabase/server";

/**
 * Open the Stripe Customer Portal for platform subscription management.
 */
export async function POST() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  if (!stripeSecret) {
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
    .select("id, role, stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer") {
    return NextResponse.json(
      { error: "Only workspace owners can manage platform billing." },
      { status: 403 },
    );
  }

  if (!profile.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing customer yet. Subscribe first." },
      { status: 400 },
    );
  }

  const stripe = new Stripe(stripeSecret);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/dashboard/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unable to open the Stripe billing portal.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
