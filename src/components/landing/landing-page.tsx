"use client";

import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";

import { AuthModal, authHref } from "@/components/auth/auth-modal";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingPage() {
  return (
    <div className="landing-root min-h-svh text-foreground">
      <Suspense fallback={null}>
        <AuthModal />
      </Suspense>

      {/* Hero: one composition, brand-first, no photo */}
      <section className="relative isolate min-h-svh overflow-hidden">
        <div aria-hidden className="landing-hero-atmosphere absolute inset-0" />
        <div aria-hidden className="landing-hero-grid absolute inset-0" />
        <HeroVisual />

        <header className="relative z-10">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-end px-4 sm:px-6">
            <Link
              href={authHref("signin")}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "landing-fade-up landing-delay-1 border-zinc-200/80 bg-white/80 text-zinc-900 shadow-none backdrop-blur-sm hover:bg-white",
              )}
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-6xl flex-col justify-center px-4 pb-20 pt-6 sm:px-6 sm:pb-24">
          <div className="max-w-2xl">
            <p className="landing-brand font-[family-name:var(--font-display)] text-[clamp(3.5rem,12vw,7.5rem)] leading-[0.9] tracking-[-0.04em] text-zinc-900">
              Portal
            </p>
            <h1 className="landing-fade-up landing-delay-1 mt-6 max-w-xl text-2xl font-medium tracking-tight text-zinc-900 sm:text-3xl lg:text-[2.15rem] lg:leading-snug">
              The client workspace your business actually runs on.
            </h1>
            <p className="landing-fade-up landing-delay-2 mt-4 max-w-md text-base leading-relaxed text-zinc-500 sm:text-lg">
              Invite clients, share deliverables, and collect payment in one
              private space per project.
            </p>
            <div className="landing-fade-up landing-delay-3 mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={authHref("signup")}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "gap-2 shadow-none",
                )}
              >
                Start 14-day free trial
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href={authHref("signin")}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-zinc-200/80 bg-white/70 text-zinc-900 shadow-none backdrop-blur-sm hover:bg-white",
                )}
              >
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-t border-zinc-200/80 bg-[var(--landing-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Workflow
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl tracking-tight text-zinc-900 sm:text-4xl">
            From invite to paid without the inbox chaos.
          </h2>
          <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
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
              body="Send invoices and collect through Stripe. Funds go to your connected account."
            />
          </ol>
        </div>
      </section>

      {/* Positioning */}
      <section className="border-t border-zinc-200/80 bg-[var(--landing-wash)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Built for pros and studios
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight text-zinc-900 sm:text-4xl">
              A portal that feels like yours, not another spreadsheet.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-zinc-500 sm:text-lg">
            Portal keeps billing visible, projects organized, and files
            permissioned so clients always know where to look, and you always
            know what is shared.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-zinc-200/80 bg-[var(--landing-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Pricing
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl tracking-tight text-zinc-900 sm:text-4xl">
            Simple pricing that pays for itself on the first invoice.
          </h2>
          <div className="mt-10 max-w-md border-t border-zinc-200/80 pt-8">
            <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-primary">
              Portal Pro
            </p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-5xl tracking-tight text-zinc-900">
                $25
              </span>
              <span className="text-zinc-500">/ month</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-zinc-500">
              14-day free trial, then $25/mo. Plus a ~1% platform fee on client
              invoice payments processed through Portal.
            </p>
            <Link
              href={authHref("signup")}
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-7 inline-flex gap-2 shadow-none",
              )}
            >
              Start free trial
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-zinc-200/80 bg-[var(--landing-wash)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-zinc-900 sm:text-4xl">
              Ready for a cleaner client relationship?
            </h2>
            <p className="mt-4 max-w-md text-base text-zinc-500">
              Create your workspace in minutes. Invite a client when you are
              ready.
            </p>
            <Link
              href={authHref("signup")}
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 inline-flex gap-2 shadow-none",
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

function HeroVisual() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-[-8%] hidden w-[58%] lg:block"
    >
      <svg
        className="landing-hero-orbits h-full w-full"
        viewBox="0 0 640 720"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="portalRing" x1="80" y1="80" x2="560" y2="640">
            <stop stopColor="oklch(0.488 0.243 264.376)" stopOpacity="0.55" />
            <stop
              offset="0.55"
              stopColor="oklch(0.371 0.12 264)"
              stopOpacity="0.22"
            />
            <stop
              offset="1"
              stopColor="oklch(0.708 0.08 264)"
              stopOpacity="0.35"
            />
          </linearGradient>
          <linearGradient id="portalPanel" x1="220" y1="160" x2="520" y2="520">
            <stop stopColor="#FFFFFF" stopOpacity="0.78" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <ellipse
          className="landing-orbit-a"
          cx="340"
          cy="360"
          rx="250"
          ry="250"
          stroke="url(#portalRing)"
          strokeWidth="1.25"
        />
        <ellipse
          className="landing-orbit-b"
          cx="340"
          cy="360"
          rx="180"
          ry="180"
          stroke="oklch(0.488 0.243 264.376)"
          strokeOpacity="0.28"
          strokeWidth="1"
        />
        <rect
          className="landing-panel"
          x="210"
          y="190"
          width="260"
          height="340"
          rx="28"
          fill="url(#portalPanel)"
          stroke="#18181b"
          strokeOpacity="0.12"
        />
        <path
          d="M250 270h180M250 310h120M250 350h150M250 420h90M250 460h140"
          stroke="#18181b"
          strokeOpacity="0.16"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle
          cx="470"
          cy="230"
          r="10"
          fill="oklch(0.488 0.243 264.376)"
          fillOpacity="0.85"
        />
        <circle cx="200" cy="480" r="6" fill="#18181b" fillOpacity="0.35" />
      </svg>
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
    <li className="landing-step border-t border-zinc-200/80 pt-5">
      <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-primary">
        {number}
      </p>
      <h3 className="mt-3 text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{body}</p>
    </li>
  );
}
