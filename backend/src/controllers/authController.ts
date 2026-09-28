import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { supabase } from '../database/supabase';
import { generateToken } from '../utils/jwt';
import { config } from '../config/env';
import { sendEmail, getPasswordResetTemplate } from '../services/emailService';

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone, role } = req.body;
    
    // Check if user exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .ilike('email', email)
      .maybeSingle();

    if (existingUser) {
      return res.status(400).json({ error: { message: 'User already exists' } });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        first_name: firstName,
        last_name: lastName,
        phone,
        role: role || 'customer',
        active: true
      })
      .select('id, email, first_name, last_name, role, phone')
      .single();

    if (createError) throw createError;

    const token = generateToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    });

    const { first_name, last_name, ...rest } = newUser;
    const userToReturn = { ...rest, firstName: first_name, lastName: last_name };

    res.status(201).json({
      message: 'Registration successful',
      user: userToReturn,
      token
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, password_hash, first_name, last_name, role, active')
      .ilike('email', email)
      .maybeSingle();

    if (error || !user) {
      console.error('Login error: user not found or db error', error, 'User:', user);
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    if (!user.active) {
      console.error('Login error: user inactive');
      return res.status(401).json({ error: { message: 'Account is disabled' } });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log(`Password valid? ${isValid} for email: ${email}`);
    if (!isValid) {
      console.error('Login error: password invalid');
      return res.status(401).json({ error: { message: 'Invalid credentials' } });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role
    });

    // Log the login activity
    try {
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'login',
        entity_type: 'users',
        entity_id: user.id,
        details: { email: user.email }
      });
    } catch (logError) {
      console.error('Failed to log login activity:', logError);
    }

    // Remove password hash from response and map snake_case to camelCase
    const { password_hash, first_name, last_name, ...rest } = user;
    const userToReturn = { ...rest, firstName: first_name, lastName: last_name };

    res.json({
      message: 'Login successful',
      user: userToReturn,
      token
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: { message: 'Unauthorized' } });

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, phone, active')
      .eq('id', userId)
      .single();

    if (error || !user) throw error;

    const { first_name, last_name, ...rest } = user;
    const userToReturn = { ...rest, firstName: first_name, lastName: last_name };

    res.json({ user: userToReturn });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: { message: 'Email is required' } });
    }

    // Find the user
    const { data: user, error: checkError } = await supabase
      .from('users')
      .select('id, email, first_name')
      .ilike('email', email)
      .maybeSingle();

    if (checkError || !user) {
      // Always return success to protect user privacy and prevent enumeration
      console.log(`Password reset requested for non-existent email: ${email}`);
      return res.status(200).json({ message: 'If the email exists, a password reset link has been generated.' });
    }

    // Generate secure random token and 1-hour expiry
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    // Update user record with token and expiry
    const { error: updateError } = await supabase
      .from('users')
      .update({
        reset_password_token: token,
        reset_password_expires: expiry,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    // Send password reset email
    const resetLink = `https://meruvedawellness.com/reset-password?token=${token}`;
    const htmlContent = getPasswordResetTemplate(resetLink, user.first_name || 'Customer');
    
    // Asynchronously send email so response is instant, but catch errors
    sendEmail(user.email, 'Reset Your MeruVeda Password', htmlContent).catch(mailErr => {
      console.error('[forgotPassword] Failed to send email background task:', mailErr);
    });

    res.status(200).json({ message: 'If the email exists, a password reset link has been generated.' });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: { message: 'Token and new password are required' } });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: { message: 'Password must be at least 6 characters long' } });
    }

    // Find user with valid token and not yet expired
    const { data: user, error: findError } = await supabase
      .from('users')
      .select('id, email')
      .eq('reset_password_token', token)
      .gt('reset_password_expires', new Date().toISOString())
      .maybeSingle();

    if (findError || !user) {
      return res.status(400).json({ error: { message: 'Invalid or expired password reset token' } });
    }

    // Hash the new password using bcrypt (matching rounds = 10 from register)
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update the password and clear reset token columns
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        reset_password_token: null,
        reset_password_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const key = `notification_preferences_${userId}`;
    const { data: setting, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    const defaultPrefs = {
      emailPromo: true,
      smsOrder: true,
      emailNewsletter: false,
      whatsappAlerts: true
    };

    if (error) throw error;

    res.json({ data: setting ? setting.value : defaultPrefs });
  } catch (error) {
    next(error);
  }
};

export const updatePreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    const key = `notification_preferences_${userId}`;
    const value = req.body;

    const { data: existing } = await supabase
      .from('settings')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('settings')
        .update({ value })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('settings')
        .insert({ key, value });
      if (error) throw error;
    }

    res.json({ success: true, message: 'Preferences updated successfully.' });
  } catch (error) {
    next(error);
  }
};

export const getCustomerPreferences = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentUser = req.user;
    const { userId } = req.params;

    if (!currentUser) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }

    // Only allow admin or the owner
    if (currentUser.role !== 'admin' && currentUser.id !== userId) {
      return res.status(403).json({ error: { message: 'Forbidden' } });
    }

    const key = `notification_preferences_${userId}`;
    const { data: setting, error } = await supabase
      .from('settings')
      .select('*')
      .eq('key', key)
      .maybeSingle();

    const defaultPrefs = {
      emailPromo: true,
      smsOrder: true,
      emailNewsletter: false,
      whatsappAlerts: true
    };

    if (error) throw error;

    res.json({ data: setting ? setting.value : defaultPrefs });
  } catch (error) {
    next(error);
  }
};
