import { describe, it, expect, jest, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import { EventEmitter } from 'events';
import { handleTriageStream, handleWoundUpload, setMLClient } from '../streamController';
import { getSupabaseAdmin } from '../../db/client';

describe('Stream & Wound Controller (Live Integration Fixture)', () => {
  let supabase: any;
  let testUserId: string;
  let testEncounterId: string;
  let uploadedPaths: string[] = [];

  let statusMock: any;
  let jsonMock: any;
  let writeMock: any;
  let endMock: any;
  let setHeaderMock: any;
  let flushHeadersMock: any;
  let mockRes: Partial<Response>;

  beforeAll(async () => {
    supabase = getSupabaseAdmin();

    // 1. Create a live test user in Supabase auth
    const testEmail = `stream-test-${Date.now()}@example.com`;
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: 'LiveTestPassword123!',
      email_confirm: true,
    });
    if (userError || !userData?.user) {
      throw new Error(`Failed to create test user in Supabase: ${userError?.message}`);
    }
    testUserId = userData.user.id;

    // 2. Create live encounter fixture for triage testing
    const { data: encounterData, error: encounterError } = await supabase
      .from('encounters')
      .insert({
        user_id: testUserId,
        type: 'emergency',
        category: 'triage',
        notes: 'Live Triage Stream Test Session',
        status: 'active',
      })
      .select()
      .single();

    if (encounterError || !encounterData) {
      throw new Error(`Failed to create test encounter: ${encounterError?.message}`);
    }
    testEncounterId = encounterData.id;
  }, 20000);

  afterAll(async () => {
    // Cleanup live fixtures from Supabase
    if (uploadedPaths.length > 0) {
      await supabase.storage.from('medical-images').remove(uploadedPaths);
    }
    if (testEncounterId) {
      await supabase.from('encounters').delete().eq('id', testEncounterId);
    }
    if (testUserId) {
      await supabase.auth.admin.deleteUser(testUserId);
    }
  }, 20000);

  beforeEach(() => {
    jsonMock = jest.fn();
    writeMock = jest.fn();
    endMock = jest.fn();
    setHeaderMock = jest.fn();
    flushHeadersMock = jest.fn();
    statusMock = jest.fn().mockImplementation(() => ({ json: jsonMock }));

    mockRes = {
      status: statusMock,
      json: jsonMock,
      write: writeMock,
      end: endMock,
      setHeader: setHeaderMock,
      flushHeaders: flushHeadersMock,
    };
  });

  describe('handleTriageStream', () => {
    it('rejects request if encounterId or query is missing', async () => {
      const req = {
        user: { id: testUserId },
        body: { encounterId: testEncounterId }, // query is missing
        on: jest.fn() as any,
      } as Partial<Request>;

      await handleTriageStream(req as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });

    it('sets SSE headers, streams tokens, and saves messages into live Supabase', async () => {
      const liveStream = new EventEmitter();
      const liveMLFixture = {
        streamTriage: jest.fn().mockImplementation(async () => {
          setTimeout(() => {
            liveStream.emit('data', Buffer.from('data: {"delta": "Rest, elevate, and apply ice pack."}\n\n'));
            setTimeout(() => {
              liveStream.emit('end');
            }, 30);
          }, 20);
          return liveStream;
        }),
        analyzeWoundImage: jest.fn(),
      };
      setMLClient(liveMLFixture as any);

      const req = {
        user: { id: testUserId },
        body: {
          encounterId: testEncounterId,
          query: 'I rolled my ankle and it is swollen and painful to walk on',
          symptoms: ['swelling', 'pain'],
        },
        on: jest.fn() as any,
      } as Partial<Request>;

      await handleTriageStream(req as Request, mockRes as Response);

      // Wait for stream completion handler and live Supabase network insert
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (endMock.mock.calls.length > 0) {
            clearInterval(interval);
            resolve();
          }
        }, 50);
        setTimeout(() => {
          clearInterval(interval);
          resolve();
        }, 4000);
      });

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(setHeaderMock).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(writeMock).toHaveBeenCalledWith(expect.stringContaining('Rest, elevate, and apply ice pack.'));
      expect(endMock).toHaveBeenCalled();

      // Verify real rows in live Supabase triage_messages table
      const { data: messages, error } = await supabase
        .from('triage_messages')
        .select('*')
        .eq('encounter_id', testEncounterId)
        .order('created_at', { ascending: true });

      expect(error).toBeNull();
      expect(messages).not.toBeNull();
      expect(messages.length).toBeGreaterThanOrEqual(2);

      const userMsg = messages.find((m: any) => m.sender === 'user');
      const assistantMsg = messages.find((m: any) => m.sender === 'assistant');

      expect(userMsg).toBeDefined();
      expect(userMsg.content).toContain('rolled my ankle');
      expect(assistantMsg).toBeDefined();
      expect(assistantMsg.content).toContain('Rest, elevate, and apply ice pack.');
    }, 15000);

    it('handles stream error gracefully with SSE error payload', async () => {
      const errorStream = new EventEmitter();
      const liveMLFixture = {
        streamTriage: jest.fn().mockImplementation(async () => {
          setTimeout(() => {
            errorStream.emit('error', new Error('Live ML Inference Service Timeout'));
          }, 20);
          return errorStream;
        }),
        analyzeWoundImage: jest.fn(),
      };
      setMLClient(liveMLFixture as any);

      const req = {
        user: { id: testUserId },
        body: { encounterId: testEncounterId, query: 'Chest discomfort' },
        on: jest.fn() as any,
      } as Partial<Request>;

      await handleTriageStream(req as Request, mockRes as Response);
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(writeMock).toHaveBeenCalledWith(expect.stringContaining('Live ML Inference Service Timeout'));
      expect(endMock).toHaveBeenCalled();
    });
  });

  describe('handleWoundUpload', () => {
    it('uploads real image buffer to Supabase Storage and records live assessment', async () => {
      const liveMLFixture = {
        streamTriage: jest.fn(),
        analyzeWoundImage: jest.fn().mockImplementation(async () => ({
          classification: 'abrasion',
          confidence: 0.94,
          severity_grade: 'mild',
          annotations: { surface_area_cm2: 4.5 },
        })),
      };
      setMLClient(liveMLFixture as any);

      const testImageBuffer = Buffer.from('FAKE-JPEG-IMAGE-DATA-FOR-TESTING');
      const req = {
        user: { id: testUserId },
        params: { id: testEncounterId },
        body: {
          image: testImageBuffer.toString('base64'),
          fileName: `wound-${Date.now()}.jpg`,
        },
      } as Partial<Request>;

      await handleWoundUpload(req as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(201);
      const resPayload = jsonMock.mock.calls[0][0];
      expect(resPayload).toHaveProperty('assessment');
      expect(resPayload.assessment.classification).toBe('abrasion');
      expect(resPayload.storagePath).toContain(`encounters/${testEncounterId}`);

      uploadedPaths.push(resPayload.storagePath);

      // Verify the record directly in the live Supabase database
      const { data: record, error } = await supabase
        .from('wound_assessments')
        .select('*')
        .eq('id', resPayload.assessment.id)
        .single();

      expect(error).toBeNull();
      expect(record.classification).toBe('abrasion');
      expect(record.encounter_id).toBe(testEncounterId);
    }, 15000);

    it('returns 400 when image is missing', async () => {
      const req = {
        user: { id: testUserId },
        params: { id: testEncounterId },
        body: {},
      } as Partial<Request>;

      await handleWoundUpload(req as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Image data is required' }));
    });
  });
});
