"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StripeConnectBannerProps = {
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  hasAccount: boolean;
  connectStatus?: string | null;
};

export function StripeConnectBanner({
  chargesEnabled,
  detailsSubmitted,
  hasAccount,
  connectStatus,
}: StripeConnectBannerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startConnect() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/connect", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(
          data.error ?? "Unable to start Stripe Connect. Try again in a moment.",
        );
        setLoading(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError("Unable to start Stripe Connect. Check your connection and try again.");
      setLoading(false);
    }
  }

  if (chargesEnabled) {
    return (
      <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" />
          <div>
            <p className="text-sm font-semibold text-emerald-950">
              Stripe payments ready
            </p>
            <p className="text-xs text-emerald-800/80">
              You accept client payments on your connected Stripe account as
              the merchant of record. Portal receives its disclosed platform fee.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between",
        "border-amber-200/80 bg-amber-50/80",
      )}
    >
      <div className="flex items-start gap-2.5">
        <Wallet className="mt-0.5 size-4 shrink-0 text-amber-700" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-amber-950">
            {hasAccount || detailsSubmitted
              ? "Finish connecting Stripe"
              : "Connect Stripe to get paid"}
          </p>
          <p className="text-xs text-amber-900/80">
            Clients can only pay after Stripe activates card payments on your
            connected account. Existing Express accounts can continue setup here.
          </p>
          {connectStatus === "pending" ? (
            <p className="text-xs font-medium text-amber-900">
              Onboarding saved. Complete any remaining Stripe requirements if
              card payments are still inactive.
            </p>
          ) : null}
          {connectStatus === "error" ? (
            <p className="text-xs font-medium text-red-700">
              Something went wrong syncing Stripe. Try connecting again.
            </p>
          ) : null}
          {error ? (
            <p className="text-xs font-medium text-red-700">{error}</p>
          ) : null}
        </div>
      </div>
      <Button
        className="shrink-0 bg-amber-700 text-white hover:bg-amber-800"
        disabled={loading}
        onClick={() => void startConnect()}
      >
        {loading ? <Loader2 className="size-4 animate-spin" /> : null}
        {hasAccount ? "Continue setup" : "Connect Stripe"}
      </Button>
    </div>
  );
}
