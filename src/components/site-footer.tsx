import Link from "next/link";

type SiteFooterProps = {
  /** Compact footer for login / legal pages */
  compact?: boolean;
};

export function SiteFooter({ compact = false }: SiteFooterProps) {
  if (compact) {
    return (
      <p className="mt-8 text-center text-xs text-zinc-400">
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-zinc-600"
        >
          Privacy
        </Link>
        {" · "}
        <Link
          href="/terms"
          className="underline underline-offset-2 hover:text-zinc-600"
        >
          Terms
        </Link>
      </p>
    );
  }

  return (
    <footer className="border-t border-zinc-200/80 bg-zinc-50/90">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-sm text-zinc-500 sm:px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] font-semibold tracking-tight text-zinc-800"
        >
          Portal
        </Link>
        <nav className="flex flex-wrap items-center gap-4">
          <Link href="/how-it-works" className="hover:text-zinc-800">
            How it works
          </Link>
          <Link href="/features" className="hover:text-zinc-800">
            Features
          </Link>
          <Link href="/pricing" className="hover:text-zinc-800">
            Pricing
          </Link>
          <Link href="/privacy" className="hover:text-zinc-800">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-zinc-800">
            Terms
          </Link>
          <Link href="/?auth=signin" className="hover:text-zinc-800">
            Sign in
          </Link>
        </nav>
      </div>
    </footer>
  );
}
