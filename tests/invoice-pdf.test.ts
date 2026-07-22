import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";

import { generateInvoicePdf } from "@/lib/invoice-pdf";

describe("invoice PDF", () => {
  it("generates a valid, single-page branded document", async () => {
    const bytes = await generateInvoicePdf({
      invoiceNumber: "A1B2C3D4",
      title: "Website launch",
      projectTitle: "Acme redesign",
      amountCents: 425000,
      currency: "usd",
      status: "pending",
      issuedAt: "2026-07-22T12:00:00.000Z",
      dueDate: "2026-08-05",
      businessName: "Northstar Studio",
      ownerName: "Morgan Lee",
      ownerEmail: "morgan@example.com",
      clientName: "Taylor Reed",
      clientEmail: "taylor@example.com",
      brandPrimary: "#3156A4",
    });
    expect(bytes.byteLength).toBeGreaterThan(1_000);
    const document = await PDFDocument.load(bytes);
    expect(document.getPageCount()).toBe(1);
    expect(document.getTitle()).toBe("Invoice A1B2C3D4");
    expect(document.getAuthor()).toBe("Northstar Studio");
  });
});
