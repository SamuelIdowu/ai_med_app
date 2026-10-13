// backend/src/services/mlClient.ts
// Inter-Service HTTP & Streaming Client to Python ML Engine

import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import { Readable } from 'stream';
import http from 'http';
import https from 'https';

export interface WoundAnalysisResult {
  classification: string;
  confidence: number;
  severity_grade: 'mild' | 'moderate' | 'severe';
  annotations?: Record<string, any>;
  recommendations?: string[];
}

export class MLClient {
  private baseUrl: string;
  private client: AxiosInstance;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.ML_SERVICE_URL || 'http://127.0.0.1:8000';

    // Configure resilient HTTP agent with keep-alive
    const httpAgent = new http.Agent({ keepAlive: true, maxSockets: 50 });
    const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 50 });

    this.client = axios.create({
      baseURL: this.baseUrl,
      httpAgent,
      httpsAgent,
      timeout: 15000,
    });
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Health check to verify Python FastAPI ML engine is responsive
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get(`${this.baseUrl}/v1/ml/health`, { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  /**
   * Streams tokenized emergency triage guidelines and reasoning from Python ML server
   */
  async streamTriage(query: string, symptoms: string[] = []): Promise<Readable> {
    const response = await this.client.post(
      `${this.baseUrl}/v1/ml/triage/stream`,
      { query, symptoms },
      {
        responseType: 'stream',
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
      }
    );

    return response.data as Readable;
  }

  /**
   * Submits wound or injury photograph to Python WoundVisionEngine for severity grading & classification
   */
  async analyzeWoundImage(fileBuffer: Buffer, fileName: string): Promise<WoundAnalysisResult> {
    const formData = new FormData();
    formData.append('file', fileBuffer, { filename: fileName });

    const response = await this.client.post(`${this.baseUrl}/v1/ml/vision/analyze`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
      timeout: 10000,
    });

    return response.data as WoundAnalysisResult;
  }

  /**
   * Convenience alias for analyzeWoundImage
   */
  async analyzeWound(fileBuffer: Buffer, fileName: string): Promise<WoundAnalysisResult> {
    return this.analyzeWoundImage(fileBuffer, fileName);
  }
}

export const defaultMLClient = new MLClient();
