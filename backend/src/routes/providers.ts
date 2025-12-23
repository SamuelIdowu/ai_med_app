import express from 'express';
import { authenticateUser } from '../middleware/auth';
import { supabase } from '../config/supabase';

const router = express.Router();

console.log('Providers route loaded');

router.use(authenticateUser);

router.get('/', async (req, res) => {
    try {
        // Mock response for now as we don't have a provider DB or Google Maps key set up in the checklist tasks explicitly
        // logic to fetch providers.
        const { data: providers, error } = await supabase
            .from('providers')
            .select('*');

        if (error) throw error;

        res.json(providers);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
