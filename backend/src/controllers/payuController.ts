import { Request, Response, NextFunction } from 'express';
import { payuService } from '../services/payuService';
import { orderService } from '../services/orderService';
import { orderNotifyService } from '../services/orderNotifyService';
import { supabase } from '../database/supabase';
import { config } from '../config/env';

export const initiatePayUPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { checkoutPayload } = req.body;
    if (!checkoutPayload) {
      return res.status(400).json({ error: { message: 'Missing checkout order payload' } });
    }

    // Force payment method to PayOnline / PayU
    checkoutPayload.payment_method = 'PayOnline (via PayU)';
    
    // Create order in DB with status pending_payment
    const order = await orderService.createOrder(checkoutPayload, req.user?.id);
    
    // Explicitly ensure status is 'pending_payment'
    await supabase.from('orders').update({ status: 'pending_payment' }).eq('id', order.id);

    const firstItem = checkoutPayload.items?.[0]?.name || 'MeruVeda Order';
    const productInfo = checkoutPayload.items?.length > 1 
      ? `${firstItem} + ${checkoutPayload.items.length - 1} more items` 
      : firstItem;

    const shippingAddress = order.shipping_address || {};
    const firstName = shippingAddress.fullName 
      ? shippingAddress.fullName.split(' ')[0] 
      : 'Customer';

    const backendUrl = `${req.protocol}://${req.get('host')}`;

    const payuParams = payuService.buildCheckoutParams({
      orderNumber: order.order_number,
      amount: Number(order.total),
      productInfo,
      firstName,
      email: req.user?.email || 'customer@meruveda.com',
      phone: shippingAddress.phone || '9999999999',
      backendUrl
    });

    res.json({
      data: {
        orderId: order.id,
        orderNumber: order.order_number,
        payuParams
      }
    });
  } catch (error) {
    next(error);
  }
};

export const handlePayUCallback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.body;
    console.log('[PayU Callback] Received payload:', payload);

    const isValidHash = payuService.verifyResponseHash(payload);
    const orderNumber = payload.txnid;
    const status = payload.status;
    const mihpayid = payload.mihpayid || payload.payuMoneyId || '';

    // Look up order by order_number
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (orderErr || !order) {
      console.error('[PayU Callback] Order not found for txnid:', orderNumber);
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const upsertTransaction = async (txStatus: 'success' | 'failed', detailedStatus: 'captured' | 'failed' | 'hash_mismatch', gatewayRef?: string) => {
      try {
        const { data: existingTx } = await supabase
          .from('transactions')
          .select('id')
          .eq('order_id', order.id)
          .maybeSingle();

        const txData = {
          user_id: order.user_id,
          order_id: order.id,
          amount: order.total,
          currency: 'INR',
          status: txStatus,
          payment_method: 'PayOnline (via PayU)',
          gateway_transaction_id: gatewayRef || mihpayid || orderNumber || null,
          metadata: {
            detailed_status: detailedStatus,
            gateway_mode: payload.mode || null,
            updated_at: new Date().toISOString()
          }
        };

        if (existingTx) {
          await supabase
            .from('transactions')
            .update(txData)
            .eq('id', existingTx.id);
        } else {
          await supabase
            .from('transactions')
            .insert(txData);
        }
      } catch (txErr) {
        console.error('[PayU Callback] Failed to write transaction log:', txErr);
      }
    };

    if (!isValidHash) {
      console.error('[PayU Callback] Hash mismatch! Potential spoofing attempt.');
      await supabase.from('orders').update({ 
        status: 'payment_failed',
        notes: `${order.notes || ''} [PayU Error: Hash Verification Failed]`.trim()
      }).eq('id', order.id);

      await upsertTransaction('failed', 'hash_mismatch');

      return res.redirect(`${config.frontendUrl}/checkout/failed?order_id=${order.id}&reason=${encodeURIComponent('Payment response verification failed (Hash Mismatch).')}`);
    }

    if (status === 'success') {
      // Mark as paid / processing
      await supabase.from('orders').update({
        status: 'processing',
        payment_status: 'paid',
        notes: `${order.notes || ''} [PayU mihpayid: ${mihpayid}]`.trim()
      }).eq('id', order.id);

      await upsertTransaction('success', 'captured');

      // Post-purchase WhatsApp automation: order confirmation + PDF invoice to
      // the customer and to ADMIN_WHATSAPP_NUMBER. Failures are logged inside
      // the service and must never block the payment redirect.
      try {
        await orderNotifyService.sendPostPurchaseMessages(order.id);
      } catch (notifyErr: any) {
        console.error('[PayU Callback] Post-purchase WhatsApp messages failed:', notifyErr?.message || notifyErr);
      }

      return res.redirect(`${config.frontendUrl}/checkout/success/${order.id}`);
    } else {
      // Payment failed or cancelled
      await supabase.from('orders').update({
        status: 'payment_failed',
        notes: `${order.notes || ''} [PayU Status: ${status}, Error: ${payload.error_Message || 'User cancelled / transaction failed'}]`.trim()
      }).eq('id', order.id);

      await upsertTransaction('failed', 'failed');

      return res.redirect(`${config.frontendUrl}/checkout/failed?order_id=${order.id}&reason=${encodeURIComponent(payload.error_Message || 'Payment was unsuccessful or cancelled.')}`);
    }
  } catch (error) {
    next(error);
  }
};
