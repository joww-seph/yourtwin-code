import express from 'express';
import {
  searchStudents,
  getStudent,
  getAllStudents
} from '../controllers/studentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Instructors can search and view students
// IMPORTANT: Specific routes must come BEFORE parameterized routes
router.get('/search', authorize('instructor', 'admin'), searchStudents);
router.get('/', authorize('instructor', 'admin'), getAllStudents);
router.get('/:id', authorize('instructor', 'admin'), getStudent);

export default router;
