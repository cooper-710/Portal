"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";

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
import {
  canRequestInvoiceRefund,
  refundableInvoiceAmount,
} from "@/utils/stripe/invoice-refund";

type InvoiceOwnerActionsProps = {
  invoice: Pick<
    Invoice,
    | "id"
    | "amount"
    | "currency"
    | "status"
    | "due_date"
    | "title"
    | "project_id"
    | "amount_paid"
    | "amount_refunded"
    | "stripe_charge_id"
    | "stripe_connected_account_id"
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
  const [refundOpen, setRefundOpen] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(invoice.due_date);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const refundableAmount = refundableInvoiceAmount(invoice);
  const [refundAmount, setRefundAmount] = useState(
    (refundableAmount / 100).toFixed(2),
  );
  const canRefund = canRequestInvoiceRefund(invoice);

  if (invoice.status !== "pending" && !canRefund) {
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

  function openRefund() {
    setError(null);
    setRefundAmount((refundableAmount / 100).toFixed(2));
    setRefundOpen(true);
  }

  function handleRefund() {
    setError(null);
    const amount = Math.round(Number(refundAmount) * 100);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/invoices/${invoice.id}/refund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        });
        const data = (await response.json()) as { error?: string };
        if (!response.ok) {
          setError(data.error ?? "Unable to start the refund.");
          return;
        }
        setRefundOpen(false);
        onMessage?.("Refund initiated. The status will update when Stripe confirms it.");
        router.refresh();
      } catch {
        setError("Unable to start the refund. Check your connection and try again.");
      }
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
        {invoice.status === "pending" ? (
          <>
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
              aria-label="Delete invoice"
            >
              <Trash2 className="size-3.5" />
              {compact ? null : "Delete"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size={compact ? "icon-sm" : "sm"}
            variant="outline"
            className="border-violet-200 bg-white text-violet-700 shadow-sm hover:bg-violet-50"
            onClick={(event) => {
              event.stopPropagation();
              openRefund();
            }}
            aria-label="Refund payment"
          >
            <RotateCcw className="size-3.5" />
            {compact ? null : "Refund"}
          </Button>
        )}
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

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Refund payment</DialogTitle>
            <DialogDescription>
              Issue a full or partial refund for this invoice. The client-facing
              status updates after Stripe confirms the refund.
              {projectTitle ? ` · ${projectTitle}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-3 text-sm text-zinc-700">
              Available to refund: {formatMoney(refundableAmount, invoice.currency)}
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-refund-amount`}>
                Refund amount ({invoice.currency.toUpperCase()})
              </Label>
              <Input
                id={`${fieldId}-refund-amount`}
                type="number"
                min="0.01"
                max={(refundableAmount / 100).toFixed(2)}
                step="0.01"
                required
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                className="h-9 bg-white"
                disabled={pending}
              />
              <p className="text-xs text-zinc-500">
                This action sends money back through Stripe and cannot be undone.
              </p>
            </div>

            {error ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => setRefundOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !refundAmount}
              onClick={handleRefund}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
