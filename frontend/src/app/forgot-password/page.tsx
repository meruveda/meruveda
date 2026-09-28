"use client";

import { useState } from "react";
import Link from "next/link";
import { authService } from "@/services/authService";
import { Loader2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const form = e.currentTarget;
    const data = new FormData(form);
    const email = data.get("email") as string;

    if (!email) {
      setError("Email address is required.");
      setLoading(false);
      return;
    }

    try {
      await authService.forgotPassword(email);
      setSuccess("If an account exists for this email, a reset link has been sent.");
    } catch (err: unknown) {
      console.error("Forgot password error:", err);
      // Show generic message anyway to protect user privacy
      setSuccess("If an account exists for this email, a reset link has been sent.");
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
        Reset Password
      </h1>
      <p className="text-gray-600 mb-8 text-center max-w-sm">
        Enter your email address to receive password reset instructions.
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
          <div className="mb-6">
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

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-deep-purple text-white py-3 rounded-lg font-bold hover:bg-deep-purple/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Processing..." : "Send Instructions"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <Link href="/login" className="text-gold font-bold hover:underline">
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
