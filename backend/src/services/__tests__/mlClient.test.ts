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

  it('evaluates vitals triage via Python Scikit-Learn microservice', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      status: 200,
      data: {
        triage_level: 2,
        triage_label: 'Emergency',
        confidence: 0.99,
        probabilities: { 'Non-Urgent': 0.0, Urgent: 0.01, Emergency: 0.99 },
        risk_drivers: ['Critical Hypoxemia (SpO2 82% < 90%)'],
        is_emergency: true,
        is_urgent: true,
        latency_ms: 1.45,
      },
    });

    const client = new MLClient('http://127.0.0.1:8000');
    const result = await client.evaluateVitalsTriage({
      heart_rate: 145,
      oxygen_saturation: 82,
      systolic_bp: 75,
      severe_bleeding: 1,
    });

    expect(result.triage_label).toBe('Emergency');
    expect(result.is_emergency).toBe(true);
    expect(result.risk_drivers).toContain('Critical Hypoxemia (SpO2 82% < 90%)');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/v1/ml/triage/vitals',
      {
        heart_rate: 145,
        oxygen_saturation: 82,
        systolic_bp: 75,
        severe_bleeding: 1,
      },
      expect.any(Object)
    );
  });
});
