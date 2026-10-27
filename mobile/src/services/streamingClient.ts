export interface ParsedSSEChunk {
  delta?: string;
  critical?: boolean;
  done?: boolean;
  error?: string;
}

export interface StreamTriageOptions {
  encounterId: string;
  query: string;
  symptoms?: string[];
  apiBaseUrl: string;
  authToken?: string;
  onDelta: (delta: string) => void;
  onCritical?: (isCritical: boolean) => void;
  onDone?: () => void;
  onError?: (err: Error) => void;
  signal?: AbortSignal;
}

/**
 * Parses a single SSE line (e.g. "data: {...}") into a typed chunk.
 */
export function parseSSELine(line: string): ParsedSSEChunk | null {
  const trimmed = line.trim();
  if (trimmed.startsWith('data: ')) {
    try {
      return JSON.parse(trimmed.replace(/^data:\s*/, ''));
    } catch (_) {
      return null;
    }
  }
  return null;
}

/**
 * Parses a multi-line SSE raw buffer and executes callbacks for each chunk.
 */
export function processSSEBuffer(
  buffer: string,
  callbacks: {
    onDelta?: (delta: string) => void;
    onCritical?: (critical: boolean) => void;
    onDone?: () => void;
    onError?: (error: string) => void;
  }
): string {
  const lines = buffer.split('\n');
  // Keep the last incomplete slice in the buffer
  const remainder = lines.pop() ?? '';

  for (const line of lines) {
    const parsed = parseSSELine(line);
    if (!parsed) continue;

    if (parsed.delta && callbacks.onDelta) {
      callbacks.onDelta(parsed.delta);
    }
    if (parsed.critical !== undefined && callbacks.onCritical) {
      callbacks.onCritical(parsed.critical);
    }
    if (parsed.error && callbacks.onError) {
      callbacks.onError(parsed.error);
    }
    if (parsed.done && callbacks.onDone) {
      callbacks.onDone();
    }
  }

  return remainder;
}

/**
 * Streams clinical triage response from the backend SSE endpoint.
 */
export async function streamTriage(options: StreamTriageOptions): Promise<void> {
  const {
    encounterId,
    query,
    symptoms = [],
    apiBaseUrl,
    authToken,
    onDelta,
    onCritical,
    onDone,
    onError,
    signal,
  } = options;

  const url = `${apiBaseUrl.replace(/\/+$/, '')}/encounters/triage/stream`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        encounterId,
        query,
        symptoms,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
    }

    // Try Web Streams getReader()
    const reader = (response as any).body?.getReader?.();
    if (reader) {
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          if (buffer.trim()) {
            processSSEBuffer(buffer + '\n', { onDelta, onCritical, onDone, onError: (e) => onError?.(new Error(e)) });
          }
          onDone?.();
          break;
        }

        const chunkText = decoder.decode(value, { stream: true });
        buffer += chunkText;
        buffer = processSSEBuffer(buffer, {
          onDelta,
          onCritical,
          onDone,
          onError: (e) => onError?.(new Error(e)),
        });
      }
    } else {
      // Fallback for environments where body.getReader() is not supported
      const rawText = await response.text();
      processSSEBuffer(rawText + '\n', {
        onDelta,
        onCritical,
        onDone,
        onError: (e) => onError?.(new Error(e)),
      });
      onDone?.();
    }
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    onError?.(err instanceof Error ? err : new Error(String(err)));
  }
}
