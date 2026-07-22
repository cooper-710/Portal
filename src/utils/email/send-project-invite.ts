import { Resend } from "resend";

import {
  DEFAULT_BRAND_PRIMARY,
  logoPublicUrl,
  normalizeHexColor,
} from "@/lib/branding";
import { createAdminClient } from "@/utils/supabase/admin";

type ProjectInviteParams = {
  to: string;
  projectTitle: string;
  freelancerName: string;
  existingClient: boolean;
  businessName?: string | null;
  logoUrl?: string | null;
  brandPrimary?: string | null;
};

/**
 * Sends a client project invite.
 * Prefer Resend when RESEND_API_KEY is set; otherwise try Supabase Auth invite
 * when SUPABASE_SERVICE_ROLE_KEY is available. Never throws — invites are best-effort.
 */
export async function sendProjectInvite(
  params: ProjectInviteParams,
): Promise<{ sent: boolean; channel?: "resend" | "supabase"; error?: string }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const portalLink = `${appUrl}/login?mode=${params.existingClient ? "signin" : "signup"}&role=client&next=${encodeURIComponent("/dashboard")}`;
  const brandName =
    params.businessName?.trim() ||
    params.freelancerName ||
    "Portal";

  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from =
        process.env.RESEND_FROM_EMAIL ?? "Portal <onboarding@resend.dev>";

      const { error } = await resend.emails.send({
        from,
        to: params.to,
        subject: `You're invited to “${params.projectTitle}” — ${brandName}`,
        html: buildInviteHtml({
          projectTitle: params.projectTitle,
          freelancerName: params.freelancerName,
          portalLink,
          existingClient: params.existingClient,
          businessName: brandName,
          logoUrl: logoPublicUrl(params.logoUrl),
          brandPrimary: normalizeHexColor(
            params.brandPrimary,
            DEFAULT_BRAND_PRIMARY,
          ),
        }),
      });

      if (error) {
        return { sent: false, error: error.message };
      }

      return { sent: true, channel: "resend" };
    } catch (error) {
      return {
        sent: false,
        error: error instanceof Error ? error.message : "Resend invite failed",
      };
    }
  }

  if (process.env.SUPABASE_SERVICE_ROLE_KEY && !params.existingClient) {
    try {
      const admin = createAdminClient();
      const { error } = await admin.auth.admin.inviteUserByEmail(params.to, {
        redirectTo: `${appUrl}/auth/callback?next=/dashboard`,
        data: { role: "client" },
      });

      if (error) {
        return { sent: false, error: error.message };
      }

      return { sent: true, channel: "supabase" };
    } catch (error) {
      return {
        sent: false,
        error:
          error instanceof Error ? error.message : "Supabase invite failed",
      };
    }
  }

  return {
    sent: false,
    error:
      "No email provider configured. Add RESEND_API_KEY (recommended) or SUPABASE_SERVICE_ROLE_KEY.",
  };
}

function buildInviteHtml({
  projectTitle,
  freelancerName,
  portalLink,
  existingClient,
  businessName,
  logoUrl,
  brandPrimary,
}: {
  projectTitle: string;
  freelancerName: string;
  portalLink: string;
  existingClient: boolean;
  businessName: string;
  logoUrl: string | null;
  brandPrimary: string;
}) {
  const cta = existingClient ? "Open your portal" : "Create your account";
  const blurb = existingClient
    ? "A new project is waiting for you. Sign in to review files and invoices."
    : "Create your free account to view project updates, shared deliverables, and pay invoices.";

  const logoBlock = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(businessName)}" width="120" style="display:block; max-height:48px; width:auto; margin:0 0 16px;" />`
    : `<p style="margin:0 0 8px; font-size:13px; color:${brandPrimary}; font-weight:600;">${escapeHtml(businessName)}</p>`;

  return `
  <div style="font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; background:#fafafa; padding:32px 16px;">
    <div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #e4e4e7; border-radius:12px; padding:28px;">
      ${logoBlock}
      <h1 style="margin:0 0 12px; font-size:22px; line-height:1.3; color:#18181b;">
        You’re invited to “${escapeHtml(projectTitle)}”
      </h1>
      <p style="margin:0 0 20px; font-size:15px; line-height:1.55; color:#52525b;">
        ${escapeHtml(freelancerName)} at ${escapeHtml(businessName)} shared a project with you. ${blurb}
      </p>
      <a href="${portalLink}"
         style="display:inline-block; background:${brandPrimary}; color:#ffffff; text-decoration:none; font-size:14px; font-weight:600; padding:10px 16px; border-radius:8px;">
        ${cta}
      </a>
      <p style="margin:24px 0 0; font-size:12px; color:#a1a1aa;">
        Or paste this link: ${portalLink}
      </p>
    </div>
  </div>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
