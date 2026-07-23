"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { authHref } from "@/components/auth/auth-modal";
import { FinaliaBrand } from "@/components/finalia-brand";
import { SiteFooter } from "@/components/site-footer";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const MARKETING_NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
] as const;

type MarketingShellProps = {
  children: ReactNode;
  /** When true, header starts transparent over a hero (landing only). */
  transparentUntilScroll?: boolean;
};

export function MarketingShell({
  children,
  transparentUntilScroll = false,
}: MarketingShellProps) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 12);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = !transparentUntilScroll || scrolled;

  return (
    <div className="landing-root flex min-h-svh flex-col text-foreground">
      <header
        className={cn(
          "landing-header sticky top-0 z-40 transition-[background,border-color,box-shadow] duration-300",
          solid
            ? "border-b border-zinc-200/70 bg-white/75 shadow-[0_1px_0_0_rgba(24,24,27,0.04)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link
            href="/"
            className="text-zinc-900 transition-opacity hover:opacity-80"
          >
            <FinaliaBrand
              size="sm"
              nameClassName="font-heading text-lg font-bold leading-tight tracking-tight"
            />
          </Link>

          <nav
            aria-label="Marketing"
            className="hidden flex-1 items-center justify-center gap-7 md:flex"
          >
            {MARKETING_NAV.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "text-sm transition-colors",
                    active
                      ? "font-medium text-zinc-900"
                      : "text-zinc-500 hover:text-zinc-900",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-3 md:ml-0">
            <Link
              href={authHref("signin")}
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-900"
            >
              Sign in
            </Link>
            <Link
              href={authHref("signup")}
              className={cn(buttonVariants({ size: "sm" }), "shadow-none")}
            >
              Start free trial
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <SiteFooter />
    </div>
  );
}

type MarketingPageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function MarketingPageHero({
  eyebrow,
  title,
  description,
}: MarketingPageHeroProps) {
  return (
    <section className="relative isolate border-b border-zinc-200/80">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-x-clip"
      >
        <div className="landing-hero-atmosphere absolute inset-0 opacity-70" />
        <div className="landing-hero-grid absolute inset-0 opacity-50" />
      </div>
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pb-16 sm:pt-20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="landing-display mt-4 max-w-3xl text-4xl tracking-tight text-zinc-900 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-500 sm:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}

type MarketingSectionProps = {
  children: ReactNode;
  className?: string;
  surface?: "wash" | "surface";
};

export function MarketingSection({
  children,
  className,
  surface = "surface",
}: MarketingSectionProps) {
  return (
    <section
      className={cn(
        "border-b border-zinc-200/80",
        surface === "wash"
          ? "bg-[var(--landing-wash)]"
          : "bg-[var(--landing-surface)]",
        className,
      )}
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">{children}</div>
    </section>
  );
}
