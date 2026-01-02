import express from 'express';
import {
  getActivity,
  updateActivity,
  deleteActivity,
  saveDraftCode,
  loadDraftCode,
  clearDraftCode
} from '../controllers/activityController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Draft code routes (students only) - must come before :id routes
router.post('/:id/draft', authorize('student'), saveDraftCode);
router.get('/:id/draft', authorize('student'), loadDraftCode);
router.delete('/:id/draft', authorize('student'), clearDraftCode);

// Only allow activity management (creation is via lab sessions)
router.get('/:id', getActivity);
router.put('/:id', authorize('instructor', 'admin'), updateActivity);
router.delete('/:id', authorize('instructor', 'admin'), deleteActivity);

export default router;