import { Suspense } from "react";

import { AuthPageShell } from "@/components/auth/auth-page-shell";

import { AuthCallbackContent } from "./auth-callback-content";

function AuthCallbackFallback() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center text-sm"
      style={{ color: "rgba(245, 245, 244, 0.65)" }}
    >
      Loading…
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <AuthPageShell>
      <Suspense fallback={<AuthCallbackFallback />}>
        <AuthCallbackContent />
      </Suspense>
    </AuthPageShell>
  );
}
