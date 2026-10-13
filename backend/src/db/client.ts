// backend/src/db/client.ts
// Supabase Database Service & Admin Client Singleton

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fetch from 'node-fetch';

// Load from root .env and local
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

let adminClientInstance: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClientInstance) return adminClientInstance;

  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  adminClientInstance = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: fetch as any,
    },
  });

  return adminClientInstance;
}

export function createAuthenticatedClient(accessToken: string): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase configuration');
  }

  return createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      fetch: fetch as any,
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
