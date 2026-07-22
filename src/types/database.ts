export type UserRole = "freelancer" | "client"; // freelancer = workspace owner (keep id for authz)

export type ProjectStatus =
  | "discovery"
  | "in_progress"
  | "review"
  | "completed"
  /** @deprecated legacy, migrated to discovery / in_progress / review / completed */
  | "draft"
  | "active"
  | "in_review"
  | "archived";

export type ProjectPhase =
  | "discovery"
  | "in_progress"
  | "review"
  | "completed";

export type AssetVisibility = "internal" | "deliverable";

export type AssetReviewStatus = "pending" | "approved" | "changes_requested";

export type InvoiceStatus =
  | "pending"
  | "processing"
  | "paid"
  | "canceled"
  | "partially_refunded"
  | "refunded"
  | "disputed";

export type InvoiceDisputeStatus = "open" | "won" | "lost";

export function isInvoiceOutstanding(status: InvoiceStatus) {
  return status === "pending" || status === "processing" || status === "canceled";
}

export function isInvoiceSettled(status: InvoiceStatus) {
  return !isInvoiceOutstanding(status);
}

export type PaymentKind =
  | "standard"
  | "deposit"
  | "installment"
  | "retainer"
  | "recurring"
  | "standalone";

/** Create-invoice UX kinds (legacy retainer/standalone still valid in DB). */
export type InvoiceCreateKind =
  | "standard"
  | "deposit"
  | "installment"
  | "recurring";

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

export type ClientActionType =
  | "pay_invoice"
  | "review_deliverable"
  | "review_project";

export type ClientActionStatus = "open" | "completed" | "dismissed";

export type BrandAppearance = "light" | "default";

export type PlatformSubscriptionStatus =
  | "none"
  | "incomplete"
  | "incomplete_expired"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "paused";

export const PROJECT_PHASES: { value: ProjectPhase; label: string }[] = [
  { value: "discovery", label: "Discovery" },
  { value: "in_progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "completed", label: "Completed" },
];

export const RECURRENCE_FREQUENCIES: {
  value: RecurrenceFrequency;
  label: string;
}[] = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

/** Top-level options in create-invoice. Retainer maps to recurring; payment request → one-off. */
export const PAYMENT_KINDS: {
  value: InvoiceCreateKind;
  label: string;
  hint: string;
}[] = [
  {
    value: "standard",
    label: "One-off",
    hint: "Single invoice for this project",
  },
  {
    value: "deposit",
    label: "Deposit",
    hint: "Upfront payment to start work",
  },
  {
    value: "installment",
    label: "Payment plan",
    hint: "Split the total into equal dated invoices",
  },
  {
    value: "recurring",
    label: "Recurring",
    hint: "Creates scheduled invoices. Autopay comes next / not auto-charged yet",
  },
];

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  password_set: boolean;
  business_name: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_accent: string | null;
  welcome_message: string | null;
  appearance: BrandAppearance;
  stripe_account_id: string | null;
  stripe_charges_enabled: boolean;
  stripe_details_submitted: boolean;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: PlatformSubscriptionStatus;
  subscription_current_period_end: string | null;
  /** Set when freelancer saves or skips customize-portal onboarding. */
  portal_setup_completed_at: string | null;
  /** Set when freelancer finishes the guided onboarding wizard. */
  onboarding_completed_at: string | null;
  /** Current guided onboarding step (welcome…done). */
  onboarding_step: string | null;
  created_at: string;
  updated_at: string;
};

export type BusinessBrand = {
  business_name: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_accent: string | null;
  welcome_message: string | null;
  appearance: BrandAppearance;
  full_name: string | null;
  email: string;
};

export type Project = {
  id: string;
  freelancer_id: string;
  client_id: string | null;
  client_email: string | null;
  title: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
};

