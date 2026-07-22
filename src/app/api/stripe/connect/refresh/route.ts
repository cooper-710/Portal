import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createClient } from "@/utils/supabase/server";

/**
 * Refresh Account Link when onboarding is incomplete / expired.
 */
export async function GET() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

  if (!stripeSecret) {
    return NextResponse.redirect(`${appUrl}/dashboard/invoices?connect=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_account_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer" || !profile.stripe_account_id) {
    return NextResponse.redirect(`${appUrl}/dashboard/invoices?connect=error`);
  }

  try {
    const stripe = new Stripe(stripeSecret);
    const accountLink = await stripe.accountLinks.create({
      account: profile.stripe_account_id,
      refresh_url: `${appUrl}/api/stripe/connect/refresh`,
      return_url: `${appUrl}/api/stripe/connect/return`,
      type: "account_onboarding",
    });

    return NextResponse.redirect(accountLink.url);
  } catch {
    return NextResponse.redirect(`${appUrl}/dashboard/invoices?connect=error`);
  }
}
