"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type AuthModalMode = "signup" | "signin" | "client";

function modeFromParams(
  auth: string | null,
  role: string | null,
): AuthModalMode | null {
  if (role === "client" || auth === "client") return "client";
  if (auth === "signup" || auth === "1" || auth === "trial") return "signup";
  if (auth === "signin" || auth === "login") return "signin";
  if (auth) return "signin";
  return null;
}

function copyForMode(mode: AuthModalMode) {
  switch (mode) {
    case "client":
      return {
        title: "Client access",
        description:
          "Continue with Google to join the project you were invited to.",
      };
    case "signup":
      return {
        title: "Create your workspace",
        description:
          "Continue with Google to start your 14-day free trial of Finalia Pro.",
      };
    default:
      return {
        title: "Welcome back",
        description: "Continue with Google to sign in to your Finalia workspace.",
      };
  }
}

type AuthModalProps = {
  /** Controlled open from parent CTAs (optional; URL can also open). */
  open?: boolean;
  mode?: AuthModalMode;
  onOpenChange?: (open: boolean) => void;
};

export function AuthModal({
  open: controlledOpen,
  mode: controlledMode,
  onOpenChange,
}: AuthModalProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlMode = modeFromParams(
    searchParams.get("auth"),
    searchParams.get("role"),
  );
  const initialError = searchParams.get("error");
  const nextFromUrl = searchParams.get("next");

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [uncontrolledMode, setUncontrolledMode] =
    useState<AuthModalMode>("signup");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? Boolean(controlledOpen) : uncontrolledOpen || Boolean(urlMode);
  const mode =
    (isControlled ? controlledMode : null) ??
    urlMode ??
    uncontrolledMode;

  const clearAuthParams = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("auth");
    params.delete("role");
    params.delete("error");
    // Keep next only if still useful elsewhere; clear when closing modal.
    params.delete("next");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  function setOpen(next: boolean) {
    if (!next) {
      if (urlMode) clearAuthParams();
      setUncontrolledOpen(false);
    } else {
      setUncontrolledOpen(true);
    }
    onOpenChange?.(next);
  }

  // Sync URL → uncontrolled open when landing with ?auth=
  useEffect(() => {
    if (urlMode && !isControlled) {
      setUncontrolledOpen(true);
      setUncontrolledMode(urlMode);
    }
  }, [urlMode, isControlled]);

  const copy = copyForMode(mode);
  const signupRole = mode === "client" ? "client" : "freelancer";
  const nextPath =
    nextFromUrl?.startsWith("/")
      ? nextFromUrl
      : mode === "client"
        ? "/dashboard"
        : "/onboarding/welcome";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="gap-5 p-6 sm:max-w-md">
        <DialogHeader className="gap-1.5">
          <DialogTitle className="text-xl font-semibold tracking-tight text-zinc-900">
            {copy.title}
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-zinc-500">
            {copy.description}
          </DialogDescription>
        </DialogHeader>
        <LoginForm
          nextPath={nextPath}
          initialError={initialError}
          signupRole={signupRole}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Imperative helpers for landing CTAs (updates URL so refresh keeps modal). */
export function authHref(mode: AuthModalMode, next?: string) {
  const params = new URLSearchParams();
  params.set("auth", mode === "client" ? "client" : mode);
  if (mode === "client") params.set("role", "client");
  if (next?.startsWith("/")) params.set("next", next);
  return `/?${params.toString()}`;
}
