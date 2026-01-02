import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getMyTwinProfile,
  getAIDependencyAnalysis,
  getRecommendations,
  getCodingBehavior,
  getShadowPersonality,
  checkEncourageIndependence,
  adjustHintLevelForStudent,
  getHintFeedback,
  getCompetencySummary,
  getVelocityHistory,
  getStudentTwin,
  getClassTwinAnalytics
} from '../controllers/digitalTwinController.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============ STUDENT ROUTES ============

// Get my complete Digital Twin profile
router.get('/profile', getMyTwinProfile);

// Get AI dependency analysis
router.get('/ai-dependency', getAIDependencyAnalysis);

// Get personalized learning recommendations
router.get('/recommendations', getRecommendations);

// Get coding behavior analysis
router.get('/behavior', getCodingBehavior);

// Get Shadow Twin personality
router.get('/shadow-personality', getShadowPersonality);

// Get competency summary
router.get('/competencies', getCompetencySummary);

// Get learning velocity history
router.get('/velocity-history', getVelocityHistory);

// Check if should encourage independence before hint
router.post('/encourage-independence', checkEncourageIndependence);

// Adjust hint level based on profile
router.post('/adjust-hint-level', adjustHintLevelForStudent);

// Get post-hint feedback
router.post('/hint-feedback', getHintFeedback);

// ============ INSTRUCTOR ROUTES ============

// Get specific student's twin (instructor only)
router.get('/student/:studentId', authorize('instructor'), getStudentTwin);

// Get class-wide twin analytics (instructor only)
router.get('/class-analytics/:sessionId', authorize('instructor'), getClassTwinAnalytics);

export default router;
