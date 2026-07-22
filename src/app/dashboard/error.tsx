"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-red-200/80 bg-red-50/50 px-5 py-8 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-900">
        Something went wrong
      </h1>
      <p className="text-sm text-zinc-600">
        This page failed to load. Try again, or return to your overview.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        <Button type="button" size="sm" onClick={reset}>
          Try again
        </Button>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        >
          Overview
        </Link>
      </div>
    </div>
  );
}
