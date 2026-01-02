import express from 'express';
import {
  createLabSession,
  getLabSessions,
  getLabSession,
  updateLabSession,
  deleteLabSession,
  activateLabSession,
  deactivateLabSession,
  markSessionComplete,
  reopenSession,
  extendLabSession,
  allowResubmission,
  getAvailableStudents,
  addStudentsToSession,
  removeStudentFromSession,
  getSessionProgress,
  getActivityProgress
} from '../controllers/labSessionController.js';
import { createActivity, getSessionActivities } from '../controllers/activityController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Lab Session routes
router.get('/', getLabSessions);
router.get('/:id', getLabSession);
router.post('/', authorize('instructor', 'admin'), createLabSession);
router.put('/:id', authorize('instructor', 'admin'), updateLabSession);
router.delete('/:id', authorize('instructor', 'admin'), deleteLabSession);

// Session activation/deactivation/completion
router.put('/:id/activate', authorize('instructor', 'admin'), activateLabSession);
router.put('/:id/deactivate', authorize('instructor', 'admin'), deactivateLabSession);
router.put('/:id/complete', authorize('instructor', 'admin'), markSessionComplete);
router.put('/:id/reopen', authorize('instructor', 'admin'), reopenSession);
router.put('/:id/extend', authorize('instructor', 'admin'), extendLabSession);

// Student management
router.get('/:id/available-students', authorize('instructor', 'admin'), getAvailableStudents);
router.post('/:id/students', authorize('instructor', 'admin'), addStudentsToSession);
router.delete('/:id/students/:studentId', authorize('instructor', 'admin'), removeStudentFromSession);

// Resubmission control
router.put('/:sessionId/resubmit/:studentId/:activityId', authorize('instructor', 'admin'), allowResubmission);

// Middleware to pass sessionId to activity controller
const passSessionId = (req, res, next) => {
  req.params.sessionId = req.params.id;
  next();
};

// Activity management within sessions
router.post('/:id/activities', authorize('instructor', 'admin'), passSessionId, createActivity);
router.get('/:id/activities', passSessionId, getSessionActivities);

// Progress tracking (instructor only)
router.get('/:id/progress', authorize('instructor', 'admin'), getSessionProgress);
router.get('/:id/activities/:activityId/progress', authorize('instructor', 'admin'), getActivityProgress);

export default router;
