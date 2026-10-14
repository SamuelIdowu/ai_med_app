import express from 'express';
import { authenticateUser } from '../middleware/auth';
import { getSupabaseAdmin } from '../db/client';

const router = express.Router();

router.use(authenticateUser);

router.get('/', async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { data: providers, error } = await supabase
            .from('providers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        res.json(providers || []);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const supabase = getSupabaseAdmin();
        const { data: provider, error } = await supabase
            .from('providers')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        res.json(provider);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
