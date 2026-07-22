import { mkdir, writeFile } from "node:fs/promises";

import { generateInvoicePdf } from "../src/lib/invoice-pdf";

const outputDir = "tmp/pdfs";
await mkdir(outputDir, { recursive: true });
const bytes = await generateInvoicePdf({
  invoiceNumber: "A1B2C3D4",
  title: "Website design and launch",
  projectTitle: "Acme brand refresh",
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
await writeFile(`${outputDir}/invoice-fixture.pdf`, bytes);
