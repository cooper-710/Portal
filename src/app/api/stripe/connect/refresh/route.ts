import { NextResponse } from "next/server";
import Stripe from "stripe";

import { appBaseUrl } from "@/lib/product";
import { createClient } from "@/utils/supabase/server";

function safeAppPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

/**
 * Refresh Account Link when onboarding is incomplete / expired.
 */
export async function GET(request: Request) {
  const appUrl = appBaseUrl();
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const { searchParams } = new URL(request.url);
  const next = safeAppPath(
    searchParams.get("next"),
    "/dashboard/invoices",
  );
  const nextParam = encodeURIComponent(next);

  if (!stripeSecret) {
    return NextResponse.redirect(`${appUrl}${next}?connect=error`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${appUrl}/?auth=signin&next=${encodeURIComponent(next)}`,
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_account_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer" || !profile.stripe_account_id) {
    return NextResponse.redirect(`${appUrl}${next}?connect=error`);
  }

  try {
    const stripe = new Stripe(stripeSecret);
    const accountLink = await stripe.accountLinks.create({
      account: profile.stripe_account_id,
      refresh_url: `${appUrl}/api/stripe/connect/refresh?next=${nextParam}`,
      return_url: `${appUrl}/api/stripe/connect/return?next=${nextParam}`,
      type: "account_onboarding",
    });

    return NextResponse.redirect(accountLink.url);
  } catch {
    return NextResponse.redirect(`${appUrl}${next}?connect=error`);
  }
}
