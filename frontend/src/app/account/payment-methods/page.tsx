"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { CreditCard, Plus, Trash2 } from "lucide-react";

interface SavedCard {
  id: string;
  cardHolder: string;
  cardNumber: string; // masked, e.g. **** **** **** 4242
  cardType: "Visa" | "Mastercard" | "RuPay" | "Amex";
  expiry: string;
  isDefault: boolean;
}

export default function PaymentMethodsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState({
    cardHolder: "",
    cardNumber: "",
    expiry: "",
    cvv: "",
  });

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem("meruveda_cards");
    let items: SavedCard[] = [];
    if (stored) {
      try {
        items = JSON.parse(stored);
      } catch (err) {
        console.error(err);
      }
    }

    const defaultCards: SavedCard[] = [
      {
        id: "card-1",
        cardHolder: "Priya Sharma",
        cardNumber: "Visa ending in 4242",
        cardType: "Visa",
        expiry: "12/29",
        isDefault: true,
      },
    ];

    if (items.length === 0 && user.id === "customer-1") {
      localStorage.setItem("meruveda_cards", JSON.stringify(defaultCards));
      setCards(defaultCards);
    } else {
      setCards(items.length > 0 ? items : (user.id === "customer-1" ? defaultCards : []));
    }
  }, [user]);

  const handleSetDefault = (id: string) => {
    const updated = cards.map((card) => ({
      ...card,
      isDefault: card.id === id,
    }));
    setCards(updated);
    localStorage.setItem("meruveda_cards", JSON.stringify(updated));
  };

  const handleDelete = (id: string) => {
    const updated = cards.filter((card) => card.id !== id);
    setCards(updated);
    localStorage.setItem("meruveda_cards", JSON.stringify(updated));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mask number
    const lastDigits = newCard.cardNumber.replace(/\s/g, "").slice(-4);
    const cardType = newCard.cardNumber.startsWith("4") ? "Visa" : newCard.cardNumber.startsWith("5") ? "Mastercard" : "RuPay";
    
    const created: SavedCard = {
      id: `card-${Date.now()}`,
      cardHolder: newCard.cardHolder,
      cardNumber: `${cardType} ending in ${lastDigits}`,
      cardType: cardType as SavedCard["cardType"],
      expiry: newCard.expiry,
      isDefault: cards.length === 0,
    };
    const updated = [...cards, created];
    setCards(updated);
    localStorage.setItem("meruveda_cards", JSON.stringify(updated));
    setShowAddForm(false);
    setNewCard({
      cardHolder: "",
      cardNumber: "",
      expiry: "",
      cvv: "",
    });
  };

  const inputClass =
    "w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 transition-all text-sm";
  const labelClass = "block text-gray-700 font-medium mb-1 text-xs";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-playfair font-bold text-deep-purple mb-1">Payment Methods</h1>
          <p className="text-gray-500 text-sm">Manage credit and debit card information.</p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-deep-purple text-white hover:bg-deep-purple/90 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Plus size={14} /> Add New Card
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleAddSubmit} className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100 mb-8 max-w-xl animate-in slide-in-from-top duration-300">
          <h3 className="font-playfair font-bold text-deep-purple text-lg mb-4">Add Card</h3>
          <div className="mb-4">
            <label className={labelClass}>Cardholder Name</label>
            <input
              type="text"
              required
              value={newCard.cardHolder}
              onChange={(e) => setNewCard((p) => ({ ...p, cardHolder: e.target.value }))}
              className={inputClass}
              placeholder="Priya Sharma"
            />
          </div>

          <div className="mb-4">
            <label className={labelClass}>Card Number</label>
            <input
              type="text"
              required
              maxLength={19}
              value={newCard.cardNumber}
              onChange={(e) => setNewCard((p) => ({ ...p, cardNumber: e.target.value }))}
              className={inputClass}
              placeholder="4111 2222 3333 4444"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className={labelClass}>Expiration Date</label>
              <input
                type="text"
                required
                maxLength={5}
                value={newCard.expiry}
                onChange={(e) => setNewCard((p) => ({ ...p, expiry: e.target.value }))}
                className={inputClass}
                placeholder="MM/YY"
              />
            </div>
            <div>
              <label className={labelClass}>CVV</label>
              <input
                type="password"
                required
                maxLength={4}
                value={newCard.cvv}
                onChange={(e) => setNewCard((p) => ({ ...p, cvv: e.target.value }))}
                className={inputClass}
                placeholder="•••"
              />
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
              Add Card
            </button>
          </div>
        </form>
      )}

      {cards.length === 0 ? (
        <div className="text-center py-16 bg-ivory/50 rounded-2xl border border-dashed border-gray-200">
          <CreditCard size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="font-playfair font-bold text-deep-purple text-lg mb-1">No saved cards</h3>
          <p className="text-sm text-gray-500">Save a card to speed up future checkouts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`p-6 rounded-2xl border bg-white shadow-sm flex flex-col justify-between transition-all ${
                card.isDefault ? "border-gold bg-gold/5" : "border-gray-100"
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-6 bg-deep-purple rounded flex items-center justify-center text-white text-[9px] font-bold tracking-widest uppercase">
                      {card.cardType}
                    </div>
                    <span className="font-semibold text-deep-purple text-sm">{card.cardType} Card</span>
                    {card.isDefault && (
                      <span className="bg-gold/15 text-gold text-[10px] font-bold px-2 py-0.5 rounded-full border border-gold/30">
                        Default
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(card.id)}
                    className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                    aria-label="Delete card"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <p className="text-sm font-semibold text-gray-800 tracking-wider mb-2">
                  {card.cardNumber}
                </p>
                <div className="flex justify-between text-xs text-gray-500">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Card Holder</p>
                    <p className="font-medium text-gray-800">{card.cardHolder}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">Expires</p>
                    <p className="font-medium text-gray-800">{card.expiry}</p>
                  </div>
                </div>
              </div>

              {!card.isDefault && (
                <button
                  onClick={() => handleSetDefault(card.id)}
                  className="mt-6 text-xs text-gold hover:text-gold-light font-bold text-left transition-colors"
                >
                  Set as Default Payment Method
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
