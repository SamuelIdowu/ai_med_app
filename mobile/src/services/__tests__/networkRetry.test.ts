import { isTransientNetworkError, networkRetryBackoffMs } from '../networkRetry';

describe('isTransientNetworkError', () => {
  it('classifies transport-level failures as transient', () => {
    expect(isTransientNetworkError({ code: 'ERR_NETWORK' })).toBe(true);
    expect(isTransientNetworkError({ code: 'ECONNABORTED' })).toBe(true);
    expect(isTransientNetworkError({ code: 'ETIMEDOUT' })).toBe(true);
    expect(isTransientNetworkError({ code: 'ECONNREFUSED' })).toBe(true);
    expect(isTransientNetworkError({ code: 'ENOTFOUND' })).toBe(true);
    expect(isTransientNetworkError({ message: 'Network Error' })).toBe(true);
  });

  it('never classifies server responses as transient', () => {
    expect(isTransientNetworkError({ response: { status: 500 } })).toBe(false);
    expect(isTransientNetworkError({ response: { status: 429 } })).toBe(false);
    expect(isTransientNetworkError(undefined)).toBe(false);
    expect(isTransientNetworkError({ code: 'ERR_BAD_REQUEST' })).toBe(false);
  });
});

describe('networkRetryBackoffMs', () => {
  it('doubles per attempt and caps at 4s', () => {
    expect(networkRetryBackoffMs(1)).toBe(500);
    expect(networkRetryBackoffMs(2)).toBe(1000);
    expect(networkRetryBackoffMs(3)).toBe(2000);
    expect(networkRetryBackoffMs(4)).toBe(4000);
    expect(networkRetryBackoffMs(10)).toBe(4000);
  });
});
