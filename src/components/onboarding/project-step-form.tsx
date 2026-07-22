"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  createOnboardingProject,
  skipOnboardingStep,
} from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ProjectStepForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [skipping, setSkipping] = useState(false);

  function go(path: string) {
    router.replace(path);
    router.refresh();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSkipping(false);

    const formData = new FormData();
    formData.set("title", title.trim());

    startTransition(async () => {
      const result = await createOnboardingProject(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.path) go(result.path);
    });
  }

  function handleSkip() {
    setError(null);
    setSkipping(true);
    startTransition(async () => {
      const result = await skipOnboardingStep("project");
      if (result.error) {
        setError(result.error);
        setSkipping(false);
        return;
      }
      if (result.path) go(result.path);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="projectTitle">Project title</Label>
        <Input
          id="projectTitle"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Brand website redesign"
          maxLength={120}
          required
          autoFocus
          disabled={pending}
        />
        <p className="text-xs text-zinc-500">
          Client email can wait. You’ll invite them on the next step.
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

      <div className="flex flex-col gap-3">
        <Button
          type="submit"
          size="lg"
          className="h-12 w-full text-base shadow-sm"
          disabled={pending || !title.trim()}
        >
          {pending && !skipping ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Creating…
            </>
          ) : (
            "Create project"
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
