import { Suspense } from "react";

import { AuthConfirmClient } from "./confirm-client";

export default function AuthConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center bg-zinc-50 text-sm text-muted-foreground">
          Preparing confirmation…
        </main>
      }
    >
      <AuthConfirmClient />
    </Suspense>
  );
}
