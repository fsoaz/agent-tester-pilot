import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { validateCode, validateHealing } from '../src/validation.js';
import { mockCode, MockProvider } from '../src/providers/mock.js';
import { OpenRouterProvider } from '../src/providers/openrouter.js';
import { createProvider } from '../src/providers/index.js';
import { Store, atomicJSON, withInterruption } from '../src/store.js';
import { counts, staticReport } from '../src/report.js';
import { workflow } from '../src/workflow.js';
import type { Provider, Attempt, ProviderInput, RunRecord } from '../src/types.js';

const code = mockCode('login');
test('mock cobre apenas os cenários documentados, incluindo seletores atuais', async () => {
  for (const r of ['login', 'painel', 'formulário', 'login com sucesso', 'acessar painel', 'enviar formulário']) validateCode(mockCode(r));
  assert.throws(() => mockCode('comprar passagens'), /só suporta/);
  const result = await new MockProvider().request({ operation: 'generate', requirement: 'login', url: 'http://localhost', dom: '<input id="account-email">' });
  assert.match(result.code, /account-email/);
});
test('validação AST rejeita sintaxe e operações arbitrárias', () => {
  validateCode(code);
  for (const bad of [
    code.replace('await page.goto', "await import('node:fs'); await page.goto"),
    code.replace("from '@playwright/test'", "from 'node:fs'"),
    code.replace('import {', 'import type {'),
    code.replace("await page.goto('/');", "await page.evaluate(() => process.exit());"),
    code.replace("await page.goto('/');", "await page.goto('https://evil.example');"),
    code.replace("await page.goto('/');", "await page.goto('//evil.example');"),
    code.replace("await page.goto('/');", "await page.goto('/\\\\evil.example');"),
    code.replace("await page.goto('/');", 'const x = process;'),
    code.replace(".fill('demo@testpilot.local')", '.fill(process.env.SECRET)'),
    code.replace('async ({ page })', 'async ({ page, context })'),
    code.replace('async ({ page })', 'async ({ page = process.exit() })'),
    code.replace('async ({ page })', 'async ({ ...page })'),
    code.replace(/  await expect.+\n/, ''), code + 'process.exit();', '```typescript\n' + code + '```', code.replace('});', '}'),
  ]) assert.throws(() => validateCode(bad), /Código recusado/);
});
test('healer aceita localizadores e preserva ações, dados e assertions', () => {
  validateHealing(code, code.replace("locator('#email')", "getByLabel('E-mail')"));
  validateHealing(code, code.replace('#email', '#account-email'));
  for (const bad of [code, code.replace('toBeVisible()', 'toBeHidden()'), code.replace('Bem-vindo, Demo', 'Serviço indisponível'), code.replace('TestPilot123!', 'OutraSenha'), code.replace('.click()', '.hover()'), code.replace(/  await expect.+\n/, ''), code.replace("page.goto('/')", "page.goto('/outro')")]) assert.throws(() => validateHealing(code, bad), /Código recusado/);
});
const input: ProviderInput = { operation: 'generate', requirement: 'login', url: 'http://127.0.0.1:3000', dom: '<main>demo</main>' };
test('configuração real exige chave/modelo e nunca troca para mock', () => {
  assert.equal(createProvider({} as NodeJS.ProcessEnv).name, 'mock');
  assert.throws(() => createProvider({ TESTPILOT_PROVIDER: 'inexistente' }), /deve ser/);
  assert.throws(() => createProvider({ TESTPILOT_PROVIDER: 'openrouter' }), /exige/);
  assert.throws(() => new OpenRouterProvider('key', ''), /exige/);
});
test('OpenRouter usa endpoint/credenciais/modelo configurados e captura consumo', async () => {
  const transport: typeof fetch = async (url, init) => {
    assert.equal(url, 'https://openrouter.ai/api/v1/chat/completions');
    assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer fixture-key');
    const body = JSON.parse(String(init?.body)); assert.equal(body.model, 'modelo-configurado'); assert.equal(body.messages[1].content, JSON.stringify(input));
    return Response.json({ model: 'modelo-retornado', choices: [{ message: { content: code }, finish_reason: 'stop' }], usage: { prompt_tokens: 42, completion_tokens: 20, cost: 0.0001 } });
  };
  const result = await new OpenRouterProvider('fixture-key', 'modelo-configurado', transport).request(input);
  assert.equal(result.provider, 'openrouter'); assert.equal(result.model, 'modelo-retornado'); assert.equal(result.usage?.prompt_tokens, 42);
});
test('OpenRouter reporta autenticação, saldo, timeout e respostas inválidas', async () => {
  for (const status of [401, 402, 429, 503]) {
    await assert.rejects(new OpenRouterProvider('key', 'model', async () => new Response('', { status })).request(input), new RegExp(`HTTP ${status}`));
  }
  await assert.rejects(new OpenRouterProvider('key', 'model', async () => { throw new Error('network'); }).request(input), /timeout ou falha de rede/);
  await assert.rejects(new OpenRouterProvider('key', 'model', async (_url, init) => new Promise((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('test timeout')), 100);
    init!.signal!.addEventListener('abort', () => { clearTimeout(timer); reject(init!.signal!.reason); }, { once: true });
  }), 5).request(input), /timeout ou falha de rede/);
  for (const body of [null, {}, { error: { message: 'error' } }, { choices: [{ message: { content: code }, finish_reason: 'length' }] }, { choices: [{ message: { content: 123 } }] }]) await assert.rejects(new OpenRouterProvider('key', 'model', async () => Response.json(body)).request(input), /resposta inválida/);
  await assert.rejects(new OpenRouterProvider('key', 'model', async () => new Response('invalid json')).request(input), /JSON inválida/);
});
test('snapshots atômicos, eventos, hash de aprovação e interrupções', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'testpilot-store-')); const store = new Store(root);
  const r = store.create('generate', 'login', input.url, 'mock'); await store.save(r, 'created'); await store.approve(r, code); await store.save(r, 'approved');
  assert.equal((await store.loadApproved(r.approvedFile!)).code, code);
  assert.equal((await store.list()).length, 1);
  assert.equal((await readFile(path.join(store.dir(r.id), 'events.jsonl'), 'utf8')).trim().split('\n').length, 2);
  await writeFile(path.join(root, r.approvedFile!), code + '\n'); await assert.rejects(store.loadApproved(r.approvedFile!), /alterado/);
  r.heartbeatAt = '2000-01-01T00:00:00Z'; assert.equal(withInterruption(r).state, 'operational_error');
  r.state = 'completed'; assert.equal(withInterruption(r).state, 'completed');
  assert.throws(() => store.dir('../bad'), /inválido/);
  await atomicJSON(path.join(store.artifacts, 'partial.json'), { ok: true });
  const corrupt = path.join(store.artifacts, '00000000-0000-0000-0000-000000000000'); await mkdir(corrupt); await writeFile(path.join(corrupt, 'snapshot.json'), '{}'); assert.equal((await store.list()).length, 1);
});
test('contagens usam cenário mais recente e separam tentativas', () => {
  const store = new Store('/tmp'); const r = store.create('generate', 'login', input.url, 'mock');
  r.outcome = 'passed'; r.code = code; r.approvedFile = 'generated-tests/a.spec.ts';
  const retry = { ...r, id: 'other', createdAt: '2099-01-01', outcome: 'recovered' } as RunRecord;
  const c = counts([r, retry]); assert.equal(c.generated, 1); assert.equal(c.passed, 1); assert.equal(c.recovered, 1); assert.equal(c.runs, 2);
  const beforeCode = store.create('generate', 'configuração inválida', input.url, 'openrouter'); beforeCode.outcome = 'error';
  assert.equal(counts([r, retry, beforeCode]).generated, 1); assert.equal(counts([r, retry, beforeCode]).failed, 0);
  r.requirement = '<script>alert(1)</script>'; assert.doesNotMatch(staticReport(r), /<script>/); assert.match(staticReport(r), /&lt;script&gt;/);
});

