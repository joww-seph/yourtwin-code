import express from 'express';
import {
  createLabSession,
  getLabSessions,
  getLabSession,
  updateLabSession,
  deleteLabSession,
  addActivityToSession,
  removeActivityFromSession
} from '../controllers/labSessionController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

router.get('/', getLabSessions);
router.get('/:id', getLabSession);

// Instructor-only routes
router.post('/', authorize('instructor', 'admin'), createLabSession);
router.put('/:id', authorize('instructor', 'admin'), updateLabSession);
router.delete('/:id', authorize('instructor', 'admin'), deleteLabSession);

router.post('/:id/activities', authorize('instructor', 'admin'), addActivityToSession);
router.delete('/:id/activities/:activityId', authorize('instructor', 'admin'), removeActivityFromSession);

export default router;