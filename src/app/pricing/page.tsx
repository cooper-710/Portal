import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import {
  MarketingPageHero,
  MarketingSection,
  MarketingShell,
} from "@/components/landing/marketing-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Portal Pro is $25/mo after a 14-day free trial. Plus a ~1% platform fee on client invoice payments.",
};

const INCLUDED = [
  "Unlimited projects and client invites",
  "Permissioned file vault",
  "Branded client home",
  "Stripe Connect invoicing",
  "14-day free trial, cancel anytime",
] as const;

const FEE_POINTS = [
  {
    title: "Subscription",
    body: "Portal Pro is $25 per month after the trial. That covers the workspace, vault, branding, and client access.",
  },
  {
    title: "Platform fee on invoices",
    body: "You accept invoice payments on your connected Stripe account as the merchant of record. Portal receives about 1%; Stripe separately deducts its processing fees from your account.",
  },
  {
    title: "No surprise add-ons",
    body: "No per-seat client fees. No charge just to upload files. You pay for Portal Pro, then a small cut only when money moves through an invoice.",
  },
] as const;

export default function PricingPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Pricing"
        title="Simple pricing that pays for itself on the first invoice."
        description="One plan. A real trial. A clear fee when clients pay. No maze of tiers to decode before you start."
      />

      <MarketingSection>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-16">
          <div className="landing-pricing-panel border-t border-zinc-200/80 pt-8">
            <p className="landing-display text-sm tracking-wide text-primary">
              Portal Pro
            </p>
            <p className="mt-4 flex items-baseline gap-2">
              <span className="landing-display text-5xl tracking-tight text-zinc-900 sm:text-6xl">
                $25
              </span>
              <span className="text-zinc-500">/ month</span>
            </p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-500">
              14-day free trial, then $25/mo. Plus a ~1% platform fee on client
              invoice payments processed through Portal.
            </p>
            <Link
              href="/?auth=signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 inline-flex gap-2 shadow-none",
              )}
            >
              Start free trial
              <ArrowRight className="size-4" />
            </Link>
            <ul className="mt-10 space-y-3">
              {INCLUDED.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-zinc-600"
                >
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-primary"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="landing-display text-2xl tracking-tight text-zinc-900 sm:text-3xl">
              How the ~1% fee works
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500 sm:text-base">
              Portal is not a payment processor. Stripe handles cards and
              payouts. We charge a small platform fee on invoice payments so the
              product can stay simple and subscription-priced.
            </p>
            <ul className="mt-10 space-y-8">
              {FEE_POINTS.map((item) => (
                <li
                  key={item.title}
                  className="border-t border-zinc-200/80 pt-6"
                >
                  <h3 className="text-base font-semibold text-zinc-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </MarketingSection>

      <MarketingSection surface="wash">
        <div className="max-w-2xl">
          <h2 className="landing-display text-3xl tracking-tight text-zinc-900 sm:text-4xl">
            Questions before you start?
          </h2>
          <dl className="mt-10 space-y-8">
            <div className="border-t border-zinc-200/80 pt-6">
              <dt className="text-base font-semibold text-zinc-900">
                Do I need a card for the trial?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-500">
                You can explore Portal Pro for 14 days. Billing starts after the
                trial unless you cancel. Connect Stripe when you are ready to
                send invoices.
              </dd>
            </div>
            <div className="border-t border-zinc-200/80 pt-6">
              <dt className="text-base font-semibold text-zinc-900">
                Where does client money go?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-500">
                To your Stripe Connect account. Portal never holds client funds.
                The ~1% platform fee is taken on invoice payments processed
                through the product.
              </dd>
            </div>
            <div className="border-t border-zinc-200/80 pt-6">
              <dt className="text-base font-semibold text-zinc-900">
                Can clients use Portal for free?
              </dt>
              <dd className="mt-2 text-sm leading-relaxed text-zinc-500">
                Yes. Invited clients sign in to their project at no charge. Only
                the workspace owner needs Portal Pro.
              </dd>
            </div>
          </dl>
          <Link
            href="/?auth=signup"
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-10 inline-flex gap-2 shadow-none",
            )}
          >
            Start 14-day free trial
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </MarketingSection>
    </MarketingShell>
  );
}
