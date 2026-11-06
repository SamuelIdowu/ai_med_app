import { APIKeyError, QuotaExceededError, InvalidRequestError, NetworkError } from '../../types/errors';
import { AIProvider, AIChatParams, AIAnalyzeImageParams, AIStructuredImageAnalysis } from './types';
import {
  buildSystemInstruction,
  buildVisionSystemInstruction,
  IMAGE_ANALYSIS_PROMPT,
  parseStructuredImageAnalysis,
} from './prompts';

const getApiKey = (): string => process.env.OPENAI_API_KEY || '';
const API_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');
const MODEL = process.env.AI_MODEL || 'gpt-4o-mini';

if (!getApiKey()) {
  console.error(
    '❌ OPENAI_API_KEY is not set. OpenAI chat/vision calls will fail until it is configured.',
  );
}

interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: any;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

interface OpenAIResponse {
  choices?: Array<{
    finish_reason?: string;
    message?: OpenAIChatMessage;
  }>;
  error?: { code?: number | string; message?: string; type?: string };
}

// SchemaType ('OBJECT' | 'STRING' | ...) -> JSON Schema lowercase primitives for the OpenAI tools API.
const SCHEMA_TYPE_MAP: Record<string, string> = {
  OBJECT: 'object',
  STRING: 'string',
  NUMBER: 'number',
  INTEGER: 'integer',
  BOOLEAN: 'boolean',
  ARRAY: 'array',
};

const coerceSchema = (schema: any): any => {
  if (!schema || typeof schema !== 'object') return schema;
  const converted: any = { ...schema };
  if (typeof schema.type === 'string' && SCHEMA_TYPE_MAP[schema.type]) {
    converted.type = SCHEMA_TYPE_MAP[schema.type];
  }
  if (schema.properties) {
    converted.properties = Object.fromEntries(
      Object.entries(schema.properties).map(([key, value]) => [key, coerceSchema(value)]),
    );
  }
  if (Array.isArray(schema.items)) {
    converted.items = schema.items.map(coerceSchema);
  } else if (schema.items) {
    converted.items = coerceSchema(schema.items);
  }
  if (Array.isArray(schema.enum)) {
    converted.enum = schema.enum;
  }
  return converted;
};

const buildTools = async (): Promise<Array<Record<string, unknown>>> => {
  const { functionDeclarations } = await import('../../tools/functionDeclarations');
  return functionDeclarations.map((declaration) => ({
    type: 'function',
    function: {
      name: declaration.name,
      description: declaration.description,
      parameters: coerceSchema(declaration.parameters),
    },
  }));
};

interface HistoryEntry {
  role?: string;
  parts?: Array<{ text?: string }>;
  content?: string;
}

/** Accepts both Gemini wire format ({role, parts:[{text}]}) and {role, content}. */
const toOpenAIMessages = (history: unknown[] = []): OpenAIChatMessage[] =>
  (history as HistoryEntry[])
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => {
      const role: 'user' | 'assistant' | 'system' =
        entry.role === 'model' ? 'assistant' : ((entry.role as any) || 'user');
      const text =
        Array.isArray(entry.parts) && entry.parts.length > 0
          ? entry.parts.map((p) => p?.text ?? '').join('\n')
          : typeof entry.content === 'string'
            ? entry.content
            : '';
      return { role, content: text } as OpenAIChatMessage;
    });

const callOpenAI = async (body: Record<string, unknown>): Promise<OpenAIResponse> => {
  let response: Response;
  try {
    response = await fetch(`${API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error: any) {
    throw new NetworkError(`Could not reach the OpenAI service: ${error?.message}`);
  }

  const payload: any = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.error?.message || `HTTP ${response.status}`;
    // Custom typed errors first (they already carry statusCode)
    if (response.status === 429) throw new QuotaExceededError('OpenAI API quota exceeded.');
    if (response.status === 401 || response.status === 403)
      throw new APIKeyError('Invalid OpenAI API key.');
    if (response.status === 400)
      throw new InvalidRequestError(`OpenAI rejected the request payload: ${message}`);
    if (response.status >= 500)
      throw new NetworkError('Could not reach the OpenAI service.');
    throw new InvalidRequestError(message);
  }

  return payload as OpenAIResponse;
};

export const openaiProvider: AIProvider = {
  name: 'openai',

  async chat(params: AIChatParams): Promise<string> {
    if (!getApiKey()) {
      throw new APIKeyError();
    }
    const { message, history = [], userId, accessToken, profileContext } = params;

    try {
      const messages: OpenAIChatMessage[] = [
        { role: 'system', content: buildSystemInstruction(profileContext) },
        ...toOpenAIMessages(history),
        { role: 'user', content: message },
      ];

      const tools = userId ? await buildTools() : undefined;
      const toolHandlers = userId
        ? await import('../../tools/functionHandlers')
        : undefined;

      const maxToolTurns = 5;
      for (let turn = 0; turn < maxToolTurns; turn += 1) {
        const body: Record<string, unknown> = {
          model: MODEL,
          messages,
          max_completion_tokens: 8192,
        };
        if (tools && tools.length > 0) {
          body.tools = tools;
          body.tool_choice = 'auto';
        }

        const result = await callOpenAI(body);
        const choice = result.choices?.[0];
        const assistantMessage = choice?.message;

        if (!assistantMessage) {
          throw new NetworkError('OpenAI returned an empty response.');
        }

        const toolCalls = assistantMessage.tool_calls || [];
        if (toolCalls.length === 0 || !toolHandlers) {
          return assistantMessage.content || '';
        }

        // Record the assistant's tool request, then execute and feed results back.
        messages.push(assistantMessage);
        for (const call of toolCalls) {
          let args: unknown = {};
          try {
            args = call.function?.arguments ? JSON.parse(call.function.arguments) : {};
          } catch {
            throw new InvalidRequestError('OpenAI returned malformed tool arguments.');
          }
          const name = call.function?.name || '';
          console.log(`[openaiProvider] AI requested function: ${name}`);

          const functionResponse = await toolHandlers.executeFunctionCall(
            { name, args },
            accessToken || '',
          );
          console.log(`[openaiProvider] Function result received for: ${name}`);

          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: JSON.stringify(functionResponse),
          });
        }
      }

      throw new InvalidRequestError('The assistant produced too many tool calls in one turn.');
    } catch (error: any) {
      // Custom AIServiceError types already carry a statusCode — rethrow as-is.
      if (error?.statusCode) {
        throw error;
      }
      console.error('OpenAI Chat Error:', error);
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
      let base64Data = image;
      if (typeof base64Data !== 'string') {
        base64Data = (base64Data as Buffer).toString('base64');
      } else {
        base64Data = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      }

      const visionPrefix = buildVisionSystemInstruction(profileContext);

      const messages: OpenAIChatMessage[] = [
        ...(visionPrefix ? [{ role: 'system', content: visionPrefix } as OpenAIChatMessage] : []),
        {
          role: 'user',
          content: [
            { type: 'text', text: IMAGE_ANALYSIS_PROMPT },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${base64Data}` },
            },
          ],
        },
      ];

      const result = await callOpenAI({
        model: MODEL,
        messages,
        max_completion_tokens: 4096,
      });

      const text = result.choices?.[0]?.message?.content || '';
      return parseStructuredImageAnalysis(text);
    } catch (error: any) {
      if (error?.statusCode) {
        throw error;
      }
      console.error('OpenAI Vision Error:', error);
      throw new InvalidRequestError('Failed to analyze image.');
    }
  },
};
