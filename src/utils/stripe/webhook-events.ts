import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * Claim a Stripe event id for processing (event-level idempotency).
 * Returns { claimed: true } on first insert, { claimed: false } if already seen.
 * On handler failure, call releaseStripeWebhookEvent so Stripe retries can re-claim.
 */
export async function claimStripeWebhookEvent(
  admin: SupabaseClient<Database>,
  eventId: string,
  eventType: string,
): Promise<
  | { ok: true; claimed: boolean }
  | { ok: false; error: string }
> {
  const { error } = await admin.from("stripe_webhook_events").insert({
    id: eventId,
    type: eventType,
  });

  if (!error) {
    return { ok: true, claimed: true };
  }

  // Unique violation → already processed (or in-flight from a concurrent delivery).
  if (error.code === "23505") {
    return { ok: true, claimed: false };
  }

  return { ok: false, error: error.message };
}

/** Drop a claim so a failed delivery can be retried by Stripe. */
export async function releaseStripeWebhookEvent(
  admin: SupabaseClient<Database>,
  eventId: string,
) {
  const { error } = await admin
    .from("stripe_webhook_events")
    .delete()
    .eq("id", eventId);
  if (error) {
    console.error(
      `[stripe webhook] failed to release claim for ${eventId}:`,
      error.message,
    );
  }
}
