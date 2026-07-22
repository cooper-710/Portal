"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { AuthModal, authHref } from "@/components/auth/auth-modal";
import {
  MARKETING_NAV,
  MarketingShell,
} from "@/components/landing/marketing-shell";
import { PortalBrand } from "@/components/portal-brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function LandingPage() {
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    function onScroll() {
      const y = window.scrollY;
      if (!reduceMotion) {
        setParallaxY(Math.min(y * 0.12, 48));
      }
    }

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <Suspense fallback={null}>
        <AuthModal />
      </Suspense>

      <MarketingShell transparentUntilScroll>
        {/* Hero: one composition, brand-first. Pulls under sticky header so atmosphere shows through. */}
        <section
          id="top"
          className="relative isolate -mt-14 min-h-svh pt-14"
        >
          {/* Clip decorative bleed only — overflow-x-clip on the section would also clip heading descenders */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-x-clip"
          >
            <div className="landing-hero-atmosphere absolute inset-0" />
            <div className="landing-hero-grid absolute inset-0" />
            <HeroVisual offsetY={parallaxY} />
          </div>

          <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-6xl flex-col justify-center px-4 pb-24 pt-10 sm:px-6 sm:pb-28 sm:pt-12">
            <div className="max-w-2xl">
              <PortalBrand
                size="hero"
                className="landing-brand gap-3 sm:gap-5"
                nameClassName="landing-display text-[clamp(3.5rem,12vw,7.5rem)] tracking-[-0.04em] text-zinc-900"
              />
              <h1 className="landing-fade-up landing-delay-1 mt-7 max-w-xl text-2xl font-medium tracking-tight text-zinc-900 sm:text-3xl lg:text-[2.15rem] lg:leading-snug">
                The client workspace your business actually runs on.
              </h1>
              <p className="landing-fade-up landing-delay-2 mt-4 max-w-md text-base leading-relaxed text-zinc-500 sm:text-lg">
                Invite clients, share deliverables, and collect payment in one
                private space per project.
              </p>
              <div className="landing-fade-up landing-delay-3 mt-10 flex flex-wrap items-center gap-3">
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

        {/* How it works teaser */}
        <section className="border-t border-zinc-200/80 bg-[var(--landing-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              How it works
            </p>
            <h2 className="landing-display mt-3 max-w-xl text-3xl tracking-tight text-zinc-900 sm:text-4xl">
              From invite to paid in three quiet steps.
            </h2>
            <ol className="mt-14 grid gap-12 sm:grid-cols-3 sm:gap-10">
              <Step
                number="01"
                title="Open a project"
                body="Create a workspace, set the phase, and invite your client by email."
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
            <Link
              href="/how-it-works"
              className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-zinc-900"
            >
              See the full path
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* Features teaser */}
        <section className="border-t border-zinc-200/80 bg-[var(--landing-wash)]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Features
            </p>
            <h2 className="landing-display mt-3 max-w-2xl text-3xl tracking-tight text-zinc-900 sm:text-4xl">
              Everything the client needs, in one place they will actually use.
            </h2>

            <ul className="mt-14 grid gap-12 sm:grid-cols-3 sm:gap-10">
              <Feature
                title="Private project rooms"
                body="Each engagement gets its own space for status, files, and messages that stay out of the inbox."
              />
              <Feature
                title="Permissioned files"
                body="Upload freely. Share only the versions your client should see and download."
              />
              <Feature
                title="Stripe invoices"
                body="Send payment requests from the same workspace. Money lands in your connected account."
              />
            </ul>
            <Link
              href="/features"
              className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-zinc-900"
            >
              Explore all features
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* Pricing teaser */}
        <section className="border-t border-zinc-200/80 bg-[var(--landing-surface)]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Pricing
            </p>
            <h2 className="landing-display mt-3 max-w-xl text-3xl tracking-tight text-zinc-900 sm:text-4xl">
              Simple pricing that pays for itself on the first invoice.
            </h2>
            <div className="landing-pricing-panel mt-12 max-w-md border-t border-zinc-200/80 pt-8">
              <p className="landing-display text-sm tracking-wide text-primary">
                Portal Pro
              </p>
              <p className="mt-4 flex items-baseline gap-2">
                <span className="landing-display text-5xl tracking-tight text-zinc-900">
                  $25
                </span>
                <span className="text-zinc-500">/ month</span>
              </p>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                14-day free trial, then $25/mo. Plus a ~1% platform fee on client
                invoice payments processed through Portal.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={authHref("signup")}
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
                  className="inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-900"
                >
                  Full pricing details
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-zinc-200/80 bg-[var(--landing-wash)]">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-24">
            <div className="max-w-xl">
              <h2 className="landing-display text-3xl tracking-tight text-zinc-900 sm:text-4xl">
                Ready for a cleaner client relationship?
              </h2>
              <p className="mt-4 max-w-md text-base text-zinc-500">
                Create your workspace in minutes. Invite a client when you are
                ready.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href={authHref("signup")}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "inline-flex gap-2 shadow-none",
                  )}
                >
                  Start 14-day free trial
                  <ArrowRight className="size-4" />
                </Link>
                <nav
                  aria-label="Explore"
                  className="flex flex-wrap gap-4 text-sm text-zinc-500"
                >
                  {MARKETING_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="hover:text-zinc-900"
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        </section>
      </MarketingShell>
    </>
  );
}

