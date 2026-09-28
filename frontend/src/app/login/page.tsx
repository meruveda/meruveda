"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/authService";
import { Eye, EyeOff, Loader2 } from "lucide-react";

// Admin app URL — update when deploying to production
const ADMIN_APP_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:5174";

type Mode = "login" | "register" | "forgot";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup, forgotPassword, isAuthenticated, user } = useAuth();

  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const returnUrl = searchParams.get("returnUrl") || "/";

  // If already logged in, redirect appropriately
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "admin") {
        const token = authService.getToken();
        window.location.href = `${ADMIN_APP_URL}?token=${encodeURIComponent(token || "")}&user=${encodeURIComponent(JSON.stringify(user))}`;
      } else {
        router.replace(returnUrl);
      }
    }
  }, [isAuthenticated, user, router, returnUrl]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const email = data.get("email") as string;
    const password = data.get("password") as string;
    const rememberMe = (data.get("remember") as string) === "on";

    try {
      if (mode === "login") {
        await login(email, password, rememberMe);
        // Redirect handled by useEffect above after user state updates
      } else if (mode === "register") {
        const firstName = data.get("firstName") as string;
        const lastName = data.get("lastName") as string;
        const phone = data.get("phone") as string;
        await signup({ email, password, firstName, lastName, phone });
        // Redirect handled by useEffect
      } else if (mode === "forgot") {
        await forgotPassword(email);
        setSuccess("If an account exists for that email, password reset instructions have been sent.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all text-sm";
  const labelClass = "block text-gray-700 font-medium mb-1 text-sm";

  return (
    <div className="container mx-auto px-6 py-24 min-h-[70vh] flex flex-col items-center justify-center">
      <h1 className="text-4xl font-playfair font-bold text-deep-purple mb-2">
        {mode === "login" ? "Welcome Back" : mode === "register" ? "Join MeruVeda" : "Reset Password"}
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-sm">
        {mode === "login"
          ? "Sign in to access your account, track orders, and discover holistic wellness."
          : mode === "register"
          ? "Create an account to begin your Ayurvedic journey with us."
          : "Enter your email address to receive password reset instructions."}
      </p>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-100">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {mode === "register" && (
            <>
              <div className="flex gap-3 mb-4">
                <div className="flex-1">
                  <label className={labelClass}>First Name</label>
                  <input name="firstName" required type="text" className={inputClass} placeholder="Priya" />
                </div>
                <div className="flex-1">
                  <label className={labelClass}>Last Name</label>
                  <input name="lastName" required type="text" className={inputClass} placeholder="Sharma" />
                </div>
              </div>
              <div className="mb-4">
                <label className={labelClass}>Phone Number</label>
                <input name="phone" required type="tel" className={inputClass} placeholder="+91 98765 43210" />
              </div>
            </>
          )}

          <div className="mb-4">
            <label className={labelClass}>Email Address</label>
            <input
              name="email"
              required
              type="email"
              className={inputClass}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {mode !== "forgot" && (
            <div className="mb-5">
              <div className="flex justify-between items-center mb-1">
                <label className={labelClass}>Password</label>

              </div>
              <div className="relative">
                <input
                  name="password"
                  required
                  type={showPassword ? "text" : "password"}
                  className={`${inputClass} pr-10`}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          {mode === "login" && (
            <div className="mb-5 flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                name="remember"
                className="accent-gold w-4 h-4"
              />
              <label htmlFor="remember" className="text-sm text-gray-600">
                Remember me for 30 days
              </label>
            </div>
          )}

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-deep-purple text-white py-3 rounded-lg font-bold hover:bg-deep-purple/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading
              ? "Processing..."
              : mode === "login"
              ? "Sign In"
              : mode === "register"
              ? "Create Account"
              : "Send Instructions"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <button onClick={() => setMode("register")} className="text-gold font-bold hover:underline">
                Register here
              </button>
            </>
          ) : mode === "register" ? (
            <>
              Already have an account?{" "}
              <button onClick={() => setMode("login")} className="text-gold font-bold hover:underline">
                Sign In
              </button>
            </>
          ) : (
            <button onClick={() => setMode("login")} className="text-gold font-bold hover:underline">
              ← Back to Sign In
            </button>
          )}
        </div>


      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-6 py-24 min-h-[70vh] flex flex-col items-center justify-center">
          <Loader2 size={40} className="animate-spin text-gold" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
