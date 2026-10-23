import express from 'express';
import * as AIController from '../controllers/aiController';
import { aiRateLimiter, guestAiRateLimiter } from '../middleware/rateLimiter';
import { authenticateUser, optionalAuthenticateUser } from '../middleware/auth';

const router = express.Router();

// Enforce rate limiting on all AI routes
router.use(aiRateLimiter);

// Guests may use chat (no function tools), but with a stricter per-IP limit.
const guestOnlyLimiter: express.RequestHandler = (req, res, next) => {
    if (req.user) {
        next();
        return;
    }
    guestAiRateLimiter(req, res, next);
};

// Chat supports optional auth so guest mode works; analyze stays auth-only (PHI/cost).
router.post('/chat', optionalAuthenticateUser, guestOnlyLimiter, AIController.chat);
router.post('/analyze', authenticateUser, AIController.analyze);

// Life-critical vitals triage: supports optional auth so first responders can triage immediately
router.post('/triage/vitals', optionalAuthenticateUser, AIController.triageVitals);

export default router;

