/**
 * Backwards-compatible facade. Historically the app talked to Gemini directly;
 * `GeminiService` is now a thin delegate over the provider registry so the
 * model behind every AI endpoint is controlled by `AI_PROVIDER` + `AI_MODEL`
 * environment variables (see services/ai).
 */
import { getAIProvider } from './ai';

export const GeminiService = {
  chat(
    message: string,
    history: unknown[] = [],
    userId?: string,
    accessToken?: string,
    profileContext?: string,
  ) {
    return getAIProvider().chat({ message, history, userId, accessToken, profileContext });
  },

  analyzeImage(image: Buffer | string, mimeType: string = 'image/jpeg', profileContext?: string) {
    return getAIProvider().analyzeImage({ image, mimeType, profileContext });
  },
};

export { buildSystemInstruction } from './ai/prompts';
