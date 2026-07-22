import { describe, expect, it } from "vitest";

import {
  buildDirectChargeCheckoutSession,
  connectedAccountRequestOptions,
  directChargeReadiness,
  eventConnectedAccountId,
  paymentAccountMatches,
  requireTestModeDirectCharges,
} from "@/utils/stripe/direct-charge";

const checkoutArgs = {
  invoiceId: "11111111-1111-1111-1111-111111111111",
  projectId: "22222222-2222-2222-2222-222222222222",
  projectTitle: "Brand launch",
  clientId: "33333333-3333-3333-3333-333333333333",
  freelancerId: "44444444-4444-4444-4444-444444444444",
  clientEmail: "client@example.test",
  connectedAccountId: "acct_merchant_a",
  amount: 10_000,
  currency: "usd",
  applicationFeeAmount: 100,
  appUrl: "https://portal.example.test",
};

describe("Stripe direct-charge isolation", () => {
  it("creates Checkout on the merchant account with only Portal's application fee", () => {
    const params = buildDirectChargeCheckoutSession(checkoutArgs);
    const paymentIntent = params.payment_intent_data as Record<string, unknown>;

    expect(connectedAccountRequestOptions("acct_merchant_a", "idem_1")).toEqual({
      stripeAccount: "acct_merchant_a",
      idempotencyKey: "idem_1",
    });
    expect(paymentIntent.application_fee_amount).toBe(100);
    expect(paymentIntent).not.toHaveProperty("transfer_data");
    expect(params.metadata).toMatchObject({
      connected_account_id: "acct_merchant_a",
      charge_model: "direct",
    });
  });

  it("rejects cross-account payment events", () => {
    expect(paymentAccountMatches("acct_merchant_a", "acct_merchant_a")).toBe(true);
    expect(paymentAccountMatches("acct_merchant_a", "acct_merchant_b")).toBe(false);
    expect(paymentAccountMatches("acct_merchant_a", null)).toBe(false);
    expect(paymentAccountMatches(null, "acct_merchant_a")).toBe(false);
  });

  it("routes connected-account webhooks using Stripe's top-level account id", () => {
    expect(
      eventConnectedAccountId({ account: "acct_merchant_a" } as never),
    ).toBe("acct_merchant_a");
    expect(eventConnectedAccountId({} as never)).toBeNull();
  });

  it("supports existing active Express and Standard test accounts", () => {
    for (const type of ["express", "standard"] as const) {
      expect(
        directChargeReadiness({
          id: `acct_${type}`,
          type,
          charges_enabled: true,
          details_submitted: true,
          capabilities: { card_payments: "active", transfers: "active" },
        }).ready,
      ).toBe(true);
    }
  });

  it("routes inactive accounts to controlled onboarding", () => {
    expect(
      directChargeReadiness({
        id: "acct_incomplete",
        type: "express",
        charges_enabled: false,
        details_submitted: true,
        capabilities: { card_payments: "inactive", transfers: "active" },
      }),
    ).toMatchObject({ ready: false, requiresOnboarding: true });
  });

  it("refuses client invoice direct charges under a live secret key", () => {
    expect(() => requireTestModeDirectCharges("sk_test_fixture")).not.toThrow();
    expect(() => requireTestModeDirectCharges("sk_live_fixture")).toThrow(
      /test mode only/,
    );
  });
});
