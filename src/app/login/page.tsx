import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    role?: string;
    auth?: string;
  }>;
};

/**
 * Thin redirect: auth lives as a modal on the landing page.
 * Preserves role / next / error for invites and OAuth recovery.
 */
export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams();

  const mode =
    params.role === "client"
      ? "client"
      : params.auth === "signup"
        ? "signup"
        : "signin";
  qs.set("auth", mode);

  if (params.role === "client") {
    qs.set("role", "client");
  }
  if (params.next?.startsWith("/")) {
    qs.set("next", params.next);
  }
  if (params.error) {
    qs.set("error", params.error);
  }

  redirect(`/?${qs.toString()}`);
}
