// backend/src/db/__tests__/client.test.ts
import { describe, it, expect } from '@jest/globals';
import { getSupabaseAdmin, createAuthenticatedClient } from '../client';

describe('Supabase Database Service', () => {
  it('initializes admin client with valid credentials', () => {
    const db = getSupabaseAdmin();
    expect(db).toBeDefined();
    expect(typeof db.from).toBe('function');
    expect(typeof db.storage.from).toBe('function');
  });

  it('creates authenticated client instance', () => {
    const authClient = createAuthenticatedClient('dummy-jwt-token');
    expect(authClient).toBeDefined();
    expect(typeof authClient.from).toBe('function');
  });
});
