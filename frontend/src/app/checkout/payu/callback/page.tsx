"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import axiosInstance from "@/api/axiosInstance";

function PayUCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        // Collect all POST query/form fields passed by PayU via searchParams or state
        const payload: Record<string, string> = {};
        searchParams.forEach((value, key) => {
          payload[key] = value;
        });

        // Send to backend callback endpoint to verify hash and update order status
        const response = await axiosInstance.post("/payu/callback", payload);
        const result = response.data;

        if (result.success) {
          router.replace(`/checkout?order_id=${result.orderId}&status=confirmed`);
        } else {
          router.replace(`/checkout/failed?order_id=${result.orderId || ''}&reason=${encodeURIComponent(result.message || 'Payment failed')}`);
        }
      } catch (err: any) {
        console.error("PayU callback error", err);
        setError("Failed to process payment callback.");
      }
    };

    processCallback();
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Payment Verification Error</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={() => router.push("/checkout")}
          className="bg-deep-purple text-white px-6 py-2 rounded-lg font-bold"
        >
          Return to Checkout
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
      <Loader2 size={40} className="animate-spin text-gold mb-4" />
      <h2 className="text-xl font-playfair font-bold text-deep-purple">Verifying PayU Payment...</h2>
      <p className="text-gray-500 text-sm mt-2">Please do not refresh or close this window.</p>
    </div>
  );
}

export default function PayUCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-gold" />
      </div>
    }>
      <PayUCallbackContent />
    </Suspense>
  );
}
