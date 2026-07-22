export type UserRole = "freelancer" | "client";

export type ProjectStatus =
  | "discovery"
  | "in_progress"
  | "review"
  | "completed"
  /** @deprecated legacy — migrated to discovery / in_progress / review / completed */
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

export type InvoiceStatus = "pending" | "paid";

export type PaymentKind =
  | "standard"
  | "deposit"
  | "installment"
  | "retainer"
  | "recurring"
  | "standalone";

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

export const PAYMENT_KINDS: { value: PaymentKind; label: string; hint: string }[] =
  [
    {
      value: "standard",
      label: "Standard invoice",
      hint: "One-off project invoice",
    },
    {
      value: "deposit",
      label: "Deposit",
      hint: "Upfront payment to start work",
    },
    {
      value: "installment",
      label: "Installment",
      hint: "Part of a payment schedule",
    },
    {
      value: "standalone",
      label: "Payment request",
      hint: "Standalone request outside a schedule",
    },
    {
      value: "retainer",
      label: "Retainer (scheduled invoices)",
      hint: "Creates a series of dated invoices — billed as scheduled invoices, not a Stripe subscription",
    },
    {
      value: "recurring",
      label: "Recurring (scheduled invoices)",
      hint: "Creates a series of dated invoices — billed as scheduled invoices, not auto-charged",
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
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  created_at: string;
  updated_at: string;
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
          stripe_payment_intent_id?: string | null;
          stripe_checkout_session_id?: string | null;
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
