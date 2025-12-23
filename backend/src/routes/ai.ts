import express from 'express';
import * as AIController from '../controllers/aiController';
import { aiRateLimiter } from '../middleware/rateLimiter';

const router = express.Router();

// Apply rate limiting to all AI routes
router.use(aiRateLimiter);

router.post('/chat', AIController.chat);
router.post('/analyze', AIController.analyze);

export default router;
