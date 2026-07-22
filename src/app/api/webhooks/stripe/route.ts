import { NextResponse } from "next/server";
import Stripe from "stripe";

import { markInvoicePaidFromSession } from "@/utils/stripe/sync-invoice";
import {
  clearPlatformSubscription,
  syncPlatformSubscription,
} from "@/utils/stripe/sync-subscription";
import {
  claimStripeWebhookEvent,
  releaseStripeWebhookEvent,
} from "@/utils/stripe/webhook-events";
import { createAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

/**
 * Stripe webhook, client invoice payments, Connect accounts, and platform subscriptions.
 *
 * Requires STRIPE_WEBHOOK_SECRET (raw-body signature verification) and
 * SUPABASE_SERVICE_ROLE_KEY (server-only writes that bypass RLS). Misconfiguration
 * returns 5xx so Stripe retries and operators notice, never pretend payments synced.
 *
 * Idempotency: event ids are claimed in stripe_webhook_events; failed handlers
 * release the claim so Stripe can retry. Subscription/invoice writers are also
 * content-idempotent (alreadySynced / alreadyPaid).
 *
 * Local setup:
 *   stripe listen --forward-to localhost:3001/api/webhooks/stripe
 * Then put the printed whsec_... into STRIPE_WEBHOOK_SECRET.
 */
export async function POST(request: Request) {
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!stripeSecret) {
    console.error("[stripe webhook] STRIPE_SECRET_KEY is not configured.");
    return NextResponse.json(
      { error: "STRIPE_SECRET_KEY is not configured." },
      { status: 503 },
    );
  }

  if (!webhookSecret) {
    console.error("[stripe webhook] STRIPE_WEBHOOK_SECRET is not configured.");
    return NextResponse.json(
      {
        error:
          "STRIPE_WEBHOOK_SECRET is not configured. Run `stripe listen --forward-to localhost:3001/api/webhooks/stripe` and add the whsec_ value to .env.local.",
      },
      { status: 503 },
    );
  }

  if (!serviceRoleKey) {
    console.error(
      "[stripe webhook] SUPABASE_SERVICE_ROLE_KEY is not configured. Refusing to process events without service-role writes.",
    );
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not configured. Webhooks cannot update invoices/users without the service role.",
      },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = new Stripe(stripeSecret);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    console.error("[stripe webhook] signature verification failed:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.info(
    `[stripe webhook] received event=${event.id} type=${event.type} livemode=${event.livemode}`,
  );

  const admin = createAdminClient();
  const claim = await claimStripeWebhookEvent(admin, event.id, event.type);
  if (!claim.ok) {
    console.error(
      `[stripe webhook] ${event.id} event claim failed:`,
      claim.error,
    );
    return NextResponse.json(
      { received: true, handled: false, error: claim.error },
      { status: 500 },
    );
  }
  if (!claim.claimed) {
    console.info(
      `[stripe webhook] ${event.id} already processed (idempotent skip)`,
    );
    return NextResponse.json({
      received: true,
      handled: true,
      alreadyProcessed: true,
    });
  }

  async function fail(status: number, body: Record<string, unknown>) {
    await releaseStripeWebhookEvent(admin, event.id);
    return NextResponse.json(body, { status });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (
          session.mode === "subscription" ||
          session.metadata?.purpose === "platform_subscription"
        ) {
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;

          if (!subscriptionId) {
            console.warn(
              `[stripe webhook] ${event.id} subscription checkout missing subscription id`,
            );
            // Soft miss, keep claim so we do not loop forever on bad data.
            return NextResponse.json({
              received: true,
              handled: false,
              error: "Missing subscription on checkout session.",
            });
          }

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const result = await syncPlatformSubscription(subscription, {
            customerId:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id ?? null,
            freelancerId:
              session.metadata?.freelancer_id ??
              session.client_reference_id ??
              null,
            requireAdmin: true,
          });

          if (!result.ok) {
            console.error(
              `[stripe webhook] ${event.id} subscription checkout sync failed:`,
              result.error,
            );
            return fail(500, {
              received: true,
              handled: false,
              error: result.error,
            });
          }

          console.info(
            `[stripe webhook] ${event.id} platform subscription synced sub=${subscription.id}` +
              ("alreadySynced" in result && result.alreadySynced
                ? " (idempotent)"
                : ""),
          );
          return NextResponse.json({
            received: true,
            handled: true,
            alreadySynced:
              "alreadySynced" in result ? result.alreadySynced : false,
          });
        }

        const result = await markInvoicePaidFromSession(session, {
          preferAdmin: true,
          requireAdmin: true,
        });

        if (!result.ok) {
          console.error(
            `[stripe webhook] ${event.id} mark invoice paid failed:`,
            result.error,
          );
          return fail(500, {
            received: true,
            handled: false,
            error: result.error,
          });
        }

        console.info(
          `[stripe webhook] ${event.id} invoice paid invoice=${result.invoiceId}` +
            ("alreadyPaid" in result && result.alreadyPaid ? " (idempotent)" : ""),
        );
        return NextResponse.json({
          received: true,
          handled: true,
          invoiceId: result.invoiceId,
          alreadyPaid: "alreadyPaid" in result ? result.alreadyPaid : false,
        });
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const result = await syncPlatformSubscription(subscription, {
          requireAdmin: true,
        });
        if (!result.ok) {
          console.error(
            `[stripe webhook] ${event.id} subscription sync failed:`,
            result.error,
          );
          return fail(500, {
            received: true,
            handled: false,
            error: result.error,
          });
        }
        console.info(
          `[stripe webhook] ${event.id} subscription synced id=${subscription.id} status=${subscription.status}` +
            ("alreadySynced" in result && result.alreadySynced
              ? " (idempotent)"
              : ""),
        );
        return NextResponse.json({
          received: true,
          handled: true,
          alreadySynced:
            "alreadySynced" in result ? result.alreadySynced : false,
        });
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

        if (!customerId) {
          console.warn(`[stripe webhook] ${event.id} subscription.deleted missing customer`);
          return NextResponse.json({ received: true, handled: false });
        }

        const result = await clearPlatformSubscription(customerId);
        if (!result.ok) {
          console.error(
            `[stripe webhook] ${event.id} subscription clear failed:`,
            result.error,
          );
          return fail(500, {
            received: true,
            handled: false,
            error: result.error,
          });
        }
        console.info(`[stripe webhook] ${event.id} subscription cleared customer=${customerId}`);
        return NextResponse.json({ received: true, handled: true });
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const { error } = await admin
          .from("users")
          .update({
            stripe_charges_enabled: account.charges_enabled ?? false,
            stripe_details_submitted: account.details_submitted ?? false,
          })
          .eq("stripe_account_id", account.id);

        if (error) {
          console.error(
            `[stripe webhook] ${event.id} account.updated sync failed:`,
            error.message,
          );
          return fail(500, {
            received: true,
            handled: false,
            error: error.message,
          });
        }

        console.info(
          `[stripe webhook] ${event.id} connect account synced id=${account.id} charges=${account.charges_enabled}`,
        );
        return NextResponse.json({ received: true, handled: true });
      }
      default:
        console.info(`[stripe webhook] ${event.id} ignored type=${event.type}`);
        return NextResponse.json({ received: true, handled: false });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handler failed";
    console.error(`[stripe webhook] ${event.id} unhandled error:`, message);
    await releaseStripeWebhookEvent(admin, event.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
