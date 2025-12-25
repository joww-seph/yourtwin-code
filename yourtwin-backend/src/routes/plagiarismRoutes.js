import express from 'express';
import {
  checkSubmissionPlagiarism,
  getActivityPlagiarismReport,
  compareSubmissions,
  getSessionPlagiarismReport
} from '../controllers/plagiarismController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication and instructor/admin role
router.use(authenticate);
router.use(authorize('instructor', 'admin'));

// Check plagiarism for a specific submission
router.get('/submission/:submissionId', checkSubmissionPlagiarism);

// Get plagiarism report for an activity
router.get('/activity/:activityId', getActivityPlagiarismReport);

// Compare two specific submissions
router.get('/compare/:submissionId1/:submissionId2', compareSubmissions);

// Get plagiarism report for an entire session
router.get('/session/:sessionId', getSessionPlagiarismReport);

export default router;
