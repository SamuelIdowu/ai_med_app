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
  recommendation?: string;
  red_flags?: string[];
  annotations?: Record<string, any>;
  latency_ms?: number;
}

export interface SyncTriageResult {
  query: string;
  is_critical: boolean;
  flags: string[];
  contraindications: string[];
  escalation_message: string | null;
  protocol: {
    protocol_name: string;
    steps: string[];
    red_flags: string[];
  };
  processing_time_ms: number;
}

export interface VitalsTriagePayload {
  heart_rate?: number;
  systolic_bp?: number;
  diastolic_bp?: number;
  respiratory_rate?: number;
  oxygen_saturation?: number;
  body_temperature?: number;
  pain_score?: number;
  severe_bleeding?: number;
  altered_mental_status?: number;
  age?: number;
}

export interface VitalsTriageResult {
  triage_level: number;
  triage_label: 'Non-Urgent' | 'Urgent' | 'Emergency' | string;
  confidence: number;
  probabilities: Record<string, number>;
  risk_drivers: string[];
  is_emergency: boolean;
  is_urgent: boolean;
  latency_ms: number;
}

const DEFAULT_ML_SERVICE_URL = 'http://127.0.0.1:8000';

/**
 * Render's blueprint `fromService.host` returns a bare hostname (for example
 * `laso-ml.onrender.com`). Axios requires an absolute URL, so normalize it
 * here. Explicit protocols are preserved, localhost and host:port values use
 * HTTP, and public hostnames default to HTTPS.
 */
export function normalizeServiceUrl(value?: string): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return DEFAULT_ML_SERVICE_URL;
  }

  const withoutTrailingSlash = trimmed.replace(/\/+$/, '');

  if (/^https?:\/\//i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash;
  }

  if (
    /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/i.test(withoutTrailingSlash) ||
    /:\d+$/.test(withoutTrailingSlash)
  ) {
    return `http://${withoutTrailingSlash}`;
  }

  return `https://${withoutTrailingSlash}`;
}

export class MLClient {
  private baseUrl: string;
  private client: AxiosInstance;
  private lastHealthCheckTime = 0;
  private lastHealthCheckResult = false;
  private readonly HEALTH_CACHE_TTL_MS = 10000;

  constructor(baseUrl?: string) {
    this.baseUrl = normalizeServiceUrl(baseUrl || process.env.ML_SERVICE_URL);

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
   * Health check to verify Python FastAPI ML engine is responsive with caching
   */
  async checkHealth(force = false): Promise<boolean> {
    const now = Date.now();
    if (!force && now - this.lastHealthCheckTime < this.HEALTH_CACHE_TTL_MS) {
      return this.lastHealthCheckResult;
    }

    try {
      const response = await this.client.get(`${this.baseUrl}/v1/ml/health`, { timeout: 3000 });
      this.lastHealthCheckResult = response.status === 200;
      this.lastHealthCheckTime = now;
      return this.lastHealthCheckResult;
    } catch {
      this.lastHealthCheckResult = false;
      this.lastHealthCheckTime = now;
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
   * Synchronously evaluates triage query using the ML engine
   */
  async evaluateTriageSync(query: string, symptoms: string[] = []): Promise<SyncTriageResult> {
    const response = await this.client.post(`${this.baseUrl}/v1/ml/triage/evaluate`, { query, symptoms });
    return response.data as SyncTriageResult;
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
   * Computes 384-dimensional dense vector embeddings for medical text
   */
  async embedText(text: string): Promise<number[]> {
    const response = await this.client.post(`${this.baseUrl}/v1/ml/embed`, { text });
    return response.data.embedding;
  }

  /**
   * Evaluates patient physiological vitals using Python Classical ML Scikit-Learn service
   */
  async evaluateVitalsTriage(vitals: VitalsTriagePayload): Promise<VitalsTriageResult> {
    const response = await this.client.post(`${this.baseUrl}/v1/ml/triage/vitals`, vitals, {
      timeout: 5000,
    });
    return response.data as VitalsTriageResult;
  }

  /**
   * Convenience alias for analyzeWoundImage
   */
  async analyzeWound(fileBuffer: Buffer, fileName: string): Promise<WoundAnalysisResult> {
    return this.analyzeWoundImage(fileBuffer, fileName);
  }
}

export const defaultMLClient = new MLClient();
