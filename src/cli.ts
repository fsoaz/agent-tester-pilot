#!/usr/bin/env node
import { Command } from 'commander';
import { createInterface } from 'node:readline/promises';
import { workflow } from './workflow.js';
import { startDashboard } from './dashboard/server.js';
import { Store } from './store.js';
const program = new Command().name('testpilot').description('Testes reais com IA configurável e revisão humana').version('0.1.0');
async function action(command: 'generate' | 'run', input: string, opts: { url: string; autoApprove?: boolean }) {
  const result = await workflow({ command, input, url: opts.url, autoApprove: !!opts.autoApprove,
    interactive: !!process.stdin.isTTY && !!process.stdout.isTTY, log: text => console.log(text),
    approve: async text => {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try { return /^(s|sim|y|yes)$/i.test((await rl.question(`${text} [s/N] `)).trim()); }
      finally { rl.close(); }
    },
  });
  process.exitCode = result.exitCode;
}
program.command('generate').argument('<requisito>').requiredOption('--url <url>', 'URL da aplicação').option('--auto-approve', 'aprovar explicitamente geração e reparos').action((input: string, opts: { url: string; autoApprove?: boolean }) => action('generate', input, opts));
program.command('run').argument('<arquivo>').requiredOption('--url <url>', 'URL da aplicação').option('--auto-approve', 'aprovar explicitamente todos os reparos').action((input: string, opts: { url: string; autoApprove?: boolean }) => action('run', input, opts));
program.command('dashboard').option('--port <port>', 'porta local', '4173').action(async (opts: { port: string }) => {
  const port = Number(opts.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta inválida.');
  const server = await startDashboard(new Store(), port);
  console.log(`Dashboard: http://127.0.0.1:${port}`);
  const close = () => server.close(() => process.exit(0));
  process.once('SIGINT', close); process.once('SIGTERM', close);
});
try { await program.parseAsync(); } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
