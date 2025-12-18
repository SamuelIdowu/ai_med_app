import express from 'express';
import { authenticateUser } from '../middleware/auth';

const router = express.Router();

console.log('Providers route loaded');

router.use(authenticateUser);

router.get('/', async (req, res) => {
    try {
        // Mock response for now as we don't have a provider DB or Google Maps key set up in the checklist tasks explicitly
        // logic to fetch providers.
        const providers = [
            {
                id: '1',
                name: 'City General Hospital',
                address: '123 Main St',
                type: 'Hospital',
                latitude: 40.7128,
                longitude: -74.0060,
                phone: '555-0123'
            },
            {
                id: '2',
                name: 'Downtown Urgent Care',
                address: '456 Market St',
                type: 'Clinic',
                latitude: 40.7138,
                longitude: -74.0070,
                phone: '555-0456'
            }
        ];
        res.json(providers);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
