import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { Readable } from 'stream';
import axios from 'axios';
import { MLClient } from '../mlClient';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MLClient Inter-Service Bridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockedAxios.create as any) = jest.fn().mockReturnValue(mockedAxios);
  });

  it('instantiates client with fallback base URL', () => {
    const client = new MLClient();
    expect(client.getBaseUrl()).toBe(process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000');
  });

  it('instantiates client with custom base URL', () => {
    const client = new MLClient('http://custom-ml:8080');
    expect(client.getBaseUrl()).toBe('http://custom-ml:8080');
  });

  it('checks health successfully', async () => {
    mockedAxios.get.mockResolvedValueOnce({ status: 200, data: { status: 'healthy' } });
    const client = new MLClient('http://127.0.0.1:8000');
    const isHealthy = await client.checkHealth();
    expect(isHealthy).toBe(true);
    expect(mockedAxios.get).toHaveBeenCalledWith('http://127.0.0.1:8000/v1/ml/health', expect.any(Object));
  });

  it('handles health check failure gracefully', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Connection refused'));
    const client = new MLClient('http://127.0.0.1:8000');
    const isHealthy = await client.checkHealth();
    expect(isHealthy).toBe(false);
  });

  it('streams triage query to python ml server', async () => {
    const fakeStream = new Readable({
      read() {
        this.push('data: {"delta": "Apply pressure"}\n\n');
        this.push(null);
      },
    });

    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: fakeStream,
    });

    const client = new MLClient('http://127.0.0.1:8000');
    const stream = await client.streamTriage('Severe bleeding on arm', ['bleeding', 'pain']);

    expect(stream).toBeDefined();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/v1/ml/triage/stream',
      { query: 'Severe bleeding on arm', symptoms: ['bleeding', 'pain'] },
      expect.objectContaining({ responseType: 'stream' })
    );

    const chunks: string[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk.toString());
    }
    expect(chunks.join('')).toContain('Apply pressure');
  });

  it('analyzes wound image with multipart form upload', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        classification: 'laceration',
        confidence: 0.94,
        severity_grade: 'moderate',
      },
    });

    const client = new MLClient('http://127.0.0.1:8000');
    const buffer = Buffer.from('fake-image-bytes');
    const result = await client.analyzeWoundImage(buffer, 'wound.jpg');

    expect(result).toEqual({
      classification: 'laceration',
      confidence: 0.94,
      severity_grade: 'moderate',
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/v1/ml/vision/analyze',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.any(Object),
      })
    );
  });
});
