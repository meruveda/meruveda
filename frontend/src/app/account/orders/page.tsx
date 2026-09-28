"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import Image from "next/image";
import { Package, ChevronDown, ChevronUp, Download, Eye, ExternalLink, Truck } from "lucide-react";

interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
}

interface Order {
  id: string;
  customerId: string;
  orderNumber: string;
  invoiceNumber: string;
  date: string;
  paymentMethod: string;
  items: OrderItem[];
  total: number;
  status: string;
  estimatedDelivery: string;
  trackingNumber?: string;
  trackingUrl?: string;
  awbCode?: string;
  shipmentId?: string;
  courierName?: string;
  lastTrackingUpdate?: string;
  trackingHistory?: any[];
  shippingAddress: {
    fullName: string;
    addressLine: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
  };
}

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [downloadingInvoiceId, setDownloadingInvoiceId] = useState<string | null>(null);

  const handleDownloadInvoice = (order: Order) => {
    setDownloadingInvoiceId(order.id);

    // Set a small timeout to allow the state to update and the print component to render
    setTimeout(() => {
      window.print();
      setDownloadingInvoiceId(null);
    }, 100);
  };

  useEffect(() => {
    if (!user) return;

    const fetchOrders = async () => {
      try {
        const { default: axiosInstance } = await import('@/api/axiosInstance');
        const response = await axiosInstance.get('/orders/my');

        // Map backend format to frontend format
        const backendOrders = response.data.data;
        if (backendOrders && backendOrders.length > 0) {
          const mappedOrders = backendOrders.map((bo: any) => ({
            id: bo.id,
            customerId: bo.user_id,
            orderNumber: bo.order_number,
            invoiceNumber: bo.id,
            date: bo.created_at,
            paymentMethod: bo.payment_method,
            items: (bo.order_items || []).map((item: any) => ({
              id: item.product_id,
              name: item.products?.name || "Unknown Product",
              price: item.price,
              quantity: item.quantity,
              image: item.image_url || item.products?.images?.[0]?.url || item.products?.images?.[0] || "/images/placeholder-product.png"
            })),
            total: bo.total,
            status: bo.status,
            estimatedDelivery: bo.estimated_delivery || bo.created_at,
            trackingNumber: bo.tracking_number || bo.awb_code,
            trackingUrl: bo.tracking_url,
            awbCode: bo.awb_code,
            shipmentId: bo.shipment_id,
            courierName: bo.courier_name,
            lastTrackingUpdate: bo.last_tracking_update,
            trackingHistory: bo.order_tracking_history || [],
            shippingAddress: bo.shipping_address || {
              fullName: "N/A",
              addressLine: "N/A",
              city: "",
              state: "",
              zipCode: "",
              phone: ""
            }
          }));
          setOrders(mappedOrders);
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error("Failed to fetch orders", err);
      }
    };

    fetchOrders();
  }, [user]);

  const toggleExpand = (id: string) => {
    setExpandedOrder((prev) => (prev === id ? null : id));
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "confirmed":
      case "processing":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "shipped":
        return "bg-purple-50 text-purple-700 border-purple-100";
      case "delivered":
        return "bg-green-50 text-green-700 border-green-100";
      case "cancelled":
        return "bg-red-50 text-red-700 border-red-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  // Configurable company header info defaults
  const COMPANY_CONFIG = {
    name: 'MERUVEDA WELLNESS',
    addressLine1: 'Keharsh Enterprises (Sole Proprietorship)',
    addressLine2: 'S/N. 12, Viru City Gym Road, Inside Jalori Gate, Jodhpur - 342001, Rajasthan, India',
    phone: '+91 8097147463',
    email: 'customercare@meruvedawellness.com',
    website: 'meruvedawellness.com',
    gstin: '08BFPPS7045C1Z4'
  };

  const storeName = COMPANY_CONFIG.name;
  const storeAddress = `${COMPANY_CONFIG.addressLine1}\n${COMPANY_CONFIG.addressLine2}`;
  const storePhone = COMPANY_CONFIG.phone;
  const storeEmail = COMPANY_CONFIG.email;
  const storeWebsite = COMPANY_CONFIG.website;

  const orderToPrint = orders.find(o => o.id === downloadingInvoiceId);

  return (
    <div>
      <div className="print:hidden">
        <h1 className="text-3xl font-playfair font-bold text-deep-purple mb-2">My Orders</h1>
        <p className="text-gray-500 text-sm mb-8">Track shipments, download invoices, or buy items again.</p>

        {orders.length === 0 ? (
          <div className="text-center py-16 bg-ivory/50 rounded-2xl border border-dashed border-gray-200">
            <Package size={48} className="text-gray-400 mx-auto mb-4" />
            <h3 className="font-playfair font-bold text-deep-purple text-lg mb-1">No orders found</h3>
            <p className="text-sm text-gray-500">You haven&apos;t placed any orders yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const isExpanded = expandedOrder === order.id;
              return (
                <div key={order.id} className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm bg-white">
                  {/* Header Summary */}
                  <div className="bg-gray-50/70 px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100">
                    <div className="flex gap-8 text-xs text-gray-500">
                      <div>
                        <p className="font-semibold uppercase tracking-wider mb-1 text-[10px]">Order Placed</p>
                        <p className="font-medium text-gray-800">
                          {new Date(order.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="font-semibold uppercase tracking-wider mb-1 text-[10px]">Total</p>
                        <p className="font-medium text-gray-800">₹{(order.total || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="font-semibold uppercase tracking-wider mb-1 text-[10px]">Order #</p>
                        <p className="font-medium text-gray-800">{order.orderNumber}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                      <button
                        onClick={() => toggleExpand(order.id)}
                        className="p-1.5 hover:bg-gray-200 rounded-lg text-gray-500 transition-colors"
                        aria-label="Toggle details"
                      >
                        {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Main View: Items List */}
                  <div className="p-6">
                    <div className="space-y-4">
                      {order.items.map((item) => (
                        <div key={item.id} className="flex gap-4 items-center">
                          <div className="relative w-16 h-16 bg-gray-50 rounded border border-gray-100 flex-shrink-0">
                            {typeof item.image === 'string' && item.image ? (
                              <Image src={item.image} alt={item.name} fill className="object-contain p-1" />
                            ) : (
                              <Image src="/images/placeholder-product.png" alt={item.name} fill className="object-contain p-1" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-deep-purple truncate text-sm">{item.name}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Quantity: {item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-deep-purple text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                            <p className="text-[11px] text-gray-400">₹{item.price.toFixed(2)} each</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Expanded Detail view */}
                    {isExpanded && (
                      <div className="mt-6 pt-6 border-t border-gray-100 space-y-6 text-xs text-gray-600 animate-in fade-in duration-200">
                        <div className="grid md:grid-cols-2 gap-8">
                          <div>
                            <h5 className="font-bold text-deep-purple mb-2 uppercase tracking-wider text-[10px]">Shipping Details</h5>
                            <p className="font-semibold text-gray-800">{order.shippingAddress.fullName}</p>
                            <p>{order.shippingAddress.addressLine}</p>
                            <p>
                              {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.zipCode}
                            </p>
                            <p className="mt-1">Phone: {order.shippingAddress.phone}</p>
                          </div>
                          <div>
                            <h5 className="font-bold text-deep-purple mb-2 uppercase tracking-wider text-[10px]">Payment & Shipping Details</h5>
                            <p><span className="font-medium text-gray-500">Method:</span> {order.paymentMethod}</p>
                            <p><span className="font-medium text-gray-500">Invoice:</span> {order.invoiceNumber}</p>
                            {order.courierName && (
                              <p><span className="font-medium text-gray-500">Courier:</span> {order.courierName}</p>
                            )}
                            {order.awbCode ? (
                              <p className="mt-1 flex items-center gap-1.5 text-gold font-semibold">
                                <span className="text-gray-500 font-medium">AWB:</span> {order.awbCode}
                                {order.trackingUrl && (
                                  <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-deep-purple hover:underline ml-2">
                                    Track Live <ExternalLink size={11} />
                                  </a>
                                )}
                              </p>
                            ) : order.trackingNumber ? (
                              <p className="mt-1 flex items-center gap-1.5 text-gold font-semibold">
                                <span className="text-gray-500 font-medium">Tracking:</span> {order.trackingNumber} <ExternalLink size={11} />
                              </p>
                            ) : null}
                            <p className="mt-2 text-gray-500 italic">
                              Estimated Delivery: {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>

                        {/* Shiprocket Visual Shipment Stepper */}
                        <div className="bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                          <h5 className="font-bold text-deep-purple mb-4 uppercase tracking-wider text-[10px]">Shipment Status</h5>

                          {/* Stepper Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-8 gap-4 text-center">
                            {[
                              { name: 'Order Placed', checked: true },
                              { name: 'Payment Successful', checked: true },
                              { name: 'Packed', checked: ['Packed', 'Shipped', 'In Transit', 'Out For Delivery', 'Delivered'].includes(order.status) || !!order.awbCode },
                              { name: 'Courier Assigned', checked: !!order.awbCode },
                              { name: 'Picked Up', checked: ['Picked Up', 'Shipped', 'In Transit', 'Out For Delivery', 'Delivered'].includes(order.status) },
                              { name: 'In Transit', checked: ['In Transit', 'Out For Delivery', 'Delivered'].includes(order.status) },
                              { name: 'Out For Delivery', checked: ['Out For Delivery', 'Delivered'].includes(order.status) },
                              { name: 'Delivered', checked: order.status === 'Delivered' }
                            ].map((step, idx) => (
                              <div key={idx} className="flex flex-col items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step.checked ? 'bg-deep-purple text-white' : 'bg-gray-200 text-gray-400'
                                  }`}>
                                  {step.checked ? '✓' : idx + 1}
                                </div>
                                <p className={`mt-2 text-[10px] font-semibold leading-tight ${step.checked ? 'text-deep-purple' : 'text-gray-400'
                                  }`}>
                                  {step.name}
                                </p>
                              </div>
                            ))}
                          </div>

                          {/* Detailed Timeline logs */}
                          {order.trackingHistory && order.trackingHistory.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-gray-200">
                              <h6 className="font-semibold text-deep-purple text-[10px] uppercase tracking-wider mb-3">Live Updates</h6>
                              <div className="relative border-l-2 border-gray-200 pl-4 space-y-4 ml-2">
                                {[...order.trackingHistory]
                                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                  .map((log, lIdx) => (
                                    <div key={lIdx} className="relative">
                                      <span className="absolute -left-[21px] top-1 bg-deep-purple h-2 w-2 rounded-full border border-white" />
                                      <div className="text-[11px]">
                                        <p className="font-bold text-gray-800">{log.activity}</p>
                                        {log.location && <p className="text-gray-400 text-[10px]">Location: {log.location}</p>}
                                        <p className="text-[10px] text-gray-400">
                                          {new Date(log.created_at).toLocaleDateString("en-IN", {
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit"
                                          })}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action row */}
                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
                      <p className="text-xs text-gray-500">
                        {order.status === "Delivered" ? "Delivered on " : "Arriving by "}
                        <span className="font-semibold text-deep-purple">
                          {new Date(order.estimatedDelivery).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        {order.trackingNumber && (
                          <span className="block mt-1 text-[11px] text-gray-400">
                            Tracking ID: <span className="font-mono font-semibold text-gray-600">{order.trackingNumber}</span>
                          </span>
                        )}
                      </p>
                      <div className="flex gap-2">
                        {order.trackingUrl ? (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-gold text-deep-purple hover:bg-gold-light rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Truck size={14} /> Track Order
                          </a>
                        ) : order.trackingNumber ? (
                          <a
                            href={`https://shiprocket.co/tracking/${order.trackingNumber}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 px-3 py-1.5 bg-gold text-deep-purple hover:bg-gold-light rounded-lg text-xs font-semibold transition-colors"
                          >
                            <Truck size={14} /> Track Order
                          </a>
                        ) : null}
                        <button
                          onClick={() => handleDownloadInvoice(order)}
                          disabled={downloadingInvoiceId === order.id}
                          className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 transition-colors disabled:opacity-50"
                        >
                          <Download size={14} /> {downloadingInvoiceId === order.id ? 'Downloading...' : 'Invoice'}
                        </button>
                        <button
                          onClick={() => toggleExpand(order.id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-deep-purple text-white hover:bg-deep-purple/90 rounded-lg text-xs font-semibold transition-colors"
                        >
                          <Eye size={14} /> {isExpanded ? "Hide Details" : "View Details"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Print Only Layout */}
      {orderToPrint && (
        <div className="hidden print:block w-full max-w-4xl mx-auto bg-white text-black font-sans text-sm pb-12 px-6">
          <div className="flex justify-between items-start mb-10 gap-8 border-b pb-6">
            <div className="flex flex-col items-start gap-4 max-w-[55%]">
              <img src="/logo_transparent.png" alt="MeruVeda Wellness Logo" className="h-14 w-auto object-contain" />
              <div>
                <h1 className="text-xl font-bold text-[#2B1820] tracking-wide font-serif">
                  {storeName}
                </h1>
                <div className="text-slate-600 text-xs space-y-0.5 mt-1.5 leading-relaxed">
                  {storeAddress.split('\n').map((line: string, idx: number) => (
                    <p key={idx}>{line}</p>
                  ))}
                  <p>Phone: {storePhone} | Email: {storeEmail}</p>
                  <p>Website: {storeWebsite}</p>
                  {COMPANY_CONFIG.gstin && COMPANY_CONFIG.gstin !== "GSTIN_PENDING" && (
                    <p className="font-semibold text-slate-800">GSTIN: {COMPANY_CONFIG.gstin}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0 max-w-[40%]">
              <h2 className="text-5xl font-extrabold uppercase mb-4 tracking-wider font-serif" style={{ color: '#C9A227' }}>Invoice</h2>
              <table className="ml-auto text-left border-collapse border border-slate-200 text-xs">
                <tbody>
                  <tr>
                    <td className="px-3 py-1.5 border border-slate-200 font-semibold bg-slate-100 uppercase">Date</td>
                    <td className="px-3 py-1.5 border border-slate-200 min-w-[120px] text-right">{new Date(orderToPrint.date).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 border border-slate-200 font-semibold bg-slate-100 uppercase">Invoice #</td>
                    <td className="px-3 py-1.5 border border-slate-200 text-right font-mono">{orderToPrint.orderNumber}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 border border-slate-200 font-semibold bg-slate-100 uppercase">AWB / Tracking #</td>
                    <td className="px-3 py-1.5 border border-slate-200 text-right font-mono">
                      {orderToPrint.awbCode || orderToPrint.trackingNumber || <span className="text-red-500 font-semibold">[Missing Data]</span>}
                    </td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 border border-slate-200 font-semibold bg-slate-100 uppercase">Customer ID</td>
                    <td className="px-3 py-1.5 border border-slate-200 text-right">{orderToPrint.customerId === 'guest' ? 'GUEST' : orderToPrint.customerId?.substring(0, 8)}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-1.5 border border-slate-200 font-semibold bg-slate-100 uppercase">Due Date</td>
                    <td className="px-3 py-1.5 border border-slate-200 text-right">{new Date(orderToPrint.date).toLocaleDateString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-10 w-1/2">
            <h3 className="text-white font-bold uppercase text-xs tracking-wider" style={{ backgroundColor: '#4C1D5B', color: '#FFFFFF', padding: '6px 12px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Bill To</h3>
            <div className="border border-slate-200 border-t-0 p-3 text-slate-800 text-xs leading-relaxed bg-[#fbfbfc]">
              {orderToPrint.shippingAddress?.fullName ? (
                <>
                  <p className="font-bold text-slate-900">{orderToPrint.shippingAddress?.fullName}</p>
                  <p>{orderToPrint.shippingAddress?.addressLine}</p>
                  <p>
                    {orderToPrint.shippingAddress?.city}, {orderToPrint.shippingAddress?.state} {orderToPrint.shippingAddress?.zipCode}
                  </p>
                  <p className="font-semibold mt-1">Phone: {orderToPrint.shippingAddress?.phone}</p>
                </>
              ) : (
                <span className="text-red-500 font-semibold">[Missing Customer Address Data]</span>
              )}
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left mb-10 border-collapse border border-slate-200 text-xs">
            <thead>
              <tr style={{ backgroundColor: '#4C1D5B', color: '#FFFFFF', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                <th className="border border-slate-200" style={{ backgroundColor: '#4C1D5B', color: '#FFFFFF', padding: '6px 12px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Description</th>
                <th className="border border-slate-200 text-center w-[120px]" style={{ backgroundColor: '#4C1D5B', color: '#FFFFFF', padding: '6px 12px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>SKU</th>
                <th className="border border-slate-200 text-center w-[60px]" style={{ backgroundColor: '#4C1D5B', color: '#FFFFFF', padding: '6px 12px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Qty</th>
                <th className="border border-slate-200 text-center w-[60px]" style={{ backgroundColor: '#4C1D5B', color: '#FFFFFF', padding: '6px 12px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Taxed</th>
                <th className="border border-slate-200 text-right w-[120px]" style={{ backgroundColor: '#4C1D5B', color: '#FFFFFF', padding: '6px 12px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {orderToPrint.items.length > 0 ? (
                orderToPrint.items.map((item: any, idx: number) => {
                  const isEven = idx % 2 !== 0;
                  const rowBg = isEven ? '#F5F0F7' : '#FFFFFF';
                  return (
                    <tr key={item.id} style={{ backgroundColor: rowBg, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
                      <td className="px-4 py-2.5 border border-slate-200 font-medium">
                        {item.name && item.name !== 'Unknown Product' ? item.name : <span className="text-red-500">[Missing Name Data]</span>}
                      </td>
                      <td className="px-4 py-2.5 border border-slate-200 text-center font-mono"><span className="text-gray-400">[N/A]</span></td>
                      <td className="px-4 py-2.5 border border-slate-200 text-center">{item.quantity}</td>
                      <td className="px-4 py-2.5 border border-slate-200 text-center">X</td>
                      <td className="px-4 py-2.5 border border-slate-200 text-right font-mono">₹{(item.price * item.quantity).toFixed(2)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 border border-slate-200 text-center text-red-500 font-semibold bg-white">[No Items Found]</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Footer grid */}
          <div className="grid grid-cols-2 gap-8 mb-12">
            {/* Comments */}
            <div>
              <h3 className="text-white font-bold uppercase text-xs tracking-wider" style={{ backgroundColor: '#4C1D5B', color: '#FFFFFF', padding: '6px 12px', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>Other Comments & Notes</h3>
              <div className="border border-slate-200 border-t-0 p-3 min-h-[120px] text-xs text-slate-700 leading-relaxed bg-[#fbfbfc]">
                <p>1. Total payment due upon receipt.</p>
                <p>2. Please include the invoice number with your payment.</p>
                <p className="mt-2 text-xs font-semibold text-slate-500 uppercase">Payment Details:</p>
                <p>Method: {orderToPrint.paymentMethod}</p>
              </div>
            </div>

            {/* Calculations */}
            <div>
              <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                <tbody>
                  <tr className="bg-slate-100 font-bold text-sm">
                    <td className="px-4 py-2.5 border border-slate-200 text-right uppercase text-slate-900">TOTAL</td>
                    <td className="px-4 py-2.5 border border-slate-200 text-right font-mono text-slate-900">₹{(orderToPrint.total || 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Thank You Note */}
          <div className="text-center mt-12 font-medium italic text-slate-700 space-y-1">
            <p>If you have any questions about this invoice, please contact</p>
            <p className="text-slate-900 not-italic font-semibold">{storeEmail}</p>
            <p className="text-lg mt-4 text-[#2B1820] font-bold not-italic font-serif">Thank You For Your Business!</p>
          </div>
        </div>
      )}
    </div>
  );
}
