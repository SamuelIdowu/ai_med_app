import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Request, Response } from 'express';
import { EventEmitter } from 'events';
import { handleTriageStream, handleWoundUpload, setMLClient } from '../streamController';
import { getSupabaseAdmin } from '../../db/client';

jest.mock('../../db/client');

describe('Stream & Wound Controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let statusMock: any;
  let jsonMock: any;
  let writeMock: any;
  let endMock: any;
  let setHeaderMock: any;
  let flushHeadersMock: any;
  let mockSupabase: any;
  let mockInsert: any;
  let mockUpload: any;
  let mockMLClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jsonMock = jest.fn();
    writeMock = jest.fn();
    endMock = jest.fn();
    setHeaderMock = jest.fn();
    flushHeadersMock = jest.fn();
    statusMock = jest.fn().mockImplementation(() => ({ json: jsonMock }));

    mockInsert = jest.fn().mockImplementation(() => ({
      select: jest.fn().mockImplementation(() => ({
        single: jest.fn().mockImplementation(async () => ({ data: { id: 'msg-1' }, error: null })),
      })),
      then: (resolve: any) => resolve({ data: { id: 'msg-1' }, error: null }),
    }));

    mockUpload = jest.fn().mockImplementation(async () => ({ data: { path: 'encounters/enc-1/wound-1.jpg' }, error: null }));

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
      mockReq = {
        user: { id: 'user-1' },
        body: { encounterId: 'enc-1' }, // query is missing
        on: jest.fn() as any,
      };

      await handleTriageStream(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
    });

    it('sets SSE headers and streams chunks from MLClient', async () => {
      const mockStream = new EventEmitter();
      mockMLClient.streamTriage.mockImplementation(async () => mockStream);

      mockReq = {
        user: { id: 'user-1' },
        body: { encounterId: 'enc-1', query: 'My ankle hurts', symptoms: ['swelling'] },
        on: jest.fn() as any,
      };

      const handlerPromise = handleTriageStream(mockReq as Request, mockRes as Response);

      // Yield execution to allow handleTriageStream to attach event listeners
      await new Promise((resolve) => setImmediate(resolve));

      expect(setHeaderMock).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
      expect(setHeaderMock).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(setHeaderMock).toHaveBeenCalledWith('Connection', 'keep-alive');
      expect(flushHeadersMock).toHaveBeenCalled();

      // Emit chunk
      mockStream.emit('data', Buffer.from('data: {"delta": "Rest your ankle."}\n\n'));
      expect(writeMock).toHaveBeenCalledWith('data: {"delta": "Rest your ankle."}\n\n');

      // Emit end
      mockStream.emit('end');
      await new Promise((resolve) => setImmediate(resolve));

      await handlerPromise;

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          encounter_id: 'enc-1',
          sender: 'user',
          content: 'My ankle hurts',
        })
      );

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          encounter_id: 'enc-1',
          sender: 'assistant',
          content: 'Rest your ankle.',
        })
      );

      expect(endMock).toHaveBeenCalled();
    });

    it('handles stream error by sending SSE error payload and closing', async () => {
      const mockStream = new EventEmitter();
      mockMLClient.streamTriage.mockImplementation(async () => mockStream);

      mockReq = {
        user: { id: 'user-1' },
        body: { encounterId: 'enc-1', query: 'Heart rate spike' },
        on: jest.fn() as any,
      };

      const handlerPromise = handleTriageStream(mockReq as Request, mockRes as Response);

      // Yield execution to allow listener attachment
      await new Promise((resolve) => setImmediate(resolve));

      mockStream.emit('error', new Error('ML Server Unavailable'));

      await handlerPromise;

      expect(writeMock).toHaveBeenCalledWith(
        expect.stringContaining('ML Server Unavailable')
      );
      expect(endMock).toHaveBeenCalled();
    });
  });

  describe('handleWoundUpload', () => {
    it('uploads wound image to storage, analyzes it with MLClient, and saves assessment', async () => {
      mockMLClient.analyzeWoundImage.mockImplementation(async () => ({
        classification: 'puncture',
        confidence: 0.92,
        severity_grade: 'moderate',
        annotations: { depth: 'deep' },
      }));

      const base64Image = Buffer.from('fake-pixel-data').toString('base64');
      mockReq = {
        user: { id: 'user-1' },
        params: { id: 'enc-123' },
        body: {
          image: base64Image,
          fileName: 'foot-puncture.jpg',
        },
      };

      await handleWoundUpload(mockReq as Request, mockRes as Response);

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('encounters/enc-123/'),
        expect.any(Buffer),
        expect.objectContaining({ contentType: 'image/jpeg' })
      );

      expect(mockMLClient.analyzeWoundImage).toHaveBeenCalledWith(expect.any(Buffer), 'foot-puncture.jpg');

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          encounter_id: 'enc-123',
          classification: 'puncture',
          confidence: 0.92,
          severity_grade: 'moderate',
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
    });

    it('returns 400 when image is missing', async () => {
      mockReq = {
        user: { id: 'user-1' },
        params: { id: 'enc-123' },
        body: {},
      };

      await handleWoundUpload(mockReq as Request, mockRes as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(expect.objectContaining({ error: 'Image data is required' }));
    });
  });
});
