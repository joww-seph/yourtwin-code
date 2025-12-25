import express from 'express';
import {
  requestHint,
  submitComprehension,
  getHintHistory,
  submitHintFeedback,
  getAIStatus,
  getUsageStats,
  getRecommendedLevel
} from '../controllers/aiController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes (no auth required)
router.get('/status', getAIStatus);

// All routes below require authentication
router.use(authenticate);

// Student routes
router.post('/hint', authorize('student'), requestHint);
router.post('/comprehension', authorize('student'), submitComprehension);
router.get('/hints/:activityId', authorize('student'), getHintHistory);
router.post('/hints/:hintId/feedback', authorize('student'), submitHintFeedback);
router.get('/recommend-level/:activityId', authorize('student'), getRecommendedLevel);

// Admin/Instructor routes
router.get('/usage', authorize('instructor', 'admin'), getUsageStats);

export default router;
