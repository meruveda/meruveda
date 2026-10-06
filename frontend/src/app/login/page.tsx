"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * There is no separate login / register / signup screen on this site.
 *
 * Signing in happens through the checkout form's WhatsApp OTP. This route
 * only exists so that legacy links (bookmarks, older emails, external
 * referrers) still resolve: it forwards to /checkout.
 */
function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || searchParams.get("next") || "/";

  useEffect(() => {
    // Never bounce back to this route itself; only same-site paths allowed.
    // (/profile is currently disabled, so everything funnels to checkout.)
    const safe =
      returnUrl === "/checkout" ||
      (returnUrl.startsWith("/") && !returnUrl.startsWith("//") && !returnUrl.startsWith("/login"))
        ? returnUrl
        : "/checkout";
    router.replace(safe);
  }, [router, returnUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-ivory">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-gold mx-auto" />
        <p className="text-deep-purple font-medium font-playfair mt-4">Taking you to checkout…</p>
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
