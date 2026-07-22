"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/actions";
import { PortalBrand } from "@/components/portal-brand";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

type NavItem = {
  href: string;
  label: string;
  match: "exact" | "prefix";
};

const FREELANCER_LINKS: NavItem[] = [
  { href: "/dashboard", label: "Overview", match: "exact" },
  { href: "/dashboard/projects", label: "Projects", match: "prefix" },
  { href: "/dashboard/invoices", label: "Invoices", match: "prefix" },
  { href: "/dashboard/billing", label: "Billing", match: "prefix" },
  { href: "/dashboard/settings", label: "Settings", match: "prefix" },
];

const CLIENT_LINKS: NavItem[] = [
  { href: "/dashboard", label: "Overview", match: "exact" },
  { href: "/dashboard/projects", label: "Projects", match: "prefix" },
  { href: "/dashboard/invoices", label: "Invoices", match: "prefix" },
  { href: "/dashboard/settings", label: "Settings", match: "prefix" },
];

function isActive(pathname: string, item: NavItem) {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type DashboardNavProps = {
  role: UserRole;
  /** False when freelancer lacks trial/paid, nav stays open; product is locked. */
  canCreate?: boolean;
  displayLabel?: string;
  /** Workspace brand name (owner business name for both roles). */
  brandLabel?: string;
  brandLogoUrl?: string | null;
};

export function DashboardNav({
  role,
  canCreate = true,
  displayLabel,
  brandLabel = "Portal",
  brandLogoUrl = null,
}: DashboardNavProps) {
  const pathname = usePathname();
  const links = role === "freelancer" ? FREELANCER_LINKS : CLIENT_LINKS;
  const showUpgrade = role === "freelancer" && !canCreate;
  const homeLabel = role === "client" ? "Home" : "Overview";
  // Falls back to zinc-900 when --brand-primary is unset (unbranded owner chrome).
  const brandText = "text-[color:var(--brand-primary,#18181b)]";
  const brandActive =
    "bg-[color:var(--brand-primary,#18181b)] text-white shadow-sm";

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 sm:h-14 sm:flex-nowrap sm:px-6 sm:py-0">
        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-zinc-900 transition-colors hover:text-zinc-600"
        >
          {brandLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brandLogoUrl}
              alt=""
              className="h-7 w-auto max-w-[7rem] object-contain"
            />
          ) : brandLabel === "Portal" ? (
            <PortalBrand
              size="sm"
              nameClassName={brandText}
            />
          ) : (
            <span className={brandText}>{brandLabel}</span>
          )}
          {brandLogoUrl ? <span className={brandText}>{brandLabel}</span> : null}
        </Link>

        <nav
          aria-label="Primary"
          className="order-3 flex w-full flex-wrap items-center gap-1 sm:order-none sm:w-auto sm:flex-1 sm:justify-center"
        >
          {links.map((item) => {
            const active = isActive(pathname, item);
            const label =
              item.href === "/dashboard" && item.match === "exact"
                ? homeLabel
                : item.label;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? brandActive
                    : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {showUpgrade ? (
          <Link
            href="/dashboard/billing"
            className="hidden rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800 transition-colors hover:border-blue-300 hover:bg-blue-100 sm:inline-flex"
          >
            Start trial
          </Link>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {displayLabel ? (
            <span
              className="hidden max-w-[10rem] truncate text-xs font-medium text-zinc-500 sm:inline"
              title={displayLabel}
            >
              {displayLabel}
            </span>
          ) : null}
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-zinc-600 hover:text-zinc-900"
            >
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
