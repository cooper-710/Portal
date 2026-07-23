# Stripe Connect charge-model decision

## Approved test-mode decision

Finalia is client-operations software for independent businesses. For client
invoice payments, each workspace owner is the business the client is paying and
is responsible for payment support, refunds, and disputes. Finalia provides the
software and receives its disclosed application fee.

Client invoices therefore use direct charges in Stripe test mode:

- Checkout Sessions and their PaymentIntents/Charges exist on the workspace
  owner's connected account;
- Finalia supplies `application_fee_amount` for its approximately 1% fee;
- Stripe processing fees are deducted according to the connected account's
  Stripe configuration;
- every Stripe API request and webhook is scoped and validated against the
  invoice's stored connected-account ID;
- Finalia Pro subscriptions remain platform-level Stripe Billing and are not
  part of the connected-account charge flow.

## Existing account compatibility

Legacy Express connected accounts can support direct charges when their
`card_payments` capability is active and Stripe reports charges enabled. Active
Express and Standard test accounts continue without replacement. An inactive
account is sent through the existing Stripe-hosted onboarding link so Stripe can
collect outstanding requirements; Accounts v2 migration is not required for
this test phase.

## Test-mode boundary

Client invoice Checkout refuses live secret keys, and live connected-account
payment events are not applied to invoice state. No live event destination,
account configuration, or charge architecture is changed in this phase.

Approving live direct charges remains a separate gate requiring acceptance-test
evidence, responsibility/fee review, live account compatibility confirmation,
and explicit configuration approval.
