import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { APIKeyError, QuotaExceededError, InvalidRequestError, NetworkError } from '../../types/errors';
import { AIProvider, AIChatParams, AIAnalyzeImageParams, AIStructuredImageAnalysis } from './types';
import {
  buildSystemInstruction,
  buildVisionSystemInstruction,
  IMAGE_ANALYSIS_PROMPT,
  parseStructuredImageAnalysis,
} from './prompts';

const getApiKey = (): string => process.env.GEMINI_API_KEY || '';
const MODEL = process.env.AI_MODEL || 'gemini-2.5-flash';

if (!getApiKey()) {
  console.error(
    '❌ GEMINI_API_KEY is not set. Gemini chat/vision calls will fail until it is configured.',
  );
}

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

const createChatModel = (profileContext?: string) =>
  new GoogleGenerativeAI(getApiKey()).getGenerativeModel({
    model: MODEL,
    systemInstruction: buildSystemInstruction(profileContext),
    safetySettings: SAFETY_SETTINGS,
  });

const createVisionModel = (profileContext?: string) => {
  const systemInstruction = buildVisionSystemInstruction(profileContext);
  return new GoogleGenerativeAI(getApiKey()).getGenerativeModel({
    model: MODEL,
    ...(systemInstruction ? { systemInstruction } : {}),
    safetySettings: SAFETY_SETTINGS,
  });
};

interface HistoryEntry {
  role?: string;
  parts?: Array<{ text?: string }>;
  content?: string;
}

/** Accepts both Gemini wire format ({role, parts:[{text}]}) and {role, content}. */
const toGeminiHistory = (history: unknown[] = []) =>
  (history as HistoryEntry[])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      // Gemini roles are strictly 'user' | 'model'
      const role =
        entry.role === 'model' || entry.role === 'assistant' ? 'model' : 'user';
      return {
        role,
        parts:
          Array.isArray(entry.parts) && entry.parts.length > 0
            ? [{ text: entry.parts.map((p) => p?.text ?? '').join('\n') }]
            : [{ text: typeof entry.content === 'string' ? entry.content : '' }],
      };
    });

export const geminiProvider: AIProvider = {
  name: 'gemini',

  async chat(params: AIChatParams): Promise<string> {
    if (!getApiKey()) {
      throw new APIKeyError();
    }
    const { message, history = [], userId, accessToken, profileContext } = params;

    // Sanitize history: Gemini requires the first turn to be a 'user' turn.
    // If the client sends history starting with 'model' (e.g. initial greeting), remove it.
    let validHistory = toGeminiHistory(history);
    while (validHistory.length > 0 && validHistory[0].role === 'model') {
      validHistory = validHistory.slice(1);
    }

    try {
      // Import function declarations and handlers
      const { functionDeclarations } = await import('../../tools/functionDeclarations');
      const { executeFunctionCall } = await import('../../tools/functionHandlers');

      const chatModel = createChatModel(profileContext);
      const chat = chatModel.startChat({
        history: validHistory,
        tools: userId ? [{ functionDeclarations }] : undefined, // Only enable tools if user is authenticated
        generationConfig: {
          maxOutputTokens: 8192,
        },
      });

      let result = await chat.sendMessage(message);
      let response = await result.response;

      // Handle function calls in a loop
      const functionCalls = response.functionCalls();
      while (functionCalls && functionCalls.length > 0) {
        const functionCall = functionCalls[0];
        console.log('[geminiProvider] AI requested function:', functionCall.name);

        // Execute the function
        const functionResponse = await executeFunctionCall(
          { name: functionCall.name, args: functionCall.args },
          accessToken || '',
        );

        console.log('[geminiProvider] Function result received for:', functionCall.name);

        // Send function result back to AI
        result = await chat.sendMessage([
          {
            functionResponse: {
              name: functionCall.name,
              response: functionResponse,
            },
          },
        ]);
        response = await result.response;
      }

      return response.text();
    } catch (error: any) {
      console.error('Gemini Chat Error:', error);

      // Custom AIServiceError types already carry a statusCode — rethrow as-is.
      if (error?.statusCode) {
        throw error;
      }

      const errorMessage = error?.message || '';

      // Check for quota/rate limit errors
      if (
        error?.status === 429 ||
        errorMessage.includes('quota') ||
        errorMessage.includes('rate limit')
      ) {
        throw new QuotaExceededError('Gemini API quota exceeded.');
      }

      // Check for invalid request errors
      if (
        error?.status === 400 ||
        errorMessage.includes('invalid') ||
        errorMessage.includes('First content should be')
      ) {
        throw new InvalidRequestError('Gemini rejected the request payload.');
      }

      // Check for network errors
      if (
        error?.status === 503 ||
        error?.status === 504 ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('network')
      ) {
        throw new NetworkError('Could not reach the Gemini service.');
      }

      // Default to generic error with user-friendly message
      throw new InvalidRequestError(
        'An unexpected error occurred while processing your request.',
      );
    }
  },

  async analyzeImage(params: AIAnalyzeImageParams): Promise<AIStructuredImageAnalysis> {
    if (!getApiKey()) {
      throw new APIKeyError();
    }
    const { image, mimeType = 'image/jpeg', profileContext } = params;

    try {
      // Base64 or raw buffer; strip data-URL header if present
      let imageData = image;
      if (typeof imageData === 'string') {
        imageData = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      }

      const imagePart = {
        inlineData: {
          data: imageData as string,
          mimeType,
        },
      };

      const visionModel = createVisionModel(profileContext);
      const result = await visionModel.generateContent([IMAGE_ANALYSIS_PROMPT, imagePart]);
      const response = await result.response;
      const text = response.text();

      return parseStructuredImageAnalysis(text);
    } catch (error: any) {
      console.error('Gemini Vision Error:', error);

      if (error?.statusCode) {
        throw error;
      }

      const errorMessage = error?.message || '';

      if (error?.status === 429 || errorMessage.includes('quota')) {
        throw new QuotaExceededError('Gemini API quota exceeded.');
      }

      if (error?.status === 400 || errorMessage.includes('invalid')) {
        throw new InvalidRequestError('Gemini rejected the image payload.');
      }

      if (error?.status === 503 || error?.status === 504 || errorMessage.includes('network')) {
        throw new NetworkError('Could not reach the Gemini service.');
      }

      throw new InvalidRequestError('Failed to analyze image.');
    }
  },
};
