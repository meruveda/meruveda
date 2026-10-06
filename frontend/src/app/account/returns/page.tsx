"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, RotateCcw } from "lucide-react";
import { addressService, orderService, returnService } from "@/services/accountService";
import type { AccountAddress, AccountOrder, ReturnRequest } from "@/types/account";
import { EmptyState, LoadingRow, Notice, SectionHeader, StatusBadge, prettyStatus } from "@/components/account/ui";
import { RETURN_FLOW } from "@/types/account";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

const fmt = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

function ReturnsInner() {
  const search = useSearchParams();
  const preselectOrder = search.get("order") || "";
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [addresses, setAddresses] = useState<AccountAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Wizard state — the 6-step return flow.
  const [selOrderNum, setSelOrderNum] = useState(preselectOrder);
  const [selProductId, setSelProductId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [pickupId, setPickupId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [myOrders] = await Promise.all([
          orderService.myOrders().catch(() => [] as AccountOrder[]),
        ]);
        setOrders(myOrders);
        let support: Ticket[] = [];
        try {
          const { default: axiosInstance } = await import("@/api/axiosInstance");
          const res = await axiosInstance.get("/support/my");
          const all: Ticket[] = res.data?.data || [];
          support = all.filter((t) => /return|refund|replac|cancel/i.test(`${t.subject} ${t.message}`));
        } catch {
          /* support history optional */
        }
        setTickets(support);
        setReturns(returnService.list());
        setAddresses(addressService.list());
        if (preselectOrder) setShowForm(true);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const eligibleOrders = useMemo(
    () => orders.filter((o) => o.normalizedStatus === "delivered"),
    [orders],
  );
  const selOrder = eligibleOrders.find((o) => o.orderNumber === selOrderNum);
  const selProduct = selOrder?.items.find((i) => i.productId === selProductId) || selOrder?.items[0];
  const refundPreview = selProduct ? selProduct.price * selProduct.quantity : 0;

  useEffect(() => {
    if (selOrder && !selProductId && selOrder.items[0]) setSelProductId(selOrder.items[0].productId);
  }, [selOrder, selProductId]);

  const submitReturn = (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);
    if (!selOrder) {
      setFormError("Choose the delivered order this return belongs to.");
      return;
    }
    if (!reason) {
      setFormError("Select a reason for the return.");
      return;
    }
    if (!pickupId && addresses.length > 0) {
      setFormError("Choose the pickup address for the courier.");
      return;
    }
    setSubmitting(true);
    try {
      const created = returnService.create({
        orderId: selOrder.id,
        orderNumber: selOrder.orderNumber,
        productId: selProduct?.productId,
        productName: selProduct?.name || "Order items",
        productImage: selProduct?.image,
        reason,
        description: description.trim(),
        pickupAddressId: pickupId || undefined,
        refundAmount: refundPreview,
      });
      void created;
      setReturns(returnService.list());
      setShowForm(false);
      setSelOrderNum("");
      setSelProductId("");
      setReason("");
      setDescription("");
      setImageUrls("");
      setPickupId("");
      setNotice("Return request submitted. Pickup and refund updates will appear here.");
      setTimeout(() => setNotice(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingRow label="Loading return history…" />;

  const input = "w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:border-gold focus:ring-1 focus:ring-gold/30 text-sm";
  const label = "block text-gray-700 font-medium mb-1.5 text-xs";

  return (
    <div>
      <SectionHeader
        title="Returns & Refunds"
        subtitle={<>7-day easy returns on delivered orders. Read the <Link href="/returns" className="text-gold font-semibold hover:underline">return policy</Link>.</>}
        action={
          !showForm && eligibleOrders.length > 0 ? (
            <button onClick={() => setShowForm(true)} className="bg-deep-purple text-white hover:bg-deep-purple/90 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap">
              <Plus size={14} /> Request a Return
            </button>
          ) : undefined
        }
      />

      {notice && <Notice>{notice}</Notice>}

      {showForm && (
        <form onSubmit={submitReturn} noValidate className="bg-gray-50/50 p-5 md:p-6 rounded-2xl border border-gray-100 mb-8 space-y-4 max-w-2xl">
          <h3 className="font-playfair font-bold text-deep-purple text-lg">New return request</h3>
          {formError && <p className="p-3 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 font-medium" role="alert">{formError}</p>}

          {eligibleOrders.length === 0 ? (
            <p className="text-sm text-gray-500">Only delivered orders can be returned. Nothing is eligible right now.</p>
          ) : (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className={label} htmlFor="rt-order">1 · Select order *</label>
                  <select id="rt-order" className={input} value={selOrderNum} onChange={(e) => { setSelOrderNum(e.target.value); setSelProductId(""); }}>
                    <option value="">Choose order…</option>
                    {eligibleOrders.map((o) => (
                      <option key={o.id} value={o.orderNumber}>{o.orderNumber} — ₹{(o.total || 0).toFixed(2)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="rt-product">2 · Select product *</label>
                  <select id="rt-product" className={input} value={selProductId} onChange={(e) => setSelProductId(e.target.value)} disabled={!selOrder}>
                    {(selOrder?.items || []).map((i) => (
                      <option key={i.productId} value={i.productId}>{i.name} × {i.quantity}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={label} htmlFor="rt-reason">3 · Return reason *</label>
                <select id="rt-reason" className={input} value={reason} onChange={(e) => setReason(e.target.value)}>
                  <option value="">Choose a reason…</option>
                  {returnService.reasons.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={label} htmlFor="rt-desc">4 · Description <span className="text-gray-400">(optional)</span></label>
                <textarea id="rt-desc" className={input} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What arrived wrong? Add unboxing details…" />
              </div>

              <div>
                <label className={label} htmlFor="rt-imgs">5 · Photo proof <span className="text-gray-400">(optional, image URLs comma-separated)</span></label>
                <input id="rt-imgs" className={input} value={imageUrls} onChange={(e) => setImageUrls(e.target.value)} placeholder="https://… , https://…" inputMode="url" />
              </div>

              <div>
                <label className={label} htmlFor="rt-pickup">6 · Pickup address *</label>
                {addresses.length === 0 ? (
                  <p className="text-xs text-gray-500">No saved addresses — our courier will call you to arrange pickup. <Link href="/account/addresses" className="font-bold text-gold hover:underline">Add one</Link> for faster pickup.</p>
                ) : (
                  <select id="rt-pickup" className={input} value={pickupId} onChange={(e) => setPickupId(e.target.value)}>
                    <option value="">Choose pickup address…</option>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>{a.type} — {a.fullName}, {a.city} {a.pincode}</option>
                    ))}
                  </select>
                )}
              </div>

              {selProduct && (
                <p className="text-xs text-gray-600 bg-white border border-gray-100 rounded-lg px-4 py-3">
                  Expected refund: <span className="font-bold text-deep-purple">₹{refundPreview.toFixed(2)}</span> to the original payment method after quality check.
                </p>
              )}
            </>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={submitting || eligibleOrders.length === 0} className="px-5 py-2.5 bg-deep-purple text-white rounded-lg text-xs font-bold disabled:opacity-50 flex items-center gap-2">
              {submitting && <Loader2 size={14} className="animate-spin" />} Confirm return request
            </button>
          </div>
        </form>
      )}

      {returns.length === 0 && tickets.length === 0 ? (
        <EmptyState
          icon={RotateCcw}
          title="No returns yet"
          message="Delivered orders can be returned within 7 days. Your return and refund updates will show up here."
          ctaLabel={eligibleOrders.length > 0 ? "Request a Return" : "View My Orders"}
          ctaHref={eligibleOrders.length > 0 ? undefined : "/account/orders"}
          onCta={eligibleOrders.length > 0 ? () => setShowForm(true) : undefined}
        />
      ) : (
        <div className="space-y-8">
          {returns.length > 0 && (
            <div>
              <h3 className="font-bold text-deep-purple text-xs uppercase tracking-wider mb-3">Return requests ({returns.length})</h3>
              <div className="space-y-3">
                {returns.map((r) => {
                  const stepIdx = RETURN_FLOW.findIndex((s) => s.key === r.status);
                  return (
                    <div key={r.id} className="border border-gray-100 rounded-2xl p-5 bg-white">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-bold text-deep-purple text-sm">{r.productName}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Order {r.orderNumber} · Requested {fmt(r.requestDate)} · Reason: {r.reason}</p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      {/* Return progress */}
                      <ol className="flex gap-1 mt-4 overflow-x-auto pb-1" aria-label={`Return progress: ${prettyStatus(r.status)}`}>
                        {RETURN_FLOW.map((s, i) => (
                          <li key={s.key} className="flex-1 min-w-[86px]">
                            <span className={`block h-1.5 rounded-full ${i <= stepIdx ? "bg-deep-purple" : "bg-gray-200"}`} />
                            <span className={`block text-[10px] font-semibold mt-1.5 leading-tight ${i <= stepIdx ? "text-deep-purple" : "text-gray-400"}`}>{s.label}</span>
                          </li>
                        ))}
                      </ol>
                      <div className="flex items-center justify-between gap-3 flex-wrap mt-4 pt-4 border-t border-gray-100 text-xs">
                        <p className="text-gray-500">
                          Refund <span className="font-bold text-deep-purple">₹{(r.refundAmount || 0).toFixed(2)}</span>
                          {" · "}
                          <span className="capitalize">{r.refundStatus === "na" ? "—" : r.refundStatus}</span>
                        </p>
                        {r.description && <p className="text-gray-500 italic max-w-md">“{r.description}”</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {tickets.length > 0 && (
            <div>
              <h3 className="font-bold text-deep-purple text-xs uppercase tracking-wider mb-3">Support-tracked requests ({tickets.length})</h3>
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div key={t.id} className="border border-gray-100 rounded-xl px-5 py-4 bg-white">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="font-bold text-deep-purple text-sm">{t.subject}</p>
                      <StatusBadge status={t.status} />
                    </div>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">{t.message}</p>
                    <p className="text-[11px] text-gray-400 mt-2">{fmt(t.created_at)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReturnsPage() {
  return (
    <Suspense fallback={<LoadingRow label="Loading return history…" />}>
      <ReturnsInner />
    </Suspense>
  );
}
