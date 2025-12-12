import express from 'express';
import {
  getActivities,
  getActivity,
  createActivity,
  updateActivity,
  deleteActivity
} from '../controllers/activityController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, getActivities);
router.get('/:id', authenticate, getActivity);
router.post('/', authenticate, authorize('instructor', 'admin'), createActivity);
router.put('/:id', authenticate, authorize('instructor', 'admin'), updateActivity);
router.delete('/:id', authenticate, authorize('instructor', 'admin'), deleteActivity);

export default router;