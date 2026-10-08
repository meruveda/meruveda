import { Request, Response, NextFunction } from 'express';
import { supabase } from '../database/supabase';
import { hasColumn } from '../services/schemaGuard';

const MIGRATION_HINT =
  'This action needs database delta 006 (backend/database/deltas/006_missing_columns.sql). Apply it in the Supabase SQL editor and retry.';

export const getReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId, status } = req.query;

    let query = supabase.from('reviews').select('*, users(first_name, last_name), products(id, name)', { count: 'exact' });

    if (productId) query = query.eq('product_id', productId);
    if (status) query = query.eq('status', status);

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ data, total: count });
  } catch (error) {
    next(error);
  }
};

/** Authenticated customer's own feedback history (profile page). */
export const getMyReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: { message: 'Unauthorized' } });
    }
    const { data, error } = await supabase
      .from('reviews')
      .select('*, products(id, name)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    next(error);
  }
};

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    // New reviews enter the moderation queue; admin approval publishes them.
    const reviewData = { ...req.body, user_id: userId, status: 'pending' };

    const { data, error } = await supabase.from('reviews').insert(reviewData).select().single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

export const updateReviewStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: { message: 'Invalid status. Use pending, approved or rejected.' } });
    }

    const { data, error } = await supabase.from('reviews').update({ status }).eq('id', id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: { message: 'Review not found' } });
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
export const featureReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;

    if (!(await hasColumn('reviews', 'is_featured'))) {
      return res.status(503).json({ error: { message: MIGRATION_HINT } });
    }

    const { data, error } = await supabase
      .from('reviews')
      .update({ is_featured: featured })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
};

export const getFeaturedReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // `reviews.is_featured` lands in delta 006. Until then fall back to the
    // newest approved reviews so the homepage testimonials are never empty.
    const featuredAvailable = await hasColumn('reviews', 'is_featured');

    let query = supabase
      .from('reviews')
      .select('*, users(first_name, last_name)')
      .eq('status', 'approved');
    if (featuredAvailable) query = query.eq('is_featured', true);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { rating, comment, reply, status } = req.body;
    const updateData: any = {};
    if (rating !== undefined) updateData.rating = Number(rating);
    if (comment !== undefined) updateData.comment = comment;
    if (reply !== undefined) updateData.reply = reply;
    if (status !== undefined) updateData.status = status;

    if (reply !== undefined && !(await hasColumn('reviews', 'reply'))) {
      return res.status(503).json({ error: { message: MIGRATION_HINT } });
    }

    const { data, error } = await supabase.from('reviews').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    res.json({ data });
  } catch (error) {
    next(error);
  }
};
