"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CreditCard,
  Truck,
  Package,
  Loader2,
  ChevronRight,
  Plus,
  ShieldCheck
} from "lucide-react";
import axiosInstance from "@/api/axiosInstance";

const SHIPPING_IS_TAXABLE = false; // TODO: PENDING CLIENT CONFIRMATION. Set to true to tax shipping charges.

function isRajasthan(state: string): boolean {
  if (!state) return false;
  const s = state.trim().toLowerCase();
  const validMatches = ['rajasthan', 'rj', 'rajsthan', 'rajasthn', 'rajastan', 'rajasthna', 'rajastran', 'raj'];
  if (validMatches.includes(s)) return true;
  return s.startsWith('raj') && s.length >= 5;
}

interface Address {
  id: string;
  fullName: string;
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  type: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const { cart, cartTotal } = useCart();
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // Redirect if not logged in
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login?returnUrl=/checkout");
    }
  }, [isLoading, isAuthenticated, router]);

  // States
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    addressLine: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    type: "Home",
  });

  // Payment method state: strictly "payu" (Pay Online via PayU) or "cod" (Cash on Delivery)
  const [paymentMethod, setPaymentMethod] = useState<"payu" | "cod">("payu");

  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState({ code: "", amount: 0, percent: 0 });
  const [couponError, setCouponError] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const shippingCharges = cartTotal >= 1000 ? 0 : 50;
  const [isServiceable, setIsServiceable] = useState(true);
  const [isCheckingShipping, setIsCheckingShipping] = useState(false);
  const [estimatedDeliveryDays, setEstimatedDeliveryDays] = useState(4);

  // Shiprocket Shipping Check
  useEffect(() => {
    const checkShipping = async () => {
      if (!selectedAddressId || cart.length === 0) return;
      const addr = addresses.find(a => a.id === selectedAddressId);
      if (!addr?.zipCode) return;

      setIsCheckingShipping(true);
      try {
        const totalWeight = cart.reduce((acc, item) => acc + (0.5 * (item.quantity || 1)), 0);

        const res = await axiosInstance.get(
          `/shiprocket/serviceability?delivery_postcode=${addr.zipCode}&weight=${totalWeight}&cod=${paymentMethod === 'cod' ? 1 : 0}`
        );

        if (res.data?.success && res.data.data?.data?.available_courier_companies?.length > 0) {
          const courier = res.data.data.data.available_courier_companies[0];
          setIsServiceable(true);
          setEstimatedDeliveryDays(courier.etd_hours ? Math.ceil(courier.etd_hours / 24) : 4);
        } else {
          setIsServiceable(false);
        }
      } catch (err) {
        console.error("Failed to check serviceability", err);
        setIsServiceable(true);
      } finally {
        setIsCheckingShipping(false);
      }
    };

    const debounce = setTimeout(() => { checkShipping() }, 500);
    return () => clearTimeout(debounce);
  }, [selectedAddressId, cart, paymentMethod, addresses, cartTotal]);

  // Address lookup
  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem("meruveda_addresses");
    let loaded: Address[] = [];
    if (stored) {
      try {
        loaded = JSON.parse(stored);
      } catch (err) {
        console.error(err);
      }
    }
    if (loaded.length === 0 && user.id === "customer-1") {
      loaded = [
        {
          id: "addr-1",
          fullName: "Priya Sharma",
          addressLine: "Flat 402, Green Glen Layout, Bellandur",
          city: "Bengaluru",
          state: "Karnataka",
          zipCode: "560103",
          phone: "+91 98765 43210",
          type: "Home",
          isDefault: true,
        }
      ];
      localStorage.setItem("meruveda_addresses", JSON.stringify(loaded));
    }
    setAddresses(loaded);
    const def = loaded.find((a) => a.isDefault);
    if (def) {
      setSelectedAddressId(def.id);
    } else if (loaded.length > 0) {
      setSelectedAddressId(loaded[0].id);
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory">
        <Loader2 size={40} className="animate-spin text-gold" />
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container mx-auto px-6 py-24 text-center min-h-[60vh]">
        <Package size={48} className="text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-playfair font-bold text-deep-purple mb-4">Your cart is empty</h2>
        <p className="text-gray-600 mb-8">Add products to your cart before proceeding to checkout.</p>
        <Link href="/products" className="bg-gold text-deep-purple px-8 py-3 rounded-lg font-bold hover:bg-gold-light transition-colors">
          Browse Products
        </Link>
      </div>
    );
  }

  // Calculate pricing (INR ₹)
  const subtotal = cartTotal;
  const discountAmount = appliedDiscount.percent
    ? (subtotal * appliedDiscount.percent) / 100
    : appliedDiscount.amount;

  // Calculate GST per item
  let gstAmount = 0;
  cart.forEach((item) => {
    const itemPrice = item.price || 0;
    const itemQty = item.quantity || 1;
    const itemTotal = itemPrice * itemQty;
    const itemGstPercent = item.gst !== undefined ? item.gst : 5; // Default to 5% instead of 18%
    const itemGstRate = itemGstPercent / 100;
    const itemDiscount = subtotal > 0 ? (discountAmount * itemTotal) / subtotal : 0;
    const itemTaxable = itemTotal - itemDiscount;
    const itemGst = (itemTaxable * itemGstRate) / (1 + itemGstRate);
    gstAmount += itemGst;
  });

  // Calculate GST on shipping if enabled
  if (SHIPPING_IS_TAXABLE && shippingCharges > 0) {
    const shippingGstPercent = 18;
    const shippingGstRate = shippingGstPercent / 100;
    const shippingGst = (shippingCharges * shippingGstRate) / (1 + shippingGstRate);
    gstAmount += shippingGst;
  }

  const uniqueGstRates = Array.from(new Set(cart.map(item => item.gst !== undefined ? item.gst : 5)));
  const singleGstRate = uniqueGstRates.length === 1 ? uniqueGstRates[0] : null;

  const codCharges = paymentMethod === "cod" ? 50 : 0;
  const finalTotal = subtotal - discountAmount + shippingCharges + codCharges;

  // Address Addition
  const handleAddNewAddress = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Address = {
      id: `addr-${Date.now()}`,
      ...addressForm,
      isDefault: addresses.length === 0,
    };
    const updated = [...addresses, created];
    setAddresses(updated);
    localStorage.setItem("meruveda_addresses", JSON.stringify(updated));
    setSelectedAddressId(created.id);
    setShowNewAddressForm(false);
    setAddressForm({
      fullName: "",
      addressLine: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      type: "Home",
    });
  };

  // Coupon Validation
  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError("");
    const cleanCode = couponCode.trim().toUpperCase();
    if (!cleanCode) return;

    try {
      const res = await axiosInstance.post('/coupons/validate', { code: cleanCode, orderValue: cartTotal });
      const coupon = res.data.data;

      let amount = 0;
      let percent = 0;

      if (coupon.type === 'percentage') {
        percent = coupon.value;
      } else if (coupon.type === 'fixed') {
        amount = coupon.value;
      } else if (coupon.type === 'free_shipping') {
        amount = shippingCharges;
      }

      setAppliedDiscount({ code: cleanCode, amount, percent });
    } catch (error: any) {
      setCouponError(error.response?.data?.error?.message || "Invalid coupon code.");
    }
  };

  // Submit form POST to PayU Hosted Checkout URL
  const postToPayU = (actionUrl: string, params: Record<string, string>) => {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = actionUrl;

    Object.keys(params).forEach((key) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = key;
      input.value = params[key];
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  // Place Order / Pay Action
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      alert("Please select a shipping address.");
      return;
    }

    if (!isServiceable) {
      alert("Delivery is not available for this pincode.");
      return;
    }

    setIsPlacingOrder(true);
    const selectedAddr = addresses.find((a) => a.id === selectedAddressId)!;

    const baseCheckoutPayload = {
      items: cart.map(item => ({
        product_id: item.id,
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price,
      })),
      subtotal: subtotal,
      discount: discountAmount,
      shipping_cost: shippingCharges + codCharges,
      tax: gstAmount,
      total: finalTotal,
      notes: orderNotes,
      shipping_address: {
        fullName: selectedAddr.fullName,
        addressLine: selectedAddr.addressLine,
        city: selectedAddr.city,
        state: selectedAddr.state,
        zipCode: selectedAddr.zipCode,
        phone: selectedAddr.phone
      },
      billing_address: {
        fullName: selectedAddr.fullName,
        addressLine: selectedAddr.addressLine,
        city: selectedAddr.city,
        state: selectedAddr.state,
        zipCode: selectedAddr.zipCode,
        phone: selectedAddr.phone
      }
    };

    try {
      if (paymentMethod === "payu") {
        // Initiate PayU Hosted Checkout on Server
        // NOTE: Cart is NOT cleared here — it's only cleared on the success page
        // after the backend verifies the payment hash and updates order status.
        const response = await axiosInstance.post('/payu/initiate', {
          checkoutPayload: baseCheckoutPayload
        });

        const { payuParams } = response.data.data;

        // Auto submit POST to PayU hosted page (user leaves site)
        const { actionUrl, ...fields } = payuParams;
        postToPayU(actionUrl, fields);
        // Note: setIsPlacingOrder(false) is intentionally NOT called here
        // because the page navigates away immediately after form submit.
      } else {
        // Cash on Delivery — create order and redirect to success page
        const orderData = {
          ...baseCheckoutPayload,
          payment_method: "Cash On Delivery"
        };
        const response = await axiosInstance.post('/orders', orderData);
        const createdOrder = response.data.data;
        // Cart is cleared by success page on load
        router.push(`/checkout/success/${createdOrder.id}`);
      }
    } catch (err: any) {
      console.error("Order processing error", err);
      alert(err.response?.data?.error?.message || "Failed to process order. Please try again.");
      setIsPlacingOrder(false);
    }
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all text-sm";
  const labelClass = "block text-gray-700 font-medium mb-1 text-xs";

  return (
    <div className="container mx-auto px-6 py-12 md:py-24">
      <div className="flex items-center gap-2 text-xs text-gray-400 mb-8 border-b border-gray-100 pb-4">
        <Link href="/cart" className="hover:text-gold">Cart</Link>
        <ChevronRight size={12} />
        <span className="text-deep-purple font-semibold">Checkout</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Side: Steps */}
        <div className="lg:col-span-2 space-y-8">

          {/* STEP 1: SHIPPING ADDRESS */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-playfair font-bold text-deep-purple mb-6 flex items-center gap-2">
              <span className="w-6 h-6 bg-deep-purple text-white rounded-full text-xs flex items-center justify-center font-sans">1</span>
              Shipping Address
            </h2>

            {addresses.length > 0 && !showNewAddressForm && (
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`p-4 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${selectedAddressId === addr.id
                        ? "border-gold bg-gold/5"
                        : "border-gray-100 hover:border-gray-200"
                        }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="selectedAddress"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="accent-gold mt-1"
                        />
                        <div className="text-xs text-gray-600">
                          <p className="font-bold text-deep-purple text-sm mb-1">{addr.fullName} ({addr.type})</p>
                          <p>{addr.addressLine}</p>
                          <p>{addr.city}, {addr.state} - {addr.zipCode}</p>
                          <p className="mt-1">Phone: {addr.phone}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>

                <button
                  onClick={() => setShowNewAddressForm(true)}
                  className="text-xs text-gold hover:text-gold-light font-bold flex items-center gap-1 mt-2"
                >
                  <Plus size={14} /> Add New Address
                </button>
              </div>
            )}

            {(addresses.length === 0 || showNewAddressForm) && (
              <form onSubmit={handleAddNewAddress} className="space-y-4 border border-gray-100 p-4 rounded-xl">
                <h4 className="text-xs font-bold text-deep-purple uppercase tracking-wider">New Shipping Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Full Name</label>
                    <input
                      type="text"
                      required
                      value={addressForm.fullName}
                      onChange={(e) => setAddressForm(p => ({ ...p, fullName: e.target.value }))}
                      className={inputClass}
                      placeholder="Priya Sharma"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <input
                      type="text"
                      required
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm(p => ({ ...p, phone: e.target.value }))}
                      className={inputClass}
                      placeholder="+91 98765 43210"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Street Address</label>
                  <input
                    type="text"
                    required
                    value={addressForm.addressLine}
                    onChange={(e) => setAddressForm(p => ({ ...p, addressLine: e.target.value }))}
                    className={inputClass}
                    placeholder="Apartment, building, street, colony..."
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>City</label>
                    <input
                      type="text"
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm(p => ({ ...p, city: e.target.value }))}
                      className={inputClass}
                      placeholder="Bengaluru"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>State</label>
                    <input
                      type="text"
                      required
                      value={addressForm.state}
                      onChange={(e) => setAddressForm(p => ({ ...p, state: e.target.value }))}
                      className={inputClass}
                      placeholder="Karnataka"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>ZIP Code</label>
                    <input
                      type="text"
                      required
                      value={addressForm.zipCode}
                      onChange={(e) => setAddressForm(p => ({ ...p, zipCode: e.target.value }))}
                      className={inputClass}
                      placeholder="560103"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-4">
                    {["Home", "Work"].map((type) => (
                      <label key={type} className="flex items-center gap-1 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name="newAddressType"
                          checked={addressForm.type === type}
                          onChange={() => setAddressForm(p => ({ ...p, type }))}
                          className="accent-gold"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowNewAddressForm(false)}
                        className="px-3 py-1.5 border border-gray-200 text-xs font-semibold rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-deep-purple text-white px-4 py-1.5 text-xs font-bold rounded-lg hover:bg-deep-purple/90"
                    >
                      Use Address
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* STEP 2: PAYMENT METHOD */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h2 className="text-xl font-playfair font-bold text-deep-purple mb-6 flex items-center gap-2">
              <span className="w-6 h-6 bg-deep-purple text-white rounded-full text-xs flex items-center justify-center font-sans">2</span>
              Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* Pay Online Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod("payu")}
                className={`p-5 border rounded-2xl flex flex-col items-start gap-3 transition-all text-left relative overflow-hidden ${paymentMethod === "payu"
                  ? "border-gold bg-gold/5 ring-1 ring-gold/30"
                  : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <CreditCard size={22} className={paymentMethod === "payu" ? "text-gold" : "text-gray-400"} />
                    <span className="font-bold text-sm text-deep-purple">Pay Online (via PayU)</span>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "payu"}
                    onChange={() => setPaymentMethod("payu")}
                    className="accent-gold"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Pay securely via Credit/Debit Cards, UPI, NetBanking, and Wallets on PayU's encrypted payment page.
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold pt-1">
                  <ShieldCheck size={12} className="text-green-600" /> 256-bit SSL Encrypted by PayU
                </div>
              </button>

              {/* Cash on Delivery Option */}
              <button
                type="button"
                onClick={() => setPaymentMethod("cod")}
                className={`p-5 border rounded-2xl flex flex-col items-start gap-3 transition-all text-left relative overflow-hidden ${paymentMethod === "cod"
                  ? "border-gold bg-gold/5 ring-1 ring-gold/30"
                  : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Truck size={22} className={paymentMethod === "cod" ? "text-gold" : "text-gray-400"} />
                    <span className="font-bold text-sm text-deep-purple">Cash on Delivery</span>
                  </div>
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === "cod"}
                    onChange={() => setPaymentMethod("cod")}
                    className="accent-gold"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Pay cash at your doorstep upon order delivery. Additional ₹50 COD handling fee applies.
                </p>
              </button>
            </div>
          </div>

          {/* STEP 3: ORDER NOTES */}
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-bold text-deep-purple mb-2">Order Notes (Optional)</h3>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Special instructions for delivery (e.g. leave at door, call before delivery)..."
              className="w-full border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-gold"
              rows={3}
            />
          </div>
        </div>

        {/* Right Side: Order Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-24">
            <h3 className="text-lg font-playfair font-bold text-deep-purple mb-4 border-b border-gray-100 pb-3">
              Order Summary
            </h3>

            {/* Cart Items List */}
            <div className="max-h-60 overflow-y-auto space-y-3 mb-6 pr-1">
              {cart.map((item) => (
                <div key={item.id} className="flex gap-3 text-xs">
                  <div className="w-12 h-12 bg-ivory rounded-lg overflow-hidden shrink-0 border border-gray-100 flex items-center justify-center font-bold text-gold">
                    {item.name ? item.name.substring(0, 2).toUpperCase() : 'MV'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-deep-purple truncate">{item.name}</p>
                    <p className="text-gray-400">Qty: {item.quantity || 1}</p>
                  </div>
                  <p className="font-bold text-deep-purple">₹{((item.price || 0) * (item.quantity || 1)).toFixed(2)}</p>
                </div>
              ))}
            </div>

            {/* Coupon Code Section */}
            <form onSubmit={handleApplyCoupon} className="mb-6">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Have a promo code?</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="COUPON CODE"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-xs outline-none uppercase font-mono focus:border-gold"
                />
                <button
                  type="submit"
                  className="bg-deep-purple text-white px-4 py-1.5 text-xs font-bold rounded-lg hover:bg-deep-purple/90"
                >
                  Apply
                </button>
              </div>
              {appliedDiscount.code && (
                <p className="text-[11px] text-green-600 mt-1 font-semibold">
                  Applied: {appliedDiscount.code} (-₹{discountAmount.toFixed(2)})
                </p>
              )}
              {couponError && (
                <p className="text-[11px] text-red-500 mt-1 font-medium">{couponError}</p>
              )}
            </form>

            {/* Pricing Breakdown */}
            <div className="space-y-2.5 text-xs border-t border-gray-100 pt-4 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-green-600 font-medium">
                  <span>Discount</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping Fee</span>
                <span>{shippingCharges === 0 ? <span className="text-green-600 font-bold">FREE</span> : `₹${shippingCharges.toFixed(2)}`}</span>
              </div>
              {paymentMethod === "cod" && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>COD Handling Fee</span>
                  <span>₹50.00</span>
                </div>
              )}

              {(() => {
                const selectedAddr = addresses.find((a) => a.id === selectedAddressId);
                const isIntraState = selectedAddr?.state ? isRajasthan(selectedAddr.state) : true;

                if (isIntraState) {
                  return (
                    <>
                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>CGST (Included)</span>
                        <span>₹{(gstAmount / 2).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-gray-500 text-[11px]">
                        <span>SGST (Included)</span>
                        <span>₹{(gstAmount / 2).toFixed(2)}</span>
                      </div>
                    </>
                  );
                } else {
                  return (
                    <div className="flex justify-between text-gray-500 text-[11px]">
                      <span>IGST (Included)</span>
                      <span>₹{gstAmount.toFixed(2)}</span>
                    </div>
                  );
                }
              })()}
              <div className="flex justify-between font-bold text-base text-deep-purple border-t border-gray-100 pt-3">
                <span>Total Amount</span>
                <span>₹{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Submit Action */}
            <button
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder || !isServiceable}
              className="w-full bg-gold text-deep-purple font-bold py-3.5 rounded-xl hover:bg-gold-light transition-all flex items-center justify-center gap-2 text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPlacingOrder ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing...
                </>
              ) : paymentMethod === "payu" ? (
                `Proceed to Pay Online (₹${finalTotal.toFixed(2)})`
              ) : (
                `Place COD Order (₹${finalTotal.toFixed(2)})`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
