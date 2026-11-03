// backend/src/routes/encounters.ts
// Emergency Encounter & Real-time Triage Streaming Routes

import express from 'express';
import * as encounterController from '../controllers/encounterController';
import { handleTriageStream, handleWoundUpload } from '../controllers/streamController';
import { getUploadUrl } from '../services/storageService';
import { authenticateUser } from '../middleware/auth';
import { validateUuidParam } from '../validation/index';

import { getEncounter } from '../services/encounterService';

const router = express.Router();

// Enforce JWT authentication on all encounter routes
router.use(authenticateUser);

// --- Real-time Triage SSE Streaming ---
router.post('/triage/stream', handleTriageStream);

// --- Encounter CRUD Operations ---
router.post('/', encounterController.create);
router.get('/', encounterController.list);
router.get('/:id', encounterController.getById);
router.patch('/:id/status', encounterController.updateStatus);
router.delete('/:id', encounterController.remove);

// --- Wound Vision & Media Attachments ---
router.post('/:id/wound', handleWoundUpload);
router.post('/:id/photos', async (req, res) => {
  try {
    const uuidResult = validateUuidParam(req.params.id);
    if (!uuidResult.ok) {
      return res.status(400).json({ error: uuidResult.error });
    }
    const { fileName } = req.body;
    if (!fileName || typeof fileName !== 'string' || fileName.length > 255) {
      return res.status(400).json({ error: 'Valid fileName is required' });
    }
    const token = req.headers.authorization?.split(' ')[1] || '';
    const encounterRecord = await getEncounter(uuidResult.value, req.user.id, token);
    if (!encounterRecord) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    const uploadData = await getUploadUrl(req.user.id, fileName);
    res.json(uploadData);
  } catch (error: any) {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to get upload URL');
    }
    res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

export default router;
