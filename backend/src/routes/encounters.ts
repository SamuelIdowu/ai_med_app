// backend/src/routes/encounters.ts
// Emergency Encounter & Real-time Triage Streaming Routes

import express from 'express';
import * as encounterController from '../controllers/encounterController';
import { handleTriageStream, handleWoundUpload } from '../controllers/streamController';
import { getUploadUrl } from '../services/storageService';
import { authenticateUser } from '../middleware/auth';

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
    const { fileName } = req.body;
    if (!fileName) {
      return res.status(400).json({ error: 'fileName is required' });
    }
    const token = req.headers.authorization?.split(' ')[1] || '';
    const encounterRecord = await getEncounter(req.params.id, req.user.id, token);
    if (!encounterRecord) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    const uploadData = await getUploadUrl(req.user.id, fileName);
    res.json(uploadData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
