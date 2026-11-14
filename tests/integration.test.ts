import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, writeFile, readFile, symlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';
import { chromium } from '@playwright/test';
import { Store } from '../src/store.js';
import { startDashboard } from '../src/dashboard/server.js';
import { captureDOM } from '../src/dom.js';
import { workflow } from '../src/workflow.js';
import type { RunRecord } from '../src/types.js';
const repo = fileURLToPath(new URL('../', import.meta.url));
const cli = path.join(repo, 'dist/cli.js');
function stop(child: ChildProcess) { if (child.exitCode === null) child.kill('SIGTERM'); }
async function command(root: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
  return new Promise<{ exit: number | null; stdout: string }>((resolve, reject) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd: root, env: { ...process.env, TESTPILOT_PROVIDER: 'mock', OPENROUTER_API_KEY: '', OPENROUTER_MODEL: '', ...extraEnv }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = ''; child.stdout.on('data', d => { stdout += String(d); }); child.stderr.on('data', d => { stdout += String(d); });
    child.once('error', reject); child.once('exit', exit => resolve({ exit, stdout }));
  });
}
test('fluxo integrado real: CLI → Chromium → arquivos → API → dashboard', { timeout: 180_000 }, async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'testpilot-integration-'));
  console.log(`VALIDATION_ROOT=${root}`);
  const state = path.join(root, 'demo-state.json'); await writeFile(state, '{}');
  const demo = spawn(process.execPath, ['--import', 'tsx', 'demo/server.ts'], { cwd: repo, env: { ...process.env, DEMO_PORT: '0', DEMO_STATE_FILE: state }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => stop(demo));
  const url = await new Promise<string>((resolve, reject) => {
    let output = ''; const timer = setTimeout(() => reject(new Error('Demo não iniciou: ' + output)), 15_000);
    demo.stdout!.on('data', d => { output += String(d); const match = /Demo: (http:\/\/127.0.0.1:\d+)/.exec(output); if (match) { clearTimeout(timer); resolve(match[1]!); } });
    demo.stderr!.on('data', d => { output += String(d); }); demo.once('error', reject);
  });
  const store = new Store(root);
  let approvedFile = '', recovered: RunRecord;
  await t.test('login passa e salva somente depois da aprovação explícita', async () => {
    const result = await command(root, ['generate', 'login', '--url', url, '--auto-approve']);
    assert.equal(result.exit, 0, result.stdout); const run = (await store.list())[0]!;
    assert.equal(run.outcome, 'passed'); assert.equal(run.approvals[0]?.automatic, true); assert.equal(run.attempts.length, 1);
    approvedFile = run.approvedFile!; assert.ok(approvedFile);
    assert.ok(JSON.parse(await readFile(path.join(store.dir(run.id), 'summary.json'), 'utf8')));
  });
  await t.test('painel e formulário executam ações e assertions reais', async () => {
    for (const requirement of ['painel', 'formulário']) {
      const result = await command(root, ['generate', requirement, '--url', url, '--auto-approve']); assert.equal(result.exit, 0, result.stdout);
    }
  });
  await t.test('DOM remove scripts, estilos e valores sensíveis', async () => {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage();
      await page.route('**/*', route => route.fulfill({ body: '<html><style>.x{}</style><script>window.token="segredo"</script><input value="segredo" data-token="segredo"><textarea>segredo</textarea><p>Bearer abc.def.ghi</p><p>pessoa@example.com</p></html>', contentType: 'text/html' }));
      await page.goto('http://sanitization.local');
      const { sanitizedDOM } = await import('../src/dom.js'); const dom = await sanitizedDOM(page);
      assert.doesNotMatch(dom, /segredo|<script|<style|Bearer abc|pessoa@example/);
      assert.ok(dom.length <= 20_000);
    } finally { await browser.close(); }
    assert.match(await captureDOM(url), /email/);
  });
  await t.test('mudança controlada quebra o seletor e recuperação guarda evidências', async () => {
    await writeFile(state, JSON.stringify({ changed: true }));
    const result = await command(root, ['run', approvedFile, '--url', url, '--auto-approve']);
    assert.equal(result.exit, 0, result.stdout); recovered = (await store.list())[0]!;
    assert.equal(recovered.outcome, 'recovered'); assert.equal(recovered.attempts.length, 2); assert.equal(recovered.proposals.length, 1);
    assert.equal(recovered.attempts[0]?.failureKind, 'locator'); assert.equal(recovered.proposals[0]?.status, 'approved');
    for (const name of ['failure.html', 'failure.png', 'trace.zip', 'context.html', 'runner.log', 'result.json']) {
      assert.ok(recovered.attempts[0]?.evidence[name], `evidência ${name}`);
      assert.ok((await readFile(path.join(store.dir(recovered.id), recovered.attempts[0]!.evidence[name]!))).length);
    }
    assert.match((await store.loadApproved(approvedFile)).code, /account-email/);
  });
  await t.test('regressão funcional de assertion permanece falha sem healer', async () => {
    await writeFile(state, JSON.stringify({ changed: true, broken: true }));
    const result = await command(root, ['run', approvedFile, '--url', url, '--auto-approve']);
    assert.equal(result.exit, 1, result.stdout); const run = (await store.list())[0]!;
    assert.equal(run.outcome, 'failed'); assert.equal(run.attempts[0]?.failureKind, 'assertion'); assert.equal(run.proposals.length, 0);
    await writeFile(state, JSON.stringify({ changed: true }));
  });
  await t.test('CLI devolve 2 sem flag e 1 para configuração real incompleta', async () => {
    const cancelled = await command(root, ['generate', 'login', '--url', url]); assert.equal(cancelled.exit, 2); assert.match(cancelled.stdout, /não interativa exige/);
    const incomplete = await command(root, ['generate', 'login', '--url', url, '--auto-approve'], { TESTPILOT_PROVIDER: 'openrouter' }); assert.equal(incomplete.exit, 1); assert.match(incomplete.stdout, /OPENROUTER_API_KEY e OPENROUTER_MODEL/);
    assert.equal((await store.list())[0]?.provider, 'openrouter');
  });
  await t.test('indisponibilidade da aplicação não entra em reparo', async () => {
    const result = await command(root, ['run', approvedFile, '--url', 'http://127.0.0.1:1', '--auto-approve']);
    assert.equal(result.exit, 1); const run = (await store.list())[0]!; assert.equal(run.proposals.length, 0); assert.equal(run.attempts[0]?.failureKind, 'application');
  });
  let dashboard = await startDashboard(store, 0); t.after(() => new Promise<void>(resolve => dashboard.close(() => resolve())));
  let dashboardURL = `http://127.0.0.1:${(dashboard.address() as { port: number }).port}`;
  const browser = await chromium.launch(); t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const browserErrors: string[] = []; page.on('pageerror', error => browserErrors.push(error.message));
  await t.test('API lê dados reais, limita evidências e rejeita mutações', async () => {
    const list = await (await fetch(`${dashboardURL}/api/runs`)).json(); assert.ok(list.runs.length >= 8); assert.equal(list.counts.generated, 3); assert.equal(list.counts.passed, 2); assert.equal(list.counts.failed, 1); assert.equal(list.counts.runs, list.runs.length);
    const detail = await (await fetch(`${dashboardURL}/api/runs/${recovered.id}`)).json(); assert.equal(detail.outcome, 'recovered');
    const screenshot = await fetch(`${dashboardURL}/api/runs/${recovered.id}/evidence/${recovered.attempts[0]!.evidence['failure.png']}`); assert.equal(screenshot.status, 200); assert.equal(screenshot.headers.get('content-type'), 'image/png');
    const html = await fetch(`${dashboardURL}/api/runs/${recovered.id}/evidence/${recovered.attempts[0]!.evidence['failure.html']}`); assert.match(html.headers.get('content-disposition')!, /attachment/);
    assert.equal((await fetch(`${dashboardURL}/api/runs`, { method: 'POST' })).status, 405);
    assert.equal((await fetch(`${dashboardURL}/api/runs/${recovered.id}/evidence/not-found.zip`)).status, 404);
    assert.notEqual((await fetch(`${dashboardURL}/api/runs/${recovered.id}/evidence/%2e%2e%2fsummary.json`)).status, 200);
    const external = path.join(root, 'outside.txt'); await writeFile(external, 'external secret');
    await symlink(external, path.join(store.dir(recovered.id), 'outside.log'));
    recovered.attempts[0]!.evidence['outside.log'] = 'outside.log'; await store.save(recovered);
    assert.equal((await fetch(`${dashboardURL}/api/runs/${recovered.id}/evidence/outside.log`)).status, 400);
  });
  await t.test('navegador: filtros, pesquisa, detalhes, código e evidências', async () => {
    await page.goto(dashboardURL); await page.getByRole('heading', { name: 'Central de execuções' }).waitFor();
    await page.locator('#generated').getByText('3', { exact: true }).waitFor();
    await page.getByLabel('Filtrar status').selectOption('recovered'); await page.getByRole('button', { name: /Recuperado/ }).click();
    await page.getByRole('heading', { name: 'Propostas de correção', exact: true }).waitFor();
    await page.getByText('Diff de localizadores', { exact: true }).click();
    await page.getByRole('link', { name: 'failure.png', exact: true }).waitFor();
    await page.screenshot({ path: path.join(root, 'dashboard-desktop.png'), fullPage: true });
    await page.getByLabel('Pesquisar requisito').fill('inexistente'); await page.getByText('Nenhuma execução encontrada.').waitFor();
    await page.getByLabel('Pesquisar requisito').fill(''); await page.getByLabel('Filtrar status').selectOption('');
    await page.getByLabel('Filtrar provedor').selectOption('openrouter'); await page.getByRole('button', { name: /OPENROUTER/ }).waitFor();
    await page.getByLabel('Filtrar provedor').selectOption('');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: path.join(root, 'dashboard-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1100 });
  });
  await t.test('polling exibe aprovação ativa e depois resultado; conteúdo é escapado', async () => {
    let resolveApproval!: (value: boolean) => void;
    const pending = workflow({ command: 'generate', input: 'login', url, autoApprove: false, interactive: true, store, log: () => {}, approve: () => new Promise(resolve => { resolveApproval = resolve; }) });
    while (!resolveApproval) await new Promise(resolve => setTimeout(resolve, 50));
    const run = (await store.list())[0]!; run.requirement = '<img src=x onerror="window.xss=1">'; await store.save(run);
    await page.getByRole('button', { name: '↻ Atualizar' }).click();
    await page.getByRole('button', { name: /Aguardando aprovação/ }).click(); await page.getByText('Execução ativa.', { exact: false }).waitFor();
    assert.equal(await page.evaluate(() => (window as Window & { xss?: number }).xss), undefined);
    await page.getByText('<img src=x onerror="window.xss=1">', { exact: true }).first().waitFor();
    resolveApproval(false); const result = await pending; assert.equal(result.exitCode, 2);
    await page.locator('#detail .badge').getByText('Cancelado', { exact: true }).waitFor();
  });
  await t.test('execução interrompida e reinício preservam histórico', async () => {
    const interrupted = store.create('generate', 'execução interrompida', url, 'mock'); interrupted.ownerPid = 2_000_000_000; await store.save(interrupted);
    const record = await (await fetch(`${dashboardURL}/api/runs/${interrupted.id}`)).json(); assert.equal(record.state, 'operational_error'); assert.match(record.error, /interrompida/);
    const before = await store.list(); await new Promise<void>(resolve => dashboard.close(() => resolve())); dashboard = await startDashboard(new Store(root), 0);
    dashboardURL = `http://127.0.0.1:${(dashboard.address() as { port: number }).port}`;
    const after = await (await fetch(`${dashboardURL}/api/runs`)).json(); assert.equal(after.runs.length, before.length);
    await page.goto(dashboardURL); await page.getByRole('heading', { name: 'Central de execuções' }).waitFor();
    await page.getByRole('button', { name: /execução interrompida/ }).click(); await page.getByText(/Execução interrompida: processo/).waitFor();
  });
  await t.test('estados vazios, falta de atualização e evidência indisponível', async () => {
    await page.route('**/api/runs', route => route.abort()); await page.getByRole('button', { name: '↻ Atualizar' }).click(); await page.getByRole('alert').getByText(/Falha ao atualizar/).waitFor(); await page.unroute('**/api/runs');
    const emptyStore = new Store(await mkdtemp(path.join(os.tmpdir(), 'testpilot-empty-'))); const emptyServer = await startDashboard(emptyStore, 0);
    try {
      await page.goto(`http://127.0.0.1:${(emptyServer.address() as { port: number }).port}`); await page.getByText('Seu histórico começa aqui.').waitFor();
      await page.screenshot({ path: path.join(root, 'dashboard-empty.png'), fullPage: true });
    } finally { await new Promise<void>(resolve => emptyServer.close(() => resolve())); }
    assert.deepEqual(browserErrors, []);
  });
});
