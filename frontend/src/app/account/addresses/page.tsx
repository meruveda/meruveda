"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { MapPin, Plus, Trash2, Home, Briefcase } from "lucide-react";

interface Address {
  id: string;
  fullName: string;
  addressLine: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  type: "Home" | "Work" | "Other";
  isDefault: boolean;
}

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: "",
    addressLine: "",
    city: "",
    state: "",
    zipCode: "",
    phone: "",
    type: "Home" as Address["type"],
  });

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem("meruveda_addresses");
    let items: Address[] = [];
    if (stored) {
      try {
        items = JSON.parse(stored);
      } catch (err) {
        console.error(err);
      }
    }

    const defaultAddresses: Address[] = [
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
      },
      {
        id: "addr-2",
        fullName: "Priya Sharma",
        addressLine: "Embassy Tech Village, Block 2B, Outer Ring Road",
        city: "Bengaluru",
        state: "Karnataka",
        zipCode: "560103",
        phone: "+91 98765 43210",
        type: "Work",
        isDefault: false,
      },
    ];

    const customerAddresses = items.filter((a) => a.fullName === user.firstName + " " + user.lastName || a.fullName === "Priya Sharma");
    if (customerAddresses.length === 0 && user.id === "customer-1") {
      localStorage.setItem("meruveda_addresses", JSON.stringify(defaultAddresses));
      setAddresses(defaultAddresses);
    } else {
      setAddresses(items.length > 0 ? items : (user.id === "customer-1" ? defaultAddresses : []));
    }
  }, [user]);

  const handleSetDefault = (id: string) => {
    const updated = addresses.map((addr) => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    setAddresses(updated);
    localStorage.setItem("meruveda_addresses", JSON.stringify(updated));
  };

  const handleDelete = (id: string) => {
    const updated = addresses.filter((addr) => addr.id !== id);
    setAddresses(updated);
    localStorage.setItem("meruveda_addresses", JSON.stringify(updated));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created: Address = {
      id: `addr-${Date.now()}`,
      ...newAddress,
      isDefault: addresses.length === 0,
    };
    const updated = [...addresses, created];
    setAddresses(updated);
    localStorage.setItem("meruveda_addresses", JSON.stringify(updated));
    setShowAddForm(false);
    setNewAddress({
      fullName: "",
      addressLine: "",
      city: "",
      state: "",
      zipCode: "",
      phone: "",
      type: "Home",
    });
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all text-sm";
  const labelClass = "block text-gray-700 font-medium mb-1 text-xs";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-playfair font-bold text-deep-purple mb-1">Saved Addresses</h1>
          <p className="text-gray-500 text-sm">Manage shipping and billing locations.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-deep-purple text-white hover:bg-deep-purple/90 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> Add New Address
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 mb-8 max-w-xl animate-in slide-in-from-top duration-300">
          <h3 className="font-playfair font-bold text-deep-purple text-lg mb-4">Add Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className={labelClass}>Full Name</label>
              <input
                type="text"
                required
                value={newAddress.fullName}
                onChange={(e) => setNewAddress((p) => ({ ...p, fullName: e.target.value }))}
                className={inputClass}
                placeholder="Priya Sharma"
              />
            </div>
            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                type="text"
                required
                value={newAddress.phone}
                onChange={(e) => setNewAddress((p) => ({ ...p, phone: e.target.value }))}
                className={inputClass}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass}>Street Address</label>
            <input
              type="text"
              required
              value={newAddress.addressLine}
              onChange={(e) => setNewAddress((p) => ({ ...p, addressLine: e.target.value }))}
              className={inputClass}
              placeholder="Apartment, suite, building, street, etc."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                required
                value={newAddress.city}
                onChange={(e) => setNewAddress((p) => ({ ...p, city: e.target.value }))}
                className={inputClass}
                placeholder="Bengaluru"
              />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input
                type="text"
                required
                value={newAddress.state}
                onChange={(e) => setNewAddress((p) => ({ ...p, state: e.target.value }))}
                className={inputClass}
                placeholder="Karnataka"
              />
            </div>
            <div>
              <label className={labelClass}>ZIP Code</label>
              <input
                type="text"
                required
                value={newAddress.zipCode}
                onChange={(e) => setNewAddress((p) => ({ ...p, zipCode: e.target.value }))}
                className={inputClass}
                placeholder="560103"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className={labelClass}>Address Type</label>
            <div className="flex gap-4">
              {["Home", "Work", "Other"].map((type) => (
                <label key={type} className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="radio"
                    name="addressType"
                    checked={newAddress.type === type}
                    onChange={() => setNewAddress((p) => ({ ...p, type: type as Address["type"] }))}
                    className="accent-gold"
                  />
                  {type}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-200 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-deep-purple text-white hover:bg-deep-purple/90 rounded-lg text-xs font-semibold transition-colors"
            >
              Add Address
            </button>
          </div>
        </form>
      )}

      {addresses.length === 0 ? (
        <div className="text-center py-16 bg-ivory/50 rounded-2xl border border-dashed border-gray-200">
          <MapPin size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="font-playfair font-bold text-deep-purple text-lg mb-1">No addresses saved</h3>
          <p className="text-sm text-gray-500">Add an address to speed up checkout.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`p-6 rounded-2xl border bg-white shadow-sm flex flex-col justify-between transition-all ${
                addr.isDefault ? "border-gold bg-gold/5" : "border-gray-100"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    {addr.type === "Home" ? (
                      <Home size={16} className="text-gold" />
                    ) : addr.type === "Work" ? (
                      <Briefcase size={16} className="text-gold" />
                    ) : (
                      <MapPin size={16} className="text-gold" />
                    )}
                    <span className="font-bold text-deep-purple text-sm">{addr.type} Address</span>
                    {addr.isDefault && (
                      <span className="bg-gold/15 text-gold text-[10px] font-bold px-2 py-0.5 rounded-full border border-gold/30">
                        Default
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(addr.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    aria-label="Delete address"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <p className="font-bold text-deep-purple text-sm mb-1">{addr.fullName}</p>
                <p className="text-xs text-gray-600 leading-relaxed">{addr.addressLine}</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {addr.city}, {addr.state} - {addr.zipCode}
                </p>
                <p className="text-xs text-gray-500 mt-2">Phone: {addr.phone}</p>
              </div>

              {!addr.isDefault && (
                <button
                  onClick={() => handleSetDefault(addr.id)}
                  className="mt-6 text-xs text-gold hover:text-gold-light font-bold text-left transition-colors"
                >
                  Set as Default Address
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
