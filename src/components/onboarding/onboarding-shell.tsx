"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  advanceOnboardingStep,
  completeOnboarding,
  skipOnboardingStep,
} from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  progressForStep,
  type OnboardingStep,
} from "@/utils/onboarding/steps";

type OnboardingShellProps = {
  step: OnboardingStep;
  title: string;
  description: string;
  children?: React.ReactNode;
  /** Primary CTA label when using default continue (no custom children footer). */
  continueLabel?: string;
  /** Show Skip (advances without completing the step’s job). */
  allowSkip?: boolean;
  skipLabel?: string;
  /** When true, primary button completes onboarding → /dashboard. */
  isFinal?: boolean;
  /** Hide default continue — page supplies its own CTA via children. */
  hideDefaultActions?: boolean;
  className?: string;
};

export function OnboardingShell({
  step,
  title,
  description,
  children,
  continueLabel = "Continue",
  allowSkip = false,
  skipLabel = "Skip",
  isFinal = false,
  hideDefaultActions = false,
  className,
}: OnboardingShellProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const progress = progressForStep(step);

  function go(path: string) {
    router.replace(path);
    router.refresh();
  }

  function handleContinue() {
    startTransition(async () => {
      if (isFinal) {
        const result = await completeOnboarding();
        if (result.path) go(result.path);
        return;
      }
      const result = await advanceOnboardingStep(step);
      if (result.path) go(result.path);
    });
  }

  function handleSkip() {
    startTransition(async () => {
      const result = await skipOnboardingStep(step);
      if (result.path) go(result.path);
    });
  }

  return (
    <div
      className={cn(
        "onboarding-enter relative flex min-h-svh flex-col",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,_#dbeafe_0%,_transparent_45%),radial-gradient(ellipse_at_80%_10%,_#e4e4e7_0%,_transparent_40%),linear-gradient(to_bottom,#fafafa,#f4f4f5)]"
      />

      <header className="relative z-10 mx-auto flex w-full max-w-lg items-center justify-between px-5 pt-8 sm:px-6">
        <p className="text-sm font-semibold tracking-tight text-zinc-900">
          Portal
        </p>
        {progress ? (
          <p className="text-xs font-medium tabular-nums text-zinc-500">
            {progress.current}/{progress.total}
          </p>
        ) : (
          <span className="text-xs text-zinc-400">Ready</span>
        )}
      </header>

      {progress ? (
        <div
          className="relative z-10 mx-auto mt-4 h-1 w-full max-w-lg overflow-hidden rounded-full bg-zinc-200/80 px-0"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] duration-500 ease-out"
            style={{
              width: `${(progress.current / progress.total) * 100}%`,
            }}
          />
        </div>
      ) : null}

      <main className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-12 sm:px-6">
        <div className="onboarding-step-copy">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-zinc-500">
            {description}
          </p>
        </div>

        {children ? <div className="mt-8">{children}</div> : null}

        {!hideDefaultActions ? (
          <div className="mt-10 flex flex-col gap-3">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full text-base shadow-sm"
              disabled={pending}
              onClick={handleContinue}
            >
              {pending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Continuing…
                </>
              ) : (
                continueLabel
              )}
            </Button>
            {allowSkip ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                className="h-11 w-full text-zinc-600"
                disabled={pending}
                onClick={handleSkip}
              >
                {skipLabel}
              </Button>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

type OnboardingActionsProps = {
  step: OnboardingStep;
  continueLabel?: string;
  allowSkip?: boolean;
  skipLabel?: string;
  pendingExtra?: boolean;
  onContinue?: () => void | Promise<void>;
  error?: string | null;
};

/** Footer actions for steps with custom forms (branding, project, invite). */
export function OnboardingActions({
  step,
  continueLabel = "Continue",
  allowSkip = true,
  skipLabel = "Skip",
  pendingExtra = false,
  onContinue,
  error,
}: OnboardingActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const busy = pending || pendingExtra;

  function go(path: string) {
    router.replace(path);
    router.refresh();
  }

  function handleSkip() {
    startTransition(async () => {
      const result = await skipOnboardingStep(step);
      if (result.path) go(result.path);
    });
  }

  function handleContinue() {
    if (onContinue) {
      startTransition(async () => {
        await onContinue();
      });
      return;
    }
    startTransition(async () => {
      const result = await advanceOnboardingStep(step);
      if (result.path) go(result.path);
    });
  }

  return (
    <div className="mt-8 space-y-3">
      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      <Button
        type={onContinue ? "button" : "submit"}
        size="lg"
        className="h-12 w-full text-base shadow-sm"
        disabled={busy}
        onClick={onContinue ? handleContinue : undefined}
      >
        {busy ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          continueLabel
        )}
      </Button>
      {allowSkip ? (
        <Button
          type="button"
          variant="ghost"
          size="lg"
          className="h-11 w-full text-zinc-600"
          disabled={busy}
          onClick={handleSkip}
        >
          {skipLabel}
        </Button>
      ) : null}
    </div>
  );
}
