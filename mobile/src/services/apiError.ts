export interface ApiErrorLike {
  response?: {
    status?: number;
    data?: {
      error?: string;
      userMessage?: string;
      code?: string;
    };
  };
  code?: string;
  message?: string;
}

export const DEFAULT_CHAT_ERROR = 'Unable to connect to the clinical service. Please try again.';

/**
 * Turns an axios/fetch error into a precise, user-facing message.
 * Prefers a backend-provided `userMessage`, then maps common status codes.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback: string = DEFAULT_CHAT_ERROR
): string {
  const err = error as ApiErrorLike | undefined;
  const data = err?.response?.data;

  if (data?.userMessage) {
    return data.userMessage;
  }

  const status = err?.response?.status;

  if (!status) {
    if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') {
      return 'The request timed out. Please check your connection and try again.';
    }
    const isNetworkFailure =
      err?.code === 'ERR_NETWORK' ||
      err?.code === 'ECONNREFUSED' ||
      err?.code === 'ENOTFOUND' ||
      err?.message === 'Network Error';
    if (isNetworkFailure) {
      return 'Cannot reach the clinical service. Check your internet connection and that the backend is running.';
    }
    if (data?.error && typeof data.error === 'string') {
      return data.error;
    }
    return fallback;
  }

  switch (status) {
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The clinical service endpoint was not found. Please update the app or contact support.';
    case 408:
      return 'The request timed out. Please check your connection and try again.';
    case 429:
      return 'Too many requests. Please wait a moment before trying again.';
    default:
      break;
  }

  if (status >= 500) {
    return 'The clinical service is temporarily unavailable. Please try again in a moment.';
  }

  if (data?.error && typeof data.error === 'string') {
    return data.error;
  }

  return fallback;
}
