"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Trash2 } from "lucide-react";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, cartTotal } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push("/login?returnUrl=/checkout");
    } else {
      router.push("/checkout");
    }
  };

  return (
    <div className="container mx-auto px-6 py-12 md:py-24 min-h-[60vh]">
      <h1 className="text-4xl font-playfair font-bold text-deep-purple mb-12">Your Cart</h1>
      
      {cart.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-2xl font-playfair font-bold text-deep-purple mb-4">Your cart is empty</h2>
          <p className="text-gray-600 mb-8">Looks like you haven't added any Ayurvedic wellness products yet.</p>
          <Link href="/products" className="bg-gold text-deep-purple px-8 py-3 rounded font-bold hover:bg-gold-light transition-colors">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8 md:gap-12">
          <div className="md:col-span-2 space-y-6">
            {cart.map(item => (
              <div key={item.id} className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex gap-4 items-center w-full sm:w-auto">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-[#f8f5f0] rounded overflow-hidden flex-shrink-0">
                    {typeof item.image === 'string' && item.image ? (
                      <Image src={item.image} alt={item.name || "Product"} fill className="object-contain p-2" />
                    ) : (
                      <Image src="/images/placeholder-product.png" alt={item.name || "Product"} fill className="object-contain p-2" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-playfair font-bold text-deep-purple text-base sm:text-lg truncate">{item.name}</h3>
                    <p className="text-rust font-bold text-sm sm:text-base">₹{(item.price || 0).toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between w-full sm:w-auto sm:ml-auto gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 sm:border-none">
                  <div className="flex items-center border border-gray-200 rounded bg-gray-50/50">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-1 hover:bg-gray-100 transition-colors">-</button>
                    <span className="px-3 py-1 border-x border-gray-200 bg-white text-sm font-semibold">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-1 hover:bg-gray-100 transition-colors">+</button>
                  </div>
                  <button onClick={() => removeFromCart(item.id)} className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 h-fit">
            <h3 className="font-playfair font-bold text-deep-purple text-xl mb-6">Order Summary</h3>
            <div className="flex justify-between mb-4 text-gray-600">
              <span>Subtotal</span>
              <span>₹{(cartTotal || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between mb-4 text-gray-600">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="border-t border-gray-200 my-4"></div>
            <div className="flex justify-between mb-8 font-bold text-lg text-deep-purple">
              <span>Total</span>
              <span>₹{(cartTotal || 0).toFixed(2)}</span>
            </div>
            <button 
              onClick={handleCheckout}
              className="w-full bg-deep-purple text-white py-3 rounded font-bold hover:bg-deep-purple/90 transition-colors cursor-pointer"
            >
              Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
