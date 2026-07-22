"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import { completePortalSetup, updateBusinessBranding } from "@/app/actions";
import {
  advanceOnboardingStep,
  skipOnboardingStep,
} from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_BRAND_ACCENT,
  DEFAULT_BRAND_PRIMARY,
} from "@/lib/branding";
import type { Profile } from "@/types/database";

type BrandingStepFormProps = {
  profile: Profile;
};

export function BrandingStepForm({ profile }: BrandingStepFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [businessName, setBusinessName] = useState(
    profile.business_name ?? "",
  );
  const [brandPrimary, setBrandPrimary] = useState(
    profile.brand_primary ?? DEFAULT_BRAND_PRIMARY,
  );
  const [brandAccent, setBrandAccent] = useState(
    profile.brand_accent ?? DEFAULT_BRAND_ACCENT,
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    profile.welcome_message ?? "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [skipping, setSkipping] = useState(false);

  function go(path: string) {
    router.replace(path);
    router.refresh();
  }

  function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSkipping(false);

    const formData = new FormData();
    formData.set("businessName", businessName.trim());
    formData.set("brandPrimary", brandPrimary.trim());
    formData.set("brandAccent", brandAccent.trim());
    formData.set("welcomeMessage", welcomeMessage.trim());
    formData.set("appearance", profile.appearance ?? "light");
    const file = fileRef.current?.files?.[0];
    if (file) formData.set("logo", file);

    startTransition(async () => {
      const result = await updateBusinessBranding(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      const advanced = await advanceOnboardingStep("branding");
      if (advanced.error) {
        setError(advanced.error);
        return;
      }
      if (advanced.path) go(advanced.path);
    });
  }

  function handleSkip() {
    setError(null);
    setSkipping(true);
    startTransition(async () => {
      const setup = await completePortalSetup();
      if (setup?.error) {
        setError(setup.error);
        setSkipping(false);
        return;
      }
      const result = await skipOnboardingStep("branding");
      if (result.error) {
        setError(result.error);
        setSkipping(false);
        return;
      }
      if (result.path) go(result.path);
    });
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="setupBusinessName">Business name</Label>
        <Input
          id="setupBusinessName"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="River Studio"
          maxLength={80}
          autoFocus
        />
        <p className="text-xs text-zinc-500">Shown on your clients’ portal home.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="setupPrimary">Primary color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brandPrimary}
              onChange={(event) => setBrandPrimary(event.target.value)}
              className="size-9 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
              aria-label="Primary color picker"
            />
            <Input
              id="setupPrimary"
              value={brandPrimary}
              onChange={(event) => setBrandPrimary(event.target.value)}
              placeholder="#2563eb"
              maxLength={7}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="setupAccent">Accent color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brandAccent}
              onChange={(event) => setBrandAccent(event.target.value)}
              className="size-9 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
              aria-label="Accent color picker"
            />
            <Input
              id="setupAccent"
              value={brandAccent}
              onChange={(event) => setBrandAccent(event.target.value)}
              placeholder="#0ea5e9"
              maxLength={7}
              className="font-mono text-sm"
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="setupWelcome">
          Welcome message{" "}
          <span className="font-normal text-zinc-400">(optional)</span>
        </Label>
        <textarea
          id="setupWelcome"
          value={welcomeMessage}
          onChange={(event) => setWelcomeMessage(event.target.value)}
          rows={3}
          maxLength={280}
          placeholder="Welcome to your project portal. Status, files, and payments live here."
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="setupLogo">
          Logo <span className="font-normal text-zinc-400">(optional)</span>
        </Label>
        <Input
          ref={fileRef}
          id="setupLogo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          className="cursor-pointer bg-white file:mr-3"
        />
        <p className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Upload className="size-3.5" aria-hidden />
          PNG, JPG, WebP, or SVG · max 2 MB
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 pt-1">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-base shadow-sm"
          disabled={pending}
        >
          {pending && !skipping ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save & continue"
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
          {skipping ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Skipping…
            </>
          ) : (
            "Skip for now"
          )}
        </Button>
      </div>
    </form>
  );
}
