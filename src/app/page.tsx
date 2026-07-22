import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";

import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="min-h-svh bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-zinc-50 to-zinc-50 text-zinc-900">
      {/* Hero */}
      <section className="relative isolate min-h-svh overflow-hidden">
        <Image
          src="/landing-hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="landing-hero-media object-cover object-[center_30%]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-zinc-50 via-zinc-50/92 to-zinc-50/25"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-zinc-50 via-transparent to-zinc-50/50"
        />

        <header className="relative z-10 border-b border-zinc-200/70 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
            <p className="landing-fade-up text-sm font-semibold tracking-tight text-zinc-900">
              Portal
            </p>
            <Link
              href="/login?mode=signin"
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "landing-fade-up landing-delay-1 border-zinc-200 bg-white shadow-sm",
              )}
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-xl">
            <p className="landing-fade-up text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Freelancer client portal
            </p>
            <h1 className="landing-fade-up landing-delay-1 mt-3 text-4xl font-semibold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
              The client workspace freelancers actually use.
            </h1>
            <p className="landing-fade-up landing-delay-2 mt-4 max-w-md text-base leading-relaxed text-zinc-500 sm:text-lg">
              Invite clients, share deliverables, and collect payment — one
              private portal per project.
            </p>
            <div className="landing-fade-up landing-delay-3 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className={cn(buttonVariants({ size: "lg" }), "gap-2 shadow-sm")}
              >
                Start 14-day free trial
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login?mode=signin"
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-zinc-200 bg-white/80 shadow-sm",
                )}
              >
                I already have an account
              </Link>
            </div>
            <p className="landing-fade-up landing-delay-3 mt-4 max-w-md text-sm text-zinc-500">
              Portal Pro is $25/mo after trial. Client invoice payments include a
              small platform fee (~1%).
            </p>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-t border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Workflow
          </p>
          <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            From invite to paid without the inbox chaos.
          </h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
            <Step
              number="01"
              title="Open a project"
              body="Spin up a workspace, set the phase, and invite your client by email."
            />
            <Step
              number="02"
              title="Share deliverables"
              body="Keep internal references private. Release only what the client should download."
            />
            <Step
              number="03"
              title="Get paid directly"
              body="Send invoices and collect through Stripe — funds go to your connected account."
            />
          </ol>
        </div>
      </section>

      {/* Positioning */}
      <section className="border-t border-zinc-200/80 bg-zinc-50/80">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
              Built for freelancers
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              A portal that feels like yours — not another SaaS spreadsheet.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-zinc-500 sm:text-lg">
            Portal keeps billing visible, projects organized, and files
            permissioned so clients always know where to look — and you always
            know what’s shared.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-zinc-200/80 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Pricing
          </p>
          <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Simple pricing that pays for itself on the first invoice.
          </h2>
          <div className="mt-10 max-w-lg rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              Portal Pro
            </p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-semibold tracking-tight text-zinc-900">
                $25
              </span>
              <span className="text-zinc-500">/ month</span>
            </p>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">
              14-day free trial, then $25/mo. Plus a ~1% platform fee on client
              invoice payments processed through Portal.
            </p>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-6 inline-flex gap-2 shadow-sm",
              )}
            >
              Start free trial
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-zinc-200/80 bg-zinc-50/80">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-20">
          <div className="mx-auto max-w-xl px-6 py-4 sm:px-10">
            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Ready for a cleaner client relationship?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500 sm:text-base">
              Create your freelancer workspace in minutes. Invite a client when
              you’re ready.
            </p>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 inline-flex gap-2 shadow-sm",
              )}
            >
              Start 14-day free trial
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Step({
  number,
  title,
  body,
}: {
  number: string;
  title: string;
  body: string;
}) {
  return (
    <li className="landing-step rounded-2xl border border-zinc-200/80 bg-zinc-50/60 p-5 shadow-sm">
      <p className="text-xs font-semibold tracking-[0.14em] text-blue-700">
        {number}
      </p>
      <h3 className="mt-3 text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{body}</p>
    </li>
  );
}
