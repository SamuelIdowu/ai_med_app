// Transient network failure classification + retry backoff policy.
// Kept dependency-free so unit tests can run without React Native /
// Supabase client initialization.

export function isTransientNetworkError(error: any): boolean {
    if (error?.response) {
        // The server responded with a status code, so the failure is not
        // a transport-level problem we should blindly retry.
        return false;
    }
    const code = error?.code;
    const networkCodes = ['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND'];
    return networkCodes.includes(code) || error?.message === 'Network Error';
}

export function networkRetryBackoffMs(attempt: number): number {
    return Math.min(500 * 2 ** (attempt - 1), 4000);
}
