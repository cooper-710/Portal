import type { ProjectStatus } from "@/types/database";

export function formatMoney(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function isCompletedProject(status: ProjectStatus) {
  return status === "completed" || status === "archived";
}

/** Prefer display name; fall back to email when name is missing. */
export function displayName(
  person:
    | { full_name?: string | null; email?: string | null }
    | null
    | undefined,
  fallback = "",
) {
  const name = person?.full_name?.trim();
  if (name) return name;
  const email = person?.email?.trim();
  if (email) return email;
  return fallback;
}

/** Client label on freelancer project lists (linked account or pending invite). */
export function projectClientLabel(
  client:
    | { full_name?: string | null; email?: string | null }
    | null
    | undefined,
  pendingEmail?: string | null,
) {
  if (client) return displayName(client, "Client");
  if (pendingEmail) return `Pending · ${pendingEmail}`;
  return "Unassigned";
}
