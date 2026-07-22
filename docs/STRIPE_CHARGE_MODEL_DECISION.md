# Stripe Connect charge-model decision

## Decision required

Choose whether Portal is a **SaaS tool used by independent businesses** or the **marketplace merchant controlling client checkout**. Do not migrate payment code or change live Stripe settings until this is decided with Stripe/accounting/legal input.

## Current implementation

Portal currently:

- creates legacy v1 Express connected accounts;
- creates Checkout Sessions on the platform account;
- uses a destination charge with `transfer_data.destination`;
- retains approximately 1% with `application_fee_amount`;
- gates checkout with legacy `charges_enabled`;
- handles successful Checkout and basic account/subscription events, but not refunds, disputes, reversals, or failed/asynchronous payment outcomes.

This is marketplace-style destination-charge behavior. It conflicts with current product/terms language saying each workspace owner is merchant of record and receives payment directly.

## Comparison for Portal's 1% fee

| Question | Destination charges (current) | Direct charges |
| --- | --- | --- |
| Best fit | Portal controls checkout as a marketplace | Independent workspace owner sells services to their own client |
| Merchant/payment relationship | Platform-side charge; Portal carries marketplace-style responsibility | Charge exists on connected merchant account; workspace owner owns customer/payment relationship |
| 1% collection | `application_fee_amount` | `application_fee_amount` |
| Stripe processing fees | Commonly borne/controlled by platform configuration | Connected merchant normally bears Stripe processing fees |
| Negative balances/disputes | Platform generally needs application fee/loss responsibility and operational recovery | Connected merchant/Stripe responsibility can align with SaaS configuration |
| Refund/dispute operations | Portal must coordinate refund funding, fee refunds, transfer reversals, evidence, and losses | Owner can manage in full Stripe Dashboard; Portal still needs status sync and support boundaries |
| Connected dashboard | Express is typical | Full Stripe Dashboard is the safer SaaS default |
| Accounts v2 target | Recipient configuration and transfers capability | Merchant configuration and card-payments capability |
| Margin at 1% | High risk if Portal absorbs processing fees, refunds, disputes, or negative balances | More defensible if the owner pays processing fees and owns losses |
| Product-copy fit | Requires Portal marketplace/MoR disclosures | Matches “client-operations software for independent businesses” |

## Recommendation

Unless Portal intentionally wants to become the marketplace merchant, adopt **direct charges with Accounts v2 Merchant configuration** in a later approved phase. Portal's stated product boundary, branded independent workspaces, and 1% fee point toward SaaS/direct charges. Destination charges can consume or exceed a 1% margin if Portal bears processing, refund, dispute, and negative-balance costs.

Before approving direct charges, confirm:

1. Each workspace owner is legally and operationally responsible for its client, invoices, taxes, refunds, and disputes.
2. Stripe permits the chosen platform/account configuration and countries.
3. Portal's 1% application fee, subscription price, terms, statements, support flow, and webhook visibility are acceptable.
4. Migration treatment for existing connected accounts and pending/paid invoices is documented and tested.

If destination charges are retained, explicitly approve Portal as marketplace-style payment operator and budget for processing fees, application fees, refund funding, transfer reversals, disputes, reserves, negative balances, and evidence/support operations.

## No architecture change in this phase

The current Checkout and Connect APIs remain unchanged. This document is the decision gate for the next payment phase.
