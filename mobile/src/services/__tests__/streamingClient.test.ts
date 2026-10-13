import { parseSSELine, processSSEBuffer, ParsedSSEChunk, streamTriage } from '../streamingClient';

describe('Streaming Client Parser', () => {
  it('extracts delta text and emergency flag correctly', () => {
    const line = 'data: {"delta": "Keep pressure on the wound.", "critical": false}';
    const parsed = parseSSELine(line);
    expect(parsed?.delta).toBe('Keep pressure on the wound.');
    expect(parsed?.critical).toBe(false);
  });

  it('handles critical emergency escalation flag', () => {
    const line = 'data: {"delta": "Anaphylaxis suspected! Call 911.", "critical": true}';
    const parsed = parseSSELine(line);
    expect(parsed?.delta).toContain('Anaphylaxis');
    expect(parsed?.critical).toBe(true);
  });

  it('returns null for non-data or malformed lines', () => {
    expect(parseSSELine(': ping')).toBeNull();
    expect(parseSSELine('')).toBeNull();
    expect(parseSSELine('event: message')).toBeNull();
    expect(parseSSELine('data: {invalid-json')).toBeNull();
  });

  it('processes multi-line buffers and emits incremental delta updates', () => {
    const onDelta = jest.fn();
    const onCritical = jest.fn();
    const onDone = jest.fn();

    const buffer = [
      'data: {"delta": "Step 1: Check airway."}',
      'data: {"delta": " Step 2: Begin compressions.", "critical": true}',
      'data: {"done": true}',
      '',
    ].join('\n');

    processSSEBuffer(buffer, { onDelta, onCritical, onDone });

    expect(onDelta).toHaveBeenCalledWith('Step 1: Check airway.');
    expect(onDelta).toHaveBeenCalledWith(' Step 2: Begin compressions.');
    expect(onCritical).toHaveBeenCalledWith(true);
    expect(onDone).toHaveBeenCalled();
  });

  it('calls streamTriage and consumes streaming response without reader', async () => {
    const mockResponseText = [
      'data: {"delta": "Clinical assessment started."}',
      'data: {"delta": " Apply cold compress."}',
      'data: {"done": true}',
      '',
    ].join('\n');

    (global as any).fetch = jest.fn().mockImplementation(async () => ({
      ok: true,
      text: async () => mockResponseText,
    }));

    const onDelta = jest.fn();
    const onDone = jest.fn();

    await streamTriage({
      encounterId: 'enc-123',
      query: 'Patient sprained ankle with mild swelling',
      apiBaseUrl: 'http://localhost:5000',
      onDelta,
      onDone,
    });

    expect(onDelta).toHaveBeenCalledWith('Clinical assessment started.');
    expect(onDelta).toHaveBeenCalledWith(' Apply cold compress.');
    expect(onDone).toHaveBeenCalled();
  });
});
