"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";

import { createInvoice } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PaymentKind } from "@/types/database";
import { PAYMENT_KINDS } from "@/types/database";

type ProjectInvoiceFormProps = {
  projectId: string;
};

export function ProjectInvoiceForm({ projectId }: ProjectInvoiceFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [paymentKind, setPaymentKind] = useState<PaymentKind>("standard");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const needsSchedule =
    paymentKind === "installment" ||
    paymentKind === "retainer" ||
    paymentKind === "recurring";

  function onCreate(formData: FormData) {
    setMessage(null);
    setError(null);
    formData.set("projectId", projectId);
    formData.set("paymentKind", paymentKind);
    startTransition(async () => {
      const result = await createInvoice(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      const count =
        "createdCount" in result && typeof result.createdCount === "number"
          ? result.createdCount
          : 1;
      setMessage(
        count > 1
          ? `Created ${count} payment requests.`
          : "Payment request created.",
      );
      setOpen(false);
      setPaymentKind("standard");
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="space-y-2">
        {message ? (
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            {message}
          </p>
        ) : null}
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Request payment
        </Button>
      </div>
    );
  }

  return (
    <form
      action={onCreate}
      className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4"
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold text-zinc-900">Request payment</p>
        <p className="text-xs text-zinc-500">
          Amount in USD. Clients pay via Stripe Checkout to your connected
          account.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`kind-${projectId}`}>Type</Label>
        <select
          id={`kind-${projectId}`}
          value={paymentKind}
          onChange={(event) =>
            setPaymentKind(event.target.value as PaymentKind)
          }
          className="flex h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none ring-zinc-400 focus:ring-2"
        >
          {PAYMENT_KINDS.map((kind) => (
            <option key={kind.value} value={kind.value}>
              {kind.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">
          {PAYMENT_KINDS.find((kind) => kind.value === paymentKind)?.hint}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`title-${projectId}`}>Label (optional)</Label>
        <Input
          id={`title-${projectId}`}
          name="title"
          type="text"
          placeholder="Deposit · Phase 1"
          className="h-9 bg-white"
          maxLength={80}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`amount-${projectId}`}>
          {paymentKind === "installment"
            ? "Total amount (USD)"
            : "Amount (USD)"}
        </Label>
        <Input
          id={`amount-${projectId}`}
          name="amount"
          type="number"
          min="1"
          step="0.01"
          required
          placeholder="1500"
          className="h-9 bg-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`due-${projectId}`}>
          {needsSchedule ? "First due date" : "Due date (optional)"}
        </Label>
        <Input
          id={`due-${projectId}`}
          name="dueDate"
          type="date"
          required={needsSchedule}
          className="h-9 bg-white"
        />
      </div>

      {paymentKind === "installment" ? (
        <div className="space-y-2">
          <Label htmlFor={`installments-${projectId}`}>
            Number of installments
          </Label>
          <Input
            id={`installments-${projectId}`}
            name="installmentCount"
            type="number"
            min="2"
            max="12"
            defaultValue={3}
            className="h-9 bg-white"
          />
          <p className="text-xs text-zinc-500">
            Splits the total into equal monthly invoices.
          </p>
        </div>
      ) : null}

      {paymentKind === "retainer" || paymentKind === "recurring" ? (
        <div className="space-y-2">
          <Label htmlFor={`series-${projectId}`}>Payments in series</Label>
          <Input
            id={`series-${projectId}`}
            name="seriesCount"
            type="number"
            min="2"
            max="24"
            defaultValue={3}
            className="h-9 bg-white"
          />
          <p className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-950">
            Billed as scheduled invoices (monthly due dates). Clients pay each
            invoice separately — this is not an automatic Stripe subscription.
          </p>
        </div>
      ) : null}

      {error ? (
        <p className="text-xs font-medium text-red-700">{error}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Create
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
