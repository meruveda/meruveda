"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import { 
  User, 
  Package, 
  Heart, 
  MapPin, 
  CreditCard, 
  Settings, 
  LogOut, 
  Loader2 
} from "lucide-react";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?returnUrl=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-gold mx-auto mb-4" />
          <p className="text-deep-purple font-medium font-playfair">Loading your profile...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { name: "My Profile", href: "/account", icon: User },
    { name: "My Orders", href: "/account/orders", icon: Package },
    { name: "Wishlist", href: "/account/wishlist", icon: Heart },
    { name: "Saved Addresses", href: "/account/addresses", icon: MapPin },
    { name: "Payment Methods", href: "/account/payment-methods", icon: CreditCard },
    user?.role === 'admin'
      ? { name: "Admin Dashboard", href: process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:5174", icon: Settings }
      : { name: "Account Settings", href: "/account/settings", icon: Settings },
  ];

  return (
    <div className="container mx-auto px-6 py-12 md:py-24 print:p-0 print:m-0 print:max-w-none">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 print:block">
        {/* Sidebar */}
        <aside className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm h-fit print:hidden">
          <div className="flex items-center gap-4 pb-6 border-b border-gray-100 mb-6">
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={user.avatar} 
                alt={user.firstName} 
                className="w-14 h-14 rounded-full object-cover border-2 border-gold/40" 
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gold flex items-center justify-center text-deep-purple text-lg font-bold">
                {user.firstName[0]}{user.lastName[0]}
              </div>
            )}
            <div className="truncate">
              <h2 className="font-playfair font-bold text-deep-purple text-lg leading-tight truncate">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>

          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-deep-purple text-white shadow-sm"
                      : "text-gray-600 hover:bg-ivory hover:text-deep-purple"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-gold" : "text-gray-400"} />
                  {item.name}
                </Link>
              );
            })}
            <button
              onClick={() => {
                logout();
                router.push("/");
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 w-full transition-all text-left mt-4 border-t border-gray-100 pt-4"
            >
              <LogOut size={18} className="text-red-400" />
              Logout
            </button>
          </nav>
        </aside>

        {/* Content Area */}
        <main className="lg:col-span-3 print:col-span-full">
          <div className="bg-white p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm min-h-[50vh] print:p-0 print:border-none print:shadow-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
