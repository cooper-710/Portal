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
  title: "How it works",
  description:
    "From signup to paid: start a trial, connect Stripe, brand your space, open a project, invite a client, and collect payment.",
};

const STEPS = [
  {
    number: "01",
    title: "Create your account",
    body: "Sign up with Google. Portal opens a workspace for you in minutes, with no setup checklist to fight through.",
  },
  {
    number: "02",
    title: "Start the 14-day trial",
    body: "Portal Pro unlocks during the trial so you can run a real client project before billing starts at $25/mo.",
  },
  {
    number: "03",
    title: "Connect Stripe",
    body: "Link your Stripe account so invoice payments land with you. Portal never holds client funds.",
  },
  {
    number: "04",
    title: "Add your brand",
    body: "Set your business name, logo, and colors. Clients see your identity, not a generic shell.",
  },
  {
    number: "05",
    title: "Open a project",
    body: "Create a private room for the engagement. Track phase, keep notes, and prepare what you will share.",
  },
  {
    number: "06",
    title: "Invite your client",
    body: "Send an email invite. They sign in once and land on a clean home for that project only.",
  },
  {
    number: "07",
    title: "Share work and get paid",
    body: "Release deliverables from the vault when ready. Send a Stripe invoice from the same space. Your client pays in place.",
  },
] as const;

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <MarketingPageHero
        eyebrow="How it works"
        title="From signup to paid, without the email chaos."
        description="Portal walks you through a short path: trial, Stripe, brand, project, invite, then payment. Each step is one job, done in order."
      />

      <MarketingSection>
        <ol className="space-y-0">
          {STEPS.map((step, index) => (
            <li
              key={step.number}
              className={cn(
                "grid gap-4 border-t border-zinc-200/80 py-10 sm:grid-cols-[5rem_1fr] sm:gap-10",
                index === STEPS.length - 1 && "border-b",
              )}
            >
              <p className="landing-display text-sm tracking-wide text-primary">
                {step.number}
              </p>
              <div>
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
                  {step.title}
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500 sm:text-base">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </MarketingSection>

      <MarketingSection surface="wash">
        <div className="max-w-xl">
          <h2 className="landing-display text-3xl tracking-tight text-zinc-900 sm:text-4xl">
            Ready to walk through it yourself?
          </h2>
          <p className="mt-4 text-base text-zinc-500">
            Start the trial, connect Stripe when you are ready, and invite your
            first client from one workspace.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/?auth=signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "inline-flex gap-2 shadow-none",
              )}
            >
              Start 14-day free trial
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/features"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-zinc-200 shadow-none",
              )}
            >
              Explore features
            </Link>
          </div>
        </div>
      </MarketingSection>
    </MarketingShell>
  );
}
