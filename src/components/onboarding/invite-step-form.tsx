"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  inviteOnboardingClient,
  skipOnboardingStep,
} from "@/app/onboarding/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ProjectOption = {
  id: string;
  title: string;
  client_email: string | null;
};

export function InviteStepForm({ projects }: { projects: ProjectOption[] }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [skipping, setSkipping] = useState(false);

  const hasProjects = projects.length > 0;

  function go(path: string) {
    router.replace(path);
    router.refresh();
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!hasProjects) return;
    setError(null);
    setSkipping(false);

    const formData = new FormData();
    formData.set("projectId", projectId);
    formData.set("clientEmail", email.trim());

    startTransition(async () => {
      const result = await inviteOnboardingClient(formData);
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
      const result = await skipOnboardingStep("invite");
      if (result.error) {
        setError(result.error);
        setSkipping(false);
        return;
      }
      if (result.path) go(result.path);
    });
  }

  if (!hasProjects) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-zinc-200 bg-white/70 px-3 py-2 text-sm text-zinc-600">
          No project yet — skip this step and invite a client from the dashboard
          whenever you’re ready.
        </p>
        <Button
          type="button"
          size="lg"
          className="h-12 w-full text-base shadow-sm"
          disabled={pending}
          onClick={handleSkip}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Continuing…
            </>
          ) : (
            "Continue"
          )}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {projects.length > 1 ? (
        <div className="space-y-2">
          <Label htmlFor="inviteProject">Project</Label>
          <select
            id="inviteProject"
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
            disabled={pending}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-zinc-500">
          Inviting to <span className="font-medium text-zinc-800">{projects[0]?.title}</span>
        </p>
      )}

      <div className="space-y-2">
        <Label htmlFor="clientEmail">Client email</Label>
        <Input
          id="clientEmail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="client@studio.com"
          required
          autoFocus
          disabled={pending}
        />
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
          disabled={pending || !email.trim()}
        >
          {pending && !skipping ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending invite…
            </>
          ) : (
            "Send invite"
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
