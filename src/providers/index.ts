import { MockProvider } from './mock.js';
import { OpenRouterProvider } from './openrouter.js';
import type { Provider, ProviderName } from '../types.js';
export function providerName(env = process.env): ProviderName {
  const name = env.TESTPILOT_PROVIDER ?? 'mock';
  if (name !== 'mock' && name !== 'openrouter') throw new Error('TESTPILOT_PROVIDER deve ser mock ou openrouter.');
  return name;
}
export function createProvider(env = process.env): Provider {
  return providerName(env) === 'mock' ? new MockProvider() : new OpenRouterProvider(env.OPENROUTER_API_KEY ?? '', env.OPENROUTER_MODEL ?? '');
}
