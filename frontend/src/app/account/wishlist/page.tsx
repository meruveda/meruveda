"use client";

import { useCart } from "@/context/CartContext";
import { useWishlist, WishlistItem } from "@/context/WishlistContext";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, ShoppingCart, Trash2 } from "lucide-react";

export default function WishlistPage() {
  const { cart, addToCart } = useCart();
  const { wishlist, removeFromWishlist } = useWishlist();
  const router = useRouter();

  const handleAddToCart = (item: WishlistItem) => {
    // Already in the cart — don't add a duplicate line.
    if (cart.some((entry) => entry.id === item.id)) return;
    addToCart({
      id: item.id,
      name: item.name,
      price: item.price,
      image: item.image
    });
    // Remove from wishlist once added to cart
    removeFromWishlist(item.id);
  };

  // Buy Now: add qty 1 (never increment an existing line), then go straight
  // to checkout — the cart page no longer exists.
  const handleBuyNow = async (item: WishlistItem) => {
    try {
      const alreadyInCart = cart.some((entry) => entry.id === item.id);
      if (!alreadyInCart) {
        await addToCart({
          id: item.id,
          name: item.name,
          price: item.price,
          image: item.image
        });
      }
    } finally {
      router.push("/checkout");
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-playfair font-bold text-deep-purple mb-2">My Wishlist</h1>
      <p className="text-gray-500 text-sm mb-8">Products you have saved for later.</p>

      {wishlist.length === 0 ? (
        <div className="text-center py-16 bg-ivory/50 rounded-2xl border border-dashed border-gray-200">
          <Heart size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="font-playfair font-bold text-deep-purple text-lg mb-1">Your wishlist is empty</h3>
          <p className="text-sm text-gray-500 mb-6">Explore our catalog and save your favorites.</p>
          <Link href="/products" className="bg-gold text-deep-purple px-6 py-2 rounded-lg font-bold hover:bg-gold-light transition-colors text-sm">
            View Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {wishlist.map((item) => (
            <div key={item.id} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col">
              <div className="relative aspect-square w-full bg-[#f8f5f0] flex items-center justify-center p-6">
                {typeof item.image === 'string' && item.image ? (
                  <Image src={item.image} alt={item.name} fill className="object-contain p-4" />
                ) : (
                  <Image src="/images/placeholder-product.png" alt={item.name} fill className="object-contain p-4" />
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between border-t border-gray-50">
                <div>
                  <span className="text-[11px] font-semibold text-gold tracking-wider uppercase">{item.category}</span>
                  <h4 className="font-playfair font-bold text-deep-purple text-base mt-0.5 truncate">{item.name}</h4>
                  <p className="text-rust font-bold text-sm mt-1">₹{item.price.toFixed(2)}</p>
                </div>
                
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAddToCart(item)}
                      className="flex-1 min-w-0 border border-gold text-gold hover:bg-gold hover:text-white py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ShoppingCart size={13} /> Add to Cart
                    </button>
                    <button 
                      onClick={() => removeFromWishlist(item.id)}
                      className="p-2 border border-gray-200 hover:bg-red-50 hover:text-red-500 rounded-lg text-gray-400 transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => handleBuyNow(item)}
                    className="w-full bg-deep-purple text-white hover:bg-deep-purple/90 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
