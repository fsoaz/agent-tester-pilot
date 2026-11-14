import { mkdir, readFile, writeFile, rename, appendFile, readdir, realpath } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { activeStates, type RunRecord, type ApprovedMetadata } from './types.js';
export const hash = (code: string) => createHash('sha256').update(code).digest('hex');
export async function atomicJSON(file: string, data: unknown): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  await rename(tmp, file);
}
export function isActive(run: RunRecord): boolean { return activeStates.includes(run.state); }
export function stale(run: RunRecord): boolean {
  if (!isActive(run)) return false;
  if (Date.now() - Date.parse(run.heartbeatAt) > 15_000) return true;
  try { process.kill(run.ownerPid, 0); return false; } catch { return true; }
}
export function withInterruption(run: RunRecord): RunRecord {
  return stale(run) ? { ...run, state: 'operational_error', outcome: 'error', error: 'Execução interrompida: processo encerrado ou heartbeat expirado.' } : run;
}
export class Store {
  private writes: Promise<void> = Promise.resolve();
  readonly artifacts: string;
  readonly generated: string;
  constructor(readonly root = process.cwd()) { this.artifacts = path.join(root, 'artifacts'); this.generated = path.join(root, 'generated-tests'); }
  dir(id: string): string {
    if (!/^[0-9a-f-]{36}$/.test(id)) throw new Error('Identificador inválido.');
    return path.join(this.artifacts, id);
  }
  create(command: RunRecord['command'], requirement: string, url: string, provider: RunRecord['provider'], scenarioId?: string): RunRecord {
    const id = randomUUID(), now = new Date().toISOString();
    return { version: 1, id, scenarioId: scenarioId ?? id, command, requirement, url, provider, state: command === 'generate' ? 'generating' : 'running', createdAt: now, updatedAt: now, heartbeatAt: now, ownerPid: process.pid, approvals: [], attempts: [], proposals: [] };
  }
  async save(run: RunRecord, event = 'updated'): Promise<void> {
    const write = async () => {
      run.updatedAt = new Date().toISOString(); run.heartbeatAt = run.updatedAt;
      const dir = this.dir(run.id);
      await atomicJSON(path.join(dir, 'snapshot.json'), run);
      await appendFile(path.join(dir, 'events.jsonl'), JSON.stringify({ at: run.updatedAt, event, state: run.state, outcome: run.outcome, attempts: run.attempts.length, proposals: run.proposals.length }) + '\n', { mode: 0o600 });
    };
    const pending = this.writes.then(write); this.writes = pending.catch(() => {}); return pending;
  }
  async get(id: string): Promise<RunRecord> {
    const dir = await realpath(this.dir(id)), root = await realpath(this.artifacts);
    if (path.dirname(dir) !== root) throw new Error('Diretório da execução inválido.');
    const file = await realpath(path.join(dir, 'snapshot.json'));
    if (path.dirname(file) !== dir) throw new Error('Snapshot inválido.');
    const run = JSON.parse(await readFile(file, 'utf8')) as RunRecord | null;
    if (!run || run.version !== 1 || run.id !== id || typeof run.createdAt !== 'string' || typeof run.requirement !== 'string' || !Array.isArray(run.attempts) || !Array.isArray(run.approvals) || !Array.isArray(run.proposals)) throw new Error('Snapshot inválido ou versão incompatível.');
    return withInterruption(run);
  }
  async list(): Promise<RunRecord[]> {
    await mkdir(this.artifacts, { recursive: true });
    const records: RunRecord[] = [];
    for (const entry of await readdir(this.artifacts, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^[0-9a-f-]{36}$/.test(entry.name)) continue;
      try { records.push(await this.get(entry.name)); } catch { /* A partial/corrupt run must not hide healthy history. */ }
    }
    return records.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  async approve(run: RunRecord, code: string): Promise<string> {
    await mkdir(this.generated, { recursive: true });
    const file = path.join(this.generated, `${run.scenarioId}.spec.ts`);
    const tmp = `${file}.${randomUUID()}.tmp`;
    await writeFile(tmp, code, { mode: 0o600 }); await rename(tmp, file);
    const metadata: ApprovedMetadata = { scenarioId: run.scenarioId, requirement: run.requirement, provider: run.originProvider ?? run.provider, model: run.model, hash: hash(code), approvedAt: new Date().toISOString() };
    await atomicJSON(`${file}.json`, metadata);
    run.approvedFile = path.relative(this.root, file); run.code = code;
    return file;
  }
  async loadApproved(file: string): Promise<{ code: string; metadata: ApprovedMetadata }> {
    const resolved = await realpath(path.resolve(this.root, file));
    const generated = await realpath(this.generated);
    if (path.dirname(resolved) !== generated || !resolved.endsWith('.spec.ts')) throw new Error('run aceita somente arquivos aprovados em generated-tests/.');
    const code = await readFile(resolved, 'utf8');
    const metadata = JSON.parse(await readFile(`${resolved}.json`, 'utf8')) as ApprovedMetadata;
    if (metadata.hash !== hash(code)) throw new Error('Arquivo alterado após aprovação. Gere e aprove um novo cenário.');
    return { code, metadata };
  }
}
