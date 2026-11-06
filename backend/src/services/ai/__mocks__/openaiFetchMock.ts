/**
 * Shared fetch mocks for AI provider tests. Each helper returns a fetch-like
 * Response-shaped object (ok/status/json) matching what the providers consume.
 */

const fetchMockFactory = () =>
  jest.fn(async () => createOpenAIResponse('Apply pressure.'));

export const fetchMock: jest.Mock = fetchMockFactory();

export function createResponse(openaiBody: Record<string, unknown>, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => openaiBody,
  } as unknown as Response;
}

export function createOpenAIResponse(content: string, emptyMessage = false): Response {
  return createResponse({
    choices: [emptyMessage ? {} : { message: { role: 'assistant', content } }],
  });
}

export function createToolCallResponse(call: {
  id: string;
  name: string;
  arguments: string;
}): Response {
  return createResponse({
    choices: [
      {
        message: {
          role: 'assistant',
          content: null,
          tool_calls: [
            {
              id: call.id,
              type: 'function',
              function: { name: call.name, arguments: call.arguments },
            },
          ],
        },
      },
    ],
  });
}
