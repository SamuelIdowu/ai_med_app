import { fetchMock, createOpenAIResponse, createToolCallResponse } from '../__mocks__/openaiFetchMock';
import { openaiProvider } from '../openaiProvider';
import { geminiProvider } from '../geminiProvider';
import {
  QuotaExceededError,
  APIKeyError,
  NetworkError,
  InvalidRequestError,
} from '../../../types/errors';

jest.mock('../../../tools/functionHandlers', () => ({
  executeFunctionCall: jest.fn().mockResolvedValue({ saved: true }),
}));

const globalFetch = global.fetch as jest.Mock;
const { executeFunctionCall } = jest.requireMock('../../../tools/functionHandlers') as {
  executeFunctionCall: jest.Mock;
};

const ENV_BACKUP = { ...process.env };

beforeEach(() => {
  process.env.OPENAI_API_KEY = 'test-openai-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  delete process.env.AI_MODEL;
  delete process.env.AI_MAX_RETRIES;
  delete process.env.AI_RETRY_BASE_DELAY_MS;
  delete process.env.OPENAI_BASE_URL;
  global.fetch = fetchMock as unknown as typeof fetch;
  fetchMock.mockImplementation(async () => createOpenAIResponse('Apply pressure.'));
});

afterEach(() => {
  process.env = { ...ENV_BACKUP };
  jest.clearAllMocks();
});

describe('openaiProvider.chat', () => {
  it('returns the assistant text for a plain completion', async () => {
    const reply = await openaiProvider.chat({
      message: 'I cut my hand',
      history: [{ role: 'user', parts: [{ text: 'Hi' }] }],
    });

    expect(reply).toBe('Apply pressure.');
  });

  it('sends model, system instruction, history and user message', async () => {
    await openaiProvider.chat({
      message: 'Hello',
      history: [
        { role: 'user', content: 'Hey' },
        { role: 'model', parts: [{ text: 'Hi there' }] },
      ],
      profileContext: 'Blood type: O-',
    });

    const body = JSON.parse((fetchMock as jest.Mock).mock.calls[0][1].body);
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.messages[0].role).toBe('system');
    expect(body.messages[0].content).toContain('AI First Aid Assistant');
    expect(body.messages[0].content).toContain('Blood type: O-');
    expect(body.messages[1]).toEqual({ role: 'user', content: 'Hey' });
    expect(body.messages[2]).toEqual({ role: 'assistant', content: 'Hi there' });
    expect(body.messages[3]).toEqual({ role: 'user', content: 'Hello' });
    expect(body.tools).toBeUndefined();
  });

  it('loops tool calls: executes the function and returns the final text', async () => {
    fetchMock.mockReset();
    fetchMock
      .mockResolvedValueOnce(
        createToolCallResponse({
          id: 'call_1',
          name: 'save_incident_report',
          arguments: JSON.stringify({ user_id: 'user-1', incident_type: 'cut' }),
        }),
      )
      .mockResolvedValueOnce(createOpenAIResponse('Incident saved.'));

    const reply = await openaiProvider.chat({
      message: 'Severe bleeding!',
      userId: 'user-1',
      accessToken: 'token-1',
    });

    expect(executeFunctionCall).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'save_incident_report' }),
      'token-1',
    );
    expect(reply).toBe('Incident saved.');
  });

  it('throws APIKeyError when OPENAI_API_KEY is missing', async () => {
    delete process.env.OPENAI_API_KEY;
    await expect(openaiProvider.chat({ message: 'Hi' })).rejects.toThrow(APIKeyError);
  });

  it('maps fetch failures to NetworkError', async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(openaiProvider.chat({ message: 'Hi' })).rejects.toThrow(NetworkError);
  }, 10000);

  it('maps HTTP 429 to QuotaExceededError', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'rate limit' } }),
    } as unknown as Response);
    await expect(openaiProvider.chat({ message: 'Hi' })).rejects.toThrow(QuotaExceededError);
  });

  it('maps HTTP 400 payloads to InvalidRequestError', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: { message: 'bad schema' } }),
    } as unknown as Response);
    await expect(openaiProvider.chat({ message: 'Hi' })).rejects.toThrow(InvalidRequestError);
  });

  it('maps missing assistant message to NetworkError', async () => {
    fetchMock.mockResolvedValueOnce(createOpenAIResponse('', true));
    await expect(openaiProvider.chat({ message: 'Hi' })).rejects.toThrow(NetworkError);
  });
});

describe('geminiProvider', () => {
  it('throws APIKeyError without GEMINI_API_KEY', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(geminiProvider.chat({ message: 'Hi' })).rejects.toThrow(APIKeyError);
  });
});
