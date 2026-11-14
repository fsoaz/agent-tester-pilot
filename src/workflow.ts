import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Store } from './store.js';
import { createProvider, providerName } from './providers/index.js';
import { generate } from './generator.js';
import { validateCode } from './validation.js';
import { validateUrl } from './dom.js';
import { execute } from './runner.js';
import { proposeHealing, reviewHealing } from './healer.js';
import { writeReports } from './report.js';
import type { Provider, RunRecord, Attempt } from './types.js';

export interface WorkflowOptions {
  command: 'generate' | 'run'; input: string; url: string; autoApprove: boolean;
  interactive: boolean; approve: (text: string) => Promise<boolean>; log: (text: string) => void;
  store?: Store; provider?: Provider;
  execute?: (code: string, url: string, dir: string, number: number) => Promise<Attempt>;
  generate?: typeof generate;
}
export async function workflow(options: WorkflowOptions): Promise<{ exitCode: number; run: RunRecord }> {
  const store = options.store ?? new Store();
  let name: RunRecord['provider'] = 'mock';
  let configError: unknown;
  try { name = options.provider?.name ?? providerName(); } catch (error) { configError = error; }
  const run = store.create(options.command, options.command === 'generate' ? options.input : `Reexecução de ${options.input}`, options.url, name);
  await store.save(run, 'created');
  let heartbeatBusy = false;
  const heartbeat = setInterval(() => {
    if (heartbeatBusy) return;
    heartbeatBusy = true;
    void store.save(run, 'heartbeat').catch(() => { /* main persistence reports I/O failures */ }).finally(() => { heartbeatBusy = false; });
  }, 2000);
  let exitCode = 1;
  const approve = async (kind: 'generation' | 'healing', text: string, proposal?: number) => {
    run.state = 'awaiting_approval'; await store.save(run, 'approval_requested');
    options.log(text);
    const approved = options.autoApprove || await options.approve(kind === 'generation' ? 'Aprovar, salvar e executar este teste?' : 'Aprovar e executar esta alteração de localizadores?');
    run.approvals.push({ kind, proposal, approved, automatic: options.autoApprove, at: new Date().toISOString() });
    await store.save(run, approved ? 'approved' : 'rejected');
    return approved;
  };
  try {
    if (configError) throw configError;
    run.url = validateUrl(options.url);
    if (!options.autoApprove && !options.interactive) {
      run.error = 'Execução não interativa exige --auto-approve explícito.'; run.state = 'cancelled'; run.outcome = 'cancelled'; exitCode = 2;
      return { exitCode, run };
    }
    const provider = options.provider ?? createProvider();
    run.model = provider.name === 'mock' ? 'demo-predefinida-v1' : process.env.OPENROUTER_MODEL;
    let code: string;
    if (options.command === 'generate') {
      const generated = await (options.generate ?? generate)(provider, run.requirement, run.url);
      code = generated.code; validateCode(code);
      run.code = code; run.model = generated.model; run.usage = generated.usage;
      await writeFile(path.join(store.dir(run.id), 'generation.ts.txt'), code);
      if (!await approve('generation', code)) { run.state = 'cancelled'; run.outcome = 'cancelled'; exitCode = 2; return { exitCode, run }; }
      await store.approve(run, code);
    } else {
      const approved = await store.loadApproved(options.input);
      run.scenarioId = approved.metadata.scenarioId; run.requirement = approved.metadata.requirement;
      run.originProvider = approved.metadata.provider; run.approvedFile = path.relative(store.root, path.resolve(store.root, options.input));
      code = approved.code; run.code = code; validateCode(code);
      await store.save(run, 'approved_file_loaded');
    }
    for (let number = 0; number <= 3; number++) {
      run.state = 'running';
      const pending: Attempt = { number, code, status: 'running', startedAt: new Date().toISOString(), logs: '', evidence: {} };
      run.attempts.push(pending); await store.save(run, 'attempt_started');
      options.log(`Tentativa ${number} · provedor ${run.provider}`);
      const attempt = await (options.execute ?? execute)(code, run.url, store.dir(run.id), number);
      run.attempts[run.attempts.length - 1] = attempt;
      await store.save(run, 'attempt_finished');
      if (attempt.status === 'passed') { run.state = 'completed'; run.outcome = number ? 'recovered' : 'passed'; exitCode = 0; break; }
      if (attempt.error) options.log(attempt.error);
      if (attempt.failureKind === 'configuration' || attempt.failureKind === 'application') {
        run.state = 'operational_error'; run.outcome = 'error'; run.error = attempt.error; break;
      }
      if (attempt.failureKind !== 'locator' || number === 3) { run.state = 'completed'; run.outcome = 'failed'; break; }
      run.state = 'healing';
      const proposal: RunRecord['proposals'][number] = { number: number + 1, status: 'requesting' };
      run.proposals.push(proposal); await store.save(run, 'healing_requested');
      let output;
      try {
        const context = attempt.evidence['context.html'];
        if (!context) throw new Error('DOM de falha indisponível.');
        const dom = (await readFile(path.join(store.dir(run.id), context), 'utf8')).slice(0, 20_000);
        output = await proposeHealing(provider, run, attempt, dom);
      } catch (error) {
        proposal.status = 'error'; proposal.error = error instanceof Error ? error.message : String(error); throw error;
      }
      proposal.code = output.code; proposal.metadata = { provider: output.provider, model: output.model, usage: output.usage };
      await writeFile(path.join(store.dir(run.id), `proposal-${proposal.number}.ts.txt`), output.code);
      try { proposal.diff = reviewHealing(code, output.code); }
      catch (error) {
        proposal.status = 'invalid'; proposal.error = error instanceof Error ? error.message : String(error);
        run.error = proposal.error; run.state = 'completed'; run.outcome = 'failed'; await store.save(run, 'invalid_proposal'); break;
      }
      if (!await approve('healing', proposal.diff, proposal.number)) {
        proposal.status = 'rejected'; run.state = 'cancelled'; run.outcome = 'cancelled'; exitCode = 2; break;
      }
      proposal.status = 'approved'; code = output.code;
      await store.approve(run, code); await store.save(run, 'healing_approved');
    }
  } catch (error) {
    run.error = error instanceof Error ? error.message : String(error);
    run.state = 'operational_error'; run.outcome = 'error'; exitCode = 1;
  } finally {
    clearInterval(heartbeat);
    await store.save(run, 'finished');
    await writeReports(store, run);
    options.log(`Resultado: ${run.outcome} · ${run.attempts.length} tentativa(s), ${run.proposals.length} proposta(s)\n${run.error ?? ''}\nArquivo aprovado: ${run.approvedFile ?? 'nenhum'}\nRelatório: ${path.join(store.dir(run.id), 'report.html')}`);
  }
  return { exitCode, run };
}
