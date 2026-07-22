import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Portal",
  description: "How Portal collects, uses, and protects your information.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-svh bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-semibold tracking-tight">
          <Link href="/" className="text-zinc-900 hover:underline">
            Portal
          </Link>
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: July 21, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-zinc-600">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Who we are</h2>
            <p>
              Portal (“we”, “us”) provides a client workspace for freelancers:
              projects, file sharing, invoicing, and payments. This policy
              describes how we handle information when you use the service at
              our website and application.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Information we collect</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-zinc-800">Account data:</span>{" "}
                name, email address, role (freelancer or client), and optional
                business branding (name, logo, colors).
              </li>
              <li>
                <span className="font-medium text-zinc-800">Workspace content:</span>{" "}
                projects, invoices, messages related to deliverables, and files
                you upload to the vault.
              </li>
              <li>
                <span className="font-medium text-zinc-800">Payment data:</span>{" "}
                processed by Stripe. We store Stripe customer, subscription,
                Connect account, and payment identifiers—not full card numbers.
              </li>
              <li>
                <span className="font-medium text-zinc-800">Technical data:</span>{" "}
                IP address, browser type, and basic usage logs needed to operate
                and secure the service.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">How we use information</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>Provide and improve the Portal product</li>
              <li>Authenticate users and send transactional email (invites, magic links)</li>
              <li>Process SaaS subscriptions and invoice payments via Stripe</li>
              <li>Detect abuse, debug issues, and meet legal obligations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Processors</h2>
            <p>
              We use trusted processors including{" "}
              <span className="font-medium text-zinc-800">Supabase</span> (auth,
              database, storage),{" "}
              <span className="font-medium text-zinc-800">Stripe</span>{" "}
              (payments and Connect), hosting providers (e.g. Vercel), and
              optionally <span className="font-medium text-zinc-800">Resend</span>{" "}
              for email. Each processes data under their own terms and to provide
              our service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Retention & deletion</h2>
            <p>
              We retain account and workspace data while your account is active.
              Freelancers may delete their account from Settings. You may also
              request deletion by contacting us. Backup copies may persist for a
              limited period before irreversible removal.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Security</h2>
            <p>
              Access to project data is enforced with row-level security and
              role-based policies. Payment card data is handled by Stripe. No
              method of transmission or storage is 100% secure; we take
              commercially reasonable measures to protect your information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Your choices</h2>
            <p>
              You can update profile information in Settings, manage billing in
              the Stripe customer portal, and request a copy or deletion of your
              personal data by contacting us.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Contact</h2>
            <p>
              Questions about this policy: use the support email published on
              your Portal deployment or the address associated with your Stripe /
              business account for this product.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Changes</h2>
            <p>
              We may update this policy from time to time. Material changes will
              be reflected by updating the “Last updated” date on this page.
            </p>
          </section>
        </div>

        <p className="mt-12 text-sm text-zinc-500">
          <Link href="/terms" className="underline underline-offset-2 hover:text-zinc-800">
            Terms of Service
          </Link>
          {" · "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-zinc-800">
            Privacy
          </Link>
          {" · "}
          <Link href="/" className="underline underline-offset-2 hover:text-zinc-800">
            Home
          </Link>
        </p>
      </div>
    </main>
  );
}
