import { captureDOM } from './dom.js';
import { validateCode } from './validation.js';
import type { Provider, ProviderOutput } from './types.js';
export async function generate(provider: Provider, requirement: string, url: string): Promise<ProviderOutput> {
  const dom = await captureDOM(url);
  const output = await provider.request({ operation: 'generate', requirement, url, dom });
  validateCode(output.code);
  return output;
}
