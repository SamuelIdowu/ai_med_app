import { getAIProvider, getAIProviderName, getRegisteredAIProviders } from '../index';
import { InvalidRequestError } from '../../../types/errors';

const ENV_BACKUP = { ...process.env };

afterEach(() => {
  process.env = { ...ENV_BACKUP };
});

describe('AI provider registry', () => {
  it('defaults to the gemini provider', () => {
    delete process.env.AI_PROVIDER;
    expect(getAIProviderName()).toBe('gemini');
    expect(getAIProvider().name).toBe('gemini');
  });

  it('resolves openai when AI_PROVIDER=openai', () => {
    process.env.AI_PROVIDER = 'openai';
    expect(getAIProviderName()).toBe('openai');
    expect(getAIProvider().name).toBe('openai');
  });

  it('is case and whitespace insensitive', () => {
    process.env.AI_PROVIDER = ' OpenAI ';
    expect(getAIProviderName()).toBe('openai');
  });

  it('rejects unknown providers with a helpful message', () => {
    process.env.AI_PROVIDER = 'claude-haiku';
    expect(() => getAIProvider()).toThrow(InvalidRequestError);
    expect(() => getAIProvider()).toThrow(/Available providers: gemini, openai/);
  });

  it('lists registered providers', () => {
    expect(getRegisteredAIProviders()).toEqual(['gemini', 'openai']);
  });
});
