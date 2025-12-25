import express from 'express';
import {
  getAnalyticsOverview,
  getSessionAnalytics,
  getLiveActivity
} from '../controllers/analyticsController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and instructor/admin role
router.use(authenticate);
router.use(authorize('instructor', 'admin'));

router.get('/overview', getAnalyticsOverview);
router.get('/session/:sessionId', getSessionAnalytics);
router.get('/live', getLiveActivity);

export default router;
