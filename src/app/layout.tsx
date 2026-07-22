import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { isProductionRuntime, validateCriticalEnv } from "@/utils/env";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
  "http://localhost:3001";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "Portal — Freelance Client Workspace",
    template: "%s · Portal",
  },
  description:
    "Invite clients, share deliverables, and collect Stripe payments. Portal Pro: 14-day free trial, then $25/mo.",
  openGraph: {
    title: "Portal — Freelance Client Workspace",
    description:
      "The client workspace freelancers actually use. 14-day free trial, then $25/mo.",
    url: appUrl,
    siteName: "Portal",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Portal — Freelance Client Workspace",
    description:
      "Invite clients, share deliverables, and collect payment — one private portal per project.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

function ProductionEnvBanner() {
  if (!isProductionRuntime()) return null;
  const result = validateCriticalEnv({ force: true });
  if (result.ok) return null;

  return (
    <div
      role="alert"
      className="border-b border-amber-300 bg-amber-50 px-4 py-2 text-center text-xs text-amber-950"
    >
      Production misconfiguration: missing {result.missing.join(", ")}. Check
      host env vars and{" "}
      <a href="/api/health" className="underline underline-offset-2">
        /api/health
      </a>
      .
    </div>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ProductionEnvBanner />
        {children}
      </body>
    </html>
  );
}
