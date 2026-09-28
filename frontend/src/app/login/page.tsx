"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * There is no separate login / register / signup screen on this site.
 *
 * The checkout form itself is the login: customers enter their name, mobile
 * number and verify a WhatsApp OTP there, which registers a new account or
 * signs in an existing one. This route only exists so that any legacy link
 * (bookmarks, older emails, external referrers) still resolves gracefully.
 */
function LoginRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl") || "/";

  useEffect(() => {
    // Never bounce back to this route itself.
    const safeReturn = returnUrl.startsWith("/login") ? "/" : returnUrl;
    router.replace(safeReturn);
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
