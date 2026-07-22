import Link from "next/link";

import { PortalBrand } from "@/components/portal-brand";

type SiteFooterProps = {
  /** Compact footer for login / legal pages */
  compact?: boolean;
  /**
   * marketing: full nav + Sign in
   * app: Portal / Privacy / Terms / Pricing (logged-in chrome)
   */
  variant?: "marketing" | "app";
};

export function SiteFooter({
  compact = false,
  variant = "marketing",
}: SiteFooterProps) {
  if (compact) {
    return (
      <footer className="mt-auto border-t border-transparent px-4 py-6">
        <p className="text-center text-xs text-zinc-400">
          <Link href="/" className="hover:text-zinc-600">
            <PortalBrand
              size="sm"
              nameClassName="font-medium"
            />
          </Link>
          {" · "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-zinc-600"
          >
            Privacy
          </Link>
          {" · "}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-zinc-600"
          >
            Terms
          </Link>
          {" · "}
          <Link
            href="/pricing"
            className="underline underline-offset-2 hover:text-zinc-600"
          >
            Pricing
          </Link>
        </p>
      </footer>
    );
  }

  const links =
    variant === "app"
      ? [
          { href: "/pricing", label: "Pricing" },
          { href: "/privacy", label: "Privacy" },
          { href: "/terms", label: "Terms" },
        ]
      : [
          { href: "/how-it-works", label: "How it works" },
          { href: "/features", label: "Features" },
          { href: "/pricing", label: "Pricing" },
          { href: "/privacy", label: "Privacy" },
          { href: "/terms", label: "Terms" },
          { href: "/?auth=signin", label: "Sign in" },
        ];

  return (
    <footer className="mt-auto border-t border-zinc-200/80 bg-zinc-50/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-zinc-500 sm:px-6">
        <Link
          href="/"
          className="text-zinc-800 transition-opacity hover:opacity-80"
        >
          <PortalBrand
            size="sm"
            nameClassName="font-heading font-bold tracking-tight"
          />
        </Link>
        <nav className="flex flex-wrap items-center gap-4">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-zinc-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
