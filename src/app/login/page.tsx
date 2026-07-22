import Link from "next/link";

import { LoginForm } from "@/components/auth/login-form";
import { SiteFooter } from "@/components/site-footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    mode?: string;
    role?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const initialError = params.error ?? null;
  const initialMode = params.mode === "signin" ? "signin" : "signup";
  const signupRole = params.role === "client" ? "client" : "freelancer";
  // Explicit ?next= wins. Otherwise: signup freelancers → billing (start trial);
  // sign-in (and clients) → dashboard — resolvePostAuthPath upgrades/downgrades
  // freelancers based on subscription status.
  const explicitNext = params.next?.startsWith("/") ? params.next : null;
  const defaultNext =
    initialMode === "signin"
      ? "/dashboard"
      : signupRole === "freelancer"
        ? "/dashboard/billing"
        : "/dashboard";
  const nextPath = explicitNext ?? defaultNext;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="mb-8 text-center">
        <Link href="/" className="text-2xl font-semibold tracking-tight text-zinc-900">
          Portal
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          Secure client collaboration for freelancers
        </p>
      </div>

      <Card className="w-full max-w-md border-zinc-200 shadow-sm">
        <CardHeader>
          <CardTitle>
            {signupRole === "client" ? "Client access" : "Freelancer portal"}
          </CardTitle>
          <CardDescription>
            {signupRole === "client"
              ? "Join the project you were invited to. Continue with Google, or use email and password."
              : "Continue with Google to start your 14-day free trial ($25/mo after). Email and password still work as a fallback."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm
            nextPath={nextPath}
            nextPathExplicit={explicitNext != null}
            initialError={initialError}
            initialMode={initialMode}
            signupRole={signupRole}
          />
        </CardContent>
      </Card>

      <SiteFooter compact />
    </main>
  );
}
