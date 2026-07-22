import Stripe from "stripe";

import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";

function paymentIntentIdFromSession(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
}

/**
 * Mark an invoice paid from a verified Stripe Checkout session.
 * Prefers the service-role client (webhook); falls back to authenticated RPC
 * on Checkout return paths. Webhooks must pass requireAdmin so a missing
 * SUPABASE_SERVICE_ROLE_KEY fails loudly instead of silently no-oping.
 */
export async function markInvoicePaidFromSession(
  session: Stripe.Checkout.Session,
  options?: { preferAdmin?: boolean; requireAdmin?: boolean },
) {
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) {
    return { ok: false as const, error: "Missing invoice_id in session metadata." };
  }

  if (session.payment_status && session.payment_status !== "paid") {
    return { ok: false as const, error: `Session payment_status is ${session.payment_status}.` };
  }

  const paymentIntentId = paymentIntentIdFromSession(session);
  const requireAdmin = options?.requireAdmin === true;
  const preferAdmin =
    requireAdmin ||
    (options?.preferAdmin ?? Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY));

  if (preferAdmin) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        ok: false as const,
        error:
          "Missing SUPABASE_SERVICE_ROLE_KEY. Webhook/admin invoice updates cannot proceed.",
      };
    }

    const admin = createAdminClient();

    // Idempotency: Stripe may deliver the same event more than once.
    const { data: existing, error: existingError } = await admin
      .from("invoices")
      .select("id, status, stripe_checkout_session_id")
      .eq("id", invoiceId)
      .maybeSingle();

    if (existingError) {
      return { ok: false as const, error: existingError.message };
    }
    if (!existing) {
      return { ok: false as const, error: "Invoice not found for session metadata." };
    }
    if (
      existing.status === "paid" &&
      (existing.stripe_checkout_session_id === session.id ||
        existing.stripe_checkout_session_id != null)
    ) {
      return { ok: true as const, invoiceId, alreadyPaid: true as const };
    }

    const { error } = await admin
      .from("invoices")
      .update({
        status: "paid",
        stripe_checkout_session_id: session.id,
        stripe_payment_intent_id: paymentIntentId,
      })
      .eq("id", invoiceId);

    if (error) {
      return { ok: false as const, error: error.message };
    }

    await admin
      .from("client_actions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("invoice_id", invoiceId)
      .eq("status", "open");

    return { ok: true as const, invoiceId };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_invoice_paid", {
    p_invoice_id: invoiceId,
    p_checkout_session_id: session.id,
    p_payment_intent_id: paymentIntentId,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const { completeClientActionsForInvoice } = await import(
    "@/lib/client-actions"
  );
  await completeClientActionsForInvoice(supabase, invoiceId);

  return { ok: true as const, invoiceId };
}

export async function syncCheckoutSessionById(sessionId: string) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return { ok: false as const, error: "Stripe is not configured." };
  }

  const stripe = new Stripe(stripeSecret);
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.payment_status !== "paid" && session.status !== "complete") {
    return {
      ok: false as const,
      error: `Checkout session is not complete (status=${session.status}, payment=${session.payment_status}).`,
    };
  }

  return markInvoicePaidFromSession(session, { preferAdmin: false });
}
