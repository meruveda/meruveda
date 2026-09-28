import { Request, Response, NextFunction } from 'express';
import { supabase } from '../database/supabase';
import { generateToken } from '../utils/jwt';
import { otpService } from '../services/otpService';
import { normalizePhone, isWhatsappConfigured } from '../services/whatsappService';
import { config } from '../config/env';

const MESSAGES: Record<string, string> = {
  not_found: 'No active OTP found for this number. Please request a new code.',
  expired: 'This OTP has expired. Please request a new code.',
  already_used: 'This OTP was already used. Please request a new code.',
  too_many_attempts: 'Too many incorrect attempts. Please request a new code.',
  invalid: 'The OTP you entered is incorrect. Please try again.',
};

const handleSend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone } = req.body;

    // Fail loudly in production when WhatsApp credentials are missing —
    // otherwise checkout would silently never deliver an OTP.
    if (!isWhatsappConfigured() && config.nodeEnv === 'production') {
      return res.status(503).json({
        error: { message: 'WhatsApp OTP is temporarily unavailable. Please try again later.' },
      });
    }

    const result = await otpService.sendOtp(phone);
    res.json({
      message: 'OTP sent to your WhatsApp number.',
      expiresInSeconds: result.expiresInSeconds,
      // Local development convenience only — never exposed in production.
      ...(config.nodeEnv !== 'production' && { devOtp: result.devOtp }),
    });
  } catch (error: any) {
    if (error.status) {
      return res.status(error.status).json({ error: { message: error.message } });
    }
    next(error);
  }
};

export const sendOtp = handleSend;
export const resendOtp = handleSend;

export const verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, code, name } = req.body;
    const result = await otpService.verifyOtp(phone, code);

    if (!result.ok) {
      return res.status(400).json({ error: { message: MESSAGES[result.reason] || MESSAGES.invalid } });
    }

    // Auto-register when the number is unknown, otherwise log the existing
    // customer in. Either way the order gets linked to this user id.
    const { user, created } = await otpService.findOrCreateUserByPhone(phone, name);

    const token = generateToken({ id: user.id, email: user.email, role: user.role });

    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: created ? 'register_otp' : 'login_otp',
        entity_type: 'users',
        entity_id: user.id,
        details: { phone: normalizePhone(phone) },
      });
    } catch (logErr) {
      console.error('Failed to log OTP activity:', logErr);
    }

    const { password_hash, first_name, last_name, ...rest } = user;
    res.json({
      message: created ? 'Account created and verified.' : 'Mobile number verified.',
      user: { ...rest, firstName: first_name, lastName: last_name },
      token,
      isNewUser: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Persist the details collected in the checkout form (name / email / address).
 * Called after OTP verification so the latest form values always win.
 */
export const updateCheckoutProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: { message: 'Unauthorized' } });

    const { name, firstName, lastName, email, address, phone } = req.body;
    const patch: any = { updated_at: new Date().toISOString() };

    const resolvedFirst = firstName ?? (name ? String(name).trim().split(/\s+/)[0] : undefined);
    const resolvedLast = lastName ?? (name ? String(name).trim().split(/\s+/).slice(1).join(' ') : undefined);
    if (resolvedFirst !== undefined && resolvedFirst !== '') patch.first_name = resolvedFirst;
    if (resolvedLast !== undefined) patch.last_name = resolvedLast || null;
    if (address !== undefined) patch.address = address;
    if (phone) {
      const normalized = normalizePhone(phone);
      if (normalized) patch.phone = normalized;
    }

    if (email) {
      const cleanEmail = String(email).trim();
      // Only adopt the email if nobody else already owns it (users.email is UNIQUE).
      const { data: owner } = await supabase
        .from('users')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle();
      if (!owner || owner.id === userId) patch.email = cleanEmail;
    }

    const { data: updated, error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', userId)
      .select('id, email, first_name, last_name, phone, role, active, address')
      .single();

    if (error) throw error;

    res.json({
      message: 'Profile updated.',
      user: {
        id: updated.id,
        email: updated.email,
        firstName: updated.first_name,
        lastName: updated.last_name,
        phone: updated.phone,
        role: updated.role,
        address: updated.address,
      },
    });
  } catch (error) {
    next(error);
  }
};
