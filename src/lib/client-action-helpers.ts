import type { ClientAction, PaymentKind } from "@/types/database";

export type ClientActionWithLinks = ClientAction & {
  project?: { title: string } | null;
  invoice?: {
    amount: number;
    currency: string;
    status: string;
    due_date: string | null;
    payment_kind: PaymentKind;
  } | null;
  asset?: {
    file_name: string | null;
    review_status: string | null;
  } | null;
};

/** Priority: overdue/due payments > deliverable reviews > project reviews > rest */
export function pickNextRequiredAction(
  actions: ClientActionWithLinks[],
): ClientActionWithLinks | null {
  const open = actions.filter((action) => action.status === "open");
  if (open.length === 0) return null;

  const rank = (action: ClientActionWithLinks) => {
    if (action.action_type === "pay_invoice") {
      const due = action.due_at ? new Date(action.due_at).getTime() : Infinity;
      return 0 + Math.min(due / 1e15, 0.9);
    }
    if (action.action_type === "review_deliverable") return 2;
    if (action.action_type === "review_project") return 3;
    return 4;
  };

  return [...open].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}
