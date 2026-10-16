import express from 'express';
import * as AIController from '../controllers/aiController';
import { aiRateLimiter } from '../middleware/rateLimiter';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Enforce JWT authentication AND rate limiting on all AI routes
router.use(authenticateUser);
router.use(aiRateLimiter);

router.post('/chat', AIController.chat);
router.post('/analyze', AIController.analyze);

export default router;
