import { getApiErrorMessage, DEFAULT_CHAT_ERROR } from '../apiError';

describe('getApiErrorMessage', () => {
  it('prefers a backend-provided userMessage', () => {
    const message = getApiErrorMessage({
      response: {
        status: 429,
        data: { userMessage: 'Guest AI is limited to 5 requests per minute.' },
      },
    });

    expect(message).toBe('Guest AI is limited to 5 requests per minute.');
  });

  it('explains network failures when there is no response', () => {
    const message = getApiErrorMessage({ code: 'ERR_NETWORK', message: 'Network Error' });
    expect(message).toContain('Cannot reach the clinical service');
  });

  it('maps auth failures to a sign-in message', () => {
    expect(getApiErrorMessage({ response: { status: 401, data: {} } })).toContain(
      'session has expired'
    );
    expect(getApiErrorMessage({ response: { status: 403, data: {} } })).toContain(
      'permission'
    );
  });

  it('maps rate limits and upstream failures', () => {
    expect(getApiErrorMessage({ response: { status: 429, data: {} } })).toContain(
      'Too many requests'
    );
    expect(getApiErrorMessage({ response: { status: 503, data: {} } })).toContain(
      'temporarily unavailable'
    );
  });

  it('falls back to the generic chat error for unknown shapes', () => {
    expect(getApiErrorMessage(undefined)).toBe(DEFAULT_CHAT_ERROR);
  });
});
