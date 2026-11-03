// Lightweight input validation for route-level guards.
// Deliberately dependency-free: strict, small validators used before any DB or
// provider call. Exported as unknown-safe helpers so callers can reject early.

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): ValidationResult<T> => ({ ok: true, value });
const fail = (error: string): ValidationResult<never> => ({ ok: false, error });

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const EMAIL_MAX_LENGTH = 254;
const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
const PUSH_TOKEN_MAX_LENGTH = 256;

export function validateEmail(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') return fail('Email is required');
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > EMAIL_MAX_LENGTH) {
    return fail('A valid email is required');
  }
  if (!EMAIL_PATTERN.test(trimmed)) {
    return fail('A valid email is required');
  }
  return ok(trimmed);
}

/**
 * Auth availability check: returns the normalized email or null when the
 * caller should receive 400.
 */
export function checkEmailAvailability(body: unknown): string | null {
  const email = (body as { email?: unknown } | null | undefined)?.email;
  const result = validateEmail(email);
  return result.ok ? result.value : null;
}

export function validateUuidParam(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string' || input.length === 0 || input.length > 64) {
    return fail('Invalid identifier');
  }
  if (!UUID_PATTERN.test(input)) {
    return fail('Invalid identifier');
  }
  return ok(input.toLowerCase());
}

export function validatePushToken(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') return fail('Token is required');
  const trimmed = input.trim();
  if (trimmed.length === 0 || trimmed.length > PUSH_TOKEN_MAX_LENGTH) {
    return fail('Token is required');
  }
  // Accept Expo push token formats; anything else is rejected before it is
  // ever sent to the Expo API.
  if (!/^ExponentPushToken\[.{20,}\]$/.test(trimmed) && !/^ExpoPushToken\[[^\]]+\]$/.test(trimmed)) {
    return fail('Token is required');
  }
  return ok(trimmed);
}

export function validateChatMessage(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') return fail('Message is required');
  const trimmed = input.trim();
  if (trimmed.length === 0) return fail('Message is required');
  if (trimmed.length > 8000) return fail('Message is too long');
  return ok(trimmed);
}

export interface ValidatedChatHistoryEntry {
  role: 'user' | 'model' | 'assistant' | 'system';
  // Gemini wire format: { role, parts: [{ text }] }
  parts?: Array<{ text: string }>;
  // Simple format: { role, content }
  content?: string;
}

function validHistoryText(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0 && value.length <= 8000;
}

export function validateChatHistory(
  input: unknown,
): ValidationResult<ValidatedChatHistoryEntry[]> {
  if (input === undefined || input === null) return ok([]);
  if (!Array.isArray(input)) return fail('Invalid history');
  if (input.length > 50) return fail('History is too long');
  for (const raw of input) {
    const entry = raw as { role?: unknown; parts?: unknown; content?: unknown } | null;
    if (!entry || typeof entry !== 'object') return fail('Invalid history');
    const role = entry.role;
    if (role !== 'user' && role !== 'model' && role !== 'assistant' && role !== 'system') {
      return fail('Invalid history');
    }
    const parts = entry.parts;
    if (Array.isArray(parts)) {
      if (parts.length === 0 || parts.length > 20) return fail('Invalid history');
      for (const part of parts) {
        const text = (part as { text?: unknown } | null | undefined)?.text;
        if (!validHistoryText(text)) return fail('Invalid history');
      }
    } else if (!validHistoryText(entry.content)) {
      return fail('Invalid history');
    }
  }
  return ok(input as ValidatedChatHistoryEntry[]);
}
