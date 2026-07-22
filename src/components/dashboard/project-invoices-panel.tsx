"use client";

import { useState } from "react";

import { CreateInvoiceDialog } from "@/components/dashboard/create-invoice-dialog";
import { InvoiceOwnerActions } from "@/components/dashboard/invoice-owner-actions";
import { InvoicePdfLink } from "@/components/dashboard/invoice-pdf-link";
import { EmptyState } from "@/components/dashboard/empty-state";
import { InvoiceStatusBadge } from "@/components/dashboard/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import type { Invoice } from "@/types/database";
import { Receipt } from "lucide-react";

type ProjectInvoicesPanelProps = {
  projectId: string;
  projectTitle: string;
  invoices: Invoice[];
  canManage: boolean;
};

export function ProjectInvoicesPanel({
  projectId,
  projectTitle,
  invoices,
  canManage,
}: ProjectInvoicesPanelProps) {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="space-y-2">
          {message ? (
            <p className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
              {message}
            </p>
          ) : null}
          <CreateInvoiceDialog
            projectId={projectId}
            triggerLabel="Request payment"
            triggerSize="sm"
            onCreated={setMessage}
          />
        </div>
      ) : null}

      {invoices.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No invoices yet"
          description={
            canManage
              ? "Create an invoice above. Your client can pay it from their Invoices page."
              : "When an invoice is sent, it will show up here."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Document{canManage ? " / actions" : ""}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((invoice) => (
              <TableRow key={invoice.id}>
                <TableCell className="font-medium">
                  {formatMoney(invoice.amount, invoice.currency)}
                </TableCell>
                <TableCell className="max-w-[10rem] truncate text-zinc-600">
                  {invoice.title?.trim() || "-"}
                </TableCell>
                <TableCell className="text-zinc-600">
                  {invoice.due_date
                    ? new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell>
                  <InvoiceStatusBadge status={invoice.status} />
                </TableCell>
                <TableCell>
                  {new Date(invoice.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                    <div className="flex justify-end gap-1.5">
                      <InvoicePdfLink invoiceId={invoice.id} compact />
                      {canManage ? (
                      <InvoiceOwnerActions
                        invoice={invoice}
                        projectTitle={projectTitle}
                        onMessage={setMessage}
                        compact
                      />) : null}
                    </div>
                  </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
