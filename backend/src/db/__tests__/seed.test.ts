// backend/src/db/__tests__/seed.test.ts
import { describe, it, expect } from '@jest/globals';
import {
  chunkMedicalProtocol,
  generate384Embedding,
  DEFAULT_EMERGENCY_PROTOCOLS,
  loadAllProtocols,
} from '../seeds/seedGuidelines';

describe('Medical Guideline Chunking & Embedding', () => {
  it('chunks structured protocol into searchable text blocks', () => {
    const protocol = {
      title: 'Bleeding Control',
      category: 'trauma',
      steps: [
        'Apply direct pressure with a clean cloth.',
        'Elevate injury above heart.',
        'Apply tourniquet if severe.',
      ],
    };

    const chunks = chunkMedicalProtocol(protocol);
    expect(chunks.length).toBe(3);
    expect(chunks[0].content).toContain('direct pressure');
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].topic).toBe('Bleeding Control');
    expect(chunks[0].category).toBe('trauma');
  });

  it('generates normalized 384-dimensional dense vectors', () => {
    const text = 'Apply firm direct pressure to stop severe bleeding.';
    const vector = generate384Embedding(text);

    expect(vector.length).toBe(384);

    // Verify unit length normalization: L2 norm approximately 1.0
    let sumSq = 0;
    for (const val of vector) {
      sumSq += val * val;
    }
    const norm = Math.sqrt(sumSq);
    expect(norm).toBeGreaterThan(0.95);
    expect(norm).toBeLessThan(1.05);
  });

  it('loads emergency protocols with all critical categories', () => {
    const protocols = loadAllProtocols();
    expect(protocols.length).toBeGreaterThanOrEqual(7);

    const categories = protocols.map((p) => p.category.toLowerCase());
    expect(categories.some((c) => c.includes('cpr'))).toBe(true);
    expect(categories.some((c) => c.includes('bleed'))).toBe(true);
    expect(categories.some((c) => c.includes('burn'))).toBe(true);
    expect(categories.some((c) => c.includes('chok'))).toBe(true);
  });
});
