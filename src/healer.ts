import { createTwoFilesPatch } from 'diff';
import { validateHealing } from './validation.js';
import type { Provider, ProviderOutput, RunRecord, Attempt } from './types.js';
export async function proposeHealing(provider: Provider, run: RunRecord, attempt: Attempt, dom: string): Promise<ProviderOutput> {
  return provider.request({ operation: 'heal', requirement: run.requirement, url: run.url, dom, code: attempt.code, error: attempt.error });
}
export function reviewHealing(original: string, proposed: string): string {
  validateHealing(original, proposed);
  return createTwoFilesPatch('aprovado.spec.ts', 'proposta.spec.ts', original, proposed);
}
