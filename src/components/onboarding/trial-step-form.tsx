"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  advanceOnboardingStep,
  skipOnboardingStep,
} from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { friendlyBillingError } from "@/utils/billing-errors";

export function TrialStepForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "checkout" | "confirm" | "skip">(
    "idle",
  );

  function go(path: string) {
    router.replace(path);
    router.refresh();
  }

  function startCheckout() {
    setError(null);
    setMode("checkout");
    startTransition(async () => {
      try {
        const response = await fetch("/api/saas-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            successPath: "/onboarding",
            cancelPath: "/onboarding/trial?checkout=canceled",
          }),
        });
        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) {
          setError(
            friendlyBillingError(data.error, "Unable to start checkout."),
          );
          setMode("idle");
          return;
        }
        window.location.assign(data.url);
      } catch {
        setError(friendlyBillingError(null, "Unable to start checkout."));
        setMode("idle");
      }
    });
  }

  function confirmStarted() {
    setError(null);
    setMode("confirm");
    startTransition(async () => {
      // Refresh subscription from Stripe in case webhook is slow.
      try {
        await fetch("/api/saas-sync", { method: "POST" });
      } catch {
        // Non-blocking — advance anyway if they say they've started.
      }
      const result = await advanceOnboardingStep("trial");
      if (result.error) {
        setError(result.error);
        setMode("idle");
        return;
      }
      if (result.path) go(result.path);
    });
  }

  function handleSkip() {
    setError(null);
    setMode("skip");
    startTransition(async () => {
      const result = await skipOnboardingStep("trial");
      if (result.error) {
        setError(result.error);
        setMode("idle");
        return;
      }
      if (result.path) go(result.path);
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      <Button
        type="button"
        size="lg"
        className="h-12 w-full text-base shadow-sm"
        disabled={pending}
        onClick={startCheckout}
      >
        {pending && mode === "checkout" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Opening checkout…
          </>
        ) : (
          "Start free trial"
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full border-zinc-200 bg-white/80"
        disabled={pending}
        onClick={confirmStarted}
      >
        {pending && mode === "confirm" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Checking…
          </>
        ) : (
          "I’ve started my trial"
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="lg"
        className="h-11 w-full text-zinc-600"
        disabled={pending}
        onClick={handleSkip}
      >
        Skip for now
      </Button>
    </div>
  );
}
