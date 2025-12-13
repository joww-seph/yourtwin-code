import express from 'express';
import {
  submitCode,
  getMySubmissions,
  getSubmission,
  getAllMySubmissions,
  compareSubmissions
} from '../controllers/submissionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, submitCode);
router.get('/my', authenticate, getAllMySubmissions);
router.get('/activity/:activityId', authenticate, getMySubmissions);
router.get('/compare/:id1/:id2', authenticate, compareSubmissions);
router.get('/:id', authenticate, getSubmission);

export default router;