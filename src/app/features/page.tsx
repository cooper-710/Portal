import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  MarketingPageHero,
  MarketingSection,
  MarketingShell,
} from "@/components/landing/marketing-shell";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Private project rooms, permissioned file vault, Stripe invoices, branded client home, and more.",
};

const FEATURE_GROUPS = [
  {
    title: "Project rooms",
    body: "Every engagement gets its own private space. Status, files, and payment stay together so nothing depends on a buried email thread.",
    points: [
      "One room per project, scoped to the people who belong there",
      "Phase tracking so clients always know where things stand",
      "A single place to open when work resumes",
    ],
  },
  {
    title: "Permissioned file vault",
    body: "Upload drafts and references freely. Share only the versions your client should download. Internal work stays internal.",
    points: [
      "Owner uploads without worrying about premature access",
      "Release files when they are ready for the client",
      "Downloads happen in Finalia, not as scattered attachments",
    ],
  },
  {
    title: "Invoices and Stripe Connect",
    body: "Send payment requests from the same workspace. Funds go to your connected Stripe account. Finalia takes a small platform fee on those payments.",
    points: [
      "Create and send invoices without leaving the project",
      "Client pays in place with a familiar Stripe checkout",
      "You stay the merchant of record on your Connect account",
    ],
  },
  {
    title: "Your brand on the client side",
    body: "Clients should feel like they entered your business, not a third-party tool. Name, logo, and colors carry through the experience.",
    points: [
      "Business name and logo on the client view",
      "Accent color that matches your identity",
      "A polished first impression on every invite",
    ],
  },
  {
    title: "Client home",
    body: "Invited clients land on a clear home for their project: what is shared, what is due, and how to pay. No clutter from other work.",
    points: [
      "Project-scoped access after a simple sign-in",
      "Deliverables and invoices in one view",
      "Built for people who are not power users",
    ],
  },
  {
    title: "Reviews and feedback loops",
    body: "Request a decision on each deliverable and on the finished project. Clients can approve or request changes with written feedback, and both sides can see the outcome in the workspace.",
    points: [
      "Per-deliverable approval and change requests",
      "Written feedback stays attached to the reviewed work",
      "Final project acceptance closes the review loop",
    ],
  },
] as const;

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="Features"
        title="Everything the client needs, in one place they will use."
        description="Finalia is a private workspace for sharing deliverables, collecting payment, and keeping the relationship clear from invite to close."
      />

      {FEATURE_GROUPS.map((group, index) => (
        <MarketingSection
          key={group.title}
          surface={index % 2 === 0 ? "surface" : "wash"}
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16">
            <div>
              <h2 className="landing-display text-3xl tracking-tight text-zinc-900 sm:text-4xl">
                {group.title}
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-zinc-500">
                {group.body}
              </p>
            </div>
            <ul className="space-y-4 border-t border-zinc-200/80 pt-6 lg:border-t-0 lg:border-l lg:pl-10 lg:pt-0">
              {group.points.map((point) => (
                <li
                  key={point}
                  className="border-b border-zinc-200/60 pb-4 text-sm leading-relaxed text-zinc-600 last:border-b-0 last:pb-0"
                >
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </MarketingSection>
      ))}

      <MarketingSection surface="wash">
        <div className="max-w-xl">
          <h2 className="landing-display text-3xl tracking-tight text-zinc-900 sm:text-4xl">
            See pricing, then try it on a real project.
          </h2>
          <p className="mt-4 text-base text-zinc-500">
            Finalia Pro is $25/mo after a 14-day trial, with a clear ~1% fee on
            client invoice payments.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/?auth=signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "inline-flex gap-2 shadow-none",
              )}
            >
              Start free trial
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/pricing"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-zinc-200 shadow-none",
              )}
            >
              View pricing
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingShell>
  );
}
