import { NetworkError } from '../../types/errors';

export const SERVICE_BUSY_USER_MESSAGE =
  'The medical assistant is busy right now. Please try again in a moment.';

const BUSY_MESSAGE_HINTS = ['high demand', 'overloaded'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isTransientError = (error: any): boolean => {
  if (error?.status === 502 || error?.status === 503 || error?.status === 504) {
    return true;
  }
  const message = (error?.message || '').toLowerCase();
  return (
    BUSY_MESSAGE_HINTS.some((hint) => message.includes(hint)) ||
    message.includes('fetch') ||
    message.includes('network') ||
    message.includes('econnreset') ||
    message.includes('econnrefused') ||
    message.includes('etimedout')
  );
};

export const isOverloadedError = (error: any): boolean => {
  const message = (error?.message || '').toLowerCase();
  return (
    error?.status === 503 && BUSY_MESSAGE_HINTS.some((hint) => message.includes(hint))
  );
};

export const throwNetwork = (providerName: string, error: any): never => {
  if (isOverloadedError(error)) {
    throw new NetworkError(
      `${providerName} model overloaded (503).`,
      SERVICE_BUSY_USER_MESSAGE,
    );
  }
  throw new NetworkError(`Could not reach the ${providerName} service.`);
};

/**
 * Shared free-tier capacity regularly returns 503 "high demand" bursts
 * (Google) or brief 5xx/429 windows. Those are retryable, so retry with
 * exponential backoff (plus jitter) before surfacing the failure.
 */
export const withRetries = async <T>(fn: () => Promise<T>): Promise<T> => {
  const maxRetries = Number(process.env.AI_MAX_RETRIES ?? 2);
  const baseDelay = Number(process.env.AI_RETRY_BASE_DELAY_MS ?? 800);
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    if (attempt > 0) {
      const delay = baseDelay * 2 ** (attempt - 1) * (0.7 + Math.random() * 0.6);
      const status = (lastError as any)?.status;
      console.warn(
        `[aiProvider] transient failure${status ? ` (HTTP ${status})` : ''}, retry ${attempt}/${maxRetries} in ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransientError(error)) {
        throw error;
      }
    }
  }
  throw lastError;
};
