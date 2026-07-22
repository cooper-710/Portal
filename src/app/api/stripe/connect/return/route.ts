import { NextResponse } from "next/server";
import Stripe from "stripe";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

function safeAppPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

async function syncConnectStatus() {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return { error: "Stripe is not configured.", status: 503 as const };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized.", status: 401 as const };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_account_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer" || !profile.stripe_account_id) {
    return { error: "No Connect account found.", status: 404 as const };
  }

  const stripe = new Stripe(stripeSecret);
  const account = await stripe.accounts.retrieve(profile.stripe_account_id);

  const admin = createAdminClient();
  const { error } = await admin
    .from("users")
    .update({
      stripe_charges_enabled: account.charges_enabled ?? false,
      stripe_details_submitted: account.details_submitted ?? false,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message, status: 500 as const };
  }

  return {
    chargesEnabled: Boolean(account.charges_enabled),
    detailsSubmitted: Boolean(account.details_submitted),
  };
}

export async function GET(request: Request) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const { searchParams } = new URL(request.url);
  const next = safeAppPath(
    searchParams.get("next"),
    "/dashboard/invoices",
  );

  try {
    const result = await syncConnectStatus();
    if ("error" in result && result.error) {
      const sep = next.includes("?") ? "&" : "?";
      return NextResponse.redirect(`${appUrl}${next}${sep}connect=error`);
    }

    const chargesEnabled =
      "chargesEnabled" in result ? result.chargesEnabled : false;
    const sep = next.includes("?") ? "&" : "?";
    const status = chargesEnabled ? "ready" : "pending";

    // If returning into onboarding, resume the wizard (auto-skips Connect when ready).
    if (next.startsWith("/onboarding")) {
      return NextResponse.redirect(`${appUrl}/onboarding`);
    }

    return NextResponse.redirect(`${appUrl}${next}${sep}connect=${status}`);
  } catch {
    const sep = next.includes("?") ? "&" : "?";
    return NextResponse.redirect(`${appUrl}${next}${sep}connect=error`);
  }
}
