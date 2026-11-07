import { withRetries, throwNetwork, SERVICE_BUSY_USER_MESSAGE } from '../retry';
import { NetworkError } from '../../../types/errors';

describe('aiProvider retry helper', () => {
  beforeEach(() => {
    process.env.AI_MAX_RETRIES = '2';
    process.env.AI_RETRY_BASE_DELAY_MS = '10';
  });

  it('retries transient errors and returns the successful result', async () => {
    let calls = 0;
    const result = await withRetries(async () => {
      calls += 1;
      if (calls < 3) {
        const error: any = new Error('Error fetching from https://x: [503] high demand');
        error.status = 503;
        throw error;
      }
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });

  it('propagates non-transient errors immediately', async () => {
    let calls = 0;
    await expect(
      withRetries(async () => {
        calls += 1;
        throw new Error('Gemini rejected the request payload.');
      }),
    ).rejects.toThrow('Gemini rejected the request payload.');
    expect(calls).toBe(1);
  });

  it('rethrows the last transient error after exhausting retries', async () => {
    let calls = 0;
    await expect(
      withRetries(async () => {
        calls += 1;
        const error: any = new Error('overloaded');
        error.status = 503;
        throw error;
      }),
    ).rejects.toMatchObject({ status: 503 });
    expect(calls).toBe(3);
  });

  it('treats network/connection failures as transient', async () => {
    let calls = 0;
    const result = await withRetries(async () => {
      calls += 1;
      if (calls < 2) {
        throw new Error('ETIMEDOUT');
      }
      return 'recovered';
    });
    expect(result).toBe('recovered');
    expect(calls).toBe(2);
  });
});

describe('overloaded error mapping', () => {
  it('maps 503 high-demand errors to NetworkError with a busy userMessage', () => {
    expect(() =>
      throwNetwork('Gemini', {
        status: 503,
        message: 'This model is currently experiencing high demand.',
      }),
    ).toThrow(NetworkError);

    try {
      throwNetwork('Gemini', { status: 503, message: 'The model is overloaded' });
    } catch (error: any) {
      expect(error.statusCode).toBe(503);
      expect(error.userMessage).toBe(SERVICE_BUSY_USER_MESSAGE);
    }
  });

  it('keeps the generic network message for plain 503 responses', () => {
    try {
      throwNetwork('Gemini', { status: 503, message: 'HTTP' });
    } catch (error: any) {
      expect(error.userMessage).not.toBe(SERVICE_BUSY_USER_MESSAGE);
    }
  });
});
