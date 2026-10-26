import '../config/env';
import fetch from 'node-fetch';
import { normalizeServiceUrl } from '../services/mlClient';

type Result = { name: string; ok: boolean; detail: string };

const results: Result[] = [];

function record(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
}

function getSupabaseUrl(): string {
  return (process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(
    /\/+$/,
    '',
  );
}

async function request(url: string, key: string, headers: Record<string, string> = {}) {
  return fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      ...headers,
    },
  });
}

async function checkSupabaseServiceKey() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url) {
    record('Supabase URL', false, 'SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL is missing');
    return;
  }

  record('Supabase URL', true, url);

  if (!key) {
    record('Supabase service role key', false, 'SUPABASE_SERVICE_ROLE_KEY is missing');
    return;
  }

  const response = await request(`${url}/rest/v1/providers?select=id&limit=1`, key);
  record(
    'Supabase service role key',
    response.ok,
    response.ok ? 'authenticated successfully' : `HTTP ${response.status}`,
  );
}

async function checkAnonKeyAndGoogle() {
  const url = getSupabaseUrl();
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!key) {
    record('Supabase anonymous key', false, 'EXPO_PUBLIC_SUPABASE_ANON_KEY is missing');
    return;
  }

  const response = await request(`${url}/auth/v1/settings`, key);
  if (!response.ok) {
    record('Supabase anonymous key', false, `HTTP ${response.status}`);
    return;
  }

  const settings = (await response.json()) as {
    external?: { google?: boolean };
    mailer_autoconfirm?: boolean;
  };

  record('Supabase anonymous key', true, 'authenticated successfully');
  record(
    'Google auth provider',
    Boolean(settings.external?.google),
    settings.external?.google ? 'enabled' : 'disabled',
  );
  record(
    'Email confirmation',
    true,
    settings.mailer_autoconfirm
      ? 'autoconfirm enabled'
      : 'autoconfirm disabled; configure SMTP before public signup',
  );
}

async function checkTables() {
  const url = getSupabaseUrl();
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
  const tables = [
    'users',
    'medical_profiles',
    'encounters',
    'providers',
    'reports',
    'notifications',
  ];

  for (const table of tables) {
    const response = await request(`${url}/rest/v1/${table}?select=id&limit=1`, key);
    record(`Table ${table}`, response.ok, response.ok ? 'reachable' : `HTTP ${response.status}`);
  }
}

async function checkStorageBucket() {
  const url = getSupabaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!key) {
    record('Storage bucket medical-images', false, 'service role key missing');
    return;
  }

  const response = await request(`${url}/storage/v1/bucket`, key);
  if (!response.ok) {
    record('Storage bucket medical-images', false, `HTTP ${response.status}`);
    return;
  }

  const buckets = (await response.json()) as Array<{ id?: string; name?: string }>;
  const found = buckets.some((bucket) => (bucket.id || bucket.name) === 'medical-images');
  record('Storage bucket medical-images', found, found ? 'present' : 'missing');
}

async function checkMlService() {
  const baseUrl = normalizeServiceUrl(process.env.ML_SERVICE_URL);

  try {
    const response = await fetch(`${baseUrl}/health`, { timeout: 10000 } as never);
    record(
      'ML service health',
      response.ok,
      response.ok ? baseUrl : `${baseUrl} returned HTTP ${response.status}`,
    );
  } catch (error) {
    record('ML service health', false, `${baseUrl} is unreachable`);
  }
}

async function main() {
  const geminiKey = process.env.GEMINI_API_KEY || '';
  record('Gemini API key', Boolean(geminiKey), geminiKey ? 'configured' : 'missing');

  await checkSupabaseServiceKey();
  await checkAnonKeyAndGoogle();
  await checkTables();
  await checkStorageBucket();
  await checkMlService();

  for (const result of results) {
    const prefix = result.ok ? '[PASS]' : '[FAIL]';
    console.log(`${prefix} ${result.name}: ${result.detail}`);
  }

  if (results.some((result) => !result.ok)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error('[FAIL] Preflight crashed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
