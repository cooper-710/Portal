import Stripe from "stripe";

import {
  applyInvoicePaymentEvent,
  type InvoicePaymentOutcome,
} from "@/utils/stripe/invoice-payment-lifecycle";

function id(value: string | { id: string } | null | undefined) {
  return typeof value === "string" ? value : value?.id ?? null;
}

/**
 * Reconcile one Checkout Session into the model-neutral invoice lifecycle.
 * This is used by the return path and can also be called by an operator without
 * changing the destination-charge architecture.
 */
export async function reconcileInvoiceCheckoutSession(
  stripe: Stripe,
  sessionId: string,
) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
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
  return reconcileInvoiceCheckoutSession(new Stripe(stripeSecret), sessionId);
}
