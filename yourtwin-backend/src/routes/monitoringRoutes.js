import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  startMonitoring,
  recordEvent,
  recordEvents,
  endMonitoring,
  getMyMonitoring,
  getSessionMonitoring,
  getStudentActivityMonitoring,
  getFlaggedStudents
} from '../controllers/monitoringController.js';

const router = express.Router();

// Student endpoints (requires authentication)
router.post('/start', authenticate, startMonitoring);
router.post('/event', authenticate, recordEvent);
router.post('/events', authenticate, recordEvents);
router.post('/end', authenticate, endMonitoring);
router.get('/my/:activityId', authenticate, getMyMonitoring);

// Instructor endpoints
router.get('/session/:sessionId', authenticate, authorize('instructor'), getSessionMonitoring);
router.get('/student/:studentId/activity/:activityId', authenticate, authorize('instructor'), getStudentActivityMonitoring);
router.get('/flagged/:sessionId', authenticate, authorize('instructor'), getFlaggedStudents);

export default router;