const passed = (text: string, n: number): Attempt => ({ number: n, code: text, status: 'passed', startedAt: new Date().toISOString(), logs: '', evidence: {} });
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'testpilot-workflow-')); const store = new Store(root);
  return { root, store, options: { command: 'generate' as const, input: 'login', url: input.url, autoApprove: true, interactive: false, log: () => {}, approve: async () => true, store, provider: new MockProvider(), generate: async () => ({ code, provider: 'mock' as const }), execute: async (text: string, _url: string, _dir: string, n: number) => passed(text, n) } };
}
test('geração exige aprovação e modo não interativo exige flag explícita', async () => {
  const { options } = await setup();
  const cancelled = await workflow({ ...options, autoApprove: false }); assert.equal(cancelled.exitCode, 2); assert.equal(cancelled.run.attempts.length, 0);
  const rejected = await workflow({ ...options, autoApprove: false, interactive: true, approve: async () => false }); assert.equal(rejected.exitCode, 2); assert.equal(rejected.run.approvals[0]?.approved, false); assert.equal(rejected.run.approvedFile, undefined);
  const success = await workflow(options); assert.equal(success.exitCode, 0); assert.equal(success.run.outcome, 'passed');
});
test('resposta inválida gera erro operacional persistido sem execução', async () => {
  const { options, store } = await setup();
  const invalid = await workflow({ ...options, generate: async () => ({ code: 'process.exit()', provider: 'mock' }) });
  assert.equal(invalid.exitCode, 1); assert.equal(invalid.run.state, 'operational_error'); assert.equal((await store.get(invalid.run.id)).attempts.length, 0);
});
test('até três propostas; cada aprovação e tentativa fica no histórico', async () => {
  const { options } = await setup(); let calls = 0;
  const provider: Provider = { name: 'mock', request: async i => ({ provider: 'mock', code: i.code!.replace(/#email[^'"]*/g, `#email-${++calls}`) }) };
  const result = await workflow({ ...options, provider, execute: async (text, _url, dir, number) => {
    await writeFile(path.join(dir, 'context.html'), '<input id="account-email">');
    return { ...passed(text, number), status: 'failed', error: 'Timeout waiting for locator', failureKind: 'locator', evidence: { 'context.html': 'context.html' } };
  } });
  assert.equal(result.exitCode, 1); assert.equal(result.run.attempts.length, 4); assert.equal(result.run.proposals.length, 3); assert.equal(calls, 3); assert.equal(result.run.approvals.length, 4);
});
test('propostas inválidas/rejeitadas são contadas e encerram a execução', async () => {
  for (const invalid of [true, false]) {
    const { options } = await setup();
    const provider: Provider = { name: 'mock', request: async i => ({ provider: 'mock', code: invalid ? i.code!.replace('toBeVisible()', 'toBeHidden()') : i.code!.replace('#email', '#account-email') }) };
    let approvals = 0;
    const result = await workflow({ ...options, provider, autoApprove: false, interactive: true, approve: async () => ++approvals === 1, execute: async (text, _url, dir, number) => {
      await writeFile(path.join(dir, 'context.html'), '<main>context</main>');
      return { ...passed(text, number), status: 'failed', failureKind: 'locator', evidence: { 'context.html': 'context.html' } };
    } });
    assert.equal(result.run.proposals.length, 1); assert.equal(result.run.attempts.length, 1); assert.equal(result.run.proposals[0]?.status, invalid ? 'invalid' : 'rejected'); assert.equal(result.exitCode, invalid ? 1 : 2);
  }
});
test('assertions, aplicação e configuração nunca entram no healer', async () => {
  for (const failureKind of ['assertion', 'application', 'configuration'] as const) {
    const { options } = await setup(); const result = await workflow({ ...options, execute: async (text, _u, _d, n) => ({ ...passed(text, n), status: 'failed', failureKind, error: 'falha' }) });
    assert.equal(result.exitCode, 1); assert.equal(result.run.proposals.length, 0);
    assert.equal(result.run.state, failureKind === 'assertion' ? 'completed' : 'operational_error');
  }
});
