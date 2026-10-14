import express from 'express';
import { getProfile, upsertProfile } from '../services/profileService';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

// Middleware to ensure user is authenticated
router.use(authenticateUser);

router.get('/', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || '';
        const profile = await getProfile(req.user.id, token);
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.json(profile);
    } catch (error: any) {
        console.error('GET /api/v1/profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || '';
        const profile = await upsertProfile(req.user.id, req.body, token);
        res.json(profile);
    } catch (error: any) {
        console.error('POST /api/v1/profile error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
