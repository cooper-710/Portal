import Stripe from "stripe";

import {
  applyInvoicePaymentEvent,
  type InvoicePaymentOutcome,
} from "@/utils/stripe/invoice-payment-lifecycle";
import { connectedAccountRequestOptions } from "@/utils/stripe/direct-charge";
import { createAdminClient } from "@/utils/supabase/admin";

function id(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

/**
 * Reconcile one Checkout Session into the model-neutral invoice lifecycle.
 * This is used by the return path and can also be called by an operator without
 * changing invoice state outside verified, account-scoped Stripe data.
 */
export async function reconcileInvoiceCheckoutSession(
  stripe: Stripe,
  sessionId: string,
  connectedAccountId: string | null,
) {
  const session = connectedAccountId
    ? await stripe.checkout.sessions.retrieve(
        sessionId,
        { expand: ["payment_intent.latest_charge"] },
        connectedAccountRequestOptions(connectedAccountId),
      )
    : await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["payment_intent.latest_charge"],
      });
  const invoiceId = session.metadata?.invoice_id;
  if (!invoiceId) {
    return { ok: false as const, error: "Missing invoice_id in session metadata." };
  }

  const paymentIntent =
    typeof session.payment_intent === "object" ? session.payment_intent : null;
  const charge =
    paymentIntent && typeof paymentIntent.latest_charge === "object"
      ? paymentIntent.latest_charge
      : null;

  let outcome: InvoicePaymentOutcome = "processing";
  if (session.status === "expired") outcome = "canceled";
  else if (session.payment_status === "paid") outcome = "succeeded";
  else if (session.status === "open") outcome = "processing";

  if (charge?.amount_refunded) {
    outcome = charge.amount_refunded >= charge.amount
      ? "refunded"
      : "partially_refunded";
  } else if (charge?.disputed) {
    outcome = "dispute_opened";
  }

  return applyInvoicePaymentEvent({
    stripeEventId: `reconcile:checkout:${session.id}:${outcome}:${charge?.amount_refunded ?? 0}`,
    stripeEventType: "portal.invoice.reconciled",
    stripeObjectId: session.id,
    invoiceId,
    outcome,
    connectedAccountId,
    // Reconciliation must never look newer than later refund/dispute webhooks.
    // The reducer can still enrich state at the original session timestamp.
    occurredAt: session.created,
    amountPaid:
      paymentIntent?.amount_received ||
      (session.payment_status === "paid" ? session.amount_total ?? undefined : undefined),
    amountRefunded: charge?.amount_refunded,
    chargeId: charge?.id ?? id(paymentIntent?.latest_charge),
    paymentIntentId: paymentIntent?.id ?? id(session.payment_intent),
    checkoutSessionId: session.id,
  });
}

export async function syncCheckoutSessionById(sessionId: string) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecret) {
    return { ok: false as const, error: "Stripe is not configured." };
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false as const, error: "Payment reconciliation is unavailable." };
  }
  const admin = createAdminClient();
  const { data: invoice, error } = await admin
    .from("invoices")
    .select("stripe_connected_account_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  if (error || !invoice) {
    return {
      ok: false as const,
      error: error?.message ?? "Invoice not found for Checkout Session.",
    };
  }
  return reconcileInvoiceCheckoutSession(
    new Stripe(stripeSecret),
    sessionId,
    invoice.stripe_connected_account_id,
  );
}
