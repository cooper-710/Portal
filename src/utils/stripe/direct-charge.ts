import Stripe from "stripe";

export type DirectChargeAccountSnapshot = Pick<
  Stripe.Account,
  "id" | "type" | "charges_enabled" | "details_submitted" | "capabilities"
>;

export function directChargeReadiness(account: DirectChargeAccountSnapshot) {
  const cardPayments = account.capabilities?.card_payments ?? "inactive";
  const supportedAccount =
    account.type === "express" ||
    account.type === "standard" ||
    account.type === "custom";
  const ready =
    supportedAccount && account.charges_enabled && cardPayments === "active";

  return {
    ready,
    supportedAccount,
    cardPayments,
    requiresOnboarding: supportedAccount && !ready,
    reason: !supportedAccount
      ? "This connected account configuration does not support the current direct-charge integration."
      : !account.details_submitted
        ? "Stripe onboarding is incomplete."
        : cardPayments !== "active"
          ? "Stripe card payments are not active for this connected account."
          : !account.charges_enabled
            ? "Stripe has not enabled charges for this connected account."
            : null,
  };
}

export function requireTestModeDirectCharges(secretKey: string) {
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error(
      "Client invoice direct charges are enabled for Stripe test mode only.",
    );
  }
}

export function connectedAccountRequestOptions(
  connectedAccountId: string,
  idempotencyKey?: string,
): Stripe.RequestOptions {
  return {
    stripeAccount: connectedAccountId,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  };
}

export function buildDirectChargeCheckoutSession(args: {
  invoiceId: string;
  projectId: string;
  projectTitle: string;
  clientId: string;
  freelancerId: string;
  clientEmail?: string;
  connectedAccountId: string;
  amount: number;
  currency: string;
  applicationFeeAmount: number;
  appUrl: string;
}): Stripe.Checkout.SessionCreateParams {
  const metadata: Stripe.MetadataParam = {
    invoice_id: args.invoiceId,
    project_id: args.projectId,
    client_id: args.clientId,
    freelancer_id: args.freelancerId,
    connected_account_id: args.connectedAccountId,
    application_fee_amount: String(args.applicationFeeAmount),
    charge_model: "direct",
  };

  return {
    mode: "payment",
    customer_email: args.clientEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: args.currency.toLowerCase(),
          unit_amount: args.amount,
          product_data: {
            name: `Invoice, ${args.projectTitle}`,
            description: `Portal invoice ${args.invoiceId.slice(0, 8)}`,
          },
        },
      },
    ],
    metadata,
    payment_intent_data: {
      ...(args.applicationFeeAmount > 0
        ? { application_fee_amount: args.applicationFeeAmount }
        : {}),
      metadata,
    },
    success_url: `${args.appUrl}/dashboard/invoices?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${args.appUrl}/dashboard/invoices?canceled=1`,
  };
}

export function eventConnectedAccountId(event: Stripe.Event) {
  return typeof event.account === "string" ? event.account : null;
}

export function paymentAccountMatches(
  storedConnectedAccountId: string | null,
  eventConnectedAccountId: string | null,
) {
  return storedConnectedAccountId === eventConnectedAccountId;
}
