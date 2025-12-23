import express from 'express';
import { createEncounter, getEncounter, getEncounters } from '../services/encounterService';
import { getUploadUrl } from '../services/storageService';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

router.use(authenticateUser);

router.post('/', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || '';
        const encounter = await createEncounter(req.user.id, req.body, token);
        res.status(201).json(encounter);
    } catch (error: any) {
        console.error('Error creating encounter:', error);
        res.status(500).json({ error: error.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || '';
        const encounters = await getEncounters(req.user.id, token);
        res.json(encounters);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1] || '';
        const encounter = await getEncounter(req.params.id, req.user.id, token);
        if (!encounter) {
            return res.status(404).json({ message: 'Encounter not found' });
        }
        res.json(encounter);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/:id/photos', async (req, res) => {
    try {
        const { fileName } = req.body;
        if (!fileName) {
            return res.status(400).json({ error: 'fileName is required' });
        }
        // Verify encounter ownership/existence if needed, but storage path is user-isolated usually.
        // For strictness, could check getEncounter first.

        const uploadData = await getUploadUrl(req.user.id, fileName);
        res.json(uploadData);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
