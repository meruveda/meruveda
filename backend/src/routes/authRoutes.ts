import { Router } from 'express';
import { login, register, getMe, forgotPassword, resetPassword, getPreferences, updatePreferences, getCustomerPreferences } from '../controllers/authController';
// OTP DISABLED — send/verify/resend imports commented out (kept for re-enable).
// updateCheckoutProfile stays live: it only saves name/email/address for
// already-authenticated users and sends no OTP.
// import { sendOtp, verifyOtp, resendOtp } from '../controllers/otpController';
import { updateCheckoutProfile } from '../controllers/otpController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/register', register as any);
router.post('/login', login as any);
router.post('/forgot-password', forgotPassword as any);
router.post('/reset-password', resetPassword as any);

// OTP DISABLED — WhatsApp OTP login/registration commented out (kept for
// re-enable). To re-enable: uncomment the import above and the 3 lines below.
// // WhatsApp OTP login/registration used by the checkout form
// router.post('/otp/send', sendOtp as any);
// router.post('/otp/resend', resendOtp as any);
// router.post('/otp/verify', verifyOtp as any);
router.put('/profile', requireAuth as any, updateCheckoutProfile as any);

router.get('/me', requireAuth as any, getMe as any);
router.get('/preferences', requireAuth as any, getPreferences as any);
router.post('/preferences', requireAuth as any, updatePreferences as any);
router.get('/preferences/:userId', requireAuth as any, getCustomerPreferences as any);

export default router;
