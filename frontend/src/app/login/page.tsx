"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * There is no separate login / register / signup screen on this site.
 *
 * Signing in happens on the profile page's inline gate (WhatsApp OTP —
 * same flow as the checkout form). This route only exists so that legacy
 * links (bookmarks, older emails, external referrers) still resolve: it
 * forwards to /profile, preserving the return destination as ?next=.
 */
function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || searchParams.get("next") || "/";

  useEffect(() => {
    // Never bounce back to this route itself; only same-site paths allowed.
    const safe =
      returnUrl.startsWith("/") && !returnUrl.startsWith("//") && !returnUrl.startsWith("/login")
        ? returnUrl
        : "/";
    const target = safe === "/" ? "/profile" : `/profile?next=${encodeURIComponent(safe)}`;
    router.replace(target);
  }, [router, returnUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-gold mx-auto" />
        <p className="text-deep-purple font-medium font-playfair mt-4">Taking you to your account…</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-ivory">
          <Loader2 size={40} className="animate-spin text-gold" />
        </div>
      }
    >
      <LoginRedirect />
    </Suspense>
  );
}
