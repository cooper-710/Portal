"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import { updateBusinessBranding } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { logoPublicUrl } from "@/lib/branding";
import type { BrandAppearance, Profile } from "@/types/database";

type BrandingFormProps = {
  profile: Profile;
};

export function BrandingForm({ profile }: BrandingFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [businessName, setBusinessName] = useState(
    profile.business_name ?? "",
  );
  const [brandPrimary, setBrandPrimary] = useState(
    profile.brand_primary ?? "#2563eb",
  );
  const [brandAccent, setBrandAccent] = useState(
    profile.brand_accent ?? "#0ea5e9",
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    profile.welcome_message ?? "",
  );
  const [appearance, setAppearance] = useState<BrandAppearance>(
    profile.appearance ?? "light",
  );
  const [removeLogo, setRemoveLogo] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const logoUrl = removeLogo ? null : logoPublicUrl(profile.logo_url);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    const formData = new FormData();
    formData.set("businessName", businessName.trim());
    formData.set("brandPrimary", brandPrimary.trim());
    formData.set("brandAccent", brandAccent.trim());
    formData.set("welcomeMessage", welcomeMessage.trim());
    formData.set("appearance", appearance);
    if (removeLogo) formData.set("removeLogo", "1");
    const file = fileRef.current?.files?.[0];
    if (file) formData.set("logo", file);

    startTransition(async () => {
      const result = await updateBusinessBranding(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setRemoveLogo(false);
      if (fileRef.current) fileRef.current.value = "";
      setMessage("Client portal branding saved.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="businessName">Business name</Label>
        <Input
          id="businessName"
          value={businessName}
          onChange={(event) => setBusinessName(event.target.value)}
          placeholder="River Studio"
          maxLength={80}
        />
        <p className="text-xs text-zinc-500">
          Shown on client portals and invite emails. Falls back to your display
          name.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="logo">Logo</Label>
        <div className="flex flex-wrap items-center gap-3">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Business logo"
              className="size-12 rounded-lg border border-zinc-200 object-contain bg-white p-1"
            />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-zinc-400">
              <Upload className="size-4" />
            </div>
          )}
          <Input
            ref={fileRef}
            id="logo"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="max-w-xs cursor-pointer bg-white file:mr-3"
          />
        </div>
        {profile.logo_url && !removeLogo ? (
          <button
            type="button"
            className="text-xs font-medium text-red-700 hover:underline"
            onClick={() => setRemoveLogo(true)}
          >
            Remove logo
          </button>
        ) : null}
        <p className="text-xs text-zinc-500">PNG, JPG, WebP, or SVG · max 2 MB</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="brandPrimary">Primary color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brandPrimary}
              onChange={(event) => setBrandPrimary(event.target.value)}
              className="size-9 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
              aria-label="Primary color picker"
            />
            <Input
              id="brandPrimary"
              value={brandPrimary}
              onChange={(event) => setBrandPrimary(event.target.value)}
              placeholder="#2563eb"
              maxLength={7}
              className="font-mono text-sm"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="brandAccent">Accent color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={brandAccent}
              onChange={(event) => setBrandAccent(event.target.value)}
              className="size-9 cursor-pointer rounded border border-zinc-200 bg-white p-0.5"
              aria-label="Accent color picker"
            />
            <Input
              id="brandAccent"
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
        <Label htmlFor="welcomeMessage">Welcome message</Label>
        <textarea
          id="welcomeMessage"
          value={welcomeMessage}
          onChange={(event) => setWelcomeMessage(event.target.value)}
          rows={3}
          maxLength={280}
          placeholder="Welcome to your project portal. Status, files, and payments live here."
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
        />
        <p className="text-xs text-zinc-500">
          Shown at the top of every client home. {welcomeMessage.length}/280
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="appearance">Appearance</Label>
        <Select
          id="appearance"
          value={appearance}
          onChange={(next) => setAppearance(next as BrandAppearance)}
          className="max-w-xs"
          options={[
            { value: "light", label: "Light" },
            { value: "default", label: "Default" },
          ]}
        />
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save branding"
        )}
      </Button>
    </form>
  );
}
