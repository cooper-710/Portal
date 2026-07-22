import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/site-footer";
import { PortalBrand } from "@/components/portal-brand";

export const metadata: Metadata = {
  title: "Terms of Service · Portal",
  description: "Terms governing use of the Portal client workspace.",
};

export default function TermsPage() {
  return (
    <div className="flex min-h-svh flex-col bg-zinc-50 text-zinc-900">
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-sm font-semibold tracking-tight">
          <Link href="/" className="text-zinc-900 hover:underline">
            <PortalBrand
              size="sm"
              nameClassName="text-sm font-semibold tracking-tight"
            />
          </Link>
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-500">Last updated: July 21, 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-zinc-600">
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Agreement</h2>
            <p>
              By creating an account or using Portal, you agree to these Terms.
              If you use Portal on behalf of a business, you represent that you
              have authority to bind that business.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">The service</h2>
            <p>
              Portal is a software platform for businesses and studios to invite clients,
              share project files, track status, and collect invoice payments.
              Features may change as we improve the product. We may suspend
              access for abuse, non-payment, or legal risk.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Accounts & roles</h2>
            <p>
              Workspace owners operate workspaces and may invite clients. You are
              responsible for activity under your credentials and for content you
              upload or send. Do not share passwords. Clients may only access
              projects they are invited to.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Subscriptions & fees</h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <span className="font-medium text-zinc-800">Portal Pro</span> is
                billed at <span className="font-medium text-zinc-800">$25 per month</span>{" "}
                after a free trial period (default 14 days) unless canceled.
              </li>
              <li>
                Client invoice payments may include a platform application fee
                (default about <span className="font-medium text-zinc-800">1%</span>{" "}
                of the invoice amount) retained by Portal via Stripe Connect.
              </li>
              <li>
                Payments are processed by Stripe. Your payouts are subject
                to Stripe Connect terms and payout schedules.
              </li>
              <li>
                For client invoices, the workspace owner is the merchant of
                record: the business the client is paying and the party
                responsible for payment support, refunds, and disputes.
              </li>
              <li>
                You can manage or cancel your Portal Pro subscription in the
                Stripe customer portal linked from Billing.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Your content</h2>
            <p>
              You retain ownership of files and project content you upload. You
              grant us a limited license to host, transmit, and display that
              content solely to operate the service for you and your invited
              clients. You represent that you have the rights to upload and share
              that content.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Acceptable use</h2>
            <p>
              You may not use Portal for unlawful activity, malware distribution,
              spam, infringement of others’ rights, or attempts to bypass
              security or billing. We may remove content or terminate accounts
              that violate these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Disclaimers</h2>
            <p>
              Portal is provided “as is” without warranties of uninterrupted or
              error-free operation. We are not a party to contracts
              between you and your clients, and we do not guarantee
              payment outcomes beyond facilitating Stripe Checkout and Connect.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Portal and its operators
              are not liable for indirect, incidental, or consequential damages,
              or for lost profits or data. Our aggregate liability for claims
              relating to the service is limited to the fees you paid us for
              Portal Pro in the three months before the claim.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Termination</h2>
            <p>
              You may stop using Portal and delete your account at any time.
              Provisions that by nature should survive (fees owed, ownership,
              liability limits) will survive termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Changes</h2>
            <p>
              We may update these Terms. Continued use after an update
              constitutes acceptance of the revised Terms. The “Last updated”
              date on this page will change when we revise them.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900">Contact</h2>
            <p>
              For terms questions, contact the support channel published with
              your Portal deployment.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
