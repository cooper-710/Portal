"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2 } from "lucide-react";

import { deleteInvoice, updateInvoice } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
import { formatMoney } from "@/lib/format";
import type { Invoice } from "@/types/database";

type InvoiceOwnerActionsProps = {
  invoice: Pick<
    Invoice,
    "id" | "amount" | "currency" | "status" | "due_date" | "title" | "project_id"
  >;
  projectTitle?: string | null;
  onMessage?: (message: string) => void;
  compact?: boolean;
};

export function InvoiceOwnerActions({
  invoice,
  projectTitle,
  onMessage,
  compact = false,
}: InvoiceOwnerActionsProps) {
  const router = useRouter();
  const fieldId = useId();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(invoice.due_date);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (invoice.status !== "pending") {
    return null;
  }

  function openEdit() {
    setError(null);
    setDueDate(invoice.due_date);
    setEditOpen(true);
  }

  function handleUpdate(formData: FormData) {
    setError(null);
    formData.set("invoiceId", invoice.id);
    if (dueDate) {
      formData.set("dueDate", dueDate);
    } else {
      formData.set("dueDate", "");
    }

    startTransition(async () => {
      const result = await updateInvoice(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setEditOpen(false);
      onMessage?.("Invoice updated.");
      router.refresh();
    });
  }

  function handleDelete() {
    setError(null);
    const formData = new FormData();
    formData.set("invoiceId", invoice.id);

    startTransition(async () => {
      const result = await deleteInvoice(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setDeleteOpen(false);
      onMessage?.("Invoice deleted.");
      router.refresh();
    });
  }

  const amountDollars = (invoice.amount / 100).toFixed(2);

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
          aria-label="Edit invoice"
        >
          <Pencil className={compact ? "size-3.5" : "size-3.5"} />
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
          aria-label="Delete invoice"
        >
          <Trash2 className="size-3.5" />
          {compact ? null : "Delete"}
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit invoice</DialogTitle>
            <DialogDescription>
              Update amount, due date, or label for unpaid invoices only.
              {projectTitle ? ` · ${projectTitle}` : ""}
            </DialogDescription>
          </DialogHeader>

          <form action={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-title`}>Label (optional)</Label>
              <Input
                id={`${fieldId}-title`}
                name="title"
                type="text"
                defaultValue={invoice.title ?? ""}
                placeholder="Deposit · Phase 1"
                className="h-9 bg-white"
                maxLength={80}
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-amount`}>Amount (USD)</Label>
              <Input
                id={`${fieldId}-amount`}
                name="amount"
                type="number"
                min="1"
                step="0.01"
                required
                defaultValue={amountDollars}
                className="h-9 bg-white"
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-due`}>Due date (optional)</Label>
              <DatePicker
                id={`${fieldId}-due`}
                name="dueDate"
                value={dueDate}
                onChange={setDueDate}
                disabled={pending}
                placeholder="No due date"
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
            <DialogTitle>Delete invoice?</DialogTitle>
            <DialogDescription>
              This removes{" "}
              <span className="font-medium text-zinc-800">
                {formatMoney(invoice.amount, invoice.currency)}
              </span>
              {invoice.title?.trim()
                ? ` (${invoice.title.trim()})`
                : ""}
              {projectTitle ? ` for ${projectTitle}` : ""}. Paid invoices cannot
              be deleted.
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
              Delete invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
