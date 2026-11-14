import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { validateCode } from './validation.js';
import ts from 'typescript';
import type { Attempt } from './types.js';

const require = createRequire(import.meta.url);
const support = fileURLToPath(new URL('./runner-support/', import.meta.url));
async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths: string[] = [];
  for (const entry of entries) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) paths.push(...await walk(file)); else if (entry.isFile()) paths.push(file);
  }
  return paths;
}
export async function execute(code: string, url: string, runDir: string, number: number): Promise<Attempt> {
  validateCode(code);
  const dir = path.join(runDir, `attempt-${number}`);
  await mkdir(dir, { recursive: true });
  const testFile = path.join(dir, 'scenario.spec.ts');
  const configFile = path.join(dir, 'playwright.config.cjs');
  const resultFile = path.join(dir, 'result.json');
  await writeFile(path.join(dir, 'approved.ts.txt'), code);
  const executable = ts.createPrinter({ removeComments: true }).printFile(validateCode(code));
  await writeFile(testFile, executable.replace(/(['"])@playwright\/test\1/, JSON.stringify(path.join(support, 'fixtures.ts'))));
  await writeFile(configFile, `module.exports = ${JSON.stringify({
    testDir: dir, testMatch: 'scenario.spec.ts', outputDir: path.join(dir, 'output'),
    workers: 1, retries: 0, timeout: 10_000, globalTimeout: 45_000, expect: { timeout: 3000 },
    reporter: [[path.join(support, 'reporter.cjs')]],
    use: { browserName: 'chromium', headless: true, baseURL: url, actionTimeout: 3000, navigationTimeout: 10_000, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  })};`);
  const startedAt = new Date().toISOString(), start = Date.now();
  const result = await new Promise<{ exit: number | null; logs: string }>((resolve, reject) => {
    // The child receives only operational environment, never API credentials.
    const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/KEY|TOKEN|SECRET|PASSWORD|OPENROUTER/i.test(key)));
    const child = spawn(process.execPath, [require.resolve('@playwright/test/cli'), 'test', '--config', configFile], { cwd: runDir, env: { ...env, TESTPILOT_RESULT: resultFile, FORCE_COLOR: '0' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let logs = '';
    const collect = (chunk: Buffer) => { logs = (logs + chunk.toString()).slice(-100_000); };
    child.stdout.on('data', collect); child.stderr.on('data', collect);
    const timeout = setTimeout(() => child.kill('SIGKILL'), 60_000);
    child.on('error', error => { clearTimeout(timeout); reject(error); });
    child.on('close', exit => { clearTimeout(timeout); resolve({ exit, logs }); });
  });
  const attempt: Attempt = { number, code, status: 'failed', startedAt, durationMs: Date.now() - start, logs: result.logs, evidence: {} };
  let report: { status: string; results: { status: string; durationMs: number; errors: { message: string; matcher: boolean }[] }[]; errors: string[] };
  try { report = JSON.parse(await readFile(resultFile, 'utf8')) as typeof report; }
  catch { attempt.error = 'Runner não produziu resultado estruturado (timeout ou configuração).'; attempt.failureKind = 'configuration'; return attempt; }
  const test = report.results[0];
  attempt.status = result.exit === 0 && report.status === 'passed' && report.results.length === 1 && test?.status === 'passed' ? 'passed' : 'failed';
  attempt.error = [...report.errors, ...(test?.errors.map(e => e.message) ?? [])].join('\n') || (attempt.status === 'failed' ? 'Execução sem teste aprovado concluído.' : undefined);
  for (const file of await walk(dir)) {
    const name = path.basename(file);
    if (['failure.html', 'failure.png', 'trace.zip', 'context.html', 'browser.log', 'application-errors.json'].includes(name)) attempt.evidence[name] = path.relative(runDir, file).split(path.sep).join('/');
  }
  if (attempt.evidence['browser.log']) attempt.logs += '\n' + await readFile(path.join(runDir, attempt.evidence['browser.log']), 'utf8');
  await writeFile(path.join(dir, 'runner.log'), attempt.logs);
  attempt.evidence['runner.log'] = `attempt-${number}/runner.log`;
  attempt.evidence['result.json'] = `attempt-${number}/result.json`;
  if (attempt.status === 'failed') {
    const error = attempt.error ?? '';
    const appErrors = attempt.evidence['application-errors.json'] ? JSON.parse(await readFile(path.join(runDir, attempt.evidence['application-errors.json']), 'utf8')) as string[] : [];
    if (/net::ERR_|Navigation failed|HTTP [45]\d\d/.test(error) || appErrors.length) attempt.failureKind = 'application';
    else if (test?.errors.some(e => e.matcher) || /expect\(|toBeVisible|toHaveText|toContainText|toHaveURL|toHaveTitle/.test(error)) attempt.failureKind = 'assertion';
    else if (/Timeout/.test(error) && /locator\.(click|fill|press|check|uncheck|selectOption|hover|focus|clear)|waiting for (locator|getBy)/.test(error) && attempt.evidence['context.html']) attempt.failureKind = 'locator';
    else attempt.failureKind = 'configuration';
  }
  return attempt;
}
