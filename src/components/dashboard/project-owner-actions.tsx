"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { deleteProject, updateProject } from "@/app/actions";
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
import type { Project } from "@/types/database";

type ProjectOwnerActionsProps = {
  project: Pick<Project, "id" | "title">;
  pendingInvoiceCount?: number;
  onMessage?: (message: string) => void;
  compact?: boolean;
  /** When set, navigate here after a successful delete (e.g. project detail). */
  redirectOnDelete?: string;
};

export function ProjectOwnerActions({
  project,
  pendingInvoiceCount = 0,
  onMessage,
  compact = false,
  redirectOnDelete,
}: ProjectOwnerActionsProps) {
  const router = useRouter();
  const fieldId = useId();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openEdit() {
    setError(null);
    setEditOpen(true);
  }

  function handleUpdate(formData: FormData) {
    setError(null);
    formData.set("projectId", project.id);

    startTransition(async () => {
      const result = await updateProject(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditOpen(false);
      onMessage?.("Project updated.");
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    const formData = new FormData();
    formData.set("projectId", project.id);

    startTransition(async () => {
      const result = await deleteProject(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDeleteOpen(false);
      onMessage?.("Project deleted.");
      if (redirectOnDelete) {
        router.push(redirectOnDelete);
        router.refresh();
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div
        className={
          compact
            ? "flex shrink-0 items-center gap-1"
            : "flex shrink-0 items-center gap-1.5"
        }
      >
        <Button
          type="button"
          size={compact ? "icon-sm" : "sm"}
          variant="outline"
          className="border-zinc-200 bg-white shadow-sm"
          onClick={(event) => {
            event.stopPropagation();
            openEdit();
          }}
          aria-label="Edit project"
        >
          <Pencil className="size-3.5" />
          {compact ? null : "Edit"}
        </Button>
        <Button
          type="button"
          size={compact ? "icon-sm" : "sm"}
          variant="outline"
          className="border-red-200 bg-white text-red-700 shadow-sm hover:bg-red-50"
          onClick={(event) => {
            event.stopPropagation();
            setError(null);
            setDeleteOpen(true);
          }}
          aria-label="Delete project"
        >
          <Trash2 className="size-3.5" />
          {compact ? null : "Delete"}
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit project</DialogTitle>
            <DialogDescription>
              Update the project title. Phase can be changed from the project
              row or workspace.
            </DialogDescription>
          </DialogHeader>

          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-title`}>Project title</Label>
              <Input
                id={`${fieldId}-title`}
                name="title"
                type="text"
                required
                defaultValue={project.title}
                placeholder="Brand website redesign"
                className="h-9 bg-white"
                maxLength={120}
                disabled={pending}
              />
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
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This removes the project, files, and invoices for{" "}
              <span className="font-medium text-zinc-800">{project.title}</span>
              . This cannot be undone.
              {pendingInvoiceCount > 0 ? (
                <>
                  {" "}
                  There {pendingInvoiceCount === 1 ? "is" : "are"}{" "}
                  <span className="font-medium text-zinc-800">
                    {pendingInvoiceCount} unpaid invoice
                    {pendingInvoiceCount === 1 ? "" : "s"}
                  </span>{" "}
                  that will also be deleted.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

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
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={handleDelete}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
