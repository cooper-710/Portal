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
    <div className="landing-root min-h-svh text-[var(--landing-ink)]">
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
                "landing-fade-up landing-delay-1 border-[var(--landing-line)] bg-white/70 text-[var(--landing-ink)] shadow-none backdrop-blur-sm hover:bg-white",
              )}
            >
              Sign in
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto flex min-h-[calc(100svh-3.5rem)] w-full max-w-6xl flex-col justify-center px-4 pb-20 pt-6 sm:px-6 sm:pb-24">
          <div className="max-w-2xl">
            <p className="landing-brand font-[family-name:var(--font-display)] text-[clamp(3.5rem,12vw,7.5rem)] leading-[0.9] tracking-[-0.04em] text-[var(--landing-ink)]">
              Portal
            </p>
            <h1 className="landing-fade-up landing-delay-1 mt-6 max-w-xl text-2xl font-medium tracking-tight text-[var(--landing-ink)] sm:text-3xl lg:text-[2.15rem] lg:leading-snug">
              The client workspace your business actually runs on.
            </h1>
            <p className="landing-fade-up landing-delay-2 mt-4 max-w-md text-base leading-relaxed text-[var(--landing-muted)] sm:text-lg">
              Invite clients, share deliverables, and collect payment in one
              private space per project.
            </p>
            <div className="landing-fade-up landing-delay-3 mt-9 flex flex-wrap items-center gap-3">
              <Link
                href={authHref("signup")}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "gap-2 border-transparent bg-[var(--landing-accent)] text-white shadow-none hover:bg-[var(--landing-accent-hover)]",
                )}
              >
                Start 14-day free trial
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href={authHref("signin")}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-[var(--landing-line)] bg-white/60 text-[var(--landing-ink)] shadow-none backdrop-blur-sm hover:bg-white",
                )}
              >
                I already have an account
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="border-t border-[var(--landing-line)] bg-[var(--landing-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--landing-accent)]">
            Workflow
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--landing-ink)] sm:text-4xl">
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
      <section className="border-t border-[var(--landing-line)] bg-[var(--landing-wash)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--landing-accent)]">
              Built for pros and studios
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--landing-ink)] sm:text-4xl">
              A portal that feels like yours, not another spreadsheet.
            </h2>
          </div>
          <p className="text-base leading-relaxed text-[var(--landing-muted)] sm:text-lg">
            Portal keeps billing visible, projects organized, and files
            permissioned so clients always know where to look, and you always
            know what is shared.
          </p>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-t border-[var(--landing-line)] bg-[var(--landing-surface)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--landing-accent)]">
            Pricing
          </p>
          <h2 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--landing-ink)] sm:text-4xl">
            Simple pricing that pays for itself on the first invoice.
          </h2>
          <div className="mt-10 max-w-md border-t border-[var(--landing-line)] pt-8">
            <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-[var(--landing-accent)]">
              Portal Pro
            </p>
            <p className="mt-3 flex items-baseline gap-2">
              <span className="font-[family-name:var(--font-display)] text-5xl tracking-tight text-[var(--landing-ink)]">
                $25
              </span>
              <span className="text-[var(--landing-muted)]">/ month</span>
            </p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--landing-muted)]">
              14-day free trial, then $25/mo. Plus a ~1% platform fee on client
              invoice payments processed through Portal.
            </p>
            <Link
              href={authHref("signup")}
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-7 inline-flex gap-2 border-transparent bg-[var(--landing-accent)] text-white shadow-none hover:bg-[var(--landing-accent-hover)]",
              )}
            >
              Start free trial
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t border-[var(--landing-line)] bg-[var(--landing-wash)]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <div className="max-w-xl">
            <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-[var(--landing-ink)] sm:text-4xl">
              Ready for a cleaner client relationship?
            </h2>
            <p className="mt-4 max-w-md text-base text-[var(--landing-muted)]">
              Create your workspace in minutes. Invite a client when you are
              ready.
            </p>
            <Link
              href={authHref("signup")}
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 inline-flex gap-2 border-transparent bg-[var(--landing-accent)] text-white shadow-none hover:bg-[var(--landing-accent-hover)]",
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
            <stop stopColor="#0F766E" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="#134E4A" stopOpacity="0.2" />
            <stop offset="1" stopColor="#F59E0B" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="portalPanel" x1="220" y1="160" x2="520" y2="520">
            <stop stopColor="#FFFFFF" stopOpacity="0.72" />
            <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.18" />
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
          stroke="#0F766E"
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
          stroke="#134E4A"
          strokeOpacity="0.18"
        />
        <path
          d="M250 270h180M250 310h120M250 350h150M250 420h90M250 460h140"
          stroke="#134E4A"
          strokeOpacity="0.22"
          strokeWidth="6"
          strokeLinecap="round"
        />
        <circle cx="470" cy="230" r="10" fill="#F59E0B" fillOpacity="0.85" />
        <circle cx="200" cy="480" r="6" fill="#0F766E" fillOpacity="0.7" />
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
    <li className="landing-step border-t border-[var(--landing-line)] pt-5">
      <p className="font-[family-name:var(--font-display)] text-sm tracking-wide text-[var(--landing-accent)]">
        {number}
      </p>
      <h3 className="mt-3 text-base font-semibold text-[var(--landing-ink)]">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-[var(--landing-muted)]">
        {body}
      </p>
    </li>
  );
}
