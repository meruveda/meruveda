"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronRight,
  CreditCard,
  Heart,
  LifeBuoy,
  Loader2,
  LogOut,
  MapPin,
  Package,
  RotateCcw,
  Settings,
  Star,
  Truck,
  User,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useWishlist } from "@/context/WishlistContext";
import { addressService, orderService, reviewService } from "@/services/accountService";
import type { AccountAddress, AccountOrder } from "@/types/account";
import { formatAddress } from "@/services/accountService";
import ProfileDetails, { readProfileExtra } from "@/components/account/ProfileDetails";
import ProfileLoginGate, { safeNext } from "@/components/account/ProfileLoginGate";

/* Myntra-style account navigation groups. Everything links out to the
   existing /account sections — this page owns only the profile itself. */
const NAV_GROUPS: Array<{
  header: string;
  items: Array<{ name: string; href: string; icon: typeof Package; active?: boolean }>;
}> = [
  {
    header: "Orders",
    items: [
      { name: "My Orders", href: "/account/orders", icon: Package },
      { name: "Wishlist", href: "/account/wishlist", icon: Heart },
      { name: "Track Orders", href: "/account/track", icon: Truck },
    ],
  },
  {
    header: "Account",
    items: [
      { name: "Profile", href: "/profile", icon: User, active: true },
      { name: "Saved Addresses", href: "/account/addresses", icon: MapPin },
      { name: "Payment Methods", href: "/account/payment-methods", icon: CreditCard },
      { name: "Reviews & Feedback", href: "/account/reviews", icon: Star },
    ],
  },
  {
    header: "Support",
    items: [
      { name: "Returns & Refunds", href: "/account/returns", icon: RotateCcw },
      { name: "Help & Support", href: "/account/support", icon: LifeBuoy },
      { name: "Account Settings", href: "/account/settings", icon: Settings },
    ],
  },
];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function MyntraStyleProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-gold mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading your profile…</p>
          </div>
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { wishlist } = useWishlist();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [latestOrder, setLatestOrder] = useState<AccountOrder | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [defaultAddress, setDefaultAddress] = useState<AccountAddress | null>(null);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [hintName, setHintName] = useState("");

  // Guests stay on this page and get the inline login gate — the profile
  // icon must never bounce shoppers to checkout.

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orders, myReviews] = await Promise.all([
        orderService.myOrders().catch(() => [] as AccountOrder[]),
        reviewService.mine().catch(() => [] as Array<{ productId: string }>),
      ]);
      const sorted = [...orders].sort((a, b) => +new Date(b.date) - +new Date(a.date));
      setLatestOrder(sorted[0] || null);
      setOrderCount(orders.length);

      const delivered = new Set<string>();
      for (const o of orders) {
        if (o.normalizedStatus !== "delivered") continue;
        for (const it of o.items) delivered.add(it.productId);
      }
      const reviewed = new Set(myReviews.map((r) => r.productId));
      let pending = 0;
      delivered.forEach((id) => {
        if (!reviewed.has(id)) pending += 1;
      });
      setPendingReviews(pending);

      const book = addressService.list();
      setDefaultAddress(book.find((a) => a.isDefault) || book[0] || null);
      setHintName(readProfileExtra().hintName);
    } catch (e) {
      setError((e as Error)?.message || "Could not load your profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-gold mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your profile…</p>
        </div>
      </div>
    );
  }

  // Not signed in (or session expired) → Myntra-style login gate on this
  // same page. Verifying here signs the shopper in and shows their profile
  // — or takes them to `?next=` if they came from a protected page.
  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 md:py-8">
        <nav className="text-[13px] text-gray-500 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-gray-800">
            Home
          </Link>
          <span className="mx-1.5 text-gray-400">/</span>
          <span className="font-bold text-gray-800">Login / Signup</span>
        </nav>
        <ProfileLoginGate next={next} />
      </div>
    );
  }

  const greet = hintName.trim() || user.firstName || "Customer";

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 md:py-8">
      {/* Breadcrumb */}
      <nav className="text-[13px] text-gray-500 mb-4 md:mb-6" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-gray-800">
          Home
        </Link>
        <span className="mx-1.5 text-gray-400">/</span>
        <span className="font-bold text-gray-800">My Profile</span>
      </nav>

      {/* Mobile nav chips */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4" aria-label="Account sections">
        {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
          <Link
            key={item.href + item.name}
            href={item.href}
            aria-current={item.active ? "page" : undefined}
            className={`shrink-0 px-3.5 py-2 rounded-full border text-[13px] font-medium whitespace-nowrap ${
              item.active
                ? "bg-deep-purple text-white border-deep-purple"
                : "bg-white text-gray-600 border-gray-200"
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[230px_1fr] gap-6 lg:gap-8 items-start">
        {/* Left nav */}
        <aside className="hidden lg:block bg-white border border-gray-200" aria-label="Account navigation">
          <div className="px-5 pt-5 pb-4 border-b border-gray-100">
            <p className="text-[11px] text-gray-400">Hello</p>
            <p className="text-[15px] font-bold text-gray-900 truncate mt-0.5">{greet}</p>
          </div>
          {NAV_GROUPS.map((group) => (
            <div key={group.header} className="px-5 py-4 border-b border-gray-100 last:border-0">
              <p className="text-[11px] font-medium tracking-wider text-gray-400 uppercase mb-2.5">
                {group.header}
              </p>
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      aria-current={item.active ? "page" : undefined}
                      className={`block py-1.5 text-sm border-l-[3px] pl-4 -ml-5 transition-colors ${
                        item.active
                          ? "border-gold text-deep-purple font-bold"
                          : "border-transparent text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="px-5 py-4">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-red-600 transition-colors"
            >
              <LogOut size={15} /> Logout
            </button>
          </div>
        </aside>

        {/* Main column */}
        <div className="space-y-5 min-w-0">
          {error && (
            <p className="bg-white border border-gray-200 px-5 py-4 text-sm text-gray-600" role="alert">
              {error}{" "}
              <button onClick={load} className="font-bold text-deep-purple hover:underline ml-1">
                Retry
              </button>
            </p>
          )}

          <ProfileDetails key={hintName} />

          {/* Recent order */}
          <section className="bg-white border border-gray-200" aria-label="Recent order">
            <div className="flex items-center justify-between px-5 md:px-7 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Recent Order</h2>
              <Link
                href="/account/orders"
                className="flex items-center gap-0.5 text-[13px] font-bold text-deep-purple hover:underline"
              >
                View all {orderCount > 0 && `(${orderCount})`} <ChevronRight size={15} />
              </Link>
            </div>
            <div className="px-5 md:px-7 py-4">
              {loading ? (
                <div className="animate-pulse space-y-2 py-1" aria-hidden>
                  <div className="h-3.5 bg-gray-100 w-2/3" />
                  <div className="h-3.5 bg-gray-100 w-1/2" />
                </div>
              ) : latestOrder ? (
                <Link
                  href={`/account/orders/${encodeURIComponent(latestOrder.id)}`}
                  className="flex items-center gap-4 group"
                >
                  <span className="w-11 h-11 shrink-0 bg-ivory border border-gray-100 flex items-center justify-center text-deep-purple text-sm font-bold">
                    {(latestOrder.items[0]?.name || "M").substring(0, 1).toUpperCase()}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-gray-900 truncate group-hover:underline">
                      {latestOrder.items[0]?.name || latestOrder.orderNumber}
                      {latestOrder.items.length > 1 && (
                        <span className="font-medium text-gray-500"> +{latestOrder.items.length - 1} more</span>
                      )}
                    </span>
                    <span className="block text-[13px] text-gray-500 mt-0.5">
                      {latestOrder.orderNumber} · {fmtDate(latestOrder.date)} · ₹
                      {(latestOrder.total || 0).toFixed(2)}
                    </span>
                  </span>
                  <span className="text-[13px] font-bold text-gold capitalize shrink-0">
                    {latestOrder.status}
                  </span>
                </Link>
              ) : (
                <p className="text-sm text-gray-500">
                  No orders yet.{" "}
                  <Link href="/products" className="font-bold text-deep-purple hover:underline">
                    Start shopping
                  </Link>
                </p>
              )}
            </div>
          </section>

          {/* Default address */}
          <section className="bg-white border border-gray-200" aria-label="Default address">
            <div className="flex items-center justify-between px-5 md:px-7 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Delivery Address</h2>
              <Link
                href="/account/addresses"
                className="flex items-center gap-0.5 text-[13px] font-bold text-deep-purple hover:underline"
              >
                Manage <ChevronRight size={15} />
              </Link>
            </div>
            <div className="px-5 md:px-7 py-4">
              {loading ? (
                <div className="animate-pulse space-y-2 py-1" aria-hidden>
                  <div className="h-3.5 bg-gray-100 w-1/3" />
                  <div className="h-3.5 bg-gray-100 w-2/3" />
                </div>
              ) : defaultAddress ? (
                <div className="text-sm">
                  <p className="font-bold text-gray-900">
                    {defaultAddress.fullName}{" "}
                    <span className="ml-1.5 text-[11px] font-bold text-gray-500 border border-gray-200 rounded px-1.5 py-0.5 uppercase">
                      {defaultAddress.type}
                    </span>
                  </p>
                  <p className="text-[13px] text-gray-500 mt-1 leading-relaxed">
                    {formatAddress(defaultAddress)}
                  </p>
                  <p className="text-[13px] text-gray-500 mt-0.5">Phone: {defaultAddress.phone}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No addresses saved.{" "}
                  <Link href="/account/addresses" className="font-bold text-deep-purple hover:underline">
                    Add one
                  </Link>{" "}
                  to check out faster.
                </p>
              )}
            </div>
          </section>

          {/* More from your account */}
          <section className="bg-white border border-gray-200" aria-label="More from your account">
            <h2 className="px-5 md:px-7 py-4 border-b border-gray-100 text-base font-bold text-gray-900">
              More From Your Account
            </h2>
            <ul className="divide-y divide-gray-100">
              <li>
                <Link
                  href="/account/wishlist"
                  className="flex items-center justify-between px-5 md:px-7 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-3 text-sm text-gray-700">
                    <Heart size={16} className="text-gray-400" /> My Wishlist
                    <span className="text-[13px] text-gray-400">
                      ({loading ? "…" : wishlist.length} saved)
                    </span>
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>
              </li>
              <li>
                <Link
                  href="/account/reviews"
                  className="flex items-center justify-between px-5 md:px-7 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-3 text-sm text-gray-700">
                    <Star size={16} className="text-gray-400" /> Reviews & Feedback
                    {!loading && pendingReviews > 0 && (
                      <span className="text-[13px] text-gray-400">({pendingReviews} pending)</span>
                    )}
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>
              </li>
              <li>
                <Link
                  href="/account/track"
                  className="flex items-center justify-between px-5 md:px-7 py-3.5 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-3 text-sm text-gray-700">
                    <Truck size={16} className="text-gray-400" /> Track Orders
                  </span>
                  <ChevronRight size={16} className="text-gray-300" />
                </Link>
              </li>
              <li className="lg:hidden">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-red-600"
                >
                  <LogOut size={16} /> Logout
                </button>
              </li>
            </ul>
          </section>

          <p className="text-xs text-gray-400 leading-relaxed px-1">
            Need to change your password, notification preferences or delete your account?{" "}
            <Link href="/account/settings" className="font-bold text-gray-500 hover:underline">
              Open account settings
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