function HeroVisual({ offsetY }: { offsetY: number }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-y-0 right-[-6%] hidden w-[56%] lg:block"
      style={{ transform: `translate3d(0, ${offsetY}px, 0)` }}
    >
      <svg
        className="landing-hero-orbits h-full w-full"
        viewBox="0 0 640 720"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="portalRing" x1="80" y1="80" x2="560" y2="640">
            <stop stopColor="oklch(0.488 0.243 264.376)" stopOpacity="0.42" />
            <stop
              offset="0.55"
              stopColor="oklch(0.371 0.08 264)"
              stopOpacity="0.14"
            />
            <stop
              offset="1"
              stopColor="oklch(0.55 0.06 264)"
              stopOpacity="0.28"
            />
          </linearGradient>
          <linearGradient id="portalGlass" x1="200" y1="150" x2="520" y2="540">
            <stop stopColor="#FFFFFF" stopOpacity="0.88" />
            <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.42" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.18" />
          </linearGradient>
          <filter
            id="portalSoft"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feGaussianBlur stdDeviation="18" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.12 0"
            />
          </filter>
        </defs>

        <ellipse
          cx="360"
          cy="380"
          rx="200"
          ry="160"
          fill="oklch(0.488 0.243 264.376)"
          fillOpacity="0.08"
          filter="url(#portalSoft)"
        />

        <ellipse
          className="landing-orbit-a"
          cx="340"
          cy="360"
          rx="250"
          ry="250"
          stroke="url(#portalRing)"
          strokeWidth="1.1"
        />
        <ellipse
          className="landing-orbit-b"
          cx="340"
          cy="360"
          rx="176"
          ry="176"
          stroke="oklch(0.488 0.243 264.376)"
          strokeOpacity="0.2"
          strokeWidth="1"
          strokeDasharray="4 10"
        />

        {/* Product silhouette: soft glass frame, not a fake dashboard */}
        <rect
          className="landing-panel"
          x="198"
          y="178"
          width="284"
          height="364"
          rx="22"
          fill="url(#portalGlass)"
          stroke="#18181b"
          strokeOpacity="0.1"
        />
        <rect
          className="landing-panel"
          x="222"
          y="214"
          width="236"
          height="28"
          rx="8"
          fill="#18181b"
          fillOpacity="0.05"
        />
        <rect
          className="landing-panel"
          x="222"
          y="268"
          width="236"
          height="120"
          rx="12"
          fill="#18181b"
          fillOpacity="0.035"
          stroke="#18181b"
          strokeOpacity="0.06"
        />
        <path
          d="M246 300h120M246 328h88"
          stroke="#18181b"
          strokeOpacity="0.14"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <rect
          className="landing-panel"
          x="222"
          y="414"
          width="108"
          height="72"
          rx="12"
          fill="#18181b"
          fillOpacity="0.04"
          stroke="#18181b"
          strokeOpacity="0.07"
        />
        <rect
          className="landing-panel"
          x="350"
          y="414"
          width="108"
          height="72"
          rx="12"
          fill="#18181b"
          fillOpacity="0.04"
          stroke="#18181b"
          strokeOpacity="0.07"
        />
        <circle
          cx="456"
          cy="228"
          r="7"
          fill="oklch(0.488 0.243 264.376)"
          fillOpacity="0.75"
        />
        <circle cx="188" cy="492" r="5" fill="#18181b" fillOpacity="0.28" />
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
    <li className="landing-step border-t border-zinc-200/80 pt-6">
      <p className="landing-display text-sm tracking-wide text-primary">
        {number}
      </p>
      <h3 className="mt-3 text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-500">{body}</p>
    </li>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <li className="landing-step border-t border-zinc-200/80 pt-6">
      <h3 className="text-base font-semibold text-zinc-900">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-zinc-500">{body}</p>
    </li>
  );
}
