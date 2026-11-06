import { QuotaExceededError, InvalidRequestError, NetworkError, APIKeyError } from '../../types/errors';

/**
 * Abstraction over chat/vision AI providers so the model behind the backend can
 * be swapped with a single env var (`AI_PROVIDER`). Every provider implements
 * the same two operations the controllers consume.
 */
export interface AIChatParams {
  message: string;
  /** Prior conversation turns, either Gemini wire format {role, parts:[{text}]} or {role, content} */
  history?: unknown[];
  /** Authenticated user id — providers may enable tools when present */
  userId?: string;
  /** Supabase access token passed into tool execution */
  accessToken?: string;
  /** Sanitized medical profile context for personalization */
  profileContext?: string;
}

export interface AIAnalyzeImageParams {
  /** Raw buffer or base64/URL-encoded image string */
  image: Buffer | string;
  mimeType?: string;
  profileContext?: string;
}

/**
 * Structured photo-analysis contract shared by all vision providers.
 */
export interface AIStructuredImageAnalysis {
  severity?: string;
  injuryType?: string;
  confidence?: number;
  emergencyFlag?: boolean;
  symptoms?: string[];
  recommendations?: string[];
  warnings?: string[];
  rawAnalysis?: string;
}

export interface AIProvider {
  readonly name: string;
  chat(params: AIChatParams): Promise<string>;
  analyzeImage(params: AIAnalyzeImageParams): Promise<AIStructuredImageAnalysis>;
}

/** Maps a provider HTTP status to the backend's typed AIServiceError hierarchy. */
export function throwProviderHttpError(status: number, providerName: string): never {
  if (status === 429) {
    throw new QuotaExceededError(`${providerName} API quota exceeded.`);
  }
  if (status === 400) {
    throw new InvalidRequestError(`${providerName} rejected the request payload.`);
  }
  if (status === 401 || status === 403) {
    throw new APIKeyError(`Invalid ${providerName} API key.`);
  }
  if (status >= 500 && status !== 503) {
    throw new NetworkError(`Could not reach the ${providerName} service.`);
  }
  if (status === 503) {
    throw new NetworkError(`Could not reach the ${providerName} service.`);
  }
  throw new InvalidRequestError(`${providerName} request failed (HTTP ${status}).`);
}
