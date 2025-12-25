import express from 'express';
import {
  submitCode,
  getMySubmissions,
  getSubmission,
  getAllMySubmissions,
  compareSubmissions,
  runSandbox,
  getStudentStats
} from '../controllers/submissionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, submitCode);
router.post('/sandbox', authenticate, runSandbox);
router.get('/my', authenticate, getAllMySubmissions);
router.get('/stats', authenticate, getStudentStats);
router.get('/activity/:activityId', authenticate, getMySubmissions);
router.get('/compare/:id1/:id2', authenticate, compareSubmissions);
// Keep /:id route LAST to avoid catching specific routes like /my
router.get('/:id', authenticate, getSubmission);

export default router;