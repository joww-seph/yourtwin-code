import express from 'express';
import {
  getActivity,
  updateActivity,
  deleteActivity
} from '../controllers/activityController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Only allow activity management (creation is via lab sessions)
router.get('/:id', getActivity);
router.put('/:id', authorize('instructor', 'admin'), updateActivity);
router.delete('/:id', authorize('instructor', 'admin'), deleteActivity);

export default router;