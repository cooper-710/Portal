import { NextResponse } from "next/server";

import { isPlatformSubscriptionActive } from "@/utils/stripe/subscription";
import { reconcilePlatformSubscriptionFromStripe } from "@/utils/stripe/sync-subscription";
import { createClient } from "@/utils/supabase/server";

/**
 * Re-pull Portal Pro status from Stripe into `users` for the signed-in freelancer.
 * Useful when Checkout return sync / webhooks did not write (e.g. missing service role).
 */
export async function POST() {
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
      "id, role, stripe_customer_id, subscription_status, stripe_subscription_id",
    )
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "freelancer") {
    return NextResponse.json(
      { error: "Only workspace owners can refresh Portal Pro." },
      { status: 403 },
    );
  }

  if (!profile.stripe_customer_id) {
    return NextResponse.json(
      { error: "No Stripe customer on this account yet. Start a trial first." },
      { status: 400 },
    );
  }

  const result = await reconcilePlatformSubscriptionFromStripe({
    freelancerId: profile.id,
    stripeCustomerId: profile.stripe_customer_id,
    supabase,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const { data: fresh } = await supabase
    .from("users")
    .select(
      "subscription_status, stripe_subscription_id, subscription_current_period_end",
    )
    .eq("id", user.id)
    .single();

  return NextResponse.json({
    ok: true,
    subscription_status: fresh?.subscription_status ?? null,
    unlocked: isPlatformSubscriptionActive(fresh?.subscription_status),
  });
}
