import { Router } from 'express';
import { getReviews, createReview, updateReviewStatus, deleteReview, featureReview, getFeaturedReviews, updateReview } from '../controllers/reviewsController';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', getReviews as any);
router.get('/featured', getFeaturedReviews as any); // Public - for homepage display

router.use(requireAuth as any);
router.post('/', createReview as any); // Customers can post

router.use(requireAdmin as any);
router.patch('/:id/status', updateReviewStatus as any);
router.patch('/:id/feature', featureReview as any);
router.patch('/:id', updateReview as any);
router.delete('/:id', deleteReview as any);

export default router;
