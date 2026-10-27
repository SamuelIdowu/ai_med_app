// Custom error types for better error handling

export class AIServiceError extends Error {
  public code: string;
  public statusCode: number;
  public userMessage: string;

  constructor(code: string, message: string, userMessage: string, statusCode: number = 500) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.userMessage = userMessage;
    this.statusCode = statusCode;
  }
}

export class QuotaExceededError extends AIServiceError {
  constructor(message: string = 'API quota exceeded') {
    super('QUOTA_EXCEEDED', message, 'Too many requests. Please wait a moment and try again.', 429);
  }
}

export class InvalidRequestError extends AIServiceError {
  constructor(message: string = 'Invalid request') {
    super(
      'INVALID_REQUEST',
      message,
      'There was a problem with your request. Please try rephrasing your message.',
      400,
    );
  }
}

export class NetworkError extends AIServiceError {
  constructor(message: string = 'Network error') {
    super(
      'NETWORK_ERROR',
      message,
      'Connection failed. Please check your internet connection.',
      503,
    );
  }
}

export class APIKeyError extends AIServiceError {
  constructor(message: string = 'API key not configured') {
    super(
      'API_KEY_ERROR',
      message,
      'Service is temporarily unavailable. Please contact support.',
      500,
    );
  }
}
