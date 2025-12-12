import express from 'express';
import {
  submitCode,
  getMySubmissions,
  getAllMySubmissions
} from '../controllers/submissionController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, submitCode);
router.get('/my', authenticate, getAllMySubmissions);
router.get('/my/:activityId', authenticate, getMySubmissions);

export default router;