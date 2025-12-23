import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// If the key is the placeholder, treat it as missing
if (supabaseServiceKey === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
    supabaseServiceKey = '';
}

// Fallback to Anon Key if Service Role Key is missing
supabaseServiceKey = supabaseServiceKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('Supabase URL or Key is missing. Check your .env file.');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY === 'YOUR_SUPABASE_SERVICE_ROLE_KEY') {
    console.warn('WARNING: Using Anon Key for backend interactions. Some administrative actions may fail. Please set SUPABASE_SERVICE_ROLE_KEY in .env.');
}

import fetch from 'node-fetch';

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    global: {
        fetch: fetch as any
    }
});

export const createAuthenticatedClient = (accessToken: string) => {
    return createClient(supabaseUrl, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || supabaseServiceKey, {
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
            fetch: fetch as any
        },
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};
