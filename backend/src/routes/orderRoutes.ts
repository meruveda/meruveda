import { Router } from 'express';
import { getOrders, getOrderById, createOrder, updateOrderStatus, getMyOrders, updateOrder, deleteOrder, trackOrder, resendInvoice } from '../controllers/ordersController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// PUBLIC — guest order tracking by order number + mobile number (no login).
router.get('/track', trackOrder as any);

router.use(requireAuth as any);

router.get('/my', getMyOrders as any);
router.post('/', createOrder as any);

// Owner or admin may regenerate/resend the WhatsApp invoice.
router.post('/:id/resend-invoice', resendInvoice as any);

router.get('/:id', getOrderById as any);

router.get('/', requireAdmin as any, getOrders as any);
router.patch('/:id/status', requireAdmin as any, updateOrderStatus as any);
router.patch('/:id', requireAdmin as any, updateOrder as any);
router.delete('/:id', requireAdmin as any, deleteOrder as any);

export default router;
