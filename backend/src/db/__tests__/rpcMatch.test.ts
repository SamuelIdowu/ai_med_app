// backend/src/db/__tests__/rpcMatch.test.ts
import { describe, it, expect } from '@jest/globals';
import { getSupabaseAdmin } from '../client';
import { generate384Embedding } from '../seeds/seedGuidelines';

describe('Vector Cosine Similarity Guideline Matching', () => {
  it('queries match_guidelines RPC with 384-dimensional query vector', async () => {
    const supabase = getSupabaseAdmin();
    const queryText = 'chest compressions CPR and cardiac arrest emergency';
    const queryVector = generate384Embedding(queryText);

    const { data, error } = await supabase.rpc('match_guidelines', {
      query_embedding: queryVector,
      match_threshold: 0.1,
      match_count: 3,
    });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    expect(data[0]).toHaveProperty('topic');
    expect(data[0]).toHaveProperty('content');
    expect(data[0]).toHaveProperty('similarity');
  }, 20000);
});
