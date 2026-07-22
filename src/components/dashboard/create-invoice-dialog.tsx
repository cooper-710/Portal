"use client";

import { useId, useState, useTransition, type ComponentProps } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { createInvoice } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { InvoiceCreateKind, RecurrenceFrequency } from "@/types/database";
import { PAYMENT_KINDS, RECURRENCE_FREQUENCIES } from "@/types/database";

type ProjectOption = {
  id: string;
  title: string;
};

type CreateInvoiceDialogProps = {
  projects?: ProjectOption[];
  projectId?: string;
  triggerLabel?: string;
  triggerVariant?: ComponentProps<typeof Button>["variant"];
  triggerSize?: ComponentProps<typeof Button>["size"];
  triggerClassName?: string;
  onCreated?: (message: string) => void;
};

export function CreateInvoiceDialog({
  projects,
  projectId,
  triggerLabel = "New invoice",
  triggerVariant = "default",
  triggerSize,
  triggerClassName,
  onCreated,
}: CreateInvoiceDialogProps) {
  const router = useRouter();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [paymentKind, setPaymentKind] = useState<InvoiceCreateKind>("standard");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("monthly");
  const [projectValue, setProjectValue] = useState("");
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fixedProjectId = projectId?.trim() || null;
  const projectOptions = projects ?? [];
  const needsProjectSelect = !fixedProjectId;

  const needsSchedule =
    paymentKind === "installment" || paymentKind === "recurring";

  function resetFormState() {
    setPaymentKind("standard");
    setFrequency("monthly");
    setProjectValue("");
    setDueDate(null);
    setError(null);
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    if (fixedProjectId) {
      formData.set("projectId", fixedProjectId);
    } else if (projectValue) {
      formData.set("projectId", projectValue);
    }
    formData.set("paymentKind", paymentKind);
    formData.set("recurrenceFrequency", frequency);
    if (dueDate) {
      formData.set("dueDate", dueDate);
    } else {
      formData.set("dueDate", "");
    }

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
      const message =
        count > 1
          ? `Created ${count} payment requests.`
          : "Invoice created.";
      setOpen(false);
      resetFormState();
      onCreated?.(message);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        <Plus className="size-4" />
        {triggerLabel}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) resetFormState();
        }}
      >
        <DialogContent className="max-h-[min(90vh,40rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create invoice</DialogTitle>
            <DialogDescription>
              Amount in USD. Clients pay via Stripe Checkout to your connected
              account.
            </DialogDescription>
          </DialogHeader>

          <form action={handleSubmit} className="space-y-4">
            {needsProjectSelect ? (
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-project`}>Project</Label>
                <Select
                  id={`${fieldId}-project`}
                  name="projectId"
                  value={projectValue}
                  onChange={setProjectValue}
                  required
                  disabled={pending || projectOptions.length === 0}
                  placeholder={
                    projectOptions.length === 0
                      ? "No projects yet"
                      : "Select a project"
                  }
                  options={projectOptions.map((project) => ({
                    value: project.id,
                    label: project.title,
                  }))}
                />
              </div>
            ) : (
              <input type="hidden" name="projectId" value={fixedProjectId} />
            )}

            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-kind`}>Type</Label>
              <Select
                id={`${fieldId}-kind`}
                value={paymentKind}
                onChange={(next) => setPaymentKind(next as InvoiceCreateKind)}
                disabled={pending}
                options={PAYMENT_KINDS.map((kind) => ({
                  value: kind.value,
                  label: kind.label,
                  description: kind.hint,
                }))}
              />
              <p className="text-xs text-zinc-500">
                {PAYMENT_KINDS.find((kind) => kind.value === paymentKind)?.hint}
              </p>
            </div>

            {paymentKind === "recurring" ? (
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-frequency`}>Frequency</Label>
                <Select
                  id={`${fieldId}-frequency`}
                  name="recurrenceFrequency"
                  value={frequency}
                  onChange={(next) =>
                    setFrequency(next as RecurrenceFrequency)
                  }
                  disabled={pending}
                  options={RECURRENCE_FREQUENCIES.map((item) => ({
                    value: item.value,
                    label: item.label,
                  }))}
                />
                <p className="rounded-lg border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-950">
                  Creates scheduled invoices. Autopay comes next / not
                  auto-charged yet.
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-title`}>Label (optional)</Label>
              <Input
                id={`${fieldId}-title`}
                name="title"
                type="text"
                placeholder="Deposit · Phase 1"
                className="h-9 bg-white"
                maxLength={80}
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-amount`}>
                {paymentKind === "installment"
                  ? "Total amount (USD)"
                  : "Amount (USD)"}
              </Label>
              <Input
                id={`${fieldId}-amount`}
                name="amount"
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="1500"
                className="h-9 bg-white"
                disabled={pending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${fieldId}-due`}>
                {needsSchedule ? "First due date" : "Due date (optional)"}
              </Label>
              <DatePicker
                id={`${fieldId}-due`}
                name="dueDate"
                value={dueDate}
                onChange={setDueDate}
                required={needsSchedule}
                allowClear={!needsSchedule}
                disabled={pending}
                placeholder={
                  needsSchedule ? "Pick first due date" : "No due date"
                }
              />
            </div>

            {paymentKind === "installment" ? (
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-installments`}>
                  Number of installments
                </Label>
                <Input
                  id={`${fieldId}-installments`}
                  name="installmentCount"
                  type="number"
                  min="2"
                  max="12"
                  defaultValue={3}
                  className="h-9 bg-white"
                  disabled={pending}
                />
                <p className="text-xs text-zinc-500">
                  Splits the total into equal monthly invoices.
                </p>
              </div>
            ) : null}

            {paymentKind === "recurring" ? (
              <div className="space-y-2">
                <Label htmlFor={`${fieldId}-series`}>Payments in series</Label>
                <Input
                  id={`${fieldId}-series`}
                  name="seriesCount"
                  type="number"
                  min="2"
                  max="24"
                  defaultValue={3}
                  className="h-9 bg-white"
                  disabled={pending}
                />
              </div>
            ) : null}

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
              <Button
                type="submit"
                disabled={
                  pending ||
                  (needsProjectSelect &&
                    (projectOptions.length === 0 || !projectValue))
                }
              >
                {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                Create invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
