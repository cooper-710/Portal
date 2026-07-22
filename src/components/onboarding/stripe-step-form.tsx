"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  advanceOnboardingStep,
  skipOnboardingStep,
} from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";

export function StripeStepForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"idle" | "connect" | "skip">("idle");

  function go(path: string) {
    router.replace(path);
    router.refresh();
  }

  function startConnect() {
    setError(null);
    setMode("connect");
    startTransition(async () => {
      try {
        const response = await fetch("/api/stripe/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ next: "/onboarding/stripe?connect=return" }),
        });
        const data = (await response.json()) as { url?: string; error?: string };
        if (!response.ok || !data.url) {
          setError(data.error ?? "Unable to start Stripe Connect.");
          setMode("idle");
          return;
        }
        window.location.assign(data.url);
      } catch {
        setError("Unable to start Stripe Connect.");
        setMode("idle");
      }
    });
  }

  function handleContinueAfterConnect() {
    setError(null);
    startTransition(async () => {
      const result = await advanceOnboardingStep("stripe");
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.path) go(result.path);
    });
  }

  function handleSkip() {
    setError(null);
    setMode("skip");
    startTransition(async () => {
      const result = await skipOnboardingStep("stripe");
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
        onClick={startConnect}
      >
        {pending && mode === "connect" ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Opening Stripe…
          </>
        ) : (
          "Connect with Stripe"
        )}
      </Button>

      <Button
        type="button"
        variant="outline"
        size="lg"
        className="h-11 w-full border-zinc-200 bg-white/80"
        disabled={pending}
        onClick={handleContinueAfterConnect}
      >
        I’ve connected Stripe
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
