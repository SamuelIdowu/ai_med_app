import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getSupabaseAdmin } from '../db/client';
import { checkEmailAvailability } from '../validation/index';

const router: Router = Router();

// Strict rate-limiting on auth check endpoint to prevent automated credential enumeration
const authCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 checks per 15 min window
  message: {
    exists: false,
    error: 'Too many authentication check requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/check', authCheckLimiter, async (req: Request, res: Response) => {
  const email = checkEmailAvailability(req.body);

  if (!email) {
    return res.status(400).json({ exists: false, error: 'A valid email is required' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const supabase = getSupabaseAdmin();

    // The on_auth_user_created trigger + migration backfill keep public.users in
    // sync with auth.users, so one indexed lookup answers both cases without a
    // service-role admin scan.
    const { data: userRecord, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      throw new Error('lookup_failed');
    }

    return res.json({ exists: Boolean(userRecord) });
  } catch {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Unexpected error checking user');
    }
    res.status(500).json({ error: 'Unable to check user availability' });
  }
});

export default router;
