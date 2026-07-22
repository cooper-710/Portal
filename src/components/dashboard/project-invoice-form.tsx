"use client";

import { useState } from "react";

import { CreateInvoiceDialog } from "@/components/dashboard/create-invoice-dialog";

type ProjectInvoiceFormProps = {
  projectId: string;
};

export function ProjectInvoiceForm({ projectId }: ProjectInvoiceFormProps) {
  const [message, setMessage] = useState<string | null>(null);

  return (
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
  );
}
