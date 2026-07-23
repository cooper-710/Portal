"use client";

import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";

import { createProject } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type CreateProjectResult = {
  success?: true;
  inviteSent?: boolean;
  error?: string;
};

type NewProjectDialogProps = {
  onCreated?: (result?: CreateProjectResult) => void;
};

export function NewProjectDialog({ onCreated }: NewProjectDialogProps) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createProject(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setOpen(false);
      onCreated?.(result);
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New project
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New project</DialogTitle>
            <DialogDescription>
              Create a project and optionally invite a client by email. They do
              not need an account yet. We email them a workspace link and link the
              project when they join.
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-title">Project title</Label>
              <Input
                id="project-title"
                name="title"
                required
                placeholder="Brand website redesign"
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-email">Client email (optional)</Label>
              <Input
                id="client-email"
                name="clientEmail"
                type="email"
                placeholder="client@company.com"
                disabled={pending}
              />
              <p className="text-xs text-muted-foreground">
                We’ll send an invite email when Resend (or Supabase service role)
                is configured.
              </p>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Create project
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
