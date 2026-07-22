import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Shared max height so Overview / Home grid cards stay balanced. */
export const DASHBOARD_CARD_MAX_H = "max-h-[28rem]";

type DashboardCardProps = {
  children: ReactNode;
  className?: string;
  /** When false, card sizes to content up to max height. Default true for grid peers. */
  fillHeight?: boolean;
};

export function DashboardCard({
  children,
  className,
  fillHeight = true,
}: DashboardCardProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm",
        DASHBOARD_CARD_MAX_H,
        fillHeight && "h-full",
        className,
      )}
    >
      {children}
    </section>
  );
}

type DashboardCardHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardCardHeader({
  children,
  className,
}: DashboardCardHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 shrink-0 border-b border-zinc-200/60 bg-inherit px-4 py-4 sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

type DashboardCardBodyProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardCardBody({
  children,
  className,
}: DashboardCardBodyProps) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}
