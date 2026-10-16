import express from 'express';
import rateLimit from 'express-rate-limit';
import { getSupabaseAdmin } from '../db/client';

const router = express.Router();

// Strict rate-limiting on auth check endpoint to prevent automated credential enumeration
const authCheckLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 checks per 15 min window
    message: { exists: false, error: 'Too many authentication check requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

router.post('/check', authCheckLimiter, async (req, res) => {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
        return res.status(400).json({ exists: false, error: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
        const supabase = getSupabaseAdmin();

        // 1. Check primary users table
        const { data: userRecord } = await supabase
            .from('users')
            .select('id')
            .ilike('email', normalizedEmail)
            .maybeSingle();

        if (userRecord) {
            return res.json({ exists: true });
        }

        // 2. Safe check against auth admin without creating/deleting phantom probe accounts
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        if (!authError && authData?.users) {
            const existsInAuth = authData.users.some(
                (u) => u.email?.toLowerCase().trim() === normalizedEmail
            );
            return res.json({ exists: existsInAuth });
        }

        return res.json({ exists: false });
    } catch (e: any) {
        console.error('Unexpected error checking user:', e);
        res.status(500).json({ error: e.message || 'Error checking user' });
    }
});

export default router;
