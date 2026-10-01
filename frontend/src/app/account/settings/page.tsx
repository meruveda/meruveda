"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      window.location.href = process.env.NEXT_PUBLIC_ADMIN_URL || "/admin";
    }
  }, [user]);

  if (user?.role === 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 size={40} className="animate-spin text-gold" />
        <p className="text-deep-purple font-medium">Redirecting to Admin Dashboard...</p>
      </div>
    );
  }
  
  // Notification states
  const [notifications, setNotifications] = useState({
    emailPromo: true,
    smsOrder: true,
    emailNewsletter: false,
    whatsappAlerts: true,
  });

  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
      try {
        const { default: axiosInstance } = await import('@/api/axiosInstance');
        const res = await axiosInstance.get('/auth/preferences');
        if (res.data?.data) {
          setNotifications(res.data.data);
        }
      } catch (err) {
        console.error("Failed to load preferences", err);
      }
    };
    fetchPrefs();
  }, [user]);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleNotificationChange = async (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    try {
      const { default: axiosInstance } = await import('@/api/axiosInstance');
      await axiosInstance.post('/auth/preferences', updated);
    } catch (err) {
      console.error("Failed to save preferences", err);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 800));
    setLoading(false);
    setSuccess(true);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setTimeout(() => setSuccess(false), 3000);
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all text-sm";
  const labelClass = "block text-gray-700 font-medium mb-1.5 text-sm";

  return (
    <div className="space-y-12">
      {/* Security Section */}
      <div>
        <h1 className="text-3xl font-playfair font-bold text-deep-purple mb-1">Account Settings</h1>
        <p className="text-gray-500 text-sm mb-6">Manage security preferences and subscription notifications.</p>

        <hr className="border-gray-100 mb-8" />

        <h3 className="font-playfair font-bold text-deep-purple text-xl mb-4">Security Settings</h3>
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 text-sm rounded-xl border border-green-100 font-medium">
            Password changed successfully! (Mocked)
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div>
            <label className={labelClass}>Current Password</label>
            <input
              type="password"
              name="currentPassword"
              required
              value={passwordForm.currentPassword}
              onChange={handlePasswordChange}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className={labelClass}>New Password</label>
            <input
              type="password"
              name="newPassword"
              required
              value={passwordForm.newPassword}
              onChange={handlePasswordChange}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className={labelClass}>Confirm New Password</label>
            <input
              type="password"
              name="confirmPassword"
              required
              value={passwordForm.confirmPassword}
              onChange={handlePasswordChange}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-deep-purple text-white px-6 py-2.5 rounded-lg font-bold hover:bg-deep-purple/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Changing..." : "Change Password"}
          </button>
        </form>
      </div>

      {/* Notifications Section */}
      <div>
        <h3 className="font-playfair font-bold text-deep-purple text-xl mb-4">Notification Preferences</h3>
        <p className="text-gray-500 text-xs mb-6">Choose how you want to receive order updates, news, and promotional offers.</p>

        <div className="space-y-4 max-w-xl">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.smsOrder}
              onChange={() => handleNotificationChange("smsOrder")}
              className="accent-gold w-4 h-4 mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold text-deep-purple">Order & Shipping Alerts (SMS)</p>
              <p className="text-xs text-gray-500">Receive transactional alerts for purchases, shipping updates, and deliveries.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.whatsappAlerts}
              onChange={() => handleNotificationChange("whatsappAlerts")}
              className="accent-gold w-4 h-4 mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold text-deep-purple">WhatsApp Chat Alerts</p>
              <p className="text-xs text-gray-500">Receive customer support details and shipment tracking directly on WhatsApp.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.emailPromo}
              onChange={() => handleNotificationChange("emailPromo")}
              className="accent-gold w-4 h-4 mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold text-deep-purple">Promotional Offers (Email)</p>
              <p className="text-xs text-gray-500">Get notified about exclusive deals, festive offers, and discounts.</p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifications.emailNewsletter}
              onChange={() => handleNotificationChange("emailNewsletter")}
              className="accent-gold w-4 h-4 mt-0.5"
            />
            <div>
              <p className="text-sm font-semibold text-deep-purple">Ayurvedic Journal Newsletter (Email)</p>
              <p className="text-xs text-gray-500">Receive monthly digests from our Ayurvedic doctors regarding wellness advice.</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
