import { supabase } from '../database/supabase';
import { shiprocketOrderService } from './shiprocket/order.service';
import { shiprocketTrackingService } from './shiprocket/tracking.service';
import { shiprocketWebhookService } from './shiprocket/webhook.service';
import { orderNotifyService } from './orderNotifyService';
import { ShiprocketOrderPayload } from './shiprocket/types';
import { config } from '../config/env';

export function isRajasthan(state: string): boolean {
  if (!state) return false;
  const s = state.trim().toLowerCase();
  const validMatches = ['rajasthan', 'rj', 'rajsthan', 'rajasthn', 'rajastan', 'rajasthna', 'rajastran', 'raj'];
  if (validMatches.includes(s)) return true;
  return s.startsWith('raj') && s.length >= 5;
}

export const orderService = {
  async getOrders(params: any) {
    const { status, page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc', includeItems, search, paymentMethod, startDate, endDate } = params;

    const selectQuery = includeItems === 'true' 
      ? '*, users(email), order_items(*, products(*))' 
      : '*, users(email)';
    let query = supabase.from('orders').select(selectQuery, { count: 'exact' });

    if (status) query = query.eq('status', status);

    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    if (paymentMethod) {
      if (paymentMethod === 'cod') {
        query = query.ilike('payment_method', '%cash%');
      } else if (paymentMethod === 'upi') {
        query = query.ilike('payment_method', '%upi%');
      } else if (paymentMethod === 'card') {
        query = query.ilike('payment_method', '%card%');
      } else {
        query = query.ilike('payment_method', `%${paymentMethod}%`);
      }
    }

    if (search) {
      query = query.or(`order_number.ilike.%${search}%,shipping_address->>fullName.ilike.%${search}%`);
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;

    query = query
      .order(sortBy as string, { ascending: sortOrder === 'asc' })
      .range(from, to);

    const { data, count, error } = await query;

    if (error) throw error;

    return {
      data,
      total: count,
      page: pageNum,
      limit: limitNum,
      totalPages: count ? Math.ceil(count / limitNum) : 0
    };
  },

  async getOrderById(id: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, users(email), order_items(*, products(*)), order_tracking_history(*)')
      .eq('id', id)
      .single();

    if (error || !data) {
      const err = new Error('Order not found');
      (err as any).status = 404;
      throw err;
    }

    return data;
  },

  async createOrder(payload: any, userId?: string) {
    const orderData = { ...payload };
    orderData.user_id = userId;
    orderData.order_number = `MV-${Math.floor(100000 + Math.random() * 900000)}`;
    orderData.status = 'pending';
    
    // Extract items to insert separately
    const items = orderData.items;
    delete orderData.items;

    // Fetch products to compute GST and get details
    let dbProducts: any[] = [];
    if (items && items.length > 0) {
      const productIds = items.map((item: any) => item.product_id).filter(Boolean);
      if (productIds.length > 0) {
        const { data } = await supabase
          .from('products')
          .select('id, name, sku, images, seo_metadata')
          .in('id', productIds);
        dbProducts = data || [];
      }
    }

    // Recalculate subtotal and shipping cost server-side
    const subtotal = Number(orderData.subtotal) || 0;
    const discount = Number(orderData.discount) || 0;
    let shippingFee = subtotal >= 1000 ? 0 : 50;
    
    if (orderData.payment_method === 'Cash On Delivery') {
      shippingFee += 50;
    }
    
    orderData.shipping_fee = shippingFee;
    if (orderData.shipping_cost !== undefined) delete orderData.shipping_cost;
    
    // Recalculate GST/Tax dynamically per item based on products' GST rates
    let gstAmount = 0;
    if (items && items.length > 0) {
      items.forEach((item: any) => {
        const dbProduct = dbProducts.find((p: any) => p.id === item.product_id);
        const itemPrice = Number(item.price) || 0;
        const itemQty = Number(item.quantity) || 1;
        const itemTotal = itemPrice * itemQty;
        
        const itemGstPercent = dbProduct?.seo_metadata?.gst_rate !== undefined 
          ? Number(dbProduct.seo_metadata.gst_rate)
          : (dbProduct?.seo_metadata?.gstRate !== undefined
             ? Number(dbProduct.seo_metadata.gstRate)
             : (dbProduct?.seo_metadata?.gst !== undefined 
                ? Number(dbProduct.seo_metadata.gst) 
                : (dbProduct?.seoMetadata?.gst !== undefined ? Number(dbProduct.seoMetadata.gst) : 5)));
        const itemGstRate = itemGstPercent / 100;
        
        const itemDiscount = subtotal > 0 ? (discount * itemTotal) / subtotal : 0;
        const itemTaxable = itemTotal - itemDiscount;
        const itemGst = (itemTaxable * itemGstRate) / (1 + itemGstRate);
        gstAmount += itemGst;
      });
    }

    // Apply GST on shipping charges if shippingIsTaxable config flag is true
    if (config.shippingIsTaxable && shippingFee > 0) {
      const shippingGstPercent = 18;
      const shippingGstRate = shippingGstPercent / 100;
      const shippingGst = (shippingFee * shippingGstRate) / (1 + shippingGstRate);
      gstAmount += shippingGst;
    }

    orderData.tax = Number(gstAmount.toFixed(2));
    
    // Recalculate total
    orderData.total = Number((subtotal - discount + shippingFee).toFixed(2));
    
    // Ensure billing_address is set, fallback to shipping_address to satisfy NOT NULL constraint
    if (!orderData.billing_address) {
      orderData.billing_address = orderData.shipping_address;
    }
    const billingAddress = orderData.billing_address;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) {
      console.error('Supabase Insert Error:', orderError);
      throw orderError;
    }

    // Insert order items
    if (items && items.length > 0) {

      const orderItems = items.map((item: any) => {
        const dbProduct = dbProducts.find((p: any) => p.id === item.product_id);
        const productName = item.name || item.product_name || dbProduct?.name || "Unknown Product";
        
        let sku = item.sku || dbProduct?.sku || "";
        if (!sku || sku === "") {
          sku = item.product_id ? `SKU-${item.product_id.substring(0, 8).toUpperCase()}` : "";
        }

        const imageUrl = item.image || item.image_url || (dbProduct?.images && dbProduct.images.length > 0 ? (typeof dbProduct.images[0] === 'string' ? dbProduct.images[0] : dbProduct.images[0]?.url) : null);

        return {
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price,
          product_name: productName,
          sku: sku,
          image_url: imageUrl
        };
      });

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
      
      // Reduce stock (Production feature)
      for (const item of items) {
        // Fetch current stock
        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
        if (prod) {
          const newStock = Math.max(0, prod.stock - item.quantity);
          await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
        }
      }
    }

    // Log transaction (only for Cash On Delivery on placement. PayU writes its own logs on callback).
    if (order.payment_method === 'Cash On Delivery' || String(order.payment_method).toUpperCase() === 'COD') {
      const txData = {
        user_id: order.user_id,
        order_id: order.id,
        amount: order.total,
        currency: 'INR',
        status: 'pending',
        payment_method: order.payment_method,
        gateway_transaction_id: null,
        metadata: {
          detailed_status: 'pending',
          updated_at: new Date().toISOString()
        }
      };
      await supabase.from('transactions').insert(txData);
    }

    // ============================================
    // Shiprocket Integration
    // ============================================
    // TODO: The Shiprocket order-creation trigger currently fires on `config.shiprocketTestMode`
    // rather than on confirmed payment. This needs to move to the Razorpay success webhook.
    // Leaving as-is for now pending product decision.
    if (config.shiprocketTestMode) {
      // Temporarily mark order as processing for testing (PAID)
      // We avoid 'PAID (TEST)' since it violates the DB CHECK constraint for status.
      order.status = 'processing';
      await supabase.from('orders').update({ status: 'processing' }).eq('id', order.id);

      try {
        if (items && items.length > 0 && order.shipping_address) {
          // Re-attach billing address for Shiprocket payload
          order.billing_address = billingAddress;
        // Fetch product dimensions
        const productIds = items.map((i: any) => i.product_id);
        const { data: products } = await supabase
          .from('products')
          .select('id, name, sku, weight, length, breadth, height, hsn')
          .in('id', productIds);

        const shiprocketItems = items.map((item: any) => {
          const prod: any = products?.find((p: any) => p.id === item.product_id) || {};
          return {
            name: prod.name || 'Product',
            sku: prod.sku || `SKU-${item.product_id.substring(0, 8).toUpperCase()}`,
            units: item.quantity,
            selling_price: item.price,
            discount: 0,
            tax: '',
            hsn: prod.hsn || ''
          };
        });

        // Calculate overall dimensions & weight (approximate, sum of weights, max of dims)
        let totalWeight = 0, maxLength = 10, maxBreadth = 10, maxHeight = 10;
        if (products) {
          products.forEach(p => {
            const itemQty = items.find((i: any) => i.product_id === p.id)?.quantity || 1;
            totalWeight += (Number(p.weight) || 0.5) * itemQty;
            maxLength = Math.max(maxLength, Number(p.length) || 10);
            maxBreadth = Math.max(maxBreadth, Number(p.breadth) || 10);
            maxHeight += (Number(p.height) || 10) * itemQty; // Stacking height
          });
        }

        const srPayload: ShiprocketOrderPayload = {
          order_id: order.order_number,
          order_date: new Date().toISOString().split('T')[0],
          pickup_location: process.env.SHIPROCKET_PICKUP_LOCATION || '',
          billing_customer_name: order.billing_address?.fullName || order.shipping_address.fullName,
          billing_last_name: '',
          billing_address: order.billing_address?.addressLine || order.shipping_address.addressLine,
          billing_city: order.billing_address?.city || order.shipping_address.city,
          billing_pincode: order.billing_address?.zipCode || order.shipping_address.zipCode,
          billing_state: order.billing_address?.state || order.shipping_address.state,
          billing_country: 'India',
          billing_email: order.user_email || 'customer@meruveda.com',
          billing_phone: order.billing_address?.phone || order.shipping_address.phone,
          shipping_is_billing: true,
          shipping_customer_name: order.shipping_address.fullName,
          shipping_last_name: '',
          shipping_address: order.shipping_address.addressLine,
          shipping_city: order.shipping_address.city,
          shipping_pincode: order.shipping_address.zipCode,
          shipping_country: 'India',
          shipping_state: order.shipping_address.state,
          shipping_phone: order.shipping_address.phone,
          order_items: shiprocketItems,
          payment_method: order.payment_method === 'Cash On Delivery' ? 'COD' : 'Prepaid',
          shipping_charges: order.shipping_cost || 0,
          giftwrap_charges: 0,
          transaction_charges: 0,
          total_discount: 0,
          sub_total: order.total,
          length: maxLength,
          breadth: maxBreadth,
          height: maxHeight,
          weight: totalWeight
        };

        const srResponse = await shiprocketOrderService.createOrder(srPayload);

        if (srResponse && srResponse.order_id) {
          // Save shiprocket IDs
          await supabase.from('orders').update({
            shiprocket_order_id: srResponse.order_id.toString(),
            shipment_id: srResponse.shipment_id?.toString() || '',
            pickup_location: srPayload.pickup_location,
            tracking_status: 'NEW'
          }).eq('id', order.id);
          
          order.shiprocket_order_id = srResponse.order_id.toString();
          order.shipment_id = srResponse.shipment_id?.toString() || '';
        }
        }
      } catch (shiprocketErr) {
        console.error('Shiprocket order creation failed:', shiprocketErr);
        // We don't fail the local order creation, just log it. 
        // A background job could retry failed Shiprocket syncs.
      }
    }

    return order;
  },

  async updateOrderStatus(id: string, status?: string, tracking_number?: string) {
    // 1. Fetch current order state
    const { data: order, error: fetchErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !order) {
      throw new Error('Order not found');
    }

    // Normalize status casing to lowercase to match DB check constraint
    const statusToUse = status || order.status;
    const normalizedStatus = statusToUse.toLowerCase();

    // 2. Validate cancellation constraint
    if (normalizedStatus === 'cancelled' && (order.status === 'delivered' || order.status === 'delivered')) {
      throw new Error('Cannot cancel an already delivered order');
    }

    const updateData: any = { status: normalizedStatus };

    // If order is delivered and is COD, automatically mark as paid
    const isCOD = order.payment_method === 'Cash On Delivery' || String(order.payment_method).toUpperCase() === 'COD';
    if (normalizedStatus === 'delivered' && isCOD) {
      updateData.payment_status = 'paid';
      const confirmMsg = `[COD Auto-Confirmed Paid on manual Delivery status update]`;
      updateData.notes = order.notes ? `${order.notes} ${confirmMsg}`.trim() : confirmMsg;

      // Try to insert a success transaction record if one doesn't exist
      try {
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('order_id', order.id)
          .eq('status', 'success')
          .maybeSingle();

        if (!existingTx) {
          await supabase.from('transactions').insert({
            user_id: order.user_id,
            order_id: order.id,
            amount: order.total,
            currency: 'INR',
            status: 'success',
            payment_method: order.payment_method,
            gateway_transaction_id: `COD-MANUAL-DELIVERY-${order.order_number}`,
            metadata: {
              detailed_status: 'paid',
              updated_at: new Date().toISOString(),
              source: 'manual_delivered_update'
            }
          });
        }
      } catch (txErr) {
        console.error('[Manual Update] Failed to insert COD transaction:', txErr);
      }
    }

    if (tracking_number) {
      updateData.awb_code = tracking_number;
      // Try to fetch initial tracking details from Shiprocket and sync them
      try {
        const response = await shiprocketTrackingService.trackAwb(tracking_number);
        if (response && response.tracking_data && response.tracking_data.shipment_track && response.tracking_data.shipment_track.length > 0) {
          const track = response.tracking_data.shipment_track[0];
          const payload = {
            awb: track.awb_code,
            current_status: track.current_status,
            shipment_id: track.shipment_id ? String(track.shipment_id) : (track.id ? String(track.id) : null),
            sr_order_id: track.order_id ? String(track.order_id) : null,
            courier: track.courier_name,
            expected_delivery: track.etd,
            tracking_url: track.tracking_url,
            scans: (track.scans || []).map((scan: any) => ({
              date: scan.date,
              activity: scan.activity,
              location: scan.location,
              'sr-status-label': scan.status
            }))
          };
          // Process webhook logic to update status, scans, etc.
          await shiprocketWebhookService.processWebhook(payload);
          
          // Re-fetch order status to include the updated values from processWebhook
          const { data: updatedOrder } = await supabase
            .from('orders')
            .select('status, tracking_status, last_tracking_update, courier_name, estimated_delivery, tracking_url')
            .eq('id', id)
            .single();
            
          if (updatedOrder) {
            updateData.status = updatedOrder.status;
            updateData.tracking_status = updatedOrder.tracking_status;
            updateData.last_tracking_update = updatedOrder.last_tracking_update;
            updateData.courier_name = updatedOrder.courier_name;
            updateData.estimated_delivery = updatedOrder.estimated_delivery;
            updateData.tracking_url = updatedOrder.tracking_url;
          }
        }
      } catch (srErr) {
        console.error('[Tracking Auto-Sync] Failed to fetch initial tracking from Shiprocket:', srErr);
      }
    }

    let shiprocketResponse = null;

    // 3. If transitioning to Cancelled, sync to Shiprocket
    if (normalizedStatus === 'cancelled') {
      updateData.tracking_status = 'CANCELED';
      updateData.last_tracking_update = new Date().toISOString();

      if (order.awb_code) {
        try {
          shiprocketResponse = await shiprocketOrderService.cancelOrder([order.awb_code]);
        } catch (srErr: any) {
          console.error('[Order Cancel Sync] Failed to cancel in Shiprocket:', srErr);
          // Don't block local cancel, just log
        }
      }
    }

    // 4. Update the database
    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select('*, users(email)')
      .single();

    if (error) throw error;

    // 4b. Push a WhatsApp status update to the customer for the shipment /
    // cancellation milestones. Fire-and-forget: never block the admin action.
    try {
      const notifyKey =
        normalizedStatus === 'shipped' || normalizedStatus === 'out for delivery'
          ? 'shipped'
          : normalizedStatus === 'delivered'
          ? 'delivered'
          : normalizedStatus === 'cancelled'
          ? 'cancelled'
          : null;
      if (notifyKey && notifyKey !== String(order.status || '').toLowerCase()) {
        await orderNotifyService.sendStatusUpdate(id, notifyKey);
      }
    } catch (notifyErr: any) {
      console.error('[OrderStatus] WhatsApp update failed:', notifyErr?.message || notifyErr);
    }

    // 5. Save cancellation to history
    if (status === 'cancelled' || normalizedStatus === 'cancelled') {
      await supabase.from('order_tracking_history').insert({
        order_id: id,
        tracking_status: 'CANCELED',
        activity: 'Order Cancelled (Fulfillment Update)',
        location: 'Platform',
        raw_payload: shiprocketResponse || { info: 'Cancelled locally before AWB assignment' }
      });
    }

    return data;
  },

  async getMyOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*, products(*)), order_tracking_history(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async updateOrder(id: string, updates: any) {
    // 1. Fetch current order
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !order) {
      throw new Error('Order not found');
    }

    // 2. Prepare update data
    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.tracking_number !== undefined) updateData.tracking_number = updates.tracking_number;
    if (updates.shipping_address !== undefined) updateData.shipping_address = updates.shipping_address;
    if (updates.billing_address !== undefined) updateData.billing_address = updates.billing_address;
    if (updates.payment_status !== undefined) updateData.payment_status = updates.payment_status;
    if (updates.payment_method !== undefined) updateData.payment_method = updates.payment_method;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    // Recalculate financial fields if any of them are changed
    const newSubtotal = updates.subtotal !== undefined ? Number(updates.subtotal) : Number(order.subtotal);
    const newDiscount = updates.discount !== undefined ? Number(updates.discount) : Number(order.discount);
    
    if (updates.subtotal !== undefined || updates.discount !== undefined || updates.shipping_fee !== undefined || updates.shipping_cost !== undefined || updates.payment_method !== undefined) {
      updateData.subtotal = newSubtotal;
      updateData.discount = newDiscount;
      let newShippingFee = newSubtotal >= 1000 ? 0 : 50;
      
      const finalPaymentMethod = updates.payment_method !== undefined ? updates.payment_method : order.payment_method;
      if (finalPaymentMethod === 'Cash On Delivery') {
        newShippingFee += 50;
      }
      
      updateData.shipping_fee = newShippingFee;
      
      // Recalculate GST/Tax dynamically per item based on products' GST rates
      let gstAmount = 0;
      const { data: dbOrderItems } = await supabase
        .from('order_items')
        .select('*, products(seo_metadata)')
        .eq('order_id', id);
        
      if (dbOrderItems && dbOrderItems.length > 0) {
        dbOrderItems.forEach((item: any) => {
          const itemPrice = Number(item.price) || 0;
          const itemQty = Number(item.quantity) || 1;
          const itemTotal = itemPrice * itemQty;
          
          const dbProduct = item.products;
          const itemGstPercent = dbProduct?.seo_metadata?.gst_rate !== undefined 
            ? Number(dbProduct.seo_metadata.gst_rate)
            : (dbProduct?.seo_metadata?.gstRate !== undefined
               ? Number(dbProduct.seo_metadata.gstRate)
               : (dbProduct?.seo_metadata?.gst !== undefined 
                  ? Number(dbProduct.seo_metadata.gst) 
                  : (dbProduct?.seoMetadata?.gst !== undefined ? Number(dbProduct.seoMetadata.gst) : 5)));
          const itemGstRate = itemGstPercent / 100;
          
          const itemDiscount = newSubtotal > 0 ? (newDiscount * itemTotal) / newSubtotal : 0;
          const itemTaxable = itemTotal - itemDiscount;
          const itemGst = (itemTaxable * itemGstRate) / (1 + itemGstRate);
          gstAmount += itemGst;
        });
      } else {
        // Fallback if no items found in DB
        const taxableAmount = newSubtotal - newDiscount;
        const gstRate = 0.05; // Fallback default rate of 5%
        gstAmount = (taxableAmount * gstRate) / (1 + gstRate);
      }

      // Apply GST on shipping charges if shippingIsTaxable config flag is true
      if (config.shippingIsTaxable && newShippingFee > 0) {
        const shippingGstPercent = 18;
        const shippingGstRate = shippingGstPercent / 100;
        const shippingGst = (newShippingFee * shippingGstRate) / (1 + shippingGstRate);
        gstAmount += shippingGst;
      }
      
      updateData.tax = Number(gstAmount.toFixed(2));
      
      // Final total
      updateData.total = Number((newSubtotal - newDiscount + newShippingFee).toFixed(2));
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

     if (updateError) throw updateError;

     // Trigger transaction cancellation status update if order is cancelled or returned
     if (updates.status === 'cancelled' || updates.status === 'returned') {
       await handleTransactionCancellation(id, updates.status);
     }

     return updatedOrder;
   },

    async deleteOrder(id: string) {
      // 1. Delete associated transactions
      const { error: txErr } = await supabase
        .from('transactions')
        .delete()
        .eq('order_id', id);
      if (txErr) throw txErr;

      // 2. Delete associated order_tracking_history
      const { error: trackingErr } = await supabase
        .from('order_tracking_history')
        .delete()
        .eq('order_id', id);
      if (trackingErr) throw trackingErr;

      // 3. Delete associated order_items
      const { error: itemsErr } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', id);
      if (itemsErr) throw itemsErr;

      // 4. Delete the order itself
      const { error: orderErr } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);
      if (orderErr) throw orderErr;
    }
};

export async function handleTransactionCancellation(orderId: string, orderStatus: string) {
  try {
    const { data: tx } = await supabase
      .from('transactions')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (tx) {
      if (tx.status === 'success') {
        // Successfully paid/captured -> transition to refunded (refund_pending)
        await supabase
          .from('transactions')
          .update({
            status: 'refunded',
            metadata: {
              ...tx.metadata,
              detailed_status: 'refund_pending',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: orderStatus
            }
          })
          .eq('id', tx.id);
      } else {
        // Pending or failed -> transition to failed (cancelled)
        await supabase
          .from('transactions')
          .update({
            status: 'failed',
            metadata: {
              ...tx.metadata,
              detailed_status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancellation_reason: orderStatus
            }
          })
          .eq('id', tx.id);
      }
    }
  } catch (err) {
    console.error('[Cancellation Transaction] Failed to update transaction status:', err);
  }
}
