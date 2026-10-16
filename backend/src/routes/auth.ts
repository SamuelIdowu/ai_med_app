import express from 'express';
import { supabase } from '../config/supabase';

import crypto from 'crypto';
const router = express.Router();

router.post('/check', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ exists: false, error: 'Email is required' });
    }

    try {
        // Try to create a user. If it fails with "User already registered", they exist.
        // We use a cryptographically random password that meets complexity requirements.
        const probePassword = crypto.randomBytes(24).toString('base64') + '!Aa1';
        const { data, error } = await supabase.auth.admin.createUser({
            email: email,
            password: probePassword,
            email_confirm: false, // Don't confirm automatically
            user_metadata: { is_probe: true }
        });

        if (error) {
            // Check for specific error message or code indicating existence
            if (
                error.code === 'email_exists' ||
                (error as any).status === 422 ||
                error.message.includes('already registered') ||
                error.message.includes('User already exists')
            ) {
                return res.json({ exists: true });
            }
            // Other error?
            console.error('Check user error:', error);
            // If we can't tell, assume false to allow normal signup flow to handle it (or fail there)
            return res.json({ exists: false });
        }

        // If success, the user DID NOT KEY EXIST. We must DELETE this probe user immediately.
        if (data.user) {
            await supabase.auth.admin.deleteUser(data.user.id);
        }

        return res.json({ exists: false });

    } catch (e: any) {
        console.error('Unexpected error checking user:', e);
        res.status(500).json({ error: e.message });
    }
});

export default router;
