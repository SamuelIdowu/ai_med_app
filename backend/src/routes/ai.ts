import express from 'express';
import * as AIController from '../controllers/aiController';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { authenticateUser, optionalAuthenticateUser } from '../middleware/auth';

const router = express.Router();

// Enforce rate limiting on all AI routes
router.use(aiRateLimiter);

// Authenticated AI services
router.post('/chat', authenticateUser, AIController.chat);
router.post('/analyze', authenticateUser, AIController.analyze);

// Life-critical vitals triage: supports optional auth so first responders can triage immediately
router.post('/triage/vitals', optionalAuthenticateUser, AIController.triageVitals);

export default router;

