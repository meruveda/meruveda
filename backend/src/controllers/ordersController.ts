import { Request, Response, NextFunction } from 'express';
import { orderService } from '../services/orderService';
import { orderNotifyService } from '../services/orderNotifyService';
import { supabase } from '../database/supabase';
import { normalizePhone } from '../services/whatsappService';
import { hasColumn } from '../services/schemaGuard';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const getOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await orderService.getOrders(req.query);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await orderService.getOrderById(id as string);
    res.json({ data });
  } catch (error: any) {
    if (error.status === 404) {
      return res.status(404).json({ error: { message: error.message } });
    }
    next(error);
  }
};

export const createOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await orderService.createOrder(req.body, req.user?.id);
    // Cash on Delivery has no payment callback, so the post-purchase WhatsApp
    // automation (confirmation + PDF invoice to customer & admin) runs here.
    try {
      await orderNotifyService.sendPostPurchaseMessages(data.id);
    } catch (notifyErr: any) {
      console.error('[Orders] Post-purchase WhatsApp messages failed:', notifyErr?.message || notifyErr);
    }
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

/**
 * PUBLIC guest order lookup — order number (or id) + mobile number, no login.
 * Powers the /track page.
 */
export const trackOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const orderRef = String(req.query.order || req.query.orderNumber || '').trim();
    const phone = normalizePhone(String(req.query.phone || req.query.mobile || ''));

    if (!orderRef || !phone) {
      return res.status(400).json({ error: { message: 'Order number and mobile number are required.' } });
    }

    // `orders.delivered_at` lands in delta 006 — skip it while that is pending so
    // the whole lookup still succeeds and the date simply comes back null.
    const deliveredColumn = (await hasColumn('orders', 'delivered_at')) ? 'delivered_at, ' : '';

    // A non-UUID reference inside `id.eq.<value>` makes PostgREST reject the whole
    // filter ("invalid input syntax for type uuid"), which would 500 every lookup
    // by plain order number. Only add the id branch when the value really is one,
    // and drop characters that would break the or() expression.
    const safeRef = orderRef.replace(/[^A-Za-z0-9_-]/g, '');
    if (!safeRef) {
      return res.status(400).json({ error: { message: 'Order number and mobile number are required.' } });
    }
    const lookupFilter = UUID_PATTERN.test(safeRef)
      ? `order_number.eq.${safeRef},id.eq.${safeRef}`
      : `order_number.eq.${safeRef}`;

    const { data, error } = await supabase
      .from('orders')
      .select(`id, order_number, status, payment_status, created_at, ${deliveredColumn}awb_code, courier_name, tracking_url, tracking_status, estimated_delivery, last_tracking_update, shipping_address, order_tracking_history(*)`)
      .or(lookupFilter)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    const order: any = data;
    if (!order) {
      return res.status(404).json({ error: { message: 'No order found for these details.' } });
    }

    const orderPhone = normalizePhone(order.shipping_address?.phone || '');
    if (!orderPhone || orderPhone !== phone) {
      // Same message as "not found" so the endpoint cannot be used to enumerate orders.
      return res.status(404).json({ error: { message: 'No order found for these details.' } });
    }

    res.json({
      data: {
        order_number: order.order_number,
        status: order.status,
        payment_status: order.payment_status,
        created_at: order.created_at,
        delivered_at: order.delivered_at ?? null,
        awb_code: order.awb_code,
        courier_name: order.courier_name,
        tracking_url: order.tracking_url,
        tracking_status: order.tracking_status,
        estimated_delivery: order.estimated_delivery,
        last_tracking_update: order.last_tracking_update,
        shipping_address: {
          city: order.shipping_address?.city,
          state: order.shipping_address?.state,
          zipCode: order.shipping_address?.zipCode,
        },
        tracking_history: (order.order_tracking_history || [])
          .slice()
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      },
    });
  } catch (error) {
    next(error);
  }
};

/** Regenerate + resend the PDF invoice over WhatsApp (customer and admin). */
export const resendInvoice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Owner-or-admin check (mirrors the Shiprocket invoice endpoint).
    const { data: orderRow } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', id)
      .maybeSingle();
    if (!orderRow) {
      return res.status(404).json({ error: { message: 'Order not found' } });
    }
    if (req.user?.role !== 'admin' && orderRow.user_id !== req.user?.id) {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }

    const result = await orderNotifyService.resendInvoice(id as string);
    res.json({ data: result, message: 'Invoice resent over WhatsApp.' });
  } catch (error: any) {
    if (error.status === 404) {
      return res.status(404).json({ error: { message: error.message } });
    }
    next(error);
  }
};

export const updateOrderStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status, tracking_number } = req.body;
    const data = await orderService.updateOrderStatus(id as string, status, tracking_number);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }
    const data = await orderService.getMyOrders(userId);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const updateOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = await orderService.updateOrder(id as string, req.body);
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const deleteOrder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    await orderService.deleteOrder(id as string);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    next(error);
  }
};
