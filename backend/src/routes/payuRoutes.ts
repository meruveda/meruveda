import { Router } from 'express';
import { initiatePayUPayment, handlePayUCallback } from '../controllers/payuController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/initiate', requireAuth as any, initiatePayUPayment as any);
router.post('/callback', handlePayUCallback as any);

export default router;
