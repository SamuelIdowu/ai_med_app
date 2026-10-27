import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateUser } from '../middleware/auth';
import { getSupabaseAdmin } from '../db/client';
import { cacheService } from '../services/cacheService';
import { findGeoapifyProviderPhone, findNearbyProviders } from '../services/nearbyProvidersService';

const router = express.Router();
const CACHE_KEY_ALL_PROVIDERS = 'providers:all';
const CACHE_TTL_SECONDS = 300; // 5 minutes

const nearbySearchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// Facility data is public. Keep nearby search available to guest users as well.
router.get('/nearby', nearbySearchLimiter, async (req, res) => {
  const latitude = typeof req.query.lat === 'string' ? Number(req.query.lat) : NaN;
  const longitude = typeof req.query.lng === 'string' ? Number(req.query.lng) : NaN;
  const radiusMeters =
    req.query.radius === undefined
      ? 50_000
      : typeof req.query.radius === 'string'
        ? Number(req.query.radius)
        : NaN;

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({ error: 'Valid lat and lng query parameters are required' });
  }

  if (!Number.isFinite(radiusMeters) || radiusMeters < 250 || radiusMeters > 50_000) {
    return res.status(400).json({ error: 'Radius must be between 250 and 50000 meters' });
  }

  try {
    const result = await findNearbyProviders({ latitude, longitude }, radiusMeters);
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.json(result);
  } catch (error) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(
        'Nearby provider lookup failed:',
        error instanceof Error ? error.message : 'Unknown upstream error',
      );
    }
    return res.status(502).json({
      error:
        'Live map data could not be reached. Check backend internet access or configure OVERPASS_API_URL.',
      code: 'PROVIDER_DATA_UNAVAILABLE',
    });
  }
});

// Contact enrichment is on demand so the nearby list does not make a details
// request for every facility. Phone data is returned only when the source has it.
router.get('/nearby/:providerId/contact', nearbySearchLimiter, async (req, res) => {
  const prefix = 'geoapify-';
  if (!req.params.providerId.startsWith(prefix)) {
    return res.json({ phone: null });
  }
  const placeId = req.params.providerId.slice(prefix.length);
  if (!placeId || placeId.length > 2048) {
    return res.status(400).json({ error: 'Invalid provider ID' });
  }

  try {
    const phone = await findGeoapifyProviderPhone(placeId);
    res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
    return res.json({ phone });
  } catch {
    return res.status(502).json({ error: 'Facility contact details are temporarily unavailable' });
  }
});

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
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to fetch providers');
    }
    res.status(500).json({ error: 'Failed to fetch providers' });
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
    if (process.env.NODE_ENV !== 'test') {
      console.error('Failed to fetch provider');
    }
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
});

export default router;
