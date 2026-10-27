import express from 'express';
import { getProfile, upsertProfile } from '../services/profileService';
import { authenticateUser } from '../middleware/auth';
import { logAudit } from '../services/auditService';

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
    logAudit({
      userId: req.user.id,
      action: 'READ_PROFILE',
      resourceType: 'PROFILE',
      resourceId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get?.('user-agent'),
    });
    res.json(profile);
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('GET /api/v1/profile error');
    }
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.post('/', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    const profile = await upsertProfile(req.user.id, req.body, token);
    logAudit({
      userId: req.user.id,
      action: 'UPDATE_PROFILE',
      resourceType: 'PROFILE',
      resourceId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get?.('user-agent'),
    });
    res.json(profile);
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('POST /api/v1/profile error');
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
