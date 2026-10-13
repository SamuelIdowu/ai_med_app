// backend/src/tests/e2e_streaming.test.ts
import request from 'supertest';
import express from 'express';
import { EventEmitter } from 'events';
import { handleTriageStream, handleWoundUpload, setMLClient } from '../controllers/streamController';
import { getSupabaseAdmin } from '../db/client';

jest.mock('../db/client');

const app = express();
app.use(express.json());
app.post('/api/encounters/triage/stream', handleTriageStream);
app.post('/api/encounters/:id/wound', handleWoundUpload);

describe('Full Gateway E2E Validation', () => {
  let mockSupabase: any;
  let mockInsert: any;
  let mockUpload: any;
  let mockMLClient: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInsert = jest.fn().mockImplementation(() => ({
      select: jest.fn().mockImplementation(() => ({
        single: jest.fn().mockImplementation(async () => ({ data: { id: 'msg-1' }, error: null })),
      })),
      then: (resolve: any) => resolve({ data: { id: 'msg-1' }, error: null }),
    }));

    mockUpload = jest.fn().mockImplementation(async () => ({
      data: { path: 'encounters/enc-1/wound.jpg' },
      error: null,
    }));

    mockSupabase = {
      from: jest.fn().mockImplementation(() => ({
        insert: mockInsert,
      })),
      storage: {
        from: jest.fn().mockImplementation(() => ({
          upload: mockUpload,
        })),
      },
    };

    (getSupabaseAdmin as any) = jest.fn().mockImplementation(() => mockSupabase);

    mockMLClient = {
      streamTriage: jest.fn(),
      analyzeWoundImage: jest.fn(),
    };
    setMLClient(mockMLClient);
  });

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

  it('initiates SSE stream and returns chunks from ML engine', async () => {
    const mockStream = new EventEmitter();
    mockMLClient.streamTriage.mockImplementation(async () => {
      setTimeout(() => {
        mockStream.emit('data', Buffer.from('data: {"delta": "Apply ice and elevate."}\n\n'));
        setTimeout(() => {
          mockStream.emit('end');
        }, 20);
      }, 20);
      return mockStream;
    });

    const res = await request(app)
      .post('/api/encounters/triage/stream')
      .send({
        encounterId: 'enc-e2e-1',
        query: 'I have a sprained ankle with swelling',
        symptoms: ['swelling', 'pain'],
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(res.text).toContain('Apply ice and elevate.');
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        encounter_id: 'enc-e2e-1',
        sender: 'user',
      })
    );
  });

  it('handles wound image upload e2e route gracefully', async () => {
    mockMLClient.analyzeWoundImage.mockImplementation(async () => ({
      classification: 'laceration',
      confidence: 0.95,
      severity_grade: 'moderate',
      annotations: { length_cm: 3 },
    }));

    const res = await request(app)
      .post('/api/encounters/enc-e2e-1/wound')
      .send({
        image: Buffer.from('fake-image-bytes').toString('base64'),
        fileName: 'cut.jpg',
      });

    expect(res.status).toBe(201);
    expect(res.body.analysis.classification).toBe('laceration');
    expect(res.body.analysis.severity_grade).toBe('moderate');
  });
});
