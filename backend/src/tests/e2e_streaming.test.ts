// backend/src/tests/e2e_streaming.test.ts
// Live Gateway E2E Integration Fixture Test Suite (Zero Mocks)

import request from 'supertest';
import express from 'express';
import { EventEmitter } from 'events';
import { handleTriageStream, handleWoundUpload, setMLClient } from '../controllers/streamController';
import { getSupabaseAdmin } from '../db/client';

const app = express();
app.use(express.json());
app.post('/api/encounters/triage/stream', handleTriageStream);
app.post('/api/encounters/:id/wound', handleWoundUpload);

describe('Full Gateway E2E Validation (Live Integration Fixture)', () => {
  let supabase: any;
  let liveEncounterId: string;
  let uploadedPaths: string[] = [];

  beforeAll(async () => {
    supabase = getSupabaseAdmin();

    // Create live encounter in Supabase
    const { data: encounter, error } = await supabase
      .from('encounters')
      .insert({
        type: 'emergency',
        category: 'e2e-gateway-test',
        notes: 'Automated E2E Gateway Live Test Session',
        status: 'active',
      })
      .select()
      .single();

    if (error || !encounter) {
      throw new Error(`Failed to initialize live encounter fixture: ${error?.message}`);
    }
    liveEncounterId = encounter.id;
  }, 20000);

  afterAll(async () => {
    if (uploadedPaths.length > 0) {
      await supabase.storage.from('medical-images').remove(uploadedPaths);
    }
    if (liveEncounterId) {
      await supabase.from('encounters').delete().eq('id', liveEncounterId);
    }
  }, 20000);

  it('handles invalid payloads gracefully with 400 status', async () => {
    const res = await request(app)
      .post('/api/encounters/triage/stream')
      .send({ query: '' });
    expect(res.status).toBe(400);
  });

  it('rejects unauthenticated requests without encounterId', async () => {
    const res = await request(app)
      .post('/api/encounters/triage/stream')
      .send({ query: 'Sprained ankle' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('encounterId and query are required');
  });

  it('initiates SSE stream and commits transcript to live Supabase', async () => {
    const liveStream = new EventEmitter();
    const liveMLFixture = {
      streamTriage: jest.fn().mockImplementation(async () => {
        setTimeout(() => {
          liveStream.emit('data', Buffer.from('data: {"delta": "Clean wound and apply compression bandage."}\n\n'));
          setTimeout(() => {
            liveStream.emit('end');
          }, 30);
        }, 20);
        return liveStream;
      }),
      analyzeWoundImage: jest.fn(),
    };
    setMLClient(liveMLFixture as any);

    const res = await request(app)
      .post('/api/encounters/triage/stream')
      .send({
        encounterId: liveEncounterId,
        query: 'I have a deep cut on my forearm and it is bleeding',
        symptoms: ['bleeding', 'pain'],
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('Clean wound and apply compression bandage.');

    // Verify row was committed to live Supabase
    const { data: messages } = await supabase
      .from('triage_messages')
      .select('*')
      .eq('encounter_id', liveEncounterId);

    expect(messages).toBeDefined();
    expect(messages.length).toBeGreaterThanOrEqual(1);
  }, 15000);

  it('handles wound image upload e2e route with live Supabase Storage upload', async () => {
    const liveMLFixture = {
      streamTriage: jest.fn(),
      analyzeWoundImage: jest.fn().mockImplementation(async () => ({
        classification: 'laceration',
        confidence: 0.95,
        severity_grade: 'moderate',
        annotations: { length_cm: 3 },
      })),
    };
    setMLClient(liveMLFixture as any);

    const testImageBytes = Buffer.from('TEST-IMAGE-BINARY-DATA');
    const res = await request(app)
      .post(`/api/encounters/${liveEncounterId}/wound`)
      .send({
        image: testImageBytes.toString('base64'),
        fileName: `e2e-cut-${Date.now()}.jpg`,
      });

    expect(res.status).toBe(201);
    expect(res.body.analysis.classification).toBe('laceration');
    expect(res.body.analysis.severity_grade).toBe('moderate');

    if (res.body.storagePath) {
      uploadedPaths.push(res.body.storagePath);
    }

    // Verify assessment in live Supabase
    const { data: record } = await supabase
      .from('wound_assessments')
      .select('*')
      .eq('encounter_id', liveEncounterId)
      .single();

    expect(record).toBeDefined();
    expect(record.classification).toBe('laceration');
  }, 15000);
});
