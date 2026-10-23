// backend/src/db/client.ts
// Supabase Database Service & Admin Client Singleton

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import '../config/env';

let adminClient: SupabaseClient | null = null;

function getSupabaseUrl(): string | undefined {
  return process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
}

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  // Always supply the service role key explicitly in headers to prevent session pollution
  adminClient = createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
      fetch: fetch as any,
    },
  });

  return adminClient;
}

export function createAuthenticatedClient(accessToken: string): SupabaseClient {
  const url = getSupabaseUrl();
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

// Backwards-compatible singleton used by auth/analytics routes. Resolved lazily
// so importing this module does not require credentials to be present.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getSupabaseAdmin();
    const value = (client as any)[property];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
