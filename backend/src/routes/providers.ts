import express from 'express';
import { authenticateUser } from '../middleware/auth';
import { getSupabaseAdmin } from '../db/client';
import { cacheService } from '../services/cacheService';

const router = express.Router();
const CACHE_KEY_ALL_PROVIDERS = 'providers:all';
const CACHE_TTL_SECONDS = 300; // 5 minutes

router.use(authenticateUser);

router.get('/', async (req, res) => {
    try {
        // 1. Check cache first
        const cached = await cacheService.get<any[]>(CACHE_KEY_ALL_PROVIDERS);
        if (cached) {
            res.setHeader('X-Cache-Status', 'HIT');
            res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
            return res.json(cached);
        }

        // 2. Fetch from Supabase
        const supabase = getSupabaseAdmin();
        const { data: providers, error } = await supabase
            .from('providers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;

        const results = providers || [];
        await cacheService.set(CACHE_KEY_ALL_PROVIDERS, results, CACHE_TTL_SECONDS);

        res.setHeader('X-Cache-Status', 'MISS');
        res.setHeader('Cache-Control', 'private, max-age=300, stale-while-revalidate=600');
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const cacheKey = `provider:${req.params.id}`;
        const cached = await cacheService.get<any>(cacheKey);
        if (cached) {
            res.setHeader('X-Cache-Status', 'HIT');
            return res.json(cached);
        }

        const supabase = getSupabaseAdmin();
        const { data: provider, error } = await supabase
            .from('providers')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Provider not found' });
        }

        await cacheService.set(cacheKey, provider, CACHE_TTL_SECONDS);
        res.setHeader('X-Cache-Status', 'MISS');
        res.json(provider);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
