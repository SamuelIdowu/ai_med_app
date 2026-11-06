import { AIProvider, AIChatParams, AIAnalyzeImageParams, AIStructuredImageAnalysis } from './types';
import { geminiProvider } from './geminiProvider';
import { openaiProvider } from './openaiProvider';
import { InvalidRequestError } from '../../types/errors';

export type { AIProvider, AIChatParams, AIAnalyzeImageParams, AIStructuredImageAnalysis };

/**
 * Provider registry — add a new provider implementation to this map and every
 * AI endpoint picks it up. Selection happens per call so `AI_PROVIDER` can be
 * changed in the environment without code changes.
 */
const PROVIDERS: Record<string, AIProvider> = {
  gemini: geminiProvider,
  openai: openaiProvider,
};

export const getAIProviderName = (): string =>
  (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();

export const getAIProvider = (): AIProvider => {
  const name = getAIProviderName();
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new InvalidRequestError(
      `Unknown AI_PROVIDER '${name}'. Available providers: ${Object.keys(PROVIDERS).join(', ')}`,
    );
  }
  return provider;
};

export const getRegisteredAIProviders = (): string[] => Object.keys(PROVIDERS);
