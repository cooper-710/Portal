import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import {
  appBaseUrl,
  PRODUCT_NAME,
  PRODUCT_PLAN_NAME,
} from "@/lib/product";
import { isProductionRuntime, validateCriticalEnv } from "@/utils/env";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const appUrl = appBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  applicationName: PRODUCT_NAME,
  title: {
    default: "Finalia: Client Operations",
    template: `%s · ${PRODUCT_NAME}`,
  },
  description:
    `Invite clients, share deliverables, and collect Stripe payments. ${PRODUCT_PLAN_NAME}: 14-day free trial, then $25/mo.`,
  openGraph: {
    title: "Finalia: Client Operations",
    description:
      "The client workspace your business actually runs on. 14-day free trial, then $25/mo.",
    url: appUrl,
    siteName: PRODUCT_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/finalia-icon.png",
        width: 1254,
        height: 1254,
        alt: "Finalia app icon",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Finalia: Client Operations",
    description:
      "Invite clients, share deliverables, and collect payment in one private workspace per project.",
    images: ["/finalia-icon.png"],
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
        className={`${dmSans.variable} ${geistMono.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ProductionEnvBanner />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
