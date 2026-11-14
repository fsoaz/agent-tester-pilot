import type { Provider, ProviderInput, ProviderOutput } from '../types.js';

export function mockCode(requirement: string, changed = false): string {
  const r = requirement.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
  const scenarios: Record<string, string> = {
    login: "await expect(page.getByRole('heading', { name: 'Bem-vindo, Demo' })).toBeVisible();",
    painel: "await expect(page.getByText('Visão geral da sua conta')).toBeVisible();\n  await expect(page.getByRole('heading', { name: 'Bem-vindo, Demo' })).toBeVisible();",
    formulario: "await page.getByLabel('Assunto').fill('Seminário');\n  await page.getByLabel('Mensagem').fill('Demonstração TestPilot');\n  await page.getByRole('button', { name: 'Enviar', exact: true }).click();\n  await expect(page.getByRole('status')).toHaveText('Mensagem enviada com sucesso');",
  };
  const aliases: Record<string, string> = { 'login com sucesso': 'login', 'acessar painel': 'painel', 'enviar formulario': 'formulario' };
  const key = aliases[r] ?? r;
  const tail = scenarios[key];
  if (!tail) throw new Error('O simulador só suporta os requisitos: "login", "painel", "formulário" (também "login com sucesso", "acessar painel", "enviar formulário"). Use OpenRouter para geração livre.');
  return `import { test, expect } from '@playwright/test';\n\ntest('${key}', async ({ page }) => {\n  await page.goto('/');\n  await page.locator('#${changed ? 'account-email' : 'email'}').fill('demo@testpilot.local');\n  await page.locator('#${changed ? 'account-password' : 'password'}').fill('TestPilot123!');\n  await page.locator('#${changed ? 'access-account' : 'login-button'}').click();\n  ${tail}\n});\n`;
}
export class MockProvider implements Provider {
  readonly name = 'mock' as const;
  async request(input: ProviderInput): Promise<ProviderOutput> {
    if (input.operation === 'generate') return { code: mockCode(input.requirement, input.dom.includes('id="account-email"')), provider: this.name, model: 'demo-predefinida-v1' };
    if (!input.code) throw new Error('Reparo exige código original.');
    const changed = input.dom.includes('id="account-email"');
    const pairs = [['email', 'account-email'], ['password', 'account-password'], ['login-button', 'access-account']];
    let code = input.code;
    for (const [oldId, newId] of pairs) code = code.replaceAll(`#${changed ? oldId : newId}`, `#${changed ? newId : oldId}`);
    return { code, provider: this.name, model: 'demo-predefinida-v1' };
  }
}