export type Asset = {
  id: string;
  project_id: string;
  file_url: string;
  file_name: string | null;
  visibility: AssetVisibility;
  uploaded_by: string;
  review_status: AssetReviewStatus | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Invoice = {
  id: string;
  project_id: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  payment_kind: PaymentKind;
  due_date: string | null;
  installment_number: number | null;
  parent_invoice_id: string | null;
  title: string | null;
  series_key: string | null;
  recurrence_frequency: RecurrenceFrequency | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  amount_paid: number;
  amount_refunded: number;
  stripe_charge_id: string | null;
  stripe_dispute_id: string | null;
  dispute_status: InvoiceDisputeStatus | null;
  payment_status_updated_at: string | null;
  last_payment_event_created_at: number | null;
  created_at: string;
  updated_at: string;
};

export type InvoicePaymentEvent = {
  id: string;
  invoice_id: string;
  stripe_event_id: string;
  event_type: string;
  stripe_object_id: string | null;
  outcome: string;
  invoice_status: InvoiceStatus | null;
  amount_paid: number | null;
  amount_refunded: number | null;
  stripe_charge_id: string | null;
  stripe_dispute_id: string | null;
  failure_code: string | null;
  failure_message: string | null;
  occurred_at: string;
  recorded_at: string;
  metadata: Record<string, unknown>;
};

export type ClientAction = {
  id: string;
  project_id: string;
  client_id: string;
  freelancer_id: string;
  action_type: ClientActionType;
  status: ClientActionStatus;
  title: string;
  description: string | null;
  invoice_id: string | null;
  asset_id: string | null;
  due_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      users: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          password_set?: boolean;
          business_name?: string | null;
          logo_url?: string | null;
          brand_primary?: string | null;
          brand_accent?: string | null;
          welcome_message?: string | null;
          appearance?: BrandAppearance;
          stripe_account_id?: string | null;
          stripe_charges_enabled?: boolean;
          stripe_details_submitted?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: PlatformSubscriptionStatus;
          subscription_current_period_end?: string | null;
          portal_setup_completed_at?: string | null;
          onboarding_completed_at?: string | null;
          onboarding_step?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: {
          id: string;
          type: string;
          processed_at: string;
        };
        Insert: {
          id: string;
          type: string;
          processed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["stripe_webhook_events"]["Insert"]>;
        Relationships: [];
      };
      invoice_payment_events: {
        Row: InvoicePaymentEvent;
        Insert: Omit<InvoicePaymentEvent, "id" | "recorded_at"> & {
          id?: string;
          recorded_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoice_payment_events"]["Insert"]>;
        Relationships: [];
      };
      projects: {
        Row: Project;
        Insert: {
          id?: string;
          freelancer_id: string;
          client_id?: string | null;
          client_email?: string | null;
          title: string;
          status?: ProjectStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
        Relationships: [];
      };
      assets: {
        Row: Asset;
        Insert: {
          id?: string;
          project_id: string;
          file_url: string;
          file_name?: string | null;
          visibility?: AssetVisibility;
          uploaded_by: string;
          review_status?: AssetReviewStatus | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["assets"]["Insert"]>;
        Relationships: [];
      };
      invoices: {
        Row: Invoice;
        Insert: {
          id?: string;
          project_id: string;
          amount: number;
          currency?: string;
          status?: InvoiceStatus;
          payment_kind?: PaymentKind;
          due_date?: string | null;
          installment_number?: number | null;
          parent_invoice_id?: string | null;
          title?: string | null;
          series_key?: string | null;
          recurrence_frequency?: RecurrenceFrequency | null;
          stripe_payment_intent_id?: string | null;
          stripe_checkout_session_id?: string | null;
          amount_paid?: number;
          amount_refunded?: number;
          stripe_charge_id?: string | null;
          stripe_dispute_id?: string | null;
          dispute_status?: InvoiceDisputeStatus | null;
          payment_status_updated_at?: string | null;
          last_payment_event_created_at?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["invoices"]["Insert"]>;
        Relationships: [];
      };
      client_actions: {
        Row: ClientAction;
        Insert: {
          id?: string;
          project_id: string;
          client_id: string;
          freelancer_id: string;
          action_type: ClientActionType;
          status?: ClientActionStatus;
          title: string;
          description?: string | null;
          invoice_id?: string | null;
          asset_id?: string | null;
          due_at?: string | null;
          completed_at?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["client_actions"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      is_project_member: {
        Args: { p_project_id: string };
        Returns: boolean;
      };
      link_projects_for_client: {
        Args: { p_user_id: string; p_email: string };
        Returns: undefined;
      };
      mark_invoice_paid: {
        Args: {
          p_invoice_id: string;
          p_checkout_session_id?: string | null;
          p_payment_intent_id?: string | null;
        };
        Returns: boolean;
      };
      submit_deliverable_review: {
        Args: {
          p_action_id: string;
          p_decision: AssetReviewStatus;
          p_note?: string | null;
        };
        Returns: string;
      };
      submit_project_review: {
        Args: {
          p_action_id: string;
          p_decision: "approved" | "changes_requested";
          p_note?: string | null;
        };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      project_status: ProjectStatus;
      asset_visibility: AssetVisibility;
      asset_review_status: AssetReviewStatus;
      invoice_status: InvoiceStatus;
      payment_kind: PaymentKind;
      client_action_type: ClientActionType;
      client_action_status: ClientActionStatus;
      platform_subscription_status: PlatformSubscriptionStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
