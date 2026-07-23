import type { NotificationEvent, NotificationPreferences } from "@/types/database";

export type NotificationCategory =
  | "invites"
  | "reviews"
  | "invoices"
  | "payments"
  | "projects";

export type NotificationMessage = {
  category: NotificationCategory;
  title: string;
  body: string;
  href: string;
  inApp: boolean;
  email: boolean;
  push: boolean;
};

function stringValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function money(payload: Record<string, unknown>, key = "amount") {
  const amount = numberValue(payload, key);
  const currency = stringValue(payload, "currency") ?? "usd";
  if (amount == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function projectName(payload: Record<string, unknown>) {
  return stringValue(payload, "project_title") ?? "your project";
}

function invoiceHref(event: NotificationEvent) {
  return event.project_id
    ? `/dashboard/invoices?project=${encodeURIComponent(event.project_id)}`
    : "/dashboard/invoices";
}

function projectHref(event: NotificationEvent) {
  return event.project_id
    ? `/dashboard/projects/${encodeURIComponent(event.project_id)}`
    : "/dashboard/projects";
}

export function notificationMessage(event: NotificationEvent): NotificationMessage | null {
  const payload = event.payload ?? {};
  const amount = money(payload);
  const refunded = money(payload, "amount_refunded");
  const fileName = stringValue(payload, "file_name") ?? "A deliverable";
  const note = stringValue(payload, "note");

  switch (event.event_type) {
    case "test_notification": {
      const channel = stringValue(payload, "requested_channel");
      return {
        category: "payments",
        title: "Finalia test notification",
        body: `Your ${channel ?? "notification"} channel is working.`,
        href: "/dashboard/settings",
        inApp: channel === "in_app",
        email: channel === "email",
        push: channel === "push",
      };
    }
    case "client_invited":
      return {
        category: "invites",
        title: "New project invitation",
        body: `You were invited to ${projectName(payload)}.`,
        href: projectHref(event),
        inApp: true,
        email: false,
        push: true,
      };
    case "client_invite_reminder":
      return {
        category: "invites",
        title: `Reminder: join ${projectName(payload)}`,
        body: "Your Finalia invitation is still waiting.",
        href: "/login?role=client&next=%2Fdashboard",
        inApp: false,
        email: true,
        push: false,
      };
    case "deliverable_review_requested":
      return {
        category: "reviews",
        title: "Deliverable ready for review",
        body: stringValue(payload, "title") ?? "A new deliverable is ready for your review.",
        href: projectHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "deliverable_changes_requested":
      return {
        category: "reviews",
        title: "Changes requested",
        body: note ? `${fileName}: ${note}` : `${fileName} needs changes.`,
        href: projectHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "deliverable_feedback_reviewed":
      return {
        category: "reviews",
        title: "Your feedback was reviewed",
        body: `${fileName} feedback was reviewed. You’ll be notified when the owner shares an update or completes the project.`,
        href: projectHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "deliverable_approved":
      return {
        category: "reviews",
        title: "Deliverable approved",
        body: `${fileName} was approved.`,
        href: projectHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "final_approval_requested":
      return {
        category: "reviews",
        title: "Final approval requested",
        body: stringValue(payload, "description") ?? "The project is ready for final review.",
        href: projectHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "final_approval_received":
      return {
        category: "reviews",
        title: "Final approval received",
        body: "Your client approved the project.",
        href: projectHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "project_changes_requested":
      return {
        category: "reviews",
        title: "Project changes requested",
        body: note ?? "Your client requested changes during final review.",
        href: projectHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "invoice_created":
      return {
        category: "invoices",
        title: "New invoice",
        body: stringValue(payload, "title") ?? (amount ? `A ${amount} invoice is ready.` : "A new invoice is ready."),
        href: invoiceHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "invoice_due":
      return {
        category: "invoices",
        title: "Invoice due today",
        body: amount ? `${amount} is due today.` : "An invoice is due today.",
        href: invoiceHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "invoice_overdue":
      return {
        category: "invoices",
        title: "Invoice overdue",
        body: amount ? `${amount} is overdue.` : "An invoice is overdue.",
        href: invoiceHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "payment_succeeded":
      return {
        category: "payments",
        title: "Payment received",
        body: amount ? `${amount} was paid successfully.` : "The invoice was paid successfully.",
        href: invoiceHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "payment_failed":
      return {
        category: "payments",
        title: "Payment not completed",
        body: amount ? `The ${amount} payment was not completed.` : "The invoice payment was not completed.",
        href: invoiceHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "refund_initiated":
      return {
        category: "payments",
        title: "Refund initiated",
        body: "Stripe is processing the invoice refund.",
        href: invoiceHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "refund_completed":
      return {
        category: "payments",
        title: "Refund completed",
        body: refunded ? `${refunded} has been refunded.` : "The invoice refund is complete.",
        href: invoiceHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "refund_failed":
      return {
        category: "payments",
        title: "Refund needs attention",
        body: "Stripe could not complete the refund. Review the invoice and try again.",
        href: invoiceHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "payment_disputed":
      return {
        category: "payments",
        title: "Payment disputed",
        body: "A client payment has an open Stripe dispute. Review it promptly.",
        href: invoiceHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    case "project_closed":
      return {
        category: "projects",
        title: "Project closed out",
        body: `${projectName(payload)} is complete.`,
        href: projectHref(event),
        inApp: true,
        email: true,
        push: true,
      };
    default:
      return null;
  }
}

export function categoryEnabled(
  preferences: NotificationPreferences,
  category: NotificationCategory,
) {
  switch (category) {
    case "invites": return preferences.invites_enabled;
    case "reviews": return preferences.reviews_enabled;
    case "invoices": return preferences.invoices_enabled;
    case "payments": return preferences.payments_enabled;
    case "projects": return preferences.projects_enabled;
  }
}

export function defaultNotificationPreferences(userId: string): NotificationPreferences {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    in_app_enabled: true,
    email_enabled: true,
    push_enabled: false,
    quiet_hours_enabled: false,
    quiet_hours_start: "22:00:00",
    quiet_hours_end: "08:00:00",
    timezone: "UTC",
    invites_enabled: true,
    reviews_enabled: true,
    invoices_enabled: true,
    payments_enabled: true,
    projects_enabled: true,
    created_at: now,
    updated_at: now,
  };
}

function minuteOfDay(value: string) {
  const [hours = "0", minutes = "0"] = value.split(":");
  return Number(hours) * 60 + Number(minutes);
}

export function isInQuietHours(
  date: Date,
  timezone: string,
  start: string,
  end: string,
) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
  } catch {
    return false;
  }
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const current = hour * 60 + minute;
  const from = minuteOfDay(start);
  const to = minuteOfDay(end);
  if (from === to) return true;
  return from < to ? current >= from && current < to : current >= from || current < to;
}

export function retryDelayMs(attempt: number) {
  return Math.min(6 * 60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attempt - 1));
}
